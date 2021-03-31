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
  let ds = DateTime.fromMillis(time).toLocaleString(DateTime.TIME_WITH_SECONDS);
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

module.exports = {
  getNow,
  getNowAsIso,
  isToday,
  isBetween,
  formatSmallTime,
  formatTime,
  formatVisitedDate,
  getVisitDate,
  showCurrentMilitaryTime,
  t,
  tPlusOne,
};
