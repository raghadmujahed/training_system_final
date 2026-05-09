import { memo } from "react";
import { Inbox } from "lucide-react";

const EmptyState = memo(function EmptyState({
  title = "لا توجد بيانات",
  description = "لا يوجد شيء لعرضه حاليًا.",
  icon: Icon = Inbox,
}) {
  return (
    <div className="text-center py-10 px-5 border border-dashed border-border-strong rounded-[20px] bg-[#fbfcfe]">
      <Icon size={36} className="mx-auto mb-3 text-text-faint" />
      <h4 className="mb-2 text-secondary font-bold">{title}</h4>
      <p className="m-0 text-text-faint">{description}</p>
    </div>
  );
});

export default EmptyState;