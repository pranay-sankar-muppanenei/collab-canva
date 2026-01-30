const remoteCursors = {};
let myColor = "black";

const drawCanvas = document.getElementById("drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");


let socket = null;

function render() {
  drawCursors();
  requestAnimationFrame(render);
}

render();


function initSocketListeners(sock) {
  socket = sock;

  socket.on("draw", (data) => {
    drawLine(data.start, data.end, data.color, data.width);
  });

  socket.on("init", (data) => {
    myColor = data.color;
  });

  socket.on("cursor", (data) => {
    remoteCursors[data.id] = data;
  });

  socket.on("cursor-remove", (id) => {
    delete remoteCursors[id];
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

  if (socket) {
    socket.emit("draw", {
      start: lastPos,
      end: pos,
      color: "black",
      width: 4
    });
  }

  lastPos = pos;
});



drawCanvas.addEventListener("mouseup", () => {
  isDrawing = false;
  lastPos = null;
});
