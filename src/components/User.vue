<template>
  <div class="user" @click="onClick" :class="{ selected: selected }">
    <div v-if="user.self">
      <v-list>
        <v-list-item class="px-2">
          <v-tooltip left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn text left v-bind="attrs" v-on="on" @click="clearSessionID">
                <v-avatar size="36px"> <img :src="avatar" /> </v-avatar>
              </v-btn>
            </template>
            <span>Click to login with different nickname</span>
          </v-tooltip>
        </v-list-item>

        <v-list-item link>
          <v-list-item-content class="name">
            {{ user.username }}
            <div class="status">
              <status-icon :connected="user.connected" />{{ status }}
            </div>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>
    </div>

    <div v-else>
      <v-list-item>
        <v-list-item-content class="name">
          {{ user.username }} {{ user.self ? ' (yourself)' : '' }}
          <div class="status">
            <status-icon :connected="user.connected" />{{ status }}
          </div>
        </v-list-item-content>
      </v-list-item>
    </div>
    <!-- 
    <div v-if="user.hasNewMessages" class="new-messages">!</div> -->
  </div>
</template>

<script>
import StatusIcon from './StatusIcon';
export default {
  name: 'User',
  components: { StatusIcon },
  props: {
    user: Object,
    selected: Boolean,
    socketID: String,
  },
  methods: {
    clearSessionID() {
      localStorage.removeItem('sessionID');
    },

    onClick() {
      this.$emit('select');
    },
  },
  computed: {
    avatar() {
      let randomId = Math.round(Math.random() * 100);
      return `https://randomuser.me/api/portraits/men/${randomId}.jpg`;
    },

    status() {
      return this.user.connected ? 'online' : 'offline';
    },
  },
};
</script>

<style scoped>
.selected {
  background-color: #1164a3;
}

.user {
  padding: 10px;
}

.description {
  display: inline-block;
}

.status {
  color: #92959e;
}

.new-messages {
  color: white;
  background-color: red;
  width: 20px;
  border-radius: 5px;
  text-align: center;
  float: right;
  margin-top: 10px;
}
</style>
