const path = require('path');
const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const {
  printJson,
  error,
  warn,
  highlight,
  info,
  success,
} = require('../src/utils/colors.js');

const { Cache } = require('./Cache.js');
const sessionCache = new Cache(path.resolve(__dirname, 'sessions.json'));
const alertsCache = new Cache(path.resolve(__dirname, 'alerts.json'));
const errorCache = new Cache(path.resolve(__dirname, 'errors.json'));
const feedbackCache = new Cache(path.resolve(__dirname, 'feedback.json'));

const {
  graphName, // mapped to client nsp (aka namespace or community name)
  host,
  deleteVisit,
  findExposedVisitors,
  logVisit,
  onExposureWarning,
} = require('./redis');

const PORT = process.env.PORT || 3000;

const dirPath = path.join(__dirname, './dist');

console.log(highlight(new Date().toLocaleString()));
console.log(highlight('social graph:', graphName));
console.log(highlight('redis host:', host));
console.log(highlight('pwd:', dirPath));
// list past sessions (all should be connected:false)
sessionCache.print(null, 'Past Sessions:');

const server = express()
  .use(serveStatic(dirPath))
  .listen(PORT, () =>
    console.log(highlight(`Listening on http://localhost:${PORT}`))
  );

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
  if (!username) {
    return next(new Error('No username'));
  }

  // see if we have a session for the username
  if (sessionID) {
    const session = sessionCache.get(sessionID);
    sessionCache.print(session, 'Rehydrated session:');

    // if we have seen this session before, ensure the client uses the same
    // userID and username used in the last session
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      // console.group('Handshake: Known party');
      console.log(
        highlight(`LEAVING io.use() with  ${sessionID}'s session data.`)
      );
      return next();
    }
  }

  // otherwise, setup the new user...
  console.log('\n', info(new Date().toLocaleString()));
  // console.group('Handshake: Unknown party');
  console.log(warn(`Assigning new sessionID and userID for ${username}`));

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
  //#region Handling socket connection
  console.log('Client connected on socket ', socketID);
  sessionCache.set(sessionID, {
    userID: userID,
    username: username,
    lastInteraction: new Date().toLocaleString(),
    connected: true,
  });

  sessionCache.print(
    sessionID,
    `Binding Session: ${sessionID} to socket ${socketID}:`
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
    success(
      `socket ${socketID} joining ${username}'s room with userID ${userID}`
    )
  );

  // join the "userID" room
  // we send alerts using the userID stored in redisGraph for visitors
  socket.join(userID);

  if (alertsCache.has(userID)) {
    const msg = 'Your warning was cached, and now you have it.';
    // sending to individual socketid (private message)
    io.to(socketID).emit('exposureAlert', msg);
    alertsCache.delete(userID);
    alertsCache.print();
  }
  // console.groupEnd();
  //#endregion Handling socket connection

  //#region Handling Users
  // fetch existing users
  // const users = [...Object.entries(sessionCache.all())];
  const users = sessionCache.all();
  // send users back to client so they know how widespread LCT usage is
  // (the more users are active, the safer the community)
  socket.emit('users', users);
  const onlineUsers = users.filter((v) => v[1].connected);
  // console.group(`There are ${onlineUsers.length} online users:`);
  console.log(printJson(onlineUsers));
  // console.groupEnd();

  // notify existing users (this is only important if use has opted in to LCT Private Messaging)
  socket.broadcast.emit('user connected', {
    userID: userID,
    username: username,
    connected: true,
  });
  console.log('Leaving io.on(connect)');
  // console.groupEnd();
  //#endregion Handling Users

  // socket.on('exposureWarning')
  // major function:
  //  1) broadcasts message to all users (online only?) when a case of covid is found in the community
  //  2) redisGraph queries for anyone connected to the positive case (ignoring the immunity some might have)
  //  3) returns the number of possible exposures to positive case
  socket.on('exposureWarning', async (userID, ack) => {
    let everybody = await io.allSockets();
    console.log('All Online sockets:', printJson([...everybody]));

    socket.broadcast.emit('alertPending', socket.userID);

    onExposureWarning(userID)
      .then((exposed) => {
        exposed.forEach((userID) => {
          console.log(warn('Processing '), userID);
          findExposedVisitors(userID).then((userIDs) =>
            alertOthers(socket, userIDs, ack)
          );
        });
      })
      .catch((error) => console.log(error(error)));
  });

  socket.on('logVisit', (data, ack) => {
    // call the graph
    console.log(printJson(data));
    logVisit(data).then((res) => {
      console.log(res);
      ack(res);
    });
  });

  socket.on('deleteVisit', (data, ack) => {
    // call the graph
    console.log(printJson(data));
    deleteVisit(data).then((res) => {
      console.log(res);
      ack(res);
    });
  });

  socket.on('userFeedback', (data) => {
    feedbackCache.set(Date.now(), data);
    feedbackCache.save();
    feedbackCache.print(null, 'User Feedback:');
  });

  socket.on('client_error', (data) => {
    errorCache.set(Date.now(), data);
    errorCache.save();
    console.log(error('Incoming client_error!'));
    errorCache.print(null, 'Errors:');
    console.log(error('See the errors.json later for details.'));
  });

  socket.on('disconnectAsync', async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit('user disconnected', socket.userID);
      // update the connection status of the session

      sessionCache.set(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        lastInteraction: new Date().toLocaleString(),
        connected: false,
      });
      const online = sessionCache.all().filter((v) => v[1].connected);
      console.log(
        `There are ${online.length} online sessions after disconnecting ${socket.sessionID}:`
      );
      console.log(printJson(online));
    }
  });

  socket.on('disconnect', async () => {
    io.in(socket.userID)
      .allSockets()
      .then((matchingSockets) => {
        const isDisconnected = matchingSockets.size === 0;
        if (isDisconnected) {
          // notify other users
          socket.broadcast.emit('user disconnected', socket.userID);
          // update the connection status of the session

          sessionCache.set(socket.sessionID, {
            userID: socket.userID,
            username: socket.username,
            lastInteraction: new Date().toLocaleString(),
            connected: false,
          });
          const online = sessionCache.all().filter((v) => v[1].connected);
          console.log(
            `There are ${online.length} online sessions after disconnecting ${socket.sessionID}:`
          );
          console.log(printJson(online));
        }
      });
  });
});

// alerts is an array of userIDs
const alertOthers = (socket, alerts, ack) => {
  const msPerDay = 1000 * 60 * 60 * 24;

  const sendExposureAlert = (to, msg) => {
    console.log('Alerting:', to); // to is a userID (of the exposed visitor)
    socket.in(to).emit(
      'exposureAlert',
      msg,
      ack((socketID) => {
        console.log(success(socketID, 'confirms'));
      })
    );
  };

  const msg = 'Please get tested. Quarantine, if necessary.';
  alerts.forEach((to) => {
    if (io.sockets.adapter.rooms.has(to)) {
      sendExposureAlert(to, msg);
      alertsCache.delete(to);
    } else {
      alertsCache.set(to, { cached: new Date() });
    }
  });

  alertsCache
    .purge((firstDate) => {
      (Date.now() - new Date(firstDate).getTime()) / msPerDay > 14;
    })
    .then((purged) => console.log('Purged alertsCache of', purged))
    .catch((err) => console.log('Purge alertsCache error:', err));

  // const ackWarning = (results, ack) => {
  //   const ret = `Alerting ${results._resultsCount} other visitors.`;
  //   if (results._resultsCount == 0) {
  //     if (ack) {
  //       ack(ret);
  //     }
  //     return;
  //   }
  //   return results;
  // };
};
