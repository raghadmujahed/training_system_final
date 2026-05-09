import { memo } from "react";

const PageHeader = memo(function PageHeader({ title, subtitle, icon: Icon, background }) {
  return (
    <div
      className="rounded-[14px] px-6 py-5 text-white mb-6 flex items-center gap-3.5 relative overflow-hidden"
      style={{ background: background || "var(--primary)" }}
    >
      <div
        className="absolute -top-[30%] -left-[8%] w-[200px] h-[200px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }}
      />
      {Icon && (
        <div className="w-11 h-11 rounded-[10px] bg-white/12 text-white flex items-center justify-center shrink-0">
          <Icon size={22} />
        </div>
      )}
      <div>
        <h1 className="m-0 text-[1.1rem] font-bold text-white">{title}</h1>
        {subtitle && <p className="m-0 mt-0.5 text-[0.85rem] text-white/70">{subtitle}</p>}
      </div>
    </div>
  );
});

export default PageHeader;