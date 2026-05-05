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
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Settings2 size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">مساحة عمل المنسق</h1>
            <p className="hero-subtitle">
              متابعة طلبات التدريب، التوزيع، والدفعات المرسلة للجهات الرسمية.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p style={{ margin: 0 }}>{error}</p>
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
      <div className="section-card mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="section-icon">
            <Lightbulb size={20} />
          </div>
          <h4 style={{ margin: 0 }}>إجراءات سريعة</h4>
        </div>
        <div className="quick-actions-grid">
          <Link className="quick-action-btn" to="/coordinator/training-requests">
            <ClipboardList size={22} style={{ color: "var(--primary)" }} />
            <span>مراجعة الطلبات</span>
          </Link>
          <Link className="quick-action-btn" to="/coordinator/distribution">
            <Layers size={22} style={{ color: "var(--accent)" }} />
            <span>التوزيع والدفعات</span>
          </Link>
          <Link className="quick-action-btn" to="/coordinator/official-letters">
            <FileText size={22} style={{ color: "var(--info)" }} />
            <span>دفعات طلبات التدريب</span>
          </Link>
          <Link className="quick-action-btn" to="/coordinator/distribution-status">
            <Send size={22} style={{ color: "var(--success)" }} />
            <span>حالة التوزيع</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Recent Training Requests */}
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="section-icon">
                <ClipboardList size={20} />
              </div>
              <h4 style={{ margin: 0 }}>أحدث طلبات التدريب</h4>
            </div>
            <Link
              to="/coordinator/training-requests"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem", color: "var(--info)", fontWeight: 600 }}
            >
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <EmptyState title="لا توجد طلبات" description="لم ترد طلبات تدريب بعد." />
          ) : (
            <div className="activity-list">
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
                  <div className="activity-item" key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <h6 style={{ margin: 0 }}>
                        {title} — {site}
                      </h6>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          padding: "2px 10px",
                          borderRadius: 99,
                          background: `${statusColor}18`,
                          color: statusColor,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="activity-meta">
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
        <div className="section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="section-icon">
                  <Layers size={20} />
                </div>
                <h4 style={{ margin: 0 }}>أحدث الدفعات</h4>
              </div>
              <Link
                to="/coordinator/official-letters"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem", color: "var(--info)", fontWeight: 600 }}
              >
                عرض الكل <ArrowLeft size={14} />
              </Link>
            </div>
            {recentBatches.length === 0 ? (
              <EmptyState title="لا توجد دفعات" description="لم تُنشأ دفعات بعد." />
            ) : (
              <div className="activity-list">
                {recentBatches.slice(0, 3).map((b) => {
                  const bStatusLabel = BATCH_STATUS_LABELS[b.status] || b.status;
                  const bStatusColor =
                    b.status === "sent" ? "var(--info)" :
                    b.status === "approved" ? "var(--success)" :
                    b.status === "rejected" ? "var(--danger)" : "var(--text-soft)";
                  return (
                    <div className="activity-item" key={b.id}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <h6 style={{ margin: 0 }}>دفعة #{b.id}</h6>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: 99,
                            background: `${bStatusColor}18`,
                            color: bStatusColor,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {bStatusLabel}
                        </span>
                      </div>
                      <p style={{ margin: 0 }}>
                        {getGoverningBodyLabel(b.governing_body)}
                        {b.directorate ? ` — ${b.directorate}` : ""}
                      </p>
                      <div className="activity-meta">
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
