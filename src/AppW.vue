<template>
  <v-app id="inspire">
    <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

    <v-navigation-drawer
      v-model="drawer"
      app
      class="pt-4"
      color="grey lighten-3"
      mini-variant
    >
      <Chat />
    </v-navigation-drawer>

    <v-main> <h1>Hi</h1> </v-main>
  </v-app>
</template>

<script>
import Chat from './components/Chat';

export default {
  components: {
    Chat,
  },
  data() {
    return {
      drawer: true,
    };
  },
  //
};
</script>
