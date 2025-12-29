import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
window.CESIUM_BASE_URL = "/cesium";

/* ===========================
   DEMO: Solar Ray Tracing
   (terrain + sun angle)
=========================== */
function estimateSolarExposure(lat, lon, date = new Date()) {
  const hour = date.getHours();

  // Simple sun elevation model (DEMO)
  const sunElevation = Math.max(
    0,
    Math.sin(((hour - 6) / 12) * Math.PI)
  );

  // Hong Kong is hilly → slope factor
  const slopeFactor = 0.75;

  return Math.round(1000 * sunElevation * slopeFactor);
}

/* ===========================
   DEMO: Occupancy per floor
=========================== */
const OCCUPANCY = [
  { floor: 1, people: 42 },
  { floor: 2, people: 31 },
  { floor: 3, people: 18 },
];

export default function CesiumMap({ onMapClick, data }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  /* ===========================
     INIT CESIUM VIEWER
  ============================ */
  useEffect(() => {
    if (viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: true,

      // REQUIRED: terrain (HK hills)
      terrainProvider: Cesium.createWorldTerrain(),
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        114.2106, // CUHK longitude
        22.418,   // CUHK latitude
        2500
      ),
    });

    viewerRef.current = viewer;

    /* ===========================
       LOAD CSDI / Open3DHK 3D TILES
       (replace URL with exact InnoPort tileset if provided)
    ============================ */
    (async () => {
      try {
        const tileset =
          await Cesium.Cesium3DTileset.fromUrl(
            "https://www.open3dhk.gov.hk/3dtiles/tileset.json"
          );

        viewer.scene.primitives.add(tileset);

        viewer.camera.flyToBoundingSphere(
          tileset.boundingSphere,
          { duration: 2 }
        );
      } catch (err) {
        console.warn("Tileset load failed (demo-safe):", err);
      }
    })();

    /* ===========================
       MAP CLICK → LAT / LON
    ============================ */
    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    handler.setInputAction((e) => {
      const pos = viewer.scene.pickPosition(e.position);
      if (!pos) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);
      onMapClick(
        Cesium.Math.toDegrees(carto.latitude),
        Cesium.Math.toDegrees(carto.longitude)
      );
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => viewer.destroy();
  }, []);

  /* ===========================
     UPDATE OVERLAYS
  ============================ */
  useEffect(() => {
    if (!viewerRef.current || !data) return;
    const viewer = viewerRef.current;

    viewer.entities.removeAll();

    /* ===== SENSOR POINTS ===== */
    data.sensors.forEach((s) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          s.lon,
          s.lat
        ),
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED,
        },
        label: {
          text: `${s.id}\n${s.temp.toFixed(1)}°C`,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          scale: 0.6,
        },
      });
    });

    /* ===== SOLAR RAY TRACE ===== */
    const solarExposure = estimateSolarExposure(
      data.center.lat,
      data.center.lon
    );

    /* ===== OCCUPANCY LABEL ===== */
    const occupancyText =
      "Occupancy (Demo)\n" +
      OCCUPANCY.map(
        (f) => `F${f.floor}: ${f.people}`
      ).join("\n");

    /* ===== MAIN INFO PANEL ===== */
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        data.center.lon,
        data.center.lat,
        60
      ),
      label: {
        showBackground: true,
        backgroundColor:
          Cesium.Color.BLACK.withAlpha(0.6),
        scale: 0.65,
        text:
          "CSDI Heritage Digital Twin – InnoPort\n\n" +
          `Fused Temp: ${data.fusedTemp} °C\n` +
          `+30 min (LSTM Forecast): ${data.forecast30} °C\n` +
          `Traffic Index: ${data.trafficIndex}\n\n` +
          `Solar (Ray Tracing): ${solarExposure} W/m²\n\n` +
          occupancyText +
          "\n\nAutomation (Demo):\n" +
          (solarExposure > 500
            ? "• Blinds DOWN\n• Lighting REDUCED"
            : "• Blinds UP\n• Lighting NORMAL"),
      },
    });
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
