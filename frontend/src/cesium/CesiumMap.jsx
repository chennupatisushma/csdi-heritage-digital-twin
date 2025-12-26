import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

// Cesium static assets path
window.CESIUM_BASE_URL = "/cesium";

// API base URL (from Vercel env)
const API = import.meta.env.VITE_API_BASE_URL;

export default function CesiumMap() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const sensorEntities = useRef([]);
  const ringEntities = useRef([]);
  const fusedEntity = useRef(null);

  const [layers, setLayers] = useState({
    sensors: true,
    rings: true,
    fused: true,
  });

  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: true,
      geocoder: true,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: true,
      fullscreenButton: true,
    });

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(114.2106, 22.418, 2500),
    });

    viewerRef.current = viewer;

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async (click) => {
      const pos = viewer.scene.pickPosition(click.position);
      if (!pos) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);

      await loadFusion(lat, lon);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
    };
  }, []);

  async function loadFusion(lat, lon) {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const res = await fetch(
      `${API}/api/fusion/predict?lat=${lat}&lon=${lon}`
    );

    const data = await res.json();

    // Clear previous entities
    [...sensorEntities.current, ...ringEntities.current].forEach((e) =>
      viewer.entities.remove(e)
    );
    if (fusedEntity.current) {
      viewer.entities.remove(fusedEntity.current);
    }

    sensorEntities.current = [];
    ringEntities.current = [];

    // Sensor points
    data.sensors.forEach((s) => {
      const e = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED,
        },
        label: {
          text: `Sensor ${s.id}\n${s.temp.toFixed(1)} °C`,
          font: "14px sans-serif",
          fillColor: Cesium.Color.RED,
          pixelOffset: new Cesium.Cartesian2(0, -25),
          show: layers.sensors,
        },
        show: layers.sensors,
      });
      sensorEntities.current.push(e);
    });

    // Rings
    [800, 1500].forEach((r) => {
      const ring = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        ellipse: {
          semiMajorAxis: r,
          semiMinorAxis: r,
          material: Cesium.Color.YELLOW.withAlpha(0.15),
          show: layers.rings,
        },
      });
      ringEntities.current.push(ring);
    });

    // Fused label
    fusedEntity.current = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      label: {
        text:
          `CSDI Heritage Digital Twin\n` +
          `Fused: ${data.fusedTemp} °C\n` +
          `Sensor Avg: ${data.sensorAvgTemp} °C\n` +
          `HKO Ref: ${data.hkoRefTemp} °C\n` +
          `+30 min: ${data.forecast30Min} °C\n` +
          `Traffic (10km): ${data.trafficCongestion}`,
        font: "15px sans-serif",
        fillColor: Cesium.Color.CYAN,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
        pixelOffset: new Cesium.Cartesian2(0, -10),
        show: layers.fused,
      },
    });
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Layer Controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 5,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: 10,
          borderRadius: 6,
          fontSize: 14,
        }}
      >
        <b>CSDI Layers</b>
        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.sensors}
            onChange={(e) =>
              setLayers({ ...layers, sensors: e.target.checked })
            }
          />{" "}
          Sensors
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.rings}
            onChange={(e) =>
              setLayers({ ...layers, rings: e.target.checked })
            }
          />{" "}
          Forecast / Traffic Rings
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.fused}
            onChange={(e) =>
              setLayers({ ...layers, fused: e.target.checked })
            }
          />{" "}
          Fused Label
        </label>

        <div style={{ fontSize: 12, marginTop: 6 }}>
          Click anywhere on map
        </div>
      </div>

      {/* Cesium Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
