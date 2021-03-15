const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');
console.log(randomId());

const store = require('store2');

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
  const { sessionID, userID, username } = socket.handshake.auth;
  console.log(sessionID, userID, username);

  // if first connection, prompt client for a username
  if (!username) {
    return next(new Error('No username'));
  }

  // else see if we have a session for the username
  if (sessionID) {
    const session = store(sessionID);
    console.log('Saved session?', session);

    // if we have seen this session before, ensure the client uses the same
    // userID and username used in the last session
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      console.groupCollapsed('Handshake: Known party');
      console.log(warn(`LEAVING io.use() with  ${sessionID}'s session data.`));
      return next();
    }
  }

  // otherwise, setup the new user...
  console.log('\n', info(new Date().toLocaleString()));
  console.groupCollapsed('Handshake: Known party');
  console.log('Assigning new sessionID and userID for', username);

  //...with a userID, and a sessionID
  socket.sessionID = randomId(); // these values gets attached to the socket so the client knows which session has their data and messages
  socket.userID = randomId();

  socket.username = username; // username is fixed by client

  console.log(success('Leaving io.use()'));
  // handle the connection, storing and returning the session data to client for storage.
  next();
});

io.on('connection', (socket) => {
  //#region Handling connections
  console.log('Client connected on socket ', socket.id);
  store(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  console.log(
    `Sessions after adding ${socket.sessionID}`,
    store(socket.sessionID)
  );

  console.log('Returning session data to client');

  // emit session details so the client can store the session in localStorage
  socket.emit('session', {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
    graphName: graphName, // track the graphName so we know where messages from client end up in redisGraph
  });
  console.log(
    `socket ${socket.id} joining ${socket.username}'s room with userID ${socket.userID}`
  );

  // join the "userID" room
  // we send alerts using the userID stored in redisGraph for visitors
  socket.join(socket.userID);

  // fetch existing users
  const users = [...Object.entries(store())];
  // send users back to client so they know how widespread LCT usage is
  // (the more users are active, the safer the community)
  socket.emit('users', users);

  console.groupCollapsed('Online users:');
  console.log(printJson(users));

  let onlineUsers = users.length;
  console.log('onlineUsers: ', onlineUsers);

  console.groupEnd();

  // notify existing users (this is only important if use has opted in to LCT Private Messaging)
  socket.broadcast.emit('user connected', {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  console.log('Leaving io.on(connect)');
  console.groupEnd();
  //#endregion io.on('connect')

  // socket.on('exposureWarning')
  // major function:
  //  1) broadcasts message to all users (online only?) when a case of covid is found in the community
  //  2) server queries redisGraph for anyone connected to the positive case (ignoring the immunity some might have
  //  3) returns the number of possible exposures to positive case
  //  4)
  socket.on('exposureWarning', async (subject, ack) => {
    let everybody = await io.allSockets();
    console.log('All Online sockets:', printJson([...everybody]));

    socket.broadcast.emit('alertPending', socket.userID);
    // General policy: use "" as query delimiters (because some values are possessive)
    let query = getExposureQuery(subject);
    console.log(success('Visit query:', printJson(query)));
    Graph.query(query)
      .then((results) => ackWarning(results, ack))
      .then((results) => alertOthers(socket, results, ack))
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
    let query = getLogQuery(data);
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

      store(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
      console.log(`Sessions after adding ${socket.sessionID}`, store());
    }
    console.groupCollapsed('users after disconnect');
    console.log(users);
    console.groupEnd();
  });
});

function getLogQuery(data) {
  // visitedOn is a simple text string today. soon it will be the Date time value (from which we can derive the Date and Time of the visit. we should add the avgStay value so we can divine duration)
  let query = `MERGE (v:visitor{ name: "${data.username}", userID: "${data.userID}"}) `;
  query += `MERGE (s:space{ name: "${data.selectedSpace.name}", spaceID: "${data.selectedSpace.id}" }) `;
  query += `MERGE (v)-[r:visited{visitedOn:'${data.visitedOn}'}]->(s)`;
  console.log(warn('Visit query:', printJson(query)));
  return query;
}

function getExposureQuery(subject) {
  // in full development we should query on userID and leave userName out of the graph altogether
  let query = `MATCH (a1:visitor)-[:visited]->(s:space)<-[:visited]-(a2:visitor) `;
  query += `WHERE a1.name = "${subject}" AND a2.name <> "${subject}" `;
  query += `RETURN a2.userID`;
  return query;
}

const ackWarning = (results, ack) => {
  const ret = `Alerting ${results._resultsCount} other visitors.`;
  if (results._resultsCount == 0) {
    if (ack) {
      ack(ret);
    }
    return;
  }
  return results;
};

const alertOthers = (socket, results, ack) => {
  const msg = 'Please get tested. Quarantine, if necessary.';
  const alerts = results._results.flatMap((v) => v._values);
  alerts.forEach((to) => {
    io.in(socket.userID)
      .allSockets()
      .then((matchingSockets) => {
        if (matchingSockets.size === 0) {
          cache.set(to);
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
};
