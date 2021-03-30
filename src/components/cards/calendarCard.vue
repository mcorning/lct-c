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

      <!-- confirmation dialog -->
      <v-snackbar
        v-model="confirm"
        :timeout="10000"
        :color="color"
        dark
        centered
      >
        {{ feedbackMessage }}
        <template v-slot:action="{ attrs }">
          <v-btn color="white" text v-bind="attrs" @click="act"> Yes </v-btn>
          <v-btn color="white" text v-bind="attrs" @click="cancel"> No </v-btn>
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
          @mouseleave.native="cancelDrag"
          @click:event="showEvent"
          @click:more="viewDay"
          @mouseup:time="endDrag"
          @touchend:time="endDrag"
          @click:date="viewDay"
          v-touch="{
            left: goLeft,
            right: goRight,
          }"
        >
          <template v-slot:event="{ event, timed, eventSummary }">
            <v-tooltip top>
              <template v-slot:activator="{ on, attrs }">
                <div
                  v-bind="attrs"
                  v-on="on"
                  class="v-event-draggable"
                  v-html="eventSummary()"
                ></div>
              </template>
              <span>LOG: Enter key or Left swipe</span><br /><span class="pl-8"
                >DELETE: Del key or Right swipe
              </span></v-tooltip
            >
            <v-tooltip top>
              <template v-slot:activator="{ on, attrs }">
                <div
                  v-if="timed"
                  v-bind="attrs"
                  v-on="on"
                  class="v-event-drag-bottom"
                  @mousedown.stop="extendBottom(event)"
                  @touchstart.stop="extendBottom(event)"
                ></div>
              </template>
              <span>Drag and drop event as necessary </span></v-tooltip
            >
          </template>
        </v-calendar>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script>
import { showCurrentMilitaryTime, formatTime } from '../../utils/luxonHelpers';
import { error, success, highlight, printJson } from '../../utils/colors';

