<template>
  <v-row no-gutters>
    <v-col>
      <v-card class="overflow-hidden">
        <v-card-title>Your Logs</v-card-title>
        <v-expansion-panels
          v-if="messages.length"
          v-model="panelState"
          multiple
          popout
        >
          <v-expansion-panel>
            <v-expansion-panel-header color="primary lighten-5" dark>
              Visits
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <dataTableCard :roomName="roomName" :log="log" ref="logs" />
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header color="primary lighten-5" dark>
              Audit Trail
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <auditTrailCard :cons="cons" />
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import dataTableCard from "@/components/cards/dataTableCard";
import auditTrailCard from "@/components/cards/auditTrailCard";

export default {
  props: {
    messages: { type: Array },
    roomName: {
      type: String,
    },
  },
  components: {
    dataTableCard,
    auditTrailCard,
  },
  data() {
    return {
      panelState: [0],
      cons: [],
    };
  },
  methods: {
    log(msg, type = "information") {
      this.cons.push({
        sentTime: new Date(),
        type: type,
        message: msg,
      });
    },
    noop() {
      this.panelState = [0]; // open only the 0th element of expansion-panels
    },
  },
};
</script>
