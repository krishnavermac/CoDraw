/* CoDraw — script.js
   Pro canvas: grouped strokes, shapes, text, zoom, pan, undo/redo, cursors, rooms
*/

const socket = io();

/* ---------- ROOM ---------- */
function makeId(n=6){
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({length:n}).map(()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

let roomId = new URLSearchParams(window.location.search).get("room");
if (!roomId) {
  roomId = makeId(6);
  history.replaceState({}, "", "?room=" + roomId);
}
document.getElementById("roomIdLabel").textContent = roomId;
socket.emit("join", roomId);

/* ---------- DOM ---------- */
const wrap = document.getElementById("canvasWrap");
const board = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = board.getContext("2d");
const octx = overlay.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const shareBtn = document.getElementById("shareBtn");
const clearBtnTop = document.getElementById("clearBtnTop");
const zoomLabel = document.getElementById("zoomLabel");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const toolButtons = document.querySelectorAll(".tool-btn");
const cursorsContainer = document.getElementById("cursors");

/* ---------- state ---------- */
let scale = 1;
let tx = 0, ty = 0;           // translation in screen pixels
let tool = "pen";
let drawing = false;
let panning = false;
let panLast = null;
let currentStroke = null;     // grouped stroke
let start = null;
let currentColor = colorPicker.value;
let currentSize = parseInt(brushSize.value,10);
let roomActions = [];         // last known actions from server

/* ---------- resize ---------- */
function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  board.width = w;
  board.height = h;
  overlay.width = w;
  overlay.height = h;
  redrawAll(); // redraw from roomActions
}
window.addEventListener("resize", resize);
resize();

/* ---------- transforms & coordinate helpers ---------- */
function applyTransformTo(ctx) {
  ctx.setTransform(scale, 0, 0, scale, tx, ty);
}
function resetTransform(ctx) {
  ctx.setTransform(1,0,0,1,0,0);
}
function screenToWorld(clientX, clientY) {
  const r = wrap.getBoundingClientRect();
  const sx = clientX - r.left;
  const sy = clientY - r.top;
  return { x: (sx - tx) / scale, y: (sy - ty) / scale };
}
function worldToScreen(wx, wy) {
  return { x: wx * scale + tx, y: wy * scale + ty };
}

/* ---------- UI controls ---------- */
toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    toolButtons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    tool = btn.dataset.tool;
  });
});
document.querySelector('.tool-btn[data-tool="pen"]').classList.add("active");

colorPicker.addEventListener("change", ()=> currentColor = colorPicker.value);
brushSize.addEventListener("change", ()=> currentSize = parseInt(brushSize.value,10));

shareBtn.addEventListener("click", async ()=>{
  try {
    await navigator.clipboard.writeText(window.location.href);
    shareBtn.textContent = "Link copied!";
    setTimeout(()=> shareBtn.textContent = "Share board",1400);
  } catch {
    alert("Copy this link: " + window.location.href);
  }
});

clearBtnTop.addEventListener("click", ()=>{
  socket.emit("clear");
});

/* ---------- zoom controls ---------- */
function setScale(newScale, centerClientX=null, centerClientY=null) {
  if (centerClientX !== null && centerClientY !== null) {
    // zoom about pointer: compute world point then adjust tx/ty so world point stays under pointer
    const r = wrap.getBoundingClientRect();
    const sx = centerClientX - r.left;
    const sy = centerClientY - r.top;
    const worldX = (sx - tx) / scale;
    const worldY = (sy - ty) / scale;
    // apply scale change
    scale = Math.max(0.25, Math.min(4, newScale));
    // compute new tx/ty so worldX/worldY maps to same screen pos
    tx = sx - worldX * scale;
    ty = sy - worldY * scale;
  } else {
    scale = Math.max(0.25, Math.min(4, newScale));
  }
  zoomLabel.textContent = Math.round(scale * 100) + "%";
  redrawAll(); // redraw with new transform
}
zoomInBtn?.addEventListener("click", ()=> setScale(scale * 1.2, wrap.clientWidth/2, wrap.clientHeight/2));
zoomOutBtn?.addEventListener("click", ()=> setScale(scale / 1.2, wrap.clientWidth/2, wrap.clientHeight/2));

// wheel zoom (centered on cursor)
wrap.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
  setScale(scale * factor, e.clientX, e.clientY);
}, { passive: false });

