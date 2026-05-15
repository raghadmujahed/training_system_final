import { memo } from "react";
import { Inbox } from "lucide-react";

const EmptyState = memo(function EmptyState({
  title = "لا توجد بيانات",
  description = "لا يوجد شيء لعرضه حاليًا.",
  icon: Icon = Inbox,
  action = null,
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-border-strong rounded-[20px] bg-[#fbfcfe]">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 mb-4">
        <Icon size={32} className="text-primary" />
      </div>
      <h4 className="mb-2 text-secondary font-bold text-lg">{title}</h4>
      <p className="m-0 text-text-faint mb-4 max-w-md mx-auto">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
});

export default EmptyState;