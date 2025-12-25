import express from "express";
import cors from "cors";

import { getHkoCurrent } from "./services/hko.js";
import { getTrafficRaw } from "./services/traffic.js";
import { getMockIotSensors, fuseAndPredict } from "./services/fusion.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ======================
   BASIC HEALTH CHECK
====================== */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "csdi-heritage-digital-twin-backend"
  });
});

/* ======================
   HKO WEATHER (CSDI DATA)
====================== */
app.get("/api/weather/hko", async (req, res) => {
  try {
    const data = await getHkoCurrent();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   TRAFFIC DATA
====================== */
app.get("/api/traffic/raw", async (req, res) => {
  try {
    const data = await getTrafficRaw();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   MOCK IOT SENSORS
====================== */
app.get("/api/iot/mock", (req, res) => {
  res.json(getMockIotSensors());
});

/* ======================
   DATA FUSION + FORECAST
====================== */
app.get("/api/fusion/predict", async (req, res) => {
  try {
    const result = await fuseAndPredict();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
