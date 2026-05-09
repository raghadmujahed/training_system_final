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
      <div className="section-card border-r-4 border-r-[var(--danger)]">
        <p className="m-0">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {pendingReports.length > 0 && (
        <div
          className="section-card mb-4 bg-[rgba(255,193,7,0.06)] border-[rgba(255,193,7,0.35)]"
        >
          <h4 className="mt-0 flex items-center gap-2">
            <Clock size={20} />
            تقارير بحاجة للمراجعة ({pendingReports.length})
          </h4>
          <div className="flex flex-col gap-[10px]">
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="section-card p-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <FileText size={22} color="var(--warning)" />
                  <div>
                    <strong>{report.template_name}</strong>
                    <div className="text-soft text-[0.9rem]">
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
        <h4 className="mt-0 flex items-center gap-2">
          <FileText size={20} />
          سجل التقارير اليومية
        </h4>

        {success && (
          <div
            className="section-card p-3 mb-3 bg-[rgba(25,135,84,0.08)] border-[rgba(25,135,84,0.25)]"
          >
            <Check size={18} className="align-middle ml-[6px]" />
            تمت العملية بنجاح
          </div>
        )}

        {list.length === 0 ? (
          <div className="text-center p-10 text-soft">
            <FileText size={44} className="mx-auto mb-3 opacity-30" />
            لا يوجد تقارير مسجلة
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((report) => (
              <div
                key={report.id}
                className="section-card p-[14px] flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-[14px]">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
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
                    <div className="mt-[6px] table-actions">
                      <span className="text-soft text-[0.9rem]">
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
          <div className="modal-content max-w-[720px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
      <div className="section-card p-[14px] mb-4 bg-[#f7f9fc]">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={18} />
          <strong>التاريخ:</strong> {report.date}
        </div>
        <span className={`badge-custom ${reportStatusBadge(report.status)}`}>{report.status_label}</span>
        {report.reviewed_at && (
          <div className="text-soft mt-2 text-[0.9rem]">
            تمت المراجعة: {report.reviewed_at}
          </div>
        )}
      </div>

      <h4>محتوى التقرير</h4>
      {fields.length === 0 ? (
        <p className="text-soft">لا يوجد محتوى مفصل</p>
      ) : (
        fields.map((field) => (
          <div key={field.name} className="mb-[14px] pb-[14px] border-b border-[var(--border)]">
            <div className="form-label-custom">{field.label}</div>
            <div className="section-card p-3 mt-[6px]">
              {content[field.name] ?? "—"}
            </div>
          </div>
        ))
      )}

      {report.attachments?.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-2">
            <Paperclip size={18} />
            المرفقات
          </h4>
          {report.attachments.map((attachment) => (
            <div key={attachment.id} className="section-card p-[10px] mt-2">
              {attachment.name}
            </div>
          ))}
        </div>
      )}

      {report.supervisor_comment && (
        <div
          className="section-card mt-4 bg-amber-100 border-amber-200"
        >
          <h4 className="flex items-center gap-2 mt-0">
            <MessageSquare size={18} />
            ملاحظات المشرف
          </h4>
          <p className="m-0">{report.supervisor_comment}</p>
        </div>
      )}

      {canReview && (
        <div className="mt-5 pt-5 border-t border-[var(--border)]">
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
          <div className="table-actions mt-3">
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
            <p className="form-error-text mt-2">
              يجب إضافة ملاحظة قبل إعادة التقرير للتعديل
            </p>
          )}
        </div>
      )}
    </div>
  );
}
