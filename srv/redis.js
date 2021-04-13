//https://github.com/RedisGraph/redisgraph.js
const RedisGraph = require('redisgraph.js').Graph;
// const hostOld = 'redis-11939.c60.us-west-1-2.ec2.cloud.redislabs.com';
const host = 'redis-16914.c53.west-us.azure.cloud.redislabs.com';
// const optionsOld = {
//   host: host,
//   port: 11939,
//   password: '7B3DId42aDCtMjmSXg7VN0XZSMOItGAG',
// };
const options = {
  host: host,
  port: 16914,
  password: 'kqhiYfB2XwoYV2Jy3vUw3eXDrWhCaSWq',
};
const { graphName } = require('./config.js');
// const graphName = 'Sisters';
const Graph = new RedisGraph(graphName, null, null, options);
const {
  printJson,
  warn,
  highlight,
  success,
} = require('../src/utils/colors.js');
const { formatTime } = require('../src/utils/luxonHelpers.js');

module.exports = {
  Graph,
  graphName,
  host,
  deleteVisit,
  findExposedVisitors,
  logVisit,
  onExposureWarning,
};

// see if an alerted visitor has potential alerts to share
function findExposedVisitors(userID, subject = false) {
  return new Promise(function (resolve) {
    Graph.query(
      `MATCH (a:visitor{userID:'${userID}'})-[v:visited]->(s:space)
    RETURN a.userID, a.name, id(a), s.name, id(s), v.start, v.end, id(v), id(s)`
    ).then((res) => {
      if (!res._results.length) {
        console.log(userID, 'exposed nobody');
        return resolve(userID);
      }

      printExposedVisitors(res);
      const others = [
        ...new Set(res._results.map((v) => v._values).map((v) => v[0])),
      ];
      resolve(others);
    });
  });

  function printExposedVisitors(res) {
    console.log(success(`\n${subject ? 'Patient Zero' : 'Exposed'}:`));
    const rec = res._results[0];
    console.log(rec.get('id(a)'), userID, rec.get('a.name'), 'visited:');

    while (res.hasNext()) {
      let record = res.next();
      let start = new Date(record.get('v.start') / 1).toLocaleString();
      let end = new Date(record.get('v.end') / 1).toLocaleString();
      let vid = record.get('id(v)');
      let sid = record.get('id(s)');

      console.log(
        ' '.repeat(19),
        vid < 10 ? ' ' : '',
        vid,
        ' '.repeat(vid / 100),
        record.get('v.start'),
        '=',
        start,
        ' '.repeat(25 - start.length),

        record.get('v.end'),
        '=',
        end,
        ' '.repeat(25 - end.length),

        sid < 10 ? ' ' : '',
        sid,
        record.get('s.name')
      );
    }
  }
}

// find any visitor who's start time is between the carrier's start and end times
function onExposureWarning(userID) {
  return new Promise((resolve, reject) => {
    const q = `MATCH (carrier:visitor{userID:'${userID}'})-[c:visited]->(s:space)<-[e:visited]-(exposed:visitor) 
    WHERE (e.end>=c.start OR e.start>= c.end) 
    AND exposed.name <> carrier.name    
    RETURN exposed.userID, exposed.name, id(exposed), s.name, id(s), c.start, c.end, id(c),  e.start, e.end, id(e) `;
    console.log(highlight(q));
    Graph.query(q)
      .then((res) => {
        printExposureWarnings(res);
        const visitors = [
          ...new Set(res._results.map((v) => v._values).map((v) => v[0])),
        ];
        printJson(visitors);
        resolve(visitors);
      })
      .catch((error) => {
        reject(error);
      });
  });

  function printExposureWarnings(res) {
    console.log(
      warn(`
      Visits on or after exposure by ${userID}:
      `)
    );
    // console.log(
    //   '123456791123456789212345679012345678931234567901234567894123456795123456789612345678981234567899123456789100'
    // );
    while (res.hasNext()) {
      let record = res.next();
      let startC = new Date(record.get('c.start') / 1).toLocaleString();
      let endC = new Date(record.get('c.end') / 1).toLocaleString();
      let startE = new Date(record.get('e.start') / 1).toLocaleString();
      let endE = new Date(record.get('e.end') / 1).toLocaleString();

      let name = record.get('exposed.name');
      let exposedId = record.get('id(exposed)');
      let eid = record.get('id(e)');
      let sid = record.get('id(s)');

      console.log(
        name,
        'left',
        record.get('e.end') >= record.get('c.start') ? 'after' : 'before',
        'carrier arrived'
      );
      console.log(endE, startC);

      console.log(
        name,
        'arrived',
        record.get('e.start') <= record.get('c.end') ? 'before' : 'after',
        'carrier left'
      );
      console.log(startE, endC);
      console.log(' ');
      printTable(exposedId, eid, sid, name, record, startC, endC, startE, endE);
    }
  }

  function printTable(
    exposedId,
    eid,
    sid,
    name,
    record,
    startC,
    endC,
    startE,
    endE
  ) {
    console.log(
      exposedId < 10 ? ' ' : '',
      exposedId,

      name,
      ' '.repeat(15 - name.length),

      eid < 10 ? ' ' : '',
      eid,
      record.get('c.start'),
      '=',
      startC,
      ' '.repeat(25 - startC.length),
      record.get('c.end'),
      '=',
      endC,
      ' '.repeat(25 - endC.length),

      record.get('e.start'),
      '=',
      startE,
      ' '.repeat(25 - startE.length),
      record.get('e.end'),
      '=',
      endE,
      ' '.repeat(25 - endE.length),

      sid < 10 ? ' ' : '',
      sid,
      record.get('s.name')
    );
  }
}

