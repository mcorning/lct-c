import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const socket = io(URL, { autoConnect: false });

socket.onAny((event, ...args) => {
  console.log('onAny() event handler: event=', event);
  console.log(JSON.stringify(args, null, 3));
});
console.log('Socket created', new Date());
export default socket;
