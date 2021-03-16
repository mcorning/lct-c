<template>
  <div>
    <gmap-map :center="center" :zoom="16" style="width: 100%; height: 400px">
      <gmap-marker
        :key="index"
        v-for="(m, index) in markers"
        :position="m.position"
        @click="center = m.position"
      ></gmap-marker>
    </gmap-map>

    <gmap-autocomplete
      @place_changed="setPlace"
      style="width: 70%; border: orange; border-width: 2px; border-style: solid"
    >
    </gmap-autocomplete>

    <v-tooltip top>
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          v-bind="attrs"
          v-on="on"
          color="success"
          fab
          medium
          dark
          class="ml-5"
          @click="logVisit"
        >
          <v-icon>mdi-calendar</v-icon>
        </v-btn>
      </template>
      <span>Send to calendar </span></v-tooltip
    >
  </div>
</template>

<script>
import { info, printJson } from '../../utils/colors';

import { defaultLocation } from '../../maps/mapconfig.json';
console.log(defaultLocation);

export default {
  name: 'GoogleMap',

  props: {
    selectedSpace: Object,
    favoritePlaces: Array,
  },

  data() {
    return {
      center: { lat: defaultLocation[0], lng: defaultLocation[1] },
      markers: [],
      places: [],
      currentPlace: null,
    };
  },

  mounted() {
    this.geolocate();

    this.addMarker();
  },

  methods: {
    logVisit() {
      this.$emit('addedPlace', this.currentPlace);
    },

    setPlace(place) {
      this.currentPlace = place;
      this.addMarker();
    },

    addMarker() {
      if (this.currentPlace) {
        const marker = {
          lat: this.currentPlace.geometry.location.lat(),
          lng: this.currentPlace.geometry.location.lng(),
        };
        this.markers.push({ position: marker });
        this.places.push(this.currentPlace);
        this.center = marker;
      }
    },
    geolocate: function () {
      navigator.geolocation.getCurrentPosition((position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      });
    },
  },

  watch: {
    currentPlace(n, o) {
      console.log('currentPlace new/old', n, o);
    },

    selectedSpace(newVal) {
      if (newVal.position) {
        console.log(info(printJson(newVal)));
        const { position } = newVal;
        const marker = {
          lat: position[0],
          lng: position[1],
        };
        this.markers.push({ position: marker });
        this.center = marker;
      }
    },
  },
};
</script>
