process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  process.exit(1); //mandatory (as per the Node.js docs)
});

//#region express code
const app = require('express')();
const httpServer = require('http').createServer(app);

const serveStatic = require('serve-static');
const path = require('path');

//#endregion end express code

//#region Socket.io Server initialization
// let namespace = "/";
// let nsp = "sisters";
// const io = require("socket.io")(http);
// const io = require('socket.io')();
// or

// overload to use passed in ID as socket.id
// const options = {
//   allowEIO3: true,
// };
// const io = require("socket.io")(httpServer, options);
// io.engine.generateId = (req) => {
//   const parsedUrl = new url.parse(req.url);
//   const params = new URLSearchParams(parsedUrl.search);
//   const prevId = params.get("id");
//   // prevId is either a valid id or an empty string
//   if (!prevId) {
//     return prevId;
//   }
//   return base64id.generateId();
// };

// const url = require("url");
// const base64id = require("base64id");

//#region socket.io server code
// io.on("connection", (socket) => {
//   console.log(socket.id);
// });
//#endregion

const port = process.env.PORT || 8080;
const hostname = port == 8080 ? 'localhost' : process.env.hostname;

const dirPath = path.join(__dirname, './dist');
console.log(dirPath);
app.use(serveStatic(dirPath));

httpServer.listen(port, hostname, () => {
  console.log(`Server running on http://${hostname}:${port}`);
  console.log(' ');
});
