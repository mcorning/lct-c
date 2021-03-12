<template>
  <v-row class="fill-height">
    <v-col>
      <!-- calendar controls -->
      <v-sheet height="64">
        <v-toolbar flat>
          <v-icon medium @click="setToday"> mdi-calendar-today </v-icon>
          <v-btn fab text small color="grey darken-2" @click="prev">
            <v-icon> mdi-chevron-left </v-icon>
          </v-btn>
          <v-btn fab text small color="grey darken-2" @click="next">
            <v-icon> mdi-chevron-right </v-icon>
          </v-btn>
          <v-toolbar-title v-if="$refs.calendar">
            {{ $refs.calendar.title }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-menu bottom right>
            <template v-slot:activator="{ on, attrs }">
              <v-btn outlined color="grey darken-2" v-bind="attrs" v-on="on">
                <span>{{ typeToLabel[type] }}</span>
                <v-icon right> mdi-menu-down </v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="changeType('day')">
                <v-list-item-title>Day</v-list-item-title>
              </v-list-item>
              <v-list-item @click="changeType('4day')">
                <v-list-item-title>4 days</v-list-item-title>
              </v-list-item>
              <v-list-item @click="changeType('week')">
                <v-list-item-title>Week</v-list-item-title>
              </v-list-item>
              <v-list-item @click="changeType('month')">
                <v-list-item-title>Month</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-toolbar>
      </v-sheet>

      <!-- Log, Delete, Cancel form -->
      <v-snackbar
        v-model="snackBar"
        :timeout="4000"
        color="primary"
        dark
        bottom
        absolute
      >
        {{ feedbackMessage }}
        <template v-slot:action="{ attrs }">
          <v-btn color="white" text v-bind="attrs" @click="snackBar = false">
            Close
          </v-btn>
        </template>
      </v-snackbar>

      <!-- calendar -->
      <!-- do not change the calendar sheet's height. if you do, you will lose scrollToTime, and you will lose hours on the calendar -->
      <v-sheet height="400">
        <v-calendar
          ref="calendar"
          v-model="focus"
          color="primary"
          :type="type"
          :events="visits"
          :event-ripple="false"
          @mousedown:event="startDrag"
          @mousedown:time="startTime"
          @mousemove:time="mouseMove"
          @mouseup:time="endDrag"
          @mouseleave.native="cancelDrag"
          @click:event="showEvent"
          @click:more="viewDay"
          @click:date="viewDay"
        >
          <template v-slot:event="{ event, timed, eventSummary }">
            <div class="v-event-draggable" v-html="eventSummary()"></div>
            <div
              v-if="timed"
              class="v-event-drag-bottom"
              @mousedown.stop="extendBottom(event)"
            ></div>
          </template>
        </v-calendar>
        <v-menu
          v-model="selectedOpen"
          :close-on-content-click="false"
          :activator="selectedElement"
          offset-x
          offset-y
        >
          <v-card max-width=" 400px" color="grey lighten-4" flat>
            <v-card-title> {{ selectedEvent.name }}</v-card-title>
            <v-card-subtitle>Visit {{ getLoggedState() }}.</v-card-subtitle>
            <v-card-text>
              You can only delete an unlogged visit. You cannot delete data from
              the server.
            </v-card-text>
            <v-card-actions>
              <v-btn
                text
                color="primary"
                @click="logVisit"
                :disabled="isLogged"
              >
                Log
              </v-btn>
              <v-spacer></v-spacer>

              <v-btn
                text
                color="primary"
                @click="deleteVisit"
                :disabled="isLogged"
              >
                Delete
              </v-btn>
              <v-btn text color="primary" @click="selectedOpen = false">
                Cancel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script>
import { getCurrentMilitaryTime } from '../../utils/luxonHelpers';
import { success, printJson } from '../../utils/colors';

export default {
  name: 'VisitLog',
  props: {
    selectedSpaceName: String,
    avgStay: Number,
  },

  computed: {
    isLogged() {
      const d = this.selectedEvent.details?.logged;
      return d;
    },
  },

  data: () => ({
    visit: {},
    place: '',
    type: 'day',
    snackBar: false,
    feedbackMessage: '',
    focus: '',
    typeToLabel: {
      month: 'Month',
      week: 'Week',
      day: 'Day',
      '4day': '4 Days',
    },
    selectedEvent: {},
    selectedElement: null,
    selectedOpen: false,

    //#region  drag and drop
    dragEvent: null,
    dragStart: null,
    createEvent: null,
    createStart: null,
    extendOriginal: null,
    //#endregion
    names: ['Fika', 'Bimart', 'Mid-Oregon'],
    colors: ['red', 'yellow', 'green'],
    visits: [
      // reenable these elements if you need to start over
      //   {
      //     name: 'Exposure Warning',
      //     start: 1615463100000,
      //     timed: false,
      //     color: 'orange',
      //     details:{logged:true},
      //   },
      //   {
      //     name: 'Fika Sisters',
      //     start: 1615542300000,
      //     timed: true,
      //     color: 'green',
      //     details:{logged:true},
      //   },
    ],
  }),
  methods: {
    logVisit() {
      this.selectedOpen = false;
      this.visit.details = { logged: true };
      this.visit.color = 'primary';
      this.selectedEvent.details = { logged: true };
      this.selectedEvent.color = 'primary';
      console.log(success('Logging visit:', printJson(this.visit)));
      this.saveVisits();
      this.$emit('logVisit', this.visit);
    },

    getLoggedState() {
      console.log(printJson(this.selectedEvent));
      let x = this.isLogged
        ? 'was logged to server'
        : 'is not logged to server yet';
      return x;
    },

    arrayRemove(arr, value) {
      return arr.filter((ele) => {
        return ele != value;
      });
    },

    deleteVisit() {
      this.visits = this.arrayRemove(this.visits, this.selectedEvent);
      this.selectedOpen = false;
    },

    //#region Active Calendar
    changeType(type) {
      this.type = type;
      this.$refs.calendar.scrollToTime(getCurrentMilitaryTime());
    },

    viewDay({ date }) {
      this.focus = date;
      this.type = 'day';
    },
    getEventColor(event) {
      return event.color;
    },
    setToday() {
      this.focus = '';
      this.$refs.calendar.scrollToTime(getCurrentMilitaryTime());
    },
    prev() {
      this.$refs.calendar.prev();
    },
    next() {
      this.$refs.calendar.next();
    },

    showEvent({ nativeEvent, event }) {
      const open = () => {
        this.selectedEvent = event;
        this.selectedElement = nativeEvent.target;
        setTimeout(() => {
          this.selectedOpen = true;
        }, 10);
      };

      if (this.selectedOpen) {
        this.selectedOpen = false;
        setTimeout(open, 10);
      } else {
        open();
      }

      nativeEvent.stopPropagation();
    },

    //#endregion Active Calendar

    //#region  Drag and Drop
    startDrag({ event, timed }) {
      if (event && timed) {
        this.dragEvent = event;
        this.dragTime = null;
        this.extendOriginal = null;
      }
    },
    startTime(tms) {
      const mouse = this.toTime(tms);

      if (this.dragEvent && this.dragTime === null) {
        const start = this.dragEvent.start;

        this.dragTime = mouse - start;
      } else if (this.place) {
        this.createStart = this.roundTime(mouse);
        this.createEvent = {
          name: this.place,
          color: 'secondary',
          start: this.createStart,
          end: this.createStart + this.avgStay,
          timed: true,
          details: { logged: false },
        };
        this.visit = this.createEvent;
        this.visits.push(this.visit);
        this.saveVisits();
        this.place = '';
        this.feedbackMessage = `Click event to log to the server`;
        this.snackBar = true;
        this.selectedOpen = true;
      }
    },
    extendBottom(event) {
      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;
    },
    mouseMove(tms) {
      const mouse = this.toTime(tms);

      if (this.dragEvent && this.dragTime !== null) {
        const start = this.dragEvent.start;
        const end = this.dragEvent.end;
        const duration = end - start;
        const newStartTime = mouse - this.dragTime;
        const newStart = this.roundTime(newStartTime);
        const newEnd = newStart + duration;

        this.dragEvent.start = newStart;
        this.dragEvent.end = newEnd;
      } else if (this.createEvent && this.createStart !== null) {
        const mouseRounded = this.roundTime(mouse, false);
        const min = Math.min(mouseRounded, this.createStart);
        const max = Math.max(mouseRounded, this.createStart);

        this.createEvent.start = min;
        this.createEvent.end = max;
      }
    },
    endDrag() {
      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
    },
    cancelDrag() {
      if (this.createEvent) {
        if (this.extendOriginal) {
          this.createEvent.end = this.extendOriginal;
        } else {
          const i = this.visits.indexOf(this.createEvent);
          if (i !== -1) {
            this.visits.splice(i, 1);
          }
        }
      }

      this.createEvent = null;
      this.createStart = null;
      this.dragTime = null;
      this.dragEvent = null;
    },
    //#endregion Drag and Drop

    roundTime(time, down = true) {
      const roundTo = 15; // minutes
      const roundDownTime = roundTo * 60 * 1000;

      return down
        ? time - (time % roundDownTime)
        : time + (roundDownTime - (time % roundDownTime));
    },
    toTime(tms) {
      return new Date(
        tms.year,
        tms.month - 1,
        tms.day,
        tms.hour,
        tms.minute
      ).getTime();
    },

    rnd(a, b) {
      return Math.floor((b - a + 1) * Math.random()) + a;
    },
    rndElement(arr) {
      return arr[this.rnd(0, arr.length - 1)];
    },

    saveVisits() {
      // do not store blank visits (it will mess up the calendar with a null ref exception)
      this.visits = this.arrayRemove(this.visits, '');

      let visitStr = JSON.stringify(this.visits);
      console.log(visitStr);
      localStorage.setItem('visits', visitStr);
    },
  },

  watch: {},

  mounted() {
    this.place = this.selectedSpaceName;
    const v = localStorage.getItem('visits');
    this.visits = v ? JSON.parse(v) : [];
    console.log(this.visits);
    console.log(getCurrentMilitaryTime());
    this.$refs.calendar.scrollToTime(getCurrentMilitaryTime());
    if (this.place) {
      this.feedbackMessage = `Click a time to visit ${this.place}:`;
      this.snackBar = true;
    }
  },
  destroyed() {
    this.saveVisits();
  },
};
</script>

<style scoped lang="scss">
.v-event-draggable {
  padding-left: 6px;
}

.v-event-timed {
  user-select: none;
  -webkit-user-select: none;
}

.v-event-drag-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 4px;
  cursor: ns-resize;

  &::after {
    display: none;
    position: absolute;
    left: 50%;
    height: 4px;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    width: 16px;
    margin-left: -8px;
    opacity: 0.8;
    content: '';
  }

  &:hover::after {
    display: block;
  }
}
</style>
