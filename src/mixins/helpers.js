export default {
  data() {
    return {};
  },
  methods: {
    // set operations
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
  },
};
