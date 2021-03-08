module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production',
  transpileDependencies: ['vuetify'],
  configureWebpack: {
    devtool: 'source-map',
  },
  pwa: {
    name: 'LCT-B',
    short_name: 'Visitor',
    themeColor: '#673AB7',
    msTileColor: '#673AB7',
    appleMobileWebAppCache: 'yes',
    manifestOptions: {
      background_color: '#673AB7',
    },
    start_url: '/',
  },
  // for Heroku
  // devServer: {
  //   proxy: {
  //     "^/api": {
  //       target: "http://localhost:3000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
  // const path = require('path');
  // outputDir: path.resolve(__dirname, "./srv/dist"),
};
