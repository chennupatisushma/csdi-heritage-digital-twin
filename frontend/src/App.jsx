import { useState } from "react";
import CesiumMap from "./components/CesiumMap";

export default function App() {
  const [data, setData] = useState(null);

  const fetchAnalytics = async (payload) => {
    const res = await fetch("http://localhost:4000/api/building/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setData(await res.json());
  };

  return (
    <>
      <CesiumMap onAnalytics={fetchAnalytics} />

      {data && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            width: 360,
            background: "rgba(0,0,0,0.75)",
            color: "white",
            padding: 14,
            fontSize: 13,
            whiteSpace: "pre-line",
          }}
        >
          {`
Solar (Ray Tracing): ${data.solarExposure} W/m²

Lighting: ${data.energy.lighting}
Blinds: ${data.energy.blinds}
HVAC: ${data.energy.hvac}

Occupancy:
${data.occupancy.map(f => `F${f.floor}: ${f.people}`).join("\n")}

Air Quality:
AQI: ${data.airQuality.aqi}
Purifiers: ${data.airQuality.purifiers}

ML (LSTM Demo):
Solar +30m: ${data.ml.solar30min}
Visitors +30m: ${data.ml.visitors30min}
          `}
        </div>
      )}
    </>
  );
}
