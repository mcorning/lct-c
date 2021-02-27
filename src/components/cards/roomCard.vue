<template>
  <div>
    <v-card class="overflow-hidden" color="primary lighten-2" dark :height="ht">
      <v-dialog v-model="alert" max-width="450">
        <v-card dark color="warning darken-1" class="white--text">
          <h3 class="ma-5 pt-3">Are you sure you want to update the server?</h3>
          <v-card-text class="white--text"
            >You cannot put this toothpaste back in the tube...</v-card-text
          >
          <v-card-actions>
            <v-btn color="black" text @click="saveMe">I'm sure</v-btn>
            <v-spacer></v-spacer>

            <v-btn color="black" text @click="alert = false">Never mind</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="hasSaved" :timeout="2000" absolute bottom left>
        You have entered
        {{ selectedSpace }}
      </v-snackbar>

      <mapCard v-if="showMap" />

      <!-- Favorites List -->
      <v-card tile v-if="showFavorites" :height="ht">
        <v-card-text>
          <v-list dense shaped max-width="300">
            <v-subheader>Spaces you visited recently:</v-subheader>
            <v-divider></v-divider>
            <v-list-item-group v-model="favorite" color="secondary">
              <v-list-item v-for="(item, i) in favorites" :key="i">
                <v-list-item-content>
                  <v-list-item-title v-text="item"></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Spaces form -->
      <v-card v-if="showSpaces" :height="ht">
        <v-card-text>
          Pick a {{ nsp }} public space category:
          <v-row no-gutters>
            <v-col cols="12">
              <v-chip-group
                v-model="selectedCategory"
                mandatory
                color="secondary"
                dark
              >
                <v-chip filter>
                  <v-icon>mdi-store</v-icon>
                </v-chip>
                <v-chip filter>
                  <v-icon>mdi-silverware</v-icon>
                </v-chip>

                <v-chip filter>
                  <v-icon>mdi-bed</v-icon>
                </v-chip>
                <v-chip filter>
                  <v-icon>mdi-theater</v-icon>
                </v-chip>
              </v-chip-group>
            </v-col>
            <v-col cols="12">
              <v-row no-gutters>
                <v-col cols="12"> {{ categoryLabel }}: </v-col>
                <v-col cols="auto">
                  <v-autocomplete
                    v-model="selectedSpace"
                    :items="filteredSpaces"
                    :filter="customFilter"
                    item-text="room"
                    clearable
                  ></v-autocomplete>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Getherings from button click -->
      <v-card v-if="showGatherings" :height="ht">
        <v-card-title>Identify the gathering</v-card-title>
        <v-card-text>
          <v-row no-gutters>
            <v-col cols="10" md="4">
              <v-text-field
                v-model="selectedSpace"
                hint="Use a name others in the gathering would use"
                persistent-hint
                clearable
                autofocus
              ></v-text-field
            ></v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- <visitorIdentityCard
        :log="log"
        @warned="onWarned($event)"
        :height="ht"
        :user="user"
        :socketID="socketID"
        },
      /> -->
    </v-card>
    <v-card>
      <v-tooltip left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            color="primary lighten-1"
            block
            tile
            large
            v-bind="attrs"
            v-on="on"
            @click="save"
          >
            Log visit:
            {{ selectedSpace }}
          </v-btn>
        </template>
        <span>Send your visit to the server</span>
      </v-tooltip>
    </v-card>
    <v-bottom-navigation
      :value="value"
      color="secondary"
      background-color="primary"
      dark
    >
      <v-btn @click="show = 0">
        <span>Recent</span>
        <v-icon>mdi-heart</v-icon>
      </v-btn>
      <v-btn @click="show = 1">
        <span>Nearby</span>
        <v-icon>mdi-map-marker</v-icon>
      </v-btn>
      <v-btn @click="show = 2">
        <span>Spaces</span>
        <v-icon>mdi-home</v-icon>
      </v-btn>
      <v-btn @click="show = 3">
        <span>Gathering</span>
        <v-icon>mdi-account-group</v-icon>
      </v-btn>
    </v-bottom-navigation>

    <!-- Your Logs -->
    <logsCard v-if="showLogs" :messages="messages" :roomName="roomName" />
  </div>
