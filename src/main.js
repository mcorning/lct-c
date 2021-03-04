import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import './registerServiceWorker';
import store from './store';
import SoteriaIcon from './components/svg/safeInSistersLogo.vue';
import VueLuxon from 'vue-luxon';
import * as VueGoogleMaps from 'vue2-google-maps';
import { googleMapsApiKey } from '../jsconfig.json';

Vue.use(VueGoogleMaps, {
  load: {
    key: googleMapsApiKey,
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
