// config.js
const config = {
  // mapkey: process.env.MAP_API_KEY,
  redisHost: process.env.REDIS_HOST,
  redisPassword: process.env.REDIS_PASSWORD,
  redisPort: process.env.REDIS_PORT,
  mapkey: process.env.VUE_APP_MAP_API_KEY,
  graphName:
    process.env.NODE_ENV == 'production'
      ? process.env.GRAPH_NAME
      : 'Test-' + process.env.GRAPH_NAME,

  features: {},
};

function feature(name) {
  return config.features[name];
}

// eslint-disable-next-line
function parse(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }
  switch (typeof fallback) {
    case 'boolean':
      return !!JSON.parse(value);
    case 'number':
      return JSON.parse(value);
    default:
      return value;
  }
}

export { config };

export default {
  install(Vue) {
    Vue.appConfig = config;
    Vue.feature = feature;
    Vue.prototype.$appConfig = config;
    Vue.prototype.$feature = feature;
  },
};
