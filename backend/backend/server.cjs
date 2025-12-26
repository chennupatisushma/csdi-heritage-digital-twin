const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;

// ---------- helpers ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// deterministic random (so sensors are stable for same lat/lon)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromLatLon(lat, lon) {
  // make stable seed per location
  const a = Math.floor((lat + 90) * 10000);
  const b = Math.floor((lon + 180) * 10000);
  return (a * 73856093) ^ (b * 19349663);
}

// very rough distance (km) - good enough for demo
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- “CSDI-style” mock feeds ----------
function getHkoRefTemp(lat, lon, isoTime = new Date().toISOString()) {
  // stable baseline depends on time + location (looks realistic)
  const t = new Date(isoTime);
  const hour = t.getUTCHours();

  // daily cycle: 0..1
  const daily = 0.5 + 0.5 * Math.sin(((hour - 6) / 24) * Math.PI * 2);

  // location gradient: slightly warmer near lower lat, + tiny lon effect
  const loc = (22.5 - lat) * 1.2 + (lon - 114.2) * 0.6;

  const base = 23.5 + daily * 2.2 - loc;
  return clamp(base, 18, 33);
}

function trafficIndexWithin10Km(lat, lon) {
  // fake “road corridor” influence (for demo)
  // traffic index 0..1, varies by location and time
  const hour = new Date().getUTCHours();
  const rush = hour >= 0 && hour <= 3 ? 0.2 : hour >= 10 && hour <= 13 ? 0.8 : 0.5;

  // “coast/highway” band around lon ~114.17..114.20
  const band = Math.exp(-Math.abs(lon - 114.18) * 20); // 0..1-ish
  const idx = clamp(0.15 + 0.55 * band + 0.3 * rush, 0, 1);
  return idx;
}

// Generate sensors dynamically (NO hardcoding)
function generateSensors(lat, lon) {
  const seed = seedFromLatLon(lat, lon);
  const rnd = mulberry32(seed);

  // 5 sensors within ~1km
  const sensors = [];
  for (let i = 0; i < 5; i++) {
    const dLat = (rnd() - 0.5) * 0.015; // ~ +/- 0.0075
    const dLon = (rnd() - 0.5) * 0.015;

    // temperature around HKO baseline + noise + micro-urban effect
    const ref = getHkoRefTemp(lat + dLat, lon + dLon);
    const traffic = trafficIndexWithin10Km(lat + dLat, lon + dLon);
    const temp = ref + 1.2 + traffic * 1.1 + (rnd() - 0.5) * 0.9;

    sensors.push({
      id: `S${i + 1}`,
      name: `Sensor ${i + 1}`,
      lat: lat + dLat,
      lon: lon + dLon,
      temp: Number(temp.toFixed(2)),
    });
  }
  return sensors;
}

// “ML forecast” (LSTM-like smoothing) – pitch-safe and stable
function forecast30Min(fusedNow, trafficIndex) {
  // more traffic => more warming drift
  const drift = 0.15 + trafficIndex * 0.25;
  // smoothing
  const predicted = fusedNow * 0.92 + (fusedNow + drift) * 0.08;
  return Number(predicted.toFixed(2));
}

function fuseTemperature({ sensors, hkoRefTemp, trafficIndex }) {
  const sensorAvg =
    sensors.reduce((sum, s) => sum + s.temp, 0) / Math.max(1, sensors.length);

  // fusion: sensors dominate + anchor to HKO, plus traffic heating
  const fused =
    0.68 * sensorAvg +
    0.25 * hkoRefTemp +
    0.07 * (hkoRefTemp + trafficIndex * 2.0);

  return {
    sensorAvgTemp: Number(sensorAvg.toFixed(2)),
    fusedTemp: Number(fused.toFixed(2)),
  };
}

// ---------- API ----------
app.get("/api/fusion/predict", (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  // Default: CUHK Inter-University Hall area
  const safeLat = Number.isFinite(lat) ? lat : 22.4180;
  const safeLon = Number.isFinite(lon) ? lon : 114.2106;

  const hkoRefTemp = Number(getHkoRefTemp(safeLat, safeLon).toFixed(2));
  const trafficCongestion = Number(
    trafficIndexWithin10Km(safeLat, safeLon).toFixed(2)
  );

  const sensors = generateSensors(safeLat, safeLon);

  const { sensorAvgTemp, fusedTemp } = fuseTemperature({
    sensors,
    hkoRefTemp,
    trafficIndex: trafficCongestion,
  });

  const forecast30MinTemp = forecast30Min(fusedTemp, trafficCongestion);

  res.json({
    center: { lat: safeLat, lon: safeLon },
    hkoRefTemp,
    trafficCongestion,
    sensors,
    sensorAvgTemp,
    fusedTemp,
    forecast30Min: forecast30MinTemp,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
