import { useState } from "react";
import CesiumMap from "./CesiumMap";

const API = import.meta.env.VITE_API_BASE_URL;

export default function App() {
  const [data, setData] = useState(null);

  async function fetchFusion(lat, lon) {
    const res = await fetch(
      `${API}/api/fusion/predict?lat=${lat}&lon=${lon}`
    );
    setData(await res.json());
  }

  return (
    <CesiumMap onMapClick={fetchFusion} data={data} />
  );
}
