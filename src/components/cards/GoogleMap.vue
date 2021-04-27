<template>
  <v-sheet class="fill-height position:absolute">
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

      <!-- consider replacing list with select and use obects instead of arrays for items -->
      <v-list dense nav>
        <v-list-item-group v-model="recent" mandatory color="primary">
          <v-list-item
            v-for="visit in getFavoriteVisits"
            :key="visit.name"
            link
            :value="visit"
            @click="goRecent(visit)"
          >
            <v-list-item-icon>
              <v-icon>{{ getIcon(visit) }}</v-icon>
            </v-list-item-icon>

            <v-list-item-content>
              <v-list-item-title>{{ visit[0] }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <gmap-map
      :center="center"
      :zoom="zoom"
      :style="mapSize"
      ref="mapRef"
      @click="setMarker($event)"
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
              v-if="!InfoWinContent.name"
              @change="updateName"
              dense
              hide-details
              placeholder="Give this gathering a name"
            ></v-text-field>
            <span v-else> {{ InfoWinContent.name }} </span>
          </v-card-title>
          <v-card-subtitle class="pb-0">{{
            InfoWinContent.address
          }}</v-card-subtitle>
          <v-card-text class="pt-3"
            ><small
              >Place ID: {{ InfoWinContent.placeId }} <br />
              Position: {{ InfoWinContent.position }}</small
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
        :draggable="false"
        @click="getMarker(m, index)"
        >{{ m.title }}
      </gmap-marker>
    </gmap-map>

    <gmap-autocomplete
      class="pl-3"
      @place_changed="setPlace"
      auto-select-first
      :options="options"
      style="width: 70%; border: orange; border-width: 2px; border-style: solid"
    >
    </gmap-autocomplete>

    <!-- Button to send the returned place to the Calendar component -->
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
      <span>Mark your calendar </span></v-tooltip
    >
  </v-sheet>
</template>

<script>
// See https://github.com/xkjyeah/vue-google-maps

import Visit from '@/models/Visit';

import { highlight, printJson } from '../../utils/colors';

import { defaultLocation } from '../../maps/mapconfig.json';
console.log(defaultLocation);

export default {
  // see main.js for vue2-google-maps instantiation
  name: 'GoogleMap',
  components: {
    ConfirmDlg: () => import('./dialogCard'),
  },

  computed: {
    InfoWinContent() {
      return this.marker ? this.marker : '';
    },

    visitMap() {
      const map =
        this.visits && this.visits.length
          ? this.visits.reduce((a, c) => {
              a.set(c.name, { lat: c.lat, lng: c.lng });
              return a;
            }, new Map())
          : [];
      return map;
    },

    getFavoriteVisits() {
      return [...this.visitMap];
    },

    username() {
      return localStorage.getItem('username');
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
      givenName: '',
      marker: null,
      mapSize: '',
      visits: null,
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
      // currentPlace: null,
      placeName: '',
      lastId: 1,
      ifw: true,
      ifw2text: '',

      geocoder: null,
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
    toggleInfoWindow(marker, idx) {
      this.infoWindowPos = marker.position;

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
    setMarker(space) {
      this.center = space.latLng;
      console.log(highlight('placeId:'), printJson(space));
      // this.getSpaceDetails(space);
      if (space.placeId) {
        this.service.getDetails(
          {
            placeId: space.placeId,
            fields: ['name', 'formatted_address', 'place_id', 'geometry'],
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place &&
              place.geometry &&
              place.geometry.location
            ) {
              const position = place.geometry.location;
              this.addMarker({
                title: 'Place',
                name: place.name,
                address: place.formatted_address,
                placeId: place.place_id,
                position: position,
              });
            } else {
              console.log('Error:', status);
            }
          }
        );
      } else {
        const latLng = { lat: space.latLng.lat(), lng: space.latLng.lng() };
        this.geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK') {
            const space = results[0];
            const position = space.geometry.location;

            this.addMarker({
              title: 'Space',
              name: space.name,
              address: space.formatted_address,
              placeId: space.place_id,
              position: position,
            });
            console.log(results);
          } else {
            console.log('Error:', status);
          }
        });
      }
    },

    addMarker(data) {
      const { title, name, address, placeId, position, plus_code } = data;

      this.markersData.push({
        title,
        name,
        placeId,
        plus_code,
        address,
        position,
      });
      localStorage.setItem('markersData', JSON.stringify(this.markersData));

      const marker = new window.google.maps.Marker({
        // for tooltips and visible marker labels
        title: title, // "Place" or "Gathering"
        label: { text: 'V' + this.markersData.length, color: 'white' }, // label is assigned a value before

        // to cache place data for logging
        // displayed in map and sent to Calendar
        name, // POI name or name given by Visitor
        position, // Latitude and Longitude of space or place
        // displayed in map
        address, // Address or Plus_Code of public space
        placeId, // For known places, a unique identifier

        map: this.map, // Used by mapping platform to show markers
      });
      this.markers.push(marker);
      this.marker = marker;
      this.toggleInfoWindow(marker);
    },

    removeMarker() {
      // const marker=this.currentPlace
      this.markersData.splice(this.currentMidx, 1);
      localStorage.setItem('markersData', JSON.stringify(this.markersData));

      // const marker = this.markers[this.currentMidx];
      this.marker.setMap(null);
      this.markers.splice(this.currentMidx, 1);
      this.infoWinOpen = false;
    },

    getMarker(marker, idx) {
      if (marker != this.marker) {
        this.infoWinOpen = false;
      }
      this.marker = marker;
      this.currentMidx = idx;
      this.toggleInfoWindow(marker, idx);
    },

    // handled when autocomplete has a place
    setPlace(place) {
      // this.currentPlace = place;
      const latLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      const label = 'V' + this.markers?.length;
      console.log(label);
      let marker = {
        position: latLng,
        title: 'Place',
        label: { text: label, color: 'white' },
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
          this.map.panTo(marker.position);
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
      const { name, placeId, position } = this.marker;
      this.$emit('addedPlace', {
        name,
        placeId,
        lat: position.lat(),
        lng: position.lng(),
      });
    },

    recentsControl(controlDiv) {
      // Set CSS for the control border.
      const controlUI = document.createElement('div');
      controlUI.style.cursor = 'pointer';
      controlUI.style.textAlign = 'center';
      controlUI.title = 'Set of recent visits sorted by name';
      controlUI.classList.add('custom-map-control-button');
      controlDiv.appendChild(controlUI);
      // Set CSS for the control interior.
      const controlText = document.createElement('div');
      controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
      controlText.style.fontSize = '16px';
      controlText.style.fontWeight = '300';
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
    // alternative to Google documentation
    geolocateControl(controlDiv, map) {
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
      controlUI.title = 'Find me';
      controlUI.classList.add('custom-map-control-button');
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
      const infoWindow = new window.google.maps.InfoWindow();
      controlUI.addEventListener('click', () => {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              infoWindow.setPosition(pos);
              infoWindow.setContent('Here you are.');
              infoWindow.open(map);
              map.setCenter(pos);
            },
            () => {
              this.handleLocationError(true, infoWindow, map.getCenter());
            }
          );
        } else {
          // Browser doesn't support Geolocation
          this.handleLocationError(false, infoWindow, map.getCenter());
        }
      });
    },

    setUpGeolocation(map) {
      const infoWindow = new window.google.maps.InfoWindow();

      const locationButton = document.createElement('button');
      const icon = document.createElement('i');
      icon.className = 'mdi mdi-target';
      locationButton.appendChild(icon);
      locationButton.title = 'Find Me';
      locationButton.classList.add('custom-map-control-button-icon');

      locationButton.addEventListener('click', () => {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              infoWindow.setPosition(pos);
              infoWindow.setContent('Here you are.');
              infoWindow.open(map);
              map.setCenter(pos);
            },
            () => {
              this.handleLocationError(true, infoWindow, map.getCenter());
            }
          );
        } else {
          // Browser doesn't support Geolocation
          this.handleLocationError(false, infoWindow, map.getCenter());
        }
      });
      map.controls[window.google.maps.ControlPosition.RIGHT_TOP].push(
        locationButton
      );
    },

    setUpRecentVisits(map) {
      const recentVisitsButton = document.createElement('button');
      // <button class="btn"><i class="fa fa-target"></i></button>
      recentVisitsButton.textContent = 'Recent Visits';
      recentVisitsButton.classList.add('custom-map-control-button');
      recentVisitsButton.title = 'Sorted set of past visits';
      recentVisitsButton.addEventListener('click', () => {
        this.drawer = !this.drawer;
      });
      map.controls[window.google.maps.ControlPosition.LEFT_BOTTOM].push(
        recentVisitsButton
      );
    },

    handleLocationError(browserHasGeolocation, infoWindow, pos) {
      infoWindow.setPosition(pos);
      infoWindow.setContent(
        browserHasGeolocation
          ? 'Error: The Geolocation service failed.'
          : "Error: Your browser doesn't support geolocation."
      );
      infoWindow.open(this.map);
    },

    showMap(map) {
      // const recentsControlDiv = document.createElement('div');
      // this.recentsControl(recentsControlDiv);
      // map.controls[window.google.maps.ControlPosition.LEFT_BOTTOM].push(
      //   recentsControlDiv
      // );
      this.setUpRecentVisits(map);
      this.setUpGeolocation(map);
      this.map = map;
      return map;
    },
    getAssets() {
      const self = this;
      this.$gmapApiPromiseLazy().then(() => {
        self.geocoder = new window.google.maps.Geocoder();
        self.service = new window.google.maps.places.PlacesService(self.map);
      });
    },

    getVisits() {
      Visit.$fetch().then((all) => {
        console.log(all.visits);
        this.visits = all.visits;
      });
    },

    getMarkers(map) {
      const data = localStorage.getItem('markersData');
      this.markersData = data ? JSON.parse(data) : [];
      try {
        this.markers = this.markersData
          ? this.markersData.map((c) => {
              // const label = c.label?.text || c.label || 'V?';

              const marker = new window.google.maps.Marker({
                title: c.title,
                // label: { text: label, color: 'white' },
                name: c.name,
                placeId: c.placeId,
                address: c.address,
                position: c.position,
                map: map,
              });
              return marker;
            })
          : [];
      } catch (error) {
        console.log(error);
        this.emit('error', error);
      }
      this.map = map;
    },

    goRecent(val) {
      this.$refs.confirm
        .open('Confirm', `Mark your calendar with ${val[0]}?`)
        .then((add) => {
          if (add) {
            console.log(printJson(val));
            // this.currentPlace = { name: val[0], latLng: val[1] };

            this.addVisit();
          }
        });
    },

    getIcon() {
      return 'mdi-account-group';
    },

    updateName(name) {
      this.marker.name = name;
      this.markersData.find(
        ({ placeId }) => placeId === this.marker.placeId
      ).name = name;
      console.log(
        highlight('markersData'),
        JSON.stringify(this.markersData, null, 3)
      );

      localStorage.setItem('markersData', JSON.stringify(this.markersData));
    },
  },

  watch: {},

  created() {},

  mounted() {
    const self = this;

    const bp = self.$vuetify.breakpoint;
    console.log(bp.name, bp.height);
    const x = bp.height;
    const y = 260;
    self.mapSize = `width: 100%; height: ${x - y}px`;
    console.log('mapSize:', self.mapSize);

    self.$refs.mapRef.$mapPromise
      .then((map) => self.showMap(map))
      .then((map) => self.getMarkers(map))
      .then(() => self.getAssets())
      .then(() => self.getVisits())
      .then(() => {
        console.log('Mounted GoogleMaps');
        self.loading = false;
      })
      .catch((error) => {
        this.$emit('error', error);
      });
  },
};
</script>
<style>
.custom-map-control-button-icon {
  background-color: #d500f9;
  border: none;
  color: white;
  padding: 5px 5px;
  margin: 10px;
  font-size: 24px;
  width: 40px;
  cursor: pointer;
}
.custom-map-control-button {
  background-color: #d500f9;
  border: none;
  color: white;
  padding: 10px 10px;
  margin: 10px;
  font-size: 18px;
  cursor: pointer;
}

/* Darker background on mouse-over */
.custom-map-control-button-icon:hover {
  background-color: #aa00ff;
}

.custom-map-control-button:hover {
  background-color: #aa00ff;
}
</style>
