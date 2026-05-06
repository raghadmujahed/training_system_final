import { memo } from "react";

const EmptyState = memo(function EmptyState({
  title = "لا توجد بيانات",
  description = "لا يوجد شيء لعرضه حاليًا.",
}) {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
});

export default EmptyState;