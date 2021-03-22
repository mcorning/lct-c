//https://github.com/RedisGraph/redisgraph.js
const RedisGraph = require("redisgraph.js").Graph;
const host = "redis-11939.c60.us-west-1-2.ec2.cloud.redislabs.com";
const options = {
  host: host,
  port: 11939,
  password: "7B3DId42aDCtMjmSXg7VN0XZSMOItGAG",
};
// const { graphName } = require('./config.js');
const graphName = "Sisters";
const Graph = new RedisGraph(graphName, null, null, options);
const {
  printJson,
  warn,
  highlight,
  success,
} = require("../src/utils/colors.js");

const DEBUG = 0;

module.exports = {
  Graph,
  graphName,
  host,
  findExposedVisitors,
  logVisit,
  onExposureWarning,
};

// see if an alerted visitor has potential alerts to share
function findExposedVisitors(userID, subject = false) {
  let promise = new Promise(function (resolve) {
    Graph.query(
      `MATCH (a:visitor{userID:'${userID}'})-[v:visited]->(s:space)
    RETURN a.userID, a.name, id(a), s.name, id(s), v.start, v.end, id(v), id(s)`
    ).then((res) => {
      if (!res._results.length) {
        console.log(userID, "exposed nobody");
        return resolve(userID);
      }

      console.log(success(`\n${subject ? "Patient Zero" : "Exposed"}:`));
      const rec = res._results[0];
      console.log(rec.get("id(a)"), userID, rec.get("a.name"), "visited:");

      while (res.hasNext()) {
        let record = res.next();
        let start = new Date(record.get("v.start") / 1).toLocaleString();
        let end = new Date(record.get("v.end") / 1).toLocaleString();
        let vid = record.get("id(v)");
        let sid = record.get("id(s)");

        console.log(
          " ".repeat(19),
          vid < 10 ? " " : "",
          vid,
          " ".repeat(vid / 100),
          record.get("v.start"),
          "=",
          start,
          " ".repeat(25 - start.length),

          record.get("v.end"),
          "=",
          end,
          " ".repeat(25 - end.length),

          sid < 10 ? " " : "",
          sid,
          record.get("s.name")
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

// find any visitor who's start time is between the carrier's start and end times
function onExposureWarning(userID) {
  let promise = new Promise(function (resolve) {
    const q = `MATCH (carrier:visitor{userID:'${userID}'})-[c:visited]->(s:space)<-[e:visited]-(exposed:visitor) 
    WHERE (e.end>=c.start OR e.start>= c.end) 
    AND exposed.name <> carrier.name    
    RETURN exposed.userID, exposed.name, id(exposed), s.name, id(s), c.start, c.end, id(c),  e.start, e.end, id(e) `;
    console.log(highlight(q));
    Graph.query(q).then((res) => {
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
        let startC = new Date(record.get("c.start") / 1).toLocaleString();
        let endC = new Date(record.get("c.end") / 1).toLocaleString();
        let startE = new Date(record.get("e.start") / 1).toLocaleString();
        let endE = new Date(record.get("e.end") / 1).toLocaleString();

        // let exposedId = record.get('id(exposed)');
        // let eid = record.get('id(e)');
        // let sid = record.get('id(s)');

        let name = record.get("exposed.name");

        console.log(
          name,
          "left",
          record.get("e.end") >= record.get("c.start") ? "after" : "before",
          "carrier arrived"
        );
        console.log(endE, startC);

        console.log(
          name,
          "arrived",
          record.get("e.start") <= record.get("c.end") ? "before" : "after",
          "carrier left"
        );
        console.log(startE, endC);
        console.log(" ");
        // console.log(
        //   exposedId < 10 ? ' ' : '',
        //   exposedId,

        //   name,
        //   ' '.repeat(15 - name.length),

        //   eid < 10 ? ' ' : '',
        //   eid,
        //   record.get('c.start'),
        //   '=',
        //   startC,
        //   ' '.repeat(25 - startC.length),
        //   record.get('c.end'),
        //   '=',
        //   endC,
        //   ' '.repeat(25 - endC.length),

        //   record.get('e.start'),
        //   '=',
        //   startE,
        //   ' '.repeat(25 - startE.length),
        //   record.get('e.end'),
        //   '=',
        //   endE,
        //   ' '.repeat(25 - endE.length),

        //   sid < 10 ? ' ' : '',
        //   sid,
        //   record.get('s.name')
        // );
      }
      const visitors = [
        ...new Set(res._results.map((v) => v._values).map((v) => v[0])),
      ];
      printJson(visitors);
      resolve(visitors);
    });
  });

  return promise;
}

// delegated in index.js to handle socket.on('logVisit')
// Example query:
// MERGE (v:visitor{ name: 'hero', userID: '439ae5f4946d2d5d'}) MERGE (s:space{ name: 'Fika Sisters Coffeehouse'}) MERGE (v)-[:visited{start:'1615856400000'}]->(s)
function logVisit(data, ack) {
  const { username, userID, selectedSpace, start, end } = data;
  let query = `MERGE (v:visitor{ name: "${username}", userID: '${userID}'}) 
  MERGE (s:space{ name: "${selectedSpace}"}) 
  MERGE (v)-[:visited{start:${start}, end:${end}}]->(s)`;
  console.log(warn("Visit query:", query));
  Graph.query(query)
    .then((results) => {
      const stats = results._statistics._raw;
      console.log(`stats: ${printJson(stats)}`);
      if (ack) {
        ack({ logged: true });
      }
    })
    .catch((error) => {
      console.log(error);
      ack({ logged: true, error: error });
    });
}

if (DEBUG) {
  const visitors = [
    "c23po",
    "Coffee Girl",
    "hero",
    "Ladydowling",
    "Mphone",
    "Phone",
    "Tab hunter",
  ];
  // execute tests
  const visitor = visitors[5];
  findExposedVisitors(visitor, true);
  onExposureWarning(visitor).then((exposed) => {
    exposed.forEach((name) => {
      findExposedVisitors(name).then((ack) =>
        console.log("Possible exposure(s)", ack)
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


MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Mphone' AND eexposed.name <> 'Mpnone' AND v.start='3/10/2021' RETURN eexposed.name, s.name
useing DateTime:
MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Tab hunter' AND eexposed.name <> 'Tab hunter' AND v.start='1615516200000' RETURN eexposed.name, s.name
*/
//#endregion