export default {
  name: 'VisitLog',
  props: {
    selectedSpaceName: String,
    avgStay: Number,
  },

  computed: {
    isLogged() {
      const d = this.selectedCalendarEvent.details?.logged;
      return d;
    },
  },

  data: () => ({
    original: { start: 0, end: 0 },
    delta: { start: 0, end: 0 },
    color: 'primary',
    action: '',
    confirm: false,
    loading: true,
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
    selectedCalendarEvent: {},
    selectedElement: null,

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
    // called by event slot in calendar
    extendBottom(event) {
      console.log(highlight('extendBottom using', this.pointerType));

      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;

      this.selectedCalendarEvent = this.createEvent;
    },

    // @click:event="showEvent"
    showEvent({ nativeEvent, event }) {
      console.log('Calendar event:', event.name, nativeEvent.name);
      this.selectedCalendarEvent = event;
    },

    cancel() {
      this.confirm = false;
      this.selectedCalendarEvent.start = this.original.start;
      this.selectedCalendarEvent.end = this.original.end;
      this.reset();
    },

    //#region  Drag and Drop

    // @mousedown:event="startDrag"
    // @touchstart:event="startDrag"
    startDrag({ nativeEvent, event, timed }) {
      this.pointerType = nativeEvent.type;
      console.log(highlight('startDrag', nativeEvent.type));
      if (nativeEvent.type === 'touchstart') {
        nativeEvent.preventDefault();
      }
      if (event && timed) {
        this.dragEvent = event;
        this.dragTime = null;
        this.extendOriginal = null;
        const started = this.dragEvent.start;
        const ended = this.dragEvent.end;
        this.original.start = started;
        this.original.end = ended;
        this.selectedCalendarEvent = this.dragEvent;
      }
    },

    // @mousedown:time="startTime"
    // @touchstart:time="startTime"
    startTime(tms) {
      console.log(highlight('startTime using ', this.pointerType));

      const mouse = this.toTime(tms);

      // enable a drag of an existing event
      if (this.dragEvent && this.dragTime === null) {
        const start = this.dragEvent.start;

        this.dragTime = mouse - start;
      }
      // new event specified by this.place
      else if (this.place) {
        this.addEvent(mouse);
        // this.snackBar = true;
      }
    },

    // @mousemove:time="mouseMove"
    // @touchmove:time="mouseMove"
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

    // @mouseup:time="endDrag"
    // @touchend:time="endDrag"
    // handles updates:
    // this.original stores visit's original interval
    endDrag() {
      console.log(`this.visit ${this.original.start} ${this.original.end} `);
      //this.selectedCalendarEvent should always have a value whether from
      //  each time this.createEvent instantiates (changes)
      //  or this.dragEvent instantiates (changes)
      //  or when an event is clicked with the mouse
      if (this.selectedCalendarEvent.start) {
        console.log(highlight('endDrag using', this.pointerType));

        this.color = 'secondary';
        this.feedbackMessage = 'Ready to update the visit?';
        this.action = 'UPDATE';
        this.confirm = true;
      }
      this.reset();
    },

    updateTime() {
      this.visit = this.selectedCalendarEvent;
      this.confirm = false;
      this.visit.interval = `${formatTime(this.visit.start)} to ${formatTime(
        this.visit.end
      )}`;
      this.saveVisits();
      this.reset();
    },

    reset() {
      let el = document.getElementById('calendar-target');
      el.style.overflowY = 'auto';

      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
      this.selectedCalendarEvent = null;
    },

    // e.g., leaving calendar component
    // or canceling in the confirmation dialog
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

    //#region Non Pointer methods

    goRight() {
      console.log('Going Right...');
      this.feedbackMessage = `Are you sure you want to DELETE ${this.visit.name}`;
      this.action = 'DELETE';
      this.color = 'warning';
      this.confirm = true;
    },
    goLeft() {
      console.log('Going Left...');
      this.feedbackMessage = `Are you sure you want to LOG ${this.visit.name}`;
      this.action = 'LOG';
      this.color = 'primary';
      this.confirm = true;
    },

    act() {
      switch (this.action) {
        case 'DELETE':
          this.deleteVisit();
          break;
        case 'LOG':
          this.logVisit();
          break;
        case 'UPDATE':
          this.updateTime();
          break;
      }
    },

    arrayRemove(arr, value) {
      return arr.filter((ele) => {
        return ele != value;
      });
    },

    addEvent(time) {
      this.createStart = this.roundTime(time);
      this.createEvent = {
        name: this.place,
        color: 'secondary',
        start: this.createStart,
        end: this.createStart + this.avgStay,
        timed: true,
        details: { logged: false },
      };
      this.visit = this.createEvent;
      this.visit.interval = `${formatTime(
        this.createEvent.start
      )} to ${formatTime(this.createEvent.end)}`;
      this.visits.push(this.visit);
      this.saveVisits();
      this.place = '';
    },

    logVisit() {
      if (this.visit.details.logged) {
        return;
      }
      this.visit.details = { logged: true };
      this.visit.color = 'primary';
      console.log(success('Logging visit:', printJson(this.visit)));
      this.saveVisits();
      this.$emit('logVisit', this.visit);
      this.confirm = false;
    },

    deleteVisit() {
      {
        this.$emit('deleteVisit', this.selectedCalendarEvent);
        this.visits = this.arrayRemove(this.visits, this.selectedCalendarEvent);
        this.saveVisits();
        this.confirm = false;
      }
    },

    changeType(type) {
      this.type = type;
      this.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
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
      this.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
    },
    prev() {
      this.$refs.calendar.prev();
    },
    next() {
      this.$refs.calendar.next();
    },
    //#endregion

    saveVisits() {
      // do not store blank visits (it will mess up the calendar with a null ref exception)
      this.visits = this.arrayRemove(this.visits, '');

      let visitStr = JSON.stringify(this.visits);
      localStorage.setItem('visits', visitStr);
    },

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

    newEvent() {
      this.addEvent(Date.now());
      this.endDrag();
      this.feedbackMessage = `Confirm (or move) the time to visit ${this.place}:`;
      this.snackBarNew = true;
    },
  },

  watch: {
    dragEvent(newVal, oldVal) {
      if (newVal === null) {
        console.log(error('NULL'));
      }
      console.log('this.dragEvent', newVal, oldVal);
    },
  },

  mounted() {
    let self = this;

    window.addEventListener('keydown', function (ev) {
      if (ev.code == 'Delete') {
        self.goRight(); // calls confirmation with the Del key
      } else if (ev.code == 'Enter') {
        self.goLeft(); // calls confirmation with the Enter key
      }
    });
    self.place = self.selectedSpaceName;
    const v = localStorage.getItem('visits');
    self.visits = v ? JSON.parse(v) : [];
    console.log('Visits:', printJson(self.visits));
    console.log('at:', showCurrentMilitaryTime());
    self.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
    if (self.place) {
      self.newEvent();
    }
    self.loading = false;
    console.log('mounted calendarCard');
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
