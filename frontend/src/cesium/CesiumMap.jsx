// src/CesiumMap.jsx
import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

window.CESIUM_BASE_URL = "/cesium";

// 🔗 Backend API (local + production safe)
const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://csdi-heritage-digital-twin-1.onrender.com";

export default function CesiumMap() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const sensorEntities = useRef([]);
  const ringEntities = useRef([]);
  const fusedEntity = useRef(null);

  // ✅ NEW: extra layer entities
  const airEntities = useRef([]);
  const peopleEntities = useRef([]);
  const energyEntities = useRef([]);

  const [layers, setLayers] = useState({
    sensors: true,
    rings: true,
    fused: true,
    air: true,
    people: true,
    energy: true,
  });

  // ---------- INIT VIEWER ----------
  useEffect(() => {
    if (!containerRef.current) return;

    // ✅ If you have Cesium Ion token, set it in .env as VITE_CESIUM_ION_TOKEN
    // and it will work both local + Vercel.
    if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
      Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      geocoder: false,
      homeButton: true,
      baseLayerPicker: true,
      sceneModePicker: true,
      navigationHelpButton: true,
      fullscreenButton: true,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      // ✅ keeps it lighter + avoids some scene issues
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });

    // ✅ Start at HKU-ish
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(114.2106, 22.418, 2500),
    });

    viewerRef.current = viewer;

    // CLICK HANDLER
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      // Prefer globe pick first
      const ray = viewer.camera.getPickRay(click.position);
      const globePos = viewer.scene.globe.pick(ray, viewer.scene);

      const pos =
        globePos ||
        (viewer.scene.pickPositionSupported
          ? viewer.scene.pickPosition(click.position)
          : null);

      if (!Cesium.defined(pos)) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);

      loadFusion(lat, lon);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
    };
  }, []);

  // ---------- HELPERS ----------
  function clearAllEntities(viewer) {
    [...sensorEntities.current, ...ringEntities.current].forEach((e) =>
      viewer.entities.remove(e)
    );
    if (fusedEntity.current) viewer.entities.remove(fusedEntity.current);

    [...airEntities.current, ...peopleEntities.current, ...energyEntities.current].forEach(
      (e) => viewer.entities.remove(e)
    );

    sensorEntities.current = [];
    ringEntities.current = [];
    fusedEntity.current = null;

    airEntities.current = [];
    peopleEntities.current = [];
    energyEntities.current = [];
  }

  // ---------- LOAD & DRAW DATA ----------
  async function loadFusion(lat, lon) {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let data;
    try {
      const res = await fetch(`${API}/api/fusion/predict?lat=${lat}&lon=${lon}`);
      data = await res.json();
    } catch (e) {
      console.error("Fusion API failed:", e);
      return;
    }

    // Clear old entities
    clearAllEntities(viewer);

    // ---------------- SENSORS ----------------
    if (Array.isArray(data?.sensors)) {
      data.sensors.forEach((s) => {
        const e = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
          point: {
            pixelSize: 10,
            color: Cesium.Color.RED,
            show: layers.sensors,
          },
          label: {
            text: `Sensor ${s.id}\n${Number(s.temp).toFixed(1)} °C`,
            font: "14px sans-serif",
            fillColor: Cesium.Color.RED,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            show: layers.sensors,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          },
        });
        sensorEntities.current.push(e);
      });
    }

    // ---------------- RINGS ----------------
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

    // ---------------- FUSED LABEL ----------------
    const fusedTemp = Number(data?.fusedTemp ?? 0);
    const sensorAvgTemp = Number(data?.sensorAvgTemp ?? 0);
    const hkoRefTemp = Number(data?.hkoRefTemp ?? 0);
    const forecast30Min = Number(data?.forecast30Min ?? 0);
    const trafficCongestion = Number(data?.trafficCongestion ?? 0);
    const timestamp = data?.timestamp ? new Date(data.timestamp) : new Date();

    fusedEntity.current = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      label: {
        text:
          `CSDI Heritage Digital Twin\n` +
          `Fused Now: ${fusedTemp.toFixed(2)} °C\n` +
          `Sensor Avg: ${sensorAvgTemp.toFixed(2)} °C\n` +
          `HKO Ref: ${hkoRefTemp.toFixed(2)} °C\n` +
          `+30 min: ${forecast30Min.toFixed(2)} °C\n` +
          `Traffic (10km): ${trafficCongestion.toFixed(2)}\n` +
          `Updated: ${timestamp.toLocaleTimeString()}`,
        font: "15px sans-serif",
        fillColor: Cesium.Color.CYAN,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
        pixelOffset: new Cesium.Cartesian2(0, -10),
        show: layers.fused,
      },
    });

    // =========================================================
    // ✅ NEW: AIR QUALITY + PEOPLE + ENERGY (WITH FALLBACK LOGIC)
    // =========================================================

    // ---------------- AIR QUALITY ----------------
    const air =
      data?.air || {
        aqi: Math.min(150, Math.round(40 + trafficCongestion * 100)),
        pm25: Math.round(10 + trafficCongestion * 30),
        co2: Math.round(420 + trafficCongestion * 300),
      };

    const airColor =
      air.aqi < 50
        ? Cesium.Color.LIME
        : air.aqi < 100
        ? Cesium.Color.YELLOW
        : Cesium.Color.RED;

    airEntities.current.push(
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 30),
        point: {
          pixelSize: 14,
          color: airColor,
          show: layers.air,
        },
        label: {
          text:
            `AIR QUALITY\n` +
            `AQI: ${air.aqi}\n` +
            `PM2.5: ${air.pm25}\n` +
            `CO₂: ${air.co2} ppm`,
          font: "13px sans-serif",
          fillColor: airColor,
          pixelOffset: new Cesium.Cartesian2(160, -10),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          show: layers.air,
        },
      })
    );

    // ---------------- PEOPLE ESTIMATE ----------------
    const hour = new Date().getHours();
    const baseOccupancy = hour >= 8 && hour <= 19 ? 1.0 : 0.35;

    const peopleEstimated =
      data?.people?.estimated ??
      Math.round(600 * baseOccupancy * (1 + trafficCongestion));

    peopleEntities.current.push(
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 60),
        billboard: {
          image:
            "https://cdn-icons-png.flaticon.com/512/847/847969.png",
          width: 30,
          height: 30,
          show: layers.people,
        },
        label: {
          text: `OCCUPANCY\nPeople: ${peopleEstimated}`,
          font: "14px sans-serif",
          fillColor: Cesium.Color.WHITE,
          pixelOffset: new Cesium.Cartesian2(160, -55),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          show: layers.people,
        },
      })
    );

    // ---------------- ENERGY / HVAC ----------------
    const hvacLoad =
      data?.energy?.hvacLoad ??
      Math.min(1, Math.max(0, (fusedTemp - 22) * 0.08 + trafficCongestion * 0.4));

    const lightingReduction =
      data?.energy?.lightingReduction ??
      Math.round(Math.max(0, 30 - forecast30Min)); // cooler => less reduction

    const blindsDown = air.aqi > 100 ? "DOWN" : "UP";
    const purifiersOn = air.aqi > 70 || air.co2 > 800 ? "ON" : "OFF";

    energyEntities.current.push(
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 90),
        label: {
          text:
            `ENERGY / HVAC\n` +
            `HVAC Load: ${(hvacLoad * 100).toFixed(0)}%\n` +
            `Lighting: ${lightingReduction}% REDUCED\n` +
            `Blinds: ${blindsDown}\n` +
            `Purifiers: ${purifiersOn}`,
          font: "14px sans-serif",
          fillColor: Cesium.Color.ORANGE,
          pixelOffset: new Cesium.Cartesian2(160, -110),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          show: layers.energy,
        },
      })
    );

    // ✅ Ensure we render once after adding everything (since requestRenderMode)
    viewer.scene.requestRender();
  }

  // ---------- LAYER TOGGLES ----------
  useEffect(() => {
    sensorEntities.current.forEach((e) => {
      if (e.point) e.point.show = layers.sensors;
      if (e.label) e.label.show = layers.sensors;
    });

    ringEntities.current.forEach((e) => {
      if (e.ellipse) e.ellipse.show = layers.rings;
    });

    if (fusedEntity.current?.label) fusedEntity.current.label.show = layers.fused;

    airEntities.current.forEach((e) => {
      if (e.point) e.point.show = layers.air;
      if (e.label) e.label.show = layers.air;
    });

    peopleEntities.current.forEach((e) => {
      if (e.billboard) e.billboard.show = layers.people;
      if (e.label) e.label.show = layers.people;
    });

    energyEntities.current.forEach((e) => {
      if (e.label) e.label.show = layers.energy;
    });

    // request render if viewer exists
    const viewer = viewerRef.current;
    if (viewer) viewer.scene.requestRender();
  }, [layers]);

  // ---------- UI ----------
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* LAYER PANEL */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: 10,
          borderRadius: 6,
          fontFamily: "sans-serif",
          minWidth: 200,
        }}
      >
        <b>CSDI Layers</b>
        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
          Click anywhere on map
        </div>

        <hr style={{ opacity: 0.2 }} />

        <label>
          <input
            type="checkbox"
            checked={layers.sensors}
            onChange={(e) => setLayers({ ...layers, sensors: e.target.checked })}
          />{" "}
          Sensors
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.rings}
            onChange={(e) => setLayers({ ...layers, rings: e.target.checked })}
          />{" "}
          Forecast / Traffic Rings
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.fused}
            onChange={(e) => setLayers({ ...layers, fused: e.target.checked })}
          />{" "}
          Fused Label
        </label>

        <hr style={{ opacity: 0.2 }} />

        <label>
          <input
            type="checkbox"
            checked={layers.air}
            onChange={(e) => setLayers({ ...layers, air: e.target.checked })}
          />{" "}
          Air Quality
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.people}
            onChange={(e) => setLayers({ ...layers, people: e.target.checked })}
          />{" "}
          People Count
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={layers.energy}
            onChange={(e) => setLayers({ ...layers, energy: e.target.checked })}
          />{" "}
          Energy / HVAC
        </label>
      </div>

      {/* CESIUM VIEW */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
