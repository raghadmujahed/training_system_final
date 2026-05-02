import { useState } from "react";

/**
 * شعار وزارة التربية والتعليم — ضع الملف الرسمي في:
 *   frontend/public/branding/ministry-education.png
 * بدون هذا الملف يُستخدم الاحتياطي moe-seal.svg ثم اختصار نصي.
 */
export default function MinistryEducationSeal({ size = 56 }) {
  const [stage, setStage] = useState(0);
  const src =
    stage === 0 ? "/branding/ministry-education.png" : stage === 1 ? "/branding/moe-seal.svg" : null;

  return (
    <div
      className="moe-seal"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        border: "1px solid rgba(30, 58, 95, 0.15)",
        background: "linear-gradient(145deg, #fafafa 0%, #f1f5f9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      title="وزارة التربية والتعليم — دولة فلسطين"
    >
      {src ? (
        <img
          src={src}
          alt="وزارة التربية والتعليم"
          style={{ width: "92%", height: "92%", objectFit: "contain" }}
          onError={() => setStage((s) => s + 1)}
        />
      ) : (
        <span
          style={{
            fontWeight: 900,
            fontSize: Math.max(14, size * 0.32),
            color: "#1e3a5f",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          م.ت
        </span>
      )}
    </div>
  );
}
