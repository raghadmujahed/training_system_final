import { apiClient } from "../services/api";

async function parseBlobError(error) {
  const data = error?.response?.data;
  if (!(data instanceof Blob)) {
    return error?.response?.data?.message || error?.message || "تعذر فتح الملف";
  }

  try {
    const text = await data.text();
    const json = JSON.parse(text);
    return json?.message || "تعذر فتح الملف";
  } catch {
    return "تعذر فتح الملف (404)";
  }
}

/**
 * فتح/تحميل مرفق مدخل ملف الإنجاز عبر API (مع Bearer) — يعمل على Railway/Vercel.
 */
export async function openPortfolioEntryFile(entryId, suggestedName = "portfolio-file") {
  if (!entryId) {
    throw new Error("معرّف المدخل غير متوفر");
  }

  const paths = [
    `/student/portfolio/entries/${entryId}/file`,
    `/portfolio-entries/${entryId}/file`,
  ];

  let lastError = null;

  for (const path of paths) {
    try {
      const res = await apiClient.get(path, { responseType: "blob" });

      const contentType = res.headers["content-type"] || "application/octet-stream";

      if (contentType.includes("application/json")) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json?.message || "تعذر فتح الملف");
      }
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");

      if (!opened) {
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    } catch (error) {
      lastError = error;
      if (error?.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  const message = await parseBlobError(lastError);
  const err = new Error(message);
  err.cause = lastError;
  throw err;
}
