<template>
  <div>
    <v-navigation-drawer absolute permanent right expand-on-hover>
      <template v-slot:prepend>
        <v-list-item two-line>
          <v-list-item-avatar>
            <img :src="avatar" />
          </v-list-item-avatar>
          <v-list-item-content>
            <v-row aligg="end">
              <v-col cols="3">
                <v-icon>{{ statusIcon }} </v-icon>
              </v-col>
              <v-col class="text-bottom">
                <v-list-item-title>{{
                  selectedVisitor.visitor
                }}</v-list-item-title>
              </v-col> </v-row
            ><small> {{ selectedVisitor.id }} </small>
          </v-list-item-content>
        </v-list-item>
      </template>

      <v-divider></v-divider>

      <v-list dense>
        <v-list-item-group v-model="act" color="primary">
          <v-list-item v-for="item in actions" :key="item.title">
            <v-list-item-icon>
              <v-icon @click="item.action">{{ item.icon }}</v-icon>
            </v-list-item-icon>

            <v-list-item-content>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <!-- <v-card height="350px"> -->
    <v-snackbar
      :value="!done"
      :timeout="timeout"
      vertical
      top
      color="primary"
      dark
    >
      <v-text-field
        v-if="addVisitorAction"
        label="Enter your nickname:"
        hint="How do you want to be seen?"
        persistent-hint
        clearable
        @change="onUpdateVisitor($event)"
      />
      <!-- select for either changeVisitorAction or deleteVisitorAction -->
      <v-select
        v-else
        v-model="selectedVisitor"
        :items="visitors"
        item-text="visitor"
        item-value="id"
        return-object
        label="Pick your nickname"
        :hint="hint"
        persistent-hint
        single-line
        autofocus
        :prepend-icon="statusIcon"
        :disabled="entered"
      >
      </v-select>
      <template v-slot:action="{ attrs }">
        <v-btn v-if="addVisitorAction" color="white" text @click="onAddVisitor">
          Add
        </v-btn>
        <v-btn
          v-if="deleteVisitorAction"
          color="white"
          text
          @click="onDeleteVisitor"
        >
          Delete
        </v-btn>
        <v-btn color="white" text v-bind="attrs" @click="close"> Close </v-btn>
      </template>
    </v-snackbar>
    <!-- </v-card> -->
  </div>
</template>

<script>
import Visitor from '@/models/Visitor';

import helpers from '@/mixins/helpers.js';

import clc from 'cli-color';
// const success = clc.green.bold;
// const error = clc.red.bold;
// const warn = clc.yellow;
// const info = clc.cyan;
// const notice = clc.blue;
const highlight = clc.magenta;
// const bold = clc.bold;

