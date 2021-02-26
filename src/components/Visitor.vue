<template>
  <div>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-snackbar
      v-model="snackBar"
      :timeout="4000"
      color="primary"
      multi-line
      vertical
    >
      {{ feedbackMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn color="white" text v-bind="attrs" @click="snackBar = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <v-dialog v-model="dialog" max-width="360">
      <v-card dark>
        <v-card-title class="headline red--text">
          Covid-19 Exposure Alert
        </v-card-title>

        <v-card-text>
          {{ alertMessage }}
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn color="green darken-1" text @click="acknowledgeAlert">
            Thanks for alerting me
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <diaryCard />

    <!-- roomCard -->
    <v-row no-gutters>
      <v-col>
        <!-- LCT-B does not interact with Rooms on the node Server.  -->
        <!-- LCT-B interacts with RedisGraph server, instead (where the ID of the room is all that's necessary for the graph.). -->
        <roomCard
          ref="roomSelect"
          :log="log"
          :nickName="enabled.visitor.visitor"
          :favorites="favorites"
          @spaceSelected="onSpaceSelected"
          :messages="messages"
        />
        Users online: {{ users.length }}
      </v-col>
    </v-row>

    <!-- likert -->
    <v-row no-gutters>
      <v-col>
        <v-card class="overflow-hidden">
          <v-card-subtitle class="text-center pa-0">
            How are we doing on the Visitor experience?</v-card-subtitle
          >
          <v-rating
            v-model="rating"
            background-color="primary lighten-2"
            color="primary"
            large
            class="text-center"
          ></v-rating>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import * as easings from 'vuetify/es5/services/goto/easing-patterns';
import Message from '@/models/Message';
import diaryCard from '@/components/cards/diaryCard';

import roomCard from '@/components/cards/roomCard';

import socket from '../socket.js';

export default {
  name: 'Lct-C',

  components: {
    diaryCard,
    roomCard,
  },

  computed: {
    favorites() {
      const favs = Message.query()
        .orderBy('sentTime')
        .get()
        .map((v) => v.room);
      const favSet = new Set(favs);
      return [...favSet];
    },
    messages: {
      get() {
        return Message.all();
      },
      set(newVal) {
        // flatten newVal
        const msg = {
          room: newVal.room,
          visitor: newVal.visitor.visitor,
          roomId: newVal.room,
          visitorId: newVal.visitor.id,
          nsp: newVal.nsp,
          sentTime: newVal.sentTime,
          message: newVal.message,
        };
        // static update function on Message model
        Message.update(msg);
      },
    },
  },

  data: () => ({
    users: [],
    dialog: false,
    entered: false,
    easing: 'easeInOutCubic',
    easings: Object.keys(easings),

    overlay: true,
    snackBar: true,
    connectionMessage: 'Provide a name to Connect to the Server.',
    disconnectedFromServer: true,
    showEntryRoomCard: false,
    feedbackMessage:
      'Thanks for making us safer together using Local Contact Tracing...',
    messageColor: 'secondary lighten-1',
    socketMessage: 'visitor',
    search: '',

    oldRoomId: '',
    changingRoom: false,
    rating: 3,
    alertIcon: 'mdi-alert',
    alertColor: '',
    // alert: false,
    alertMessage: '',
    occupancy: 0,
    socketId: '',
    enabled: { visitor: {}, room: {}, canEnter: -1 },

    cons: [],
    rooms: [],
    socketServerOnline: false,
    visitFormat: 'HH:mm ddd, MMM DD',
    checkedOut: true,
  }),

  methods: {
    acknowledgeAlert() {
      this.dialog = false;

      this.emit({
        event: 'stepFiveVisitorReceivedAlert',
        message: this.enabled.visitor.id,
        ack: (ACK) => {
          this.log(ACK, 'ACK: stepFiveVisitorReceivedAlert');
        },
      });
    },

    log(msg, type = 'information') {
      this.cons.push({
        sentTime: new Date().toUTCString(),
        type: type,
        message: msg,
      });
    },
    // LCT-B
    onSpaceSelected(selectedSpace) {
      console.log('Selected Space:', selectedSpace.room, selectedSpace.id);
      this.enabled.room = selectedSpace;
      let msg = {
        visitor: this.enabled.visitor,
        room: this.enabled.room.room,
        message: 'Entered',
        sentTime: new Date().toISOString(),
      };
      this.messages = msg;
    },
  },

  watch: {
    // in case we timeout on an async function
    overlay(val) {
      val &&
        setTimeout(() => {
          this.overlay = false;
        }, 10000);
    },
  },

  created() {
    socket.on('connect', () => {
      this.socketID = socket.id;
      this.users.forEach((user) => {
        if (user.self) {
          user.connected = true;
        }
      });
    });

    socket.on('disconnect', () => {
      this.users.forEach((user) => {
        if (user.self) {
          user.connected = false;
        }
      });
    });

    const initReactiveProperties = (user) => {
      user.messages = [];
      user.hasNewMessages = false;
    };

    socket.on('users', (users) => {
      users.forEach((user) => {
        for (let i = 0; i < this.users.length; i++) {
          const existingUser = this.users[i];
          if (existingUser.userID === user.userID) {
            existingUser.connected = user.connected;
            return;
          }
        }
        user.self = user.userID === socket.userID;
        initReactiveProperties(user);
        this.users.push(user);
      });
      // put the current user first, and sort by username
      this.users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      });
    });

    socket.on('user connected', (user) => {
      for (let i = 0; i < this.users.length; i++) {
        const existingUser = this.users[i];
        if (existingUser.userID === user.userID) {
          existingUser.connected = true;
          return;
        }
      }
      initReactiveProperties(user);
      this.users.push(user);
    });

    socket.on('user disconnected', (id) => {
      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        if (user.userID === id) {
          user.connected = false;
          break;
        }
      }
    });

    socket.on('private message', ({ content, from, to }) => {
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
    });
  },

  destroyed() {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('users');
    socket.off('user connected');
    socket.off('user disconnected');
    socket.off('private message');
  },

  async mounted() {
    // await State.$fetch();
    await Message.$fetch();
    // await Visitor.$fetch();

    this.overlay = false;
    console.log('Visitor.vue mounted');
  },
};
</script>
