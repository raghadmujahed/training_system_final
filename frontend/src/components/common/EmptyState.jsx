import { memo } from "react";
import { Inbox } from "lucide-react";

const EmptyState = memo(function EmptyState({
  title = "لا توجد بيانات",
  description = "لا يوجد شيء لعرضه حاليًا.",
  icon: Icon = Inbox,
  action = null,
  compact = false,
}) {
  return (
    <div
      className={`text-center border border-dashed border-border-strong bg-[#fbfcfe] ${
        compact ? "py-5 px-4 rounded-[14px]" : "py-12 px-6 rounded-[20px]"
      }`}
    >
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 ${
          compact ? "w-11 h-11 mb-2" : "w-16 h-16 mb-4"
        }`}
      >
        <Icon size={compact ? 22 : 32} className="text-primary" />
      </div>
      <h4 className={`text-secondary font-bold ${compact ? "mb-1 text-base" : "mb-2 text-lg"}`}>{title}</h4>
      <p className={`m-0 text-text-faint max-w-md mx-auto ${compact ? "text-sm mb-2" : "mb-4"}`}>
        {description}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
});

export default EmptyState;
