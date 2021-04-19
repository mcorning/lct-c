<template>
  <div>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-snackbar
      v-model="snackBar"
      :timeout="4000"
      :color="color"
      multi-line
      vertical
    >
      {{ feedbackMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn color="white" text v-bind="attrs" @click="act"> Close </v-btn>
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

    <!-- <diaryCard
      :nickname="nickname"
      :hasMessages="!!messages.length"
      @exposureWarning="onExposureWarning"
    /> -->

    <!-- roomCard -->
    <v-row no-gutters>
      <v-col>
        <roomCard
          ref="roomSelect"
          :easing="easing"
          :messages="messages"
          :nickname="nickname"
          :showLogs="showLogs"
          :auditor="auditor"
          @roomLoggedVisit="onRoomLoggedVisit"
          @roomUpdateLoggedVisit="onRoomUpdateLoggedVisit"
          @roomDeletedVisit="onRoomDeletedVisit"
          @error="onError($event)"
          @exposureWarning="onExposureWarning($event)"
        />
      </v-col>
    </v-row>

    <!-- likert -->
    <v-row no-gutters>
      <v-col>
        <v-card tile class="overflow-hidden">
          <v-row align="center" justfy="space-around">
            <v-col class="text-center">
              <v-btn text @click="emailDev(true)">
                <v-icon color="primary" left> mdi-thumb-up </v-icon></v-btn
              ></v-col
            >
            <v-spacer></v-spacer>
            <v-col cols="6">
              <v-rating
                v-model="rating"
                background-color="primary lighten-2"
                color="primary"
                class="text-center"
              ></v-rating
            ></v-col>
            <v-spacer></v-spacer>
            <v-col class="text-center">
              <v-btn text @click="emailDev(false)">
                <v-icon color="primary" right> mdi-thumb-down </v-icon></v-btn
              ></v-col
            >
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import crypto from 'crypto';
const randomId = () => crypto.randomBytes(8).toString('hex');

import * as easings from 'vuetify/es5/services/goto/easing-patterns';
import { warn, info } from '../utils/colors.js';

import Message from '@/models/Message';
import Visit from '@/models/Visit';
// import diaryCard from '@/components/cards/diaryCard';

import roomCard from '@/components/cards/roomCard';

export default {
  name: 'Lct-C',

  // props passed in by App.vue
  props: {
    showLogs: Boolean,
    nickname: String,
    userID: String,
    auditor: Object,
  },

  components: {
    // diaryCard,
    roomCard,
  },

  computed: {
    color() {
      return this.error ? 'red' : 'secondary';
    },

    visits() {
      return Visit.all();
    },

    favorites() {
      return [...new Set(this.visits.map((v) => v.name))];
    },

    favoriteMessages() {
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
          id: randomId(),
          room: newVal.room,
          roomId: newVal.room,
          visitor: this.nickname,
          visitorId: this.userID,
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
    action: '',
    error: false,
    devs: 'mcorning@soteriaInstitute.org',
    dialog: false,
    entered: false,
    easing: 'easeInOutCubic',
    easings: Object.keys(easings),

    overlay: true,
    snackBar: false,
    connectionMessage: 'Provide a name to Connect to the Server.',
    disconnectedFromServer: true,
    showEntryRoomCard: false,
    feedbackMessage: '',
    messageColor: 'secondary lighten-1',
    socketMessage: 'visitor',
    search: '',

    rating: 0,
    alertIcon: 'mdi-alert',
    alertColor: '',
    alertMessage: '',
    socketId: '',
    enabled: { visitor: {}, room: {}, canEnter: -1 },

    cons: [],
    rooms: [],
    socketServerOnline: false,
    visitFormat: 'HH:mm ddd, MMM DD',
    checkedOut: true,
  }),

  methods: {
    act() {
      if (this.action === 'ERROR') {
        this.error = false;
        this.action = '';
      }
      this.snackBar = false;
    },

    onError(e) {
      this.auditor.logEntry(e, 'Error');
      this.error = true;
      this.action = 'ERROR';
      this.feedbackMessage =
        'Oops. We have logged an error and will get on it right away.';
      this.snackBar = true;
      this.$emit('error', e);
    },

    emailDev(good) {
      switch (good) {
        case true:
          this.$emit('userFeedback', 'BZ');
          window.location = `mailto:${this.devs}?subject=LCT user says, 'BZ'`;
          break;
        case false:
          this.$emit('userFeedback', 'Boo');
          window.location = `mailto:${this.devs}?subject=LCT user says, 'Boo'`;
          break;
        default:
          this.$emit('userFeedback', `${this.rating}-Stars`);
          window.location = `mailto:${this.devs}?subject=LCT gets ${this.rating}-Star feedback`;
      }
    },

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

    onExposureWarning(reason) {
      console.log(
        warn(`Visitor.js: Emitting exposureWarning because "${reason}"`)
      );
      this.auditor.logEntry(`emitting exposureWarning`, 'Warnings');

      this.$emit('sendExposureWarning', reason);
    },

    onRoomLoggedVisit(visit) {
      // console.log(success('Visit:', printJson(visit)));
      // cache the visit in Messages
      let msg = {
        visitor: this.nickname,
        room: visit.name,
        message: 'Entered',
        sentTime: new Date().toISOString(),
      };
      this.messages = msg;

      // notify App.vue so it can send event to server
      this.$emit('visitorLoggedVisit', visit);
    },

    onRoomUpdateLoggedVisit(visit) {
      // console.log(success('Visit:', printJson(visit)));
      // cache the visit in Messages
      let msg = {
        visitor: this.nickname,
        room: visit.name,
        message: 'Updated',
        sentTime: new Date().toISOString(),
      };
      this.messages = msg;

      // notify App.vue so it can send event to server
      this.$emit('visitorUpdateLoggedVisit', visit);
    },

    onRoomDeletedVisit(e) {
      // cache the visit in Messages
      let msg = {
        visitor: this.nickname,
        room: e.name,
        message: 'Deleted',
        sentTime: new Date().toISOString(),
      };
      this.messages = msg;

      // notify App.vue so it can send event to server
      this.$emit('visitorDeletedVisit', e);
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
    rating() {
      this.emailDev();
    },
  },

  async mounted() {
    // await State.$fetch();
    await Message.$fetch();
    // await Visitor.$fetch();

    this.overlay = false;
    console.log(info('Visitor.vue mounted'));
  },
};
</script>
