<template>
  <div>
    <gmap-map
      :center="center"
      :zoom="zoom"
      style="width: 100%; height: 375px"
      ref="mapRef"
      @click="getMarker($event)"
    >
      <gmap-info-window
        :options="infoOptions"
        :position="infoWindowPos"
        :opened="infoWinOpen"
        @closeclick="infoWinOpen = false"
      >
        <v-card>
          <v-card-title>
            <v-text-field
              v-model="currentPlaceInfo.name"
              dense
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-card-subtitle>{{ currentPlaceInfo.address }}</v-card-subtitle>
          <v-card-text
            >Place ID: {{ currentPlaceInfo.placeId }} <br />
            Position: {{ currentPlaceInfo.position }}
          </v-card-text>
          <v-card-actions>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  small
                  fab
                  v-bind="attrs"
                  v-on="on"
                  dark
                  color="blue"
                  @click="editName"
                >
                  <v-icon>mdi-pencil-outline</v-icon>
                </v-btn>
              </template>
              <span>Edit the name</span></v-tooltip
            >
            <v-spacer></v-spacer>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  small
                  fab
                  v-bind="attrs"
                  v-on="on"
                  dark
                  color="orange"
                  @click="removeMarker"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>Remove marker</span></v-tooltip
            >
            <v-spacer></v-spacer>
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
          </v-card-actions>
        </v-card>
      </gmap-info-window>

      <gmap-marker
        :key="index"
        v-for="(m, index) in markers"
        :position="m.position"
        @click="toggleInfoWindow(m, index)"
      >
      </gmap-marker>
    </gmap-map>

    <gmap-autocomplete
      @place_changed="setPlace"
      autofocus
      auto-select-first
      :options="options"
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
import { formatTime } from '../../utils/luxonHelpers';

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
    currentPlaceInfo() {
      return this.currentPlace ? this.currentPlace : '';
    },

    options() {
      return { fields: ['address_components', 'geometry', 'icon', 'name'] };
    },

    infowindow() {
      const x = new window.google.maps.InfoWindow({ content: this.content });
      return x;
    },
  },

  data() {
    return {
      markersData: [],
      edit: true,
      infoWindowLatLang: null,
      currLoc: '',
      map: null,
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
      placeName: '',
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
    // click the map, mark the place, get a marker there
    // space is this.$event (and includes the placeId string and the latLng object)
    getMarker(space) {
      console.log('placeId:', printJson(space));
      this.getSpaceDetails(space);
    },

    getSpaceDetails(space) {
      if (!space.placeId) {
        this.getSpotDetails(space.latLng);
      } else {
        this.getPlaceDetails(space.placeId);
      }
    },

    getSpotDetails(latLng) {
      const self = this;

      if (this.infoWindowLatLang) this.infoWindowLatLang.close();
      this.geoCodePromise({ latLng: latLng })
        .then((results) => {
          const spot = results[results.length - 1];
          self.infoWindowLatLang = new window.google.maps.InfoWindow({
            position: latLng,
          });
          self.infoWindowLatLang.setContent(
            '<h3>Place ID</h3>' +
              '<p>' +
              spot.place_id +
              '<p/>' +
              '<h3>Plus Codes</h3>' +
              '<p><strong>Local code:</strong> ' +
              spot.plus_code.compound_code +
              '<br/>' +
              '<strong>Global code:</strong> ' +
              spot.plus_code.global_code +
              '</p>' +
              '<h3>Position</h3>' +
              '<p><strong>Latitude:</strong> ' +
              spot.geometry.location.lat() +
              '<br/>' +
              '<strong>Longitude:</strong> ' +
              spot.geometry.location.lng() +
              '</p>'
          );
          this.addMarker({
            title: 'Gathering',
            label: 'V' + this.markers.length,
            name: formatTime() + ' Gathering',
            placeId: spot.place_id,
            address: spot.formatted_address,
            position: spot.geometry.location,
          });

          self.currentPlace = spot;
          self.infoWindowLatLang.open(this.map);
        })
        .catch((e) => console.log(e));
    },

    getPlaceDetails(placeId) {
      const self = this;
      const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'place_id', 'geometry'],
      };
      this.placeDetailsPromise(request).then((place) => {
        console.log(info('Place:'), printJson(place));
        this.addMarker({
          title: 'Place',
          label: 'V' + this.markers.length,
          name: place.name,
          placeId: place.place_id,
          address: place.formatted_address,
          position: place.geometry.location,
        });
        self.currentPlace = place;
        self.currLoc = place.geometry.location;
      });
    },
    geocodePlaceId(placeId) {
      const geocoderRequest = { placeId: placeId };
      this.geoCodePromise(geocoderRequest)
        .then((results) => {
          const spot = results[0];
          this.zoom = 18;
          this.currentPlace = spot;
          this.center = spot.geometry.location;
          this.infoContent = this.currentPlace;
          this.infoWinOpen = true;
        })
        .catch((e) => console.log(e));
    },

    geocodeLatLng(latLng) {
      const geocoderRequest = { latLng: latLng };
      this.geoCodePromise(geocoderRequest)
        .then((results) => {
          const spot = results[0];
          this.zoom = 18;
          this.currentPlace = spot;
          this.center = spot.geometry.location;

          this.infoWinOpen = true;
        })
        .catch((e) => console.log(e));
    },

    geoCodePromise(geocoderRequest) {
      const self = this;
      return new Promise(function (resolve, reject) {
        self.$gmapApiPromiseLazy().then(() => {
          const geocoder = new window.google.maps.Geocoder();
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
      this.currentPlace = marker;

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

    // request includes placeId
    placeDetailsPromise(request) {
      const self = this;
      return new Promise(function (resolve, reject) {
        self.$gmapApiPromiseLazy().then(() => {
          const map = self.map;
          const service = new window.google.maps.places.PlacesService(map);

          service.getDetails(request, (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place &&
              place.geometry &&
              place.geometry.location
            ) {
              resolve(place);
            } else {
              reject(status);
            }
          });
        });
      });
    },

    geolocate: function () {
      navigator.geolocation.getCurrentPosition((position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      });
    },

    editName() {
      this.edit = true;
    },
    newName(val) {
      this.currentPlaceInfo.name = val;
      this.edit = false;
    },

    addVisit() {
      this.$emit('addedPlace', this.currentPlace);
    },

    setPlace(place) {
      this.currentPlace = place;
      // TODO chech later if autocomplete needs to add a marker
      // this.addMarker();
    },

    addMarker({ title, label, name, placeId, address, position }) {
      this.markersData.push({ title, label, name, placeId, address, position });
      localStorage.setItem('markersData', JSON.stringify(this.markersData));

      const marker = new window.google.maps.Marker({
        map: this.map,
        // for tooltips and visible marker labels
        title: title,
        label: label,

        // to cache place data for logging
        name,
        placeId,
        address,
        position,
      });
      this.markers.push(marker);
    },

    removeMarker() {
      const marker = this.markers[this.currentMidx];
      marker.setMap(null);
      this.markers.splice(this.currentMidx, 1);
      this.infoWinOpen = false;
    },

    init() {
      const map = this.map;
      this.markers = this.markersData
        ? this.markersData.map((c) => {
            const marker = new window.google.maps.Marker({
              title: c.title,
              label: c.label,
              name: c.name,
              placeId: c.placeId,
              address: c.address,
              position: c.position,
              map: map,
            });
            return marker;
          })
        : [];
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
  },

  mounted() {
    const self = this;
    const data = localStorage.getItem('markersData');
    self.markersData = data ? JSON.parse(data) : [];

    self.$refs.mapRef.$mapPromise.then((map) => {
      self.map = map;
      self.init();
    });
  },
};
</script>
