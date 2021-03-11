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

import * as VueGoogleMaps from 'vue2-google-maps';
import { MAP_API_KEY } from '../hidden.json';

Vue.use(VueGoogleMaps, {
  load: {
    key: MAP_API_KEY,
    libraries: 'places', //necessary for places input
  },
});
Vue.use(VueLuxon);

Vue.component('soteria-icon', SoteriaIcon);

Vue.config.productionTip = false;

new Vue({
  vuetify,
  store,
  render: (h) => h(App),
}).$mount('#app');
