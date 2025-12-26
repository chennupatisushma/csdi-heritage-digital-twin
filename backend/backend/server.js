import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

/**
 * Simple helpers
 */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Fake HKO weather by latitude (cooler at higher lat)
function getHKOTemp(lat) {
  return 24.0 - (lat - 22.3) * 0.6 + rand(-0.3, 0.3);
}

// Fake traffic congestion (0–1)
function getTrafficIndex(lon) {
  return Math.min(1, Math.abs(lon - 114.15) * 2 + rand(0.1, 0.3));
}

// Fake IoT sensors near clicked location
function generateSensors(lat, lon) {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: i + 1,
    lat: lat + rand(-0.002, 0.002),
    lon: lon + rand(-0.002, 0.002),
    temp: 26.5 + rand(-1.2, 1.2),
  }));
}

// Simple “LSTM-like” forecast
function forecastTemp(now, traffic) {
  return now + traffic * 0.8 + rand(-0.2, 0.2);
}

app.get("/api/fusion/predict", (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "lat & lon required" });
  }

  const sensors = generateSensors(lat, lon);
  const sensorAvg =
    sensors.reduce((s, x) => s + x.temp, 0) / sensors.length;

  const hkoTemp = getHKOTemp(lat);
  const traffic = getTrafficIndex(lon);

  const fusedNow = sensorAvg * 0.55 + hkoTemp * 0.45;
  const forecast30 = forecastTemp(fusedNow, traffic);

  res.json({
    location: { lat, lon },
    sensors,
    sensorAvgTemp: Number(sensorAvg.toFixed(2)),
    hkoRefTemp: Number(hkoTemp.toFixed(2)),
    trafficCongestion: Number(traffic.toFixed(2)),
    fusedTemp: Number(fusedNow.toFixed(2)),
    forecast30Min: Number(forecast30.toFixed(2)),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`CSDI backend running on port ${PORT}`)
);
