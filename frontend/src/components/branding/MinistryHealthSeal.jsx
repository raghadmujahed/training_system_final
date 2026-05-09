import { useState } from "react";

/**
 * شعار وزارة الصحة — ضع الملف الرسمي في:
 *   frontend/public/branding/ministry-health.jpg
 */
export default function MinistryHealthSeal({ height = 52, maxWidth = 240 }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        title="وزارة الصحة"
        className="shrink-0 flex items-center justify-center py-2 px-[14px] bg-[rgba(255,255,255,0.95)] rounded-[10px] border border-[rgba(0,0,0,0.08)]"
        style={{ height, maxWidth }}
      >
        <strong className="text-[0.95rem] text-[#0f172a] tracking-[0.02em]">وزارة الصحة</strong>
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center bg-white rounded-[10px] py-[6px] px-3 border border-[rgba(0,0,0,0.08)]"
      style={{ height, maxWidth }}
      title="وزارة الصحة الفلسطينية"
    >
      <img
        src="/branding/ministry-health.jpg"
        alt="وزارة الصحة"
        className="max-h-full max-w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
