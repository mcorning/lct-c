# Cypher Queries for LCT

The Cypher language produces data from the LCT social graph used for sending Exposure Alerts to visitors exposed to COVID-19.

There is only one query used to add nodes to the graph. That query is relatively simple and not discussed here beyond mere presentation:

```cypher
MERGE (v:visitor{ name: '[some user]', userID: '[some userID]'}) 
MERGE (s:space{ name: '[some public space]'}) 
MERGE (v)-[:visited{visitedOn:'[some DateTime integer]'}]->(s)
```

[Example LCT Social Graph](docs\imgs\graph.jpg)


The graph gathers the following data:

1) for a given visitor, find all visits returning:
   1) DateTime
   2) Name of space
2) 