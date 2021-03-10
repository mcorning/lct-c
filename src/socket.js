import { io } from "socket.io-client";
const PORT = process.env.PORT || 3000;

// const URL = `http://localhost:${PORT}`;
console.log(`Socket.io client using PORT ${PORT}`);
const socket = io({ autoConnect: false });
// const socket = io(URL, { autoConnect: false });

socket.onAny((event, ...args) => {
  console.log("onAny() event handler: event=", event);
  console.log(JSON.stringify(args, null, 3));
});
console.log("Socket created", new Date());
export default socket;
