//https://github.com/RedisGraph/redisgraph.js
const RedisGraph = require('redisgraph.js').Graph;
const host = 'redis-11939.c60.us-west-1-2.ec2.cloud.redislabs.com';
const options = {
  host: host,
  port: 11939,
  password: '7B3DId42aDCtMjmSXg7VN0XZSMOItGAG',
};
const { graphName } = require('./config.js');
const Graph = new RedisGraph(graphName, null, null, options);

module.exports = { Graph, graphName, host };

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
MATCH  (a:visitor{id:1})-[:visits]->(:room) RETURN a.id, a.name


CREATE a RELATIONSHIP between MATCHed nodes:
MATCH (a:visitor), (b:room) WHERE (a.name = "" AND b.name="" ) CREATE (a)-[:visits]->(b)


Filter RELATIONSHIP based on its propertyL
MATCH p=(visitor{name:'klm'})-[*]-() WHERE any(edge IN relationships(p) WHERE edge.date>=\"1/27\") RETURN p



DELETE relationship:
MATCH  (:visitor{name:"ssw"})-[r:visits]->(:room{id:1502}) DELETE r

SET property on 
node:
MATCH  (s:space{name:"undefined"}) SET s.name="Fika Sisters"

relationship:
MATCH  (:room{name:"The Secret Room of the Ogre King"})-[c:contains]->(:monster{name:"Ralph the Ogre King"}) SET c.visible="0"

Exposed Visitors:
MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Mphone' AND a2.name <> 'Mpnone' AND v.visitedOn='3/10/2021' RETURN a2.name, s.name
useing DateTime:
MATCH (a1:visitor)-[v:visited]->(s:space)<-[:visited]-(a2:visitor) WHERE a1.name = 'Tab hunter' AND a2.name <> 'Tab hunter' AND v.visitedOn='1615516200000' RETURN a2.name, s.name
*/
//#endregion
