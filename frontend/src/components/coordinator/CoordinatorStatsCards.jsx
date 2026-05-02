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
    <div className="dashboard-grid">
      {cards.map((c) => {
        const Icon = iconMap[c.key] || Clock;
        return (
          <Link key={c.key} to={c.link} className="stat-card-link">
            <div className={`stat-card-modern ${c.variant}`}>
              <div className={`stat-icon-modern ${c.variant}`}>
                <Icon size={18} />
              </div>
              <div className="stat-card-body">
                <div className="stat-value-modern">{c.value}</div>
                <div className="stat-title-modern">{c.label}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
