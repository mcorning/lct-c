export default {
  data() {
    return {
      daysBack: 14,
      today: 'YYYY-MM-DD',
      // visitFormat: "HH:mm:ss:SSS on ddd, MMM DD",
      visitFormat: 'HH:mm ddd, MMM DD',
      defaultQuery: {
        visitor: '',
        id: '',
        nsp: '',
      },
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
      // const shortDateTimeFormat = 'lll';
      const timeFormat = 'HH:mm:ss:SSS';
      return this.$luxon(new Date(), timeFormat);
    },

    isToday(date, daysBack) {
      let x = this.$luxon(date, this.today);
      let y = this.$luxon().add(-daysBack, 'day').format(this.today);
      return x == y;
    },

    isBetween(date, daysBack) {
      let visit = this.$luxon(date);

      let past = this.$luxon().add(-daysBack, 'day').format('YYYY-MM-DD');
      let tomorrow = this.$luxon().add(1, 'day').format('YYYY-MM-DD');
      let test = visit.isBetween(past, tomorrow);
      return test;
    },

    formatVisitedDate(date) {
      let x = this.$luxon(new Date(date), this.visitFormat);
      return x;
    },

    groupBy(payload) {
      const { array, prop, val } = payload;

      return array
        .filter((v) => v[val]) // ignore Room Opened/Closed messages
        .reduce(function (a, c) {
          let key = this.$luxon(c[prop], 'YYYY-MM-DD');
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
