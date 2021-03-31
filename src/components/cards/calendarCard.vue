<template>
  <div>
    <v-row class="fill-height">
      <v-col>
        <!-- calendar controls -->
        <v-sheet height="48">
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
            <v-btn
              color="white"
              text
              v-bind="attrs"
              @click="snackBarNew = false"
            >
              Close
            </v-btn>
          </template>
        </v-snackbar>

        <!-- confirmation dialog -->
        <v-snackbar
          v-model="confirm"
          :timeout="30000"
          :color="color"
          dark
          centered
          absolute
        >
          {{ feedbackMessage }}
          <template v-slot:action="{ attrs }">
            <v-btn color="white" text v-bind="attrs" @click="act"> Yes </v-btn>
            <v-btn color="white" text v-bind="attrs" @click="cancel">
              No
            </v-btn>
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
                <span>LOG: Enter key or Left swipe</span><br /><span
                  class="pl-8"
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
    <v-row no-gutters align="center">
      <v-col
        ><div class="pl-15">
          <!-- <small>{{ status }}</small> -->
          {{ status }}
        </div></v-col
      >
    </v-row>
  </div>
</template>

<script>
import {
  showCurrentMilitaryTime,
  formatTime,
  formatSmallTime,
} from '../../utils/luxonHelpers';
import { error, success, highlight, warn, printJson } from '../../utils/colors';

