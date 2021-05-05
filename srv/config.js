const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
  throw result.error;
}

console.log(result.parsed);

module.exports = {
  graphName: process.env.NODE_ENV == 'production' ? 'Sisters' : 'Test-Sisters',
  redisHost: process.env.REDIS_HOST,
  redisPassword: process.env.REDIS_PASSWORD,
  redisPort: process.env.REDIS_PORT,
  mapkey: process.env.VUE_APP_MAP_API_KEY,
};
