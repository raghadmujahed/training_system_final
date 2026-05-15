import { Link } from "react-router-dom";
import {
  ArrowLeft,
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
    <div className="mx-auto w-full max-w-[1280px] min-w-0 space-y-3 sm:space-y-4">
      <PageHeader title="مساحة عمل المنسق" subtitle="متابعة طلبات التدريب، التوزيع، والدفعات المرسلة للجهات الرسمية." icon={Settings2} />

      {error && (
        <div className="bg-danger/8 border border-danger/20 text-danger rounded-[12px] p-3 mb-0">
          <p className="m-0 text-[0.9rem]">{error}</p>
        </div>
      )}

      <CoordinatorPsychologyReadOnlyNotice />

      <div className="coordinator-dashboard space-y-3 sm:space-y-4 min-w-0 overflow-x-hidden">
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
      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[14px] p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[8px] bg-warning/12 flex items-center justify-center text-warning shrink-0">
            <Lightbulb size={18} />
          </div>
          <h4 className="m-0 text-secondary font-extrabold text-[1rem] leading-tight">إجراءات سريعة</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 auto-rows-fr">
          <Link className="flex flex-col items-center justify-center gap-1 min-h-0 py-2.5 px-2 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.8rem] sm:text-[0.82rem] text-center leading-snug no-underline hover:bg-primary/8 transition-colors" to="/coordinator/training-requests">
            <ClipboardList size={20} className="text-primary shrink-0" />
            <span className="line-clamp-2">مراجعة الطلبات</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 min-h-0 py-2.5 px-2 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.8rem] sm:text-[0.82rem] text-center leading-snug no-underline hover:bg-accent/8 transition-colors" to="/coordinator/distribution">
            <Layers size={20} className="text-accent shrink-0" />
            <span className="line-clamp-2">التوزيع والدفعات</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 min-h-0 py-2.5 px-2 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.8rem] sm:text-[0.82rem] text-center leading-snug no-underline hover:bg-info/8 transition-colors" to="/coordinator/official-letters">
            <FileText size={20} className="text-info shrink-0" />
            <span className="line-clamp-2">دفعات طلبات التدريب</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 min-h-0 py-2.5 px-2 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] text-text font-bold text-[0.8rem] sm:text-[0.82rem] text-center leading-snug no-underline hover:bg-success/8 transition-colors" to="/coordinator/distribution-status">
            <Send size={20} className="text-success shrink-0" />
            <span className="line-clamp-2">حالة التوزيع</span>
          </Link>
        </div>
      </div>

      {/* Recent lists: side-by-side on large screens */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4">
        {/* Recent Training Requests */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[14px] p-3 sm:p-4 flex-1 min-w-0 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-[8px] bg-primary/8 flex items-center justify-center text-primary shrink-0">
                <ClipboardList size={18} />
              </div>
              <h4 className="m-0 text-secondary font-extrabold text-[1rem] leading-tight truncate">أحدث طلبات التدريب</h4>
            </div>
            <Link
              to="/coordinator/training-requests"
              className="flex items-center gap-1 text-[0.8rem] text-info font-semibold no-underline hover:underline shrink-0"
            >
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border py-4 px-3 text-center bg-[#fbfcfe]/80">
              <p className="m-0 text-[0.85rem] font-semibold text-secondary">لا توجد طلبات</p>
              <p className="m-0 mt-0.5 text-[0.78rem] text-text-faint">لم ترد طلبات تدريب بعد.</p>
            </div>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-col gap-0">
              {recentRequests.slice(0, 3).map((r) => {
                const s0 = r.students?.[0];
                const studentName =
                  s0?.user?.name || r.requested_by?.name || `طلب #${r.id}`;
                const site = r.training_site?.name || "—";
                const statusLabel =
                  STATUS_LABELS[r.book_status] || r.book_status;
                const statusColor =
                  r.book_status === "pending_coordinator_review" ? "var(--warning)" :
                  r.book_status === "prelim_approved" ? "var(--success)" :
                  r.book_status === "needs_edit" ? "var(--info)" :
                  r.book_status === "rejected" ? "var(--danger)" : "var(--text-soft)";
                const dateStr = r.requested_at
                  ? new Date(r.requested_at).toLocaleDateString("ar-SA")
                  : "—";
                return (
                  <li key={r.id} className="border-b border-[#edf2f7] py-2 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-text font-bold text-[0.88rem] leading-snug break-words">{studentName}</div>
                        <div className="text-text-soft text-[0.8rem] leading-snug break-words">{site}</div>
                        <div className="text-text-faint text-[0.76rem] flex flex-wrap gap-x-1.5 gap-y-0 items-baseline">
                          {r.governing_body ? (
                            <span>{getGoverningBodyLabel(r.governing_body)}</span>
                          ) : null}
                          {r.governing_body ? <span className="text-border-strong">·</span> : null}
                          <span>{dateStr}</span>
                        </div>
                      </div>
                      <span
                        className="text-[0.7rem] sm:text-[0.72rem] font-bold px-2 py-0.5 rounded-full shrink-0 self-start max-w-[48%] sm:max-w-[min(40%,12rem)] text-center leading-tight sm:whitespace-nowrap"
                        style={{ background: `${statusColor}18`, color: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Batches */}
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[14px] p-3 sm:p-4 flex-1 min-w-0 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-[8px] bg-accent/8 flex items-center justify-center text-accent shrink-0">
                  <Layers size={18} />
                </div>
                <h4 className="m-0 text-secondary font-extrabold text-[1rem] leading-tight truncate">أحدث الدفعات</h4>
              </div>
              <Link
                to="/coordinator/official-letters"
                className="flex items-center gap-1 text-[0.8rem] text-info font-semibold no-underline hover:underline shrink-0"
              >
                عرض الكل <ArrowLeft size={14} />
              </Link>
            </div>
            {recentBatches.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border py-4 px-3 text-center bg-[#fbfcfe]/80">
                <p className="m-0 text-[0.85rem] font-semibold text-secondary">لا توجد دفعات</p>
                <p className="m-0 mt-0.5 text-[0.78rem] text-text-faint">لم تُنشأ دفعات بعد.</p>
              </div>
            ) : (
              <ul className="m-0 p-0 list-none flex flex-col gap-0">
                {recentBatches.slice(0, 3).map((b) => {
                  const bStatusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const bStatusColor =
                    b.status === "sent" ? "var(--info)" :
                    b.status === "approved" ? "var(--success)" :
                    b.status === "rejected" ? "var(--danger)" : "var(--text-soft)";
                  return (
                    <li key={b.id} className="border-b border-[#edf2f7] py-2 first:pt-0 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-text font-bold text-[0.88rem]">دفعة #{b.id}</div>
                          <p className="m-0 text-text-soft text-[0.8rem] leading-snug break-words">
                            {getGoverningBodyLabel(b.governing_body)}
                            {b.directorate ? ` — ${b.directorate}` : ""}
                          </p>
                          <div className="text-text-faint text-[0.76rem]">{b.items_count ?? 0} طلب</div>
                        </div>
                        <span
                          className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 self-start"
                          style={{ background: `${bStatusColor}18`, color: bStatusColor }}
                        >
                          {bStatusLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      </div>
      </div>
    </div>
  );
}
