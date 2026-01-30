const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const COLORS = ["red", "blue", "green", "orange", "purple", "pink"];

const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];

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
});



  socket.on("draw", (data) => {
    // Broadcast to everyone except sender
    socket.broadcast.emit("draw", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("WebSocket server running on http://localhost:3000");
});
