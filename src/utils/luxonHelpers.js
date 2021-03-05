const { DateTime, Interval } = require('luxon');
const visitFormat = 'HH:mm ccc, DD';

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

module.exports = { getNow, getNowAsIso, isToday, isBetween, formatVisitedDate };
