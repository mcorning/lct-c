<template>
  <v-sheet
    height="600"
    class="overflow-hidden fill-height"
    style="position: relative"
  >
    <ConfirmDlg ref="confirm" />

    <v-navigation-drawer v-model="drawer" absolute temporary>
      <v-list-item>
        <v-list-item-avatar>
          <v-img src="https://randomuser.me/api/portraits/men/78.jpg"></v-img>
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title>{{ username }}'s Recent Visits</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <v-list dense nav>
        <v-list-item-group v-model="recent" mandatory color="primary">
          <v-list-item
            v-for="visit in getFavorites()"
            :key="visit.name"
            link
            :value="visit"
          >
            <v-list-item-icon>
              <v-icon>{{ getIcon(visit) }}</v-icon>
            </v-list-item-icon>

            <v-list-item-content>
              <v-list-item-title>{{ visit }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <gmap-map
      :center="center"
      :zoom="zoom"
      style="width: 100%; height: 525px"
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
          <v-card-title class="mt-0 pt-0">
            <v-text-field
              v-model="currentPlaceInfo.name"
              dense
              hide-details
            ></v-text-field>
          </v-card-title>
          <v-card-subtitle class="pb-0">{{
            currentPlaceInfo.address
          }}</v-card-subtitle>
          <v-card-text class="pt-3"
            ><small
              >Place ID: {{ currentPlaceInfo.placeId }} <br />
              Position: {{ currentPlaceInfo.position }}</small
            >
          </v-card-text>
          <v-card-actions class="pb-1">
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
        :draggable="true"
        @click="toggleInfoWindow(m, index)"
        >{{ m.title }}
      </gmap-marker>
    </gmap-map>

    <gmap-autocomplete
      @place_changed="setPlace"
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
  </v-sheet>
</template>

<script>
import Visit from '@/models/Visit';

import { info, printJson } from '../../utils/colors';

import { defaultLocation } from '../../maps/mapconfig.json';
console.log(defaultLocation);

export default {
  // see main.js for vue2-google-maps instantiation
  name: 'GoogleMap',
  components: {
    ConfirmDlg: () => import('./dialogCard'),
  },

  computed: {
    username() {
      return localStorage.getItem('username');
    },

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
      recent: '',
      loading: true,
      drawer: null,

      markersData: [],
      edit: true,
      infoWindowLatLang: null,
      currLoc: '',
      map: null,
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
      center: defaultLocation,
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
    getFavorites() {
      const visits = Visit.all();
      return [...new Set(visits.map((v) => v.name))];
    },

    getIcon() {
      return 'mdi-account-group';
    },

    toggleInfoWindow: function (marker, idx) {
      this.infoWindowPos = marker.position;
      this.currentPlace = marker;
      this.map.panTo(marker.position);

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

    // click the map, mark the place, get a marker there
    // space is this.$event (and includes the placeId string and the latLng object)
    getMarker(space) {
      console.log('placeId:', printJson(space));
      this.$refs.confirm.open('Confirm', 'Add a marker?').then((add) => {
        if (add) this.getSpaceDetails(space);
      });
    },

    getSpaceDetails(space) {
      if (!space.placeId) {
        if (space.latLng) {
          this.getSpotDetails(space.latLng);
        } else if (space.lat && space.lng) {
          this.getSpotDetails({ latLng: { lat: space.lat, lng: space.lng } });
        }
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
            name: 'Gathering @ ' + spot.plus_code.global_code,
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
          // results will be an array of geographic objects with different and related values for the same spot
          // results DO NOT include the POI name. you get that from the Places service passing in the placeId
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

    addVisit() {
      this.$emit('addedPlace', this.currentPlace);
    },

    setPlace(place) {
      this.currentPlace = place;
      const latLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      let marker = {
        position: latLng,
        title: 'Place',
        label: 'V' + this.markers.length,
        placeId: '',
        address: '',
        name: '',
      };

      this.geoCodePromise({ latLng: latLng })
        // get placeId
        .then((data) => {
          return data.filter((v) => v.types.includes('plus_code'))[0]?.place_id;
        })
        // use it to get Placed data from services
        .then((placeId) => {
          marker.placeId = placeId;
          const request = {
            placeId: placeId,
            fields: ['name', 'formatted_address', 'place_id', 'geometry'],
          };
          return this.placeDetailsPromise(request);
        })
        // finish up the marker
        .then((record) => {
          marker.address = record.formatted_address;
          marker.name = record.name;

          // add it to the map and cache it in localSTorage
          this.addMarker(marker);
        });
    },

    addMarker({ title, label, name, placeId, address, position }) {
      this.markersData.push({ title, label, name, placeId, address, position });
      localStorage.setItem('markersData', JSON.stringify(this.markersData));

      const marker = new window.google.maps.Marker({
        map: this.map,
        // for tooltips and visible marker labels
        title: title,
        label: { text: label, color: 'white' },

        // to cache place data for logging
        name,
        placeId,
        address,
        position,
      });
      this.markers.push(marker);
    },

    removeMarker() {
      this.markersData.splice(this.currentMidx, 1);
      localStorage.setItem('markersData', JSON.stringify(this.markersData));

      const marker = this.markers[this.currentMidx];
      marker.setMap(null);
      this.markers.splice(this.currentMidx, 1);
      this.infoWinOpen = false;
    },

    recentsControl(controlDiv) {
      // Set CSS for the control border.
      const controlUI = document.createElement('div');
      controlUI.style.backgroundColor = '#fff';
      controlUI.style.border = '3px solid #fff';
      controlUI.style.borderRadius = '3px';
      controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
      controlUI.style.cursor = 'pointer';
      controlUI.style.marginTop = '8px';
      controlUI.style.marginBottom = '22px';
      controlUI.style.textAlign = 'center';
      controlUI.title = 'Click to recenter the map';
      controlDiv.appendChild(controlUI);
      // Set CSS for the control interior.
      const controlText = document.createElement('div');
      controlText.style.color = 'rgb(25,25,25)';
      controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
      controlText.style.fontSize = '16px';
      controlText.style.fontWeight = '200';
      controlText.style.lineHeight = '38px';
      controlText.style.paddingLeft = '5px';
      controlText.style.paddingRight = '5px';
      controlText.innerHTML = 'See Recent Visits';
      controlUI.appendChild(controlText);
      // Setup the click event listeners: it talks to Vue, not the map.
      controlUI.addEventListener('click', () => {
        this.drawer = !this.drawer;
      });
    },

    init() {
      const recentsControlDiv = document.createElement('div');
      this.recentsControl(recentsControlDiv);
      this.map.controls[window.google.maps.ControlPosition.LEFT_BOTTOM].push(
        recentsControlDiv
      );
      const map = this.map;
      this.markers = this.markersData
        ? this.markersData.map((c) => {
            const marker = new window.google.maps.Marker({
              title: c.title,
              label: { text: c.label, color: 'white' },
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
    recent(val, old) {
      if (!old) return;
      this.$refs.confirm
        .open('Confirm', `Mark your calendar with ${val}?`)
        .then((add) => {
          if (add) {
            console.log(val);
            this.currentPlace = { name: val, id: '', category: '' };

            this.addVisit();
          }
        });
    },
  },

  mounted() {
    const self = this;
    const data = localStorage.getItem('markersData');
    self.markersData = data ? JSON.parse(data) : [];

    Visit.$fetch();

    self.$refs.mapRef.$mapPromise.then((map) => {
      self.map = map;
      self.init();
    });
    self.loading = false;
  },
};
</script>
