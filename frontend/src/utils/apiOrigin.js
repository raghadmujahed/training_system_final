/** أصل الـ API بدون /api — منفصل لتجنب استيراد دائري مع session/api. */
export function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return String(apiUrl).replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  }
  return "http://localhost:8000";
}
