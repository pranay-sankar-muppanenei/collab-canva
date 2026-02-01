const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const strokes = [];

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const COLORS = ["red", "blue", "green", "orange", "purple", "pink"];
  const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  /* ---------- STROKES ---------- */

  socket.on("stroke:start", (data) => {
    const stroke = {
      id: data.strokeId,
      userId: socket.id,
      color: data.color,
      width: data.width,
      points: [data.point],
    };

    strokes.push(stroke);

    // ✅ emit to EVERYONE (including sender)
    io.emit("stroke:start", stroke);
  });

  socket.on("stroke:move", (data) => {
    const stroke = strokes.find((s) => s.id === data.strokeId);
    if (stroke) {
      stroke.points.push(data.point);
    }

    io.emit("stroke:move", {
      strokeId: data.strokeId,
      point: data.point,
      userId: socket.id,
    });
  });

  socket.on("stroke:end", (data) => {
    io.emit("stroke:end", {
      strokeId: data.strokeId,
      userId: socket.id,
    });
  });

  /* ---------- INIT ---------- */

  socket.emit("init", {
    id: socket.id,
    color: userColor,
  });

  /* ---------- CURSOR ---------- */

  socket.on("cursor", (data) => {
    socket.broadcast.emit("cursor", {
      id: socket.id,
      x: data.x,
      y: data.y,
      color: data.color,
    });
  });

  /* ---------- UNDO ---------- */

  socket.on("undo", () => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].userId === socket.id) {
        const removed = strokes.splice(i, 1)[0];
        io.emit("undo", removed.id);
        break;
      }
    }
  });

  /* ---------- DISCONNECT ---------- */

  socket.on("disconnect", () => {
    socket.broadcast.emit("cursor-remove", socket.id);
    console.log("User disconnected:", socket.id);
  });

  /* ---------- HISTORY ---------- */

  socket.emit("history", strokes);
});

server.listen(PORT, () => {
  console.log("WebSocket server running on http://localhost:" + PORT);
});
