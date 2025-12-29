import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/**
 * PoC: InnoPort 3D Tiles + Ray trace + People/floor count + Air automation
 *
 * IMPORTANT:
 * - Put your Cesium Ion token if needed:
 *   Cesium.Ion.defaultAccessToken = "YOUR_TOKEN";
 *
 * - Tileset URL:
 *   Use either:
 *   1) A direct https://.../tileset.json
 *   2) A local dev-served path like /tiles/open3dhk/Tile_+264_+200/tileset.json
 */
export default function InnoportPoc() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const tilesetRef = useRef(null);

  // ---- UI state (PoC controls)
  const [tilesetUrl, setTilesetUrl] = useState("/tileset.json"); // <-- CHANGE THIS
  const [ready, setReady] = useState(false);

  // People counting PoC data (you can replace with real sensor later)
  const [floorHeightM, setFloorHeightM] = useState(3.5);
  const [groundZ, setGroundZ] = useState(20); // reference baseline; can be computed via terrain sampling
  const [peoplePoints, setPeoplePoints] = useState([
    { id: "p1", lon: 114.20963, lat: 22.41306, z: 28.2 },
    { id: "p2", lon: 114.20966, lat: 22.41308, z: 31.6 },
    { id: "p3", lon: 114.20960, lat: 22.41302, z: 36.9 },
  ]);
  const [countsByFloor, setCountsByFloor] = useState({});

  // Air quality automation PoC inputs
  const [pm25, setPm25] = useState(42);
  const [co2, setCo2] = useState(900);
  const [automationAction, setAutomationAction] = useState("Normal operation");
  const [automationLog, setAutomationLog] = useState([]);

  // Ray tracing output
  const [rayHitText, setRayHitText] = useState("No raycast yet.");
  const rayEntityRef = useRef(null);

  // ---------- Helpers ----------
  function computeFloorCounts(points, baseZ, floorHeight) {
    const counts = {};
    for (const p of points) {
      const floor = Math.floor((p.z - baseZ) / floorHeight) + 1;
      counts[floor] = (counts[floor] || 0) + 1;
    }
    return counts;
  }

  function airQualityController(nextPm25, nextCo2) {
    // PoC thresholds – adjust as needed
    if (nextPm25 > 50 || nextCo2 > 1000) return "Increase ventilation + alert";
    if (nextPm25 > 35 || nextCo2 > 850) return "Increase ventilation";
    return "Normal operation";
  }

  function logAutomation(msg) {
    setAutomationLog((prev) => [
      { ts: new Date().toISOString(), msg },
      ...prev.slice(0, 20),
    ]);
  }

  // ---------- Cesium init ----------
  useEffect(() => {
    if (!containerRef.current) return;

    // Create viewer
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      timeline: false,
      animation: false,
      baseLayerPicker: true,
      geocoder: true,
      sceneModePicker: true,
      fullscreenButton: true,
      navigationHelpButton: true,
      selectionIndicator: true,
      infoBox: true,
      shouldAnimate: true,
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;

    viewerRef.current = viewer;

    setReady(true);

    // cleanup
    return () => {
      try {
        viewer.destroy();
      } catch {}
      viewerRef.current = null;
      tilesetRef.current = null;
    };
  }, []);

  // ---------- Load tileset ----------
  async function loadTileset() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear old
    if (tilesetRef.current) {
      viewer.scene.primitives.remove(tilesetRef.current);
      tilesetRef.current = null;
    }

    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
        // optional: tweak for quality/perf
        maximumScreenSpaceError: 4,
        dynamicScreenSpaceError: true,
      });

      tilesetRef.current = tileset;
      viewer.scene.primitives.add(tileset);

      await tileset.readyPromise;

      // Zoom to tileset
      viewer.zoomTo(tileset);

      // Optional: show bounding volume for debugging
      // tileset.debugShowBoundingVolume = true;

      logAutomation(`Tileset loaded: ${tilesetUrl}`);
    } catch (e) {
      console.error(e);
      logAutomation(`Tileset load FAILED: ${String(e)}`);
    }
  }

  // ---------- People entities ----------
  function drawPeople() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // remove previous people entities by id prefix
    const toRemove = viewer.entities.values.filter((ent) =>
      (ent.id || "").startsWith("person-")
    );
    toRemove.forEach((ent) => viewer.entities.remove(ent));

    // add points
    peoplePoints.forEach((p) => {
      viewer.entities.add({
        id: `person-${p.id}`,
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.z),
        point: {
          pixelSize: 10,
          // no explicit color (per your style preference sometimes), but Cesium defaults are ok
        },
        label: {
          text: `P:${p.id}`,
          font: "12px sans-serif",
          pixelOffset: new Cesium.Cartesian2(0, -18),
        },
      });
    });

    // compute and update counts
    const counts = computeFloorCounts(peoplePoints, groundZ, floorHeightM);
    setCountsByFloor(counts);
    logAutomation(`People points drawn. Floors counted.`);
  }

  // ---------- Ray tracing ----------
  async function doRayTrace() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const scene = viewer.scene;

    // Ray origin: camera position, direction: camera direction
    const origin = viewer.camera.positionWC.clone();
    const direction = viewer.camera.directionWC.clone();
    const ray = new Cesium.Ray(origin, direction);

    // pickFromRay will hit 3D tiles/terrain depending on what's in view
    const hit = scene.pickFromRay(ray);

    if (!Cesium.defined(hit)) {
      setRayHitText("Raycast: no hit.");
      logAutomation("Raycast: no hit.");
      return;
    }

    const carto = Cesium.Cartographic.fromCartesian(hit.position);
    const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6);
    const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6);
    const h = carto.height.toFixed(2);

    const pickedType =
      hit.object && hit.object.tileset ? "3D Tiles (building)" : "Terrain/Other";

    setRayHitText(`Raycast HIT: ${pickedType} @ lon=${lon}, lat=${lat}, h=${h}`);
    logAutomation(`Raycast HIT: ${pickedType} @ (${lon}, ${lat}, ${h}m)`);

    // Visual marker at hit point
    if (rayEntityRef.current) {
      viewer.entities.remove(rayEntityRef.current);
      rayEntityRef.current = null;
    }
    rayEntityRef.current = viewer.entities.add({
      id: "ray-hit-marker",
      position: hit.position,
      point: {
        pixelSize: 14,
      },
      label: {
        text: "HIT",
        font: "14px sans-serif",
        pixelOffset: new Cesium.Cartesian2(0, -20),
      },
    });

    viewer.flyTo(rayEntityRef.current, { duration: 0.6 });
  }

  // ---------- Air automation apply ----------
  function applyAutomation(nextPm25, nextCo2) {
    const action = airQualityController(nextPm25, nextCo2);
    setAutomationAction(action);

    // Actuation placeholder: this is what they expect in PoC
    if (action.includes("Increase")) {
      logAutomation(
        `AUTOMATION: ${action} (pm25=${nextPm25}, co2=${nextCo2})`
      );
    } else {
      logAutomation(`AUTOMATION: Normal (pm25=${nextPm25}, co2=${nextCo2})`);
    }
  }

  // Keep counts updated if user changes floor height/groundZ
  useEffect(() => {
    setCountsByFloor(computeFloorCounts(peoplePoints, groundZ, floorHeightM));
  }, [peoplePoints, groundZ, floorHeightM]);

  // Keep automation updated when inputs change
  useEffect(() => {
    applyAutomation(pm25, co2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pm25, co2]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>
      {/* LEFT: Cesium */}
      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={containerRef}
          style={{ position: "absolute", inset: 0 }}
        ></div>
      </div>

      {/* RIGHT: PoC panel */}
      <div
        style={{
          width: 420,
          padding: 12,
          borderLeft: "1px solid #333",
          fontFamily: "sans-serif",
          overflow: "auto",
          background: "#111",
          color: "#eee",
        }}
      >
        <h2 style={{ margin: "4px 0 12px 0" }}>InnoPort PoC Controls</h2>

        {/* Tileset */}
        <section style={{ padding: 10, border: "1px solid #333", marginBottom: 10 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>1) Exact 3D Tile</h3>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
            Paste your <b>tileset.json</b> URL or local path.
          </div>

          <input
            value={tilesetUrl}
            onChange={(e) => setTilesetUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#1a1a1a",
              color: "#eee",
              marginBottom: 8,
            }}
            placeholder="https://.../tileset.json OR /tiles/open3dhk/tileset.json"
          />

          <button
            disabled={!ready}
            onClick={loadTileset}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#eee",
              cursor: "pointer",
            }}
          >
            Load Tileset
          </button>
        </section>

        {/* Ray tracing */}
        <section style={{ padding: 10, border: "1px solid #333", marginBottom: 10 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>2) Ray Tracing (Terrain + Tiles)</h3>

          <button
            disabled={!ready}
            onClick={doRayTrace}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#eee",
              cursor: "pointer",
            }}
          >
            Raycast From Camera
          </button>

          <div style={{ fontSize: 12, marginTop: 8, opacity: 0.9 }}>
            {rayHitText}
          </div>
        </section>

        {/* People per floor */}
        <section style={{ padding: 10, border: "1px solid #333", marginBottom: 10 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>3) People Counting per Floor</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Floor height (m)</div>
              <input
                type="number"
                value={floorHeightM}
                onChange={(e) => setFloorHeightM(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#eee",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Ground Z (m)</div>
              <input
                type="number"
                value={groundZ}
                onChange={(e) => setGroundZ(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#eee",
                }}
              />
            </div>
          </div>

          <button
            disabled={!ready}
            onClick={drawPeople}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#eee",
              cursor: "pointer",
            }}
          >
            Draw People + Count Floors
          </button>

          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Counts by floor:</div>
            {Object.keys(countsByFloor).length === 0 ? (
              <div style={{ opacity: 0.8 }}>No counts yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {Object.entries(countsByFloor)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([floor, count]) => (
                    <li key={floor}>
                      Floor <b>{floor}</b>: {count}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>

        {/* Air automation */}
        <section style={{ padding: 10, border: "1px solid #333", marginBottom: 10 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>4) Air Quality Automation</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>PM2.5</div>
              <input
                type="number"
                value={pm25}
                onChange={(e) => setPm25(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#eee",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>CO2 (ppm)</div>
              <input
                type="number"
                value={co2}
                onChange={(e) => setCo2(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#eee",
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>Automation action:</div>
            <div style={{ marginTop: 4, padding: 8, background: "#1a1a1a", borderRadius: 6 }}>
              {automationAction}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Automation log:
            </div>
            <div
              style={{
                fontSize: 12,
                background: "#0d0d0d",
                border: "1px solid #333",
                borderRadius: 6,
                padding: 8,
                maxHeight: 160,
                overflow: "auto",
              }}
            >
              {automationLog.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No logs yet.</div>
              ) : (
                automationLog.map((l, idx) => (
                  <div key={idx} style={{ marginBottom: 6 }}>
                    <div style={{ opacity: 0.7 }}>{l.ts}</div>
                    <div>{l.msg}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section style={{ padding: 10, border: "1px solid #333" }}>
          <h3 style={{ margin: "0 0 8px 0" }}>PoC Notes</h3>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.5 }}>
            ✅ Ray tracing is demonstrated by <b>pickFromRay</b> against terrain/tiles. <br />
            ✅ People counting is PoC logic using Z→floor binning. <br />
            ✅ Air automation is closed-loop threshold logic with logged actuation. <br />
            <br />
            Next (optional): hook ML outputs into automation (forecast → proactive ventilation).
          </div>
        </section>
      </div>
    </div>
  );
}
