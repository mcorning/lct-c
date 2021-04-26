// Docs: https://vuex-orm.org/guide/model/defining-models.html

import { Model } from '@vuex-orm/core';

export default class Visit extends Model {
  static entity = 'visits';

  static fields() {
    return {
      id: this.attr(null), // Unique generated value

      // From Map component (for the graph component (calendar uses only name))
      name: this.string(''), // POI or "Gathering"
      placeId: this.string(''), // Unique ID of space or place
      lat: this.number(), // Latitude of Visit space/place
      lng: this.number(), // Longitude of Visit space/place

      // From Calendar component
      marked: this.string(''), // DateTime Visit made it to the calendar
      color: this.string('secondary'), // New event: Secondary. Logged event: Primary
      start: this.number(''), // Epoch milliseconds of Visit start
      end: this.number(''), // Epoch milliseconds of Visit end
      interval: this.string(''), // Date string of start to event values
      timed: this.boolean(true), // True means Visit isn't all day

      // From the graph component
      logged: this.string(''), // ID of the graph node for this Visit
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
      console.log('update Visit with', JSON.stringify(val, null, 3));
      this.$create({
        data: val,
      })
        .then((p) => resolve(p))
        .catch((e) => reject(e));
    });
  }
  static updateLoggedPromise(id, val) {
    return new Promise((resolve, reject) => {
      console.log(
        `Update Visit ${id} logged field with`,
        JSON.stringify(val, null, 3)
      );
      this.$update({
        where: id,
        data: { logged: val, color: 'primary' },
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
      console.log(`Deleting Visit id ${val}`);
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
