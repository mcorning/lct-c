<template>
  <v-card class="black--text" color="secondary lighten-1">
    <v-list-item>
      <v-list-item-content>
        <v-list-item-title class="title"> Your Travel Log </v-list-item-title>
        <v-btn
          fab
          color="red"
          :class="vclass"
          dark
          :small="small"
          absolute
          top
          right
          @click="$emit('exposureWarning')"
        >
          <v-icon dark> mdi-alert </v-icon></v-btn
        >
        <div class="d-none d-sm-block">
          <v-list-item-subtitle
            >Log each public space you visit.</v-list-item-subtitle
          >

          <v-list-item-subtitle class="pt-2 margin=top=-16 text-right"
            >Warn everybody if you test positive.</v-list-item-subtitle
          >
        </div>
      </v-list-item-content>
    </v-list-item>
  </v-card>
</template>

<script>
export default {
  computed: {
    small() {
      return this.$vuetify.breakpoint.xs;
    },
    vclass() {
      return this.$vuetify.breakpoint.sm ? 'mt-8' : 'mt-6';
    },
  },
};
</script>
