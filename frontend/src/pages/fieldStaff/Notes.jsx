import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  loadFieldStaffAssignmentOptions,
  itemsFromPagedResponse,
} from "../../services/api";

const emptyForm = { training_assignment_id: "", content: "" };

export default function FieldStaffNotes() {
  const { isPsychologist, label } = useFieldStaffRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const noteLabel = isPsychologist ? "ملاحظة إرشادية" : "ملاحظة";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [noteRes, assignmentOptions] = await Promise.all([
        getNotes({ per_page: 200 }),
        loadFieldStaffAssignmentOptions({ per_page: 200 }),
      ]);
      setNotes(itemsFromPagedResponse(noteRes));
      setAssignments(assignmentOptions);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل الملاحظات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(note) {
    setEditingId(note.id);
    setForm({
      training_assignment_id: note.training_assignment_id || "",
      content: note.content || "",
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
        await updateNote(editingId, form);
      } else {
        await createNote(form);
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e?.response?.data?.message || "فشل حفظ الملاحظة");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;
    try {
      await deleteNote(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "فشل حذف الملاحظة");
    }
  }

  return (
    <>
      <PageHeader
        title={isPsychologist ? "الملاحظات الإرشادية" : "الملاحظات"}
        subtitle={`تدوين ملاحظاتك على طلبة التدريب — حسب دورك كـ${label}.`}
      />

      <div className="table-actions mb-4">
        <button className="btn-primary-custom" onClick={openCreate}>
          + إضافة {noteLabel}
        </button>
      </div>

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !notes.length ? (
        <EmptyState title="لا توجد ملاحظات" description="لم تُضف ملاحظات بعد." />
      ) : (
        <div className="list-clean">
          {notes.map((note) => {
            const stu = note.training_assignment?.enrollment?.user;
            return (
              <div className="list-item-card" key={note.id}>
                <div className="panel-header items-center">
                  <div>
                    <h4 className="panel-title">{stu?.name || "طالب"}</h4>
                    <p className="panel-subtitle">{note.created_at || "—"}</p>
                  </div>
                  <div className="table-actions">
                    <button className="btn-outline-custom btn-sm-custom" onClick={() => openEdit(note)}>
                      تعديل
                    </button>
                    <button className="btn-danger-custom btn-sm-custom" onClick={() => handleDelete(note.id)}>
                      حذف
                    </button>
                  </div>
                </div>
                <p className="mt-2">{note.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-[520px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? `تعديل ${noteLabel}` : `إضافة ${noteLabel} جديدة`}</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <p className="text-danger">{formError}</p>}

                <div className="form-group">
                  <label className="form-label">تعيين التدريب (الطالب) *</label>
                  <input
                    type="text"
                    className="form-control-custom mb-2"
                    placeholder="البحث بالاسم أو الرقم الجامعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="form-control-custom"
                    value={form.training_assignment_id}
                    onChange={(e) => setForm({ ...form, training_assignment_id: e.target.value })}
                    required
                  >
                    <option value="">— اختر الطالب —</option>
                    {assignments
                      .filter((a) => {
                        const stu = a.enrollment?.user;
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          stu?.name?.toLowerCase().includes(query) ||
                          stu?.university_id?.toLowerCase().includes(query)
                        );
                      })
                      .map((a) => {
                        const stu = a.enrollment?.user;
                        return (
                          <option key={a.id} value={a.id}>
                            {stu?.name || "طالب"} — {stu?.university_id || ""} — {a.training_site?.name || "جهة"}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{isPsychologist ? "الملاحظة الإرشادية" : "الملاحظة"} *</label>
                  <textarea
                    className="form-control-custom"
                    rows={4}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder={isPsychologist ? "اكتب ملاحظتك الإرشادية هنا..." : "اكتب ملاحظتك هنا..."}
                    required
                  />
                </div>
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
