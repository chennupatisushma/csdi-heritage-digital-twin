import fetch from "node-fetch";
import csv from "csvtojson";

export async function getWeatherData() {
  const tempUrl =
    "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_temperature_csdi_16.csv";
  const humidityUrl =
    "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_humidity_csdi_13.csv";
  const solarUrl =
    "https://data.weather.gov.hk/weatherAPI/hko_data/csdi/dataset/latest_1min_solar_csdi_0.csv";

  const [tempCSV, humidityCSV, solarCSV] = await Promise.all([
    fetch(tempUrl).then(r => r.text()),
    fetch(humidityUrl).then(r => r.text()),
    fetch(solarUrl).then(r => r.text())
  ]);

  const temp = await csv().fromString(tempCSV);
  const humidity = await csv().fromString(humidityCSV);
  const solar = await csv().fromString(solarCSV);

  return {
    temperature: Number(temp[0]?.value),
    humidity: Number(humidity[0]?.value),
    solarRadiation: Number(solar[0]?.value),
    source: "Hong Kong Observatory (CSDI)"
  };
}
