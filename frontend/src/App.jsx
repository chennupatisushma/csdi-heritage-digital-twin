import { useEffect, useState } from "react";
import CesiumMap from "./cesium/CesiumMap";

function App() {
  const [fusionData, setFusionData] = useState(null);
  const [lat, setLat] = useState(22.337);
  const [lon, setLon] = useState(114.172);

  const fetchFusion = () => {
    fetch(
      `http://localhost:4000/api/fusion/predict?lat=${lat}&lon=${lon}`
    )
      .then((res) => res.json())
      .then((data) => setFusionData(data));
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
