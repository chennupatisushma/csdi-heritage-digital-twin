import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
window.CESIUM_BASE_URL = "/cesium";

export default function CesiumMap({ onMapClick, data }) {
  const ref = useRef();
  const viewerRef = useRef();

  useEffect(() => {
    const viewer = new Cesium.Viewer(ref.current, {
      animation: false,
      timeline: false,
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

    handler.setInputAction((e) => {
      const pos = viewer.scene.pickPosition(e.position);
      if (!pos) return;

      const c = Cesium.Cartographic.fromCartesian(pos);
      onMapClick(
        Cesium.Math.toDegrees(c.latitude),
        Cesium.Math.toDegrees(c.longitude)
      );
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => viewer.destroy();
  }, []);

  useEffect(() => {
    if (!data || !viewerRef.current) return;
    const viewer = viewerRef.current;
    viewer.entities.removeAll();

    data.sensors.forEach((s) =>
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat),
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: `${s.id}\n${s.temp.toFixed(1)}°C`,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      })
    );

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        data.center.lon,
        data.center.lat
      ),
      label: {
        showBackground: true,
        text:
          `CSDI Digital Twin\n` +
          `Fused Temp: ${data.fusedTemp}°C\n` +
          `+30 min: ${data.forecast30}°C\n` +
          `Traffic: ${data.trafficIndex}\n` +
          `Solar: ${data.solarExposure} W/m²`,
      },
    });
  }, [data]);

  return <div ref={ref} style={{ width: "100vw", height: "100vh" }} />;
}
