<template>
  <v-sheet class="overflow-auto fill-height" :height="sheetHeight">
    <v-row id="calendarRow" align="start">
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

        <!-- calendar -->
        <!-- in case we need it...
              @mouseleave.native="cancelDrag" -->

        <v-sheet :height="calendarHeight">
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
            @click:event="showEvent"
            @click:more="viewDay"
            @mouseup:time="endDrag"
            @touchend:time="endDrag"
            @click:date="viewDay"
            @mouseleave.native="cancelDrag"
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
                <span>LOG: Tab key or Left swipe</span><br /><span class="pl-8"
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

    <v-row id="editorRow" no-gutters align="center" justify="space-around">
      <v-col cols="3" class="pl-5">
        <v-dialog
          ref="dialogStart"
          v-model="modalStart"
          :return-value.sync="starttime"
          persistent
          width="290px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              v-model="starttime"
              :disabled="!editableEvent"
              label="Start"
              prepend-icon="mdi-clock-time-four-outline"
              readonly
              hide-details
              v-bind="attrs"
              v-on="on"
            ></v-text-field>
          </template>
          <v-time-picker
            v-if="modalStart"
            v-model="starttime"
            full-width
            :allowed-minutes="allowedStep"
            :max="endtime"
          >
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="modalStart = false">
              Cancel
            </v-btn>
            <v-btn
              text
              color="primary"
              @click="$refs.dialogStart.save(starttime)"
            >
              OK
            </v-btn>
          </v-time-picker>
        </v-dialog>
      </v-col>
      <v-col cols="3">
        <v-dialog
          ref="dialogEnd"
          v-model="modalEnd"
          :return-value.sync="endtime"
          persistent
          width="290px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              v-model="endtime"
              :disabled="!editableEvent"
              label="End"
              prepend-icon="mdi-clock-time-four-outline"
              readonly
              hide-details
              v-bind="attrs"
              v-on="on"
            ></v-text-field>
          </template>
          <v-time-picker
            v-if="modalEnd"
            v-model="endtime"
            full-width
            :allowed-minutes="allowedStep"
            :min="starttime"
          >
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="modalEnd = false">
              Cancel
            </v-btn>
            <v-btn text color="primary" @click="$refs.dialogEnd.save(endtime)">
              OK
            </v-btn>
          </v-time-picker>
        </v-dialog>
      </v-col>
      <v-col class="text-right mr-5">
        <v-btn :disabled="!editableEvent" @click="goRight()"
          ><v-icon>mdi-delete</v-icon></v-btn
        >

        <v-btn :disabled="!editableEvent" @click="goLeft()"
          ><v-icon>mdi-graphql</v-icon></v-btn
        >

        <!-- add this back later -->
        <!-- <v-btn :disabled="!changed" @click="undo"
          ><v-icon>mdi-undo</v-icon></v-btn
        > -->
      </v-col>
    </v-row>

    <v-row id="statusRow" no-gutters class="mt-0">
      <v-col
        ><div class="pl-5">
          <small>{{ status }}</small>
        </div>
      </v-col>
    </v-row>
    <ConfirmDlg id="confirmDlg" ref="confirm" />
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
  formatSmallTimeBare,
  updateTime,
} from '../../utils/luxonHelpers';
import { error, success, highlight, printJson } from '../../utils/colors';

