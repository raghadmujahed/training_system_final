import { STATUS_LABELS, STATUS_COLORS } from "../../config/coordinator/statusLabels";

export default function StatusBadge({ status, size = "sm" }) {
  const label = STATUS_LABELS[status] || status;
  const colors = STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };

  const sizeClass = size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-block whitespace-nowrap font-bold rounded-md ${sizeClass}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
