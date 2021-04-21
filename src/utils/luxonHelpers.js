const { DateTime, Interval } = require('luxon');
const visitFormat = 'HH:mm ccc, DD';
const calendarFormat = 'yyyy-LL-dd hh:mm';

const t = () => {
  // using Luxon Presets
  return DateTime.now();
};
const tPlusOne = (avgStay = 30) => {
  // using Luxon Presets
  return DateTime.now().plus({ minutes: avgStay });
};
const getNow = () => {
  // using Luxon Presets
  return DateTime.now().toLocaleString(DateTime.TIME_24_WITH_SECONDS);
};

const getNowAsIso = () => {
  return DateTime.now().toISO();
};

const isToday = (date) => {
  const dt1 = DateTime.fromISO(date);
  return dt1.toLocaleString() === DateTime.now().toLocaleString();
};

const isBetween = (date, daysBack) => {
  let past = DateTime.now().minus({ day: daysBack });
  let tomorrow = DateTime.now().plus({ day: 1 });
  return Interval.fromDateTimes(past, tomorrow).contains(
    DateTime.fromISO(date)
  );
};

const formatVisitedDate = (date) => {
  let x = DateTime.fromISO(date).toFormat(visitFormat);
  return x;
};

const formatTime = (time = Date.now()) => {
  let ds = DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_SHORT);
  return ds;
};

const formatSmallTime = (time = Date.now()) => {
  let ds = DateTime.fromMillis(time).toLocaleString(DateTime.TIME_SIMPLE);
  return ds;
};
const formatSmallTimeBare = (time = Date.now()) => {
  let ds = DateTime.fromMillis(time).toFormat('h:mm');
  return ds;
};

const getVisitDate = () => {
  let x = DateTime.now().toFormat(calendarFormat);
  return x;
};

const showCurrentMilitaryTime = () => {
  return DateTime.now()
    .minus({ minute: 15 })
    .toLocaleString(DateTime.TIME_24_SIMPLE);
};

// takes an old time and two time strings
// returns the new time as the difference between intervals
const updateTime = (time, newVal, oldVal) => {
  if (!time) {
    console.log('Need a time to manipulate');
    return;
  }
  const newHrsMins = newVal.split(':');
  const oldHrsMins = oldVal.split(':');

  const hrs = Number(newHrsMins[0]) - Number(oldHrsMins[0]);
  const mins = Number(newHrsMins[1]) - Number(oldHrsMins[1]);
  const hrsInMs = hrs * 3600000;
  const minsInMs = mins * 60000;
  const totalMs = hrsInMs + minsInMs;
  console.log(time);
  console.log(`Time difference in hrs: ${hrs} and mins: ${mins}`);
  console.log(
    `Time difference in msHrs: ${hrsInMs} and msMins: ${minsInMs} for total of: ${totalMs} ms`
  );
  const newTime = time + hrs * 3600000 + mins * 60000;
  console.log(
    `Ms difference in original: ${time} and updated: ${newTime} is ${
      newTime - time
    } ms`
  );
  console.log('newTime:', newTime, formatTime(newTime));

  return newTime;
};

module.exports = {
  getNow,
  getNowAsIso,
  isToday,
  isBetween,
  formatSmallTime,
  formatSmallTimeBare,
  formatTime,
  formatVisitedDate,
  getVisitDate,
  showCurrentMilitaryTime,
  updateTime,
  t,
  tPlusOne,
};
