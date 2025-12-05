/* A DepartureBoard for Danish bus, train, ferry and more */

/* Magic Mirror
 * Module: MMM-Rejseplanen
 * By John Kristensen
 *
 * based on MMM-RNV By Stefan Krause
 * based on a Script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-Rejseplanen",{

  defaults: {
    units: config.units,
    animationSpeed: 1000,
    refreshInterval: 1000 * 15, // refresh every 15 seconds
    updateInterval: 1000 * 3600, // update every hour
    timeFormat: config.timeFormat,
    lang: config.language,

    // kan være "" eller fx "Aalborg St.,Universitetet"
    destfilter: "",

    appendLocationNameToHeader: true,
    initialLoadDelay: 0, // 0 seconds delay
    retryDelay: 2500,

    // API 2.0 base
    apiBase: "https://www.rejseplanen.dk/api/departureBoard",

    stationID: "",
    stationName: "",
    departuresMax: 20,

    iconTable: {
      "IC": "fa fa-train",
      "LYN": "fa fa-train",
      "REG": "fa fa-train",
      "S": "fa fa-subway",
      "TOG": "fa fa-train",
      "BUS": "fa fa-bus",
      "EXB": "fa fa-bus",
      "NB": "fa fa-bus",
      "TB": "fa fa-bus",
      "F": "fa fa-ship",
      "M": "fa fa-subway"
    }
  },

  getScripts: function() {
    return ["moment.js", "font-awesome.css"];
  },

  getStyles: function() {
    return ['Rejseplanen.css'];
  },

  start: function() {
    Log.info('Starting module: ' + this.name);
    this.loaded = false;
    this.departures = [];

    // Send config to node_helper
    this.sendSocketNotification('CONFIG', this.config);

    // Vehicle filter (old style). Keep it, but make defensive.
    const v = (this.config.vehicle || "").toUpperCase();
    if (v === "T") {
      this.config.vehicletype = "&useBus=0";
    } else if (v === "B") {
      this.config.vehicletype = "&useTog=0";
    } else {
      this.config.vehicletype = "";
    }
  },

  getDom: function() {
    var wrapper = document.createElement("div");

    if (this.config.stationID === "") {
      wrapper.innerHTML = "No Rejseplanen.dk <i>stationID</i> set in config file.";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = this.translate('LOADING');
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.departures.length) {
      wrapper.innerHTML = "No data";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    var table = document.createElement("table");
    table.id = "rptable";
    table.className = "small thin light";

    if (this.departures.length > this.config.departuresMax) {
      this.departures.length -= (this.departures.length - this.config.departuresMax);
    }

    for (var i in this.departures) {
      var currentDeparture = this.departures[i];
      var row = document.createElement("tr");
      table.appendChild(row);

      // Departure time
      var cellDeparture = document.createElement("td");
      cellDeparture.innerHTML = currentDeparture.time || "";
      cellDeparture.className = "timeinfo";

      // Calculate the delay, if any
      if (currentDeparture.delay) {
        var start = moment.duration(currentDeparture.time, "HH:mm");
        var end = moment.duration(currentDeparture.delay, "HH:mm");
        var diff = end.subtract(start);
        var spanDelay = document.createElement("span");
        spanDelay.innerHTML = " +" + diff.minutes();
        spanDelay.className = "smll delay";
        cellDeparture.appendChild(spanDelay);
      }
      row.appendChild(cellDeparture);

      // Transportation icon
      var cellTransport = document.createElement("td");
      cellTransport.className = "timeinfo";
      var symbolTransportation = document.createElement("span");
      symbolTransportation.className = this.config.iconTable[currentDeparture.transportation] || "";
      cellTransport.appendChild(symbolTransportation);

      var spanName = document.createElement("span");
      spanName.innerHTML = " " + (currentDeparture.name || "");
      spanName.className = "lineinfo";
      cellTransport.appendChild(spanName);

      row.appendChild(cellTransport);

      // Line / track label
      var cellLine = document.createElement("td");
      cellLine.innerHTML = currentDeparture.lineLabel || "";
      cellLine.className = "lineinfo";
      row.appendChild(cellLine);

      // Departure direction
      var cellDirection = document.createElement("td");
      if (currentDeparture.transportation == "M") {
        cellDirection.innerHTML = "<i class='fa fa-arrow-right' aria-hidden='true'></i> " + (currentDeparture.direction || "");
        cellDirection.className = "destinationinfo";
      } else {
        cellDirection.innerHTML = currentDeparture.finalStop || "";
        cellDirection.className = "destinationinfo";
      }
      row.appendChild(cellDirection);
    }

    wrapper.appendChild(table);
    return wrapper;
  },

  getHeader: function() {
    if (this.config.appendLocationNameToHeader) {
      return "Rejseplanen.dk - " + this.config.stationName;
    }
    return this.data.header;
  },

  // Parser til API 2.0 + multi-filter
  processDepartures: function(data) {
    this.departures = [];

    // API 2.0 returnerer {"Departure":[...]} top-level
    const rawDeps =
      (data && data.Departure) ||
      (data && data.departure) ||
      (data && data.DepartureBoard && data.DepartureBoard.Departure) ||
      [];

    // Normaliser til array (hvis kun 1 objekt)
    const deps = Array.isArray(rawDeps) ? rawDeps : (rawDeps ? [rawDeps] : []);

    // destfilter kan være string eller array af strings
    let filters = this.config.destfilter || [];
    if (typeof filters === "string") {
      filters = filters.split(/[|,]/).map(s => s.trim()).filter(Boolean);
    }
    filters = filters.map(f => f.toLowerCase());

    for (let i = 0; i < deps.length; i++) {
      const t = deps[i] || {};

      // Felter fra dit JSON
      const time = (t.time || "").toString().slice(0,5); // "16:43:00" -> "16:43"
      const rtTime = t.rtTime ? t.rtTime.toString().slice(0,5) : null;

      const finalStop = (t.direction || t.finalStop || "").toString();
      const direction = (t.direction || "").toString();

      const finalStopLc = finalStop.toLowerCase();
      const directionLc = direction.toLowerCase();

      const matchesFilter =
        filters.length === 0 ||
        filters.some(f => finalStopLc.includes(f) || directionLc.includes(f));

      if (!matchesFilter) continue;

      this.departures.push({
        time: time,
        delay: rtTime,
        lineLabel: t.rtTrack || t.track || "",
        finalStop: finalStop,
        direction: direction,
        transportation: t.type || "",
        name: t.name || ""
      });
    }
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "STARTED") {
      this.updateDom();
    }
    else if (notification === "DATA") {
      this.loaded = true;
      try {
        this.processDepartures(JSON.parse(payload));
      } catch (e) {
        Log.error("MMM-Rejseplanen: Could not parse DATA payload", e);
        this.departures = [];
      }
      this.updateDom();
    }
  }

});

