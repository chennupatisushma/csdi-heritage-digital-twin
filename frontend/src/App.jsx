import { useEffect, useState } from "react";
import CesiumMap from "./CesiumMap";

const API = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [weather, setWeather] = useState({});
  const [traffic, setTraffic] = useState({});
  const [energy, setEnergy] = useState({});

  const sensors = [
    { lat: 22.4185, lon: 114.2065 },
    { lat: 22.4181, lon: 114.2072 }
  ];

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/weather`).then(r => r.json()),
      fetch(`${API}/api/traffic`).then(r => r.json())
    ]).then(([w, t]) => {
      setWeather(w);
      setTraffic(t);

      // ENERGY + AUTOMATION LOGIC
      const cooling =
        w.temperature > 30 || w.humidity > 75 || t.level === "HIGH"
          ? "HIGH"
          : "MEDIUM";

      const lighting =
        w.solarRadiation > 600 ? "LOW" : "HIGH";

      setEnergy({ cooling, lighting });
    });
  }, []);

  return (
    <>
      <CesiumMap sensors={sensors} onReady={() => {}} />

      <div style={{
        position: "absolute",
        top: 20,
        right: 20,
        background: "#fff",
        padding: 15,
        width: 300
      }}>
        <h3>InnoPort Digital Twin</h3>
        <p>🌡 Temp: {weather.temperature} °C</p>
        <p>💧 Humidity: {weather.humidity}%</p>
        <p>☀ Solar: {weather.solarRadiation} W/m²</p>
        <p>🚗 Traffic: {traffic.level}</p>

        <hr />

        <p>💡 Lighting: {energy.lighting}</p>
        <p>❄ Cooling Load: {energy.cooling}</p>

        <small>
          *Demo logic using CSDI + HKO data
        </small>
      </div>
    </>
  );
}
