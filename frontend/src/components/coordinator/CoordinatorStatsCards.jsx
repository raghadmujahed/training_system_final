import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Building2,
  Heart,
  FileCheck,
  FileX,
} from "lucide-react";

const iconMap = {
  pending_review: Clock,
  prelim_approved: CheckCircle2,
  needs_edit: AlertTriangle,
  open_batches: FileCheck,
  sent_education: Building2,
  sent_health: Heart,
  approved_by_body: CheckCircle2,
  rejected: XCircle,
  rejected_by_body: FileX,
  sent_batches: Send,
};

const variantStyles = {
  warning: { border: "border-r-warning", bg: "bg-warning/8", icon: "text-warning" },
  success: { border: "border-r-success", bg: "bg-success/8", icon: "text-success" },
  info: { border: "border-r-info", bg: "bg-info/8", icon: "text-info" },
  primary: { border: "border-r-primary", bg: "bg-primary/8", icon: "text-primary" },
  danger: { border: "border-r-danger", bg: "bg-danger/8", icon: "text-danger" },
  accent: { border: "border-r-accent", bg: "bg-accent/8", icon: "text-accent" },
};

export default function CoordinatorStatsCards({
  pendingReview = 0,
  prelimApproved = 0,
  needsEdit = 0,
  sentToEducation = 0,
  approvedByBody = 0,
  rejectedByBody = 0,
  sentBatches = 0,
}) {
  const cards = [
    {
      key: "pending_review",
      label: "بانتظار مراجعة المنسق",
      value: pendingReview,
      variant: "warning",
      link: "/coordinator/training-requests",
    },
    {
      key: "prelim_approved",
      label: "معتمد مبدئيًا",
      value: prelimApproved,
      variant: "success",
      link: "/coordinator/distribution",
    },
    {
      key: "needs_edit",
      label: "بحاجة تعديل",
      value: needsEdit,
      variant: "info",
      link: "/coordinator/training-requests",
    },
    {
      key: "sent_education",
      label: "مرسل إلى التربية",
      value: sentToEducation,
      variant: "primary",
      link: "/coordinator/distribution-status",
    },
    {
      key: "approved_by_body",
      label: "تم قبولها من الجهة",
      value: approvedByBody,
      variant: "success",
      link: "/coordinator/distribution-status",
    },
    {
      key: "rejected_by_body",
      label: "مرفوضة من الجهة",
      value: rejectedByBody,
      variant: "danger",
      link: "/coordinator/distribution-status",
    },
    {
      key: "sent_batches",
      label: "دفعات مرسلة",
      value: sentBatches,
      variant: "info",
      link: "/coordinator/official-letters",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
      {cards.map((c) => {
        const Icon = iconMap[c.key] || Clock;
        const vs = variantStyles[c.variant] || variantStyles.info;
        return (
          <Link key={c.key} to={c.link} className="no-underline">
            <div className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[16px] p-4 border-r-4 ${vs.border} hover:shadow-sm transition-shadow`}>
              <div className={`w-9 h-9 rounded-[9px] ${vs.bg} flex items-center justify-center ${vs.icon} mb-2`}>
                <Icon size={18} />
              </div>
              <div className="text-[1.5rem] font-extrabold text-secondary leading-tight">{c.value}</div>
              <div className="text-text-faint text-[0.78rem] font-bold mt-1">{c.label}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
