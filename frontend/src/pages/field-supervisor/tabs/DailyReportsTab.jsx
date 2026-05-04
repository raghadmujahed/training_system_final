import { useState } from "react";
import { useStudentDailyReports, useDailyReport } from "../../../hooks/useFieldSupervisorApi";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Calendar,
  Paperclip,
  Check,
  RotateCcw,
} from "lucide-react";

function reportStatusBadge(status) {
  if (status === "confirmed") return "badge-success";
  if (status === "returned") return "badge-danger";
  if (status === "submitted") return "badge-info";
  return "badge-primary";
}

export default function DailyReportsTab({ studentId }) {
  const { reports, loading, error, refresh } = useStudentDailyReports(studentId);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const list = Array.isArray(reports) ? reports : [];
  const pendingReports = list.filter((r) => r.status === "submitted" || r.status === "under_review");

  const closeDialog = () => {
    setShowReviewDialog(false);
    setReviewComment("");
    setSelectedReportId(null);
  };

  const onReviewSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    refresh();
    closeDialog();
  };

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)" }}>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {pendingReports.length > 0 && (
        <div
          className="section-card"
          style={{ marginBottom: 16, background: "rgba(255, 193, 7, 0.06)", borderColor: "rgba(255, 193, 7, 0.35)" }}
        >
          <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} />
            تقارير بحاجة للمراجعة ({pendingReports.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="section-card"
                style={{
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileText size={22} color="var(--warning)" />
                  <div>
                    <strong>{report.template_name}</strong>
                    <div className="text-soft" style={{ fontSize: "0.9rem" }}>
                      {report.date}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary-custom btn-sm-custom"
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setShowReviewDialog(true);
                  }}
                >
                  <Eye size={16} />
                  مراجعة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-card">
        <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={20} />
          سجل التقارير اليومية
        </h4>

        {success && (
          <div
            className="section-card"
            style={{ padding: 12, marginBottom: 12, background: "rgba(25, 135, 84, 0.08)", borderColor: "rgba(25, 135, 84, 0.25)" }}
          >
            <Check size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            تمت العملية بنجاح
          </div>
        )}

        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }} className="text-soft">
            <FileText size={44} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            لا يوجد تقارير مسجلة
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map((report) => (
              <div
                key={report.id}
                className="section-card"
                style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        report.status === "confirmed"
                          ? "rgba(25, 135, 84, 0.15)"
                          : report.status === "returned"
                            ? "rgba(220, 53, 69, 0.15)"
                            : report.status === "submitted"
                              ? "rgba(13, 110, 253, 0.12)"
                              : "#f7f9fc",
                    }}
                  >
                    {report.status === "confirmed" && <CheckCircle size={22} color="var(--success)" />}
                    {report.status === "returned" && <RotateCcw size={22} color="var(--danger)" />}
                    {report.status === "submitted" && <Clock size={22} color="var(--primary)" />}
                    {!["confirmed", "returned", "submitted"].includes(report.status) && <FileText size={22} />}
                  </div>
                  <div>
                    <strong>{report.template_name}</strong>
                    <div style={{ marginTop: 6 }} className="table-actions">
                      <span className="text-soft" style={{ fontSize: "0.9rem" }}>
                        {report.date}
                      </span>
                      <span className={`badge-custom ${reportStatusBadge(report.status)}`}>{report.status_label}</span>
                      {report.has_attachments && <Paperclip size={16} className="text-soft" />}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={report.can_review ? "btn-primary-custom btn-sm-custom" : "btn-outline-custom btn-sm-custom"}
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setShowReviewDialog(true);
                  }}
                >
                  <Eye size={16} />
                  عرض
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReviewDialog && selectedReportId && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>مراجعة التقرير اليومي</h3>
              <button type="button" className="modal-close-btn" onClick={closeDialog}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ReportReviewBody
                reportId={selectedReportId}
                comment={reviewComment}
                setComment={setReviewComment}
                processing={processing}
                setProcessing={setProcessing}
                onSuccess={onReviewSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportReviewBody({ reportId, comment, setComment, processing, setProcessing, onSuccess }) {
  const { report, loading, confirm, returnForEdit } = useDailyReport(reportId);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await confirm(comment);
      onSuccess();
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!comment.trim()) return;
    setProcessing(true);
    try {
      await returnForEdit(comment);
      onSuccess();
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !report) {
    return <div className="section-card">جاري تحميل التقرير...</div>;
  }

  const template = report.template || {};
  const fields = template.fields || [];
  const content = report.content || {};
  const canReview = report.can_confirm || report.can_return;

  return (
    <div>
      <div className="section-card" style={{ padding: 14, marginBottom: 16, background: "#f7f9fc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Calendar size={18} />
          <strong>التاريخ:</strong> {report.date}
        </div>
        <span className={`badge-custom ${reportStatusBadge(report.status)}`}>{report.status_label}</span>
        {report.reviewed_at && (
          <div className="text-soft" style={{ marginTop: 8, fontSize: "0.9rem" }}>
            تمت المراجعة: {report.reviewed_at}
          </div>
        )}
      </div>

      <h4>محتوى التقرير</h4>
      {fields.length === 0 ? (
        <p className="text-soft">لا يوجد محتوى مفصل</p>
      ) : (
        fields.map((field) => (
          <div key={field.name} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
            <div className="form-label-custom">{field.label}</div>
            <div className="section-card" style={{ padding: 12, marginTop: 6 }}>
              {content[field.name] ?? "—"}
            </div>
          </div>
        ))
      )}

      {report.attachments?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Paperclip size={18} />
            المرفقات
          </h4>
          {report.attachments.map((attachment) => (
            <div key={attachment.id} className="section-card" style={{ padding: 10, marginTop: 8 }}>
              {attachment.name}
            </div>
          ))}
        </div>
      )}

      {report.supervisor_comment && (
        <div
          className="section-card"
          style={{ marginTop: 16, background: "rgba(255, 193, 7, 0.08)", borderColor: "rgba(255, 193, 7, 0.3)" }}
        >
          <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
            <MessageSquare size={18} />
            ملاحظات المشرف
          </h4>
          <p style={{ margin: 0 }}>{report.supervisor_comment}</p>
        </div>
      )}

      {canReview && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <div className="form-field">
            <label className="form-label-custom" htmlFor="review-comment">
              ملاحظات المراجعة
            </label>
            <textarea
              id="review-comment"
              name="review_comment"
              className="form-textarea-custom"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أضف ملاحظاتك هنا..."
            />
          </div>
          <div className="table-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-success-custom btn-sm-custom" onClick={handleConfirm} disabled={processing}>
              <CheckCircle size={16} />
              {processing ? "جاري الحفظ..." : "تأكيد التقرير"}
            </button>
            <button
              type="button"
              className="btn-danger-custom btn-sm-custom"
              onClick={handleReturn}
              disabled={processing || !comment.trim()}
            >
              <XCircle size={16} />
              إعادة للتعديل
            </button>
          </div>
          {!comment.trim() && (
            <p className="form-error-text" style={{ marginTop: 8 }}>
              يجب إضافة ملاحظة قبل إعادة التقرير للتعديل
            </p>
          )}
        </div>
      )}
    </div>
  );
}
