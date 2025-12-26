import { useEffect, useState } from "react";
import CesiumMap from "./cesium/CesiumMap";
import { API_BASE } from "./config/api";


function App() {
  const [fusionData, setFusionData] = useState(null);
  const [lat, setLat] = useState(22.337);
  const [lon, setLon] = useState(114.172);

  const fetchFusion = async (latVal = lat, lonVal = lon) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/fusion/predict?lat=${latVal}&lon=${lonVal}`
      );
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      setFusionData(data);
    } catch (err) {
      console.error("Fusion fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchFusion();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* UI overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "rgba(255,255,255,0.95)",
          padding: 10,
          borderRadius: 6,
        }}
      >
        <label>
          Latitude:
          <input
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            style={{ marginLeft: 5 }}
          />
        </label>

        <label style={{ marginLeft: 10 }}>
          Longitude:
          <input
            value={lon}
            onChange={(e) => setLon(Number(e.target.value))}
            style={{ marginLeft: 5 }}
          />
        </label>

        <button onClick={() => fetchFusion()} style={{ marginLeft: 10 }}>
          Update
        </button>
      </div>

      {/* FULLSCREEN MAP */}
      <CesiumMap fusionData={fusionData} onMapClick={fetchFusion} />
    </div>
  );
}

export default App;
