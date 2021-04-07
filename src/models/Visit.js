// Docs: https://vuex-orm.org/guide/model/defining-models.html

import { Model } from '@vuex-orm/core';

export default class Visit extends Model {
  static entity = 'visits';

  static fields() {
    return {
      id: this.attr(null),
      name: this.string(''),
      logged: this.string(''),
      marked: this.string(''),
      color: this.string('secondary'),
      start: this.number(''),
      end: this.number(''),
      interval: this.string(''),

      timed: this.boolean(true),
    };
  }

  // val must be an object
  static async update(val) {
    // const { id, name, logged, start, end, interval, timed } = val;
    let p = await this.$create({
      data: val,
    });
    return p;
  }
  static updatePromise(val) {
    return new Promise((resolve, reject) => {
      this.$create({
        data: val,
      })
        .then((p) => resolve(p))
        .catch((e) => reject(e));
    });
  }

  static async delete(val) {
    let p = await this.$delete(val);
    return p;
  }

  static deletePromise(val) {
    return new Promise((resolve, reject) => {
      this.$delete(val)
        .then((p) => {
          if (p) {
            resolve(p);
          } else {
            throw 'Nothing to delete';
          }
        })
        .catch((e) => reject(e));
    });
  }

  static async deleteAll() {
    let p = await this.$deleteAll();
    return p;
  }

  static deleteAllPromise() {
    return new Promise((resolve, reject) => {
      this.$deleteAll()
        .then((p) => resolve(p))
        .catch((e) => reject(e));
    });
  }
}
