import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

window.CESIUM_BASE_URL = "/cesium";

export default function CesiumMap({ fusionData }) {
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
        fusionData.center.lon,
        fusionData.center.lat,
        2500
      ),
    });

    // Sensors
    fusionData.sensors.forEach((s) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: `${s.name}\n${s.temp.toFixed(1)} °C`,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });
    });

    // Fused label
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        fusionData.center.lon,
        fusionData.center.lat
      ),
      label: {
        text:
          `Fused: ${fusionData.fusedTemp} °C\n` +
          `Sensor Avg: ${fusionData.sensorAvgTemp} °C\n` +
          `HKO: ${fusionData.hkoRefTemp} °C\n` +
          `+30 min: ${fusionData.forecast30Min} °C\n` +
          `Traffic: ${fusionData.trafficCongestion}`,
        showBackground: true,
      },
    });

    viewerRef.current = viewer;

    return () => viewer.destroy();
  }, [fusionData]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
