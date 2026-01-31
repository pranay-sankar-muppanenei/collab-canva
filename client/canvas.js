const remoteCursors = {};
let myColor = "black";

const drawCanvas = document.getElementById("drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");

let currentStrokeId = null;
let socket = null;
const strokesMap = {};


function render() {
  drawCursors();
  requestAnimationFrame(render);
}

render();


function initSocketListeners(sock) {
  socket = sock;

  

  socket.on("init", (data) => {
    myColor = data.color;
  });

  socket.on("cursor", (data) => {
    remoteCursors[data.id] = data;
  });

  socket.on("cursor-remove", (id) => {
    delete remoteCursors[id];
  });

socket.on("stroke:start", (stroke) => {
  strokesMap[stroke.id] = {
    color: stroke.color,
    width: stroke.width,
    points: [...stroke.points] // first point
  };
});


socket.on("stroke:move", (data) => {
  const stroke = strokesMap[data.strokeId];
  if (!stroke) return;

  const lastPoint = stroke.points[stroke.points.length - 1];

  drawLine(lastPoint, data.point, stroke.color, stroke.width);

  stroke.points.push(data.point);
});


socket.on("stroke:end", () => {
  // nothing special yet
});

socket.on("history", (strokes) => {
  strokes.forEach((stroke) => {
    strokesMap[stroke.id] = {
      color: stroke.color,
      width: stroke.width,
      points: [...stroke.points]
    };

    // redraw stroke
    for (let i = 1; i < stroke.points.length; i++) {
      drawLine(
        stroke.points[i - 1],
        stroke.points[i],
        stroke.color,
        stroke.width
      );
    }
  });
});


}


/* ---------- CANVAS SETUP ---------- */

function resizeCanvas() {
  drawCanvas.width = window.innerWidth;
  drawCanvas.height = window.innerHeight;

  cursorCanvas.width = window.innerWidth;
  cursorCanvas.height = window.innerHeight;
}


resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawLine(start, end, color, width) {
  drawCtx.beginPath();
  drawCtx.moveTo(start.x, start.y);
  drawCtx.lineTo(end.x, end.y);
  drawCtx.strokeStyle = color;
  drawCtx.lineWidth = width;
  drawCtx.lineCap = "round";
  drawCtx.stroke();
}


/* ---------- SOCKET INIT (SAFE) ---------- */

window.addEventListener("socket-ready", () => {
  initSocketListeners(window.socket);
});


// 🔥 fallback in case event already fired
if (window.socket && !socket) {
  initSocketListeners(window.socket);
}


/* ---------- DRAWING STATE ---------- */

let isDrawing = false;
let lastPos = null;

function drawCursors() {
  // 🔥 clear ONLY cursor layer
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

  Object.values(remoteCursors).forEach(({ x, y, color }) => {
    cursorCtx.beginPath();
    cursorCtx.arc(x, y, 5, 0, Math.PI * 2);
    cursorCtx.fillStyle = color;
    cursorCtx.fill();
  });
}



function getCanvasCoordinates(event) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

drawCanvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  lastPos = getCanvasCoordinates(e);

  currentStrokeId = crypto.randomUUID();

  if (socket) {
    socket.emit("stroke:start", {
      strokeId: currentStrokeId,
      color: "black",
      width: 4,
      point: lastPos
    });
  }
});


drawCanvas.addEventListener("mousemove", (e) => {
  const pos = getCanvasCoordinates(e);

  // 🔹 emit cursor movement
  if (socket) {
    socket.emit("cursor", {
      x: pos.x,
      y: pos.y,
      color: myColor
    });
  }

  // 🔹 drawing logic
  if (!isDrawing) return;

  drawLine(lastPos, pos, "black", 4);
  drawCursors();

if (socket && currentStrokeId) {
  socket.emit("stroke:move", {
    strokeId: currentStrokeId,
    point: pos
  });
}


  lastPos = pos;
});



drawCanvas.addEventListener("mouseup", () => {
  if (socket && currentStrokeId) {
    socket.emit("stroke:end", {
      strokeId: currentStrokeId
    });
  }

  isDrawing = false;
  lastPos = null;
  currentStrokeId = null;
});

