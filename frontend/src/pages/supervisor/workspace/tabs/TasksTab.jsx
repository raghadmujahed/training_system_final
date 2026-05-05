import { useState, useEffect, useCallback } from "react";
import { apiClient, itemsFromPagedResponse, unwrapSupervisorList } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

const TASK_TYPES_API = [
  { value: "general", label: "عام / واجب" },
  { value: "weekly_report", label: "تقرير أسبوعي" },
  { value: "daily_log", label: "سجل يومي" },
  { value: "portfolio_item", label: "عنصر ملف الإنجاز" },
  { value: "lesson_critique", label: "نقد درس" },
  { value: "teaching_artifact", label: "نتاج/أثر تدريسي" },
  { value: "visit_preparation", label: "تحضير زيارة" },
  { value: "reflection", label: "تأمل مهني" },
  { value: "counseling_plan", label: "خطة إرشادية" },
  { value: "individual_session", label: "جلسة فردية" },
  { value: "group_guidance", label: "إرشاد جمعي" },
  { value: "case_study", label: "دراسة حالة" },
  { value: "behavior_plan", label: "خطة سلوكية" },
  { value: "form_submission", label: "تسليم نموذج" },
];
const TASK_TYPE_LABELS = TASK_TYPES_API.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const initialForm = {
  title: "",
  description: "",
  instructions: "",
  due_date: "",
  task_type: "general",
  grading_weight: "",
  assignment_scope: "current_student",
  section_id: "",
};

