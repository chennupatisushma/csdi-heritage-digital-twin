import { getWeatherData } from "./weather.service.js";
import { getAirQuality } from "./airQuality.service.js";
import { getTrafficIndex } from "./traffic.service.js";

export async function getFusedData() {
  const [weather, air, traffic] = await Promise.all([
    getWeatherData(),
    getAirQuality(),
    getTrafficIndex()
  ]);

  const fusedTemp =
    weather.temperature +
    weather.solarRadiation * 0.01 +
    traffic.congestionIndex * 2;

  return {
    weather,
    air,
    traffic,
    fusedTemp: fusedTemp.toFixed(2),
    timestamp: new Date().toISOString()
  };
}
