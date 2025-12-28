import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { INNOPORT } from "./constants";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
window.CESIUM_BASE_URL = "/cesium";

export default function CesiumMap({ sensors, onReady }) {
  const ref = useRef();

  useEffect(() => {
    const viewer = new Cesium.Viewer(ref.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: true
    });

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        INNOPORT.lon,
        INNOPORT.lat,
        800
      )
    });

    // InnoPort Pin
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        INNOPORT.lon,
        INNOPORT.lat
      ),
      point: { pixelSize: 14, color: Cesium.Color.RED },
      label: {
        text: "InnoPort Building (CUHK)",
        pixelOffset: new Cesium.Cartesian2(0, -25)
      }
    });

    // Sensor points
    sensors.forEach(s => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
        point: { pixelSize: 8, color: Cesium.Color.BLUE }
      });
    });

    onReady(viewer);
    return () => viewer.destroy();
  }, []);

  return <div ref={ref} style={{ height: "100vh", width: "100vw" }} />;
}