export default function TasksTab({ studentId }) {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [supervisedStudents, setSupervisedStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/tasks`, { params: { per_page: 200 } });
      setTasks(itemsFromPagedResponse(res.data));
      setError("");
    } catch {
      setError("فشل تحميل المهام");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const loadTargets = useCallback(async () => {
    try {
      const [stuRes, secRes] = await Promise.all([
        apiClient.get("/supervisor/students", { params: { per_page: 200 } }).then((r) => r.data),
        apiClient.get("/supervisor/sections", { params: { per_page: 100 } }).then((r) => r.data),
      ]);
      setSupervisedStudents(unwrapSupervisorList(stuRes));
      setSections(unwrapSupervisorList(secRes));
    } catch {
      /* اختياري */
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    const sid = Number(studentId);
    if (Number.isFinite(sid)) {
      setSelectedStudentIds(new Set([sid]));
    }
  }, [studentId]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAudienceLabel = (task) => {
    const ids = Array.isArray(task.target_ids) ? task.target_ids.map(Number) : [];
    if (task.target_type === "section") {
      const section = sections.find((s) => Number(s.id) === Number(ids[0]));
      return section ? `الشعبة: ${section.section_name || section.name}` : "الشعبة كاملة";
    }
    if (task.target_type === "group") {
      if (ids.length === 0) return "مجموعة طلاب";
      const names = supervisedStudents
        .filter((s) => ids.includes(Number(s.student_id ?? s.id)))
        .map((s) => s.name)
        .slice(0, 2);
      const rest = ids.length - names.length;
      return rest > 0 ? `طلاب محددين: ${names.join("، ")} +${rest}` : `طلاب محددين: ${names.join("، ")}`;
    }
    return "طالب واحد";
  };

  const buildCreatePayload = () => {
    const due = form.due_date || null;
    const scope = form.assignment_scope;
    if (scope === "section") {
      const sid = form.section_id ? Number(form.section_id) : null;
      if (!sid) throw new Error("اختر الشعبة");
      return {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.instructions || null,
        due_date: due,
        target_type: "section",
        target_ids: [sid],
        task_type: form.task_type,
        grading_weight: form.grading_weight === "" ? null : Number(form.grading_weight),
        status: "pending",
      };
    }
    if (scope === "multiple_students") {
      const ids = [...selectedStudentIds];
      if (ids.length < 1) throw new Error("اختر طالباً واحداً على الأقل");
      return {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.instructions || null,
        due_date: due,
        target_type: "group",
        target_ids: ids,
        task_type: form.task_type,
        grading_weight: form.grading_weight === "" ? null : Number(form.grading_weight),
        status: "pending",
      };
    }
    if (scope === "student") {
      const onlyId = [...selectedStudentIds][0];
      if (!onlyId) throw new Error("اختر طالباً");
      return {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.instructions || null,
        due_date: due,
        target_type: "student",
        target_ids: [Number(onlyId)],
        task_type: form.task_type,
        grading_weight: form.grading_weight === "" ? null : Number(form.grading_weight),
        status: "pending",
      };
    }
    return {
      title: form.title.trim(),
      description: form.description || null,
      instructions: form.instructions || null,
      due_date: due,
      target_type: "student",
      target_ids: [Number(studentId)],
      task_type: form.task_type,
      grading_weight: form.grading_weight === "" ? null : Number(form.grading_weight),
      status: "pending",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.put(`/supervisor/tasks/${editingId}`, {
          title: form.title.trim(),
          description: form.description || null,
          instructions: form.instructions || null,
          due_date: form.due_date || null,
          task_type: form.task_type,
          grading_weight: form.grading_weight === "" ? null : Number(form.grading_weight),
        });
      } else {
        const payload = buildCreatePayload();
        await apiClient.post("/supervisor/tasks", payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      setSelectedStudentIds(new Set([Number(studentId)]));
      loadTasks();
      addToast(editingId ? "تم تعديل المهمة بنجاح" : "تم إضافة المهمة بنجاح", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "فشل حفظ المهمة";
      addToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("هل تريد حذف هذه المهمة؟")) return;
    try {
      await apiClient.delete(`/supervisor/tasks/${taskId}`);
      addToast("تم حذف المهمة بنجاح", "success");
      loadTasks();
    } catch {
      addToast("فشل حذف المهمة", "error");
    }
  };

  const openEdit = (task) => {
    setForm({
      title: task.title || "",
      description: task.description || "",
      instructions: task.instructions || "",
      due_date: task.due_date ? String(task.due_date).slice(0, 10) : "",
      task_type: task.task_type || "general",
      grading_weight: task.grading_weight != null ? String(task.grading_weight) : "",
      assignment_scope: "current_student",
      section_id: "",
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const statusConfig = {
    pending: { label: "معلّقة", color: "#0d6efd", bg: "#e3f2fd" },
    in_progress: { label: "قيد التنفيذ", color: "#6f42c1", bg: "#ede7f6" },
    completed: { label: "مكتملة", color: "#20c997", bg: "#e0f7fa" },
    submitted: { label: "مُسلَّمة", color: "#17a2b8", bg: "#e0f7fa" },
    graded: { label: "مُقيَّمة", color: "#28a745", bg: "#e8f5e9" },
  };

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ margin: 0 }}>✅ المهام</h4>
        <button
          type="button"
          className="btn-primary-custom"
          onClick={() => {
            setForm(initialForm);
            setEditingId(null);
            setSelectedStudentIds(new Set([Number(studentId)]));
            setShowForm(true);
          }}
        >
          + إضافة مهمة
        </button>
      </div>

      {error && (
        <p style={{ color: "#dc3545", fontSize: "0.9rem" }}>{error}</p>
      )}

      {showForm && (
        <div className="section-card" style={{ marginBottom: "16px", border: "1px solid #4361ee" }}>
          <h5 style={{ margin: "0 0 16px" }}>{editingId ? "✏️ تعديل مهمة" : "📝 مهمة جديدة"}</h5>
          <form onSubmit={handleSubmit}>
            {!editingId && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px" }}>
                <label className="form-label-custom">نطاق التعيين</label>
                <select
                  className="form-select-custom"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={form.assignment_scope}
                  onChange={(e) => setForm((p) => ({ ...p, assignment_scope: e.target.value }))}
                >
                  <option value="current_student">الطالب الحالي فقط</option>
                  <option value="student">طالب واحد (من القائمة)</option>
                  <option value="multiple_students">عدة طلاب (اختيار من القائمة)</option>
                  <option value="section">شعبة كاملة</option>
                </select>

                {form.assignment_scope === "student" && (
                  <div style={{ marginTop: "12px" }}>
                    <label className="form-label-custom">الطالب</label>
                    <select
                      className="form-select-custom"
                      style={{ width: "100%", marginTop: "6px" }}
                      value={[...selectedStudentIds][0] || ""}
                      onChange={(e) => setSelectedStudentIds(new Set([Number(e.target.value)]))}
                      required
                    >
                      <option value="">— اختر —</option>
                      {supervisedStudents.map((row) => {
                        const id = Number(row.student_id ?? row.id);
                        return (
                          <option key={id} value={id}>
                            {row.name} — {row.university_id}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {form.assignment_scope === "section" && (
                  <div style={{ marginTop: "12px" }}>
                    <label className="form-label-custom">الشعبة</label>
                    <select
                      className="form-select-custom"
                      style={{ width: "100%", marginTop: "6px" }}
                      value={form.section_id}
                      onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value }))}
                      required
                    >
                      <option value="">— اختر —</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.section_name || sec.name} ({sec.course || ""}) — {sec.students_count ?? 0} طالب
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.assignment_scope === "multiple_students" && (
                  <div style={{ marginTop: "12px", maxHeight: "200px", overflowY: "auto", border: "1px solid #dee2e6", borderRadius: "8px", padding: "8px" }}>
                    {supervisedStudents.length === 0 ? (
                      <span style={{ color: "#888" }}>لا توجد قائمة طلاب (تحقق من التعيينات)</span>
                    ) : (
                      supervisedStudents.map((row) => {
                        const id = row.student_id ?? row.id;
                        return (
                          <label
                            key={id}
                            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px", cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(Number(id))}
                              onChange={() => toggleStudent(Number(id))}
                            />
                            <span>{row.name} — {row.university_id}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="form-label-custom">عنوان المهمة *</label>
                <input
                  className="form-input-custom"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label-custom">تاريخ التسليم (اختياري)</label>
                <input
                  type="date"
                  className="form-input-custom"
                  value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label-custom">الوصف</label>
                <textarea
                  className="form-textarea-custom"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label-custom">تعليمات للطالب</label>
                <textarea
                  className="form-textarea-custom"
                  rows={2}
                  value={form.instructions}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label-custom">نوع المهمة</label>
                <select
                  className="form-select-custom"
                  value={form.task_type}
                  onChange={(e) => setForm((p) => ({ ...p, task_type: e.target.value }))}
                >
                  {TASK_TYPES_API.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label-custom">وزن التقييم (0–100) اختياري</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className="form-input-custom"
                  value={form.grading_weight}
                  onChange={(e) => setForm((p) => ({ ...p, grading_weight: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button className="btn-primary-custom" type="submit" disabled={saving}>
                {saving ? "جاري الحفظ..." : "💾 حفظ"}
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #999",
                  background: "#fff",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {!tasks.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد مهام بعد
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {tasks.map((task) => {
            const sc = statusConfig[task.status] || statusConfig.pending;
            const due = task.due_date ? new Date(task.due_date) : null;
            const isOverdue =
              due && due < new Date() && !["graded", "completed"].includes(task.status);
            return (
              <div
                key={task.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e9ecef",
                  borderRadius: "10px",
                  padding: "16px",
                  borderRight: `4px solid ${isOverdue ? "#dc3545" : sc.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <h5 style={{ margin: "0 0 4px" }}>{task.title}</h5>
                    <span style={{ fontSize: "0.78rem", color: "#666" }}>
                      {TASK_TYPE_LABELS[task.task_type] || task.task_type} | التسليم: {task.due_date || "—"}
                      {isOverdue && (
                        <span style={{ color: "#dc3545", fontWeight: "600", marginRight: "8px" }}> (متأخرة!)</span>
                      )}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "16px",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      color: isOverdue ? "#dc3545" : sc.color,
                      backgroundColor: isOverdue ? "#ffebee" : sc.bg,
                    }}
                  >
                    {isOverdue ? "متأخرة" : sc.label}
                  </span>
                </div>
                {task.description && (
                  <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#555" }}>{task.description}</p>
                )}
                <div style={{ fontSize: "0.8rem", color: "#495057", marginBottom: "8px" }}>
                  👥 <strong>المستلم:</strong> {getAudienceLabel(task)}
                </div>
                {task.grading_weight != null && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#28a745",
                      background: "#e8f5e9",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    وزن: {task.grading_weight}
                  </span>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    type="button"
                    style={{
                      fontSize: "0.82rem",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid #4361ee",
                      background: "#fff",
                      color: "#4361ee",
                      cursor: "pointer",
                    }}
                    onClick={() => openEdit(task)}
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    type="button"
                    style={{
                      fontSize: "0.82rem",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "1px solid #dc3545",
                      background: "#fff",
                      color: "#dc3545",
                      cursor: "pointer",
                    }}
                    onClick={() => handleDelete(task.id)}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
