import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/* ✅ THIS WAS MISSING */
import "cesium/Build/Cesium/Widgets/widgets.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
