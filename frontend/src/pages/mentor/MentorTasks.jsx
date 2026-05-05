import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTrainingAssignments,
  gradeTaskSubmission,
  itemsFromPagedResponse,
} from "../../services/api";
import {
  ClipboardList,
  Upload,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Download,
  MessageSquare,
  Star,
} from "lucide-react";

const STATUS_MAP = {
  pending: { label: "قيد الانتظار", cls: "badge-warning" },
  in_progress: { label: "قيد التنفيذ", cls: "badge-info" },
  submitted: { label: "تم التسليم", cls: "badge-primary" },
  graded: { label: "تم التقييم", cls: "badge-success" },
  overdue: { label: "متأخر", cls: "badge-danger" },
};

const emptyForm = { title: "", description: "", training_assignment_id: "", due_date: "", status: "pending" };

export default function MentorTasks() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Modal / form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState(null);
  const [gradingForm, setGradingForm] = useState({ grade: "", feedback: "" });
  const [gradingSaving, setGradingSaving] = useState(false);
  const [gradingError, setGradingError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [taskRes, assignRes] = await Promise.all([
        getTasks({ per_page: 200, with_submissions: 1 }),
        getTrainingAssignments({ per_page: 200 }),
      ]);
      setItems(itemsFromPagedResponse(taskRes));
      setAssignments(itemsFromPagedResponse(assignRes));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل المهام");
    } finally {
      setLoading(false);
    }
  }

  async function handleGrade(submissionId) {
    setGradingSaving(true);
    setGradingError("");
    try {
      await gradeTaskSubmission(submissionId, {
        grade: gradingForm.grade ? Number(gradingForm.grade) : null,
        feedback: gradingForm.feedback || null,
        status: "graded",
      });
      setGradingSubmissionId(null);
      setGradingForm({ grade: "", feedback: "" });
      await load();
    } catch (e) {
      setGradingError(e?.response?.data?.message || "فشل التقييم");
    } finally {
      setGradingSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(t) {
    setEditingId(t.id);
    setForm({
      title: t.title || "",
      description: t.description || "",
      training_assignment_id: t.training_assignment_id || "",
      due_date: t.due_date || "",
      status: t.status || "pending",
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        await updateTask(editingId, form);
      } else {
        await createTask(form);
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e?.response?.data?.message || "فشل حفظ المهمة");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("هل أنت متأكد من حذف هذه المهمة؟")) return;
    try {
      await deleteTask(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "فشل حذف المهمة");
    }
  }

  function statusBadge(status) {
    const s = STATUS_MAP[status] || { label: status, cls: "badge-secondary" };
    return <span className={`badge-custom ${s.cls}`}>{s.label}</span>;
  }

  function getStudentName(task) {
    return task.training_assignment?.enrollment?.user?.name || "—";
  }

  return (
    <>
      <PageHeader
        title="المهام"
        subtitle="إضافة ومتابعة المهام التدريبية للطلبة المرتبطين بتعييناتك."
      />

      <div className="table-actions" style={{ marginBottom: 16 }}>
        <button className="btn-primary-custom" onClick={openCreate}>
          + إضافة مهمة جديدة
        </button>
      </div>

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !items.length ? (
        <EmptyState title="لا توجد مهام" description="لم تُضف مهام بعد. اضغط الزر أعلاه لإضافة مهمة جديدة." />
      ) : (
        <div className="row g-4">
          {items.map((t) => {
            const isExpanded = expandedTaskId === t.id;
            const submission = t.submissions?.[0] || null;
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "graded";
            return (
              <div className="col-12" key={t.id}>
                <div
                  className="section-card"
                  style={{
                    borderRight: isOverdue ? "4px solid #dc3545" : "4px solid var(--primary, #4f46e5)",
                  }}
                >
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <h5 className="mb-0">{t.title}</h5>
                        {statusBadge(t.status)}
                        {isOverdue && (
                          <span className="badge-custom badge-danger d-inline-flex align-items-center gap-1">
                            <AlertCircle size={12} />
                            متأخر
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-muted mb-2" style={{ whiteSpace: "pre-line" }}>
                          {t.description.length > 120 ? t.description.slice(0, 120) + "…" : t.description}
                        </p>
                      )}
                    </div>
                    <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
                      <button
                        className="btn-outline-custom btn-sm-custom d-inline-flex align-items-center gap-1"
                        onClick={() => setExpandedTaskId((prev) => (prev === t.id ? null : t.id))}
                      >
                        {isExpanded ? <><ChevronUp size={14} /> إخفاء</> : <><ChevronDown size={14} /> التفاصيل</>}
                      </button>
                      <button className="btn-outline-custom btn-sm-custom" onClick={() => openEdit(t)}>
                        تعديل
                      </button>
                      <button className="btn-danger-custom btn-sm-custom" onClick={() => handleDelete(t.id)}>
                        حذف
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="d-flex flex-wrap gap-3 mt-2" style={{ fontSize: "0.88rem", color: "#6c757d" }}>
                    <span className="d-inline-flex align-items-center gap-1">
                      <User size={14} />
                      الطالب: {getStudentName(t)}
                    </span>
                    {t.due_date && (
                      <span className="d-inline-flex align-items-center gap-1">
                        <Clock size={14} />
                        موعد التسليم: {t.due_date}
                      </span>
                    )}
                  </div>

                  {/* Expanded: Submission details + grading */}
                  {isExpanded && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid #e9ecef" }}>
                      {submission ? (
                        <div
                          className="p-3 rounded mb-3"
                          style={{
                            background: t.status === "graded" ? "#f0fdf4" : "#eff6ff",
                            border: `1px solid ${t.status === "graded" ? "#bbf7d0" : "#bfdbfe"}`,
                          }}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            {t.status === "graded" ? (
                              <Star size={16} className="text-success" />
                            ) : (
                              <CheckCircle2 size={16} className="text-primary" />
                            )}
                            <strong>{t.status === "graded" ? "تم التقييم" : "تم التسليم"}</strong>
                            {submission.submitted_at && (
                              <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                                — {submission.submitted_at}
                              </span>
                            )}
                          </div>

                          {submission.file_url && (
                            <div className="mb-2">
                              <a
                                href={submission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="d-inline-flex align-items-center gap-1"
                                style={{ color: "var(--primary, #4f46e5)", fontSize: "0.9rem" }}
                              >
                                <Download size={14} />
                                تحميل ملف الطالب
                              </a>
                            </div>
                          )}

                          {submission.notes && (
                            <div className="mb-2">
                              <span className="text-muted" style={{ fontSize: "0.85rem" }}>ملاحظات الطالب:</span>{" "}
                              <span style={{ fontSize: "0.9rem" }}>{submission.notes}</span>
                            </div>
                          )}

                          {t.status === "graded" && submission.grade !== null && (
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <Star size={16} className="text-warning" />
                              <strong>الدرجة:</strong>{" "}
                              <span className="badge-custom badge-success">{submission.grade}/100</span>
                            </div>
                          )}
                          {t.status === "graded" && submission.feedback && (
                            <div className="d-flex align-items-start gap-2">
                              <MessageSquare size={16} className="text-info mt-1 flex-shrink-0" />
                              <div>
                                <strong>ملاحظاتك:</strong>
                                <p className="mb-0 mt-1" style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>
                                  {submission.feedback}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="alert-custom alert-warning d-flex align-items-center gap-2 mb-3">
                          <Clock size={16} />
                          لم يتم تسليم هذه المهمة بعد
                        </div>
                      )}

                      {/* Grading form - show if submitted but not yet graded */}
                      {submission && submission.grade === null && (
                        <div className="p-3 rounded" style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
                          <h6 className="d-flex align-items-center gap-2 mb-3">
                            <Star size={16} className="text-warning" />
                            تقييم التسليم
                          </h6>
                          {gradingError && (
                            <div className="alert-custom alert-danger d-flex align-items-center gap-2 mb-2">
                              <AlertCircle size={14} />
                              {gradingError}
                            </div>
                          )}
                          <div className="row g-3">
                            <div className="col-md-3">
                              <div className="form-group">
                                <label className="form-label">الدرجة (0-100)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="form-control-custom"
                                  value={gradingForm.grade}
                                  onChange={(e) => setGradingForm((prev) => ({ ...prev, grade: e.target.value }))}
                                  placeholder="مثال: 85"
                                />
                              </div>
                            </div>
                            <div className="col-md-9">
                              <div className="form-group">
                                <label className="form-label">ملاحظات / تغذية راجعة</label>
                                <textarea
                                  className="form-control-custom"
                                  rows={2}
                                  value={gradingForm.feedback}
                                  onChange={(e) => setGradingForm((prev) => ({ ...prev, feedback: e.target.value }))}
                                  placeholder="اكتب ملاحظاتك للطالب..."
                                />
                              </div>
                            </div>
                            <div className="col-12">
                              <button
                                type="button"
                                className="btn-primary-custom d-inline-flex align-items-center gap-2"
                                disabled={gradingSaving}
                                onClick={() => handleGrade(submission.id)}
                              >
                                {gradingSaving ? (
                                  <><LoadingSpinner size="button" /> جاري التقييم...</>
                                ) : (
                                  <><Star size={16} /> تسجيل التقييم</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editingId ? "تعديل مهمة" : "إضافة مهمة جديدة"}</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <p className="text-danger">{formError}</p>}

                <div className="form-group">
                  <label className="form-label">عنوان المهمة *</label>
                  <input
                    className="form-control-custom"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الوصف</label>
                  <textarea
                    className="form-control-custom"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">تعيين التدريب (الطالب) *</label>
                  <select
                    className="form-control-custom"
                    value={form.training_assignment_id}
                    onChange={(e) => setForm({ ...form, training_assignment_id: e.target.value })}
                    required
                  >
                    <option value="">— اختر التعيين —</option>
                    {assignments.map((a) => {
                      const stu = a.enrollment?.user;
                      return (
                        <option key={a.id} value={a.id}>
                          {stu?.name || "طالب"} — {a.training_site?.name || "جهة"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ التسليم *</label>
                  <input
                    type="date"
                    className="form-control-custom"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    required
                  />
                </div>

                {editingId && (
                  <div className="form-group">
                    <label className="form-label">الحالة</label>
                    <select
                      className="form-control-custom"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-custom" onClick={closeModal} disabled={saving}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
