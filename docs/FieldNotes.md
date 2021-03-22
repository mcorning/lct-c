# Field Notes

This is a collection of technical details that may help you understand how some of the more arcane parts of Local Contact Tracing work.

## Acknowledgements

Socket.io adds a call back function to Web Socket messages.

### Handling the exposureAlert on the client

For example, here's the code that handles the exposureAlert in the client (the event emitted by the server follows below):

```js
    socket.on('exposureAlert', (alert, ack) => {
      this.exposureAlert = true;
      this.alertText = alert;
      if (ack) {
        ack(socket.id);
      }
      this.auditor.logEntry(alert, 'Alert');
    });

```

The first arg (`exposureAlert`) is the name of the alert emitted by the server. Our second arg is a function that accepts two args:

1. the data in the message (`alert`)
2. a callback function used by the server (`ack`)

> NOTE: event handlers must have the first arg, and my have the second arg. The second arg can be the data arg alone, or the second arg can be a function that accepts data and a function.

### Emitting the exposureAlert from the server

So here's the server code that emits the all important `exposureAlert` message:

```js
    socket.in(to).emit(
      'exposureAlert',
      msg,
      ack((socketID) => {
        console.log(success(socketID, 'confirms'));
      })
    );
```

In this special case the server (emitter) is using the socket in the room (`to`) occupied by the client who will receive the warning. This is essentially a private message (`exposureAlert`) from the server to the client.

The emit function has up to three arguments. The first is the same message name handled by the client above. The second arg (`msg`) is the optional data to convey in the message. The third arg (`ack`) is a function that can handle data returned by the client (at some point in the message handling body running on the client).

In our case with the `exposureAlert`, the server wants to know that the message got the client. The contract between server and client is:

* I need to print evidence that the `exposureAlert` got to the intended socket.
* Please send me your `socket.id` as that evidence
* When I see the value, I will print it on my console

### Schematically

socket.emit() | socket.on()
------------- | -----------
name, [data],[anonymous function] | name, [data] or [(data, function([msg]))]