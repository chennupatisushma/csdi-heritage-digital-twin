import { useState } from "react";
import CesiumMap from "./components/CesiumMap";

export default function App() {
  const [data, setData] = useState(null);

  const fetchAnalytics = async (payload) => {
    const res = await fetch(
      "https://<YOUR-BACKEND-URL>/api/building/analytics",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setData(await res.json());
  };

  return (
    <>
      <CesiumMap onAnalytics={fetchAnalytics} />

      {data && (
        <pre
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: 12,
            width: 360,
            fontSize: 12,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </>
  );
}
