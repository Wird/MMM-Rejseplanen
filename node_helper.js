'use strict';

/* Magic Mirror
 * Module: MMM-Rejseplanen
 * By John Kristensen
 *
 * MIT Licensed.
 */
const NodeHelper = require('node_helper');
var moment = require('moment');

module.exports = NodeHelper.create({

  start: function() {
    this.started = false;
    this.config = null;
  },

  getData: function() {
    var self = this;

    var myUrl = this.config.apiBase
      + "?id=" + this.config.stationID
      + (this.config.vehicletype || "")
      + "&format=json"
      + "&accessId=" + this.config.accessId;

    function scheduleNext(ms) {
      setTimeout(function() { self.getData(); }, ms);
    }

    fetch(myUrl, { headers: { "Accept": "application/json" } })
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(body => {
        self.sendSocketNotification("DATA", body);

        // Default fallback hvis vi ikke kan beregne noget
        let nextInterval = 1000 * 60 * 15; // 15 min

        try {
          const json = JSON.parse(body);

          const rawDeps = json.Departure || [];
          const deps = Array.isArray(rawDeps) ? rawDeps : (rawDeps ? [rawDeps] : []);

          if (deps.length > 0) {
            const now = moment();
            let soonestMinutes = null;

            deps.forEach(d => {
              // Brug realtime hvis det findes, ellers planlagt tid
              const dateStr = d.rtDate || d.date;
              const timeStr = d.rtTime || d.time;
              if (!dateStr || !timeStr) return;

              const depMoment = moment(
                dateStr + " " + timeStr,
                "YYYY-MM-DD HH:mm:ss"
              );

              if (!depMoment.isValid()) return;

              const diffMin = depMoment.diff(now, "minutes");

              if (diffMin >= 0 && (soonestMinutes === null || diffMin < soonestMinutes)) {
                soonestMinutes = diffMin;
              }
            });

            if (soonestMinutes === null) {
              // kunne ikke parse tider -> hold moderat polling
              nextInterval = 1000 * 60 * 15;
            } else if (soonestMinutes <= 15) {
              nextInterval = 1000 * 60 * 2;   // 2 min
            } else if (soonestMinutes <= 30) {
              nextInterval = 1000 * 60 * 5;   // 5 min
            } else if (soonestMinutes <= 60) {
              nextInterval = 1000 * 60 * 10;  // 10 min (mellemtrin)
            } else if (soonestMinutes <= 120) {
              nextInterval = 1000 * 60 * 30;  // 30 min
            } else {
              nextInterval = 1000 * 60 * 60;  // 60 min når > 2 timer
            }
          } else {
            // Ingen afgange i svaret -> sjælden, men poll roligt
            nextInterval = 1000 * 60 * 30;
          }

        } catch (e) {
          console.error("MMM-Rejseplanen parse/throttle error:", e);
          nextInterval = 1000 * 60 * 30;
        }

        scheduleNext(nextInterval);
      })
      .catch(err => {
        console.error("MMM-Rejseplanen fetch error:", err);
        scheduleNext(1000 * 60 * 30); // ved fejl: 15 min
      });
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;
    if (notification === 'CONFIG' && self.started == false) {
      self.config = payload;
      self.sendSocketNotification("STARTED", true);
      self.getData();
      self.started = true;
    }
  }
});

