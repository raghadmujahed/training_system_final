import { useEffect, useState } from "react";
import { X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import StatusBadge from "./StatusBadge";
import { COORDINATOR_DECISIONS } from "../../config/coordinator/workflowSteps";
import { GOVERNING_BODIES } from "../../config/coordinator/governingBodies";

export default function RequestReviewDrawer({
  request,
  open,
  onClose,
  onReview,
  saving,
  sites = [],
  initialDecision = "",
  initialReason = "",
}) {
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");

  // مزامنة الحقول عند فتح الدروer أو تغيّر الطلب — نمط معتاد مع حقول متحكم بها محلياً
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    setDecision(initialDecision || "");
    setReason(initialReason || "");
    setSelectedSiteId("");
  }, [open, request?.id, initialDecision, initialReason]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open || !request) return null;

  const s0 = request.students?.[0];
  const studentName = s0?.user?.name || request.requested_by?.name || "—";
  const universityId = s0?.user?.university_id || "—";
  const courseName = s0?.course?.name || "—";
  const periodName = request.training_period?.name || "—";
  const siteName = request.training_site?.name || "—";
  const governingBody = request.governing_body || "—";
  const attachments = request.attachments || [];
  const notes = request.coordinator_notes || request.notes || [];

  const handleSubmit = () => {
    if (!decision) return;
    onReview(request.id, decision, decision !== "prelim_approved" ? reason : null);
    setDecision("");
    setReason("");
    setSelectedSiteId("");
  };

  const handleClose = () => {
    setDecision("");
    setReason("");
    setSelectedSiteId("");
    onClose();
  };

  const decisionIcons = {
    prelim_approved: <CheckCircle2 size={16} />,
    rejected: <XCircle size={16} />,
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1000,
          }}
          onClick={handleClose}
        />
      )}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 95vw)",
          background: "#fff",
          zIndex: 1001,
          overflowY: "auto",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            مراجعة طلب #{request.id}
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            <X size={22} />
          </button>
        </div>

        <div className="info-grid" style={{ marginBottom: 20 }}>
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <span style={{ color: "#fff", fontWeight: 800 }}>{studentName?.[0] || "؟"}</span>
            </div>
            <div className="info-content">
              <div className="info-label">الطالب</div>
              <div className="info-value">{studentName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper accent">
              <span style={{ color: "#fff", fontWeight: 800 }}>#</span>
            </div>
            <div className="info-content">
              <div className="info-label">الرقم الجامعي</div>
              <div className="info-value">{universityId}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper success">
              <span style={{ color: "#fff", fontWeight: 800 }}>📚</span>
            </div>
            <div className="info-content">
              <div className="info-label">المساق</div>
              <div className="info-value">{courseName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper info">
              <span style={{ color: "#fff", fontWeight: 800 }}>📅</span>
            </div>
            <div className="info-content">
              <div className="info-label">الفترة التدريبية</div>
              <div className="info-value">{periodName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper warning">
              <span style={{ color: "#fff", fontWeight: 800 }}>🏫</span>
            </div>
            <div className="info-content">
              <div className="info-label">جهة التدريب</div>
              <div className="info-value">{siteName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <span style={{ color: "#fff", fontWeight: 800 }}>🏛</span>
            </div>
            <div className="info-content">
              <div className="info-label">الجهة الرسمية</div>
              <div className="info-value">
                {GOVERNING_BODIES.find((b) => b.value === governingBody)?.label || governingBody}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>الحالة:</strong>{" "}
          <StatusBadge status={request.book_status} size="lg" />
        </div>

        {attachments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <strong>المرفقات:</strong>
            <ul style={{ marginTop: 6, paddingRight: 18 }}>
              {attachments.map((a, i) => (
                <li key={i}>
                  <a href={a.url || "#"} target="_blank" rel="noreferrer">
                    {a.name || `مرفق ${i + 1}`}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <strong>ملاحظات سابقة:</strong>
            <div
              style={{
                background: "#f8f9fa",
                borderRadius: 8,
                padding: 12,
                marginTop: 6,
              }}
            >
              {notes.map((n, i) => (
                <p key={i} style={{ margin: "4px 0", fontSize: "0.9rem" }}>
                  {n.content || n}
                </p>
              ))}
            </div>
          </div>
        )}

        <hr style={{ margin: "20px 0" }} />

        <div style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 700 }}>
            القرار
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COORDINATOR_DECISIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDecision(d.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border:
                    decision === d.value
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                  background:
                    decision === d.value ? "var(--primary)" : "#fff",
                  color: decision === d.value ? "#fff" : "var(--secondary)",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {decisionIcons[d.value]}
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {decision && decision !== "prelim_approved" && (
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              {decision === "rejected" ? "سبب الرفض (اختياري)" : "سبب طلب التعديل"}
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                decision === "rejected"
                  ? "اكتب سبب الرفض..."
                  : "اكتب الملاحظات المطلوبة..."
              }
            />
          </div>
        )}

        {decision === "prelim_approved" && (
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              اقتراح/اختيار جهة تدريب (اختياري)
            </label>
            <select
              className="form-select"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">بدون تغيير</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button
            className="btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!decision || saving}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <LoadingSpinner size="button" />}
            تأكيد القرار
          </button>
        </div>
      </div>
    </>
  );
}
