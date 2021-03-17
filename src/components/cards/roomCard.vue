<template>
  <div>
    <v-card class="overflow-hidden" color="primary lighten-2">
      <!-- Favorites List -->
      <v-card tile v-if="showCalendar" :height="ht">
        <calendarCard
          :avgStay="avgStay"
          :selectedSpaceName="selectedSpace.name"
          @logVisit="onLogVisit"
        />
      </v-card>

      <v-card tile v-if="showFavorites" :height="ht">
        <v-card-text>
          <v-list dense shaped max-width="300">
            <v-subheader
              >Spaces you visited recently, {{ nickname }}:</v-subheader
            >
            <v-divider></v-divider>
            <v-list-item-group v-model="favorite" color="secondary">
              <v-list-item v-for="(item, i) in favorites" :key="i">
                <v-list-item-content>
                  <v-list-item-title v-text="item"></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Spaces form -->
      <v-card v-if="showSpaces">
        <div class="px-3 pt-1 mb-1">
          <v-row no-gutters>
            <v-col cols="12">
              <GoogleMap
                :selectedSpace="selectedSpace"
                :favoritePlaces="places"
                @addedPlace="onAddedPlace"
            /></v-col>
          </v-row>
          <v-divider class="my-2"></v-divider>
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
      </v-card>
      <!-- Spaces form -->

      <!-- Getherings form button click -->
      <v-card v-if="showGatherings" :height="ht">
        <v-card-title>Identify the gathering</v-card-title>
        <v-card-text>
          <v-row no-gutters>
            <v-col cols="10" md="4">
              <v-text-field
                v-model="selectedSpace"
                hint="Use a name others in the gathering would use"
                persistent-hint
                clearable
                autofocus
              ></v-text-field
            ></v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-card>

    <v-bottom-navigation
      :value="value"
      color="secondary"
      background-color="primary"
      dark
    >
      <v-btn @click="show = 0">
        <span>Recent</span>
        <v-icon>mdi-heart</v-icon>
      </v-btn>

      <v-btn @click="show = 1">
        <span>Spaces</span>
        <v-icon>mdi-map-marker</v-icon>
      </v-btn>
      <v-btn @click="show = 2">
        <span>Calendar</span>
        <v-icon>mdi-calendar</v-icon>
      </v-btn>
      <v-btn @click="show = 3">
        <span>Gathering</span>
        <v-icon>mdi-account-group</v-icon>
      </v-btn>
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
import { success, info, highlight, printJson } from '../../utils/colors';

// import warnRoomCard from "@/components/cards/warnRoomCard";
import logsCard from '@/components/cards/logsCard';
import GoogleMap from '@/components/cards/GoogleMap';
import calendarCard from '@/components/cards/calendarCard';

import { data } from '@/maps/communityData.json';

export default {
  props: {
    easing: String,
    favorites: Array,
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
    visits() {
      return JSON.parse(localStorage.getItem('visits'));
    },

    // favorites() {
    //   return [...new Set(this.visits.map((v) => v.name))];
    // },

    showFavorites() {
      return this.show == 0;
    },
    showSpaces() {
      return this.show == 1;
    },
    showCalendar() {
      return this.show == 2;
    },
    showGatherings() {
      return this.show == 3;
    },

    selectedFavorite() {
      return this.favorites[this.favorite];
    },

    categories() {
      const x = [
        ...new Set(data.filter((v) => v.category).map((v) => v.category)),
      ];
      console.log(info('Categories:', x));
      return x;
    },

    spaces() {
      return data.map((v) => {
        return {
          name: v.id,
          id: v.code,
          category: v.category,
          position: v.position,
        };
      });
    },
  },

  data() {
    return {
      // TODO make avgStay configurable by admin or user
      avgStay: 3600000,
      categoryLabel: '',
      places: [],
      spaceLabel: '',
      show: 0,
      ht: '480px',
      value: 0,
      selectedCategory: '',
      usePanels: false,
      alert: false,
      started: new Date().toLocaleDateString('en-US'),
      panelState: [],
      sheet: false,
      dialog: false,
      favorite: -1,
      nsp: 'Sisters',
      filteredSpaces: [],
      categorySelected: '',
      selectedSpace: {},
      model: null,
    };
  },

  methods: {
    getVisits() {
      this.visits = JSON.parse(localStorage.getItem('visits'));
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
      this.selectedSpace = {
        name: place.name,
        id: place.place_id,
        category: '',
      };
      console.log(info('Added place', printJson(this.selectedSpace)));
      this.show = 2;
    },

    onLogVisit(data) {
      console.log(success('Logging visit:', printJson(data)));
      this.$emit('roomLoggedVisit', data);
    },
  },

  watch: {
    favorite() {
      this.selectedSpace.name = this.selectedFavorite;
      if (this.selectedSpace.name) {
        this.show = 2;
      }
    },

    show(newVal, oldVal) {
      if (oldVal === 2) {
        this.getVisits();
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
  async mounted() {
    this.places = data.filter((v) => v.position);
    this.selectedSpace = {};
    this.favorite = -1;
    this.panelState = [0]; // open only the 0th element of expansion-panels
  },
};
</script>
