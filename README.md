
 **CODRAW**

CoDraw is a real-time collaborative whiteboard application that allows multiple users to draw, write text, create shapes, zoom, pan, and collaborate live using shared invite links. 



**FEATURES**

**Drawing & Editing**

- Freehand drawing with smooth strokes
- Eraser tool (stroke-based, undoable)
- Shape tools: Rectangle, Circle, Line
- Text tool with editable text boxes
- Grid-based professional canvas


**Collaboration**

- Real-time multi-user collaboration using WebSockets
- Live cursor tracking for connected users
- Room-based collaboration using invite links


**Canvas Engine**

- Grouped strokes (one stroke = one undo step)
- Room-wide undo / redo (server-controlled)
- Zoom in / out (mouse wheel + controls)
- Pan (hand tool) like Figma/Miro
- Accurate shape preview and rendering at any zoom level


**System**

- Server-side state management (in-memory)
- Deterministic redraw using action history
- Scales well for demos and internships


**SCREENSHOTS**
<img width="1470" height="881" alt="Screenshot 2026-05-28 at 11 45 45 PM" src="https://github.com/user-attachments/assets/242f7255-845d-4369-bc9d-844b4da9642a" />
<img width="1470" height="803" alt="Screenshot 2026-05-28 at 11 46 07 PM" src="https://github.com/user-attachments/assets/67f58359-6014-461a-9f90-9bf8dc81eb3f" />



## TECH STACK

| Layer           | Technology                       |
| --------------- | ---------------------------------| 
| Backend         | Node.js, Express.                |
| Drawing Engine  | Canvas API                       |
| Real-Time Comm. | Socket.IO                        |     
| Frontend        | HTML5, CSS3, Vanilla JavaScript  |
| Version Control | Git & GitHub                     |

**PROJECT STRUCTURE**

```
CoDraw/
│
├── server/
│   └── index.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── package.json
└── README.md
```

**HOW TO RUN LOCALLY**

- Clone the repository
```
git clone (https://github.com/krishnavermac/CoDraw)
cd CoDraw
```

- Install dependencies
```
npm install
```

-  Start the server
```
npm start
```

- Open in browser
http://localhost:3000



**HOW COLLABORATION WORKS**

- Open the app
- Click Share board
- Send the generated link to your friends
- Everyone who opens the link joins the same live board


**Example Use Cases**

- Online brainstorming
- Remote teaching & explaining concepts
- Team collaboration & planning
- Internship-level system design demonstration


**Key Engineering Concepts Demonstrated**

- Real-time synchronization using WebSockets
- Canvas coordinate transformation (zoom + pan)
- State-driven redraw architecture
- Action-based undo/redo system
- Collaborative cursor tracking


**AUTHOR**

Krishna Verma

ECE Student, IIIT Allahabad

Interested in:

- Full Stack Development
- Competitive Programming
- Data Structures & Algorithms
- Artificial Intelligence
