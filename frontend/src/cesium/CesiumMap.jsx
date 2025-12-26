import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

/* ✅ TOKEN MUST BE SET BEFORE VIEWER */
Cesium.Ion.defaultAccessToken =
  import.meta.env.VITE_CESIUM_TOKEN;

window.CESIUM_BASE_URL = "/cesium";

export default function CesiumMap({ fusionData, onMapClick }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: true,
    });

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        114.2106,
        22.418,
        2500
      ),
    });

    viewerRef.current = viewer;

    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );

    handler.setInputAction((click) => {
      const pos = viewer.scene.pickPosition(click.position);
      if (!pos) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);

      onMapClick(lat, lon);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!fusionData || !viewerRef.current) return;

    const viewer = viewerRef.current;
    viewer.entities.removeAll();

    fusionData.sensors.forEach((s) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: `Sensor ${s.id}\n${s.temp.toFixed(1)} °C`,
          pixelOffset: new Cesium.Cartesian2(0, -25),
        },
      });
    });

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        fusionData.center.lon,
        fusionData.center.lat
      ),
      label: {
        text:
          `Fused: ${fusionData.fusedTemp} °C\n` +
          `Avg: ${fusionData.sensorAvgTemp} °C\n` +
          `HKO: ${fusionData.hkoRefTemp} °C\n` +
          `+30 min: ${fusionData.forecast30Min} °C\n` +
          `Traffic: ${fusionData.trafficCongestion}`,
        showBackground: true,
      },
    });
  }, [fusionData]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
