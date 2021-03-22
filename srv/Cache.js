const { readFileSync } = require('fs');
const { writeFile } = require('fs').promises;
const { printJson, warn } = require('../src/utils/colors.js');

function tryParse(filepath) {
  try {
    const data = JSON.parse(readFileSync(filepath));
    return data;
  } catch (error) {
    console.log(`${new Date().toLocaleString} error`);
    return;
  }
}

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
    writeFile(this.filepath, '');
    return true;
  }

  get(key) {
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  print(key, heading = 'Cache:') {
    console.log(this.cache.size > 0 ? heading : warn('No Cache data'));

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

  purge(fnc) {
    return new Promise((resolve, reject) => {
      let purged = [];
      try {
        this.cache.forEach((value, key) => {
          if (fnc(value.cached)) {
            purged.push(key);
            this.delete(key);
          }
        });
        this.save();
        resolve(purged);
      } catch (error) {
        reject(error);
      }
    });
  }

  save() {
    writeFile(this.filepath, JSON.stringify([...this.cache]))
      .then(() => true)
      .catch((err) => err);
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
