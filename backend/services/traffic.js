import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

/**
 * Raw traffic speed + volume
 */
export async function getTrafficRaw() {
  const url =
    "https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml";

  const response = await axios.get(url, {
    responseType: "text"
  });

  return parser.parse(response.data);
}
