<template>
  <v-app>
    <v-app-bar app color="primary" dense dark>
      <v-row align="center" justify="space-between" no-gutters>
        <v-col>
          <soteria-icon />
          <a
            class="white--text"
            href="https://soteriainstitute.org/safe-in-sisters/"
            target="_blank"
            rel="noopener"
            style="text-decoration: none"
            >Soteria</a
          >
        </v-col>
        <v-spacer></v-spacer>
        <v-col cols="auto"
          ><v-card-title class="d-sm-none">LCT - {{ nsp }} </v-card-title>
          <v-card-title class="d-sm-inline d-none">
            Local Contact Tracing - {{ nsp }}</v-card-title
          >
        </v-col>
        <v-col cols="1">
          <v-avatar size="36px"> <img :src="avatar" /> </v-avatar>
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
      <!-- <Welcome v-if="usernameAlreadySelected" /> -->
      <Welcome v-if="!sid" @input="onUsernameSelection" />

      <Visitor v-else />

      <!-- For later when we add back messaging
        <v-row v-else>
        <v-col cols="3">
          <Chat />
        </v-col>
        <v-col cols="9">
          <Visitor />
        </v-col>
      </v-row>  -->
    </v-main>

    <v-app-bar app bottom height="36" dense color="primary" dark>
      <v-row align="center" dense justify="space-between" no-gutters>
        <v-col class="text-left">
          <small>You: {{ uid }} </small>
        </v-col>
        <v-col class="text-center">
          <small>Ver: {{ build }} </small>
        </v-col>
        <v-col class="text-right">
          <small>Session: {{ sid }} </small>
        </v-col>
      </v-row>
    </v-app-bar>
  </v-app>
</template>

<script>
import Visitor from './components/Visitor';
import Welcome from './components/Welcome';
import update from '@/mixins/update.js';
import helpers from '@/mixins/helpers.js';
// import Chat from './components/Chat';
import socket from './socket';

export default {
  name: 'App',
  components: {
    // Chat,
    Visitor,
    Welcome,
  },
  computed: {
    avatar() {
      let randomId = Math.round(Math.random() * 100);
      return `https://randomuser.me/api/portraits/men/${randomId}.jpg`;
    },
    build() {
      return this.$store.getters.appVersion;
    },
  },
  data() {
    return {
      nsp: 'Sisters',
      usernameAlreadySelected: false,
      sid: '',
      uid: 'Not connected',
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
    console.log(sessionID);
    if (sessionID) {
      this.usernameAlreadySelected = true;
      this.sid = sessionID;
      socket.auth = { sessionID };
      socket.connect();
    }

    socket.on('session', ({ sessionID, userID }) => {
      console.log(sessionID, userID);
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in the localStorage
      localStorage.setItem('sessionID', sessionID);
      // save the ID of the user
      socket.userID = userID;
      this.sid = sessionID;
      this.uid = userID;
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'invalid username') {
        this.usernameAlreadySelected = false;
        this.sid = '';
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
