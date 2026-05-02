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
        style={{
          height,
          maxWidth,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 14px",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <strong style={{ fontSize: "0.95rem", color: "#0f172a", letterSpacing: "0.02em" }}>وزارة الصحة</strong>
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        maxWidth,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        borderRadius: 10,
        padding: "6px 12px",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
      title="وزارة الصحة الفلسطينية"
    >
      <img
        src="/branding/ministry-health.jpg"
        alt="وزارة الصحة"
        style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
