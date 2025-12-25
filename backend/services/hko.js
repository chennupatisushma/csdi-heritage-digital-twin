import axios from "axios";

/**
 * Hong Kong Observatory – Current Weather Report
 * Official open data API
 */
export async function getHkoCurrent() {
  const url =
    "https://data.weather.gov.hk/weatherAPI/opendata/weather.php";

  const response = await axios.get(url, {
    params: {
      dataType: "rhrread",
      lang: "en"
    }
  });

  return response.data;
}
