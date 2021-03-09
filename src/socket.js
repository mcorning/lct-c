import { io } from 'socket.io-client';
const PORT = process.env.PORT || 3000;

const URL = `http://localhost:${PORT}`;
const socket = io(URL, { autoConnect: false });

socket.onAny((event, ...args) => {
  console.log('onAny() event handler: event=', event);
  console.log(JSON.stringify(args, null, 3));
});
console.log('Socket created', new Date());
export default socket;
