import fs from "fs-extra";
import path from "path";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumDest = "public/cesium";

fs.removeSync(cesiumDest);
fs.copySync(cesiumSource, cesiumDest);

console.log("Cesium assets copied");
