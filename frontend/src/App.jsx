import { useEffect } from "react";
import * as Cesium from "cesium";
import axios from "axios";

export default function App() {
  useEffect(() => {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false
    });

    /* 🎥 CAMERA: closer + tilted for 3D readability */
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        114.207,
        22.419,
        3500
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      }
    });

    /* 🔗 FETCH DATA FROM BACKEND */
    axios
      .get("http://localhost:4000/api/fusion/predict")
      .then(res => {
        const data = res.data;

        /* 🟠 IOT SENSOR POINTS */
        data.sensors.forEach(sensor => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              sensor.lon,
              sensor.lat
            ),
            point: {
              pixelSize: 12,
              color: Cesium.Color.ORANGE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1
            },
            label: {
              text: `🌡 ${sensor.temp}°C\n💧 ${sensor.humidity}%`,
              font: "14px sans-serif",
              fillColor: Cesium.Color.WHITE,
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
              pixelOffset: new Cesium.Cartesian2(0, -20)
            }
          });
        });

        /* 🔴 CUHK FUSED TEMPERATURE (HERO METRIC) */
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            data.cuhk.lon,
            data.cuhk.lat
          ),
          label: {
            text: `CUHK\nFused Temp: ${data.fusedNow} °C`,
            font: "bold 20px sans-serif",
            fillColor: Cesium.Color.RED,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK,
            pixelOffset: new Cesium.Cartesian2(0, -70)
          }
        });

        /* 🔵 SHORT-TERM FORECAST LABELS */
        data.forecast.forEach((f, index) => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              data.cuhk.lon + 0.002,
              data.cuhk.lat + index * 0.0012
            ),
            label: {
              text: `${f.minutesAhead} min → ${f.temp} °C`,
              font: "14px sans-serif",
              fillColor: Cesium.Color.CYAN,
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
              pixelOffset: new Cesium.Cartesian2(0, -10)
            }
          });
        });
      })
      .catch(err => {
        console.error("Backend fetch failed:", err);
      });

    return () => viewer.destroy();
  }, []);

  return (
    <div
      id="cesiumContainer"
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0
      }}
    />
  );
}
