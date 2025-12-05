# MMM-Rejseplanen

A module for [MagicMirror²](https://github.com/MichMich/MagicMirror).

Train and bus departure board for Danish stations:
InterCity, LYN, REG, S (S-Tog), Metro, BUS, EXB (Express Bus), NB (Night bus), Telebus and Ferry.

Monitoring your favorite local departure station, showing the next departures.
Data is fetched from **Rejseplanen Labs API**.

> **Important (API change 2025):**
> Rejseplanen **API 1.0 has been closed** and replaced by **API 2.0**.  
> This module has been updated to work with API 2.0 and now requires an API key (`accessId`).

## Example
![Example](https://github.com/poketcalulator/MMM-Rejseplanen/blob/master/Example/Example01.png)

---

## Installation

Open a terminal session, navigate to your MagicMirror `modules` folder and run:

```bash
git clone https://github.com/poketcalulator/MMM-Rejseplanen.git
cd MMM-Rejseplanen
npm install
```

### Dependency note
This module no longer uses the deprecated `request` package.
All network calls are done with Node’s built-in `fetch`, so no extra HTTP dependencies are required.

---

## Rejseplanen API 2.0

API documentation and access:
- API 2.0 overview: https://labs.rejseplanen.dk/hc/da/articles/21554723926557-Om-API-2-0
- Swagger / schema: https://www.rejseplanen.dk/api/api-doc
- Access / API keys: https://labs.rejseplanen.dk/hc/da/articles/21553113674909-Adgang-til-data-fra-Labs

This module calls:

```
https://www.rejseplanen.dk/api/departureBoard
```

with:

- `id=<stationID>`
- `format=json`
- `accessId=<YOUR_API_KEY>`

Example request:

```
https://www.rejseplanen.dk/api/departureBoard?id=8600621&format=json&accessId=YOUR_KEY
```

> Note: In API 2.0 the departure list may be returned as top-level `Departure`  
> (not `DepartureBoard.Departure`). The parsing in this module reflects that.

---

## Migration from older versions (API 1.0 → API 2.0)

Rejseplanen API 1.0 has been shut down and replaced by API 2.0.
To keep the module working you must:

1. Use API 2.0 base URL  
   `https://www.rejseplanen.dk/api/departureBoard`

2. Add your API key to config as `accessId`

3. Note that API 2.0 returns departures as top-level `Departure`
   (not `DepartureBoard.Departure`).  
   The module has been updated accordingly.

---

## Using the module

Add to `config/config.js`:

```js
modules: [
  {
    module: "MMM-Rejseplanen",
    position: "top_left",
    header: "Rejseplanen.dk",
    config: {
      stationID: "ENTER YOUR STATION ID HERE",
      stationName: "ENTER YOUR STATION NAME HERE",

      // "T" for trains, "B" for bus, "" for all
      vehicle: "B",

      // Optional destination filter:
      // - empty string shows all
      // - single destination: "Aalborg"
      // - multiple destinations separated by comma or | :
      //   "Aalborg St.,Universitetet"
      destfilter: "",

      departuresMax: 6,

      // REQUIRED for API 2.0
      accessId: "YOUR_API_KEY_HERE"
    }
  }
]
```

---

## Config Options

| Option | Default | Description |
|:---|:---:|:---|
| `stationID` | REQUIRED | Stop/station id (see list below). Used as `id=` in API request. |
| `stationName` | REQUIRED | Name shown in header. |
| `vehicle` | `""` | **T** for trains, **B** for bus, empty for all. |
| `destfilter` | `""` | Destination filter (case-insensitive). Multiple destinations supported with comma or `|`. Example: `"Aalborg St.,Universitetet"`. |
| `departuresMax` | `20` | Number of departures to show. Max 20. |
| `accessId` | REQUIRED | Your Rejseplanen Labs API key for API 2.0. |

---

## Station vs stationID

(unchanged list below, keep your existing station table here)

---

## Credits
- To Michael Teeuw (https://magicmirror.builders)
- To Stefan Krause (http://yawns.de) (MMM-RNV) which this module is basically based on.
