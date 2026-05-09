import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  ClipboardList,
  Layers,
  FileText,
  Send,
  Settings2,
  Lightbulb,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useCoordinatorDashboard from "../../hooks/useCoordinatorDashboard";
import { CoordinatorStatsCards } from "../../components/coordinator";
import { STATUS_LABELS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import EmptyState from "../../components/common/EmptyState";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";
import PageHeader from "../../components/common/PageHeader";

const BATCH_STATUS_LABELS = {
  draft: "مسودة",
  sent: "مُرسلة",
  approved: "مقبولة",
  rejected: "مرفوضة",
};

export default function CoordinatorDashboard() {
  const {
    loading,
    error,
    recentRequests,
    recentBatches,
    pendingReview,
    prelimApproved,
    openBatches,
    needsEdit,
    rejectedRequests,
    sentToEducation,
    approvedByBody,
    rejectedByBody,
  } = useCoordinatorDashboard();

  const sentBatches = recentBatches.filter((b) => b.status === "sent").length;

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل لوحة التحكم..." />
    );
  }

  return (
    <>
      <PageHeader title="مساحة عمل المنسق" subtitle="متابعة طلبات التدريب، التوزيع، والدفعات المرسلة للجهات الرسمية." icon={Settings2} />

      {error && (
        <div className="bg-danger/8 border border-danger/20 text-danger rounded-[16px] p-4 mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}

      <CoordinatorPsychologyReadOnlyNotice />

      {/* Stats Cards */}
      <CoordinatorStatsCards
        pendingReview={pendingReview}
        prelimApproved={prelimApproved}
        needsEdit={needsEdit}
        openBatches={openBatches}
        sentToEducation={sentToEducation}
        approvedByBody={approvedByBody}
        rejectedRequests={rejectedRequests}
        rejectedByBody={rejectedByBody}
        sentBatches={sentBatches}
      />

      {/* Quick Actions */}
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-[10px] bg-warning/12 flex items-center justify-center text-warning">
            <Lightbulb size={20} />
          </div>
          <h4 className="m-0 text-secondary font-extrabold text-[1.05rem]">إجراءات سريعة</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.88rem] no-underline hover:bg-primary/8 transition-colors" to="/coordinator/training-requests">
            <ClipboardList size={22} className="text-primary" />
            <span>مراجعة الطلبات</span>
          </Link>
          <Link className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.88rem] no-underline hover:bg-accent/8 transition-colors" to="/coordinator/distribution">
            <Layers size={22} className="text-accent" />
            <span>التوزيع والدفعات</span>
          </Link>
          <Link className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.88rem] no-underline hover:bg-info/8 transition-colors" to="/coordinator/official-letters">
            <FileText size={22} className="text-info" />
            <span>دفعات طلبات التدريب</span>
          </Link>
          <Link className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.88rem] no-underline hover:bg-success/8 transition-colors" to="/coordinator/distribution-status">
            <Send size={22} className="text-success" />
            <span>حالة التوزيع</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4">
        {/* Recent Training Requests */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-[10px] bg-primary/8 flex items-center justify-center text-primary">
                <ClipboardList size={20} />
              </div>
              <h4 className="m-0 text-secondary font-extrabold text-[1.05rem]">أحدث طلبات التدريب</h4>
            </div>
            <Link
              to="/coordinator/training-requests"
              className="flex items-center gap-1 text-[0.85rem] text-info font-semibold no-underline hover:underline"
            >
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <EmptyState title="لا توجد طلبات" description="لم ترد طلبات تدريب بعد." />
          ) : (
            <div className="flex flex-col gap-3">
              {recentRequests.slice(0, 3).map((r) => {
                const s0 = r.students?.[0];
                const title =
                  s0?.user?.name || r.requested_by?.name || `طلب #${r.id}`;
                const site = r.training_site?.name || "—";
                const statusLabel =
                  STATUS_LABELS[r.book_status] || r.book_status;
                const statusColor =
                  r.book_status === "pending_coordinator_review" ? "var(--warning)" :
                  r.book_status === "prelim_approved" ? "var(--success)" :
                  r.book_status === "needs_edit" ? "var(--info)" :
                  r.book_status === "rejected" ? "var(--danger)" : "var(--text-soft)";
                return (
                  <div key={r.id} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h6 className="m-0 text-text font-bold text-[0.95rem]">
                        {title} — {site}
                      </h6>
                      <span
                        className="text-[0.78rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                        style={{ background: `${statusColor}18`, color: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-text-faint text-[0.82rem]">
                      {r.governing_body && (
                        <span>{getGoverningBodyLabel(r.governing_body)} · </span>
                      )}
                      {r.requested_at &&
                        new Date(r.requested_at).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Batches */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[10px] bg-accent/8 flex items-center justify-center text-accent">
                  <Layers size={20} />
                </div>
                <h4 className="m-0 text-secondary font-extrabold text-[1.05rem]">أحدث الدفعات</h4>
              </div>
              <Link
                to="/coordinator/official-letters"
                className="flex items-center gap-1 text-[0.85rem] text-info font-semibold no-underline hover:underline"
              >
                عرض الكل <ArrowLeft size={14} />
              </Link>
            </div>
            {recentBatches.length === 0 ? (
              <EmptyState title="لا توجد دفعات" description="لم تُنشأ دفعات بعد." />
            ) : (
              <div className="flex flex-col gap-3">
                {recentBatches.slice(0, 3).map((b) => {
                  const bStatusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const bStatusColor =
                    b.status === "sent" ? "var(--info)" :
                    b.status === "approved" ? "var(--success)" :
                    b.status === "rejected" ? "var(--danger)" : "var(--text-soft)";
                  return (
                    <div key={b.id} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h6 className="m-0 text-text font-bold text-[0.95rem]">دفعة #{b.id}</h6>
                        <span
                          className="text-[0.78rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                          style={{ background: `${bStatusColor}18`, color: bStatusColor }}
                        >
                          {bStatusLabel}
                        </span>
                      </div>
                      <p className="m-0 text-text-soft text-[0.88rem]">
                        {getGoverningBodyLabel(b.governing_body)}
                        {b.directorate ? ` — ${b.directorate}` : ""}
                      </p>
                      <div className="text-text-faint text-[0.82rem]">
                        {b.items_count ?? 0} طلب
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </>
  );
}
