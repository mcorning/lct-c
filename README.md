# Local Contact Tracing - Charlie

This version of LCT uses Socket.io V3 and RedisGraph to handle a new Covid-19 alert protocol. This new protocol has many advantages over the one used in 2020. Here are the main differences:

- No need for Rooms
- Public Spaces replace Rooms
- Visitors pass a Cypher query to RedisGraph to link a socket ID to a public space node
- The protocol  
  - does a search of the graph for any other Visitor nodes that shared space with Visitor sending the warning
  - search repeats for each exposed Visitor until the graph is completely searched

## Augment basic Socket.io Client

To extend the basic Socket.io V3 install, add the following Vue dependencies:

``` node
vue add vuetify
vue add pwa
vue add vuex
npm i @vuex-orm/core vuex-orm-localforage vue-luxon
npm i cli-color // or whatever console enhancer you choose
```

You may decide to customize the default vuetify plugin with this code, instead:

``` js
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import colors from 'vuetify/lib/util/colors';

Vue.use(Vuetify);
let color = 'purple';
export default new Vuetify({
  theme: {
    themes: {
      light: {
        primary: colors[color].darken2,
        secondary: colors[color].lighten3,
        accent: colors.shades.black,
        error: colors.red.accent3,
      },
      dark: {
        primary: colors.blue.lighten3,
      },
    },
  },
});
```

You will need the ```./src/mixins``` folder for its PWA code and optionally for its helper class.

## Extend vuex with Object Relation Modeling

### The ORM Database

Vuex-ORM will require a ```./src/database``` folder with an index.js file:

```js
import { Database } from "@vuex-orm/core";

import Message from "@/models/Message";
import Visitor from "@/models/Visitor";

const database = new Database();

database.register(Message);
database.register(Visitor);

export default database;
```

### The Vuex Store

Then you will need to wire the ```./src/database``` folder to the index.js file in ```./src/store```:

```js
import Vue from "vue";
import Vuex from "vuex";
import VuexORM from "@vuex-orm/core";
import VuexORMLocalForage from "vuex-orm-localforage";
import database from "@/database";
import { version } from "../../package.json";

Vue.use(Vuex);

VuexORM.use(VuexORMLocalForage, { database });

const store = new Vuex.Store({
  plugins: [VuexORM.install(database)],
  // using package.json for version number
  state: {
    packageVersion: version || "0",
  },
  getters: {
    appVersion: (state) => {
      return state.packageVersion;
    },
  },
});

export default store;
```

> Note: we use the package.json file for LCT-C version number.

### Models

The ```./src/models``` folder contains the javascript for the two LCT-C Models used:

- Message
- Visitor

## Update main.js

Now we need to update the ```./src/main.js``` file to instantiate a logo component and use vue-luxon globally:

```js
import SoteriaIcon from './components/svg/safeInSistersLogo.vue';
import VueLuxon from 'vue-luxon';
Vue.use(VueLuxon);

Vue.component('soteria-icon', SoteriaIcon);
```


## Running the frontend

```
npm install
npm run serve
```

### Running the server

```
cd server
npm install
npm start
```
