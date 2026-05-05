import { Loader2 } from "lucide-react";

/**
 * مكوّن موحد لمؤشر التحميل في كل النظام
 *
 * @param {'page'|'section'|'inline'|'button'} size - حجم المؤشر
 *   - page: صفحة كاملة (مركزي، كبير)
 *   - section: داخل بطاقة/قسم (متوسط)
 *   - inline: داخل سطر (صغير)
 *   - button: داخل زر (صغير جداً)
 * @param {string} text - نص اختياري يظهر تحت المؤشر
 * @param {string} className - CSS classes إضافية
 */
export default function LoadingSpinner({ size = "section", text, className = "" }) {
  const sizeMap = {
    page: { icon: 40, gap: 12, padding: "80px 20px", textFontSize: "0.95rem" },
    section: { icon: 28, gap: 8, padding: "40px 20px", textFontSize: "0.88rem" },
    inline: { icon: 18, gap: 6, padding: "0", textFontSize: "0.82rem" },
    button: { icon: 16, gap: 0, padding: "0", textFontSize: "inherit" },
  };

  const cfg = sizeMap[size] || sizeMap.section;

  const isPageOrSection = size === "page" || size === "section";

  return (
    <div
      className={`loading-spinner-wrapper ${className}`}
      style={{
        display: "flex",
        flexDirection: isPageOrSection ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        padding: cfg.padding,
        gap: cfg.gap,
        color: "var(--text-faint, #6b7f92)",
      }}
    >
      <Loader2
        size={cfg.icon}
        className="spin"
        style={{ color: "var(--primary, #142a42)" }}
      />
      {text && (
        <span style={{ fontSize: cfg.textFontSize, color: "var(--text-faint, #6b7f92)" }}>
          {text}
        </span>
      )}
    </div>
  );
}
