const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

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

 socket.on("stroke:start", (data) => {
  const stroke = {
    id: data.strokeId,
    userId: socket.id,
    color: data.color,
    width: data.width,
    points: [data.point]
  };

  strokes.push(stroke);

  // 🔥 broadcast to others
  socket.broadcast.emit("stroke:start", stroke);
});

socket.on("stroke:move", (data) => {
  const stroke = strokes.find(s => s.id === data.strokeId);
  if (stroke) {
    stroke.points.push(data.point);
  }

  socket.broadcast.emit("stroke:move", {
    strokeId: data.strokeId,
    point: data.point,
    userId: socket.id
  });
});

socket.on("stroke:end", (data) => {
  socket.broadcast.emit("stroke:end", {
    strokeId: data.strokeId,
    userId: socket.id
  });
});



socket.emit("init", {
  id: socket.id,
  color: userColor
});

socket.on("cursor", (data) => {
  socket.broadcast.emit("cursor", {
    id: socket.id,
    x: data.x,
    y: data.y,
    color: data.color
  });
});

socket.on("disconnect", () => {
  socket.broadcast.emit("cursor-remove", socket.id);
  console.log("User disconnected:", socket.id);
});




  /*socket.on("draw", (data) => {
    // Broadcast to everyone except sender
    socket.broadcast.emit("draw", data);
  });*/



  socket.emit("history", strokes);

});

server.listen(3000, () => {
  console.log("WebSocket server running on http://localhost:3000");
});
