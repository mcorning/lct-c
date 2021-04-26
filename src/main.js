import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';

import VueLuxon from 'vue-luxon';

import './registerServiceWorker';
import store from './store';
import SoteriaIcon from './components/svg/safeInSistersLogo.vue';

// for googleMap.vue
import * as VueGoogleMaps from 'vue2-google-maps';

import { MAP_API_KEY } from '../hidden.json';
const key = process.env.MAP_API_KEY || MAP_API_KEY;

Vue.use(VueGoogleMaps, {
  load: {
    key: key,
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
