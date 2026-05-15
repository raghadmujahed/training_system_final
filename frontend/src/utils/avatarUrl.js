import { getApiOrigin } from "./apiOrigin";

/**
 * يُوحّد رابط الصورة الشخصية ليعمل محلياً وعلى Railway/Vercel (نفس أصل الـ API).
 */
export function resolveAvatarUrl(url) {
  if (url == null || url === "") return null;

  const raw = String(url).trim();
  if (!raw) return null;

  const base = getApiOrigin();
  if (!base) return raw;

  if (raw.startsWith("/api/avatars/")) {
    return `${base}${raw}`;
  }
  if (raw.startsWith("api/avatars/")) {
    return `${base}/${raw}`;
  }

  if (raw.startsWith("/storage/")) {
    const diskPath = raw.slice("/storage/".length);
    return `${base}/api/avatars/${diskPath}`;
  }
  if (raw.startsWith("storage/")) {
    return `${base}/api/avatars/${raw.slice("storage/".length)}`;
  }

  try {
    const parsed = raw.startsWith("http") ? new URL(raw) : new URL(raw, base);
    const apiHost = new URL(base).host;

    if (parsed.pathname.startsWith("/api/avatars/")) {
      return `${base}${parsed.pathname}${parsed.search || ""}`;
    }

    if (parsed.pathname.startsWith("/storage/")) {
      const diskPath = parsed.pathname.slice("/storage/".length);
      return `${base}/api/avatars/${diskPath}${parsed.search || ""}`;
    }

    const storageIdx = parsed.pathname.indexOf("/storage/");
    if (storageIdx !== -1) {
      const diskPath = parsed.pathname.slice(storageIdx + "/storage/".length);
      return `${base}/api/avatars/${diskPath}${parsed.search || ""}`;
    }

    const avatarsIdx = parsed.pathname.indexOf("/api/avatars/");
    if (avatarsIdx !== -1) {
      return `${base}${parsed.pathname.slice(avatarsIdx)}${parsed.search || ""}`;
    }

    if (parsed.host && parsed.host !== apiHost) {
      return resolveAvatarUrl(parsed.pathname + (parsed.search || ""));
    }

    return parsed.href;
  } catch {
    return raw;
  }
}
