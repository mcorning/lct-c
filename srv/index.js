const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');
console.log(randomId());
const { InMemorySessionStore } = require('./sessionStore');
const sessionStore = new InMemorySessionStore();
const cache = new Map();

const path = require('path');

const { printJson, warn, info, success } = require('../src/utils/colors.js');

const { Graph, graphName, nsp, host } = require('./redis');
console.log(graphName, nsp, host);

const PORT = process.env.PORT || 3000;

const dirPath = path.join(__dirname, './dist');
console.log(dirPath);

const server = express()
  .use(serveStatic(dirPath))
  .listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

const io = socketIO(server);

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID; // where gets sessionId handling socket.emit('session')
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      console.groupCollapsed('Handshake: New party');
      console.log(warn(`LEAVING io.use() with  ${sessionID}'s session data.`));
      return next();
    }
  }

  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error('invalid username'));
  }
  console.log('\n', info(new Date().toLocaleString()));
  console.groupCollapsed('Handshake: Known party');
  console.log('Assigning new sessionID and userID for', username);
  socket.sessionID = randomId(); // these values gets attached to the socket so the client knows which session has their data and messages
  socket.userID = randomId();
  socket.username = username; // username is fixed

  console.log(success('Leaving io.use()'));
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected on socket ', socket.id);
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  console.log('Returning session data to client');
  // emit session details
  socket.emit('session', {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
    graphName: graphName,
  });
  console.log(`socket ${socket.id} joining ${socket.username}'s room`);
  // join the "userID" room
  socket.join(socket.userID);

  // fetch existing users
  const users = [];
  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
    });
  });

  console.groupCollapsed('Online users:');
  console.log(printJson(users));
  socket.emit('users', users);
  let onlineUsers = users.length;
  console.log('onlineUsers: ', onlineUsers);
  socket.emit('users online', onlineUsers);
  console.groupEnd();

  // notify existing users
  socket.broadcast.emit('user connected', {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  console.log('Leaving io.on(connect)');
  console.groupEnd();

  socket.on('exposureWarning', (subject, ack) => {
    socket.broadcast.emit('alertPending', socket.userID);

    // General policy: use "" as query delimiters (because some values are possessive)
    let query = `MATCH (a1:visitor)-[:visited]->(s:space)<-[:visited]-(a2:visitor) `;
    query += `WHERE a1.name = "${subject}" AND a2.name <> "${subject}" `;
    query += `RETURN a2.userID`;
    console.log(success('Visit query:', printJson(query)));

    Graph.query(query)
      .then((results) => {
        const ret = `Alerting ${results._resultsCount} other visitors.`;
        if (results._resultsCount == 0) {
          if (ack) {
            ack(ret);
          }
          return;
        }
        const msg = 'Please get tested. Quarantine, if necessary.';

        const alerts = results._results.flatMap((v) => v._values);
        alerts.forEach((to) => {
          io.in(socket.userID)
            .allSockets()
            .then((matchingSockets) => {
              if (matchingSockets.size === 0) {
                cache.add(to);
                console.log('Cache:', printJson(cache));
              } else {
                console.log('Alerting:', to);
                socket.in(to).emit(
                  'exposureAlert',
                  msg,
                  ack((res) => {
                    console.log(success(res, 'confirms'));
                  })
                );
              }
            })
            .catch((error) => {
              console.log(error);
            });
        });
      })
      .catch((error) => {
        console.log(error);
        console.log(
          `Be sure there is a graph named "${nsp}" on the Redis server: ${host}`
        );
      });
  });
  socket.on('logVisit', (data, ack) => {
    // this is where we send a Cypher query to RedisGraph
    // General policy: use "" as query delimiters (because some values are possessive)
    let query = `MERGE (v:visitor{ name: "${data.username}", userID: "${data.userID}"}) `;
    query += `MERGE (s:space{ name: "${data.selectedSpace.name}", spaceID: "${data.selectedSpace.id}" }) `;
    query += `MERGE (v)-[r:visited{visitedOn:'${data.visitedOn}'}]->(s)`;
    console.log(warn('Visit query:', printJson(query)));
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

  socket.on('disconnect', async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit('user disconnected', socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
    }
    console.groupCollapsed('users after disconnect');
    console.log(users);
    console.groupEnd();
  });
});

// setInterval(() => io.emit("time", new Date().toTimeString()), 1000);
