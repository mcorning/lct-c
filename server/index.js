//#region Servers

const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: ['http://localhost:8080'],
  },
});

const { Graph, nsp, host } = require('./redis');
//#endregion

const DEBUG = 0;

const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const { InMemorySessionStore } = require('./sessionStore');
const sessionStore = new InMemorySessionStore();
const { printJson, warn, success } = require('./helpers.js');

//const { toUnicode } = require("punycode"); //Punycode is used to encode internationalized domain names (IDN).

const storyMap = new Map();
const storyMapSessions = new Map();
const storyMapUsers = new Map();
storyMap.set('sessions', storyMapSessions);
storyMap.set('users', storyMapUsers);

const cache = new Set();

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID; // where does client get the sessionID?
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      if (DEBUG) {
        storyMapSessions.set(
          { sessionID },
          {
            'handshake.timestamp': socket.handshake.time,
            'socket.sessionID': sessionID,
            'socket.userID': session.userID,
            'socket.username': session.username,
          }
        );
        console.log('Session data:');
        console.log(printJson([...storyMapSessions]));
      }
      console.groupCollapsed('Handshake: New party');
      console.log(warn(`LEAVING io.use() with  ${sessionID}'s session data.`));
      return next();
    }
  }

  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error('invalid username'));
  }

  console.groupCollapsed('Handshake: Known party');
  console.log('Assigning new sessionID and userID for', username);
  socket.sessionID = randomId(); // these values gets attached to the socket so the client knows which session has their data and messages
  socket.userID = randomId();
  socket.username = username; // username is fixed
  if (DEBUG) {
    storyMapUsers.set(
      { username },
      {
        'socket.sessionID': socket.sessionID,
        'socket.userID': socket.userID,
        'socket.username': socket.username,
      }
    );
    console.log('Session data:');
    console.log(printJson([...storyMap.get('sessions')]));
    console.log('User data:');
    console.log(printJson([...storyMap.get('users')]));
  }
  console.log(success('Leaving io.use()'));
  next();
});

io.on('connection', (socket) => {
  console.log("Inside io.on('connection')");

  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  if (DEBUG && storyMapSessions.size) {
    for (let session of storyMapSessions.keys()) {
      if (session.sessionID == socket.sessionID) {
        let x = storyMapSessions.get(session);
        let y = { ...x, ...{ connected: true } };
        storyMapSessions.set(session, y);
      }
    }
    console.groupCollapsed('storyMapSessions');
    console.log(printJson([...storyMapSessions]));
    console.groupEnd();
  }
  console.log('Returning session data to client');
  // emit session details
  socket.emit('session', {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
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
  console.groupEnd();

  // notify existing users
  socket.broadcast.emit('user connected', {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });
  console.log('Leaving io.on(connect)');
  console.groupEnd();

  // forward the private message to the right recipient (and to other tabs of the sender)
  // "to" is the userID of the alert recipient
  // socket.userID is the sender
  // in chat, both parties need to see the same message
  socket.on('private message', ({ content, to }) => {
    socket.to(to).to(socket.userID).emit('private message', {
      content,
      from: socket.userID,
      to,
    });
  });

  socket.on('comm check', (data, ack) => {
    console.log(success('Comm check received from', data));
    if (ack) {
      ack('connected to server');
    }
  });

  // "to" is the userID of the alert recipient
  // socket.userID is the one issuing the warning
  // (they don't need to see all subsequent alerts sent by server)
  //#region Cheatsheet
  /*
See all NODES:
MATCH n=() RETURN n

See all RELATIONSHIPs:
MATCH p=()-[*]->() RETURN p

Exposed Visitors:
MATCH (a1:visitor)-[:visited]->(s:space)<-[:visited]-(a2:visitor)  WHERE a1.name = '${subject}' AND a2.name <> '${subject}' RETURN a2.userID
e.g., by tao:
MATCH (a1:visitor)-[:visited]->(s:space)<-[:visited]-(a2:visitor)  WHERE a1.name = 'tao' AND a2.name <> 'tao' RETURN a2.userID

*/
  //#endregion

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

  // notify users upon disconnection
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

  console.groupEnd();
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () =>
  console.log(`server listening at http://localhost:${PORT}`)
);