</template>

<script>
// import warnRoomCard from "@/components/cards/warnRoomCard";
import logsCard from '@/components/cards/logsCard';
import mapCard from '@/components/cards/mapCard';

import { data } from '@/assets/data/sistersBusiness.json';

export default {
  props: {
    messages: { type: Array },
    nickName: {
      type: String,
      default: '',
    },
    favorites: {
      type: Array,
    },
    log: { type: Function },
    roomName: { type: String },
    user: { type: Object },
    socketID: { type: String },
    showLogs: Boolean,
  },
  components: {
    // warnRoomCard,
    mapCard,
    // visitorIdentityCard,
    logsCard,
  },
  computed: {
    categoryLabel() {
      const label = this.categoryLabels[this.selectedCategory]?.label;
      return `Select a space from ${label}`;
    },
    showFavorites() {
      return this.show == 0;
    },
    showMap() {
      return this.show == 1;
    },
    showSpaces() {
      return this.show == 2;
    },
    showGatherings() {
      return this.show == 3;
    },

    selectedFavorite() {
      return this.favorites[this.favorite];
    },

    categories() {
      return [...new Set(data.map((v) => v.NAME))];
    },

    spaces() {
      return data.map((v) => {
        return { room: v.ID, id: v.CODE, category: v.NAME };
      });
    },
  },

  data() {
    return {
      spaceLabel: '',
      show: 0,
      ht: '400px',
      value: 0,
      selectedCategory: [],
      usePanels: false,
      alert: false,
      visitedOn: new Date().toLocaleDateString('en-US'),
      panelState: [],
      sheet: false,
      dialog: false,
      favorite: -1,
      nsp: 'Sisters',
      categoryLabels: [
        { NAME: 'RES', label: 'Food and Drink' },
        { NAME: 'RETAIL', label: 'Retail' },
        { NAME: 'LODG', label: 'Lodging' },
        { NAME: 'ENTER', label: 'Entertainment' },
      ],
      filteredSpaces: [],
      categorySelected: '',
      selectedSpace: '',
      hasSaved: false,
      model: null,
    };
  },

  methods: {
    cancel() {
      this.sheet = !this.sheet;
      this.selectedSpace = '';
    },

    customFilter(item, queryText) {
      const textOne = item.room.toLowerCase();
      const searchText = queryText.toLowerCase();
      const res = textOne.indexOf(searchText) > -1;
      return res;
    },

    save() {
      this.alert = true;
    },

    saveMe() {
      this.alert = false;
      // this is where we send a Cypher query to RedisGraph
      const q = `MERGE (v:visitor{ name: '${this.nickName}'})
 MERGE (s:space{ name: '${this.selectedSpace}' })
 MERGE (v)-[r:visited{visitedOn:'${this.visitedOn}'}]->(s)`;
      this.log(q, 'RedisGraph: add visit query');

      this.$emit('logVisit', q);
      // this.exposeEventPromise('logVisit', q).then((results) => {
      //   this.log(results, 'ACK: logVisit');
      //   this.$emit('spaceSelected', { room: this.selectedSpace, id: '' });
      //   this.hasSaved = true;
      // });
    },
  },

  watch: {
    favorite() {
      this.selectedSpace = this.selectedFavorite;
    },

    selectedCategory() {
      this.categorySelected = this.categories[this.selectedCategory];
      this.filteredSpaces = this.spaces.filter(
        (v) => v.category == this.categorySelected
      );
      this.selectedSpace = '';

      this.spaceLabel = `Select a space for ${
        this.categoryLabels[this.selectedCategory].label
      }`;
    },
  },
  async mounted() {
    this.panelState = [0]; // open only the 0th element of expansion-panels
  },
};
</script>
