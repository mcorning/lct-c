<template>
  <v-card>
    <v-card-title>
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
      ></v-text-field>
    </v-card-title>
    <v-data-table
      :search="search"
      :headers="logHeaders"
      :items="logEntries"
      multi-sort
      must-sort
      :sort-by="['sentTime', 'type']"
      :sort-desc="[true, false]"
      calculate-widths
      item-key="id"
      dense
      :items-per-page="15"
      group-by="type"
      class="elevation-1"
    >
      <template v-slot:item.message="{ item }">
        <v-card flat :class="getTextColor(item.type)">
          {{ item.message }}
        </v-card>
      </template>
      <template v-slot:item.sentTime="{ item }">
        <v-card flat min-width="200" class="text-right">
          {{ visitedDate(item.sentTime) }}</v-card
        >
      </template>
      <template v-slot:item.type="{ item }">
        <v-icon :color="getIconColor(item.type)">mdi-{{ item.type }}</v-icon>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
import helpers from '@/mixins/helpers.js';
const { formatVisitedDate } = require('../../utils/luxonHelpers');

export default {
  props: {
    auditor: Object,
  },
  data() {
    return {
      logEntries: [],
      search: '',

      rating: 3,

      logHeaders: [
        { text: 'Message', value: 'message' },
        { text: 'Type', value: 'type' },
        { text: 'Sent  ', value: 'sentTime' },
      ],
    };
  },
  methods: {
    getTextColor(type) {
      return type == 'alert' ? 'red--text' : '';
    },
    getIconColor(type) {
      return type == 'alert' ? 'red' : 'gray';
    },
    visitedDate(date) {
      return formatVisitedDate(date);
    },
  },

  mixins: [helpers],

  mounted() {
    this.logEntries = this.auditor.findAllLogEntries();
    console.log(this.logEntries);
    if (this.$refs.audit) {
      this.$vuetify.goTo(this.$refs.audit, {
        duration: 300,
        offset: 0,
        easing: this.easing,
      });
    }
  },
};
</script>
