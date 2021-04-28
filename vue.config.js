const path = require('path');

module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  transpileDependencies: ['vuetify'],
  configureWebpack: {
    devtool: 'source-map',
  },
  pwa: {
    //PWA based on https://medium.com/@dougallrich/give-users-control-over-app-updates-in-vue-cli-3-pwas-20453aedc1f2
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/sw.js',
      swDest: 'service-worker.js',
    },
    //
    name: 'LCT-C',
    short_name: 'Visitor',
    themeColor: '#673AB7',
    msTileColor: '#673AB7',
    appleMobileWebAppCache: 'yes',
    manifestOptions: {
      background_color: '#673AB7',
    },
    start_url: '/',
  },
  // for Heroku (w/o containers (which we are now using))
  // devServer: {
  //   proxy: {
  //     "^/api": {
  //       target: "http://localhost:3000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
  outputDir: path.resolve(__dirname, './srv/dist'),
};
