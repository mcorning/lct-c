<template>
  <v-app>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
    <v-card v-if="showBigQrCode" class="mt-15">
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-img
            class="mt-5"
            src="../src/assets/lct-c2QR.jpeg"
            v-bind="attrs"
            v-on="on"
            @click="showBigQrCode = false"
          ></v-img>
        </template>
        <span>Click to dismiss</span></v-tooltip
      >
    </v-card>
    <v-app-bar app color="primary" dense dark>
      <!-- <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon> -->
      <!-- <v-navigation-drawer v-model="drawer" app>
        <Chat :nsp="nsp" :query="query" />
      </v-navigation-drawer> -->

      <v-row align="center" no-gutters>
        <v-col class="text-left">
          <v-card-title>
            <a
              class="white--text"
              href="https://soteriainstitute.org/safe-in-sisters/"
              target="_blank"
              rel="noopener"
              style="text-decoration: none"
            >
              Local Contact Tracing - {{ namespace }}
            </a></v-card-title
          >
        </v-col>
      </v-row>
    </v-app-bar>

    <!-- PWA Update -->
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

    <!-- Alert Snackbar -->
    <v-snackbar
      top
      :value="alertPending"
      :timeout="-1"
      color="orange darken-3"
      vertical
      dark
      max-width="400"
    >
      <v-card dark color="orange darken-1" v-if="alertPending">
        <v-card-title>COVID-19 Detected</v-card-title>
        <v-card-subtitle>
          Someone in your community has tested positive for COVID-19.
        </v-card-subtitle>
        <v-card-text class="white--text">
          You will see an exposure alert next only if you shared the same space
          with that person.</v-card-text
        >
      </v-card>

      <template v-slot:action="{ attrs }">
        <v-btn color="white" text v-bind="attrs" @click="alertPending = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Alert Snackbar -->
    <v-snackbar
      :value="exposureAlert"
      :timeout="-1"
      color="red darken-3"
      vertical
      centered
      dark
      max-width="400"
    >
      <v-card dark color="red darken-1" v-if="exposureAlert">
        <v-card-title>COVID-19 Exposure Alert</v-card-title>
        <v-card-subtitle>
          You shared space recently with someone who tested positive
        </v-card-subtitle>
        <v-card-text>
          Please get tested. If you are positive you can spread the virus - even
          if you are immune.</v-card-text
        >
      </v-card>

      <template v-slot:action="{ attrs }">
        <v-btn color="white" text v-bind="attrs" @click="exposureAlert = false">
          OK
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
            :userID="userID"
            :auditor="auditor"
            @sendExposureWarning="onSendExposureWarning"
            @visitorLoggedVisit="onVisitorLoggedVisit"
            @visitorDeletedVisit="onVisitorDeletedVisit"
            @userFeedback="onUserFeedback"
            @error="onError($event)"
          />
        </v-col>
        <!-- Logged Visit confirmation -->
        <v-snackbar v-model="hasSaved" :timeout="4000" bottom left>
          {{ confirmationMessage }}
        </v-snackbar>
      </v-row>
    </v-main>

    <v-system-bar app window dense color="primary" dark>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
            @click="showBigQrCode = !showBigQrCode"
          >
            <v-icon>mdi-qrcode</v-icon>
          </v-btn>
        </template>
        <span>Toggle QR to share LCT</span></v-tooltip
      >
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">LCT v.{{ build }} </span>
        </template>
        <span>Version of LCT-C</span></v-tooltip
      >

      <v-spacer></v-spacer>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="pr-3" v-bind="attrs" v-on="on"
            >{{ connectIcon }}
          </v-icon>
        </template>
        <span
          >{{ showUsername }} unique userId:
          {{ userID ? userID : 'is unavailable' }}</span
        >
      </v-tooltip>

      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="pr-3" v-bind="attrs" v-on="on"
            >{{ userCount }}
          </v-icon>
        </template>
        <span>Total number of LCT-C users</span>
      </v-tooltip>

      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon class="pr-3" v-bind="attrs" v-on="on">mdi-graphql </v-icon>
        </template>
        <span
          >Name of exposure alert graph:
          {{ graphName ? graphName : 'is not available' }}
        </span></v-tooltip
      >
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon v-bind="attrs" v-on="on" @click="showLogs = !showLogs"
            >mdi-console</v-icon
          >
        </template>
        <span>Review Audit Trail </span></v-tooltip
      >
    </v-system-bar>
  </v-app>
