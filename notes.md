launch client
client has a connected socket (how?)
socket has a sessionID in auth
session is not stored on server
auth does not have a username
return error to client

repeats one more time


client load
fill in field
io.use():
server sees auth:
{username: 'mpc'}
server assigns random sessionID and userID
assigns auth username to socket.username

io.on('connection'):
save socket.sessionID
```
sessionStore.findSession(socket.sessionID);
{userID: '4bef34eaaedc3cb7', username: 'mpc', connected: true}
connected:true
userID:'4bef34eaaedc3cb7'
username:'mpc'
```

emit session event (client listening?)

socket joins itself

  ```socket.join(socket.userID);```

  socket.emits users event with users array as data

  broadcast to all users id and name of new user

  waits for private message

  waits for disconnect


  refresh browser
  socket auth only has a sessionID
  this time server finds the sessionID (because the previous visit stored it as above)
  assigns to socket.sessionID, socket.userID, socket.username

  io.on('connection'):
  socket.sessionID is the same as the previous step
  