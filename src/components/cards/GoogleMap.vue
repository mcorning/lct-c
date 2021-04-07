<template>
  <div>
    <gmap-map
      :center="center"
      :zoom="zoom"
      style="width: 100%; height: 400px"
      ref="mapRef"
      @click="getMarker($event)"
      @rightclick="mapRclicked"
    >
      <gmap-info-window
        :options="infoOptions"
        :position="infoWindowPos"
        :opened="infoWinOpen"
        @closeclick="infoWinOpen = false"
      >
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn small fab v-bind="attrs" v-on="on" color="orange">
              <v-icon>mdi-account-group</v-icon>
            </v-btn>
          </template>
          <span>Mark your calendar with a Gathering </span></v-tooltip
        >
        {{ infoContent }}

        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              color="success"
              fab
              small
              dark
              class="ml-5"
              @click="addVisit"
            >
              <v-icon>mdi-calendar</v-icon>
            </v-btn>
          </template>
          <span>Mark your calendar with a Visit</span></v-tooltip
        >
      </gmap-info-window>

      <gmap-marker
        :key="index"
        v-for="(m, index) in markers"
        :position="m.position"
        @click="toggleInfoWindow(m, index)"
      >
        <gmap-info-window :opened="m.ifw">{{ m.ifw2text }}</gmap-info-window>
      </gmap-marker>
    </gmap-map>

    <gmap-autocomplete
      @place_changed="setPlace"
      autofocus
      auto-select-first
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
          @click="addVisit"
        >
          <v-icon>mdi-calendar</v-icon>
        </v-btn>
      </template>
      <span>Mark your calendar </span></v-tooltip
    >
  </div>
</template>

<script>
import { info, printJson } from '../../utils/colors';

import { defaultLocation } from '../../maps/mapconfig.json';
console.log(defaultLocation);

export default {
  // see main.js for vue2-google-maps instantiation
  name: 'GoogleMap',

  props: {
    selectedSpace: Object,
    favoritePlaces: Array,
  },

  computed: {
    infowindow() {
      // eslint-disable-next-line
      return new google.maps.InfoWindow({ content: this.content });
    },
    image() {
      return 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';
    },
  },

  data() {
    return {
      infoContent: 'Your selected space is here',
      infoWindowPos: null,
      infoWinOpen: false,
      currentMidx: null,
      //optional: offset infowindow so it visually sits nicely on top of our marker
      infoOptions: {
        pixelOffset: {
          width: 0,
          height: -35,
        },
      },
      infoTitle: 'Visit',
      content: 'Default info',
      zoom: 16,
      center: { lat: defaultLocation[0], lng: defaultLocation[1] },
      markers: [],
      places: [],
      currentPlace: null,
      lastId: 1,
      ifw: true,
      ifw2text: '',
      LatLngBounds: { north: 45, south: 45.5, west: -122.0, east: -121.0 }, // get definition from Google
      GeocoderComponentRestrictions: {}, // get definition from Google
      geocoderRequest: {
        address: 'Sisters+OR',
        location: null, //{}, //{ lat: 0, lng: 0 },
        placeId: '',
        bounds: null, //, //LatLngBounds,
        componentRestrictions: null, //{}, // GeocoderComponentRestrictions,
        region: '',
      },
    };
  },

  methods: {
    onMarkerClick(m) {
      this.center = m.position;
    },

    mapRclicked(mouseArgs) {
      const createdMarker = this.addMarker();
      createdMarker.position.lat = mouseArgs.latLng.lat();
      createdMarker.position.lng = mouseArgs.latLng.lng();
    },

    // click the map, mark the place, get a marker there
    // space is this.$event (and includes the placeId string and the latLng object)
    getMarker(space) {
      console.log('placeId:', space.placeId);
      this.geocodePlaceId(space.placeId);
    },

    addVisit() {
      this.$emit('addedPlace', this.currentPlace);
    },

    setPlace(place) {
      this.currentPlace = place;
      this.addMarker();
    },

    addMarker: function addMarker() {
      this.lastId++;
      const lat = this.currentPlace
        ? this.currentPlace.geometry.location.lat()
        : this.center.lat;
      const lng = this.currentPlace
        ? this.currentPlace.geometry.location.lng()
        : this.center.lng;
      const marker = {
        lat: lat,
        lng: lng,
      };
      this.markers.push({
        id: this.lastId,
        position: marker,
        icon: this.image,
        // ifw: true,
        // ifw2text: this.currentPlace ? 'Visiting' : 'A Gathering',
      });
      return this.markers[this.markers.length - 1];
    },

    geolocate: function () {
      navigator.geolocation.getCurrentPosition((position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      });
    },

    geocodePlaceId(placeId) {
      const geocoderRequest = { placeId: placeId };
      this.geoCodePromise(geocoderRequest)
        .then((results) => {
          const spot = results[0];
          this.zoom = 18;
          this.currentPlace = spot.formatted_address;
          this.center = spot.geometry.location;
          const marker = spot.geometry.location;
          this.markers.push({
            id: this.lastId,
            position: marker,
            icon: this.image,

            // ifw: true,
            // ifw2text: `<h3>${
            //   this.currentPlace ? 'Visiting' : 'A Gathering at'
            // }</h3>
            // ${spot.formatted_address}`,
          });
          this.infoContent = this.currentPlace;
          this.infoWinOpen = true;
        })
        .catch((e) => console.log(e));
    },

    geoCodePromise(geocoderRequest) {
      const self = this;
      return new Promise(function (resolve, reject) {
        self.$gmapApiPromiseLazy().then(() => {
          // eslint-disable-next-line
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(geocoderRequest, function (results, status) {
            if (status === 'OK') {
              resolve(results);
            } else {
              reject(status);
            }
          });
        });
      });
    },

    toggleInfoWindow: function (marker, idx) {
      this.infoWindowPos = marker.position;
      // this.infoContent = marker.infoText;

      //check if its the same marker that was selected if yes toggle
      if (this.currentMidx == idx) {
        this.infoWinOpen = !this.infoWinOpen;
      }
      //if different marker set infowindow to open and reset current marker index
      else {
        this.infoWinOpen = true;
        this.currentMidx = idx;
      }
    },

    init() {
      this.geoCodePromise(this.geocoderRequest).then((r) => {
        console.log('default request:', printJson(r));
      });
    },
  },

  watch: {
    center(n, o) {
      console.log('center new/old', printJson(n), printJson(o));
    },
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

  mounted() {
    const self = this;
    self.geolocate();
    self.init();
    const createdMarker = self.addMarker();
    createdMarker.position.lat = this.center.lat;
    createdMarker.position.lng = this.center.lng;
  },
};
</script>
