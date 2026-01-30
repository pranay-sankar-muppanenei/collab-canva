const remoteCursors = {};
let myColor = "black";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawLine(start, end, color, width) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
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
  Object.values(remoteCursors).forEach(({ x, y, color }) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}


function getCanvasCoordinates(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  lastPos = getCanvasCoordinates(e);
});

canvas.addEventListener("mousemove", (e) => {
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



canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  lastPos = null;
});
