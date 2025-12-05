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

    fetch(myUrl, { headers: { "Accept": "application/json" } })
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(body => {
        self.sendSocketNotification("DATA", body);
      })
      .catch(err => {
        console.error("MMM-Rejseplanen fetch error:", err);
      });

    setTimeout(function() { self.getData(); }, this.config.refreshInterval);
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

