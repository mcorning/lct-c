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
import socket from '../socket.js';

import * as easings from 'vuetify/es5/services/goto/easing-patterns';

import helpers from '@/mixins/helpers.js';

import Message from '@/models/Message';
// import State from '@/models/State';
import Visitor from '@/models/Visitor';

import diaryCard from '@/components/cards/diaryCard';

// import roomCard from "@/components/cards/roomCard";

// import roomIdentityCard from '@/components/cards/roomIdentityCard';

import clc from 'cli-color';
// const success = clc.green.bold;
const error = clc.red.bold;
// const warn = clc.yellow;
// const info = clc.cyan;
// const notice = clc.blue;
const highlight = clc.magenta;
const bold = clc.bold;

// handle previously unhandled error
window.onerror = function (message, url, lineNo, columnNo, error) {
  /// what you want to do with error here
  console.log(error.stack);
  alert('onerror: ' + message + '\n' + lineNo);
};

export default {
  name: 'Lct-C',

  components: {
    diaryCard,
    // roomCard,
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

    showDetails() {
      return this.messages.length;
    },

    firstTime() {
      let x = Visitor.all();
      return x.length === 0;
    },

    // fetch Messages for enabled visitor, if any
    // TODO Push this into Message.js as a static method
    visitorCheckins() {
      let x = this.messages.filter(
        (v) =>
          v.visitor == this.enabled.visitor.visitor && v.message == 'Entered'
      );
      return x;
    },

    roomName() {
      return this.enabled.room.room;
    },

    visitorData() {
      return {
        visitors: this.visitors,
        checkedOut: this.checkedOut,
        btnType: this.btnType,
      };
    },

    exposureWarning() {
      if (!this.messages.length) return {};
      let payload = {
        array: this.messages,
        prop: 'room',
        val: 'sentTime',
      };
      return this.groupBy(payload);
    },

    roomIsReadyToEnter() {
      return this.rooms.includes(this.enabled.room.id) && this.yourId;
    },

    messages: {
      get() {
        return Message.all();
      },
      set(newVal) {
        // flatten newVal
        const msg = {
          // id: base64id.generateId(),
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

    // state: {
    //   get() {
    //     let s = State.query().first();
    //     return s;
    //   },
    //   set(newVal) {
    //     console.log(newVal);
    //   },
    // },
  },

  data: () => ({
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

  sockets: {
    stepFourServerAlertsVisitor(exposure) {
      console.log(error('Handling stepFourServerAlertsVisitor'));
      console.log(error(this.printJson(exposure)));
      console.log(' ');
      const { room, exposedVisitor } = exposure;
      const message = `${exposure.exposedVisitor.visitor}, a recent visit to ${exposure.room} may have exposed you to COVID-19. Get tested, and quarantine, if necessary.`;
      this.messages = {
        room: room,
        visitor: exposedVisitor,
        nsp: '',
        sentTime: new Date().toISOString(),
        message: 'ALERTED',
      };
      // prepare the Alert card content -deprecated
      // this.alert = true;
      this.alertIcon = 'mdi-alert';
      this.alertColor = 'red darken-4';
      this.alertMessage = message;
      this.dialog = true;
    },

    //#region Socket.io custom events
    availableRoomsExposed(rooms) {
      const msg = rooms
        ? `Available Rooms may not be open Rooms: ${this.printJson(rooms)}`
        : 'No Rooms are online at this time.';
      this.log(msg, 'Event: availableRoomsExposed');
    },

    // Server fires this event when a Room opens/closes
    // If the opened Room has a cached warning, send it now.
    openRoomsExposed(rooms) {
      const msg = rooms
        ? `Visitor sees ${rooms.length} open Rooms `
        : 'No Rooms open at this time.';
      this.log(msg, 'Event: openRoomsExposed');
    },

    // Event sent from Server to advise Visitor to self-quarantine
    exposureAlert(alertMessage) {
      this.onExposureAlert(alertMessage);
    },

    //#endregion
  },

  // Visitor emits exposureWarning to Server sending
  //    * the Visitor object and
  //    * a collection of Rooms and dates visited

  // Server emits exposureAlert to Visitor based on Room(s)' response to exposureWarning from Visitor
  //exposureAlert contains a primary message to the Visitors:
  //    * the Visitor who issued the exposureWarning sees a confirmation message,
  //    * the other Visitor(s) receive
  //       * a message recommending self-quarantine
  //       * a packet of dates of possible exposure that is stored in the Visitor log

  methods: {
    // handles @warned event from warnRoomCard which responds to the ACK from the server upon reciept of warning
    onWarned(data) {
      const { rooms, reason } = data;
      console.group(
        `[${this.getNow()}] EVENT: onWarned (${reason}) - updating messages for ${
          this.enabled.visitor.visitor
        }'s visited Rooms:`
      );
      let roomNames = [];
      rooms.forEach((room) => {
        // memorialize the warnings
        let msg = {
          visitor: this.enabled.visitor,
          room: room.room,
          message: 'WARNED BY',
          sentTime: new Date().toISOString(),
        };
        this.messages = msg;
        roomNames.push(room.room);
      });

      // for snackbar
      this.messageColor = 'success lighten-1';
      this.feedbackMessage = `Server acknowledges warning for Room(s)
        ${roomNames.join(', ')}.`;
      this.snackBar = true;

      this.overlay = false;

      console.groupEnd();
      console.warn(
        `End of Visitor's responsibility. Room(s) take over from here...`
      );
      console.log(' ');
    },

    //#region Vue event handlers

    onAct(checkedOut) {
      // set the prop for visitorIdentityCard (disable the dropdown if entering a Room)
      this.entered = !checkedOut;

      let msg = {
        visitor: this.enabled.visitor,
        room: this.enabled.room.room,
        message: checkedOut ? 'Departed' : 'Entered',
        sentTime: new Date().toISOString(),
      };
      this.messages = msg;

      if (this.$refs.roomSelect) {
        this.$vuetify.goTo(this.$refs.roomSelect, {
          duration: 300,
          offset: 0,
          easing: this.easing,
        });
      }

      let event = checkedOut ? 'leaveRoom' : 'enterRoom';

      this.emit({
        event: event,
        message: msg,
        ack: (ACK) => {
          this.occupancy = ACK.occupants;
        },
      });
      this.messageColor = checkedOut ? 'dark success' : 'dark warning ';
      this.feedbackMessage = checkedOut
        ? `Welcome to ${this.enabled.room.room}`
        : 'See you next time...';

      let m = checkedOut ? 'out of' : 'into';
      this.checkedOut = checkedOut;

      this.log(
        `You checked ${m} ${this.enabled.room.room} {${this.enabled.room.id}}`
      );
      Visitor.update(
        this.enabled.visitor.visitor,
        this.enabled.visitor.id,
        this.nsp,
        Date.now()
      );
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

    onVisitorReady(visitor) {
      if (this.$refs.roomSelect) {
        this.$vuetify.goTo(this.$refs.roomSelect, {
          duration: 300,
          offset: 0,
          easing: this.easing,
        });
      }
      // this.enabled holds two objects: room and visitor
      // visitor will be empty during OBX
      if (visitor) {
        this.enabled.visitor = visitor;
        console.log(this.printJson(this.enabled.visitor));
      }
    },

    //#endregion

    //#region utility functions

    emit(payload) {
      socket.emit(payload.event, payload.message, payload.ack);
    },

    exposeEventPromise(clientSocket, event) {
      return new Promise(function (resolve) {
        clientSocket.emit(event, null, (results) => {
          resolve(results);
        });
      });
    },

    getEnteredMessages(room, v) {
      return v.room == room && v.message.toLowerCase() == 'entered';
    },

    getRandomIntBetween(min, max) {
      // return Math.floor(Math.random() * Math.floor(max))-1;
      return Math.random() * (max - min) + min;
    },

    groupBy(payload) {
      const { array, prop, val } = payload;
      return array.reduce(function (acc, obj) {
        acc.set(obj[prop], (acc.get(obj[prop]) || []).concat(obj[val]));
        return acc;
      }, new Map());
    },

    // this is a (more?) functional way to do grouping
    groupByFn(arr, fn) {
      return arr
        .map(typeof fn === 'function' ? fn : (val) => val[fn])
        .reduce((acc, val, i) => {
          acc[val] = (acc[val] || []).concat(arr[i]);
          return acc;
        }, {});
    },

    groupMessagesByRoomAndDate(payload) {
      const { array, prop, val } = payload;
      let visitDates = [];
      return array
        .filter((v) => v[val]) // ignore Room Opened/Closed messages
        .reduce(function (a, c) {
          // if Message does not store the entire visitor and room objects
          // then c[prop] is sufficient; otherwise use c[prop].id
          let key = c[prop];
          if (!a[key]) {
            a[key] = {
              room: '',
              dates: [],
            };
          }
          // replace moment with lighter option
          // visitDates.push(moment(c[val]).format("YYYY-MM-DD"));
          visitDates.push(new Date(c[val]));

          // if Message does not store the entire visitor and room objects
          // then c.room is sufficient; otherwise use c.room.room
          a[key] = {
            room: c.room,
            dates: visitDates,
          };
          return a;
        }, {});
    },

    // helper methods
    log(msg, type = 'information') {
      this.cons.push({
        sentTime: new Date().toUTCString(),
        type: type,
        message: msg,
      });
    },
    trace(trace) {
      const { caption, msg } = trace;
      console.log(bold(highlight(caption)));
      console.log(bold(highlight(this.printJson(msg))));
    },

    //#endregion

    //#region other important emitters

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
  },

  mixins: [helpers],

  //#endregion
  watch: {
    // in case we timeout on an async function
    overlay(val) {
      val &&
        setTimeout(() => {
          this.overlay = false;
        }, 10000);
    },

    selectedRoom(newVal, oldVal) {
      console.log(newVal, oldVal);
    },
  },

  async mounted() {
    // await State.$fetch();
    await Message.$fetch();
    await Visitor.$fetch();

    this.overlay = false;
    console.log('Visitor.vue mounted');
  },
};
</script>
