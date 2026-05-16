import { apiClient } from "../services/api";

/**
 * فتح/تحميل ملف تسليم مهمة عبر API (مع Bearer) — يعمل على Railway/Vercel.
 */
export async function openTaskSubmissionFile(submissionId, suggestedName = "solution") {
  if (!submissionId) {
    throw new Error("معرّف التسليم غير متوفر");
  }

  const res = await apiClient.get(`/task-submissions/${submissionId}/file`, {
    responseType: "blob",
  });

  const contentType = res.headers["content-type"] || "application/octet-stream";
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
}
