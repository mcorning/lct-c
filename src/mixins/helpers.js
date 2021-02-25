const { DateTime, Interval } = require('luxon');

const clc = require('cli-color');
const success = clc.green.bold;
// const error = clc.red.bold;
// const warn = clc.yellow;
// const info = clc.cyan;
// const notice = clc.blue;
// const highlight = clc.magenta;
// const bold = clc.bold;
// const bgBlue = clc.bgBlue;
// const bgMagenta = clc.bgMagenta;

export default {
  data() {
    return {
      success: success,
      daysBack: 14,
      today: 'yyyy-mm-dd',
      visitFormat: 'HH:mm ccc, MMM DD',
    };
  },
  methods: {
    printJson: function (json, spacer = 3) {
      const replacer = null;
      return JSON.stringify(json, replacer, spacer);
    },

    //#region set operations
    intersection(setA, setB) {
      let _intersection = new Set();
      for (let elem of setB) {
        if (setA.has(elem)) {
          _intersection.add(elem);
        }
      }
      return _intersection;
    },

    difference(setA, setB) {
      let _difference = new Set(setA);
      for (let elem of setB) {
        _difference.delete(elem);
      }
      return _difference;
    },
    //#endregion

    //#region this.$luxon-based code
    getNow() {
      return DateTime.now().toLocaleString(DateTime.TIME_24_WITH_SECONDS);
    },

    isToday(date) {
      return date == DateTime.now();
    },

    isBetween(date, daysBack) {
      let past = DateTime.now().plus({ day: -daysBack });
      let tomorrow = DateTime.now().plus({ day: 1 });
      Interval.fromDateTimes(past, tomorrow).contains(date);
    },

    formatVisitedDate(date) {
      let x = DateTime(date, this.visitFormat);
      return x;
    },

    groupBy(payload) {
      const { array, prop, val } = payload;

      return array
        .filter((v) => v[val]) // ignore Room Opened/Closed messages
        .reduce(function (a, c) {
          let key = DateTime(c[prop], this.today);
          if (!a[key]) {
            a[key] = [];
          }
          a[key].push(c[val]);
          return a;
        }, {});
    },
    //#endregion
  },
};
