const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const rooms = {}; // roomId -> { actions: [], redo: [] }

app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    if (!rooms[roomId]) rooms[roomId] = { actions: [], redo: [] };
    socket.emit("init", rooms[roomId].actions);
    console.log(`${socket.id} joined ${roomId}`);
  });

  // live segments (not stored)
  socket.on("draw", (d) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit("draw", d);
  });

  // grouped stroke (stored as one action)
  socket.on("stroke", (stroke) => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    room.actions.push({ type: "stroke", payload: stroke });
    room.redo = [];
    socket.to(socket.roomId).emit("stroke", stroke);
  });

  socket.on("shape", (shape) => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    room.actions.push({ type: "shape", payload: shape });
    room.redo = [];
    socket.to(socket.roomId).emit("shape", shape);
  });

  socket.on("text", (text) => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    room.actions.push({ type: "text", payload: text });
    room.redo = [];
    socket.to(socket.roomId).emit("text", text);
  });

  socket.on("clear", () => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    room.actions = [];
    room.redo = [];
    io.to(socket.roomId).emit("clear");
  });

  socket.on("undo", () => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    if (!room || room.actions.length === 0) return;
    room.redo.push(room.actions.pop());
    io.to(socket.roomId).emit("rebuild", room.actions);
  });

  socket.on("redo", () => {
    if (!socket.roomId) return;
    const room = rooms[socket.roomId];
    if (!room || room.redo.length === 0) return;
    room.actions.push(room.redo.pop());
    io.to(socket.roomId).emit("rebuild", room.actions);
  });

  socket.on("cursor", (c) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit("cursor", { id: socket.id, ...c });
  });

  socket.on("disconnect", () => {
    if (socket.roomId) socket.to(socket.roomId).emit("cursor-left", { id: socket.id });
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`CoDraw running at http://localhost:${PORT}`));
