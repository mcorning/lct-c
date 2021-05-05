//workbox used at https://medium.com/@dougallrich/give-users-control-over-app-updates-in-vue-cli-3-pwas-20453aedc1f2

const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  plugins: [
    new VuetifyLoaderPlugin(),
    new InjectManifest({
      swSrc: './src/sw.js',
    }),
  ],
};
