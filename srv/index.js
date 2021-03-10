const express = require("express");
const socketIO = require("socket.io");
const serveStatic = require("serve-static");

const path = require("path");

const { printJson, warn } = require("../src/utils/colors.js");

const { Graph, graphName, nsp, host } = require("./redis");
console.log(graphName, nsp, host);

const PORT = process.env.PORT || 3000;
// const INDEX = "/index.html";

const dirPath = path.join(__dirname, "./dist");
console.log(dirPath);

const server = express()
  //   .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .use(serveStatic(dirPath))
  .listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

const io = socketIO(server);

io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("disconnect", () => console.log("Client disconnected"));

    socket.on("logVisit", (data, ack) => {
      // this is where we send a Cypher query to RedisGraph
      // General policy: use "" as query delimiters (because some values are possessive)
      let query = `MERGE (v:visitor{ name: "${data.username}", userID: "${data.userID}"}) `;
      query += `MERGE (s:space{ name: "${data.selectedSpace.name}", spaceID: "${data.selectedSpace.id}" }) `;
      query += `MERGE (v)-[r:visited{visitedOn:'${data.visitedOn}'}]->(s)`;
      console.log(warn("Visit query:", printJson(query)));
      Graph.query(query)
        .then((results) => {
          const stats = results._statistics._raw;
          console.log(`stats: ${printJson(stats)}`);
          if (ack) {
            ack(stats);
          }
        })
        .catch((error) => {
          console.log(error);
          console.log(
            `Be sure there is a graph named "${nsp}" on the Redis server: ${host}`
          );
        });
    });
  });
});

// setInterval(() => io.emit("time", new Date().toTimeString()), 1000);
