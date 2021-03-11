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
    <div class="white--text py-3">
      <gmap-autocomplete @place_changed="setPlace" style="width: 80%; border">
      </gmap-autocomplete>
    </div>
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
    setPlace(place) {
      this.currentPlace = place;
      this.addMarker();
      this.$emit('addedPlace', place);
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
        this.currentPlace = null;
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
