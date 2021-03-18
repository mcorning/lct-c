//https://github.com/RedisGraph/redisgraph.js
const RedisGraph = require('redisgraph.js').Graph;
const host = 'redis-11939.c60.us-west-1-2.ec2.cloud.redislabs.com';
const options = {
  host: host,
  port: 11939,
  password: '7B3DId42aDCtMjmSXg7VN0XZSMOItGAG',
};
// const { graphName } = require('./config.js');
const graphName = 'Sisters';
const Graph = new RedisGraph(graphName, null, null, options);
const { printJson, warn, info, success } = require('../src/utils/colors.js');

const DEBUG = 0;

module.exports = {
  Graph,
  graphName,
  host,
  findExposedVisitors,
  logVisit,
  onExposureWarning,
};

function findExposedVisitors(userID, subject = false) {
  console.log(`in findExposedVisitors(${userID})`);
  let promise = new Promise(function (resolve) {
    Graph.query(
      `MATCH (a:visitor{userID:'${userID}'})-[v:visited]->(s:space)
    RETURN a.userID, a.name, id(a), s.name, id(s), v.start, id(v), id(s)`
    ).then((res) => {
      console.log(`\n${subject ? 'Patient Zero' : 'Exposed'}:`);

      const rec = res._results[0];
      console.log(rec.get('id(a)'), userID, rec.get('a.name'), 'visited:');

      while (res.hasNext()) {
        let record = res.next();
        let date = new Date(record.get('v.start') / 1).toLocaleString();
        let vid = record.get('id(v)');
        let sid = record.get('id(s)');

        console.log(
          ' '.repeat(19),
          vid < 10 ? ' ' : '',
          vid,
          ' '.repeat(vid / 100),
          record.get('v.start'),
          '=',
          date,
          ' '.repeat(25 - date.length),

          sid < 10 ? ' ' : '',
          sid,
          record.get('s.name')
        );
      }
      const others = [
        ...new Set(res._results.map((v) => v._values).map((v) => v[0])),
      ];
      resolve(others);
    });
  });
  return promise;
}

function onExposureWarning(userID) {
  let promise = new Promise(function (resolve) {
    Graph.query(
      `MATCH (a1:visitor{userID:'${userID}'})-[v:visited]->(s:space)<-[v2:visited]-(a2:visitor) 
    WHERE a2.name <> a1.name 
    AND v2.start>=v.start
    RETURN a2.userID, a2.name, id(a2), s.name, id(s), v.start, id(v), v2.start, id(v2)`
    ).then((res) => {
      console.log(`\nVisits on or after exposure by ${userID}:`);
      // console.log(
      //   '123456791123456789212345679012345678931234567901234567894123456795123456789612345678981234567899123456789100'
      // );
      while (res.hasNext()) {
        let record = res.next();
        let date = new Date(record.get('v2.start') / 1).toLocaleString();

        let aid = record.get('id(a2)');
        let vid = record.get('id(v2)');
        let sid = record.get('id(s)');

        let name = record.get('a2.name');
        console.log(
          aid < 10 ? ' ' : '',
          aid,

          name,
          ' '.repeat(15 - name.length),

          vid < 10 ? ' ' : '',
          vid,
          record.get('v.start'),
          '=',
          date,
          ' '.repeat(25 - date.length),

          sid < 10 ? ' ' : '',
          sid,
          record.get('s.name')
        );
      }
      const visitors = [
        ...new Set(res._results.map((v) => v._values).map((v) => v[0])),
      ];
      resolve(visitors);
    });
  });

  return promise;
}

// Example query:
// MERGE (v:visitor{ name: 'hero', userID: '439ae5f4946d2d5d'}) MERGE (s:space{ name: 'Fika Sisters Coffeehouse'}) MERGE (v)-[:visited{start:'1615856400000'}]->(s)
function logVisit(data, ack) {
  const { username, userID, selectedSpace, start, end } = data;
  let query = `MERGE (v:visitor{ name: "${username}", userID: '${userID}'}) 
  MERGE (s:space{ name: "${selectedSpace}"}) 
  MERGE (v)-[:visited{start:${start}}]->(s)`;
  console.log(warn('Visit query:', query));
  Graph.query(query)
    .then((results) => {
      const stats = results._statistics._raw;
      console.log(`stats: ${printJson(stats)}`);
      if (ack) {
        ack(stats);
      }
    })
    .catch((error) => {
      console.log(error);
      console.log(
        `Be sure there is a graph named "${graphName}" on the Redis server: ${host}`
      );
    });
}

if (DEBUG) {
  const visitors = [
    'c23po',
    'Coffee Girl',
    'hero',
    'Ladydowling',
    'Mphone',
    'Phone',
    'Tab hunter',
  ];
  // execute tests
  const visitor = visitors[5];
  findExposedVisitors(visitor, true);
  onExposureWarning(visitor).then((exposed) => {
    exposed.forEach((name) => {
      findExposedVisitors(name).then((ack) =>
        console.log('Possible exposure(s)', ack)
      );
    });
  });
}
// if we store these output Cypher commands in a text file, we can bulk import them into Redis
// run this command in the terminal (outside of redis-cli)
// cat sistersCommands.txt | redis-cli --pipe

// or see https://github.com/RedisGraph/redisgraph-bulk-loader for the python way...

//#region Cheatsheet
/*
See all NODES:
MATCH n=() RETURN n

See node by internal id:
MATCH p=()-[*]->() RETURN [node IN nodes(p) WHERE id(node)=13]

See all RELATIONSHIPs:
MATCH p=()-[*]->() RETURN p

See specified RELATIONSHIP
MATCH  (v:visitor{id:1})-[:visited]->(:space) RETURN  v.id, v.name


CREATE a RELATIONSHIP between MATCHed nodes:
MATCH (a:visitor), (b:room) WHERE (a.name = "" AND b.name="" ) CREATE (a)-[:visited]->(b)


Filter RELATIONSHIP based on its property
MATCH p=(visitor{name:'klm'})-[*]-() WHERE any(edge IN relationships(p) WHERE edge.date>=\"1/27\") RETURN p



DELETE 
relationship:
MATCH  (:visitor{name:"Tab hunter"})-[v:visited{start:'3/11/2021'}]->(:space) DELETE v
property:
MATCH (n { name: 'Jim' }) SET n.name = NULL

SET property on: 
node:
MATCH  (s:space{name:"undefined"}) SET s.name="Fika Sisters"
MATCH ()-[v:visited{start:"3/10/2021"}]->() SET v.start='1615515300000'

relationship:
MATCH  (:room{name:"The Secret Room of the Ogre King"})-[c:contains]->(:monster{name:"Ralph the Ogre King"}) SET c.visible="0"

Exposed Visitors:
Spaces visited:
MATCH  (:visitor{name:'Phone'})-[v:visited]->(s:space) RETURN  s.name, id(s), v.start


MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Mphone' AND a2.name <> 'Mpnone' AND v.start='3/10/2021' RETURN a2.name, s.name
useing DateTime:
MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Tab hunter' AND a2.name <> 'Tab hunter' AND v.start='1615516200000' RETURN a2.name, s.name
*/
//#endregion
