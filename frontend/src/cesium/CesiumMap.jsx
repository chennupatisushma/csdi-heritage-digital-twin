import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

function CesiumMap({ fusionData, onMapClick }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      fullscreenButton: true,
      baseLayerPicker: true,
      geocoder: false,
      homeButton: true,
      sceneModePicker: true,
    });

    // Camera start
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(114.172, 22.337, 800),
    });

    // CLICK HANDLER (THIS FIXES YOUR ISSUE)
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

    // Render fusion overlay
    if (fusionData) {
      viewer.entities.removeAll();

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          fusionData.lon,
          fusionData.lat
        ),
        label: {
          text: `
Fused: ${fusionData.fused.toFixed(2)} °C
Sensor Avg: ${fusionData.sensorAvg.toFixed(2)} °C
HKO: ${fusionData.hko.toFixed(2)} °C
+30 min: ${fusionData.forecast30.toFixed(2)} °C
Traffic: ${fusionData.traffic.toFixed(2)}
          `,
          font: "14px sans-serif",
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED,
        },
      });
    }

    return () => {
      handler.destroy();
      viewer.destroy();
    };
  }, [fusionData]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

export default CesiumMap;
