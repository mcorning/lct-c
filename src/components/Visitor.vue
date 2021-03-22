<template>
  <div>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-snackbar
      v-model="snackBar"
      :timeout="4000"
      color="secondary"
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

    <diaryCard
      :nickname="nickname"
      :hasMessages="!!messages.length"
      @exposureWarning="onExposureWarning"
    />

    <!-- roomCard -->
    <v-row no-gutters>
      <v-col>
        <roomCard
          ref="roomSelect"
          :easing="easing"
          :favorites="favorites"
          :messages="messages"
          :nickname="nickname"
          :showLogs="showLogs"
          :auditor="auditor"
          @roomLoggedVisit="onRoomLoggedVisit"
        />
      </v-col>
    </v-row>

    <!-- likert -->
    <v-row no-gutters>
      <v-col>
        <v-card class="overflow-hidden">
          <v-card-subtitle class="text-center pa-0">
            <a :href="feedbackMail"
              >How are we doing on the Visitor experience?</a
            >
          </v-card-subtitle>
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
import crypto from 'crypto';
const randomId = () => crypto.randomBytes(8).toString('hex');

import * as easings from 'vuetify/es5/services/goto/easing-patterns';
import { success, warn, info, printJson } from '../utils/colors.js';

import Message from '@/models/Message';
import diaryCard from '@/components/cards/diaryCard';

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
    diaryCard,
    roomCard,
  },

  computed: {
    feedbackMail() {
      const feedbackMail = `mailto:mcorning@soteriaInstitute.org?subject=${this.rating} star feedback`;
      return feedbackMail;
    },

    visits() {
      return JSON.parse(localStorage.getItem('visits')) || [];
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

    rating: 3,
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
    emailDev() {},

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

    onExposureWarning() {
      console.log(warn('emitting exposureWarning'));
      this.auditor.logEntry(`emitting exposureWarning`, 'Warnings');

      this.$emit('sendExposureWarning');
    },

    onRoomLoggedVisit(visit) {
      console.log(success('Visit:', printJson(visit)));
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

  async mounted() {
    // await State.$fetch();
    await Message.$fetch();
    // await Visitor.$fetch();

    this.overlay = false;
    console.log(info('Visitor.vue mounted'));
  },
};
</script>
