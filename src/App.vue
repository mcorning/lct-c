<template>
  <v-app>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-app-bar app color="primary" dense dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-navigation-drawer v-model="drawer" app>
        <Chat :nsp="nsp" :query="query" />
      </v-navigation-drawer>

      <v-row align="center" no-gutters>
        <v-spacer></v-spacer>
        <v-col cols="auto" class="text-right"
          ><v-card-title>Local Contact Tracing </v-card-title>
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
      <v-row v-if="!usernameAlreadySelected" justify="center" no-gutters>
        <Welcome @input="onUsernameSelection" />
      </v-row>
      <v-row v-else justify="start" no-gutters>
        <v-col cols="cols">
          <Visitor
            :showLogs="showLogs"
            :nickname="username"
            @warn="onWarn"
            @visitorLoggedVisit="onVisitorLoggedVisit"
          />
        </v-col>
      </v-row>
      <!-- <v-row>
        <v-col>
          <Chat :nsp="nsp" :query="query" />
        </v-col>
      </v-row> -->
    </v-main>

    <v-app-bar app bottom dense color="primary" dark>
      <v-row align="center" dense justify="space-between" no-gutters>
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
        <v-col class="text-center">
          <small>Ver: {{ build }} </small>
        </v-col>
        <v-col class="text-right">
          <v-btn text @click="showLogs = !showLogs">
            <v-icon>mdi-console</v-icon>
          </v-btn>
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
import Chat from './components/Chat';
import socket from './socket';

export default {
  name: 'App',
  components: {
    Chat,
    Visitor,
    Welcome,
  },
  computed: {
    build() {
      return this.$store.getters.appVersion;
    },
  },
  data() {
    return {
      query: '',
      showLogs: false,
      drawer: false,
      showUsers: true,
      cols: '',
      connectionStatus: false,
      nsp: 'Sisters',
      overlay: true,
      usernameAlreadySelected: false,
      sid: '',
      uid: 'Not connected',
      username: '',
    };
  },
  methods: {
    onConnectionStatusChanged(val) {
      this.connectionStatus = val;
    },

    onUsernameSelection(username) {
      this.usernameAlreadySelected = true;
      this.username = username;
      socket.auth = { username };
      socket.connect();
    },

    onVisitorLoggedVisit(data) {
      // this is where we send a Cypher query to RedisGraph
      const query = `MERGE (v:visitor{ name: '${this.username}'})
 MERGE (s:space{ name: '${data.selectedSpace}' })
 MERGE (v)-[r:visited{visitedOn:'${data.visitedOn}'}]->(s)`;
      console.log('RedisGraph query:');
      console.log(query);
      socket.emit('logVisit', query, (results) => console.log(results));
    },

    onWarn(val) {
      alert('Warning! ' + val);
    },

    showChat() {
      this.showUsers = !this.showUsers;
      this.cols = this.showUsers ? 10 : 12;
    },
  },

  mixins: [update, helpers],

  watch: {
    // in case we timeout on an async function
    overlay(val) {
      val &&
        setTimeout(() => {
          this.overlay = false;
        }, 10000);
    },
  },

  //#region Lifecycle Hooks
  created() {
    const sessionID = localStorage.getItem('sessionID');

    if (sessionID) {
      this.usernameAlreadySelected = true;
      // this.sid = sessionID;
      socket.auth = { sessionID };
      // if server finds a session we will connect
      socket.connect();
    }

    socket.on('connect', () => {
      // this.onConnectionStatusChanged(true);
      // this.uid = socket.userID;
      socket.emit('comm check on socket', socket.id, (ack) => {
        console.log(ack);
      });
    });

    socket.on('session', ({ sessionID, userID, username }) => {
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in the localStorage
      localStorage.setItem('sessionID', sessionID);
      // save the ID of the user
      socket.userID = userID;
      // this.sid = sessionID;
      this.username = username;
    });

    socket.on('connect_error', (err) => {
      if (err.message === 'invalid username') {
        this.usernameAlreadySelected = false;
        // this.sid = '';
      }
    });
  },

  destroyed() {
    socket.off('connect_error');
  },

  async mounted() {
    this.overlay = false;
    console.log('Visitor.vue mounted');
  },
  //#endregion
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
