const { readFileSync, writeFileSync } = require('fs');

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

const print = (session) => {
  if (session) {
    console.log(JSON.stringify(session, null, 3));
    return;
  }
  console.log(data.size > 0 ? 'Sessions:' : 'No Sessions');
  data.forEach((session, sessionID) => {
    console.log('\t', sessionID);
    console.log('\t', JSON.stringify(session, null, 3));
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

if (false) {
  print();
  set('session1', { userID: 'dieiigne', username: 'katy' });
  set('session2', { userID: 'ddiorhng', username: 'michael' });
  let x = get('session1');
  print(x);
  console.log('session2:', get('session2'));
  print();
}
