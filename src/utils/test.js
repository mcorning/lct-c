const {
  formatTime,

  getNow,
  getNowAsIso,
  isToday,
  isBetween,
  formatVisitedDate,
} = require('./luxonHelpers');

const dx = getNowAsIso();
const dz = '2021-03-01T18:00'; // modify later, as necessary
const ms = Date.now();

console.log(formatTime(ms));
console.log(formatTime(ms + 3600000));
console.group('BVTs');
console.log(getNow());
console.log(dx);
console.log(isToday(dx));
console.log(formatVisitedDate(dx));
console.log(isBetween(dx, 1));
console.groupEnd();

console.group('Negative Tests');
console.log(isToday(dz));
console.log(isBetween(dz, 2));

console.groupEnd();