export default {
  name: 'calendarCard',

  props: {
    selectedSpace: Object,
    avgStay: Number,
  },

  components: {
    ConfirmDlg: () => import('./dialogCard'),
  },

  computed: {
    updateFeedbackMessage() {
      return `Ready to revert your last edit to its original value? ${this.getInterval(
        this.original.start,
        this.original.end
      )}?`;
    },

    visitCache() {
      return Visit.all();
    },
  },

  data: () => ({
    sheetHeight: 0,
    calendarHeight: 0,
    bp: null,
    editing: false,
    editableEvent: null,
    modalStart: false,
    modalEnd: false,
    starttime: null,
    endtime: null,
    editedStart: '',
    editedEnd: '',

    onCalendar: true,
    visitId: '',
    changed: false,
    calendarElement: null,
    status: 'Ready',
    original: { start: 0, end: 0 },

    action: '',
    confirm: false,
    visits: [],
    place: null,
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
    allowedStep: (m) => m % 15 === 0,
    formatStartEndTime: (t) => formatSmallTime(t),
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
      // this.confirm = true;
      this.$refs.confirm
        .open('Confirm', this.updateFeedbackMessage)
        .then((act) => {
          if (act) this.act();
        });
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
      this.editableEvent = event;
      const { name, start, end, id } = event;
      this.status = `Selected: ${name} [id: ${id}]`;
      this.starttime = formatSmallTimeBare(start);
      this.endtime = formatSmallTimeBare(end);

      // // shallow clone so reset() does not effect visit indirectly

      this.visitId = event.id;
      console.log(nativeEvent.type);
    },

    //#region  Drag and Drop

    // @mousedown:event="startDrag"
    // @touchstart:event="startDrag"
    startDrag({ nativeEvent, event, timed }) {
      if (!event) {
        console.log('Leaving drag');
        return;
      }
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
      } else {
        this.editableEvent = null;
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

        this.changed = true;
      }
    },

    // @mouseup:time="endDrag"
    // @touchend:time="endDrag"
    // handles updates:
    // this.original stores visit's original interval
    // called by drag or extendBottom
    endDrag(event) {
      if (event && this.changed) {
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
      this.status = 'Resetting variables';
      this.calendarElement.style.overflowY = 'auto';

      this.dragTime = null;
      this.dragEvent = null;
      this.createEvent = null;
      this.createStart = null;
      this.extendOriginal = null;
      this.place = null;
      this.changed = false;
      this.visitId = '';
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
      if (!this.editableEvent) {
        console.log('No visit selected');
        return;
      }
      console.log('Going Right...');
      const visit = this.getVisit();
      this.action = 'DELETE';
      this.$refs.confirm
        .open('Confirm', `Are you sure you want to DELETE ${visit.name}`)
        .then((act) => {
          if (act) {
            this.act();
            this.reset();
            this.editableEvent = null;
          }
        });
    },

    goLeft() {
      if (!this.editableEvent) {
        console.log('No visit selected');

        return;
      }
      console.log('Going Left...');
      const visit = this.getVisit();

      this.status = visit.logged
        ? `Updating a previously logged ${visit.name} visit on the server.`
        : 'Logging visit on the server...';

      const feedbackMessage = `Are you sure you want to LOG ${
        visit.name
      } from ${formatTime(visit.start)} to ${formatTime(visit.end)} `;
      this.action = 'LOG';
      this.$refs.confirm.open('Confirm', feedbackMessage).then((act) => {
        if (act) {
          this.act();
          this.reset();
        }
      });
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
          this.updateLoggedVisit();
          break;
        case 'REVERT':
          this.revert();
          break;
      }

      this.reset();
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
        name: this.place.name,
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

      let newVisit = { ...this.createEvent };
      newVisit.lat = this.place.lat;
      newVisit.lng = this.place.lng;

      Visit.updatePromise(newVisit)
        .then((p) => {
          console.log('Added visit to cache', printJson(p));
        })
        .catch((e) => {
          console.log(error(e));
        });

      this.place = null;
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

      this.feedbackMessage = `UPDATE a logged visit to ${
        visit.name
      } with new times: ${this.getInterval(visit.start, visit.end)}?`;
      this.action = 'UPDATE';
      this.$refs.confirm.open('Confirm', this.feedbackMessage).then((act) => {
        if (act) this.act();
      });
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
        case 'Tab':
          this.goLeft(); // calls confirmation with the Tab key
          break;

        case 'KeyY':
        case 'Enter':
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

    starttime(newVal, oldVal) {
      this.status = 'New starttime: ' + newVal + ' (oldVal:' + oldVal + ')';
      if (!oldVal) {
        return;
      }
      const newTime = updateTime(this.editableEvent.start, newVal, oldVal);
      this.status = 'New event start: ' + formatTime(newTime);
      console.log('New event start: ', newTime);
      this.editableEvent.start = newTime;
      this.getVisit(this.editableEvent.id).start = newTime;
    },

    endtime(newVal, oldVal) {
      this.status = 'New endtime: ' + newVal + ' (oldVal:' + oldVal + ')';
      if (!oldVal) {
        return;
      }
      const newTime = updateTime(this.editableEvent.end, newVal, oldVal);
      this.status = 'New event end: ' + formatTime(newTime);
      console.log('New event end: ', newTime);
      this.editableEvent.end = newTime;
      this.getVisit(this.editableEvent.id).end = newTime;
    },

    modalStart(newVal, oldVal) {
      if (!newVal && oldVal) {
        this.confirmUpdate(this.editableEvent);
      }
    },

    modalEnd(newVal, oldVal) {
      if (!newVal && oldVal) {
        this.confirmUpdate(this.editableEvent);
      }
    },
  },

  created() {},

  mounted() {
    const self = this;
    const bp = self.$vuetify.breakpoint;
    console.log(
      highlight('Breakpoint'),
      bp.name,
      'width',
      bp.width,
      'height',
      bp.height,

      'mobile?',
      bp.mobile
    );

    const x = bp.height;
    const y = 250;
    self.sheetHeight = x - y;
    self.calendarHeight = self.sheetHeight * 0.8;
    console.log('sheetHeight:', self.sheetHeight);
    console.log('calendarHeight:', self.calendarHeight);

    Visit.$fetch().then(() => {
      self.visits = self.visitCache;

      self.calendarElement = document.getElementById('calendar-target');
      self.$refs.calendar.scrollToTime(showCurrentMilitaryTime());

      self.place = self.selectedSpace;
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
