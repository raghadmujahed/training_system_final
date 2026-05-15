import { apiOrigin } from "../services/api";

/**
 * يُوحّد رابط الصورة الشخصية ليعمل محلياً وعلى Railway/Vercel (نفس أصل الـ API).
 */
export function resolveAvatarUrl(url) {
  if (url == null || url === "") return null;

  const raw = String(url).trim();
  if (!raw) return null;

  const base = String(apiOrigin || "").replace(/\/+$/, "");
  if (!base) return raw;

  if (raw.startsWith("/storage/")) {
    return `${base}${raw}`;
  }
  if (raw.startsWith("storage/")) {
    return `${base}/storage/${raw.slice("storage/".length)}`;
  }

  try {
    const parsed = raw.startsWith("http") ? new URL(raw) : new URL(raw, base);
    const apiHost = new URL(base).host;

    if (parsed.pathname.startsWith("/storage/")) {
      return `${base}${parsed.pathname}${parsed.search || ""}`;
    }

    const storageIdx = parsed.pathname.indexOf("/storage/");
    if (storageIdx !== -1) {
      const storagePath = parsed.pathname.slice(storageIdx);
      return `${base}${storagePath}${parsed.search || ""}`;
    }

    if (parsed.host && parsed.host !== apiHost) {
      return `${base}${parsed.pathname}${parsed.search || ""}`;
    }

    return parsed.href;
  } catch {
    return raw;
  }
}