function getDuration(start, end) {
  return formatTime(start) - formatTime(end);
}

// delegated in index.js to handle socket.on('logVisit')
// Can add a visit to the graph or can edit the time(s) of a logged visit [when the data includes the logged field (which is the id of the Relationship)]
// Example query:
// MERGE (v:visitor{ name: 'hero', userID: '439ae5f4946d2d5d'}) MERGE (s:space{ name: 'Fika Sisters Coffeehouse'}) MERGE (v)-[:visited{start:'1615856400000'}]->(s)
// MERGE (v:visitor{ name: 'hero', userID: '439ae5f4946d2d5d'}) MERGE (s:space{ name: 'Fika Sisters Coffeehouse'}) MERGE (v)-[:visited{start:'1615856400000'}]->(s)
function logVisit(data) {
  return new Promise((resolve, reject) => {
    const {
      username,
      userID,
      selectedSpace,
      start,
      end,
      logged,
      oldStart,
      oldEnd,
    } = data;

    if (logged) {
      if (oldStart && oldEnd) {
        console.log(getDuration(oldStart, oldEnd));
      } else {
        console.log(
          warn(
            'We are logged, but may not have enough data (oldStart, oldEnd):'
          ),
          oldStart,
          oldEnd
        );
        return
      }
    }

    // if data includes logged, we update
    let query = logged
      ? // updated event
        `MATCH (v:visitor{ name: '${username}', userID: '${userID}'})-[r:visited{start:${oldStart}, end:${oldEnd}, duration: '${formatTime(
          oldStart
        )}-${formatTime(oldEnd)}'}]->(s:space{ name: '${selectedSpace}'}) 
      SET r.start=${start}, r.end=${end}, r.duration='${formatTime(
          start
        )}-${formatTime(end)}'
        RETURN id(r)`
      : // first log
        `MERGE (v:visitor{ name: '${username}', userID: '${userID}'}) 
      MERGE (s:space{ name: '${selectedSpace}'}) 
      MERGE (v)-[r:visited{start:${start}, end:${end}, duration: '${formatTime(
          start
        )}-${formatTime(end)}'}]->(s)
        RETURN id(r)`;

    console.log(warn('Visit query:', query));
    Graph.query(query)
      .then((results) => {
        let x = results.next();
        let id = x.get('id(r)');
        const stats = results._statistics._raw;
        console.log(`stats: ${printJson(stats)}`);
        console.log(`New Visit graph ID: ${printJson(id)}`);
        resolve({ logged: true, id: id });
      })
      .catch((error) => {
        console.log(error);
        reject({ logged: false, error: error });
      });
  });
}

// delegated in index.js to handle socket.on('deleteVisit')
// Example query:
// MATCH  (:visitor{name:"Tab hunter"})-[v:visited{start:1616455800000, end:1616459400000}]->(:space{name:'Sisters Coffee Company'}) DELETE v
function deleteVisit(data) {
  return new Promise((resolve, reject) => {
    const { username, userID, selectedSpace, start, end } = data;
    let query = `MATCH  (:visitor{name:"${username}", userID: "${userID}"})-[v:visited{start:${start}, end:${end}}]->(:space{name:"${selectedSpace}"}) DELETE v`;
    console.log(warn('DELETE Visit query:', query));
    Graph.query(query)
      .then((results) => {
        const stats = results._statistics._raw;
        console.log(`stats: ${printJson(stats)}`);
        resolve({ deleted: true });
      })
      .catch((error) => {
        console.log(error);
        reject({ deleted: true, error: error });
      });
  });
}

// if we store these output Cypher commands in a text file, we can bulk import them into Redis
// run this command in the terminal (outside of redis-cli)
// cat sistersCommands.txt | redis-cli --pipe

// or see https://github.com/RedisGraph/redisgraph-bulk-loader for the python way...

//#region Cheatsheet
/*
CREATE a RELATIONSHIP between MATCHed nodes:
MATCH (a:visitor), (b:room) WHERE (a.name = "" AND b.name="" ) CREATE (a)-[:visited]->(b)

READ all NODES:
MATCH n=() RETURN n

READ all RELATIONSHIPs:
MATCH p=()-[*]->() RETURN p

READ Exposed Visitors:
MATCH  (:visitor{name:'Phone'})-[v:visited]->(s:space) RETURN  s.name, id(s), v.start


FILTER graph by RELATIONSHIP internal id:
MATCH p=()-[v:visited]->() where id(v)=9 RETURN p


UPDATE existing RELATIONSHIP
MATCH ()-[v:visited]->() where id(v)=0 set v.start=1617911100000, v.end=1617912000000
MATCH (v:visitor{ name: 'dciFoyle', userID: 'dab6b36ae9a3b438'})-[r:visited{start:1618257600000, end:1618261200000, duration:'4/12/2021, 1:00 PM TO 4/12/2021, 2:00 PM'}]->(s:space{ name: 'Sisters'}) SET r.start=1618261200000, r.end=1618264800000, r.duration='hour later'"



DELETE 
relationship:
MATCH ()-[v:visited]->() WHERE id(v)=0 DELETE v



*/

//#endregion
