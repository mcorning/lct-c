<template>
  <div class="fill-height">
    <!-- Spaces form -->
    <div v-if="showSpaces">
      <v-row no-gutters>
        <v-col cols="12">
          <GoogleMap v-model="location" @addedPlace="onAddedPlace" />
        </v-col>
      </v-row>
      <div v-if="byCategory">
        <v-row no-gutters>
          Or select a category
          <v-col cols="12">
            <v-chip-group v-model="selectedCategory" mandatory color="primary">
              <v-chip filter>
                <v-icon>mdi-store</v-icon>
              </v-chip>
              <v-chip filter>
                <v-icon>mdi-silverware</v-icon>
              </v-chip>

              <v-chip filter>
                <v-icon>mdi-bed</v-icon>
              </v-chip>
              <v-chip filter>
                <v-icon>mdi-theater</v-icon>
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
        <v-row no-gutters>
          {{ spaceLabel }}:
          <v-col cols="12">
            <v-autocomplete
              v-model="selectedSpace"
              :items="filteredSpaces"
              :filter="customFilter"
              item-text="name"
              item-value="id"
              return-object
              clearable
              class="pt-1"
            ></v-autocomplete>
          </v-col>
        </v-row>
      </div>
    </div>
    <!-- Spaces form -->

    <v-dialog v-model="showWarningButton" persistent max-width="350">
      <v-card
        v-if="visits && visits.length"
        color="primary"
        class="white--text"
      >
        <v-card-title class="headline">Exposure Warnings</v-card-title>
        <v-card-subtitle class="white--text"
          >Dated: {{ dated }}</v-card-subtitle
        >
        <v-card-subtitle class="white--text"
          >You will warn {{ visits.length }}
          {{ visits.length == 1 ? 'Room' : 'Rooms' }}</v-card-subtitle
        >
        <v-card-text>
          <v-card class="mx-auto" max-width="400">
            <v-list>
              <v-list-item-group v-model="model" mandatory color="primary">
                <v-list-item v-for="(option, i) in WarningOptions" :key="i">
                  <v-list-item-icon>
                    <v-icon v-text="option.icon"></v-icon>
                  </v-list-item-icon>

                  <v-list-item-content>
                    <v-list-item-title v-text="option.text"></v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list-item-group>
            </v-list>
          </v-card>
        </v-card-text>
        <v-divider class="mx-4"></v-divider>
        <v-card-title class="justify-end">Send warning?</v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="warning lighten-2" text @click="warnThem()">Yes</v-btn>
          <v-btn color="green lighten-2" text @click="returnToSpaces">No</v-btn>
        </v-card-actions>
      </v-card>

      <v-card v-else>
        <v-card-title class="headline">Exposure Warnings</v-card-title>
        <v-card-subtitle> Oops, there is nobody to warn.</v-card-subtitle>
        ><v-card-text>
          1) Be sure you have selected the correct nickname </v-card-text
        ><v-card-text>
          2) Check your Visits (you need at least one Entered record before you
          can warn a Room)</v-card-text
        >
        <v-card-actions>
          <v-btn text @click="dialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <calendarCard
      v-if="showCalendar"
      :avgStay="avgStay"
      :selectedSpace="selectedSpace"
      @logVisit="onLogVisit"
      @updateLoggedVisit="onUpdateLoggedVisit"
      @deleteVisit="onDeleteVisit"
      @error="onError($event)"
    />

    <!-- Your Logs -->
    <logsCard
      v-if="showLogs"
      :easing="easing"
      :messages="messages"
      :auditor="auditor"
    />
  </div>
</template>

<script>
import { success, error, info, printJson } from '../../utils/colors';
import { formatTime } from '../../utils/luxonHelpers';

import logsCard from '@/components/cards/logsCard';
import GoogleMap from '@/components/cards/GoogleMap';
import calendarCard from '@/components/cards/calendarCard';

import { data as communityData } from '@/maps/communityData.json';

import Visit from '@/models/Visit';

