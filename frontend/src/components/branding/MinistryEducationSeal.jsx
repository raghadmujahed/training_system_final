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
      className="moe-seal shrink-0 rounded-full border border-[rgba(30,58,95,0.15)] bg-gradient-to-br from-[#fafafa] to-[#f1f5f9] flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
      title="وزارة التربية والتعليم — دولة فلسطين"
    >
      {src ? (
        <img
          src={src}
          alt="وزارة التربية والتعليم"
          className="w-[92%] h-[92%] object-contain"
          onError={() => setStage((s) => s + 1)}
        />
      ) : (
        <span
          className="font-black text-[#1e3a5f] font-[system-ui,sans-serif]"
          style={{ fontSize: Math.max(14, size * 0.32) }}
        >
          م.ت
        </span>
      )}
    </div>
  );
}