/* ---------- drawing primitives ---------- */
function drawStrokeLocal(stroke) {
  if (!stroke || !stroke.points) return;
  applyTransformTo(ctx);
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.beginPath();
  stroke.points.forEach((p,i)=>{
    if (i===0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  resetTransform(ctx);
}

function drawSegmentLocal(seg) {
  applyTransformTo(ctx);
  ctx.globalCompositeOperation = seg.composite || "source-over";
  ctx.strokeStyle = seg.color;
  ctx.lineWidth = seg.size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.lineTo(seg.x2, seg.y2);
  ctx.stroke();
  resetTransform(ctx);
}

function drawShapeLocal(s) {
  applyTransformTo(ctx);
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  if (s.tool === 'rect') ctx.strokeRect(s.x, s.y, s.w, s.h);
  else if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, s.r, s.r, 0, 0, Math.PI*2);
    ctx.stroke();
  } else if (s.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  resetTransform(ctx);
}

function drawTextLocal(t) {
  applyTransformTo(ctx);
  ctx.fillStyle = t.color;
  const fontSize = Math.max(12, (t.size || 2) * 6);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(t.text, t.x, t.y);
  resetTransform(ctx);
}

/* ---------- overlay preview ---------- */
function clearOverlay() {
  octx.setTransform(1,0,0,1,0,0);
  octx.clearRect(0,0,overlay.width,overlay.height);
}
function previewShape(toolName, x0, y0, x1, y1) {
  clearOverlay();
  // apply same transform as board so preview lines up
  octx.setTransform(scale,0,0,scale,tx,ty);
  octx.strokeStyle = currentColor;
  octx.lineWidth = currentSize;
  octx.lineCap = "round";
  if (toolName === "rect") {
    const x = Math.min(x0,x1), y = Math.min(y0,y1), w = Math.abs(x1-x0), h = Math.abs(y1-y0);
    octx.strokeRect(x,y,w,h);
  } else if (toolName === "circle") {
    const cx = (x0+x1)/2, cy = (y0+y1)/2, r = Math.max(Math.abs(x1-x0), Math.abs(y1-y0))/2;
    octx.beginPath(); octx.arc(cx,cy,r,0,Math.PI*2); octx.stroke();
  } else if (toolName === "line") {
    octx.beginPath(); octx.moveTo(x0,y0); octx.lineTo(x1,y1); octx.stroke();
  }
  // reset overlay transform not necessary (we clear before next preview)
}

/* ---------- text editor ---------- */
function createTextEditor(worldX, worldY) {
  const wrapRect = wrap.getBoundingClientRect();
  const scr = worldToScreen(worldX, worldY);
  const editor = document.createElement("div");
  editor.contentEditable = true;
  editor.style.position = "absolute";
  editor.style.left = (wrapRect.left + scr.x) + "px";
  editor.style.top = (wrapRect.top + scr.y) + "px";
  editor.style.minWidth = "100px";
  editor.style.padding = "6px";
  editor.style.background = "rgba(255,255,255,0.98)";
  editor.style.border = "1px solid #ddd";
  editor.style.borderRadius = "6px";
  editor.style.zIndex = 99999;
  editor.style.outline = "none";
  document.body.appendChild(editor);
  editor.focus();

  function commit() {
    const text = editor.innerText.trim();
    if (text.length) {
      const t = { x: worldX, y: worldY, text, color: currentColor, size: currentSize };
      socket.emit("text", t);
      roomActions.push({ type: "text", payload: t });
      drawTextLocal(t);
    }
    editor.remove();
  }

  editor.addEventListener("blur", commit);
  editor.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); editor.blur(); }
    else if (ev.key === "Escape") editor.remove();
  });
}

/* ---------- drawing / pointer handling ---------- */
let lastPointer = null;
wrap.addEventListener("pointerdown", (e) => {
  wrap.setPointerCapture?.(e.pointerId);
  const p = screenToWorld(e.clientX, e.clientY);
  lastPointer = { x: e.clientX, y: e.clientY };
  if (tool === "pan") {
    panning = true;
    return;
  }

  drawing = true;
  start = p;

  if (tool === "text") {
    createTextEditor(p.x, p.y);
    drawing = false;
    return;
  }

  if (tool === "pen" || tool === "eraser") {
    currentStroke = { tool, color: currentColor, size: currentSize, points: [ { x: p.x, y: p.y } ] };
  }
});

