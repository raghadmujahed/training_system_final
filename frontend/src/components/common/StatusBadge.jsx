import { memo } from "react";

const statusMap = {
  active: "bg-success/12 text-success",
  pending: "bg-warning/12 text-warning",
  approved: "bg-primary/10 text-secondary",
  rejected: "bg-danger/12 text-danger",
  draft: "bg-[#f3f6fa] text-text-soft border border-border",
};

const StatusBadge = memo(function StatusBadge({ label, status = "pending" }) {
  const badgeClass = statusMap[status] || "bg-[#f3f6fa] text-text-soft border border-border";
  return (
    <span className={`inline-flex items-center justify-center gap-1.5 min-h-[30px] px-3 rounded-full text-[0.84rem] font-extrabold ${badgeClass}`}>
      {label}
    </span>
  );
});

export default StatusBadge;