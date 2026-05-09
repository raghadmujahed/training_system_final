import { memo } from "react";

/**
 * Unified Page Header - Consistent across all pages
 * Matches TrainingRequest page hero style
 */
const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  icon: Icon,
  smallIcon: SmallIcon,
  iconBg = "bg-white/20",
  iconSize = 26,
  className = "",
}) {
  return (
    <div
      className={`bg-gradient-to-br from-[#1e3a5f] via-[#2d5f8a] to-[#3b82f6] rounded-[20px] py-7 px-10 text-white mb-6 shadow-[0_8px_32px_rgba(30,58,95,0.3)] flex items-center gap-4 relative overflow-hidden min-h-[100px] ${className}`}
    >
      {/* Decorative radial gradient */}
      <div
        className="absolute -top-[30%] -left-[8%] w-[200px] h-[200px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }}
      />

      {Icon && (
        <div
          className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 ${iconBg}`}
        >
          <Icon size={iconSize} />
        </div>
      )}

      <div className="flex flex-col gap-1 relative z-10">
        <h1 className="m-0 text-[1.4rem] font-extrabold text-white leading-tight">{title}</h1>
        {subtitle && (
          <p className="m-0 text-[0.92rem] text-white/90 flex items-center gap-[5px]">
            {SmallIcon && <SmallIcon size={13} />}
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
});

export default PageHeader;