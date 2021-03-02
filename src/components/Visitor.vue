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

    <diaryCard :nickname="nickname" @exposureWarning="onExposureWarning" />

    <!-- roomCard -->
    <v-row no-gutters>
      <v-col>
        <!-- LCT-B does not interact with Rooms on the node Server.  -->
        <!-- LCT-B interacts with RedisGraph server, instead (where the ID of the room is all that's necessary for the graph.). -->
        <roomCard
          ref="roomSelect"
          :favorites="favorites"
          :log="log"
          :messages="messages"
          :nickname="nickname"
          :showLogs="showLogs"
          @spaceSelected="onSpaceSelected"
          @logVisit="onLogVisit"
        />
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

export default {
  name: 'Lct-C',

  props: {
    showLogs: Boolean,
    nickname: String,
  },

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

    onExposureWarning() {
      this.$emit('sendExposureWarning');
    },

    onLogVisit(data) {
      this.$emit('visitorLoggedVisit', data);
    },

    // LCT-B
    onSpaceSelected(selectedSpace) {
      this.$emit('warn', selectedSpace);
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

  async mounted() {
    // await State.$fetch();
    await Message.$fetch();
    // await Visitor.$fetch();

    this.overlay = false;
    console.log('Visitor.vue mounted');
  },
};
</script>
