<template>
  <v-app>
    <v-app-bar app color="primary" dense dark>
      <v-row align="center" justify="space-between" dense>
        <v-col>
          <v-btn width="48" height="48" color="primary" text>
            <soteria-icon />
          </v-btn>
          <a
            class="white--text"
            href="https://soteriainstitute.org/safe-in-sisters/"
            target="_blank"
            rel="noopener"
            style="text-decoration: none"
            ><small>Soteria Institute</small></a
          >
        </v-col>

        <v-col cols="auto"
          ><v-card-title class="d-sm-none">LCT</v-card-title>
          <v-card-title class="d-sm-inline d-none">
            Local Contact Tracing</v-card-title
          >
        </v-col>
      </v-row>
    </v-app-bar>
    <v-snackbar
      centered
      :value="updateExists"
      :timeout="-1"
      color="primary darken-1"
      vertical
    >
      An update is available. This will have no effect on your stored data. It
      will, however, keep your LCT in sync with the server.

      <template v-slot:action="{ attrs }">
        <v-btn color="white" text v-bind="attrs" @click="refreshApp">
          Update
        </v-btn>
      </template>
    </v-snackbar>
    <v-main>
      <select-username
        v-if="!usernameAlreadySelected"
        @input="onUsernameSelection"
      />
      <v-row v-else>
        <v-col>
          <chat />
        </v-col>
        <v-col>
          <Visitor />
        </v-col>
      </v-row>
    </v-main>

    <v-app-bar bottom dense app color="primary" dark>
      <v-row align="center" dense justify="space-between">
        <v-col class="text-left"><small>Put Socket URL here</small></v-col>
        <v-col class="text-right">
          <small>Put build nr here </small>
          <!-- <small>V {{ build }} </small> -->
        </v-col>
      </v-row>
    </v-app-bar>
  </v-app>
</template>

<script>
import Visitor from './components/Visitor';
import update from '@/mixins/update.js';
import helpers from '@/mixins/helpers.js';
import SelectUsername from './components/SelectUsername';
import Chat from './components/Chat';
import socket from './socket';

export default {
  name: 'App',
  components: {
    Chat,
    SelectUsername,
    Visitor,
  },
  data() {
    return {
      usernameAlreadySelected: false,
    };
  },
  methods: {
    onUsernameSelection(username) {
      this.usernameAlreadySelected = true;
      socket.auth = { username };
      socket.connect();
    },
  },

  mixins: [update, helpers],

  created() {
    const sessionID = localStorage.getItem('sessionID');

    if (sessionID) {
      this.usernameAlreadySelected = true;
      socket.auth = { sessionID };
      socket.connect();
    }

    socket.on('session', ({ sessionID, userID }) => {
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in the localStorage
      localStorage.setItem('sessionID', sessionID);
      // save the ID of the user
      socket.userID = userID;
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'invalid username') {
        this.usernameAlreadySelected = false;
      }
    });
  },
  destroyed() {
    socket.off('connect_error');
  },
};
</script>

<style>
body {
  margin: 0;
}

@font-face {
  font-family: Lato;
  src: url('/fonts/Lato-Regular.ttf');
}

#app {
  font-family: Lato, Arial, sans-serif;
  font-size: 14px;
}
</style>
