# How It Works

This doc explains the data flow from client to server.

## Handshake

Client and Server communicate through messages across web sockets. We use Socket.io to streamline the code.

userName and userID are stored in localStorage for client and using store2 component to store on the server file system.

### Out of Box Experience

The first time a client logs in, sessionID will be null. And since the user hasn't had a chance to enter a userName, the server will return a connection error to the client.

This error triggers the Wecome card where the user enters a userName. The Welcome card then connects to the server again.

This time the server does not see a sessionID, but it does see a userName. The server then creates a sessionID, and userID. It adds the client's userName to the session object, stores the session on the file system, and connects to the client.

The client now sees a sessionID, so stores the session object for the server in localStorage.

### Subsequent Connections

The next time the client starts, it finds the stored session data in localStorage and sends it to the server. 

The server sess the connection and stores it on the filesystem again (to ensure the same data is stored on the client and the server).