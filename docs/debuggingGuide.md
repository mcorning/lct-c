# LCT-C Debugging Guide

LCT works through a node server that renders compiled Javascript built by Vue-CLI and sent the srv/dist folder.

## Troubleshooting

Before debugging, be sure the version running in the browser is the same as in the srv/dist folder.

> In other words, do a hard refresh on the browser to clear the cache of old code.


If the code is not the same, you will not see bound breakpoints in the debugger client-side.

## tl;dr

Start the debugger for index.js
Start another debugger for Chrome on port 3000.

If you change the Vue code, you need to rebuild before you can debug.

## Configuration

See the debug configuration file for details

## Launch Debugger

From the debug explorer:
Choose `Launch index.js` from the debug dropdown
Press `F5` or hit the *green* start button in the dropdown

Then choose `3000 vuejs:chrome` option
Press `F5` or hit the *green* start button in the dropdown

> NOTE: To get symbols loaded, be sure all browsers running LCT are closed before starting the debugger for Chrome.
## Port conflicts

If you get an INUSE error on port 3000, you can confirm a running instance of node with this command in the Terminal:

```bash
netstat -ona | grep "3000"

```

Sometimes, you can avoid this error by closing all browsers running LCT, then close the server.

But this error comes and goes. Sorry.


