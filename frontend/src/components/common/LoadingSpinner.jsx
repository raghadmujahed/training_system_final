import { memo } from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner = memo(function LoadingSpinner({ size = "section", text, className = "" }) {
  const sizeMap = {
    page: { icon: 40, gap: 12, padding: "py-20 px-5", textFontSize: "text-[0.95rem]" },
    section: { icon: 28, gap: 8, padding: "py-10 px-5", textFontSize: "text-[0.88rem]" },
    inline: { icon: 18, gap: 6, padding: "", textFontSize: "text-[0.82rem]" },
    button: { icon: 16, gap: 0, padding: "", textFontSize: "text-inherit" },
  };

  const cfg = sizeMap[size] || sizeMap.section;
  const isPageOrSection = size === "page" || size === "section";

  return (
    <div
      className={`flex ${isPageOrSection ? "flex-col" : "flex-row"} items-center justify-center ${cfg.padding} gap-[var(--gap)] text-text-faint ${className}`}
      style={{ gap: cfg.gap }}
    >
      <Loader2
        size={cfg.icon}
        className="animate-spin text-primary"
      />
      {text && (
        <span className={`${cfg.textFontSize} text-text-faint`}>
          {text}
        </span>
      )}
    </div>
  );
});

export default LoadingSpinner;
