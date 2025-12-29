export async function getTrafficIndex() {
  // TDSTPR20013 – Tai Po Road North Bound
  // In full deployment → use ArcGIS REST / WFS
  // PoC → normalized congestion index

  return {
    detectorId: "TDSTPR20013",
    congestionIndex: Math.random().toFixed(2),
    source: "Transport Department Traffic Detector (CSDI)"
  };
}