export default {
  // props passed in by Visitor.vue
  props: {
    easing: String,
    messages: Array,
    nickname: String,
    showLogs: Boolean,
    auditor: Object,
    show: Number,
  },
  components: {
    logsCard,
    GoogleMap,
    calendarCard,
  },
  computed: {
    dated() {
      return formatTime();
    },

    showSpaces() {
      return this.show == this.SPACES;
    },
    showWarningButton() {
      return this.show == this.WARNING;
    },
    showCalendar() {
      return this.show == this.CALENDAR;
    },

    categories() {
      const x = [
        ...new Set(
          communityData.filter((v) => v.category).map((v) => v.category)
        ),
      ];
      console.log(info('Categories:', x));
      return x;
    },

    spaces() {
      return communityData.map((v) => {
        return {
          name: v.id,
          id: v.code,
          category: v.category,
          position: v.position,
        };
      });
    },

    visits() {
      const v = Visit.all();
      return v;
    },
  },

  data() {
    return {
      dialog: true,
      WarningOptions: [
        {
          icon: 'mdi-alert',
          text: 'I tested positive for COVID-19',
        },
        {
          icon: 'mdi-account-alert',
          text: 'LCT warned me of exposure',
        },
        {
          icon: 'mdi-account-group',
          text: 'I was near a COVID carrier',
        },
        {
          icon: 'mdi-medical-bag',
          text: 'I present COVID symptoms',
        },
        {
          icon: 'mdi-arm-flex',
          text: 'This is an LCT Drill...',
        },
      ],
      model: 1,
      SPACES: 0,
      WARNING: 2,
      CALENDAR: 1,
      byCategory: false,
      radioGroup: 0,
      key: 1,
      location: {},
      overlay: true,
      status: 'Ready',

      newUser: false,
      avgStay: 3600000,
      categoryLabel: '',
      places: [],
      spaceLabel: '',
      ht: '520px',
      value: 0,
      selectedCategory: '',
      usePanels: false,
      alert: false,
      panelState: [],
      sheet: false,
      nsp: 'Sisters',
      filteredSpaces: [],
      categorySelected: '',
      selectedSpace: null,
    };
  },

  methods: {
    onError(event) {
      this.$emit('error', event);
    },

    logLabel() {
      return this.selectedSpace.name ? 'Log visit:' : 'Select a place';
    },
    cancel() {
      this.sheet = !this.sheet;
      this.selectedSpace = null;
    },

    customFilter(item, queryText) {
      const textOne = item.name.toLowerCase();
      const searchText = queryText.toLowerCase();
      const res = textOne.indexOf(searchText) > -1;
      return res;
    },

    onAddedPlace(place) {
      const { name, placeId, lat, lng } = place;
      if (!place) {
        alert("oops. I didn't get that. Please try again.");
        return;
      }

      try {
        // get latLng from map markers, autocomplete, or recent visits respectively
        // const lat =
        //   place.position?.lat() ||
        //   place.geometry?.location.lat() ||
        //   place.latLng?.lat;
        // const lng =
        //   place.position?.lat() ||
        //   place.geometry?.location.lng() ||
        //   place.latLng?.lng;

        // update the prop for calendarCard
        this.selectedSpace = {
          name: name,
          id: placeId,
          lat: lat,
          lng: lng,
        };

        console.log(info('Added place', printJson(this.selectedSpace)));
        this.$emit('showCalendar');
      } catch (error) {
        this.onError(error);
      }
    },

    onLogVisit(data) {
      // console.log(success('Logging visit:', printJson(data)));
      this.$emit('roomLoggedVisit', data);
    },

    onUpdateLoggedVisit(data) {
      // console.log(success('Logging visit:', printJson(data)));
      this.$emit('roomUpdateLoggedVisit', data);
    },

    onDeleteVisit(e) {
      this.$emit('roomDeletedVisit', e);
    },

    returnToSpaces() {
      this.dialog = false;
      this.$emit('showSpaces');
    },

    warnThem() {
      const reason = this.WarningOptions[this.model].text;
      console.log(reason);
      this.$emit('exposureWarning', reason);
      this.returnToSpaces();
    },
  },

  watch: {
    show(newVal, oldVal) {
      if (oldVal === this.CALENDAR) {
        this.selectedSpace = null;
      }
      switch (newVal) {
        case this.SPACES:
          this.status =
            'Click the map. Or type a place name, press Tab, and hit Enter.';
          break;

        case this.CALENDAR:
          this.status =
            'Touch and hold event, then move up/dn or change width. Move left to log, right to del.';
          break;
      }
    },

    selectedCategory(newVal) {
      this.categorySelected = this.categories[newVal];
      console.log('categorySelected', this.categorySelected);
      this.filteredSpaces = this.spaces.filter(
        (v) => v.category == this.categorySelected
      );
      this.selectedSpace = null;

      this.spaceLabel = `Then select a space for ${this.categorySelected} in ${this.nsp}`;
    },
  },

  created() {
    Visit.$fetch()
      .then((all) => {
        console.log(all);
        // this.show = this.SPACES;
        this.overlay = false;
        console.log(success('Visits'), printJson(this.visits));
      })
      .catch((e) => console.log(error(`Error in roomCard: ${e}`)));
  },

  mounted() {
    const self = this;
    this.places = communityData.filter((v) => v.position);
    this.selectedSpace = null;
    this.panelState = [0]; // open only the 0th element of expansion-panels
    let x = localStorage.getItem('avgStay');
    if (x) {
      self.avgStay = 3600000 * x;
    }
  },

  destroyed() {
    this.selectedSpace = null;
  },
};
</script>
