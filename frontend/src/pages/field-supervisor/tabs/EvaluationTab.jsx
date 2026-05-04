import { useState, useEffect, useMemo } from "react";
import { useStudentEvaluation, useFieldSupervisorStudent } from "../../../hooks/useFieldSupervisorApi";
import { weightedTotalFromScores } from "../../../utils/fieldEvaluationWeighted";
import { getFieldSupervisorReference } from "../../../config/fieldSupervisorReference";
import { Save, Send, CheckCircle, AlertTriangle, FileText, AlertCircle, Check, Loader2 } from "lucide-react";

export default function EvaluationTab({ studentId, labels }) {
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const { student: studentData } = useFieldSupervisorStudent(studentId);
  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split('T')[0]);
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
    setSupervisorName(ev?.supervisor_name || "");
    setEvaluationDate(ev?.evaluation_date || new Date().toISOString().split('T')[0]);
  }, [data]);

  const currentTotal = useMemo(
    () => weightedTotalFromScores(criteria, scores),
    [criteria, scores]
  );
  const maxScore = template.total_score || 100;
  const progressPercentage = Math.min(100, maxScore > 0 ? (currentTotal / maxScore) * 100 : 0);

  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      const payload = {
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      };
      if (isSchoolCounselor) {
        payload.supervisor_name = supervisorName;
        payload.evaluation_date = evaluationDate;
      }
      await saveDraft(payload);
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
    if (isSchoolCounselor) {
      const missing = COUNSELOR_INDICATORS.filter((_, idx) => !scores[idx + 1] && scores[idx + 1] !== 0);
      if (missing.length > 0) {
        setSubmitError(`الرجاء تقييم جميع المؤشرات (${missing.length} مؤشرات متبقية)`);
        return;
      }
      if (!supervisorName.trim()) {
        setSubmitError("الرجاء إدخال اسم المشرف");
        return;
      }
    } else {
      const missingCriteria = criteria.filter((c) => !scores[c.id] && scores[c.id] !== 0);
      if (missingCriteria.length > 0) {
        setSubmitError("الرجاء تقييم جميع البنود قبل الإرسال");
        return;
      }
    }
    if (!confirm("هل أنت متأكد من إرسال التقييم النهائي؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      };
      if (isSchoolCounselor) {
        payload.supervisor_name = supervisorName;
        payload.evaluation_date = evaluationDate;
      }
      await submit(payload);
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
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  const refEval = getFieldSupervisorReference(data?.supervisor_subtype);

  if (isSchoolCounselor) {
    return (
      <CounselorEvaluationForm
        studentId={studentId}
        studentData={studentData}
        data={data}
        loading={loading}
        error={error}
        refresh={refresh}
      />
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
        <div className="section-card" style={{ marginBottom: 16, background: "rgba(13, 110, 253, 0.08)" }}>
          <Check size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
          تم حفظ المسودة بنجاح
        </div>
      )}
      {success === "submitted" && (
        <div className="section-card" style={{ marginBottom: 16, background: "rgba(25, 135, 84, 0.08)" }}>
          <Check size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
          تم إرسال التقييم النهائي بنجاح
        </div>
      )}

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={20} />
          {labels.evaluation}
        </h4>
        <div className="section-card" style={{ padding: 14, background: "#f7f9fc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="text-soft" style={{ fontSize: "0.9rem" }}>
                حالة التقييم
              </div>
              <span className={`badge-custom ${evaluation?.status === "draft" ? "badge-warning" : "badge-primary"}`}>
                {evaluation?.status_label || "لم يبدأ"}
              </span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="text-soft" style={{ fontSize: "0.9rem" }}>
                الدرجة التقديرية (مرجّحة من 100)
              </div>
              <strong style={{ fontSize: "1.35rem" }}>
                {currentTotal} / {maxScore}
              </strong>
            </div>
          </div>
          <div style={{ background: "#e9ecef", borderRadius: 8, height: 10, marginTop: 12, overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercentage}%`,
                height: "100%",
                borderRadius: 8,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>بنود التقييم</h4>
        {criteria.length === 0 ? (
          <p className="text-soft" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            لا يوجد قالب تقييم مفعّل. يرجى التواصل مع الإدارة.
          </p>
        ) : (
          criteria.map((criterion) => (
            <div key={criterion.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <strong>{criterion.label}</strong>
                  {criterion.weight && (
                    <span className="text-soft" style={{ fontSize: "0.9rem", marginRight: 8 }}>
                      ({criterion.weight}%)
                    </span>
                  )}
                </div>
                <strong style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
                  {scores[criterion.id] ?? 0}
                </strong>
              </div>
              {criterion.description && (
                <p className="text-soft" style={{ fontSize: "0.92rem", marginTop: 6 }}>
                  {criterion.description}
                </p>
              )}
              <div className="table-actions" style={{ marginTop: 10 }}>
                {(criterion.scale || [1, 2, 3, 4, 5]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!isEditable}
                    onClick={() => handleScoreChange(criterion.id, value)}
                    className={
                      scores[criterion.id] === value ? "btn-primary-custom btn-sm-custom" : "btn-outline-custom btn-sm-custom"
                    }
                    style={{ minWidth: 42, padding: "0 12px" }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>ملاحظات عامة</h4>
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
        <div className="section-card" style={{ background: "rgba(255, 193, 7, 0.08)", borderColor: "rgba(255, 193, 7, 0.3)" }}>
          <AlertCircle size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
          لا يمكن تعديل التقييم بعد إرساله نهائياً
        </div>
      )}
    </div>
  );
}

function EvaluationResult({ evaluation, template, criteria }) {
  const scores = evaluation.scores || {};
  const totalScore = evaluation.total_score ?? weightedTotalFromScores(criteria, scores);
  const maxScore = template.total_score || 100;
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const scaleMax = (c) => (Array.isArray(c.scale) && c.scale.length ? Math.max(...c.scale) : 5);

  return (
    <div>
      <div className="section-card" style={{ marginBottom: 16, textAlign: "center", borderTop: "4px solid var(--success)" }}>
        <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
        <h3 style={{ margin: "0 0 8px" }}>تم إرسال التقييم النهائي</h3>
        <p className="text-soft">تم إرسال التقييم الميداني بنجاح ولا يمكن التعديل.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
          <div>
            <div className="text-soft">الدرجة الإجمالية</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{totalScore}</div>
            <div className="text-soft">من {maxScore}</div>
          </div>
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          <div>
            <div className="text-soft">التقدير</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{evaluation.grade_label || evaluation.grade}</div>
          </div>
        </div>
        <div style={{ background: "#e9ecef", borderRadius: 8, height: 10, marginTop: 20, maxWidth: 400, marginInline: "auto", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, percentage)}%`, height: "100%", background: "var(--success)", borderRadius: 8 }} />
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>تفاصيل البنود</h4>
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="section-card"
            style={{ padding: 12, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <strong>{criterion.label}</strong>
              {criterion.weight && <div className="text-soft">({criterion.weight}%)</div>}
            </div>
            <div>
              <strong style={{ color: "var(--primary)" }}>{scores[criterion.id] ?? 0}</strong>
              <span className="text-soft"> / {scaleMax(criterion)}</span>
            </div>
          </div>
        ))}
      </div>

      {(evaluation.strengths || evaluation.areas_for_improvement || evaluation.general_notes) && (
        <div className="section-card">
          <h4 style={{ marginTop: 0 }}>ملاحظات التقييم</h4>
          {evaluation.strengths && (
            <div className="section-card" style={{ background: "rgba(25, 135, 84, 0.06)", marginBottom: 12 }}>
              <strong>نقاط القوة</strong>
              <p style={{ margin: "8px 0 0" }}>{evaluation.strengths}</p>
            </div>
          )}
          {evaluation.areas_for_improvement && (
            <div className="section-card" style={{ background: "rgba(255, 193, 7, 0.08)", marginBottom: 12 }}>
              <strong>مجالات التحسين</strong>
              <p style={{ margin: "8px 0 0" }}>{evaluation.areas_for_improvement}</p>
            </div>
          )}
          {evaluation.general_notes && (
            <div className="section-card" style={{ background: "#f7f9fc" }}>
              <strong>ملاحظات عامة</strong>
              <p style={{ margin: "8px 0 0" }}>{evaluation.general_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Counselor Evaluation Form (20 Indicators)
// ═══════════════════════════════════════════════════════════════════════════

const COUNSELOR_INDICATORS = [
  "القدرة على وضع خطة إرشادية متكاملة",
  "القدرة على تطبيق جلسات توجيه جمعي",
  "القدرة على تطبيق جلسات إرشاد فردي",
  "القدرة على تطبيق جلسات إرشاد جماعي",
  "القدرة على بناء علاقة إرشادية إيجابية مع عناصر المدرسة",
  "القدرة على بناء علاقة إرشادية ناجحة أثناء الجلسات الإرشادية",
  "القدرة على بناء علاقة إرشادية ناجحة مع المسترشدين",
  "القدرة على توظيف مفاهيم النظريات الإرشادية في العمل الإرشادي",
  "القدرة على المبادأة والمبادرة في طرح الأفكار أثناء التدريب",
  "مدى الاستعداد لتقبل التوجيهات والإرشادات من المشرف/ة",
  "القدرة على بناء علاقة إيجابية مع عناصر المدرسة",
  "القدرة على إدارة جلسات الإرشاد الجماعي",
  "مدى الالتزام بأنظمة وقوانين المدرسة",
  "القدرة على التعامل مع مشكلات المسترشدين بأنواعها المختلفة",
  "مدى الالتزام بتعليمات المشرف/ة وتطبيقها",
  "مدى الالتزام بأوقات الحضور والمغادرة",
  "مدى الالتزام بأخلاقيات مهنة الإرشاد",
  "القدرة على جمع وتحليل البيانات الخاصة بالعمل الإرشادي",
  "القدرة على التواصل الإنساني مع جميع عناصر العملية الإرشادية",
  "القدرة على التكامل بين الإطار النظري والتطبيق أثناء التدريب",
];

function CounselorEvaluationForm({ studentId, studentData, data, loading, error, refresh }) {
  const { saveDraft, submit } = useStudentEvaluation(studentId);
  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [evaluationDate, setEvaluationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const evaluation = data?.evaluation || {};
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const isSubmitted = evaluation?.is_final || evaluation?.status === "submitted";

  useEffect(() => {
    if (data?.evaluation) {
      const ev = data.evaluation;
      setScores(ev.scores || {});
      setGeneralNotes(ev.general_notes || "");
      setSupervisorName(ev.supervisor_name || "");
      setEvaluationDate(ev.evaluation_date || new Date().toISOString().split('T')[0]);
    }
  }, [data]);

  const currentTotal = useMemo(() => {
    let total = 0;
    COUNSELOR_INDICATORS.forEach((_, idx) => {
      const score = scores[idx + 1] || 0;
      total += parseInt(score, 10) || 0;
    });
    return total;
  }, [scores]);

  const maxScore = 100;
  const progressPercentage = Math.min(100, (currentTotal / maxScore) * 100);

  const handleScoreChange = (indicatorIndex, value) => {
    setScores((prev) => ({ ...prev, [indicatorIndex + 1]: parseInt(value, 10) }));
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
        template_id: data?.template?.id,
      });
      setSuccess("draft");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "فشل حفظ تقييم الأداء الإرشادي، يرجى المحاولة مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const missing = COUNSELOR_INDICATORS.filter((_, idx) => !scores[idx + 1]);
    if (missing.length > 0) {
      setSubmitError(`الرجاء تقييم جميع المؤشرات (${missing.length} مؤشرات متبقية)`);
      return;
    }
    if (!supervisorName.trim()) {
      setSubmitError("الرجاء إدخال اسم المشرف");
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
        template_id: data?.template?.id,
      });
      setSuccess("submitted");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "فشل حفظ تقييم الأداء الإرشادي، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card" style={{ textAlign: "center", padding: 40 }}>
        <Loader2 size={40} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
        <p>جاري تحميل نموذج تقييم الأداء الإرشادي...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)", padding: 16 }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <CounselorEvaluationResult
        scores={scores}
        generalNotes={generalNotes}
        supervisorName={supervisorName}
        evaluationDate={evaluationDate}
        currentTotal={currentTotal}
      />
    );
  }

  const student = studentData?.student || studentData || {};
  const schoolName = student.training_site || student.school_name || "—";

  return (
    <div>
      <div className="section-card" style={{ marginBottom: 16, borderTop: "4px solid var(--primary)" }}>
        <h2 style={{ margin: "0 0 20px", textAlign: "center", fontSize: "1.4rem" }}>
          نموذج تقييم المرشد/ة المتدرب
        </h2>

        {success === "draft" && (
          <div className="section-card" style={{ marginBottom: 16, background: "rgba(13, 110, 253, 0.08)", borderColor: "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={18} />
            تم حفظ المسودة بنجاح
          </div>
        )}
        {success === "submitted" && (
          <div className="section-card" style={{ marginBottom: 16, background: "rgba(25, 135, 84, 0.08)", borderColor: "var(--success)", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={18} />
            تم حفظ تقييم الأداء الإرشادي بنجاح
          </div>
        )}
        {submitError && (
          <div className="section-card" style={{ marginBottom: 16, background: "rgba(220, 53, 69, 0.08)", borderColor: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} />
            {submitError}
          </div>
        )}

        <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
          <div className="form-field">
            <label className="form-label-custom">اسم الطالب/ة اختصارًا:</label>
            <input type="text" className="form-input-custom" value={student.name || ""} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم المدرسة التي يتدرب فيها الطالب/ة:</label>
            <input type="text" className="form-input-custom" value={schoolName} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label-custom">اسم المشرف/ة التدريبية:</label>
            <input
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="أدخل اسم المشرف"
              disabled={!isEditable}
            />
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0, marginBottom: 16 }}>جدول التقييم</h4>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 60 }}>الرقم</th>
                <th>المؤشر</th>
                <th style={{ width: 250 }}>درجات التقييم (1 - 5)</th>
              </tr>
            </thead>
            <tbody>
              {COUNSELOR_INDICATORS.map((indicator, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td>{indicator}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label
                          key={value}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            cursor: isEditable ? "pointer" : "not-allowed",
                            opacity: isEditable ? 1 : 0.6,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: scores[idx + 1] === value ? "var(--primary)" : "#f8f9fa",
                            color: scores[idx + 1] === value ? "#fff" : "inherit",
                            minWidth: 36,
                          }}
                        >
                          <input
                            type="radio"
                            name={`indicator-${idx}`}
                            value={value}
                            checked={scores[idx + 1] === value}
                            onChange={() => handleScoreChange(idx, value)}
                            disabled={!isEditable}
                            style={{ display: "none" }}
                          />
                          <span style={{ fontWeight: 700 }}>{value}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="section-card"
          style={{ marginTop: 20, padding: 16, background: "#f7f9fc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <strong style={{ fontSize: "1.1rem" }}>مجموع العلامات الكلي من (100)</strong>
            <div className="text-soft" style={{ fontSize: "0.85rem" }}>كل مؤشر يحصل على درجة من 1 إلى 5</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <strong style={{ fontSize: "1.8rem", color: "var(--primary)" }}>{currentTotal}</strong>
            <span className="text-soft" style={{ fontSize: "1rem" }}> / {maxScore}</span>
          </div>
        </div>

        <div style={{ background: "#e9ecef", borderRadius: 8, height: 10, marginTop: 12, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              borderRadius: 8,
              background: currentTotal >= 80 ? "var(--success)" : currentTotal >= 60 ? "var(--warning)" : "var(--danger)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>ملاحظات عامة ومقترحات لتطوير أداء الطالب المتدرب/ة:</h4>
        <textarea
          className="form-textarea-custom"
          rows={5}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="أدخل الملاحظات والمقترحات..."
          disabled={!isEditable}
        />
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>بيانات المشرف</h4>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="form-field">
            <label className="form-label-custom">اسم وتوقيع المشرف/ة:</label>
            <input
              type="text"
              className="form-input-custom"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="أدخل اسم المشرف"
              disabled={!isEditable}
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
        <div className="table-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn-outline-custom btn-sm-custom"
            onClick={handleSaveDraft}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </button>
          <button
            type="button"
            className="btn-success-custom btn-sm-custom"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
            {submitting ? "جاري الإرسال..." : "إرسال التقييم النهائي"}
          </button>
        </div>
      )}
    </div>
  );
}

function CounselorEvaluationResult({ scores, generalNotes, supervisorName, evaluationDate, currentTotal }) {
  return (
    <div>
      <div className="section-card" style={{ marginBottom: 16, textAlign: "center", borderTop: "4px solid var(--success)" }}>
        <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
        <h3 style={{ margin: "0 0 8px" }}>تم إرسال التقييم النهائي</h3>
        <p className="text-soft">تم إرسال تقييم الأداء الإرشادي بنجاح ولا يمكن التعديل.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
          <div>
            <div className="text-soft">الدرجة الإجمالية</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{currentTotal}</div>
            <div className="text-soft">من 100</div>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>تفاصيل التقييم</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>المؤشر</th>
              <th>الدرجة</th>
            </tr>
          </thead>
          <tbody>
            {COUNSELOR_INDICATORS.map((indicator, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: "center", width: 60 }}>{idx + 1}</td>
                <td>{indicator}</td>
                <td style={{ textAlign: "center", width: 80 }}>
                  <strong>{scores[idx + 1] || 0}</strong> / 5
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(generalNotes || supervisorName || evaluationDate) && (
        <div className="section-card">
          <h4 style={{ marginTop: 0 }}>ملاحظات وبيانات المشرف</h4>
          {generalNotes && (
            <div className="section-card" style={{ background: "#f7f9fc", marginBottom: 12 }}>
              <strong>ملاحظات عامة</strong>
              <p style={{ margin: "8px 0 0" }}>{generalNotes}</p>
            </div>
          )}
          {supervisorName && (
            <p style={{ margin: "8px 0" }}>
              <strong>المشرف:</strong> {supervisorName}
            </p>
          )}
          {evaluationDate && (
            <p style={{ margin: "8px 0" }}>
              <strong>التاريخ:</strong> {evaluationDate}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
