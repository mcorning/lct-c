<template>
  <div>
    <v-overlay :value="overlay">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
    <v-card class="overflow-hidden">
      <!-- Spaces form -->
      <v-card v-if="showSpaces">
        <div class="px-3 pt-1">
          <v-row no-gutters>
            <v-col cols="12">
              <v-sheet>
                <GoogleMap v-model="location" @addedPlace="onAddedPlace" />
              </v-sheet>
            </v-col>
          </v-row>
          <v-divider class="my-2"></v-divider>
          <div v-if="byCategory">
            <v-row no-gutters>
              Or select a category
              <v-col cols="12">
                <v-chip-group
                  v-model="selectedCategory"
                  mandatory
                  color="primary"
                >
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
      </v-card>
      <!-- Spaces form -->

      <v-card tile v-if="showCalendar">
        <calendarCard
          :avgStay="avgStay"
          :selectedSpaceName="selectedSpace.name"
          @logVisit="onLogVisit"
          @updateLoggedVisit="onUpdateLoggedVisit"
          @deleteVisit="onDeleteVisit"
          @error="onError($event)"
        />
      </v-card>
    </v-card>

    <v-bottom-navigation
      :value="value"
      color="secondary"
      background-color="primary"
      dark
    >
      <v-spacer></v-spacer>

      <v-btn @click="show = SPACES">
        <span>Spaces</span>
        <v-icon>mdi-map-marker</v-icon>
      </v-btn>

      <v-btn @click="show = CALENDAR">
        <span>Calendar</span>
        <v-icon>mdi-calendar</v-icon>
      </v-btn>

      <v-spacer></v-spacer>

      <v-btn fab color="red" dark @click="warnThem">
        <span>Warn</span>
        <v-icon dark> mdi-alert </v-icon></v-btn
      >
    </v-bottom-navigation>

    <!-- Your Logs -->
    <logsCard
      v-if="showLogs"
      :easing="easing"
      :messages="messages"
      :auditor="auditor"
      :roomName="selectedSpace.name"
    />
  </div>
</template>

<script>
import { success, error, info, highlight, printJson } from '../../utils/colors';

// import warnRoomCard from "@/components/cards/warnRoomCard";
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
  },
  components: {
    // warnRoomCard,
    logsCard,
    GoogleMap,
    calendarCard,
  },
  computed: {
    showSpaces() {
      return this.show == this.SPACES;
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
      SPACES: 0,
      CALENDAR: 1,
      byCategory: false,
      radioGroup: 0,
      key: 1,
      location: {},
      overlay: true,
      showWarningButton: true,
      status: '',

      newUser: false,
      // TODO make avgStay configurable by admin or user
      avgStay: 3600000,
      categoryLabel: '',
      places: [],
      spaceLabel: '',
      show: 0,
      ht: '520px',
      value: 0,
      selectedCategory: '',
      usePanels: false,
      alert: false,
      panelState: [],
      sheet: false,
      dialog: false,
      nsp: 'Sisters',
      filteredSpaces: [],
      categorySelected: '',
      selectedSpace: {},
      model: null,
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
      this.selectedSpace = {};
    },

    customFilter(item, queryText) {
      const textOne = item.name.toLowerCase();
      const searchText = queryText.toLowerCase();
      const res = textOne.indexOf(searchText) > -1;
      return res;
    },

    onAddedPlace(place) {
      if (!place) {
        alert("oops. I didn't get that. Please try again.");
        return;
      }
      this.selectedSpace = {
        name: place.name,
        id: place.place_id,
        category: '',
      };
      console.log(info('Added place', printJson(this.selectedSpace)));
      this.show = this.CALENDAR;
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

    warnThem() {
      this.$emit('exposureWarning');
    },
  },

  watch: {
    show(newVal, oldVal) {
      if (oldVal === this.CALENDAR) {
        this.selectedSpace.name = '';
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

    selectedSpace(newVal) {
      console.log(highlight(printJson(newVal)));
    },

    selectedCategory(newVal) {
      this.categorySelected = this.categories[newVal];
      console.log('categorySelected', this.categorySelected);
      this.filteredSpaces = this.spaces.filter(
        (v) => v.category == this.categorySelected
      );
      this.selectedSpace = {};

      this.spaceLabel = `Then select a space for ${this.categorySelected} in ${this.nsp}`;
    },
  },

  created() {
    Visit.$fetch()
      .then((all) => {
        console.log(all);
        this.show = this.visits.length ? 0 : 1;
        this.overlay = false;
        console.log(success('Visits'), printJson(this.visits));
      })
      .catch((e) => console.log(error(`Error in roomCard: ${e}`)));
  },

  mounted() {
    this.places = communityData.filter((v) => v.position);
    this.selectedSpace = {};
    this.panelState = [0]; // open only the 0th element of expansion-panels
  },

  destroyed() {
    this.selectedSpace = null;
  },
};
</script>