export default {
  name: 'VisitLog',
  props: {
    selectedSpaceName: String,
    avgStay: Number,
  },

  computed: {
    isLogged() {
      return this.selectedCalendarEvent.details?.logged;
    },
    name() {
      return this.selectedCalendarEvent?.name;
    },
  },

  data: () => ({
    fixedStart: 0,
    fixedEnd: 0,
    changed: false,
    calendarElement: null,
    status: 'Ready',
    original: { start: 0, end: 0 },
    path: new Map(),

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
    dragEnd: null,
    pointerType: '',
    //#endregion
  }),
  methods: {
    // called by event slot in calendar
    extendBottom(event) {
      this.path.set('extendBottom', { start: event.start, end: event.end });
      console.log('extendBottom - path:', printJson([...this.path]));

      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;

      this.selectedCalendarEvent = this.createEvent;
    },

    // @click:event="showEvent"
    showEvent({ nativeEvent, event }) {
      this.selectedCalendarEvent = event;
      console.log(nativeEvent.type);
      //formatTime defaults to Date.now()
      this.path.set('showEvent', { start: event.start, end: event.end });
    },

    //#region  Drag and Drop

    // @mousedown:event="startDrag"
    // @touchstart:event="startDrag"
    startDrag({ nativeEvent, event, timed }) {
      this.status = '';
      this.pointerType = nativeEvent.type;
      if (nativeEvent.type === 'touchstart') {
        nativeEvent.preventDefault();
      }
      if (event && timed) {
        this.path.set('startDrag', { mouse: event.start });

        this.dragEvent = event;
        this.dragTime = null;
        this.extendOriginal = null;
        this.original.start = this.dragEvent.start;
        this.original.end = this.dragEvent.end;
        this.selectedCalendarEvent = this.dragEvent;
      }
    },

    // @mousedown:time="startTime"
    // @touchstart:time="startTime"
    // recorded once with the first mouse click or touch
    // can have any arbitrary value (depending only on mouse/finger position)
    startTime(tms) {
      const mouse = this.toTime(tms);
      this.path.set('startTime', { mouse });

      // enable a drag of an existing event
      if (this.dragEvent && this.dragTime === null) {
        // store the start value outside drag and drop so we don't log the wrong times to the server with swipeLeft
        this.fixedStart = this.dragEvent.start;
        this.fixedEnd = this.dragEvent.end;

        this.dragTime = mouse - this.fixedStart;
        console.log(highlight('dragtime', this.dragTime));
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
      // mouse can move all over the calendar...
      const mouse = this.toTime(tms);

      //...but we care only if a dragEvent or createEvent exists
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
        const delta = Math.abs(this.dragEvent.start - newStart);
        this.status = `${delta}`;
        if (delta > 890000) {
          this.status = `${delta} is greater 15 minutes `;

          this.dragEvent.start = newStart;
          this.dragEvent.end = newEnd;
          this.changed = true;

          this.path.set('changed', { changed: true });
        }
        this.path.set('mouseMove', { mouse, delta });
        console.log('mouse', this.path.get('mouseMove').mouse);
      } else if (this.createEvent && this.createStart !== null) {
        // changing the time
        console.log(highlight(`changing the slot's end time`));
        const mouseRounded = this.roundTime(mouse, false);
        const min = Math.min(mouseRounded, this.createStart);
        const max = Math.max(mouseRounded, this.createStart);

        this.createEvent.start = min;
        this.createEvent.end = max;
        this.changed = true;
        this.path.set('changed', { changed: true });
      }
    },

    // @mouseup:time="endDrag"
    // @touchend:time="endDrag"
    // handles updates:
    // this.original stores visit's original interval
    endDrag() {
      // get the end time from:
      //    this.extendOriginal (if the lower edge of the event moved alone)
      //    or this.dragEvent.end (if the whole time slot moved)
      let last = this.extendOriginal
        ? this.extendOriginal
        : this.dragEvent
        ? this.dragEvent.end
        : 0;
      this.path.set('endDrag', { last });

      if (this.changed) {
        this.color = '';
        this.feedbackMessage = 'Ready to update the visit?';
        this.action = 'UPDATE';
        this.confirm = true;
      }

      this.reset();
    },

    reset() {
      console.log(warn('Resetting these variables'));
      this.path.set('reset', true);
      // console.log('reset - path:', printJson([...this.path]));

      this.calendarElement.style.overflowY = 'auto';

      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
      this.changed = false;
    },

    // e.g., leaving calendar component
    cancelDrag() {
      console.log(highlight('cancelDrag '));
      this.path.set('cancelDrag', true);

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

      this.reset();
    },
    //#endregion Drag and Drop

    //#region Non Pointer methods

    goRight() {
      console.log('Going Right...');
      this.feedbackMessage = `Are you sure you want to DELETE ${this.name}`;
      this.action = 'DELETE';
      this.color = 'warning';
      this.confirm = true;
      this.path.set('goRight', true);
    },
    goLeft() {
      if (this.isLogged) {
        this.status = `You have already logged this ${this.name} visit to the server.`;
        return;
      }
      this.selectedCalendarEvent.start = this.fixedStart;
      this.selectedCalendarEvent.end = this.fixedEnd;
      console.log('Going Left...');
      this.feedbackMessage = `Are you sure you want to LOG ${
        this.name
      } from ${formatTime(this.selectedCalendarEvent.start)} to ${formatTime(
        this.selectedCalendarEvent.end
      )} `;
      this.action = 'LOG';
      this.color = 'primary';
      this.confirm = true;
      this.path.set('goLeft', true);
    },

    act() {
      switch (this.action) {
        case 'DELETE':
          this.deleteVisit();
          break;
        case 'LOG':
          if (!this.logged) {
            this.logVisit();
          }
          break;
        case 'UPDATE':
          this.updateTime();
          break;
      }
      if (this.selectedCalendarEvent) {
        this.path.set('act on', this.selectedCalendarEvent.name);
        // console.log('act - path:', printJson([...this.path]));
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
      this.visit.interval = `${formatSmallTime(
        this.createEvent.start
      )} to ${formatSmallTime(this.createEvent.end)}`;
      this.visits.push(this.visit);
      this.saveVisits();
      this.place = '';
    },

    cancel() {
      this.confirm = false;
      // failsafe in case original.start has been reset before now
      if (this.original.start === 0 || this.original.end === 0) {
        console.log(
          error(
            'Somewhere original times got set to 0. No need to process further.'
          )
        );
        return;
      }
      this.selectedCalendarEvent.start = this.original.start;
      this.selectedCalendarEvent.end = this.original.end;
      // cancel the operation means starting over
      this.original.start = 0;
      this.original.end = 0;
      this.reset();
    },

    logVisit() {
      try {
        this.path.set('logVisit', {
          start: this.selectedCalendarEvent.start,
          end: this.selectedCalendarEvent.end,
        });
        this.visit = this.selectedCalendarEvent;
        this.visit.details = { logged: true };
        this.visit.color = 'primary';
        console.log(success('Logging visit:', printJson(this.visit)));
        this.saveVisits();
        this.$emit('logVisit', this.visit);
        this.confirm = false;
        console.log('logVisit - path:', printJson([...this.path]));
      } catch (error) {
        this.$emit('error', error);
      }
    },

    deleteVisit() {
      this.path.set('deleteVisit', {
        start: this.selectedCalendarEvent.start,
        end: this.selectedCalendarEvent.end,
      });
      console.log('deleteVisit - path:', printJson([...this.path]));

      this.$emit('deleteVisit', this.selectedCalendarEvent);
      this.visits = this.arrayRemove(this.visits, this.selectedCalendarEvent);
      this.saveVisits();
      this.confirm = false;
    },

    updateTime() {
      this.confirm = false;
      this.visit = this.selectedCalendarEvent;
      this.visit.interval = `${formatSmallTime(
        this.visit.start
      )} to ${formatSmallTime(this.visit.end)}`;
      this.path.set('updateTime', { interval: this.visit.interval });
      console.log('updateTime - path:', printJson([...this.path]));

      console.log('updated Visit:', printJson(this.visit));
      this.saveVisits();
      this.selectedCalendarEvent = null;

      this.reset();
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
      if (this.visits.filter((v) => v.start === 0).length > 0) {
        console.log(
          error(
            'WARNING: at least one visit has a start time of 0. Abandoning save.'
          )
        );
        return;
      }
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
      this.status = `Confirm (or move) the time to visit ${this.place}:`;
      // this.snackBarNew = true;
    },
    myKeyPress(e) {
      var keynum;

      if (window.event) {
        // IE
        keynum = e.keyCode;
      } else if (e.which) {
        // Netscape/Firefox/Opera
        keynum = e.which;
      }

      alert(String.fromCharCode(keynum));
    },
  },

  watch: {},

  mounted() {
    let self = this;
    self.calendarElement = document.getElementById('calendar-target');

    window.addEventListener('keydown', function (ev) {
      if (ev.code == 'Delete') {
        self.goRight(); // calls confirmation with the Del key
      } else if (ev.code == 'Enter') {
        self.goLeft(); // calls confirmation with the Enter key
      }
    });
    // you lose visibility into this if you move listeners into code
    window.addEventListener('keypress', function (ev) {
      if (ev.code == 'KeyY') {
        if (self.action === 'DELETE') {
          self.deleteVisit(); // calls confirmation with the Del key
        } else if (self.action === 'LOG') {
          self.logVisit(); // calls confirmation with the Del key
        } else if (self.action === 'UPDATE') {
          self.updateTime(); // calls confirmation with the Del key
        }
      } else if (ev.code == 'KeyN') {
        self.cancel();
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
