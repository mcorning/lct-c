import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';

import VueLuxon from 'vue-luxon';

import './registerServiceWorker';
import store from './store';
import SoteriaIcon from './components/svg/safeInSistersLogo.vue';

// for googleMap.vue
import * as VueGoogleMaps from 'vue2-google-maps';

import configPlugin from '../config.js';
Vue.use(configPlugin);

// can't get dotenv or Vue to see environement vars here
console.log(process.env.VUE_APP_MAP_API_KEY);
// reverting to working code
import { x } from './x.json';
const mapkey = process.env.VUE_APP_MAP_API_KEY || x;

Vue.use(VueGoogleMaps, {
  load: {
    key: mapkey,
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