wrap.addEventListener("pointermove", (e) => {
  const p = screenToWorld(e.clientX, e.clientY);

  // send cursor in world coords
  socket.emit("cursor", { x: p.x, y: p.y });

  if (panning && lastPointer) {
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    tx += dx;
    ty += dy;
    lastPointer = { x: e.clientX, y: e.clientY };
    redrawAll();
    return;
  }

  if (!drawing) return;

  if (tool === "pen" || tool === "eraser") {
    currentStroke.points.push({ x: p.x, y: p.y });
    // draw the most recent segment for smooth local feedback
    const len = currentStroke.points.length;
    if (len >= 2) {
      const a = currentStroke.points[len-2];
      const b = currentStroke.points[len-1];
      const seg = {
        action: "line",
        x1: a.x, y1: a.y,
        x2: b.x, y2: b.y,
        color: currentStroke.color,
        size: currentStroke.size,
        composite: currentStroke.tool === "eraser" ? "destination-out" : "source-over"
      };
      drawSegmentLocal(seg);
      socket.emit("draw", seg); // live preview to others
    }
  } else if (tool === "rect" || tool === "circle" || tool === "line") {
    previewShape(tool, start.x, start.y, p.x, p.y);
  }
});

wrap.addEventListener("pointerup", (e) => {
  wrap.releasePointerCapture?.(e.pointerId);
  lastPointer = null;
  if (panning) { panning = false; return; }
  if (!drawing) return;
  drawing = false;
  const p = screenToWorld(e.clientX, e.clientY);

  if (tool === "pen" || tool === "eraser") {
    if (currentStroke) {
      socket.emit("stroke", currentStroke);
      roomActions.push({ type: "stroke", payload: currentStroke });
      drawStrokeLocal(currentStroke);
    }
    currentStroke = null;
  } else if (tool === "rect" || tool === "circle" || tool === "line") {
    clearOverlay();
    const shape = { tool, color: currentColor, size: currentSize };
    if (tool === "rect") {
      shape.x = Math.min(start.x, p.x);
      shape.y = Math.min(start.y, p.y);
      shape.w = Math.abs(p.x - start.x);
      shape.h = Math.abs(p.y - start.y);
    } else if (tool === "circle") {
      shape.cx = (start.x + p.x) / 2;
      shape.cy = (start.y + p.y) / 2;
      shape.r = Math.max(Math.abs(p.x - start.x), Math.abs(p.y - start.y)) / 2;
    } else if (tool === "line") {
      shape.x1 = start.x; shape.y1 = start.y; shape.x2 = p.x; shape.y2 = p.y;
    }
roomActions.push({ type: "shape", payload: shape });
drawShapeLocal(shape);
socket.emit("shape", shape);

  }
});

/* pointer leave => cancel */
wrap.addEventListener("pointerleave", () => {
  drawing = false;
  panning = false;
  clearOverlay();
});

/* ---------- socket handlers ---------- */
socket.on("draw", (seg) => drawSegmentLocal(seg));
socket.on("stroke", (stroke) => {
  roomActions.push({ type: "stroke", payload: stroke });
  drawStrokeLocal(stroke);
});
socket.on("shape", (s) => {
  // prevent duplicate insert
  roomActions.push({ type: "shape", payload: s });
  redrawAll();
});

socket.on("text", (t) => {
  roomActions.push({ type: "text", payload: t });
  drawTextLocal(t);
});
socket.on("clear", () => {
  roomActions = [];
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,board.width,board.height);
});
socket.on("init", (actions) => {
  roomActions = actions.slice();
  redrawAll();
});
socket.on("rebuild", (actions) => {
  roomActions = actions.slice();
  redrawAll();
});

/* ---------- undo / redo ---------- */
undoBtn.addEventListener("click", ()=> socket.emit("undo"));
redoBtn.addEventListener("click", ()=> socket.emit("redo"));

/* ---------- cursors ---------- */
const remoteCursors = {};
socket.on("cursor", (data) => {
  let el = remoteCursors[data.id];
  if (!el) {
    el = document.createElement("div");
    el.className = "remote-cursor";
    el.innerHTML = `<div class="dot"></div><div class="label">Friend</div>`;
    cursorsContainer.appendChild(el);
    remoteCursors[data.id] = el;
  }
  const screen = worldToScreen(data.x, data.y);
  el.style.left = screen.x + "px";
  el.style.top = screen.y + "px";
});
socket.on("cursor-left", (d) => {
  const el = remoteCursors[d.id];
  if (el) { el.remove(); delete remoteCursors[d.id]; }
});

/* ---------- redraw helpers ---------- */
function redrawAll() {
  // clear and re-render roomActions with current transform
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,board.width,board.height);
  roomActions.forEach(a => {
    if (a.type === "stroke") drawStrokeLocal(a.payload);
    else if (a.type === "shape") drawShapeLocal(a.payload);
    else if (a.type === "text") drawTextLocal(a.payload);
  });
  // clear overlay
  clearOverlay();
}

/* ---------- initialization: request init if not received ---------- */
setTimeout(()=> socket.emit("join", roomId), 150);
