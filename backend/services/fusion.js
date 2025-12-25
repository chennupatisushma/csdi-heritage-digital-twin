import { getHkoCurrent } from "./hko.js";

/**
 * Approx CUHK / Ma Liu Shui
 */
const CUHK = {
  lat: 22.419,
  lon: 114.207
};

export function getMockIotSensors() {
  return [
    {
      id: "sensor-1",
      lat: CUHK.lat + 0.001,
      lon: CUHK.lon + 0.001,
      temp: 26.3,
      humidity: 72
    },
    {
      id: "sensor-2",
      lat: CUHK.lat - 0.001,
      lon: CUHK.lon - 0.001,
      temp: 27.1,
      humidity: 69
    },
    {
      id: "sensor-3",
      lat: CUHK.lat,
      lon: CUHK.lon + 0.0015,
      temp: 26.8,
      humidity: 70
    }
  ];
}

/**
 * Simple fusion + forecast placeholder
 * (LSTM will replace this in Step 2)
 */
export async function fuseAndPredict() {
  const hko = await getHkoCurrent();
  const sensors = getMockIotSensors();

  const sensorAvg =
    sensors.reduce((sum, s) => sum + s.temp, 0) / sensors.length;

  const hkoTemp =
    hko.temperature?.data?.[0]?.value ?? sensorAvg;

  const fusedTemp =
    0.7 * sensorAvg + 0.3 * hkoTemp;

  return {
    location: "CUHK / Inter-University Hall",
    cuhk: CUHK,
    sensorAverage: +sensorAvg.toFixed(2),
    hkoReference: hkoTemp,
    fusedNow: +fusedTemp.toFixed(2),
    forecast: [
      { minutesAhead: 10, temp: +(fusedTemp + 0.2).toFixed(2) },
      { minutesAhead: 20, temp: +(fusedTemp + 0.3).toFixed(2) },
      { minutesAhead: 30, temp: +(fusedTemp + 0.4).toFixed(2) }
    ],
    sensors
  };
}
