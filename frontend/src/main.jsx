import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

window.CESIUM_BASE_URL = "/cesium";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
