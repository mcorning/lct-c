<template>
  <v-sheet
    height="600"
    class="overflow-hidden fill-height"
    style="position: relative"
  >
    <!-- <v-container class="fill-height"> -->
    <v-row>
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
          vertical
          multi-line
        >
          {{ feedbackMessage }}
          <template v-slot:action="{ attrs }">
            <v-btn
              dark
              v-bind="attrs"
              color="green"
              @click="act"
              elevation="10"
            >
              Yes (Enter)
            </v-btn>
            <v-btn dark v-bind="attrs" @click="cancel"> No (Esc)</v-btn>
          </template>
        </v-snackbar>

        <!-- calendar -->
        <!-- do not change the calendar sheet's height. if you do, you will lose scrollToTime, and you will lose hours on the calendar -->
        <v-sheet height="500">
          <v-calendar
            id="calendar-target"
            ref="calendar"
            v-model="focus"
            color="primary"
            :type="type"
            :events="visits"
            :event-ripple="false"
            :event-color="getEventColor"
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
              <v-tooltip bottom>
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
    <!-- </v-container> -->
  </v-sheet>
</template>

<script>
import crypto from 'crypto';
const randomId = () => crypto.randomBytes(8).toString('hex');

import Visit from '@/models/Visit';

import {
  getNow,
  showCurrentMilitaryTime,
  formatTime,
  formatSmallTime,
} from '../../utils/luxonHelpers';
import { error, success, highlight, printJson } from '../../utils/colors';

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

    visitCache() {
      return Visit.all();
    },
  },

  data: () => ({
    onCalendar: true,
    visitId: '',
    overlay: true,
    changed: false,
    calendarElement: null,
    status: 'Ready',
    original: { start: 0, end: 0 },

    color: 'primary',
    action: '',
    confirm: false,
    loading: false,
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
    getVisit(id = this.visitId) {
      const x = this.visits
        .slice(0) // create copy of "array" for iterating
        .reduce((a, c, i, arr) => {
          if (c.id === id) arr.splice(1);
          return c;
        }, {});
      return x;
    },

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

    // called by event-color calendar event
    getEventColor(event) {
      const c =
        this.visitId === event.id ? `${event.color} darken-1` : event.color;
      console.log(c);
      return c;
    },

    // called by event slot in calendar
    // @mousedown.stop=
    // @touchstart.stop
    extendBottom(event) {
      this.visitId = event.id;

      this.createEvent = event;
      this.createStart = event.start;
      this.extendOriginal = event.end;
      this.cachedCalendarEvent = this.createEvent;
      this.original.start = event.start;
      this.original.end = event.end;

      // extenstion stops in endDrag(), and that's where we set changed
      this.changed = false;
    },

    // @click:event="showEvent"
    showEvent({ nativeEvent, event }) {
      const { name, start, id } = event;
      this.status = `Selected: ${name} at ${formatTime(start)} [id: ${id}]`;

      // // shallow clone so reset() does not effect visit indirectly

      this.visitId = event.id;
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
        this.visitId = event.id;

        this.dragEvent = event;
        this.dragTime = null;
        this.extendOriginal = null;
        this.original.start = this.dragEvent.start;
        this.original.end = this.dragEvent.end;
        this.cachedCalendarEvent = this.dragEvent;
      }
    },

    // @mousedown:time="startTime"
    // @touchstart:time="startTime"
    // recorded once with the first mouse click or touch
    // can have any arbitrary value (depending only on mouse/finger position)
    startTime(tms) {
      const mouse = this.toTime(tms);

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
        this.visitId = this.dragEvent.id;
        const start = this.dragEvent.start;
        const end = this.dragEvent.end;
        const duration = end - start;
        const newStartTime = mouse - this.dragTime;
        const newStart = this.roundTime(newStartTime);
        const newEnd = newStart + duration;
        const delta = Math.abs(this.dragEvent.start - newStart);

        // update event in 15 minute increments
        if (delta > 890000) {
          this.dragEvent.start = newStart;
          this.dragEvent.end = newEnd;
          this.dragEvent.interval = this.getInterval(
            this.dragEvent.start,
            this.dragEvent.end
          );
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

        this.visitId = this.createEvent.id;
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
        console.log(this.visitId);
        console.log('original:');
        console.log(
          this.original.start,
          formatTime(this.original.start),
          this.original.end,
          formatTime(this.original.end)
        );

        if (this.dragEvent) {
          console.log('dragEvent:');
          console.log(
            this.dragEvent.start,
            formatTime(this.dragEvent.start),
            this.dragEvent.end,
            formatTime(this.dragEvent.end)
          );
          this.dragEvent.oldStart = this.original.start;
          this.dragEvent.oldEnd = this.original.end;
          this.dragEvent.id;
        }

        if (this.createEvent) {
          console.log('createEvent:');
          console.log(
            this.createEvent.start,
            formatTime(this.createEvent.start),
            this.createEvent.end,
            formatTime(this.createEvent.end)
          );
          this.createEvent.oldStart = this.original.start;
          this.createEvent.oldEnd = this.original.end;
          this.visitId = this.createEvent.id;
        }
        this.confirmUpdate(this.dragEvent || this.createEvent);
        return;
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
          this.removeVisit(this.createEvent);
        }
      }

      this.reset();
    },

    removeVisit(event) {
      const i = this.visits.indexOf(event);
      if (i !== -1) {
        this.visits.splice(i, 1);
      }
    },
    //#endregion Drag and Drop

    //#region Non Pointer methods

    goRight() {
      console.log('Going Right...');
      const visit = this.getVisit();
      this.feedbackMessage = `Are you sure you want to DELETE ${visit.name}`;
      this.action = 'DELETE';
      this.color = 'warning';
      this.confirm = true;
    },

    goLeft() {
      console.log('Going Left...');
      const visit = this.getVisit();

      this.status = visit.logged
        ? `Updating a previously logged ${visit.name} visit on the server.`
        : 'Logging visit on the server...';

      this.feedbackMessage = `Are you sure you want to LOG ${
        visit.name
      } from ${formatTime(visit.start)} to ${formatTime(visit.end)} `;
      this.action = 'LOG';
      this.color = 'primary';
      this.confirm = true;
    },

    act() {
      this.reset();
      switch (this.action) {
        case 'DELETE':
          this.deleteVisit();
          break;
        case 'LOG':
          this.logVisit();
          break;
        case 'UPDATE':
          this.updateLoggedVisit();
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

    arrayRemove(arr, value, prop = 'id') {
      // console.log(value);
      return arr.filter((ele) => {
        // console.log(ele[prop]);
        return ele[prop] != value;
      });
    },

    getInterval(start, end) {
      return `${formatSmallTime(start)} - ${formatSmallTime(end)}`;
    },

    // TODO Test this before using it (duh)
    purge() {
      Visit.delete((visit) => {
        return visit.start < 1617815700000;
      });
    },

    addEvent(time) {
      this.visitId = randomId();
      this.createStart = this.roundTime(time);
      this.createEvent = {
        id: this.visitId,
        name: this.place,
        start: this.createStart,
        end: this.createStart + this.avgStay,
        interval: this.getInterval(
          this.createStart,
          this.createStart + this.avgStay
        ),
        timed: true,
        marked: getNow(),
        color: 'secondary',
        logged: '', // this will contain the internal id of the relationship in redisGraph
      };
      // this.visits.push(this.createEvent);

      // let z = this.visits.length;

      Visit.updatePromise(this.createEvent)
        .then((p) => {
          console.log('Added visit to cache', printJson(p));
        })
        .catch((e) => {
          console.log(error(e));
        });

      this.place = '';
    },

    deleteVisit() {
      this.confirm = false;
      const visit = this.getVisit();
      const id = visit.id;
      const self = this;
      this.action = '';

      Visit.deletePromise(id)
        .then(() => {
          self.confirm = false;
          let visits = self.visits;
          self.visits = self.arrayRemove(visits, id);

          console.log(success(`Visit ${id} deleted.`));
          self.status = `DELETED: ${visit.name} ${visit.interval} id: ${visit.id}`;
          console.log(`New Visit ct: ${self.visits.length} `);

          self.$emit('deleteVisit', visit);
        })
        .catch((e) => {
          this.status =
            'Oops. We had trouble logging to server. Notified devs. Sorry.';
          this.$emit('error', e);
        });
    },

    logVisit() {
      this.action = '';

      try {
        let visit = this.getVisit();
        // const logType=visit.logged?'':''
        if (visit.logged) {
          this.status = 'You already logged this event to the server';
          return;
        }

        console.log(
          success('CalendarCard.js: Logging visit:', printJson(visit))
        );
        this.saveVisit(visit);

        // when App.vue sees the callback it will call the Visit entity to update the logged field to the internal ID of the relationship node and the color to primary
        this.$emit('logVisit', visit);
        this.confirm = false;
        this.status = 'Logged to server. Stay safe out there.';
      } catch (error) {
        this.status =
          'Oops. We had trouble logging to server. Devs notified. Sorry.';
        this.$emit('error', error);
      }
    },

    confirmUpdate(visit) {
      console.assert(error('wrong visit'), (visit = this.getVisit()));

      this.feedbackMessage = `Are you sure you want to UPDATE a logged visit to ${this.getInterval(
        visit.start,
        visit.end
      )}?`;
      this.action = 'UPDATE';
      this.color = 'warning';
      this.confirm = true;
    },

    updateLoggedVisit() {
      this.action = '';

      try {
        // visit was updated in endDrag() and called from there
        let visit = this.getVisit();

        console.log(
          success('CalendarCard.js: Updating logged visit:', printJson(visit))
        );
        this.saveVisit(visit);
        this.$emit('updateLoggedVisit', visit);
        this.confirm = false;
        this.status = 'Updated server. Stay safe out there.';
      } catch (error) {
        this.status =
          'Oops. We had trouble updating server. Devs notified. Sorry.';
        this.$emit('error', error);
      }
    },

    cancel() {
      this.confirm = false;
      this.reset();
    },

    saveVisit(visit = this.getVisit()) {
      this.confirm = false;
      console.log(printJson(visit));
      Visit.updatePromise(visit).then(() => {
        console.log(success(`New Visit:`, printJson(visit)));
      });

      this.status = `SAVED: ${visit.name} ${visit.interval} id: ${visit.id}`;
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
    },

    handleKeydown(ev) {
      console.log(highlight('key/action'), ev.code, this.action);
      switch (ev.code) {
        case 'Delete':
          this.goRight(); // calls confirmation with the Del key
          break;

        case 'KeyY':
        case 'Enter':
          switch (this.action) {
            case 'DELETE':
              this.deleteVisit(); // calls confirmation with the Del key
              break;

            case 'LOG':
              this.logVisit(); // calls confirmation with the Enter key
              break;

            default:
              this.goLeft(); // brings up the log confirmation dialog
              break;
          }
          break;

        case 'KeyN':
        case 'Escape':
          this.cancel(); // calls confirmation with the Escape key
          break;
      }
    },
  },

  watch: {
    // example of a nested watcher:
    // 'createEvent.start': function (newValue, oldValue) {
    //   console.log('createEvent.start n/o:', newValue, oldValue);
    // },
    // 'dragEvent.start': function (newValue, oldValue) {
    //   console.log('dragEvent.start n/o:', newValue, oldValue);
    // },
    visitCache(newVal) {
      console.log(highlight('visitCache changed'));
      this.visits = newVal;
      console.log(
        'visits',
        this.visits.length,
        'cache',
        this.visitCache.length
      );
    },
  },

  created() {},

  mounted() {
    const self = this;

    Visit.$fetch().then(() => {
      self.loading = false;
      self.visits = self.visitCache;

      self.calendarElement = document.getElementById('calendar-target');

      self.place = self.selectedSpaceName;
      self.$refs.calendar.scrollToTime(showCurrentMilitaryTime());
      if (self.place) {
        self.newEvent();
      }
    });

    // these are window event listeners
    // so we need to restrict them to the calendarCard
    window.addEventListener('keydown', this.handleKeydown);

    console.log('mounted calendarCard');
  },

  destroyed() {
    window.removeEventListener('keydown', this.handleKeydown);
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
