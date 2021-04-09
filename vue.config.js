const path = require('path');

module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  transpileDependencies: ['vuetify'],
  configureWebpack: {
    devtool: 'source-map',
  },
  pwa: {
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
  publicPath:
    process.env.NODE_ENV === 'production'
      ? '/vue-leaflet-geolocation-selector/'
      : '/',
};
