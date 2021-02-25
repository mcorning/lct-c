<template>
  <div>
    <v-navigation-drawer absolute permanent right expand-on-hover>
      <template v-slot:prepend>
        <v-list-item two-line>
          <v-list-item-avatar>
            <img :src="avatar" />
          </v-list-item-avatar>
          <v-list-item-content>
            <v-row align="end" no-gutters>
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
        <v-list-item-group v-model="act" color="secondary" dark>
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
import socket from '../../socket.js';

import Visitor from '@/models/Visitor';

import helpers from '@/mixins/helpers.js';

// import clc from 'cli-color';
// const success = clc.green.bold;
// const error = clc.red.bold;
// const warn = clc.yellow;
// const info = clc.cyan;
// const notice = clc.blue;
// const highlight = clc.magenta;
// const bold = clc.bold;

export default {
  props: {
    entered: { type: Boolean, default: false },
    log: {
      type: Function,
      default: null,
    },
    user: Object,
    selected: Boolean,
    socketID: String,
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
          icon: 'mdi-account-multiple',
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
          `Deleted ${this.printJson(visitor)} and disconnected ${this.socketID}`
        );
        socket.disconnect(true);
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
      socket.disconnect(true);
    },

    onAddVisitor() {
      this.close();
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

    connectToServer(username) {
      // this.dialog = false;
      socket.disconnect();
      console.log(`Connecting ${username} to Server...`);
      socket.auth = { username };
      socket.connect();
    },

    // Called by text-field with Visitor's name.
    //update IndexedDb and set values for selection
    onUpdateVisitor(newVal) {
      this.connectToServer(newVal);

      console.assert(this.selectedVisitor, 'Missing selectedVisitor object.');
      this.selectedVisitor.visitor = newVal;

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

    onVisitorSelected() {
      this.connectToServer(this.selectedVisitor.visitor);
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
  },

  destroyed() {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('users');
    socket.off('user connected');
    socket.off('user disconnected');
    socket.off('private message');
  },
};
</script>
