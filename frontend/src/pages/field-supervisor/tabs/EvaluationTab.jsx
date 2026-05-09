import { useState, useEffect, useMemo, useRef } from "react";
import { useStudentEvaluation, useFieldSupervisorStudent } from "../../../hooks/useFieldSupervisorApi";
import { weightedTotalFromScores, isClassroomVisitFormSix } from "../../../utils/fieldEvaluationWeighted";
import { getFieldSupervisorReference } from "../../../config/fieldSupervisorReference";
import { useToast } from "../../../components/Toast";
import "../../../styles/field-supervisor.css";
import { Save, Send, CheckCircle, AlertTriangle, FileText, AlertCircle, Check, Loader2, Building2 } from "lucide-react";

export default function EvaluationTab({ studentId, labels }) {
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const template = data?.template || {};
  const evaluation = data?.evaluation || {};
  const rawCriteria = template.criteria;
  const criteria = Array.isArray(rawCriteria) ? rawCriteria : [];
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const supervisorType = data?.supervisor_subtype || "mentor_teacher";
  const isSchoolCounselor = supervisorType === "school_counselor";
  const isPsychologist = supervisorType === "psychologist";

  useEffect(() => {
    if (!data?.template) return;
    const ev = data.evaluation;
    const crit = Array.isArray(data.template.criteria) ? data.template.criteria : [];
    const rawScores = ev?.scores;
    if (rawScores && typeof rawScores === "object") {
      const next = {};
      crit.forEach((c) => {
        const v = rawScores[c.id] ?? rawScores[String(c.id)];
        if (v !== undefined && v !== null && v !== "") {
          next[c.id] = typeof v === "number" ? v : parseInt(v, 10) || 0;
        }
      });
      setScores(next);
    } else {
      setScores({});
    }
    setGeneralNotes(ev?.general_notes || "");
    setStrengths(ev?.strengths || "");
    setAreasForImprovement(ev?.areas_for_improvement || "");
  }, [data]);

  const currentTotal = useMemo(
    () => weightedTotalFromScores(criteria, scores),
    [criteria, scores]
  );
  const maxScore = template.total_score || 100;
  const progressPercentage =
    currentTotal != null && maxScore > 0 ? Math.min(100, (currentTotal / maxScore) * 100) : 0;

  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      await saveDraft({
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      });
      setSuccess("draft");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.response?.data?.error || "فشل حفظ المسودة");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const missingCriteria = criteria.filter((c) => !scores[c.id] && scores[c.id] !== 0);
    if (missingCriteria.length > 0) {
      setSubmitError("الرجاء تقييم جميع البنود قبل الإرسال");
      return;
    }
    if (!confirm("هل أنت متأكد من إرسال التقييم النهائي؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      });
      setSuccess("submitted");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.response?.data?.error || "فشل إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card border-r-4 border-r-[var(--danger)]">
        <p className="m-0 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  const refEval = getFieldSupervisorReference(data?.supervisor_subtype);

  if (isSchoolCounselor) {
    return <CounselorEvaluationForm studentId={studentId} />;
  }

  if (isPsychologist) {
    return (
      <div>
        <p className="fs-eval-ref-note">{refEval.evaluationNote}</p>
        <PsychologistEvaluationForm studentId={studentId} />
      </div>
    );
  }

  if (isClassroomVisitFormSix(template)) {
    return (
      <div>
        <p className="fs-eval-ref-note">{refEval.evaluationNote}</p>
        <MentorClassroomVisitFormSix studentId={studentId} labels={labels} />
      </div>
    );
  }

  if (evaluation?.is_final) {
    return (
      <div>
        <p className="fs-eval-ref-note">{refEval.evaluationNote}</p>
        <EvaluationResult evaluation={evaluation} template={template} criteria={criteria} labels={labels} />
      </div>
    );
  }

  return (
    <div>
      <p className="fs-eval-ref-note">{refEval.evaluationNote}</p>
      {success === "draft" && (
        <div className="section-card mb-4 bg-[rgba(13,110,253,0.08)]">
          <Check size={18} className="align-middle ml-[6px]" />
          تم حفظ المسودة بنجاح
        </div>
      )}
      {success === "submitted" && (
        <div className="section-card mb-4 bg-[rgba(25,135,84,0.08)]">
          <Check size={18} className="align-middle ml-[6px]" />
          تم إرسال التقييم النهائي بنجاح
        </div>
      )}

      <div className="section-card mb-4">
        <h4 className="mt-0 flex items-center gap-2">
          <FileText size={20} />
          {labels.evaluation}
        </h4>
        <div className="section-card py-[14px] px-[14px] bg-[#f7f9fc]">
          <div className="flex justify-between flex-wrap gap-3">
            <div>
              <div className="text-soft text-[0.9rem]">
                حالة التقييم
              </div>
              <span className={`badge-custom ${evaluation?.status === "draft" ? "badge-warning" : "badge-primary"}`}>
                {evaluation?.status_label || "لم يبدأ"}
              </span>
            </div>
            <div className="text-left">
              <div className="text-soft text-[0.9rem]">
                الدرجة التقديرية (مرجّحة من 100)
              </div>
              <strong className="text-[1.35rem]">
                {currentTotal != null ? `${currentTotal} / ${maxScore}` : "—"}
              </strong>
            </div>
          </div>
          <div className="bg-[#e9ecef] rounded-lg h-[10px] mt-3 overflow-hidden">
            <div
              className="h-full rounded-lg"
              style={{
                width: `${progressPercentage}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">بنود التقييم</h4>
        {criteria.length === 0 ? (
          <p className="text-soft flex items-center gap-2">
            <AlertCircle size={18} />
            لا يوجد قالب تقييم مفعّل. يرجى التواصل مع الإدارة.
          </p>
        ) : (
          criteria.map((criterion) => (
            <div key={criterion.id} className="mb-5 pb-5 border-b border-[var(--border)]">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <strong>{criterion.label}</strong>
                  {criterion.weight && (
                    <span className="text-soft text-[0.9rem] mr-2">
                      ({criterion.weight}%)
                    </span>
                  )}
                </div>
                <strong className="text-[var(--primary)] text-[1.1rem]">
                  {scores[criterion.id] ?? 0}
                </strong>
              </div>
              {criterion.description && (
                <p className="text-soft text-[0.92rem] mt-[6px]">
                  {criterion.description}
                </p>
              )}
              <div className="table-actions mt-[10px]">
                {(criterion.scale || [1, 2, 3, 4, 5]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!isEditable}
                    onClick={() => handleScoreChange(criterion.id, value)}
                    className={`min-w-[42px] px-3 ${scores[criterion.id] === value ? "btn-primary-custom btn-sm-custom" : "btn-outline-custom btn-sm-custom"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">ملاحظات عامة</h4>
        <div className="form-field">
          <label className="form-label-custom" htmlFor="eval-strengths">
            نقاط القوة
          </label>
          <textarea
            id="eval-strengths"
            className="form-textarea-custom"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            disabled={!isEditable}
            placeholder="اشرح نقاط القوة..."
          />
        </div>
        <div className="form-field">
          <label className="form-label-custom" htmlFor="eval-improvements">
            مجالات التحسين
          </label>
          <textarea
            id="eval-improvements"
            className="form-textarea-custom"
            value={areasForImprovement}
            onChange={(e) => setAreasForImprovement(e.target.value)}
            disabled={!isEditable}
            placeholder="اشرح مجالات التحسين..."
          />
        </div>
        <div className="form-field">
          <label className="form-label-custom" htmlFor="eval-notes">
            ملاحظات عامة
          </label>
          <textarea
            id="eval-notes"
            className="form-textarea-custom"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            disabled={!isEditable}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>
      </div>

      {isEditable && (
        <div className="table-actions">
          <button
            type="button"
            className="btn-outline-custom btn-sm-custom"
            onClick={handleSaveDraft}
            disabled={saving || criteria.length === 0}
          >
            <Save size={16} />
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </button>
          <button
            type="button"
            className="btn-success-custom btn-sm-custom"
            onClick={handleSubmit}
            disabled={submitting || criteria.length === 0}
          >
            <Send size={16} />
            {submitting ? "جاري الإرسال..." : "إرسال التقييم النهائي"}
          </button>
        </div>
      )}

      {!isEditable && (
        <div className="section-card bg-[rgba(255,193,7,0.08)] border-[rgba(255,193,7,0.3)]">
          <AlertCircle size={18} className="align-middle ml-[6px]" />
          لا يمكن تعديل التقييم بعد إرساله نهائياً
        </div>
      )}
    </div>
  );
}

function emptyPairScoresFromCriteria(criteria) {
  const o = {};
  (criteria || []).forEach((c) => {
    if (c.response_type === "text_pair" && c.id) {
      o[c.id] = { positive: "", development: "" };
    }
  });
  return o;
}

function mergePairScores(rawScores, criteria) {
  const base = emptyPairScoresFromCriteria(criteria);
  if (!rawScores || typeof rawScores !== "object") return base;
  (criteria || []).forEach((c) => {
    if (c.response_type !== "text_pair" || !c.id) return;
    const row = rawScores[c.id];
    if (row && typeof row === "object") {
      base[c.id] = {
        positive: row.positive != null ? String(row.positive) : "",
        development: row.development != null ? String(row.development) : "",
      };
    }
  });
  return base;
}

function ClassroomVisitFormSixResult({ evaluation, criteria, suggestedHeader }) {
  const fc = evaluation.form_context || {};
  const sc = evaluation.scores || {};
  const sh = suggestedHeader || {};

  return (
    <div className="fs-form6-wrap">
      <div className="section-card fs-form6-success-banner">
        <div className="fs-form6-success-icon" aria-hidden>
          <CheckCircle size={28} strokeWidth={2.25} />
        </div>
        <h3 className="fs-form6-success-title">تم إرسال تقرير الزيارة الصفية</h3>
        <p className="fs-form6-success-desc">
          نموذج 6 — مساق التربية العملية. يظهر التقرير في ملف إنجاز الطالب ولا يمكن تعديله.
        </p>
      </div>

      <div className="section-card fs-form6-header-card">
        <div className="fs-form6-title-row">
          <div className="fs-form6-title-icon" aria-hidden>
            <Building2 size={24} strokeWidth={2} />
          </div>
          <div className="fs-form6-title-text">
            <span className="fs-form6-form-badge">نموذج رقم 6</span>
            <h4 className="fs-form6-main-title">تقرير زيارة صفية / مساق التربية العملية</h4>
          </div>
        </div>
        <div className="fs-form6-header-grid">
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم الطالب</span>
            <span className="fs-form6-header-value">{sh.student_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم الجامعة</span>
            <span className="fs-form6-header-value">{fc.university_name || sh.university_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">العام الدراسي</span>
            <span className="fs-form6-header-value">{fc.academic_year || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">الفصل الدراسي</span>
            <span className="fs-form6-header-value">{fc.semester || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">رقم المساق</span>
            <span className="fs-form6-header-value">{fc.practicum_course_number || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم المعلم المقيم</span>
            <span className="fs-form6-header-value">{evaluation.supervisor_name || sh.evaluating_teacher_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم المدرسة</span>
            <span className="fs-form6-header-value">{sh.school_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">المديرية</span>
            <span className="fs-form6-header-value">{sh.directorate || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--wide fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">عنوان المدرسة</span>
            <span className="fs-form6-header-value">{sh.school_address || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">تاريخ التقرير</span>
            <span className="fs-form6-header-value">
              {evaluation.evaluation_date ? String(evaluation.evaluation_date).slice(0, 10) : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="section-card fs-form6-section">
        <h4 className="fs-form6-section-heading">أهم الملاحظات حول محور مشاهدات البيئة الصفية</h4>
        <div className="fs-form6-table-wrap">
          <table className="fs-form6-table">
            <thead>
              <tr>
                <th className="fs-form6-col-axis">المحور</th>
                <th>الأمور الإيجابية</th>
                <th>الأمور التي بحاجة إلى تطوير</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => {
                const row = sc[c.id] || {};
                return (
                  <tr key={c.id}>
                    <td className="fs-form6-col-axis">
                      <strong>{c.label}</strong>
                    </td>
                    <td className="fs-form6-cell-text">{row.positive || "—"}</td>
                    <td className="fs-form6-cell-text">{row.development || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {evaluation.general_notes ? (
        <div className="section-card fs-form6-section fs-form6-notes">
          <h4 className="fs-form6-section-heading fs-form6-section-heading--sub">ملاحظات عامة</h4>
          <p className="fs-form6-notes-body">{evaluation.general_notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function MentorClassroomVisitFormSix({ studentId, labels }) {
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const [scores, setScores] = useState({});
  const [formContext, setFormContext] = useState({
    academic_year: "",
    semester: "",
    practicum_course_number: "",
    university_name: "",
  });
  const [generalNotes, setGeneralNotes] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const template = data?.template || {};
  const criteria = Array.isArray(template.criteria) ? template.criteria : [];
  const evaluation = data?.evaluation || {};
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const suggested = data?.suggested_header || {};

  useEffect(() => {
    if (!data?.template) return;
    const ev = data.evaluation;
    const crit = Array.isArray(data.template.criteria) ? data.template.criteria : [];
    setScores(mergePairScores(ev?.scores, crit));
    const fc = ev?.form_context || {};
    const sug = data.suggested_header || {};
    setFormContext({
      academic_year: fc.academic_year ?? "",
      semester: fc.semester ?? "",
      practicum_course_number: fc.practicum_course_number ?? "",
      university_name: fc.university_name ?? sug.university_name ?? "",
    });
    setGeneralNotes(ev?.general_notes || "");
    setSupervisorName(ev?.supervisor_name || sug.evaluating_teacher_name || "");
    const d = ev?.evaluation_date;
    setEvaluationDate(d ? String(d).slice(0, 10) : new Date().toISOString().split("T")[0]);
  }, [data]);

  const setPairField = (id, key, value) => {
    setScores((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { positive: "", development: "" }), [key]: value },
    }));
  };

  const buildPayload = () => ({
    scores,
    general_notes: generalNotes,
    strengths: "",
    areas_for_improvement: "",
    supervisor_name: supervisorName,
    evaluation_date: evaluationDate,
    template_id: template.id,
    form_context: {
      academic_year: formContext.academic_year.trim() || null,
      semester: formContext.semester.trim() || null,
      practicum_course_number: formContext.practicum_course_number.trim() || null,
      university_name: formContext.university_name.trim() || null,
    },
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      await saveDraft(buildPayload());
      setSuccess("draft");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.response?.data?.error || "فشل حفظ المسودة");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    for (const c of criteria) {
      if (c.response_type !== "text_pair") continue;
      const row = scores[c.id] || {};
      if (!String(row.positive || "").trim() && !String(row.development || "").trim()) {
        setSubmitError("الرجاء تعبئة كل محور بملاحظات (إيجابيات و/أو تطوير) قبل الإرسال.");
        return;
      }
    }
    if (!confirm("هل أنت متأكد من إرسال التقرير نهائياً؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }
    setSubmitting(true);
    try {
      await submit(buildPayload());
      setSuccess("submitted");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || err?.response?.data?.error || "فشل إرسال التقرير"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card border-r-4 border-r-[var(--danger)]">
        <p className="m-0 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  if (evaluation?.is_final) {
    return (
      <ClassroomVisitFormSixResult evaluation={evaluation} criteria={criteria} suggestedHeader={suggested} />
    );
  }

  return (
    <div className="fs-form6-wrap">
      {success === "draft" && (
        <div className="section-card fs-form6-flash fs-form6-flash--info">
          <Check size={18} className="align-middle ml-[6px]" />
          تم حفظ المسودة بنجاح
        </div>
      )}
      {success === "submitted" && (
        <div className="section-card fs-form6-flash fs-form6-flash--ok">
          <Check size={18} className="align-middle ml-[6px]" />
          تم إرسال التقرير بنجاح
        </div>
      )}
      {submitError ? (
        <div className="section-card fs-form6-flash fs-form6-flash--err">
          <AlertCircle size={18} className="align-middle ml-[6px]" />
          {submitError}
        </div>
      ) : null}

      <div className="section-card fs-form6-intro">
        <div className="fs-form6-intro-inner">
          <div className="fs-form6-intro-icon" aria-hidden>
            <FileText size={22} strokeWidth={2} />
          </div>
          <div>
            <h4 className="fs-form6-intro-title">{labels?.evaluation || "تقييم ميداني"}</h4>
            <p className="fs-form6-intro-desc">
              تقرير زيارة صفية وفق النموذج الرسمي (6) — تعبئة الملاحظات الوصفية لكل محور.
            </p>
          </div>
        </div>
      </div>

      <div className="section-card fs-form6-header-card">
        <div className="fs-form6-title-row">
          <div className="fs-form6-title-icon" aria-hidden>
            <Building2 size={24} strokeWidth={2} />
          </div>
          <div className="fs-form6-title-text">
            <span className="fs-form6-form-badge">نموذج رقم 6</span>
            <h4 className="fs-form6-main-title">تقرير زيارة صفية / مساق التربية العملية</h4>
          </div>
        </div>
        <div className="fs-form6-header-grid">
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم الطالب</span>
            <span className="fs-form6-header-value">{suggested.student_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item">
            <span className="fs-form6-header-label">اسم الجامعة</span>
            <input
              type="text"
              className="form-input-custom fs-form6-input"
              value={formContext.university_name}
              onChange={(e) => setFormContext((f) => ({ ...f, university_name: e.target.value }))}
              disabled={!isEditable}
              placeholder="جامعة الخليل"
            />
          </div>
          <div className="fs-form6-header-item">
            <span className="fs-form6-header-label">العام الدراسي</span>
            <input
              type="text"
              className="form-input-custom fs-form6-input"
              value={formContext.academic_year}
              onChange={(e) => setFormContext((f) => ({ ...f, academic_year: e.target.value }))}
              disabled={!isEditable}
              placeholder="مثال: 2025/2026"
            />
          </div>
          <div className="fs-form6-header-item">
            <span className="fs-form6-header-label">الفصل الدراسي</span>
            <input
              type="text"
              className="form-input-custom fs-form6-input"
              value={formContext.semester}
              onChange={(e) => setFormContext((f) => ({ ...f, semester: e.target.value }))}
              disabled={!isEditable}
              placeholder="الأول / الثاني / الصيفي"
            />
          </div>
          <div className="fs-form6-header-item">
            <span className="fs-form6-header-label">مساق التربية العملية رقم</span>
            <input
              type="text"
              className="form-input-custom fs-form6-input"
              value={formContext.practicum_course_number}
              onChange={(e) => setFormContext((f) => ({ ...f, practicum_course_number: e.target.value }))}
              disabled={!isEditable}
              placeholder="رقم المساق"
            />
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم المعلم المقيم</span>
            <span className="fs-form6-header-value">{supervisorName || suggested.evaluating_teacher_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">اسم المدرسة</span>
            <span className="fs-form6-header-value">{suggested.school_name || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">المديرية</span>
            <span className="fs-form6-header-value">{suggested.directorate || "—"}</span>
          </div>
          <div className="fs-form6-header-item fs-form6-header-item--wide fs-form6-header-item--readonly">
            <span className="fs-form6-header-label">عنوان المدرسة</span>
            <span className="fs-form6-header-value">{suggested.school_address || "—"}</span>
          </div>
          <div className="fs-form6-header-item">
            <span className="fs-form6-header-label">تاريخ التقرير</span>
            <input
              type="date"
              className="form-input-custom fs-form6-input"
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={!isEditable}
            />
          </div>
        </div>
        <p className="fs-form6-hint">
          يُستكمل اسم المعلم المقيم تلقائياً من حسابك؛ يمكن ضبطه في حقل التوقيع أدناه إن لزم.
        </p>
        <div className="fs-form6-signature">
          <label className="form-label-custom fs-form6-signature-label">اسم المعلم المقيم (للتوقيع على النموذج)</label>
          <input
            type="text"
            className="form-input-custom fs-form6-input fs-form6-input--wide"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            disabled={!isEditable}
            placeholder={suggested.evaluating_teacher_name || ""}
          />
        </div>
      </div>

      <div className="section-card fs-form6-section">
        <h4 className="fs-form6-section-heading">أهم الملاحظات حول محور مشاهدات البيئة الصفية</h4>
        <p className="fs-form6-section-lead">لكل محور، اذكر الأمور الإيجابية و/أو ما يحتاج إلى تطوير (يُشترط ملء أحد العمودين على الأقل لكل محور عند الإرسال).</p>
        <div className="fs-form6-axis-list">
          {criteria.map((c) => {
            const row = scores[c.id] || { positive: "", development: "" };
            const posLabel = c.positive_label || "الأمور الإيجابية";
            const devLabel = c.development_label || "الأمور التي بحاجة إلى تطوير";
            return (
              <div key={c.id} className="fs-form6-axis-block">
                <div className="fs-form6-axis-title">{c.label}</div>
                <div className="fs-form6-pair-grid">
                  <div className="fs-form6-pair-col fs-form6-pair-col--positive">
                    <div className="form-field fs-form6-field">
                      <label className="form-label-custom fs-form6-pair-label">{posLabel}</label>
                      <textarea
                        className="form-textarea-custom fs-form6-textarea"
                        rows={3}
                        value={row.positive}
                        onChange={(e) => setPairField(c.id, "positive", e.target.value)}
                        disabled={!isEditable}
                        placeholder="اكتب الملاحظات..."
                      />
                    </div>
                  </div>
                  <div className="fs-form6-pair-col fs-form6-pair-col--development">
                    <div className="form-field fs-form6-field">
                      <label className="form-label-custom fs-form6-pair-label">{devLabel}</label>
                      <textarea
                        className="form-textarea-custom fs-form6-textarea"
                        rows={3}
                        value={row.development}
                        onChange={(e) => setPairField(c.id, "development", e.target.value)}
                        disabled={!isEditable}
                        placeholder="اكتب الملاحظات..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-card fs-form6-section fs-form6-notes-general">
        <h4 className="fs-form6-section-heading fs-form6-section-heading--sub">ملاحظات عامة</h4>
        <textarea
          className="form-textarea-custom fs-form6-textarea fs-form6-textarea--notes"
          rows={4}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          disabled={!isEditable}
          placeholder="أي ملاحظات إضافية على التقرير..."
        />
      </div>

      {isEditable ? (
        <div className="table-actions fs-form6-actions">
          <button
            type="button"
            className="btn-outline-custom btn-sm-custom"
            onClick={handleSaveDraft}
            disabled={saving || !template.id}
          >
            <Save size={16} />
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </button>
          <button
            type="button"
            className="btn-success-custom btn-sm-custom"
            onClick={handleSubmit}
            disabled={submitting || !template.id}
          >
            <Send size={16} />
            {submitting ? "جاري الإرسال..." : "إرسال التقرير النهائي"}
          </button>
        </div>
      ) : (
        <div className="section-card fs-form6-flash fs-form6-flash--warn">
          <AlertCircle size={18} className="align-middle ml-[6px]" />
          لا يمكن تعديل التقرير بعد إرساله نهائياً
        </div>
      )}
    </div>
  );
}

function EvaluationResult({ evaluation, template, criteria }) {
  const scores = evaluation.scores || {};
  const weighted = weightedTotalFromScores(criteria, scores);
  const totalScore = evaluation.total_score ?? (weighted != null ? weighted : 0);
  const maxScore = template.total_score || 100;
  const percentage = maxScore > 0 && totalScore != null ? (totalScore / maxScore) * 100 : 0;
  const scaleMax = (c) => (Array.isArray(c.scale) && c.scale.length ? Math.max(...c.scale) : 5);

  return (
    <div>
      <div className="section-card mb-4 text-center border-t-4 border-t-[var(--success)]">
        <CheckCircle size={40} color="var(--success)" className="mb-3" />
        <h3 className="m-0 mb-2">تم إرسال التقييم النهائي</h3>
        <p className="text-soft">تم إرسال التقييم الميداني بنجاح ولا يمكن التعديل.</p>
        <div className="flex justify-center gap-8 mt-5 flex-wrap">
          <div>
            <div className="text-soft">الدرجة الإجمالية</div>
            <div className="text-[2rem] font-extrabold">{totalScore}</div>
            <div className="text-soft">من {maxScore}</div>
          </div>
          <div className="w-px bg-[var(--border)] self-stretch" />
          <div>
            <div className="text-soft">التقدير</div>
            <div className="text-[1.5rem] font-extrabold">{evaluation.grade_label || evaluation.grade}</div>
          </div>
        </div>
        <div className="bg-[#e9ecef] rounded-lg h-[10px] mt-5 max-w-[400px] mx-auto overflow-hidden">
          <div
            className="h-full rounded-lg"
            style={{ width: `${Math.min(100, percentage)}%`, background: "var(--success)" }}
          />
        </div>
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">تفاصيل البنود</h4>
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="section-card py-3 px-3 mb-[10px] flex justify-between items-center"
          >
            <div>
              <strong>{criterion.label}</strong>
              {criterion.weight && <div className="text-soft">({criterion.weight}%)</div>}
            </div>
            <div>
              <strong className="text-[var(--primary)]">{scores[criterion.id] ?? 0}</strong>
              <span className="text-soft"> / {scaleMax(criterion)}</span>
            </div>
          </div>
        ))}
      </div>

      {(evaluation.strengths || evaluation.areas_for_improvement || evaluation.general_notes) && (
        <div className="section-card">
          <h4 className="mt-0">ملاحظات التقييم</h4>
          {evaluation.strengths && (
            <div className="section-card bg-[rgba(25,135,84,0.06)] mb-3">
              <strong>نقاط القوة</strong>
              <p className="m-0 mt-2">{evaluation.strengths}</p>
            </div>
          )}
          {evaluation.areas_for_improvement && (
            <div className="section-card bg-[rgba(255,193,7,0.08)] mb-3">
              <strong>مجالات التحسين</strong>
              <p className="m-0 mt-2">{evaluation.areas_for_improvement}</p>
            </div>
          )}
          {evaluation.general_notes && (
            <div className="section-card bg-[#f7f9fc]">
              <strong>ملاحظات عامة</strong>
              <p className="m-0 mt-2">{evaluation.general_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PSYCH_SCALE_LEGEND = [
  { v: 1, label: "ضعيف" },
  { v: 2, label: "مقبول" },
  { v: 3, label: "جيد" },
  { v: 4, label: "جيد جداً" },
  { v: 5, label: "ممتاز" },
];

function PsychologistEvaluationResult({ evaluation, template }) {
  const criteria = Array.isArray(template?.criteria) ? template.criteria : [];
  const scores = evaluation?.scores || {};
  const totalScore = evaluation?.total_score ?? weightedTotalFromScores(criteria, scores);
  const maxScore = template?.total_score || 100;
  const gradeLabel = evaluation?.grade_label || evaluation?.grade || "—";

  return (
    <div className="fs-counselor-eval fs-psych-eval">
      <div className="section-card mb-4 text-center border-t-4 border-t-[var(--success)]">
        <CheckCircle size={40} color="var(--success)" className="mb-3" />
        <h3 className="m-0 mb-2">تم إرسال التقييم النهائي</h3>
        <p className="text-soft">سيظهر النموذج في ملف إنجاز الطالب المتدرب.</p>
        <div className="flex justify-center gap-8 mt-5 flex-wrap">
          <div>
            <div className="text-soft">الدرجة الإجمالية (مرجّحة)</div>
            <div className="text-[2rem] font-extrabold">{totalScore}</div>
            <div className="text-soft">من {maxScore}</div>
          </div>
          <div className="w-px bg-[var(--border)] self-stretch" />
          <div>
            <div className="text-soft">التقدير</div>
            <div className="text-[1.5rem] font-extrabold">{gradeLabel}</div>
          </div>
        </div>
      </div>

      <div className="section-card fs-counselor-eval__table-card mb-4">
        <h4 className="mt-0">معايير التقويم</h4>
        <div className="fs-counselor-eval__table-wrap">
          <table className="data-table fs-counselor-eval__table">
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th>المعيار</th>
                <th className="w-[100px]">الدرجة (1–5)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, idx) => (
                <tr key={criterion.id || idx}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{criterion.label}</td>
                  <td className="text-center">
                    <strong>{scores[criterion.id] ?? "—"}</strong>
                    <span className="text-soft"> / 5</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(evaluation?.areas_for_improvement ||
        evaluation?.strengths ||
        evaluation?.supervisor_name ||
        evaluation?.evaluation_date) && (
        <div className="section-card">
          <h4 className="mt-0">ملاحظات نصية ومشرف التدريب</h4>
          {evaluation.areas_for_improvement && (
            <div className="section-card bg-[rgba(255,193,7,0.08)] mb-3">
              <strong>جوانب الضعف التي تحتاج إلى تحسين (مع أمثلة)</strong>
              <p className="m-0 mt-2 whitespace-pre-wrap">{evaluation.areas_for_improvement}</p>
            </div>
          )}
          {evaluation.strengths && (
            <div className="section-card bg-[rgba(13,110,253,0.06)] mb-3">
              <strong>الإجراءات المقترحة لتنمية جوانب الضعف</strong>
              <p className="m-0 mt-2 whitespace-pre-wrap">{evaluation.strengths}</p>
            </div>
          )}
          {evaluation.supervisor_name && (
            <p className="m-0 my-2">
              <strong>اسم مشرف التدريب:</strong> {evaluation.supervisor_name}
            </p>
          )}
          {evaluation.evaluation_date && (
            <p className="m-0 my-2">
              <strong>التاريخ:</strong> {String(evaluation.evaluation_date).slice(0, 10)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function PsychologistEvaluationForm({ studentId }) {
  const toastApi = useToast();
  const addToast = toastApi?.addToast;
  const feedbackRef = useRef(null);
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const { student: studentPayload } = useFieldSupervisorStudent(studentId);
  const [scores, setScores] = useState({});
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [suggestedActions, setSuggestedActions] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [attentionRowIds, setAttentionRowIds] = useState([]);

  const template = data?.template || {};
  const criteria = Array.isArray(template.criteria) ? template.criteria : [];
  const evaluation = data?.evaluation || {};
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const isSubmitted = evaluation?.is_final || evaluation?.status === "submitted";

  useEffect(() => {
    if (!data?.template) return;
    const ev = data.evaluation;
    const crit = Array.isArray(data.template.criteria) ? data.template.criteria : [];
    const rawScores = ev?.scores;
    if (rawScores && typeof rawScores === "object") {
      const next = {};
      crit.forEach((c, idx) => {
        let v = rawScores[c.id] ?? rawScores[String(c.id)];
        if ((v === undefined || v === null || v === "") && rawScores[idx + 1] != null) {
          v = rawScores[idx + 1];
        }
        if (v !== undefined && v !== null && v !== "") {
          next[c.id] = typeof v === "number" ? v : parseInt(v, 10) || 0;
        }
      });
      setScores(next);
    } else {
      setScores({});
    }
    setAreasForImprovement(ev?.areas_for_improvement || "");
    setSuggestedActions(ev?.strengths || "");
    setSupervisorName(ev?.supervisor_name || "");
    const d = ev?.evaluation_date;
    setEvaluationDate(d ? String(d).slice(0, 10) : new Date().toISOString().split("T")[0]);
  }, [data]);

  useEffect(() => {
    if (success) {
      const t = window.setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => window.clearTimeout(t);
    }
    if (submitError && !submitError.startsWith("لم يكتمل التقييم") && !submitError.startsWith("الرجاء إدخال اسم مشرف")) {
      const t = window.setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [submitError, success]);

  const currentTotal = useMemo(() => weightedTotalFromScores(criteria, scores), [criteria, scores]);
  const maxScore = template.total_score || 100;
  const progressPercentage = Math.min(100, maxScore > 0 ? (currentTotal / maxScore) * 100 : 0);

  const handlePsychScoreChange = (criterionId, value) => {
    setAttentionRowIds((prev) => prev.filter((id) => id !== criterionId));
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      await saveDraft({
        scores,
        strengths: suggestedActions,
        areas_for_improvement: areasForImprovement,
        general_notes: "",
        supervisor_name: supervisorName,
        evaluation_date: evaluationDate,
        template_id: template.id,
      });
      setAttentionRowIds([]);
      setSuccess("draft");
      addToast?.("تم حفظ المسودة بنجاح.", "success");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل حفظ المسودة، يرجى المحاولة مرة أخرى";
      setSubmitError(msg);
      addToast?.(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const missing = criteria.filter((c) => {
      const s = scores[c.id];
      return s === undefined || s === null || s === "" || s < 1;
    });
    if (missing.length > 0) {
      const msg = `لم يكتمل التقييم: يتبقى ${missing.length} معيارًا بدون درجة. تم تمييز الصفوف الناقصة.`;
      setSubmitError(msg);
      setAttentionRowIds(missing.map((m) => m.id));
      addToast?.(msg, "warning");
      requestAnimationFrame(() => {
        const first = missing[0]?.id;
        if (first) {
          document.querySelector(`[data-psych-criterion="${first}"]`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
      return;
    }
    if (!supervisorName.trim()) {
      const msg = "الرجاء إدخال اسم مشرف التدريب قبل الإرسال.";
      setSubmitError(msg);
      addToast?.(msg, "error");
      requestAnimationFrame(() => {
        document.getElementById("psych-supervisor-name")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    if (!confirm("هل أنت متأكد من إرسال التقييم النهائي؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        scores,
        strengths: suggestedActions,
        areas_for_improvement: areasForImprovement,
        general_notes: "",
        supervisor_name: supervisorName,
        evaluation_date: evaluationDate,
        template_id: template.id,
      });
      setAttentionRowIds([]);
      setSuccess("submitted");
      addToast?.("تم إرسال التقييم النهائي بنجاح. سيظهر في ملف إنجاز الطالب.", "success");
      setTimeout(() => setSuccess(null), 5000);
      refresh();
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل إرسال التقييم، يرجى المحاولة مرة أخرى";
      setSubmitError(msg);
      addToast?.(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card text-center p-10">
        <Loader2 size={40} className="animate-[spin_1s_linear_infinite] mb-3" />
        <p>جاري تحميل نموذج التقييم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-card border-r-4 border-r-[var(--danger)] p-4">
        <p className="m-0 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return <PsychologistEvaluationResult evaluation={evaluation} template={template} />;
  }

  const student = studentPayload?.student || studentPayload || {};
  const institutionName = student.training_site?.name || student.training_site || "—";
  const studentName = student.name || student.user?.name || "—";

  if (criteria.length === 0) {
    return (
      <div className="section-card">
        <p className="text-soft flex items-center gap-2">
          <AlertCircle size={18} />
          لا يوجد قالب تقييم مشرف المؤسسة مفعّل. يرجى تشغيل الترحيل/البذور أو التواصل مع الإدارة.
        </p>
      </div>
    );
  }

  return (
    <div className="fs-counselor-eval fs-psych-eval">
      <div ref={feedbackRef} className="fs-counselor-eval__feedback" aria-live="polite">
        {submitError ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--error" role="alert">
            <AlertTriangle size={22} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}
        {success === "draft" ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--info">
            <Check size={22} className="shrink-0" />
            <span>تم حفظ المسودة بنجاح.</span>
          </div>
        ) : null}
        {success === "submitted" ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--success">
            <CheckCircle size={22} className="shrink-0" />
            <span>تم إرسال التقييم النهائي بنجاح. سيظهر في ملف إنجاز الطالب.</span>
          </div>
        ) : null}
      </div>

      <div className="section-card fs-counselor-eval__header-card">
        <h2 className="fs-counselor-eval__title">
          {template.name || "معايير تقييم أداء الطالب المتدرب في المصحات النفسية / خاص بمشرف المؤسسة"}
        </h2>
        <p className="fs-psych-eval__subtitle text-soft">
          سلم التقييم لكل معيار من 1 إلى 5 وفق التسميات أدناه.
        </p>

        <div className="fs-psych-eval__scale-legend" role="list">
          {PSYCH_SCALE_LEGEND.map(({ v, label }) => (
            <span key={v} className="fs-psych-eval__scale-chip" role="listitem">
              <strong>{v}</strong>
              <span>{label}</span>
            </span>
          ))}
        </div>

        <div className="fs-counselor-eval__identity-grid">
          <div className="form-field">
            <label className="form-label-custom">اسم الطالب/ة المتدرب/ة:</label>
            <input type="text" className="form-input-custom" value={studentName} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم المؤسسة / موقع التدريب:</label>
            <input type="text" className="form-input-custom" value={institutionName} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم مشرف التدريب (المقيّم):</label>
            <input
              id="psych-supervisor-name"
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="كما في النموذج الرسمي"
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>

      <div className="section-card fs-counselor-eval__table-card">
        <h4 className="fs-counselor-eval__table-title">جدول معايير التقويم ({criteria.length} معيارًا)</h4>
        <div className="fs-counselor-eval__table-wrap">
          <table className="data-table fs-counselor-eval__table">
            <thead>
              <tr>
                <th className="w-[60px]">الرقم</th>
                <th>معايير التقويم</th>
                <th className="w-[250px]">درجة التقييم (1 – 5)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, idx) => (
                <tr
                  key={criterion.id || idx}
                  data-psych-criterion={criterion.id}
                  className={attentionRowIds.includes(criterion.id) ? "fs-counselor-eval__row--needs-attention" : undefined}
                >
                  <td className="text-center">{idx + 1}</td>
                  <td>{criterion.label}</td>
                  <td>
                    <div className="fs-counselor-eval__score-group">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label
                          key={value}
                          className={`fs-counselor-eval__score-pill ${scores[criterion.id] === value ? "is-active" : ""} ${!isEditable ? "is-disabled" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`psych-${criterion.id}`}
                            value={value}
                            checked={scores[criterion.id] === value}
                            onChange={() => handlePsychScoreChange(criterion.id, value)}
                            disabled={!isEditable}
                            className="hidden"
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-card fs-counselor-eval__score-summary">
          <div>
            <strong className="text-[1.1rem]">المجموع المرجّح من (100)</strong>
            <div className="text-soft text-[0.85rem]">
              يُحتسب تلقائياً وفق أوزان المعايير (5 نقاط لكل معيار على السلم 1–5)
            </div>
          </div>
          <div className="text-left">
            <strong className="text-[1.8rem] text-[var(--primary)]">{currentTotal}</strong>
            <span className="text-soft text-[1rem]"> / {maxScore}</span>
          </div>
        </div>

        <div className="bg-[#e9ecef] rounded-lg h-[10px] mt-3 overflow-hidden">
          <div
            className="h-full rounded-lg transition-[width] duration-300 ease"
            style={{
              width: `${progressPercentage}%`,
              background: currentTotal >= 80 ? "var(--success)" : currentTotal >= 60 ? "var(--warning)" : "var(--danger)",
            }}
          />
        </div>
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">جوانب الضعف التي تحتاج إلى تحسين مع تقديم أمثلة :</h4>
        <textarea
          className="form-textarea-custom"
          rows={4}
          value={areasForImprovement}
          onChange={(e) => setAreasForImprovement(e.target.value)}
          placeholder="صف جوانب الضعف مع أمثلة عملية..."
          disabled={!isEditable}
        />
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">الإجراءات المقترحة لتنمية جوانب الضعف:</h4>
        <textarea
          className="form-textarea-custom"
          rows={4}
          value={suggestedActions}
          onChange={(e) => setSuggestedActions(e.target.value)}
          placeholder="اقتراحات عملية للتطوير..."
          disabled={!isEditable}
        />
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">التوقيع والتاريخ</h4>
        <div className="grid gap-4">
          <div className="form-field">
            <label className="form-label-custom">اسم مشرف التدريب:</label>
            <input
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              disabled={!isEditable}
              aria-label="اسم مشرف التدريب للتوقيع"
            />
          </div>
          <div className="form-field">
            <label className="form-label-custom">التاريخ:</label>
            <input
              type="date"
              className="form-input-custom"
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>

      {isEditable && (
        <div className="table-actions mt-5">
          <button
            type="button"
            className="btn-outline-custom btn-sm-custom inline-flex items-center gap-[6px]"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </button>
          <button
            type="button"
            className="btn-success-custom btn-sm-custom inline-flex items-center gap-[6px]"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Send size={16} />}
            {submitting ? "جاري الإرسال..." : "إرسال التقييم النهائي"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CounselorEvaluationForm({ studentId }) {
  const toastApi = useToast();
  const addToast = toastApi?.addToast;
  const feedbackRef = useRef(null);
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const { student: studentPayload } = useFieldSupervisorStudent(studentId);
  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [attentionRowIds, setAttentionRowIds] = useState([]);

  const template = data?.template || {};
  const criteria = Array.isArray(template.criteria) ? template.criteria : [];
  const evaluation = data?.evaluation || {};
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const isSubmitted = evaluation?.is_final || evaluation?.status === "submitted";

  useEffect(() => {
    if (!data?.template) return;
    const ev = data.evaluation;
    const crit = Array.isArray(data.template.criteria) ? data.template.criteria : [];
    const rawScores = ev?.scores;
    if (rawScores && typeof rawScores === "object") {
      const next = {};
      crit.forEach((c, idx) => {
        let v = rawScores[c.id] ?? rawScores[String(c.id)];
        if ((v === undefined || v === null || v === "") && rawScores[idx + 1] != null) {
          v = rawScores[idx + 1];
        }
        if (v !== undefined && v !== null && v !== "") {
          next[c.id] = typeof v === "number" ? v : parseInt(v, 10) || 0;
        }
      });
      setScores(next);
    } else {
      setScores({});
    }
    setGeneralNotes(ev?.general_notes || "");
    setSupervisorName(ev?.supervisor_name || "");
    const d = ev?.evaluation_date;
    setEvaluationDate(d ? String(d).slice(0, 10) : new Date().toISOString().split("T")[0]);
  }, [data]);

  useEffect(() => {
    if (success) {
      const t = window.setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => window.clearTimeout(t);
    }
    if (
      submitError &&
      !submitError.startsWith("لم يكتمل التقييم") &&
      !submitError.startsWith("الرجاء إدخال اسم المرشد")
    ) {
      const t = window.setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [submitError, success]);

  const currentTotal = useMemo(() => weightedTotalFromScores(criteria, scores), [criteria, scores]);
  const maxScore = template.total_score || 100;
  const progressPercentage = Math.min(100, maxScore > 0 ? (currentTotal / maxScore) * 100 : 0);

  const handleCounselorScoreChange = (criterionId, value) => {
    setAttentionRowIds((prev) => prev.filter((id) => id !== criterionId));
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      await saveDraft({
        scores,
        general_notes: generalNotes,
        supervisor_name: supervisorName,
        evaluation_date: evaluationDate,
        template_id: template.id,
      });
      setAttentionRowIds([]);
      setSuccess("draft");
      addToast?.("تم حفظ المسودة بنجاح.", "success");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل حفظ المسودة، يرجى المحاولة مرة أخرى";
      setSubmitError(msg);
      addToast?.(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const missing = criteria.filter((c) => {
      const s = scores[c.id];
      return s === undefined || s === null || s === "" || s < 1;
    });
    if (missing.length > 0) {
      const msg = `لم يكتمل التقييم: يتبقى ${missing.length} مؤشرًا بدون درجة. تم تمييز الصفوف الناقصة والتمرير إليها.`;
      setSubmitError(msg);
      setAttentionRowIds(missing.map((m) => m.id));
      addToast?.(msg, "warning");
      requestAnimationFrame(() => {
        const first = missing[0]?.id;
        if (first) {
          document.querySelector(`[data-counselor-criterion="${first}"]`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
      return;
    }
    if (!supervisorName.trim()) {
      const msg = "الرجاء إدخال اسم المرشد/المدرب قبل الإرسال.";
      setSubmitError(msg);
      setAttentionRowIds([]);
      addToast?.(msg, "error");
      requestAnimationFrame(() => {
        document.getElementById("counselor-supervisor-name")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    if (!confirm("هل أنت متأكد من إرسال التقييم النهائي؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        scores,
        general_notes: generalNotes,
        supervisor_name: supervisorName,
        evaluation_date: evaluationDate,
        template_id: template.id,
      });
      setAttentionRowIds([]);
      setSuccess("submitted");
      addToast?.("تم إرسال التقييم النهائي بنجاح. سيظهر في ملف إنجاز الطالب.", "success");
      setTimeout(() => setSuccess(null), 5000);
      refresh();
    } catch (err) {
      const msg = err?.response?.data?.message || "فشل إرسال التقييم، يرجى المحاولة مرة أخرى";
      setSubmitError(msg);
      addToast?.(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card text-center p-10">
        <Loader2 size={40} className="animate-[spin_1s_linear_infinite] mb-3" />
        <p>جاري تحميل نموذج التقييم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-card border-r-4 border-r-[var(--danger)] p-4">
        <p className="m-0 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return <CounselorEvaluationResult evaluation={evaluation} template={template} />;
  }

  const student = studentPayload?.student || studentPayload || {};
  const schoolName = student.training_site?.name || student.training_site || student.school_name || "—";
  const studentName = student.name || student.user?.name || "—";

  if (criteria.length === 0) {
    return (
      <div className="section-card">
        <p className="text-soft flex items-center gap-2">
          <AlertCircle size={18} />
          لا يوجد قالب تقييم مرشد تربوي مفعّل. يرجى تشغيل البذور أو التواصل مع الإدارة.
        </p>
      </div>
    );
  }

  return (
    <div className="fs-counselor-eval">
      <div ref={feedbackRef} className="fs-counselor-eval__feedback" aria-live="polite">
        {submitError ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--error" role="alert">
            <AlertTriangle size={22} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}
        {success === "draft" ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--info">
            <Check size={22} className="shrink-0" />
            <span>تم حفظ المسودة بنجاح.</span>
          </div>
        ) : null}
        {success === "submitted" ? (
          <div className="fs-counselor-eval__feedback-banner fs-counselor-eval__feedback-banner--success">
            <CheckCircle size={22} className="shrink-0" />
            <span>تم إرسال التقييم النهائي بنجاح. سيظهر في ملف إنجاز الطالب.</span>
          </div>
        ) : null}
      </div>

      <div className="section-card fs-counselor-eval__header-card">
        <h2 className="fs-counselor-eval__title">
          {template.name || "نموذج تقييم المرشد/ المدرب (نموذج 9)"}
        </h2>

        <div className="fs-counselor-eval__identity-grid">
          <div className="form-field">
            <label className="form-label-custom">اسم الطالب/ة المتدرب/ة:</label>
            <input type="text" className="form-input-custom" value={studentName} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم المدرسة التي يتدرب فيها الطالب/ة:</label>
            <input type="text" className="form-input-custom" value={schoolName} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم المرشد/المدرب (المقيّم):</label>
            <input
              id="counselor-supervisor-name"
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="اسم المرشد أو المدرب الميداني"
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>

      <div className="section-card fs-counselor-eval__table-card">
        <h4 className="fs-counselor-eval__table-title">جدول التقييم ({criteria.length} مؤشرًا)</h4>
        <div className="fs-counselor-eval__table-wrap">
          <table className="data-table fs-counselor-eval__table">
            <thead>
              <tr>
                <th className="w-[60px]">الرقم</th>
                <th>المؤشر</th>
                <th className="w-[250px]">درجات التقييم (1 - 5)</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, idx) => (
                <tr
                  key={criterion.id || idx}
                  data-counselor-criterion={criterion.id}
                  className={attentionRowIds.includes(criterion.id) ? "fs-counselor-eval__row--needs-attention" : undefined}
                >
                  <td className="text-center">{idx + 1}</td>
                  <td>{criterion.label}</td>
                  <td>
                    <div className="fs-counselor-eval__score-group">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label
                          key={value}
                          className={`fs-counselor-eval__score-pill ${scores[criterion.id] === value ? "is-active" : ""} ${!isEditable ? "is-disabled" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`counselor-${criterion.id}`}
                            value={value}
                            checked={scores[criterion.id] === value}
                            onChange={() => handleCounselorScoreChange(criterion.id, value)}
                            disabled={!isEditable}
                            className="hidden"
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-card fs-counselor-eval__score-summary">
          <div>
            <strong className="text-[1.1rem]">مجموع العلامات الكلي من (100)</strong>
            <div className="text-soft text-[0.85rem]">
              الدرجة المعروضة مرجّحة من 100 وفق أوزان المؤشرات في النظام
            </div>
          </div>
          <div className="text-left">
            <strong className="text-[1.8rem] text-[var(--primary)]">{currentTotal}</strong>
            <span className="text-soft text-[1rem]"> / {maxScore}</span>
          </div>
        </div>

        <div className="bg-[#e9ecef] rounded-lg h-[10px] mt-3 overflow-hidden">
          <div
            className="h-full rounded-lg transition-[width] duration-300 ease"
            style={{
              width: `${progressPercentage}%`,
              background: currentTotal >= 80 ? "var(--success)" : currentTotal >= 60 ? "var(--warning)" : "var(--danger)",
            }}
          />
        </div>
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">ملاحظات عامة ومقترحات لتطوير أداء الطالب المتدرب/ة:</h4>
        <textarea
          className="form-textarea-custom"
          rows={5}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="أدخل الملاحظات والمقترحات..."
          disabled={!isEditable}
        />
      </div>

      <div className="section-card mb-4">
        <h4 className="mt-0">التوقيع والتاريخ</h4>
        <div className="grid gap-4">
          <div className="form-field">
            <label className="form-label-custom">اسم وتوقيع المرشد/المدرب:</label>
            <input
              id="counselor-supervisor-name-signature"
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="كما يظهر في النموذج الرسمي"
              disabled={!isEditable}
              aria-label="اسم وتوقيع المرشد/المدرب"
            />
          </div>
          <div className="form-field">
            <label className="form-label-custom">التاريخ:</label>
            <input
              type="date"
              className="form-input-custom"
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>

      {isEditable && (
        <div className="table-actions mt-5">
          <button
            type="button"
            className="btn-outline-custom btn-sm-custom inline-flex items-center gap-[6px]"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </button>
          <button
            type="button"
            className="btn-success-custom btn-sm-custom inline-flex items-center gap-[6px]"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={16} className="animate-[spin_1s_linear_infinite]" /> : <Send size={16} />}
            {submitting ? "جاري الإرسال..." : "إرسال التقييم النهائي"}
          </button>
        </div>
      )}
    </div>
  );
}

function CounselorEvaluationResult({ evaluation, template }) {
  const criteria = Array.isArray(template?.criteria) ? template.criteria : [];
  const scores = evaluation?.scores || {};
  const totalScore = evaluation?.total_score ?? weightedTotalFromScores(criteria, scores);
  const maxScore = template?.total_score || 100;
  const gradeLabel = evaluation?.grade_label || evaluation?.grade || "—";

  return (
    <div className="fs-counselor-eval">
      <div className="section-card mb-4 text-center border-t-4 border-t-[var(--success)]">
        <CheckCircle size={40} color="var(--success)" className="mb-3" />
        <h3 className="m-0 mb-2">تم إرسال التقييم النهائي</h3>
        <p className="text-soft">سيظهر هذا النموذج في ملف إنجاز الطالب/ة.</p>
        <div className="flex justify-center gap-8 mt-5 flex-wrap">
          <div>
            <div className="text-soft">الدرجة الإجمالية (مرجّحة)</div>
            <div className="text-[2rem] font-extrabold">{totalScore}</div>
            <div className="text-soft">من {maxScore}</div>
          </div>
          <div className="w-px bg-[var(--border)] self-stretch" />
          <div>
            <div className="text-soft">التقدير</div>
            <div className="text-[1.5rem] font-extrabold">{gradeLabel}</div>
          </div>
        </div>
      </div>

      <div className="section-card fs-counselor-eval__table-card mb-4">
        <h4 className="mt-0">تفاصيل المؤشرات</h4>
        <div className="fs-counselor-eval__table-wrap">
          <table className="data-table fs-counselor-eval__table">
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th>المؤشر</th>
                <th className="w-[100px]">الدرجة</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, idx) => (
                <tr key={criterion.id || idx}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{criterion.label}</td>
                  <td className="text-center">
                    <strong>{scores[criterion.id] ?? "—"}</strong> / 5
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(evaluation?.general_notes || evaluation?.supervisor_name || evaluation?.evaluation_date) && (
        <div className="section-card">
          <h4 className="mt-0">ملاحظات وبيانات المرشد</h4>
          {evaluation.general_notes && (
            <div className="section-card bg-[#f7f9fc] mb-3">
              <strong>ملاحظات عامة ومقترحات</strong>
              <p className="m-0 mt-2 whitespace-pre-wrap">{evaluation.general_notes}</p>
            </div>
          )}
          {evaluation.supervisor_name && (
            <p className="m-0 my-2">
              <strong>اسم المرشد/المدرب:</strong> {evaluation.supervisor_name}
            </p>
          )}
          {evaluation.evaluation_date && (
            <p className="m-0 my-2">
              <strong>التاريخ:</strong> {String(evaluation.evaluation_date).slice(0, 10)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