</template>

<script>
import crypto from 'crypto';
const randomId = () => crypto.randomBytes(8).toString('hex');

import Visit from '@/models/Visit';

import Visitor from './components/Visitor';
import Welcome from './components/Welcome';
// import Chat from './components/Chat';

import socket from './socket';
import { printJson, highlight, success } from './utils/colors';
import update from '@/mixins/update.js';
import helpers from '@/mixins/helpers.js';

class Auditor {
  constructor() {
    this.log = new Map();
  }

  findLogEntry(id) {
    return this.log.get(id);
  }

  logEntry(entry, type = 'info') {
    this.log.set(randomId(), {
      message: entry,
      type: type,
      sentTime: new Date().toISOString(),
    });
  }

  findAllLogEntries() {
    return [...this.log.values()];
  }
}

export default {
  name: 'App',
  components: {
    // Chat,
    Visitor,
    Welcome,
  },
  computed: {
    showUsername() {
      return this.username ? `${this.username}'s` : '';
    },

    connectIcon() {
      return this.userID ? 'mdi-lan-connect' : 'mdi-lan-disconnect';
    },

    build() {
      return this.$store.getters.appVersion;
    },
    alertColor() {
      return this.alertPending ? 'orange darken-2' : 'red darken-1';
    },
  },
  data() {
    return {
      namespace: 'Sisters', // move this to a global config file
      showBigQrCode: false,
      confirmationMessage: '',
      sessionID: '',
      userCount: 0,
      selectedSpace: '',
      hasSaved: false,
      auditor: new Auditor(),
      graphName: '',
      alertText: '',
      alertMe: false,
      exposureAlert: false,
      alertPending: false,
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
      userID: '',
      username: '',
    };
  },
  methods: {
    onError(e) {
      console.log(`Sending error to server`, e);
      socket.emit('client_error', e);
    },

    hardRefresh() {
      window.location.replace(window.location.href);
    },

    onConnectionStatusChanged(val) {
      this.connectionStatus = val;
    },

    onUsernameSelection({ username, sessionID }) {
      this.usernameAlreadySelected = true;
      this.username = username;
      console.log('onUsernameSelection()', this.username);

      socket.auth = { username, sessionID };
      socket.connect();
    },

    onVisitorEditedLoggedVisit(visit) {
      const query = {
        logged: visit.logged,
        start: visit.start,
        end: visit.end,
      };
      console.log(highlight(`Edited Visit query: ${printJson(query)}`));
      this.updateVisitOnGraph(query).then((results) => {
        Visit.updateVisitPromise(visit.id, results.id).then(() => {
          console.log(success(`Logged Visit:`, printJson(visit)));
        });
      });
    },

    onVisitorLoggedVisit(visit) {
      const { id, name, start, end, logged } = visit;
      this.selectedSpace = visit;
      const query = logged
        ? { logged, start, end }
        : {
            username: this.username,
            userID: socket.userID,
            selectedSpace: name,
            start: start,
            end: end,
          };
      console.log(highlight(`App.js: Visit: ${printJson(visit)}`));
      console.log(highlight(`App.js: Visit query: ${printJson(query)}`));
      this.auditor.logEntry(`Visit query: ${printJson(query)}`, 'Log Visit');

      // send the visit to the server
      this.updateVisitOnGraph(query).then((results) => {
        Visit.updateVisitPromise(id, results.id).then(() => {
          console.log(success(`Logged Visit:`, printJson(visit)));
        });

        console.log('updateVisitOnGraph', name, results);

        this.auditor.logEntry(
          `Log Visit Results: ${printJson(results)}`,
          'Log Visit'
        );

        this.confirmationMessage = `You have logged ${this.selectedSpace.name}`;
        this.hasSaved = true;
      });
    },

    updateVisitOnGraph(query) {
      return new Promise((resolve) => {
        socket.emit('logVisit', query, (results) => {
          resolve(results);
        });
      });
    },

    onUserFeedback(e) {
      console.log('userFeedback:', e);
      socket.emit('userFeedback', e);
    },

    onVisitorDeletedVisit(e) {
      this.selectedSpace = e;
      const query = {
        username: this.username,
        userID: socket.userID,
        selectedSpace: e.name,
        start: e.start,
        end: e.end,
      };
      this.auditor.logEntry(
        `DELETE Visit query: ${printJson(query)}`,
        'DELETE Visit'
      );

      // send the visit to the server
      socket.emit('deleteVisit', query, (results) => {
        this.auditor.logEntry(
          `Delete Visit Results: ${printJson(results)}`,
          'DELETE Visit'
        );

        this.confirmationMessage = `You have deleted ${this.selectedSpace.name}`;
        this.hasSaved = true;
      });
    },

    onSendExposureWarning() {
      socket.emit('exposureWarning', this.userID, (results) =>
        this.auditor.logEntry(
          `exposureWarning results: ${printJson(results)}`,
          'Warnings'
        )
      );
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
    this.sessionID = localStorage.getItem('sessionID');
    this.username = localStorage.getItem('username');
    console.log('created()', this.username);
    if (this.sessionID) {
      this.usernameAlreadySelected = true;
      // this.sid = sessionID;
      socket.auth = { sessionID: this.sessionID, username: this.username };
      // if server finds a session we will connect
      socket.connect();
    }

    socket.on('connect', () => {
      this.auditor.logEntry(`Socket ${socket.id} connected`);
      this.auditor.logEntry(`updateExists: ${this.updateExists}`, 'PWA');
    });

    socket.on('session', ({ sessionID, userID, username, graphName }) => {
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in the localStorage
      localStorage.setItem('sessionID', sessionID);
      // save the ID of the user
      // TODO isn't userID already assigned in middleware?
      socket.userID = userID;
      // this.sid = sessionID;
      this.username = username;
      console.log('on Session', this.username);

      this.userID = userID;
      this.graphName = graphName;
    });

    socket.on('connect_error', (err) => {
      this.usernameAlreadySelected = err.message != 'No username';
    });

    socket.on('exposureAlert', (alert, ack) => {
      this.exposureAlert = true;
      this.alertText = alert;
      if (ack) {
        ack(socket.id);
      }
      this.auditor.logEntry(alert, 'Alert');
    });

    socket.on('alertPending', () => {
      this.alertPending = true;
    });

    socket.on('users online', (userCount) => {
      this.auditor.logEntry(`Current total LCT-C2 user count: ${userCount}`);

      this.userCount = userCount;
    });

    socket.on('private message', ({ content, from, to }) => {
      if (this.users) {
        for (let i = 0; i < this.users.length; i++) {
          const user = this.users[i];
          const fromSelf = socket.userID === from;
          if (user.userID === (fromSelf ? to : from)) {
            user.messages.push({
              content,
              fromSelf,
            });
            if (user !== this.selectedUser) {
              user.hasNewMessages = true;
            }
            break;
          }
        }
      }
    });
  },

  // anything that takes this control out of memory (e.g., v-if that turns false) will trigger this event
  destroyed() {
    // should we turn off session and connect_error?
    // what is the genaral rule for destroyed()?
    socket.off('alertPending');
    socket.off('connect');
    socket.off('disconnect');
    socket.off('exposureAlert');
    socket.off('users');
    socket.off('user connected');
    socket.off('users online');
    socket.off('user disconnected');
    socket.off('private message');
  },

  async mounted() {
    Visit.$fetch();
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
