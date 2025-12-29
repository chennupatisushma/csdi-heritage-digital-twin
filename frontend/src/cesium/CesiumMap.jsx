import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
window.CESIUM_BASE_URL = "/cesium";

export default function CesiumMap({ onAnalytics }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: true,
      terrainProvider: Cesium.createWorldTerrain(),
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewerRef.current = viewer;

    // Load 3D buildings (public demo proxy)
    (async () => {
      const buildings = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
      viewer.scene.primitives.add(buildings);
    })();

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(114.2106, 22.418, 1200),
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((e) => {
      const picked = viewer.scene.pick(e.position);
      if (!picked || !picked.getProperty) return;

      const pos = viewer.scene.pickPosition(e.position);
      if (!pos) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);

      onAnalytics({
        buildingId:
          picked.getProperty("id") ||
          picked.getProperty("OBJECTID") ||
          crypto.randomUUID(),
        lat: Cesium.Math.toDegrees(carto.latitude),
        lon: Cesium.Math.toDegrees(carto.longitude),
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => viewer.destroy();
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
