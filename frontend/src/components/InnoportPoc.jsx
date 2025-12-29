import { Viewer, Cesium3DTileset, Entity } from "resium";
import { Cartesian3, Color, SunLight } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function InnoportPoc() {
  return (
    <Viewer
      full
      terrainProvider={undefined}
      shadows
      timeline={false}
      animation={false}
      scene3DOnly
      lighting
      sunlight={new SunLight()}
    >
      {/* InnoPort 3D Tile from CSDI / Open3DHK */}
      <Cesium3DTileset
        url="https://map.gov.hk/tileset/Tile_+264_+200/tileset.json"
        maximumScreenSpaceError={2}
        maximumMemoryUsage={512}
        shadows
      />

      {/* Pin marker on InnoPort */}
      <Entity
        name="InnoPort Building"
        position={Cartesian3.fromDegrees(114.20963, 22.41306, 30)}
        point={{
          pixelSize: 12,
          color: Color.RED,
        }}
        label={{
          text: "InnoPort (CUHK)",
          font: "14px sans-serif",
          fillColor: Color.WHITE,
          showBackground: true,
        }}
      />
    </Viewer>
  );
}
