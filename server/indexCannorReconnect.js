const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:8080',
  },
});

const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const { InMemorySessionStore } = require('./sessionStore');
const sessionStore = new InMemorySessionStore();
const { printJson, error, warn, success, highlight } = require('./helpers.js');
const { version } = require('./package.json');
const { DateTime } = require('luxon');
// const { toUnicode } = require('punycode'); //Punycode is used to encode internationalized domain names (IDN).

const storyMap = new Map();
const storyMapSessions = new Map();
const storyMapUsers = new Map();
storyMap.set('sessions', storyMapSessions);
storyMap.set('users', storyMapUsers);

// Move this up to Vue glogals based on process.env
const DEBUG = 0;

// When the user logs in on the client for the first time on any client browser:
//    - the entered username decorates the client socket
//    - the client socket then connects to the server
//    - after server returns session data, client stores sessionID in localStorage
// Subsequent logins for the each used client browser
//    by:
//      - refreshing or restarting the browser
//      - opening another public tab
//    will reuse the initial sessionID for that client
// NOTE: opening a private or incognito window starts the login process over again
io.use((socket, next) => {
  console.groupCollapsed(
    '\nInside io.use() handling socket',
    socket.handshake.auth.sessionID,
    socket.handshake.auth.username.userName
  );
  const sessionID = socket.handshake.auth.sessionID; // where does client get the sessionID?
  // false after the first login
  if (sessionID) {
    console.log(
      'sessionID sent by client (after a refresh or after restarting the browser)'
    );
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;

      tellSessionStory(sessionID, socket, session);

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

  // auth.username has value only during initial login
  // not included in subsequent auth objects (only sessionID is in auth (see above))
  const username = socket.handshake.auth.username;
  // usually skipped because either a username or a sessionID come from the client
  if (!username) {
    console.log(
      error(
        'LEAVING io.use() because username missing (e.g., client connected, but no username specified yet). Returning "invalid username" error to client'
      )
    );
    console.groupEnd();
    return next(new Error('invalid username'));
  }

  // finish the initial login
  // create the new session
  console.log('Assigning new sessionID and userID for passed-in username');
  socket.sessionID = randomId(); // these values gets attached to the socket so the client knows which session has their data and messages
  socket.userID = randomId();
  socket.username = username; // username is fixed

  // additional console logging
  tellUserStory(username, socket);

  // move on to next middleware or io.on('connection')
  next();
});

io.on('connection', (socket) => {
  console.groupCollapsed("Inside io.on('connection')");

  // socket contains all necessary data from middleware processing
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  tellConnectionStory(socket);
  console.groupEnd();

  // emit session details
  socket.emit('session', {
    sessionID: socket.sessionID,
    userID: socket.userID,
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

function tellConnectionStory(socket) {
  if (storyMapSessions.size && DEBUG) {
    for (let session of storyMapSessions.keys()) {
      if (session.sessionID == socket.sessionID) {
        let x = storyMapSessions.get(session);
        let y = { ...x, ...{ connected: true } };
        storyMapSessions.set(session, y);
      }
    }
    console.groupCollapsed('storyMapSessions');
    console.log(printJson([...storyMapSessions]));
  }
}

function tellSessionStory(sessionID, socket, session) {
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
}

function tellUserStory(username, socket) {
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
    console.log(success('Leaving io.use()'));
    console.groupEnd();
  }
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(
    highlight(
      `Running index.js version ${version} at ${DateTime.now().toLocaleString(
        DateTime.DATETIME_FULL
      )}`
    )
  );
  console.log(highlight(`Server listening at http://localhost:${PORT}`));
});
