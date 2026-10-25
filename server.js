// server.js
require("tsx/cjs");

const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { createClient } = require("redis");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {

  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);

  const subscriber = createClient({ url: "redis://localhost:6379" });
  await subscriber.connect();

  await subscriber.subscribe("price-updates", (message) => {
    const data = JSON.parse(message);
    console.log("Broadcasting:", data);
    io.emit("price-update", data);
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Helios server ready on http://localhost:3000");
  });
});