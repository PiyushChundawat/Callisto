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

  const subscriber = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  subscriber.on("error", (err) => console.error("Redis subscriber error:", err));
  await subscriber.connect();

  let broadcastCount = 0;

  await subscriber.subscribe("price-updates", (message) => {
    const data = JSON.parse(message);
    broadcastCount++;
    io.emit("price-update", data);
  });

  setInterval(function () {
    console.log(
      "Pushed " + broadcastCount + " price updates to " + io.engine.clientsCount + " connected clients in the last minute"
    );
    broadcastCount = 0;
  }, 60000);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, "0.0.0.0", () => {
    console.log("Helios server ready on port", port);
  });
});