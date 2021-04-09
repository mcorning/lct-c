// import dotenv from "dotenv";
// dotenv.config();
// console.log(process.env.MAP_API_KEY);

import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import VueLuxon from 'vue-luxon';

import './registerServiceWorker';
import store from './store';
import SoteriaIcon from './components/svg/safeInSistersLogo.vue';

// for leafletCard.vue
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// for googleMap.vue
import * as VueGoogleMaps from 'vue2-google-maps';
import Geocoder from '@pderas/vue2-geocoder';

import { MAP_API_KEY } from '../hidden.json';

// TODO remove after testing ORM
// ensure the calendarCard has an array to work with
// if (!localStorage.getItem('visits')) {
//   localStorage.setItem('visits', '[]');
// }

Vue.use(Geocoder, {
  defaultCountryCode: null, // e.g. 'CA'
  defaultLanguage: null, // e.g. 'en'
  defaultMode: 'address', // or 'lat-lng'
  googleMapsApiKey: MAP_API_KEY,
});

Vue.use(VueGoogleMaps, {
  load: {
    key: MAP_API_KEY,
    libraries: 'places', //necessary for places input
  },
  installComponents: true,
});
Vue.use(VueLuxon);

Vue.component('soteria-icon', SoteriaIcon);

Vue.config.productionTip = false;

new Vue({
  vuetify,
  store,
  render: (h) => h(App),
}).$mount('#app');
