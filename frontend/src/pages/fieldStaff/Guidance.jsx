import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import {
  getNotes,
  createNote,
  getTrainingAssignments,
  itemsFromPagedResponse,
} from "../../services/api";

const GUIDANCE_TYPES = [
  { value: "academic_stress", label: "الضغوط الأكاديمية" },
  { value: "social_integration", label: "التواصل والاندماج" },
  { value: "performance_anxiety", label: "قلق الأداء" },
  { value: "time_management", label: "إدارة الوقت" },
  { value: "motivation", label: "الدافعية والالتزام" },
  { value: "other", label: "أخرى" },
];

export default function FieldStaffGuidance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Filter
  const [filterType, setFilterType] = useState("");

  // Add note
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ training_assignment_id: "", content: "", type: "academic_stress" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [noteRes, assignRes] = await Promise.all([
        getNotes({ per_page: 200 }),
        getTrainingAssignments({ per_page: 200 }),
      ]);
      setNotes(itemsFromPagedResponse(noteRes));
      setAssignments(itemsFromPagedResponse(assignRes));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const content = `[${GUIDANCE_TYPES.find((g) => g.value === form.type)?.label || form.type}] ${form.content}`;
      await createNote({
        training_assignment_id: form.training_assignment_id,
        content,
      });
      setForm({ training_assignment_id: "", content: "", type: "academic_stress" });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e?.response?.data?.message || "فشل حفظ الملاحظة");
    } finally {
      setSaving(false);
    }
  }

  const filteredNotes = filterType
    ? notes.filter((n) => n.content?.includes(GUIDANCE_TYPES.find((g) => g.value === filterType)?.label || ""))
    : notes;

  return (
    <>
      <PageHeader
        title="الإرشاد والدعم النفسي"
        subtitle="تسجيل ومتابعة جلسات الإرشاد والدعم النفسي للطلبة المتدربين."
      />

      {/* Quick Reference */}
      <div className="section-card mb-4 p-4">
        <h5 className="mb-2">مجالات الدعم</h5>
        <div className="flex gap-2 flex-wrap">
          {GUIDANCE_TYPES.map((g) => (
            <button
              key={g.value}
              className={`btn-sm-custom ${filterType === g.value ? "btn-primary-custom" : "btn-outline-custom"}`}
              onClick={() => setFilterType(filterType === g.value ? "" : g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-actions mb-4">
        <button className="btn-primary-custom" onClick={() => setShowForm(true)}>
          + تسجيل جلسة إرشادية
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="section-card p-4 mb-4">
          <h5>تسجيل جلسة إرشادية جديدة</h5>
          {formError && <p className="text-danger">{formError}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">الطالب (تعيين التدريب) *</label>
              <select
                className="form-control-custom"
                value={form.training_assignment_id}
                onChange={(e) => setForm({ ...form, training_assignment_id: e.target.value })}
                required
              >
                <option value="">— اختر الطالب —</option>
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
              <label className="form-label">نوع الإرشاد *</label>
              <select
                className="form-control-custom"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
              >
                {GUIDANCE_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الملاحظات *</label>
              <textarea
                className="form-control-custom"
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="سجّل ملاحظات الجلسة الإرشادية..."
                required
              />
            </div>

            <div className="table-actions">
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn-outline-custom"
                onClick={() => { setShowForm(false); setFormError(""); }}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !filteredNotes.length ? (
        <div className="section-card">
          <p className="text-soft">لا توجد ملاحظات إرشادية {filterType ? "لهذا النوع" : "بعد"}.</p>
        </div>
      ) : (
        <div className="list-clean">
          {filteredNotes.map((note) => {
            const stu = note.training_assignment?.enrollment?.user;
            return (
              <div className="list-item-card" key={note.id}>
                <div className="panel-header">
                  <div>
                    <h4 className="panel-title">{stu?.name || "طالب"}</h4>
                    <p className="panel-subtitle">{note.created_at || "—"}</p>
                  </div>
                </div>
                <p className="mt-2">{note.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="alert-info alert-custom mt-4">
        <strong>تنبيه مهني:</strong> الملاحظات الحساسة يجب أن تُسجَّل وفق سياسة السرية المهنية
        للجامعة. هذه الواجهة تدعم الملاحظات العامة فقط.
      </div>
    </>
  );
}
