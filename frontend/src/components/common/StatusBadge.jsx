import { memo } from "react";

const statusMap = {
  active: "badge-success",
  pending: "badge-warning",
  approved: "badge-primary",
};

const StatusBadge = memo(function StatusBadge({ label, status = "pending" }) {
  const badgeClass = statusMap[status] || "badge-soft";
  return <span className={`badge-custom ${badgeClass}`}>{label}</span>;
});

export default StatusBadge;