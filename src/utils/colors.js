const clc = require('cli-color');
const success = clc.green.bold;
const error = clc.red.bold;
const warn = clc.yellow;
const info = clc.cyan;
const notice = clc.blue;
const highlight = clc.magenta;
const bold = clc.bold;
const bgBlue = clc.bgBlue;
const bgMagenta = clc.bgMagenta;

function printJson(json) {
  return JSON.stringify(json, null, 3);
}

module.exports = {
  printJson,
  success,
  error,
  warn,
  info,
  notice,
  highlight,
  bold,
  bgBlue,
  bgMagenta,
};
