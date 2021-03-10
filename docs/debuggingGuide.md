# LCT-C Debugging Guide

If you get an INUSE error on port 3000, you can confirm a running instance of node with this command in the Terminal:

```bash
netstat -ona | grep "3000"

```

Sometimes, you can avoid this error by closing all browsers running LCT, then close the server.

But his error comes and goes. Sorry.
## VS Code

Where and how you start a debugging session can make a difference to how you see debug output. If you use a Terminal View (see below), you will not see collapsed console groups; you will see all the data at once. This can be hard to follow with high data volume.

You have several ways to launch LCT-C debugging sessions for Vue and Node simultaneously in VSCode.

## Configuration

## Launch Debugger

### From Debug Extension

### From Javascript Debug Terminal
