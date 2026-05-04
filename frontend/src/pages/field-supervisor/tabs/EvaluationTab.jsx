import { useState, useEffect, useMemo } from "react";
import { useStudentEvaluation } from "../../../hooks/useFieldSupervisorApi";
import { weightedTotalFromScores } from "../../../utils/fieldEvaluationWeighted";
import { getFieldSupervisorReference } from "../../../config/fieldSupervisorReference";
import { Save, Send, CheckCircle, AlertTriangle, FileText, AlertCircle, Check } from "lucide-react";

export default function EvaluationTab({ studentId, labels }) {
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const template = data?.template || {};
  const evaluation = data?.evaluation || {};
  const rawCriteria = template.criteria;
  const criteria = Array.isArray(rawCriteria) ? rawCriteria : [];
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;

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
  const progressPercentage = Math.min(100, maxScore > 0 ? (currentTotal / maxScore) * 100 : 0);

  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
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
    } catch {
      // —
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const missingCriteria = criteria.filter((c) => !scores[c.id] && scores[c.id] !== 0);
    if (missingCriteria.length > 0) {
      alert("الرجاء تقييم جميع البنود قبل الإرسال");
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
    } catch {
      // —
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
