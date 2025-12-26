export const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  console.warn("VITE_API_BASE_URL is missing");
}
