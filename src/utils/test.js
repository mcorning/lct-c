const visits = [
  {
    $id: '0946271f95710eae',
    id: '0946271f95710eae',
    name: "Angeline's Bakery & Cafe",
    logged: '',
    marked: '16:42:17',
    color: 'secondary',
    start: 1619134200000,
    lat: 44.2920221,
    lng: 44.2920221,
    end: 1619163000000,
    interval: '4:30 PM - 12:30 AM',
    timed: true,
  },
  {
    $id: 'b1949aa697cf9d1a',
    id: 'b1949aa697cf9d1a',
    name: 'Sisters Coffee Company',
    logged: '',
    marked: '15:46:51',
    color: 'secondary',
    start: 1619131500000,
    lat: 44.29021499999999,
    lng: 44.29021499999999,
    end: 1619135100000,
    interval: '3:45 PM - 4:45 PM',
    timed: true,
  },
  {
    $id: 'c490346a4f5a20c6',
    id: 'c490346a4f5a20c6',
    name: "Angeline's Bakery & Cafe",
    logged: '',
    marked: '16:32:00',
    color: 'secondary',
    start: 1619134200000,
    lat: 44.2920221,
    lng: 44.2920221,
    end: 1619163000000,
    interval: '4:30 PM - 12:30 AM',
    timed: true,
  },
  {
    $id: 'f909143a24527a6a',
    id: 'f909143a24527a6a',
    name: "Angeline's Bakery & Cafe",
    logged: '',
    marked: '12:18:57',
    color: 'secondary',
    start: 1619044200000,
    lat: 44.2920221,
    lng: 44.2920221,
    end: 1619056800000,
    interval: '4:30 PM - 8:00 PM',
    timed: true,
  },
];

const map = visits.reduce((a, c) => {
  a.set(c.name, { lat: c.lat, lng: c.lng });
  return a;
}, new Map());

console.log([...map]);
