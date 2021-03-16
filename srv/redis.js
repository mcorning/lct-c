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

module.exports = { Graph, graphName, host };

async function Test() {
  async function testExposureAlerts(subject) {
    await Graph.query(
      `MATCH (a1:visitor{name:'${subject}'})-[v:visited]->(s:space)<-[v2:visited]-(a2:visitor) 
    WHERE a2.name <> a1.name 
    RETURN a2.name, id(a2), s.name, id(s), v.visitedOn, id(v), v2.visitedOn, id(v2)`
    ).then((res) => {
      console.log(`\nTesting Alerts from ${subject}:`);
      // console.log(
      //   '123456791123456789212345679012345678931234567901234567894123456795123456789612345678981234567899123456789100'
      // );
      while (res.hasNext()) {
        let record = res.next();
        let date = new Date(record.get('v2.visitedOn') / 1).toLocaleString();

        let aid = record.get('id(a2)');
        let vid = record.get('id(v2)');
        let sid = record.get('id(s)');

        let visit = record.get('v2.visitedOn') + ' = ' + date;
        let name = record.get('a2.name');
        let v = visit.length;
        console.log(
          aid < 10 ? ' ' : '',
          aid,
          ' '.repeat(3 - aid / 100),
          name,
          ' '.repeat(20 - name.length),

          vid < 10 ? ' ' : '',
          vid,
          ' '.repeat(vid / 100),
          visit,
          ' '.repeat(45 - v),

          sid < 10 ? ' ' : '',
          sid,
          record.get('s.name')
        );
      }
    });
  }

  async function test(name) {
    await Graph.query(
      `MATCH (a:visitor{name:'${name}'})-[v:visited]->(s:space)
    RETURN a.name, s.name, id(s), v.visitedOn, id(v), id(s)`
    ).then((res) => {
      console.log('\nTesting subject:');

      const name = res._results[0]._values[0];
      console.log(name);

      while (res.hasNext()) {
        let record = res.next();
        let date = new Date(record.get('v.visitedOn') / 1).toLocaleString();
        let vid = record.get('id(v)');
        let sid = record.get('id(s)');

        console.log(
          vid < 10 ? ' ' : '',
          vid,
          ' '.repeat(vid / 100),
          record.get('v.visitedOn'),
          '=',
          date,
          ' '.repeat(25 - date.length),

          sid < 10 ? ' ' : '',
          sid,
          record.get('s.name')
        );
      }
    });
  }
  await testExposureAlerts('Phone');
  await test('Phone');

  test('c23po');
  test('Mphone');
  test('Ladydowling');
  test('Tab hunter');
  test('hero');
  test('Coffee Girl');
}

Test();

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



DELETE relationship:
MATCH  (:visitor{name:"Tab hunter"})-[v:visited{visitedOn:'3/11/2021'}]->(:space) DELETE v

SET property on: 
node:
MATCH  (s:space{name:"undefined"}) SET s.name="Fika Sisters"
MATCH ()-[v:visited{visitedOn:"3/10/2021"}]->() SET v.visitedOn='1615515300000'

relationship:
MATCH  (:room{name:"The Secret Room of the Ogre King"})-[c:contains]->(:monster{name:"Ralph the Ogre King"}) SET c.visible="0"

Exposed Visitors:
Spaces visited:
MATCH  (:visitor{name:'Phone'})-[v:visited]->(s:space) RETURN  s.name, id(s), v.visitedOn


MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Mphone' AND a2.name <> 'Mpnone' AND v.visitedOn='3/10/2021' RETURN a2.name, s.name
useing DateTime:
MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Tab hunter' AND a2.name <> 'Tab hunter' AND v.visitedOn='1615516200000' RETURN a2.name, s.name
*/
//#endregion
