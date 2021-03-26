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
      <v-snackbar
        v-model="snackBarNew"
        :timeout="10000"
        color="primary"
        absolute
        dark
        bottom
      >
        {{ feedbackMessage }}
        <template v-slot:action="{ attrs }">
          <v-btn color="white" text v-bind="attrs" @click="snackBarNew = false">
            Close
          </v-btn>
        </template>
      </v-snackbar>

      <!-- Log, Delete, Cancel form -->
      <v-snackbar
        v-model="snackBar"
        :timeout="10000"
        top
        light
        vertical
        max-width="350"
      >
        <v-card-text>
          <v-row no-gutters>
            <v-col cols="12"
              >Visit to {{ visit.name }}
              <p>{{ getLoggedState() }}:</p></v-col
            >
          </v-row>
          <v-row no-gutters>
            <v-col cols="12">Swipe LEFT to LOG VISIT</v-col>
            <v-col class="text-right">Swipe RIGHT (or Del) to DELETE</v-col>
          </v-row>
        </v-card-text>
        <template v-slot:action="{ attrs }">
          <v-btn text v-bind="attrs" @click="snackBar = false"> Close </v-btn>
        </template>
      </v-snackbar>

      <!-- calendar -->
      <!-- do not change the calendar sheet's height. if you do, you will lose scrollToTime, and you will lose hours on the calendar -->
      <v-sheet height="400">
        <v-calendar
          id="calendar-target"
          ref="calendar"
          v-model="focus"
          color="primary"
          :type="type"
          :events="visits"
          :event-ripple="false"
          @mousedown:event="startDrag"
          @touchstart:event="startDrag"
          @mousedown:time="startTime"
          @touchstart:time="startTime"
          @mousemove:time="mouseMove"
          @touchmove:time="mouseMove"
          @mouseup:time="endDrag"
          @touchend:time="endDrag"
          @mouseleave.native="cancelDrag"
          @click:event="showEvent"
          @click:more="viewDay"
          @click:date="viewDay"
          v-touch="{
            left: () => swipe('Left'),
            right: () => swipe('Right'),
          }"
        >
          <template v-slot:event="{ event, timed, eventSummary }">
            <div class="v-event-draggable" v-html="eventSummary()"></div>
            <div
              v-if="timed"
              class="v-event-drag-bottom"
              @mousedown.stop="extendBottom(event)"
              @touchstart.stop="extendBottom(event)"
            ></div>
          </template>
        </v-calendar>
        <!--   <v-menu
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
              <v-btn text color="primary" @click="logVisit"> Log </v-btn>
              <v-spacer></v-spacer>

              <v-btn text color="primary" @click="deleteVisit"> Delete </v-btn>
              <v-btn text color="primary" @click="selectedOpen = false">
                Cancel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu> -->
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script>
import { getCurrentMilitaryTime } from '../../utils/luxonHelpers';
import { success, highlight, warn, printJson } from '../../utils/colors';

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
    swipeDirection: 'None',
    visit: {},
    visits: [],
    place: '',
    type: 'day',
    snackBar: false,
    snackBarNew: false,
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
    pointerType: '',
    //#endregion
  }),
  methods: {
    //#region Non Pointer methods
    onScroll(e) {
      console.log(e.target.scrollTop);
    },

    swipe(direction) {
      this.swipeDirection = direction;
      if (direction == 'Left') {
        this.logVisit();
      } else if (direction == 'Right') {
        this.deleteVisit(true);
      }
    },

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

    deleteVisit(swiped) {
      if (
        event.code == 'Delete' ||
        (swiped &&
          confirm(`Sure you want to DELETE visit to ${this.visit.name}?`))
      ) {
        this.$emit('deleteVisit', this.visit);
        this.visits = this.arrayRemove(this.visits, this.visit);
        this.saveVisits();
        this.selectedOpen = false;
      }
    },

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
    //#endregion

    showEvent({ nativeEvent, event }) {
      const open = () => {
        // this.feedbackMessage = `Swipe LEFT to LOG VISIT     Swipe RIGHT to DELETE`;
        this.selectedEvent = event;
        this.selectedElement = nativeEvent.target;
        setTimeout(() => {
          // this.selectedOpen = true;
          this.snackBar = true;
        }, 10);
      };

      if (this.snackBar) {
        // this.selectedOpen = false;
        this.snackBar = false;
        setTimeout(open, 10);
      } else {
        open();
      }

      nativeEvent.stopPropagation();
    },

    //#region  Drag and Drop
    // mouse and touch activate
    startDrag({ nativeEvent, event, timed }) {
      this.pointerType = nativeEvent.type;
      console.log(highlight('startDrag', nativeEvent.type));
      if (nativeEvent.type === 'touchstart') {
        nativeEvent.preventDefault();
      }
      this.visit = event;
      if (event && timed) {
        this.dragEvent = event;
        this.dragTime = null;
        this.extendOriginal = null;
      }
    },

    startTime(tms) {
      console.log(highlight('startTime using ', this.pointerType));

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
        // this.feedbackMessage = `Swipe LEFT to LOG VISIT     Swipe RIGHT to DELETE`;
        this.snackBar = true;
        // this.selectedOpen = true;
      }
    },
    extendBottom(event) {
      console.log(highlight('extendBottom using', this.pointerType));

      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;
    },

    mouseMove(tms) {
      console.log(highlight('mouseMove using', this.pointerType));
      const mouse = this.toTime(tms);

      if (this.dragEvent && this.dragTime !== null) {
        console.log(
          highlight('changing the time slot using', this.pointerType)
        );

        const start = this.dragEvent.start;
        const end = this.dragEvent.end;
        const duration = end - start;
        const newStartTime = mouse - this.dragTime;
        const newStart = this.roundTime(newStartTime);
        const newEnd = newStart + duration;

        this.dragEvent.start = newStart;
        this.dragEvent.end = newEnd;
      } else if (this.createEvent && this.createStart !== null) {
        // changing the time
        console.log(highlight(`changing the slot's end time`));
        const mouseRounded = this.roundTime(mouse, false);
        const min = Math.min(mouseRounded, this.createStart);
        const max = Math.max(mouseRounded, this.createStart);

        this.createEvent.start = min;
        this.createEvent.end = max;
      }
    },
    endDrag() {
      console.log(highlight('endDrag using', this.pointerType));

      let el = document.getElementById('calendar-target');
      console.log(highlight(el.style.overflowY));

      el.style.overflowY = 'auto';
      console.log(highlight(el.style.overflowY));

      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
    },
    cancelDrag() {
      console.log(highlight('cancelDrag using', this.pointerType));

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

    saveVisits() {
      // do not store blank visits (it will mess up the calendar with a null ref exception)
      this.visits = this.arrayRemove(this.visits, '');

      let visitStr = JSON.stringify(this.visits);
      console.log(visitStr);
      localStorage.setItem('visits', visitStr);
    },
  },

  watch: {
    createStart(newVal, oldVal) {
      console.log(
        warn(
          'createStart new:',
          newVal,
          ' / old: ',
          oldVal,
          ' using',
          this.pointerType
        )
      );
    },
  },

  mounted() {
    let self = this;

    window.addEventListener('keydown', function (ev) {
      if (ev.code == 'Delete') {
        self.deleteVisit(); // called with the Del key
      }
    });
    this.place = this.selectedSpaceName;
    const v = localStorage.getItem('visits');
    this.visits = v ? JSON.parse(v) : [];
    console.log(this.visits);
    console.log(getCurrentMilitaryTime());
    this.$refs.calendar.scrollToTime(getCurrentMilitaryTime());
    if (this.place) {
      this.feedbackMessage = `Click a time to visit ${this.place}:`;
      this.snackBarNew = true;
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

  #calendar-target {
    touch-action: none;
    overflow-y: hidden;
  }
}
</style>
