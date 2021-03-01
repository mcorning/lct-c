//#region Servers

const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:8081'],
  },
});

const { Graph, nsp, host } = require('./redis');
//#endregion

const DEBUG = 0;

const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const { InMemorySessionStore } = require('./sessionStore');
const sessionStore = new InMemorySessionStore();
const { printJson, error, warn, success } = require('./helpers.js');

//const { toUnicode } = require("punycode"); //Punycode is used to encode internationalized domain names (IDN).

const storyMap = new Map();
const storyMapSessions = new Map();
const storyMapUsers = new Map();
storyMap.set('sessions', storyMapSessions);
storyMap.set('users', storyMapUsers);

io.use((socket, next) => {
  console.groupCollapsed('Inside io.use() handling socket', socket.id);
  const sessionID = socket.handshake.auth.sessionID; // where does client get the sessionID?
  if (sessionID) {
    console.log(
      sessionID,
      'sessionID sent by client (after a refresh or after restarting the browser)'
    );
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
      console.log(
        warn(
          'LEAVING io.use() with that session data. On to handling the connection...'
        )
      );
      console.groupEnd();
      return next();
    }
    console.log(warn('Continuing io.use() with only a sessionID'));
  }

  const username = socket.handshake.auth.username;
  if (!username) {
    console.log(
      error(
        'LEAVING io.use() because username missing (e.g., client connected, but no username specified yet). Returning "invalid username" error to client'
      )
    );
    console.groupEnd();
    return next(new Error('invalid username'));
  }

  console.log('Assigning new sessionID and userID for passed-in username');
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
  console.groupEnd();
  next();
});

io.on('connection', (socket) => {
  console.groupCollapsed("Inside io.on('connection')");

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

  // emit session details
  socket.emit('session', {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
  });

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
  console.groupCollapsed('users');
  console.log('logged in users:');
  console.log(printJson(users));
  socket.emit('users', users);
  console.groupEnd();

  // notify existing users
  socket.broadcast.emit('user connected', {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  // forward the private message to the right recipient (and to other tabs of the sender)
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

  socket.on('exposureWarning', (subject, ack) => {
    const query = `MATCH (a1:visitor)-[:visited]->(s:space)<-[:visited]-(a2:visitor) 
  WHERE a1.name = '${subject}' AND a2.name <> '${subject}' 
  RETURN a2.name, s.name`;
    console.log(success('Visit query:', printJson(query)));
    Graph.query(query)
      .then((results) => {
        console.log(printJson(results._results.map((v) => v._values)));
        const msg = `Alerting ${results._resultsCount} other visitors.`;
        console.log(msg);
        if (ack) {
          ack(msg);
        }
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
    const query = `MERGE (v:visitor{ name: '${data.username}'})
 MERGE (s:space{ name: '${data.selectedSpace}' })
 MERGE (v)-[r:visited{visitedOn:'${data.visitedOn}'}]->(s)`;
    console.log(success('Visit query:', printJson(query)));
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