export default {
  props: {
    entered: { type: Boolean, default: false },
    log: {
      type: Function,
      default: null,
    },
  },
  computed: {
    avatar() {
      let randomId = Math.round(Math.random() * 100);
      return `https://randomuser.me/api/portraits/men/${randomId}.jpg`;
    },
    changeVisitorAction() {
      return this.selectedAction == 'changeVisitorAction';
    },
    addVisitorAction() {
      return this.selectedAction == 'addVisitorAction';
    },
    deleteVisitorAction() {
      return this.selectedAction == 'deleteVisitorAction';
    },
    visitors() {
      let allvisitors = Visitor.all();
      return allvisitors;
    },
    visitor() {
      let v = Visitor.find(this.selectedVisitor?.id) || this.visitors[0] || '';
      return v;
    },
  },
  data() {
    return {
      done: true,
      timeout: -1,
      act: -1,
      selectedAction: '',
      hint: 'This nickname appears on your phone only',
      statusIcon: 'mdi-lan-disconnect',
      msg: '',
      newVisitor: false,
      nsp: '',
      selectedVisitor: {},
      actions: [
        {
          title: 'Change nickname',
          icon: 'mdi-account',
          action: 'changeVisitorAction',
        },
        {
          title: 'Add nickname',
          icon: 'mdi-account-plus',
          action: 'addVisitorAction',
        },
        {
          title: 'Delete nickname',
          icon: 'mdi-account-minus',
          action: 'deleteVisitorAction',
        },
      ],
    };
  },

  sockets: {
    //#region socket.io reserved events
    connect() {
      // const { visitor, id, nsp } = this.getQuery();

      // console.log(this.$socket.id, visitor, id, this.$socket.query);

      // // OBX sends a socket with an ID generated on the server and copied in the query options
      // if (this.$socket.connected && !id) {
      //   this.newVisitor = this.noVisitors;
      //   return;
      // }

      // // set the selectedVisitor object
      // if (!this.selectedVisitor.visitor) {
      //   this.selectedVisitor = { visitor: visitor, id: id, nsp: nsp };
      // }

      // console.group("Step 0: connect() at", Date.now());
      // console.log(
      //   highlight(
      //     this.$socket.id,
      //     this.$socket.connected,
      //     this.printJson(this.$socket.io.opts)
      //   )
      // );

      // if (this.reconnected) {
      //   this.log("Reconnected. No need to connect(). Returning");
      //   return;
      // }

      // console.log(`Connecting ${visitor}`);

      // this.log(
      //   `Server connected using Id: ${id}, Visitor: ${visitor}, and nsp ${nsp} `,
      //   "visitorIdentityCard.vue"
      // );

      // console.groupEnd();
      // console.log(" ");

      // set icon to indicate connect() handled
      this.statusIcon = 'mdi-lan-connect';
      // this.hint = id;
      this.$emit('visitor', this.selectedVisitor);
    },

    // reconnect(reason) {
    //   if (!this.getQuery()) {
    //     return;
    //   }
    //   // this.query = this.parseParams(this.$socket.io.opts.query);
    //   console.group("onReconnect");
    //   console.log(
    //     highlight(
    //       `[${this.getNow()}] ${this.printQuery()} Recconnect ${reason}`,
    //       "visitorIdentityCard.vue"
    //     )
    //   );
    //   const msg = {
    //     visitor: this.getQuery().visitor,
    //     message: "Reconnected",
    //     sentTime: new Date().toISOString(),
    //   };
    //   this.messages = msg;
    //   this.log(`Reconnect ${reason}`, "visitorIdentityCard.vue");
    //   console.groupEnd();

    //   this.onVisitorSelected("reconnect");
    // },

    //#region Other connection events
    disconnect(reason) {
      this.log(`Disconnect: ${reason}`, 'Visitor.vue');
      this.statusIcon = 'mdi-lan-disconnect';
    },
    error(reason) {
      this.dialog = false;
      this.log(`Error ${reason}`, 'Visitor.vue');
    },
    connect_error(reason) {
      this.log(`Connect_error ${reason}`, 'Visitor.vue');
    },
    connect_timeout(reason) {
      this.log(`Connect_timeout ${reason}`, 'Visitor.vue');
    },

    reconnect_attempt(reason) {
      this.log(`Reconnect_attempt ${reason}`, 'Visitor.vue');
    },
    reconnecting(reason) {
      this.log(`Reconnecting ${reason}`, 'Visitor.vue');
    },
    reconnect_error(reason) {
      this.log(`Reconnect_error ${reason}`, 'Visitor.vue');
    },
    reconnect_failed(reason) {
      this.log(`Reconnect_failed ${reason}`, 'Visitor.vue');
    },
    message(msg) {
      this.log(msg);
    },
    //#endregion
    //#endregion end socket.io reserved events
  },

  methods: {
    close() {
      this.done = true;
    },

    parseParams(querystring) {
      // parse query string
      const params = new URLSearchParams(querystring);

      const obj = {};

      // iterate over all keys
      for (const key of params.keys()) {
        if (params.getAll(key).length > 1) {
          obj[key] = params.getAll(key);
        } else {
          obj[key] = params.get(key);
        }
      }

      return obj;
    },

    deleteVisitor(visitor) {
      const self = this;
      Visitor.delete(visitor.id).then((allVisitors) => {
        this.log(
          `Deleted ${this.printJson(visitor)} and disconnected ${
            this.$socket.id
          }`
        );
        this.$socket.disconnect(true);
        if (allVisitors.length == 0) {
          console.log('self.selectedVisitor', self.selectedVisitor);
        }
      });
      // if we deleted the last saved Room, reset the v-model
      if (!this.selectedVisitor) {
        this.selectedVisitor = { visitor: '', id: '' };
      }
      this.newVisitor = this.noVisitors;
    },

    onChangeSocket() {
      this.$socket.disconnect(true);
    },

    onAddVisitor() {
      this.done = true;

      this.newVisitor = true;
    },

    onDeleteVisitor() {
      this.done = true;
      this.selectedVisitor = null;
    },

    onWarned(data) {
      this.$emit('warned', data);
    },

    findVisitorWithId(id = this.selectedVisitor?.id) {
      let v = Visitor.find(id) || '';
      return v;
    },

    connectToServer() {
      this.dialog = false;
      // const { visitor, id, nsp } = this.selectedVisitor;

      console.log('Inside connectToServer()');
      // const query = {
      //   visitor: visitor,
      //   id: id,
      //   nsp: nsp,
      // };
      // this.$socket.io.opts.query = query;

      // console.log(
      //   highlight(
      //     "Connecting with query options:",
      //     this.printJson(this.$socket.io.opts.query)
      //   )
      // );

      this.$socket.connect();
    },

    getQuery() {
      let query = this.$socket.io.opts.query || {
        visitor: '',
        id: '',
        nsp: '',
      };
      return query;
    },

    printQuery() {
      const query = this.getQuery();
      if (!query.id) {
        return 'Empty query';
      }
      return this.printJson(query);
    },

    // Called by text-field with Visitor's name.
    //update IndexedDb and set values for selection
    onUpdateVisitor(newVal) {
      console.assert(this.selectedVisitor, 'Missing selectedVisitor object.');
      this.selectedVisitor.visitor = newVal;
      // OBX provides a Visitor ID
      // But one added in the UI does not, so generate one here
      if (this.newVisitor) {
        this.selectedVisitor.id = '';
      }
      // static update function on Visitor model
      Visitor.update(
        this.selectedVisitor.visitor,
        this.selectedVisitor.id,
        this.nsp,
        Date.now()
      ).then((v) => {
        console.log('New Visitor:', v);
        this.onVisitorSelected('updateVisitor');
        this.newVisitor = false;
      });
    },

    onVisitorSelected(caller) {
      try {
        this.reconnected = false;
        if (!this.selectedVisitor?.id && !this.visitors.length) {
          return;
        }

        console.group(`Step 4: onVisitorSelected ${caller}`);

        console.log(highlight('Old query:', this.printQuery()));

        this.onChangeSocket();

        this.log(`Connecting ${this.selectedVisitor.visitor} to Server...`);

        // this.dialog = true;
        this.connectToServer();
        console.log('Leaving onVisitorSelected() at ', Date.now());
        console.groupEnd();
      } catch (error) {
        console.error('onVisitorSelected:', error);
      }
    },
  },

  mixins: [helpers],

  watch: {
    selectedVisitor(newVal, oldVal) {
      console.groupCollapsed('Step 3: selectedRoom watch');

      if (!newVal) {
        console.log('Deleting', oldVal.visitor);
        this.deleteVisitor(oldVal);
        return;
      }

      if (!this.selectedVisitor) {
        console.log('Resetting selectedVisitor');
        this.selectedVisitor = { visitor: '', id: '' };
        return;
      }

      console.log('Changing selectedVisitor');
      console.groupEnd();
      console.log(' ');

      this.onVisitorSelected('watch');
    },

    act(newVal, oldVal) {
      console.log('newVal:', newVal, 'oldVal:', oldVal);
      try {
        const item = newVal >= 0 ? newVal : oldVal >= 0 ? oldVal : -1;
        this.selectedAction = this.actions[item]?.action;
        console.log(this.selectedAction);
        this.done = false;
      } catch (error) {
        alert(error);
      }
    },
  },

  async mounted() {
    await Visitor.$fetch();
    this.selectedVisitor = this.visitors[0];
    this.onVisitorSelected();
    console.group('Step 1: mounted()');
    console.log(highlight('First query:', this.printQuery()));
    console.groupEnd();
    console.log(' ');
  },
};
</script>
