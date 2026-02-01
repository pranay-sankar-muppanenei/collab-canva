/* =======================
   STATE
======================= */

const remoteCursors = {};
const strokesMap = {};

let myColor = "black";
let socket = null;

let isDrawing = false;
let lastPos = null;
let currentStrokeId = null;

/* =======================
   CANVAS SETUP
======================= */

const drawCanvas = document.getElementById("drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");

function resizeCanvas() {
  drawCanvas.width = window.innerWidth;
  drawCanvas.height = window.innerHeight;
  cursorCanvas.width = window.innerWidth;
  cursorCanvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* =======================
   DRAW HELPERS
======================= */

function drawLine(start, end, color, width) {
  drawCtx.beginPath();
  drawCtx.moveTo(start.x, start.y);
  drawCtx.lineTo(end.x, end.y);
  drawCtx.strokeStyle = color;
  drawCtx.lineWidth = width;
  drawCtx.lineCap = "round";
  drawCtx.stroke();
}

function getCanvasCoordinates(event) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

/* =======================
   CURSOR RENDER LOOP
======================= */

function drawCursors() {
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

  Object.values(remoteCursors).forEach(({ x, y, color }) => {
    cursorCtx.beginPath();
    cursorCtx.arc(x, y, 5, 0, Math.PI * 2);
    cursorCtx.fillStyle = color;
    cursorCtx.fill();
  });
}

function render() {
  drawCursors();
  requestAnimationFrame(render);
}
render();

/* =======================
   SOCKET SETUP
======================= */

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

  /* ---------- STROKES ---------- */

  socket.on("stroke:start", (stroke) => {
    strokesMap[stroke.id] = {
      color: stroke.color,
      width: stroke.width,
      points: [...stroke.points],
    };
  });

  socket.on("stroke:move", (data) => {
    const stroke = strokesMap[data.strokeId];
    if (!stroke) return;

    const lastPoint = stroke.points[stroke.points.length - 1];
    drawLine(lastPoint, data.point, stroke.color, stroke.width);
    stroke.points.push(data.point);
  });

  /* ---------- HISTORY ---------- */

  socket.on("history", (strokes) => {
    strokes.forEach((stroke) => {
      strokesMap[stroke.id] = {
        color: stroke.color,
        width: stroke.width,
        points: [...stroke.points],
      };

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

  /* ---------- UNDO ---------- */

  socket.on("undo", (strokeId) => {
    delete strokesMap[strokeId];

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    Object.values(strokesMap).forEach((stroke) => {
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

/* =======================
   SOCKET INIT SAFE
======================= */

window.addEventListener("socket-ready", () => {
  initSocketListeners(window.socket);
});

if (window.socket && !socket) {
  initSocketListeners(window.socket);
}

/* =======================
   DRAW EVENTS
======================= */

drawCanvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  lastPos = getCanvasCoordinates(e);
  currentStrokeId = crypto.randomUUID();

  // 🔥 ADD OWN STROKE LOCALLY


  socket?.emit("stroke:start", {
    strokeId: currentStrokeId,
    color: "black",
    width: 4,
    point: lastPos,
  });
});


drawCanvas.addEventListener("mousemove", (e) => {
  const pos = getCanvasCoordinates(e);

  socket?.emit("cursor", {
    x: pos.x,
    y: pos.y,
    color: myColor,
  });

  if (!isDrawing) return;

  drawLine(lastPos, pos, "black", 4);



  socket?.emit("stroke:move", {
    strokeId: currentStrokeId,
    point: pos,
  });

  lastPos = pos;
});

drawCanvas.addEventListener("mouseup", () => {
  socket?.emit("stroke:end", { strokeId: currentStrokeId });

  isDrawing = false;
  lastPos = null;
  currentStrokeId = null;
});

/* =======================
   UNDO BUTTON
======================= */

document.getElementById("undoBtn").addEventListener("click", () => {
  socket?.emit("undo");
});
