import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import {
  getEvaluations,
  createEvaluation,
  getEvaluationTemplates,
  getTrainingAssignments,
  itemsFromPagedResponse,
} from "../../services/api";

export default function MentorEvaluations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form data
  const [assignments, setAssignments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateItems, setTemplateItems] = useState([]);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getEvaluations({ per_page: 200 });
      setItems(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل التقييمات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openCreate() {
    setFormError("");
    setSelectedAssignment("");
    setSelectedTemplate("");
    setTemplateItems([]);
    setScores({});
    setNotes("");
    setShowModal(true);
    try {
      const [assignRes, templRes] = await Promise.all([
        getTrainingAssignments({ per_page: 200 }),
        getEvaluationTemplates(),
      ]);
      setAssignments(itemsFromPagedResponse(assignRes));
      setTemplates(Array.isArray(templRes) ? templRes : itemsFromPagedResponse(templRes));
    } catch (e) {
      setFormError("فشل تحميل البيانات الأساسية");
    }
  }

  async function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId);
    setScores({});
    if (!templateId) {
      setTemplateItems([]);
      return;
    }
    try {
      const tpl = templates.find((t) => String(t.id) === String(templateId));
      const items = tpl?.items || [];
      setTemplateItems(items);
    } catch {
      setTemplateItems([]);
    }
  }

  function handleScoreChange(itemId, value) {
    setScores((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const scoresArray = templateItems.map((item) => ({
        item_id: item.id,
        score: Number(scores[item.id]) || 0,
        response_text: "",
      }));
      const totalScore = scoresArray.reduce((sum, s) => sum + s.score, 0);

      await createEvaluation({
        training_assignment_id: selectedAssignment,
        template_id: selectedTemplate,
        total_score: totalScore,
        notes: notes || null,
        scores: scoresArray,
      });
      setShowModal(false);
      await load();
    } catch (e) {
      setFormError(e?.response?.data?.message || "فشل إنشاء التقييم");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setFormError("");
  }

  return (
    <>
      <PageHeader
        title="التقييمات"
        subtitle="إضافة ومتابعة تقييمات أداء طلبة التدريب باستخدام قوالب التقييم المعتمدة."
      />

      <div className="table-actions mb-4">
        <button className="btn-primary-custom" onClick={openCreate}>
          + تقييم جديد
        </button>
      </div>

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !items.length ? (
        <EmptyState title="لا توجد تقييمات" description="لم تُضف تقييمات بعد. اضغط الزر أعلاه لتقييم طالب." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>القالب</th>
                <th>المجموع</th>
                <th>الملاحظات</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => {
                const stu = ev.training_assignment?.enrollment?.user;
                return (
                  <tr key={ev.id}>
                    <td>{stu?.name || "—"}</td>
                    <td>{ev.template?.name || "—"}</td>
                    <td>{ev.total_score ?? "—"}</td>
                    <td>{ev.notes ? (ev.notes.length > 40 ? ev.notes.slice(0, 40) + "…" : ev.notes) : "—"}</td>
                    <td>{ev.created_at || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Evaluation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-[640px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تقييم جديد</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <p className="text-danger">{formError}</p>}

                <div className="form-group">
                  <label className="form-label">تعيين التدريب (الطالب) *</label>
                  <select
                    className="form-control-custom"
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
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
                  <label className="form-label">قالب التقييم *</label>
                  <select
                    className="form-control-custom"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    required
                  >
                    <option value="">— اختر القالب —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {templateItems.length > 0 && (
                  <div className="section-card mt-3 p-4">
                    <h5 className="mb-3">بنود التقييم</h5>
                    {templateItems.map((item) => (
                      <div key={item.id} className="form-group mb-[10px]">
                        <label className="form-label">{item.description || item.name || `بند ${item.id}`}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={item.max_score || 10}
                            className="form-control-custom w-20"
                            value={scores[item.id] || ""}
                            onChange={(e) => handleScoreChange(item.id, e.target.value)}
                            placeholder={`من ${item.max_score || 10}`}
                          />
                          <span className="text-soft">/ {item.max_score || 10}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group mt-3">
                  <label className="form-label">ملاحظات عامة</label>
                  <textarea
                    className="form-control-custom"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية على أداء الطالب..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-custom" onClick={closeModal} disabled={saving}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التقييم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
