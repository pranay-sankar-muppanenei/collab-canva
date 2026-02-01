// Entry point for the app
console.log("Canvas app started");

// Create socket and expose globally
window.socket = io("https://collab-canva-backend.onrender.com", {
  transports: ["websocket"],
});


window.socket.on("connect", () => {
  console.log("Connected to server:", window.socket.id);
});

// 🔥 signal that socket is ready
window.dispatchEvent(new Event("socket-ready"));

console.log("Canvas app started");
