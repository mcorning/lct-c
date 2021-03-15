# LCT-C: The Big Picture

The first marginal value of LCT is that you have advanced warning of possible exposure to COVID-19.

This minimal marginal value (MMV) is gross. That is, its risk assessment has the highest residual value. However, this value, no matter how gross, is far better than the *status quo* where you have no idea that you have been exposed.

The first part of this document outlines the data flow for this MMV.

## The Client

LCT is built with Vuejs. We will refer to the Vue UX with the technical term, "card."

### Welcome Card

The first time a user logins in to LCT, they provide the server with a username. The Server will generate session data for that user name, and it will return the session data to the client. Subsequent logins to the server will use this stored session data to make the Socket.io connection. The user will see the `Welcome` card only once.

### The Room Card

Once logged into the server. The user will enter the location of their visit. This can be done with dropdown lists of curated spaces, or the user can use a map.

Specifying a location triggers the second step: specifying the (expected) duration of the visit. The user can do this with a (drag and drop) calendar, or they can use start and stop dropdowns.

Having a location and visit duration, the third step is to send this data to the LCT server.

## The Server

The LCT Server acts as an intermediary between clients and the social graph of the community (i.e., the graph of each visit to pubic places in the community)

### Socket Connections

As noted above, the first duty of the server is connect with visitors using the visitor's session data.

### Log Visits to the Graph

Besides handling socket connections, the server's second responsibility is to convert the visit data into a `Cypher` language query.

In the MMV, the server sends the `log query` to redisGraph where the visit is stored for 14 days. [Later versions of LCT can minimize risk of data exposure by storing a set of `Cypher` queries locally and sending them all to redisGraph at once only when a visitor warns the server of possible exposure.]

### Listen for `Exposure Warning`s

The server's third responsibility is to respond to `Exposure Warnings` sent by visitors. When a visitor tests positive for Covid (or when they show symptoms or go into quarantine), the visitor sends a message to the server to query the social graph for all the rooms visited in the last 14 days. The server sends an `Exposure Warning` query to redisGraph, and the graph returns a set of data. This data includes each room visited and the dates of the visits. The server then queries the graph for all other visitors to each space on each visit date. The final data includes the names of other visitors who shared the space on those dates.

### Send Exposure Alerts

The final duty of the server is to send an `Exposure Alert` to each visitor on the list returned by redisGraph. The first thing the server does is store the `Alert` data (dates and names) locally. The second thing is to transform this Map of visitors by date into a Set of visitors. The server stores the Set in the Map.

Because the social graph can get arbitrarily complex, and because we want to minimize the number of `Exposure Alerts` sent to any given visitor, as soon as the server sees multiple `Exposure Warning` objects, it will create a Set of Sets; viz., a `Warning Cache`. At the end of the day, there is only one `Warning Cache` consisting in single instances of all visitors exposed to the virus.

Next, the server iterates the `Warning Cache` and sends an `Exposure Alert` to any visitor currently logged in to the server. The server then removes the alerted visitor from the `Warning Cache`.

The next time an exposed visitor logs in to the server the server will find the visitor in the `Warning Cache`, and it will send an `Exposure Alert` to the visitor (then it will remove the visitor from the `Warning Cache`).

### Temporal Queries

The MMV uses the `start` time of visit exposure to determine if other visitors were exposed. Specifically, if a vistor's date is `greater than or equel to` the `start` time of the visit exposure, the visitor will get an `Exposure Alert`. To the extend visits have `stop` times, the temporal query becomes `between` exposure visit `start` and `stop` times.
