import fetch from "node-fetch";

export async function getAirQuality() {
  const url =
    "https://api.data.gov.hk/v1/smart-lamppost/data/epd?pi=DF5176&di=01";

  const res = await fetch(url);
  const data = await res.json();

  return {
    pm25: data?.data?.PM25 ?? null,
    pm10: data?.data?.PM10 ?? null,
    source: "EPD Smart Lamp Post"
  };
}
