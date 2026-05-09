import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";
import { useFieldSupervisorStudents, useSubtypeLabels } from "../../hooks/useFieldSupervisorApi";
import EvaluationTab, { CounselorEvaluationForm, PsychologistEvaluationForm } from "../field-supervisor/tabs/EvaluationTab";
import {
  getEvaluations,
  createEvaluation,
  getEvaluationTemplates,
  getTrainingAssignments,
  itemsFromPagedResponse,
} from "../../services/api";

export default function FieldStaffEvaluations() {
  const { targetRole, label, isSupervisor, isPsychologist, isFieldSupervisor, supervisorSubtype, terms } =
    useFieldStaffRole();
  const { students: fsStudents, loading: fsStudentsLoading, error: fsStudentsError } = useFieldSupervisorStudents();
  const counselorStudentOptions = useMemo(() => {
    const byId = new Map();
    for (const s of fsStudents) {
      if (s?.id != null && !byId.has(s.id)) byId.set(s.id, s);
    }
    return [...byId.values()];
  }, [fsStudents]);
  const mentorLabels = useSubtypeLabels("mentor_teacher");
  const [counselorStudentId, setCounselorStudentId] = useState("");
  const [mentorStudentId, setMentorStudentId] = useState("");
  const [psychologistStudentId, setPsychologistStudentId] = useState("");
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

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!isFieldSupervisor || supervisorSubtype !== "school_counselor") return;
    if (counselorStudentId || !counselorStudentOptions.length) return;
    setCounselorStudentId(String(counselorStudentOptions[0].id));
  }, [isFieldSupervisor, supervisorSubtype, counselorStudentOptions, counselorStudentId]);

  useEffect(() => {
    if (!isFieldSupervisor || supervisorSubtype !== "mentor_teacher") return;
    if (mentorStudentId || !counselorStudentOptions.length) return;
    setMentorStudentId(String(counselorStudentOptions[0].id));
  }, [isFieldSupervisor, supervisorSubtype, counselorStudentOptions, mentorStudentId]);

  const showPsychologistInstitutionEvaluation =
    (isFieldSupervisor && supervisorSubtype === "psychologist") || isPsychologist;

  useEffect(() => {
    if (!showPsychologistInstitutionEvaluation) return;
    if (psychologistStudentId || !counselorStudentOptions.length) return;
    setPsychologistStudentId(String(counselorStudentOptions[0].id));
  }, [
    showPsychologistInstitutionEvaluation,
    counselorStudentOptions,
    psychologistStudentId,
  ]);

  if (isSupervisor) {
    return <Navigate to="/supervisor/workspace" replace />;
  }

  if (isFieldSupervisor && supervisorSubtype === "school_counselor") {
    return (
      <>
        <PageHeader
          title={terms.evaluation || "تقييم الأداء الإرشادي"}
          subtitle="نموذج تقييم المرشد/المدرب (٢٠ مؤشرًا). اختر الطالب المتدرب ثم عبّئ النموذج وأرسل التقييم النهائي ليظهر في ملف إنجاز الطالب."
        />
        {fsStudentsLoading ? (
          <div className="section-card">جاري تحميل الطلاب...</div>
        ) : fsStudentsError ? (
          <div className="section-card">
            <p className="text-danger">{fsStudentsError}</p>
          </div>
        ) : !counselorStudentOptions.length ? (
          <EmptyState title="لا يوجد طلاب مرتبطون بك" description="عند تعيين طلاب للتدريب الإرشادي سيظهرون هنا." />
        ) : (
          <>
            <div className="section-card mb-4">
              <label className="form-label" htmlFor="counselor-eval-student">
                الطالب المتدرب
              </label>
              <select
                id="counselor-eval-student"
                className="form-control-custom"
                value={counselorStudentId}
                onChange={(e) => setCounselorStudentId(e.target.value)}
              >
                {counselorStudentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `طالب #${s.id}`}
                    {s.training_site ? ` — ${s.training_site}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {counselorStudentId ? <CounselorEvaluationForm studentId={Number(counselorStudentId)} /> : null}
          </>
        )}
      </>
    );
  }

  if (isFieldSupervisor && supervisorSubtype === "mentor_teacher") {
    return (
      <>
        <PageHeader
          title={terms.evaluation || "التقييم الميداني"}
          subtitle="تقرير الزيارة الصفية — مساق التربية العملية (نموذج 6). اختر الطالب المتدرب ثم عبّئ التقرير وأرسله نهائياً ليظهر في ملف إنجاز الطالب."
        />
        {fsStudentsLoading ? (
          <div className="section-card">جاري تحميل الطلاب...</div>
        ) : fsStudentsError ? (
          <div className="section-card">
            <p className="text-danger">{fsStudentsError}</p>
          </div>
        ) : !counselorStudentOptions.length ? (
          <EmptyState
            title="لا يوجد طلاب مرتبطون بك"
            description="عند تعيين طلاب للتدريب التدريسي سيظهرون هنا."
          />
        ) : (
          <>
            <div className="section-card mb-4">
              <label className="form-label" htmlFor="mentor-eval-student">
                الطالب المتدرب
              </label>
              <select
                id="mentor-eval-student"
                className="form-control-custom"
                value={mentorStudentId}
                onChange={(e) => setMentorStudentId(e.target.value)}
              >
                {counselorStudentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `طالب #${s.id}`}
                    {s.training_site ? ` — ${s.training_site}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {mentorStudentId ? (
              <EvaluationTab studentId={Number(mentorStudentId)} labels={mentorLabels} />
            ) : null}
          </>
        )}
      </>
    );
  }

  if (showPsychologistInstitutionEvaluation) {
    return (
      <>
        <PageHeader
          title={terms.evaluation || "تقييم الطالب المتدرب"}
          subtitle="معايير تقييم أداء الطالب المتدرب في المصحات/المؤسسات النفسية — مشرف المؤسسة (٢٠ معيارًا، سلم 1–5). اختر الطالب ثم أرسل التقييم النهائي ليظهر في ملف الإنجاز."
        />
        {fsStudentsLoading ? (
          <div className="section-card">جاري تحميل الطلاب...</div>
        ) : fsStudentsError ? (
          <div className="section-card">
            <p className="text-danger">{fsStudentsError}</p>
          </div>
        ) : !counselorStudentOptions.length ? (
          <EmptyState
            title="لا يوجد طلاب مرتبطون بك"
            description="عند تعيين طلاب للتدريب في المؤسسة سيظهرون هنا."
          />
        ) : (
          <>
            <div className="section-card mb-4">
              <label className="form-label" htmlFor="psych-eval-student">
                الطالب المتدرب
              </label>
              <select
                id="psych-eval-student"
                className="form-control-custom"
                value={psychologistStudentId}
                onChange={(e) => setPsychologistStudentId(e.target.value)}
              >
                {counselorStudentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `طالب #${s.id}`}
                    {s.training_site ? ` — ${s.training_site}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {psychologistStudentId ? (
              <PsychologistEvaluationForm studentId={Number(psychologistStudentId)} />
            ) : null}
          </>
        )}
      </>
    );
  }

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
        // Fetch only templates for this role + generic (null target_role)
        getEvaluationTemplates({ target_role: targetRole }),
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
      setTemplateItems(tpl?.items || []);
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
        title={isFieldSupervisor ? (terms.evaluation || "التقييمات") : "التقييمات"}
        subtitle={`إضافة ومتابعة ${isFieldSupervisor ? (terms.evaluation || "تقييمات") : "تقييمات"} أداء الطلبة باستخدام نماذج التقييم الخاصة بـ${label}.`}
      />

      <div className="table-actions mb-4">
        <button type="button" className="btn-primary-custom" onClick={openCreate}>
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
                <th>نوع النموذج</th>
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
                    <td>
                      {ev.template?.target_role_label ? (
                        <span className="badge-custom badge-info">{ev.template.target_role_label}</span>
                      ) : (
                        <span className="badge-custom badge-secondary">عام</span>
                      )}
                    </td>
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
          <div className="modal-content md:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تقييم جديد ({label})</h3>
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
                      <option key={t.id} value={t.id}>
                        {t.name} {t.target_role_label ? `(${t.target_role_label})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {templateItems.length > 0 && (
                  <div className="section-card mt-3 p-4">
                    <h5 className="mb-3">بنود التقييم</h5>
                    {templateItems.map((item) => (
                      <div key={item.id} className="form-group mb-[10px]">
                        <label className="form-label">{item.title || item.description || `بند ${item.id}`}</label>
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
