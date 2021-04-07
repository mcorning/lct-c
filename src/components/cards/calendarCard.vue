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
          <br />
          <small>Enter for Yes. Esc for No.</small>
          <template v-slot:action="{ attrs }">
            <v-btn
              dark
              v-bind="attrs"
              color="green"
              @click="act"
              elevation="10"
            >
              Yes
            </v-btn>
            <v-btn dark v-bind="attrs" @click="cancel"> No </v-btn>
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
            :event-color="darkenSelectedEvent"
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
      <v-col cols="auto"
        ><div class="pl-15">
          {{ status }}
        </div></v-col
      >
      <v-spacer></v-spacer>
      <v-col class="text-right mr-5"
        ><v-btn v-if="changed" @click="undo"
          ><v-icon>mdi-undo</v-icon>Undo</v-btn
        ></v-col
      >
    </v-row>
  </div>
</template>

<script>
// import crypto from 'crypto';
// const randomId = () => crypto.randomBytes(8).toString('hex');

import Visit from '@/models/Visit';

import {
  getNow,
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
    updateFeedbackMessage() {
      return `Ready to revert your last editto ${this.getInterval(
        this.original.start,
        this.original.end
      )}?`;
    },

    eventLogged() {
      return this.visit.logged;
    },

    name() {
      return this.visit.name;
    },

    visited: {
      get() {
        const all = Visit.all();
        return all;
      },
      set(visit) {
        // static update function on Message model
        Visit.updatePromise(visit)
          .then((p) => {
            // p is an array of Visit entries. we only care about the first
            const id = p[0].id;
            console.log(success(`Visit saved with id ${id}`));
            this.visit.id = id;
            this.visits = Visit.all();
          })
          .catch((e) => console.log(error(e)));
      },
    },
  },

  data: () => ({
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

    cachedCalendarEvent: {},
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
    undo() {
      this.action = 'REVERT';
      this.feedbackMessage = this.updateFeedbackMessage;
      this.color = '';
      this.confirm = true;
      this.status = `Original interval ${this.getInterval(
        this.original.start,
        this.original.end
      )}`;
      this.changed = false;
    },

    darkenSelectedEvent(event) {
      const defaultColor = event.logged ? 'primary' : 'secondary';
      this.original.start = event.start;
      this.original.end = event.end;
      return event.id == this.visit.id
        ? `${defaultColor} darken-1`
        : defaultColor;
    },

    // called by event slot in calendar
    // @mousedown.stop=
    // @touchstart.stop
    // extenstion stops in endDrag()
    extendBottom(event) {
      this.changed = false;

      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;
      this.cachedCalendarEvent = this.createEvent;
      this.original.starT = event.start;
      this.original.end = event.end;

      this.visit = this.createEvent;
    },

    // @click:event="showEvent"
    showEvent({ nativeEvent, event }) {
      const { name, start, id } = event;
      this.status = `Selected: ${name} at ${formatTime(start)} [id: ${id}]`;

      // // shallow clone so reset() does not effect visit indirectly
      this.visit = { ...event };
      console.log(nativeEvent.type);
    },

    //#region  Drag and Drop

    // @mousedown:event="startDrag"
    // @touchstart:event="startDrag"
    startDrag({ nativeEvent, event, timed }) {
      this.status = '';
      this.changed = false;

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
        this.cachedCalendarEvent = this.dragEvent;
        this.visit = this.dragEvent;
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
        this.original.start = this.dragEvent.start;
        this.original.end = this.dragEvent.end;

        this.dragTime = mouse - this.original.start;
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

      // change the whole interval by dragging
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

        // update event in 15 minute increments
        if (delta > 890000) {
          this.dragEvent.start = newStart;
          this.dragEvent.end = newEnd;
          this.dragEvent.interval = this.getInterval(
            this.dragEvent.start,
            this.dragEvent.end
          );
          this.visit = { ...this.dragEvent };
          this.feedbackMessage = this.updateFeedbackMessage;
          this.changed = true;
        }
      }
      // change the (start and) end time on the lower edge of the event
      else if (this.createEvent && this.createStart !== null) {
        console.log(highlight(`changing the slot's end time`));
        const mouseRounded = this.roundTime(mouse, false);
        const min = Math.min(mouseRounded, this.createStart);
        const max = Math.max(mouseRounded, this.createStart);

        this.createEvent.start = min;
        this.createEvent.end = max;
        this.createEvent.interval = this.getInterval(
          this.createEvent.start,
          this.createEvent.end
        );
        this.feedbackMessage = this.updateFeedbackMessage;

        this.changed = true;
      }
    },

    // @mouseup:time="endDrag"
    // @touchend:time="endDrag"
    // handles updates:
    // this.original stores visit's original interval
    // called by drag or extendBottom
    endDrag() {
      if (this.changed) {
        this.saveVisit();
      }

      this.reset();
    },

    reset() {
      this.calendarElement.style.overflowY = 'auto';

      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
    },

    // e.g., leaving event movement (e.g., to respond to confirmation dialog)
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
      console.log('Going Left...');

      if (this.eventLogged) {
        this.status = `You have already logged this ${this.name} visit to the server.`;
        return;
      }
      this.status = 'Logging visit on the server...';
      this.visit.start = this.original.start;
      this.visit.end = this.original.end;
      this.feedbackMessage = `Are you sure you want to LOG ${
        this.name
      } from ${formatTime(this.visit.start)} to ${formatTime(this.visit.end)} `;
      this.action = 'LOG';
      this.color = 'primary';
      this.confirm = true;
      this.path.set('goLeft', true);
    },

    act() {
      this.reset();
      switch (this.action) {
        case 'DELETE':
          this.deleteVisit();
          break;
        case 'LOG':
          if (!this.eventLogged) {
            this.logVisit();
          }
          break;
        case 'UPDATE':
          this.saveVisit();
          break;
        case 'REVERT':
          this.revert();
          break;
      }
    },

    revert() {
      this.cachedCalendarEvent.start = this.original.start;
      this.cachedCalendarEvent.end = this.original.end;
      this.confirm = false;
      this.saveVisit();
    },

    arrayRemove(arr, value) {
      return arr.filter((ele) => {
        return ele != value;
      });
    },

    getInterval(start, end) {
      return `${formatSmallTime(start)} - ${formatSmallTime(end)}`;
    },

    addEvent(time) {
      this.createStart = this.roundTime(time);
      this.createEvent = {
        name: this.place,
        start: this.createStart,
        end: this.createStart + this.avgStay,
        interval: this.getInterval(
          this.createStart,
          this.createStart + this.avgStay
        ),
        timed: true,
        marked: getNow(),
        logged: '',
        color: this.getEventPrimaryColor(false),
      };
      this.visit = { ...this.createEvent };
      this.visits.push(this.visit);
      this.saveVisit();
      this.place = '';
    },

    cancel() {
      this.confirm = false;
      this.visit = this.cachedCalendarEvent;
      this.reset();
    },

    saveVisit() {
      this.confirm = false;
      if (!(this.visit?.start && this.visit?.end)) {
        console.log(warn('Nothing to save'));
        return;
      }

      // update IndexedDB
      const newVisit = {
        id: this.visit.id,
        marked: this.visit.marked,
        name: this.visit.name,
        start: this.visit.start,
        end: this.visit.end,
        interval: this.visit.interval,
        logged: this.visit.logged,
        color: this.getEventPrimaryColor(this.visit.logged),
      };
      this.visited = newVisit;
    },

    logVisit() {
      try {
        this.visit.logged - getNow();
        this.visit.color = this.getEventPrimaryColor(true);
        console.log(success('Logging visit:', printJson(this.visit)));
        this.saveVisit();
        this.$emit('logVisit', this.visit);
        this.confirm = false;
        this.status = 'Logged to server. Stay safe out there.';
        console.log('logVisit - path:', printJson([...this.path]));
      } catch (error) {
        this.status =
          'Oops. We had trouble logging to server. Notified devs. Sorry.';
        this.$emit('error', error);
      }
    },

    deleteVisit() {
      this.$emit('deleteVisit', this.visit);
      // this.visits = this.arrayRemove(this.visits, this.selectedCalendarEvent);
      this.saveVisit();
      this.confirm = false;
      const id = this.visit.id;
      Visit.deletePromise(id)
        .then(() => {
          this.$emit('deleteVisit', this.visit);
          console.log(success(`Visit ${id} deleted.`));
          this.confirm = false;
          this.visits = this.visited;
        })
        .catch((e) => {
          this.status =
            'Oops. We had trouble logging to server. Notified devs. Sorry.';
          this.$emit('error', e);
        });
    },

    changeType(type) {
      this.type = type;
      this.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
    },

    viewDay({ date }) {
      this.focus = date;
      this.type = 'day';
    },
    getEventPrimaryColor(event) {
      return event ? 'primary' : 'secondary';
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

  watch: {
    // example of a nested watcher:
    // 'visit.logged': function (newValue, oldValue) {
    //   console.log(error(newValue, oldValue));
    // },
  },

  created() {
    Visit.$fetch().then(() => {
      this.visits = this.visited;
    });
  },

  mounted() {
    let self = this;
    self.calendarElement = document.getElementById('calendar-target');

    window.addEventListener('keydown', function (ev) {
      if (ev.code == 'Delete') {
        self.goRight(); // calls confirmation with the Del key
      } else if (ev.code == 'Tab') {
        self.goLeft(); // calls confirmation with the Enter key
      }
    });
    // you lose visibility into this if you move listeners into code
    window.addEventListener('keypress', function (ev) {
      if (ev.code == 'KeyY' || ev.code == 'Enter') {
        if (self.action === 'DELETE') {
          self.deleteVisit(); // calls confirmation with the Del key
        } else if (self.action === 'LOG') {
          self.logVisit(); // calls confirmation with the Tab key
        } else if (self.action === 'UPDATE') {
          self.saveVisit();
        }
      } else if (ev.code == 'KeyN') {
        self.cancel();
      }
    });

    self.place = self.selectedSpaceName;
    self.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
    if (self.place) {
      self.newEvent();
    }
    self.loading = false;
    // console.log('mounted calendarCard');
  },

  destroyed() {
    this.saveVisit();
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
