const { readFileSync, writeFileSync } = require('fs');
const { printJson } = require('../src/utils/colors.js');
const msPerDay = 1000 * 60 * 60 * 24;

function tryParse(filepath) {
  try {
    return JSON.parse(readFileSync(filepath));
  } catch (error) {
    return;
  }
}

const hasNotExpired = (firstDate) => {
  !firstDate || (Date.now() - firstDate.getTime()) / msPerDay < 14;
};

class Cache {
  constructor(filepath) {
    this.filepath = filepath;
    this.cache = new Map(tryParse(filepath));
  }

  all() {
    return [...this.cache];
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache = new Map();
    writeFileSync(this.filepath, '');
    return true;
  }

  get(key) {
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  print(key, heading = 'Cache:') {
    console.log(this.cache.size > 0 ? heading : 'No Cache data');

    if (key) {
      console.log(printJson(key));
      return;
    }
    this.cache.forEach((value, key) => {
      console.log('\t', key);
      if (value) {
        console.log(printJson(value));
      }
    });
  }

  save() {
    const unexpired = [...this.cache].filter((v) => hasNotExpired(v.cachedOn));
    writeFileSync(this.filepath, JSON.stringify(unexpired));
    return true;
  }

  set(key, value) {
    this.cache.set(key, value);
    this.save();
    return;
  }
}

module.exports = {
  Cache,
};
