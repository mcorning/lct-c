const { readFileSync, writeFileSync } = require('fs');
const { printJson, warn, info, success } = require('../src/utils/colors.js');

const filepath = __dirname + '/sessions.json';

const tryParse = () => {
  try {
    return JSON.parse(readFileSync(filepath));
  } catch (error) {
    return;
  }
};

let sessions = tryParse();
let data = new Map(sessions);

const all = () => {
  return data;
};
const clear = () => {
  data = new Map();
  writeFileSync(filepath, '');
  return true;
};

const get = (sessionID) => {
  return data.get(sessionID);
};

const print = (session, heading = 'Sessions:') => {
  console.log(data.size > 0 ? heading : 'No Sessions');

  if (session) {
    console.log(printJson(session));
    return;
  }
  data.forEach((session, sessionID) => {
    console.log('\t', sessionID);
    console.log(printJson(session));
  });
};

const save = () => {
  writeFileSync(filepath, JSON.stringify([...data]));
  return true;
};

const set = (sessionID, value) => {
  data.set(sessionID, value);
  save();
  return;
};

module.exports = {
  all,
  clear,
  set,
  get,
  print,
  save,
};
