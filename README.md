
# **CODRAW**

CoDraw is a real-time collaborative whiteboard application that allows multiple users to draw, write text, create shapes, zoom, pan, and collaborate live using shared invite links. 



🚀 **FEATURES**

🎨 **Drawing & Editing**

Freehand drawing with smooth strokes

Eraser tool (stroke-based, undoable)

Shape tools: Rectangle, Circle, Line

Text tool with editable text boxes

Grid-based professional canvas


🔄 **Collaboration**

Real-time multi-user collaboration using WebSockets

Live cursor tracking for connected users

Room-based collaboration using invite links


🧠 **Canvas Engine (Pro-Level)**

Grouped strokes (one stroke = one undo step)

Room-wide undo / redo (server-controlled)

Zoom in / out (mouse wheel + controls)

Pan (hand tool) like Figma/Miro

Accurate shape preview and rendering at any zoom level


🛠️ **System**

Server-side state management (in-memory)

Deterministic redraw using action history

Scales well for demos and internships



🧩 **TECH STACK**

**Frontend**

HTML5

CSS3

Vanilla JavaScript

Canvas API


**Backend**

Node.js

Express.js

Socket.IO (real-time communication)



**PROJECT STRUCTURE**

CoDraw/

├── server/

│   └── index.js        # Express + Socket.IO server

├── public/

│   ├── index.html      # UI layout

│   ├── style.css       # Professional styling

│   └── script.js       # Canvas & collaboration logic

├── package.json

└── README.md


**SCREENSHOTS**
<img width="1470" height="881" alt="Screenshot 2026-05-28 at 11 45 45 PM" src="https://github.com/user-attachments/assets/242f7255-845d-4369-bc9d-844b4da9642a" />
<img width="1470" height="803" alt="Screenshot 2026-05-28 at 11 46 07 PM" src="https://github.com/user-attachments/assets/67f58359-6014-461a-9f90-9bf8dc81eb3f" />



▶️ **HOW TO RUN LOCALLY**

1️⃣ Clone the repository
git clone (https://github.com/krishnavermac/CoDraw)
cd CoDraw

2️⃣ Install dependencies
npm install

3️⃣ Start the server
npm start

4️⃣ Open in browser
http://localhost:3000



👥 **HOW COLLABORATION WORKS**

Open the app

Click Share board

Send the generated link to your friends

Everyone who opens the link joins the same live board


🧪 **Example Use Cases**

Online brainstorming

Remote teaching & explaining concepts

Team collaboration & planning

Internship-level system design demonstration


🧠 **Key Engineering Concepts Demonstrated**

Real-time synchronization using WebSockets

Canvas coordinate transformation (zoom + pan)

State-driven redraw architecture

Action-based undo/redo system

Collaborative cursor tracking



**AUTHOR**
KRISHNA VERMA 
IIIT ALLAHABAD - ECE
Passionate Software Engineer 
