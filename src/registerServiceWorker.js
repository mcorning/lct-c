/* eslint-disable no-console */
//Based on https://medium.com/@dougallrich/give-users-control-over-app-updates-in-vue-cli-3-pwas-20453aedc1f2

import { register } from 'register-service-worker';

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {
      console.log(
        'App is being served from cache by a service worker.\n' +
          'For more details, visit https://goo.gl/AFskqB'
      );
    },
    // registered() {
    //   const msg = 'Service worker has been registered.';
    //   sessionStorage.setItem('registered', msg);
    //   console.log(msg);
    // },
    registered(registration) {
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 60); // e.g. hourly checks
    },
    cached() {
      console.log('Content has been cached for offline use.');
    },
    updatefound() {
      console.log('New content is downloading.');
    },
    // updated() {
    //   console.log(
    //     'New content is available; please do a hard refresh or click the Update button on the Update dialog.'
    //   );
    // },
    updated(registration) {
      console.log('New content is available; please refresh.');

      // Add a custom event and dispatch it.
      // Used to display of a 'refresh' banner following a service worker update.
      // Set the event payload to the service worker registration object.
      document.dispatchEvent(
        new CustomEvent('swUpdated', { detail: registration })
      );
    },
    offline() {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    },
    error(error) {
      console.error('Error during service worker registration:', error);
    },
  });
}
