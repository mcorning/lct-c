const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const store = require('./store');

const cache = new Map();

const path = require('path');

const { printJson, warn, info, success } = require('../src/utils/colors.js');

const {
  Graph,
  graphName, // mapped to client nsp (aka namespace or community name)
  host,
  findExposedVisitors,
  logVisit,
  onExposureWarning,
} = require('./redis');

const PORT = process.env.PORT || 3000;

const dirPath = path.join(__dirname, './dist');

console.log(new Date().toLocaleString());
console.log('social graph:', graphName);
console.log('redis host:', host);
console.log('pwd:', dirPath);
// list past sessions (all should be connected:false)
store.print(null, 'Past Sessions:');

const server = express()
  .use(serveStatic(dirPath))
  .listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));

const io = socketIO(server);

io.use((socket, next) => {
  const { sessionID, userID, username } = socket.handshake.auth;
  console.log(
    warn(
      sessionID || 'No stored session',
      '\t',
      userID || 'No userID',
      '\t',
      username || 'No username'
    )
  );

  // if first connection, prompt client for a username
  // if (!username) {
  //   return next(new Error('No username'));
  // }

  // see if we have a session for the username
  if (sessionID) {
    const session = store.get(sessionID);
    store.print(session, 'Rehydrated session:');

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
  const { id: socketID, sessionID, userID, username } = socket;
  //#region Handling connections
  console.log('Client connected on socket ', socketID);
  store.set(sessionID, {
    userID: userID,
    username: username,
    connected: true,
  });
  console.log(
    `Binding Session: ${sessionID} to socket ${socketID}:`,
    store.print(sessionID)
  );

  console.log('Returning session data to client');

  // emit session details so the client can store the session in localStorage
  socket.emit('session', {
    sessionID: sessionID,
    userID: userID,
    username: username,
    graphName: graphName, // track the graphName so we know where messages from client end up in redisGraph
  });
  console.log(
    `socket ${socketID} joining ${username}'s room with userID ${userID}`
  );

  // join the "userID" room
  // we send alerts using the userID stored in redisGraph for visitors
  socket.join(userID);

  // fetch existing users
  const users = [...Object.entries(store.all())];
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
    userID: userID,
    username: username,
    connected: true,
  });
  console.log('Leaving io.on(connect)');
  console.groupEnd();
  //#endregion io.on('connect')

  // socket.on('exposureWarning')
  // major function:
  //  1) broadcasts message to all users (online only?) when a case of covid is found in the community
  //  2) server queries redisGraph for anyone connected to the positive case (ignoring the immunity some might have)
  //  3) returns the number of possible exposures to positive case
  // moving code to redis.js
  // socket.on('exposureWarning1', async (subject, ack) => {
  //   let everybody = await io.allSockets();
  //   console.log('All Online sockets:', printJson([...everybody]));

  //   socket.broadcast.emit('alertPending', socket.userID);
  //   // General policy: use "" as query delimiters (because some values are possessive)
  //   let query = getExposureQuery(subject);
  //   console.log(success('Visit query:', printJson(query)));
  //   Graph.query(query)
  //     .then((results) => ackWarning(results, ack))
  //     .then((results) => alertOthers(socket, results, ack))
  //     .catch((error) => {
  //       console.log(error);
  //       console.log(
  //         `Be sure there is a graph named "${nsp}" on the Redis server: ${host}`
  //       );
  //     });
  // });
  socket.on('exposureWarning', async (userID, ack) => {
    let everybody = await io.allSockets();
    console.log('All Online sockets:', printJson([...everybody]));

    socket.broadcast.emit('alertPending', socket.userID);

    onExposureWarning(userID).then((exposed) => {
      exposed.forEach((userID) => {
        console.log(userID);
        findExposedVisitors(userID).then((userIDs) =>
          alertOthers(socket, userIDs, ack)
        );
      });
    });
  });

  socket.on('logVisit', (data, ack) => {
    logVisit(data, ack);
  });

  socket.on('disconnect', async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit('user disconnected', socket.userID);
      // update the connection status of the session

      store.set(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
      console.log(`Sessions after disconnecting ${socket.sessionID}:`);
      store.print();
    }
    console.groupCollapsed(
      `There are ${users.length} users after this disconnect`
    );
    console.log(users);
    console.groupEnd();
  });
});

// this query gets called for each exposed visit date for a given subject
// function getExposureQuery(subject) {
// in full development we should query on userID and leave userName out of the graph altogether
// let query = `MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) `;
// query += `WHERE a1.name = "${subject}" AND a2.name <> "${subject}" `;
// query += `RETURN a2.userID`;

//   let q = `MATCH (a1:visitor{name:'${subject}'})-[v:visited]->(s:space)<-[v2:visited]-(a2:visitor)
//     WHERE a2.name <> a1.name
//     AND v2.start>=v.start
//     RETURN a2.userID`; //a2.name, id(a2), s.name, id(s), v.start, id(v), v2.start, id(v2)`;

//   return q;
// }

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

const alertOthers = (socket, alerts, ack) => {
  // alerts is an array of userIDs
  const msg = 'Please get tested. Quarantine, if necessary.';
  // const alerts = results._results.flatMap((v) => v._values);
  alerts.forEach((to) => {
    io.in(socket.userID)
      .allSockets()
      .then((matchingSockets) => {
        if (matchingSockets.size === 0) {
          cache.set(to);
          console.log('Cache:', printJson(cache));
        } else {
          console.log('Alerting:', to); // to is a userID (of the exposed visitor)
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
