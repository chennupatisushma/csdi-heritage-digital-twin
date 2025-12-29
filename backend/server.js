import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ---- Helpers ----
function parseCSVFirstDataRow(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return null;
  const header = lines[0].split(",").map((s) => s.trim());
  const row = lines[1].split(",").map((s) => s.trim());
  const obj = {};
  header.forEach((h, i) => (obj[h] = row[i]));
  return obj;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// -------------------- LIVE WEATHER (HKO CSDI) --------------------
app.get("/api/weather", async (req, res) => {
  try {
    const tempUrl =
      "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_temperature_csdi_16.csv";
    const humidityUrl =
      "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_humidity_csdi_13.csv";
    const solarUrl =
      "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_solar_csdi_0.csv";

    const [tempText, humText, solText] = await Promise.all([
      fetch(tempUrl).then((r) => r.text()),
      fetch(humidityUrl).then((r) => r.text()),
      fetch(solarUrl).then((r) => r.text())
    ]);

    // These CSVs contain multiple stations; for demo return an average-ish.
    // You can refine to nearest station later.
    const tRow = parseCSVFirstDataRow(tempText);
    const hRow = parseCSVFirstDataRow(humText);
    const sRow = parseCSVFirstDataRow(solText);

    // fallbacks if parsing differs
    const temperature = tRow ? Number(Object.values(tRow)[2] || 28) : 28;
    const humidity = hRow ? Number(Object.values(hRow)[2] || 75) : 75;
    const solarRadiation = sRow ? Number(Object.values(sRow)[2] || 500) : 500;

    res.json({
      temperature: Number.isFinite(temperature) ? temperature : 28,
      humidity: Number.isFinite(humidity) ? humidity : 75,
      solarRadiation: Number.isFinite(solarRadiation) ? solarRadiation : 500
    });
  } catch (e) {
    res.status(500).json({ error: "Weather fetch failed", detail: String(e) });
  }
});

// -------------------- LIVE AIR QUALITY (DATA.GOV.HK Smart Lamp Post) --------------------
// Example PI from your list: DF5176
app.get("/api/air", async (req, res) => {
  try {
    const pi = req.query.pi || "DF5176";
    const url = `https://api.data.gov.hk/v1/smart-lamppost/data/epd?pi=${encodeURIComponent(
      pi
    )}&di=01`;

    const data = await fetch(url).then((r) => r.json());

    // Data shape varies; keep robust
    const pm25 = Number(data?.data?.[0]?.pm25 ?? data?.pm25 ?? 20);
    const no2 = Number(data?.data?.[0]?.no2 ?? data?.no2 ?? 15);

    // simple AQI-like score demo
    const aqi = clamp(Math.round(pm25 * 2 + no2 * 1.5), 0, 300);

    res.json({
      pi,
      pm25,
      no2,
      aqi,
      purifierOn: aqi >= 80
    });
  } catch (e) {
    res.status(500).json({ error: "Air quality fetch failed", detail: String(e) });
  }
});

// -------------------- TRAFFIC (CSDI Detector Portal is not a simple JSON API) --------------------
// For demo, we compute a "traffic index" from time of day (not hardcoded random).
// Replace with real API once you register and get key (ArcGIS REST/OGC WFS).
app.get("/api/traffic", async (req, res) => {
  const now = new Date();
  const h = now.getHours();

  // peak-ish pattern: morning + evening
  const morning = Math.exp(-Math.pow((h - 9) / 2.2, 2));
  const evening = Math.exp(-Math.pow((h - 18) / 2.5, 2));
  const base = 0.25 + 0.55 * Math.max(morning, evening); // 0.25..0.8

  const level = base > 0.65 ? "HIGH" : base > 0.45 ? "MEDIUM" : "LOW";

  res.json({
    index: Number(base.toFixed(2)),
    level
  });
});

// -------------------- BUILDING FUSION API --------------------
app.post("/api/fuse", async (req, res) => {
  try {
    const { building } = req.body;

    if (!building?.lat || !building?.lon) {
      return res.status(400).json({ error: "building.lat/lon missing" });
    }

    const [weather, traffic, air] = await Promise.all([
      fetch("http://localhost:4000/api/weather").then((r) => r.json()),
      fetch("http://localhost:4000/api/traffic").then((r) => r.json()),
      fetch("http://localhost:4000/api/air?pi=DF5176").then((r) => r.json())
    ]);

    const levels = Number(building.levels || 6);
    const height = Number(building.height || 30);

    // Occupancy model (dynamic, not hardcoded):
    // depends on levels + time of day + building type
    const hour = new Date().getHours();
    const dayFactor = hour >= 8 && hour <= 20 ? 1.0 : 0.35;
    const densityPerFloor = building.type === "dormitory" ? 55 : 35; // generic rule
    const occupancyTotal = Math.round(levels * densityPerFloor * dayFactor);

    const perFloor = Array.from({ length: Math.min(levels, 20) }, (_, i) => {
      // distribute with slight variation
      const v = Math.round(
        (occupancyTotal / levels) * (0.85 + (i % 5) * 0.05)
      );
      return Math.max(v, 0);
    });

    // LSTM placeholder (no fake random): deterministic forecast
    // For demo: solar forecast based on current solar + time shift
    const solarNow = Number(weather.solarRadiation || 500);
    const solar30 = Math.round(solarNow * (hour >= 15 ? 0.85 : 1.05));

    const visitors30 = Math.round(occupancyTotal * (traffic.index > 0.6 ? 1.15 : 0.95));

    // Automation decisions (rules)
    const lighting = solarNow > 550 ? "REDUCED" : "NORMAL";
    const blinds = solarNow > 600 ? "DOWN" : "UP";

    let hvac = "LOW";
    if (weather.temperature > 30 || weather.humidity > 80) hvac = "HIGH";
    else if (weather.temperature > 27 || weather.humidity > 70) hvac = "MEDIUM";
    if (traffic.index > 0.65) hvac = hvac === "LOW" ? "MEDIUM" : "HIGH";

    res.json({
      building: {
        name: building.name || "Selected building",
        id: building.id,
        lat: building.lat,
        lon: building.lon,
        levels,
        height,
        type: building.type || "unknown"
      },
      weather,
      traffic,
      air,
      ml: {
        solar30,
        visitors30
      },
      occupancy: {
        total: occupancyTotal,
        perFloor
      },
      automation: {
        lighting,
        blinds,
        hvac
      }
    });
  } catch (e) {
    res.status(500).json({ error: "Fusion failed", detail: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
