import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/building/analytics", (req, res) => {
  const { lat, lon, timestamp = Date.now() } = req.body;
  const date = new Date(timestamp);
  const hour = date.getHours();

  /* ===== SOLAR (terrain + season + time) ===== */
  const dayOfYear =
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
    86400000;

  const seasonal = 0.85 + 0.15 * Math.sin((2 * Math.PI * dayOfYear) / 365);
  const sun = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const slope = 0.7 + Math.random() * 0.2;

  const solarExposure = Math.round(1000 * seasonal * sun * slope);

  /* ===== OCCUPANCY ===== */
  const floors = Math.floor(3 + Math.random() * 6);
  const density = 0.06;
  const area = 800 + Math.random() * 500;
  const timeFactor = hour >= 8 && hour <= 18 ? 1 : 0.25;

  const occupancy = Array.from({ length: floors }, (_, i) => ({
    floor: i + 1,
    people: Math.round(area * density * timeFactor * (0.6 + Math.random())),
  }));

  const totalPeople = occupancy.reduce((s, f) => s + f.people, 0);

  /* ===== TRAFFIC ===== */
  const trafficIndex = Math.round((0.3 + Math.random() * 0.7) * 100) / 100;

  /* ===== WEATHER ===== */
  const temperature = 26 + Math.random() * 6;
  const humidity = 55 + Math.random() * 30;

  /* ===== HVAC ===== */
  let hvacScore = 0;
  if (temperature > 30) hvacScore += 2;
  if (humidity > 70) hvacScore += 2;
  if (trafficIndex > 0.6) hvacScore += 1;
  if (totalPeople > floors * 40) hvacScore += 2;

  const hvac = hvacScore >= 5 ? "HIGH" : hvacScore >= 3 ? "MEDIUM" : "LOW";

  /* ===== ENERGY ===== */
  const lighting = solarExposure > 500 ? "REDUCED" : "NORMAL";
  const blinds = solarExposure > 500 ? "DOWN" : "UP";

  /* ===== AIR QUALITY ===== */
  const aqi = Math.round(30 + Math.random() * 70);
  const purifiers = aqi >= 60 ? "ON" : "OFF";

  /* ===== ML (DEMO) ===== */
  const ml = {
    model: "LSTM (Demo)",
    solar30min: Math.round(solarExposure * (0.9 + Math.random() * 0.2)),
    visitors30min: Math.round(totalPeople * (0.9 + Math.random() * 0.3)),
  };

  res.json({
    location: { lat, lon },
    solarExposure,
    occupancy,
    trafficIndex,
    weather: { temperature, humidity },
    energy: { lighting, blinds, hvac },
    airQuality: { aqi, purifiers },
    ml,
  });
});

app.listen(4000, () => console.log("Backend running on port 4000"));
