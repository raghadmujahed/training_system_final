import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useAppToast from "../../hooks/useAppToast";
import {
  getTrainingLogs,
  reviewTrainingLog,
  itemsFromPagedResponse,
} from "../../services/api";

const LOG_STATUS = {
  draft: { label: "مسودة", cls: "badge-secondary" },
  submitted: { label: "مُقدَّم", cls: "badge-info" },
  reviewed: { label: "تمت المراجعة", cls: "badge-success" },
  approved: { label: "معتمد", cls: "badge-success" },
  returned: { label: "مُعاد للطالب", cls: "badge-warning" },
  rejected: { label: "مرفوض", cls: "badge-danger" },
};

export default function DailyReports() {
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  // Review modal
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getTrainingLogs({ per_page: 200 });
      setLogs(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل السجلات اليومية");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReview(log) {
    setSelectedLog(log);
    setReviewStatus("approved");
    setSupervisorNotes(log.supervisor_notes || "");
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedLog(null);
    setSupervisorNotes("");
    setFormError("");
  }

  async function handleReview(e) {
    e.preventDefault();
    if (!selectedLog) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await reviewTrainingLog(selectedLog.id, {
        status: reviewStatus,
        supervisor_notes: supervisorNotes || null,
      });
      // updatedLog يحتوي student_name مباشرةً من Backend بعد الإصلاح
      const updatedLog = res?.data || res;
      if (updatedLog?.id) {
        setLogs(prev => prev.map(l => {
          if (l.id !== updatedLog.id) return l;
          // نحافظ على بيانات الطالب من السجل القديم إذا لم ترجع في updatedLog
          return {
            ...l,
            ...updatedLog,
            student_name: updatedLog.student_name ?? l.student_name,
            training_assignment: updatedLog.training_assignment ?? l.training_assignment,
          };
        }));
      }
      const successMsg = reviewStatus === "approved"
        ? "تمت مراجعة السجل اليومي بنجاح"
        : "تم إرجاع السجل اليومي للطالب";
      closeModal();
      toast.success(successMsg);
    } catch (e) {
      const msg = e?.response?.data?.message || "فشل مراجعة السجل اليومي";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(status) {
    const s = LOG_STATUS[status] || { label: status, cls: "badge-secondary" };
    return <span className={`badge-custom ${s.cls}`}>{s.label}</span>;
  }

  return (
    <>
      <PageHeader
        title="السجلات اليومية"
        subtitle="مراجعة سجلات التدريب اليومي المقدمة من الطلبة — يمكنك قبولها أو رفضها مع ملاحظات."
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !logs.length ? (
        <EmptyState title="لا توجد سجلات" description="لم يقدّم الطلبة سجلات يومية بعد." />
      ) : (
        <div className="list-clean">
          {logs.map((log) => {
            const stuName = log.student_name
              || log.training_assignment?.enrollment?.user?.name
              || null;
            return (
              <div className="list-item-card" key={log.id}>
                <div className="panel-header items-center">
                  <div>
                    <h4 className="panel-title">{stuName || "طالب غير محدد"}</h4>
                    <p className="panel-subtitle">
                      التاريخ: {log.log_date ? new Date(log.log_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {statusBadge(log.status)}
                    <button
                      className="btn-primary-custom btn-sm-custom"
                      onClick={() => openReview(log)}
                    >
                      مراجعة
                    </button>
                  </div>
                </div>

                {log.activities_performed && (
                  <div className="mt-2">
                    <strong>نوع النموذج:</strong>{" "}
                    <span className="text-soft">{log.activities_performed}</span>
                  </div>
                )}

                {log.supervisor_notes && (
                  <div className="mt-[6px]">
                    <strong>ملاحظات المشرف:</strong>
                    <p className="mt-1">{log.supervisor_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {showModal && selectedLog && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-[520px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>مراجعة السجل اليومي</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleReview}>
              <div className="modal-body">
                {formError && <p className="text-danger">{formError}</p>}

                <div className="mb-3">
                  <p><strong>الطالب:</strong> {selectedLog.student_name || selectedLog.training_assignment?.enrollment?.user?.name || "—"}</p>
                  <p><strong>التاريخ:</strong> {selectedLog.log_date ? new Date(selectedLog.log_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}</p>
                  <p><strong>الأنشطة:</strong> {selectedLog.activities_performed || "—"}</p>
                  {selectedLog.student_reflection && (
                    <p><strong>تأمل الطالب:</strong> {selectedLog.student_reflection}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">قرار المراجعة *</label>
                  <select
                    className="form-control-custom"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    required
                  >
                    <option value="approved">قبول (اعتماد السجل)</option>
                    <option value="returned">إرجاع (إعادة للطالب)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات المشرف</label>
                  <textarea
                    className="form-control-custom"
                    rows={3}
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك على السجل..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-custom" onClick={closeModal} disabled={saving}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? "جاري الحفظ..." : reviewStatus === "approved" ? "اعتماد السجل" : "إرجاع السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
