import { useEffect, useState } from "react";
import CesiumMap from "./cesium/CesiumMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is missing");
}

function App() {
  const [fusionData, setFusionData] = useState(null);
  const [lat, setLat] = useState(22.337);
  const [lon, setLon] = useState(114.172);

  const fetchFusion = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/fusion/predict?lat=${lat}&lon=${lon}`
      );

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setFusionData(data);
    } catch (err) {
      console.error("Fusion fetch error:", err);
    }
  };

  useEffect(() => {
    fetchFusion();
  }, []);

  return (
    <>
      <div style={{ padding: 10 }}>
        <label>
          Latitude:
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </label>

        <label style={{ marginLeft: 10 }}>
          Longitude:
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
          />
        </label>

        <button onClick={fetchFusion} style={{ marginLeft: 10 }}>
          Update
        </button>
      </div>

      {fusionData && <CesiumMap fusionData={fusionData} />}
    </>
  );
}

export default App;
