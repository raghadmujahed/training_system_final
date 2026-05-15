import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../../../services/api";
import useAppToast from "../../../../hooks/useAppToast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

const academicEvalInitial = {
  field_performance: "",
  portfolio_score: "",
  attendance_score: "",
  daily_log_score: "",
  theory_score: "",
  tasks_score: "",
  general_notes: "",
  is_final: false,
};

export default function EvaluationsTab({ studentId }) {
  const toast = useAppToast();
  const [fieldEvals, setFieldEvals] = useState([]);
  const [academicEval, setAcademicEval] = useState(null);
  const [rubricTemplate, setRubricTemplate] = useState(null);
  const [criteriaValues, setCriteriaValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("field");
  const [showAcademicForm, setShowAcademicForm] = useState(false);
  const [form, setForm] = useState(academicEvalInitial);
  const [saving, setSaving] = useState(false);

  const loadEvals = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldRes, acadRes] = await Promise.all([
        apiClient.get(`/supervisor/students/${studentId}/field-evaluations`).then((r) => r.data).catch(() => []),
        apiClient.get(`/supervisor/students/${studentId}/academic-evaluation`).then((r) => r.data).catch(() => null),
      ]);
      const fieldPayload = Array.isArray(fieldRes)
        ? fieldRes
        : Array.isArray(fieldRes?.data?.evaluations)
          ? fieldRes.data.evaluations
          : [];
      const acadPayload = acadRes?.data || {};
      const evaluation = acadPayload?.evaluation || null;
      const template = acadPayload?.rubric_template || null;

      setFieldEvals(fieldPayload);
      setAcademicEval(evaluation);
      setRubricTemplate(template);
      if (evaluation) {
        setForm({
          field_performance: scoreFromCriterion(evaluation.criteria_scores, "field_performance"),
          portfolio_score: scoreFromCriterion(evaluation.criteria_scores, "portfolio_score"),
          attendance_score: scoreFromCriterion(evaluation.criteria_scores, "attendance_score"),
          daily_log_score: scoreFromCriterion(evaluation.criteria_scores, "daily_log_score"),
          theory_score: scoreFromCriterion(evaluation.criteria_scores, "theory_score"),
          tasks_score: scoreFromCriterion(evaluation.criteria_scores, "tasks_score"),
          general_notes: evaluation.notes || "",
          is_final: Boolean(evaluation.is_final),
        });
        const dynamicScores = {};
        (evaluation.criteria_scores || []).forEach((row) => {
          if (row?.criterion && row?.criterion.startsWith("template:")) {
            dynamicScores[row.criterion] = row.score ?? "";
          }
        });
        setCriteriaValues(dynamicScores);
      } else {
        setForm(academicEvalInitial);
        setCriteriaValues({});
      }
    } catch {
      setError("فشل تحميل التقييمات");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadEvals(); }, [loadEvals]);

  const academicTotal = useMemo(
    () => calculateTotalScore(form, rubricTemplate, criteriaValues),
    [form, rubricTemplate, criteriaValues]
  );

  const handleSubmitAcademic = async (e) => {
    e.preventDefault();
    const requiredFields = ["field_performance", "portfolio_score", "attendance_score", "daily_log_score"];
    const missing = requiredFields.filter((f) => !form[f]);
    const requiredDynamicMissing = (rubricTemplate?.items || [])
      .filter((item) => item.field_type === "score" && item.is_required)
      .filter((item) => !criteriaValues[`template:${item.id}`]);
    if (missing.length > 0) {
      toast.warning(`يرجى تعبئة الحقول الأساسية: ${missing.join("، ")}`);
      return;
    }
    if (requiredDynamicMissing.length > 0) {
      toast.warning("يرجى تعبئة جميع بنود التقييم الإلزامية الخاصة بالقسم.");
      return;
    }
    if (form.is_final && !String(form.general_notes || "").trim()) {
      toast.warning("يرجى إدخال الملاحظات العامة قبل اعتماد التقييم النهائي.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        criteria_scores: buildCriteriaScores(form, rubricTemplate, criteriaValues),
        notes: form.general_notes || null,
        strengths: form.general_notes || null,
        areas_for_improvement: form.general_notes || null,
        recommendation: form.is_final ? "final" : "draft",
        total_score: calculateTotalScore(form, rubricTemplate, criteriaValues),
      };
      if (form.is_final) {
        await apiClient.post(`/supervisor/students/${studentId}/academic-evaluation-submit`, payload);
      } else {
        await apiClient.post(`/supervisor/students/${studentId}/academic-evaluation-draft`, payload);
      }
      setShowAcademicForm(false);
      toast.success(form.is_final ? "تم اعتماد التقييم النهائي بنجاح" : "تم حفظ التقييم كمسودة بنجاح");
      loadEvals();
    } catch {
      toast.error("فشل حفظ التقييم");
    } finally {
      setSaving(false);
    }
  };

  const completeness = () => {
    const fields = ["field_performance", "portfolio_score", "attendance_score", "daily_log_score", "theory_score", "tasks_score"];
    const filled = fields.filter((f) => form[f]).length;
    const dynamicScoreItems = (rubricTemplate?.items || []).filter((item) => item.field_type === "score");
    const dynamicFilled = dynamicScoreItems.filter((item) => criteriaValues[`template:${item.id}`]).length;
    const total = fields.length + dynamicScoreItems.length;
    if (!total) return 0;
    return Math.round(((filled + dynamicFilled) / total) * 100);
  };

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;

  return (
    <div>
      {/* Section Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveSection("field")}
          className="py-[10px] px-5 rounded-lg text-[0.9rem] font-semibold cursor-pointer border"
          style={{
            background: activeSection === "field" ? "#4361ee" : "#f0f0f0",
            color: activeSection === "field" ? "#fff" : "#333",
            borderColor: activeSection === "field" ? "#4361ee" : "#dee2e6",
          }}
        >
          🏃 التقييمات الميدانية
        </button>
        <button
          onClick={() => setActiveSection("academic")}
          className="py-[10px] px-5 rounded-lg text-[0.9rem] font-semibold cursor-pointer border"
          style={{
            background: activeSection === "academic" ? "#28a745" : "#f0f0f0",
            color: activeSection === "academic" ? "#fff" : "#333",
            borderColor: activeSection === "academic" ? "#28a745" : "#dee2e6",
          }}
        >
          🎓 التقييم الأكاديمي
        </button>
      </div>

      {/* Field Evaluations Section */}
      {activeSection === "field" && (
        <div>
          <div className="bg-[#f0f7ff] rounded-lg py-3 px-4 mb-4 text-[0.85rem] text-[#0d6efd]">
            📋 التقييمات الميدانية يُدخلها المشرف الميداني ومدير الجهة — المشرف الأكاديمي يطلع عليها فقط
          </div>
          {!fieldEvals.length ? (
            <div className="text-center p-10 text-[#999]">
              <div className="text-[2rem] mb-3">📭</div>
              لا توجد تقييمات ميدانية بعد
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {fieldEvals.map((ev) => (
                <div key={ev.id} className="bg-white border border-[#e9ecef] rounded-[10px] p-4 border-r-4 border-r-[#17a2b8]">
                  <div className="flex justify-between items-center mb-[10px] flex-wrap gap-2">
                    <div>
                      <h5 className="m-0">{ev.evaluator_name || "مُقيّم"}</h5>
                      <span className="text-[0.78rem] text-[#666]">{ev.type === "mentor" ? "تقييم المشرف الميداني" : ev.type === "site_manager" ? "تقييم مدير الجهة" : ev.type} — {ev.created_at || "—"}</span>
                    </div>
                    <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: ev.total_score != null ? "#28a745" : "#ffc107", backgroundColor: ev.total_score != null ? "#e8f5e9" : "#fff8e1" }}>
                      {ev.total_score != null ? `${ev.total_score}%` : "غير مكتمل"}
                    </span>
                  </div>
                  {ev.items && ev.items.length > 0 && (
                    <div className="grid grid-cols-2 gap-[6px]">
                      {ev.items.map((item, i) => (
                        <div key={i} className="text-[0.82rem] py-1 px-2 bg-[#f8f9fa] rounded">
                          {item.label}: <strong>{item.score ?? "—"}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {ev.notes && <p className="m-0 mt-2 text-[0.85rem] text-[#555]">ملاحظات: {ev.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Academic Evaluation Section */}
      {activeSection === "academic" && (
        <div>
          {academicEval && !showAcademicForm ? (
            <div>
              {/* Show existing evaluation */}
              <div className="section-card border-r-4 border-r-[#28a745]">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h4 className="m-0">🎓 التقييم الأكاديمي</h4>
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="py-2 px-4 rounded-lg bg-[#e8f5e9] text-[#28a745] font-bold text-[0.95rem]">
                      المجموع: {formatScore(academicEval.total_score ?? sumFromCriteriaScores(academicEval.criteria_scores))}
                    </span>
                    <button className="btn-primary-custom" onClick={() => setShowAcademicForm(true)}>✏️ تعديل</button>
                    {academicEval.is_final && <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold text-[#28a745] bg-[#e8f5e9]">✅ معتمد</span>}
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                  <EvalItem label="الأداء الميداني" value={scoreFromCriterion(academicEval.criteria_scores, "field_performance")} />
                  <EvalItem label="ملف الإنجاز" value={scoreFromCriterion(academicEval.criteria_scores, "portfolio_score")} />
                  <EvalItem label="الحضور" value={scoreFromCriterion(academicEval.criteria_scores, "attendance_score")} />
                  <EvalItem label="السجل اليومي" value={scoreFromCriterion(academicEval.criteria_scores, "daily_log_score")} />
                  <EvalItem label="المتطلبات النظرية" value={scoreFromCriterion(academicEval.criteria_scores, "theory_score")} />
                  <EvalItem label="المهام" value={scoreFromCriterion(academicEval.criteria_scores, "tasks_score")} />
                </div>
                {!!rubricTemplate?.items?.length && (
                  <div className="mt-[14px] pt-[10px] border-t border-[#e9ecef]">
                    <h6 className="m-0 mb-2">بنود القسم</h6>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
                      {rubricTemplate.items.filter((item) => item.field_type === "score").map((item) => (
                        <EvalItem key={item.id} label={item.title} value={scoreFromCriterion(academicEval.criteria_scores, `template:${item.id}`)} />
                      ))}
                    </div>
                  </div>
                )}
                {academicEval.notes && <p className="m-0 mt-3 text-[0.85rem] text-[#555]">ملاحظات: {academicEval.notes}</p>}
              </div>
            </div>
          ) : (
            <div className="section-card border border-[#28a745]">
              <h4 className="m-0 mb-4">🎓 إدخال التقييم الأكاديمي</h4>

              {/* Completeness Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[0.82rem] text-[#666]">نسبة الاكتمال</span>
                  <span className="text-[0.82rem] font-semibold" style={{ color: completeness() >= 100 ? "#28a745" : "#ffc107" }}>{completeness()}%</span>
                </div>
                <div className="bg-[#e9ecef] rounded-[10px] h-2">
                  <div className="h-full rounded-[10px] transition-[width] duration-300" style={{ width: `${completeness()}%`, background: completeness() >= 100 ? "#28a745" : "#ffc107" }} />
                </div>
              </div>

              <form onSubmit={handleSubmitAcademic}>
                <div className="mb-4 py-3 px-4 rounded-lg bg-[#f0f7ff] border border-[#cfe2ff] flex justify-between items-center flex-wrap gap-2">
                  <span className="text-[0.88rem] text-[#0d6efd] font-medium">المجموع الحالي</span>
                  <span className="text-[1.15rem] font-bold text-[#0d6efd]">{formatScore(academicTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label-custom">الأداء الميداني *</label>
                    <input id="eval-field-performance" name="field_performance" type="number" min="0" step="any" className="form-input-custom" value={form.field_performance} onChange={(e) => setForm((p) => ({ ...p, field_performance: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="form-label-custom">ملف الإنجاز *</label>
                    <input id="eval-portfolio-score" name="portfolio_score" type="number" min="0" step="any" className="form-input-custom" value={form.portfolio_score} onChange={(e) => setForm((p) => ({ ...p, portfolio_score: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="form-label-custom">الحضور *</label>
                    <input id="eval-attendance-score" name="attendance_score" type="number" min="0" step="any" className="form-input-custom" value={form.attendance_score} onChange={(e) => setForm((p) => ({ ...p, attendance_score: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="form-label-custom">السجل اليومي *</label>
                    <input id="eval-daily-log-score" name="daily_log_score" type="number" min="0" step="any" className="form-input-custom" value={form.daily_log_score} onChange={(e) => setForm((p) => ({ ...p, daily_log_score: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="form-label-custom">المتطلبات النظرية</label>
                    <input id="eval-theory-score" name="theory_score" type="number" min="0" step="any" className="form-input-custom" value={form.theory_score} onChange={(e) => setForm((p) => ({ ...p, theory_score: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label-custom">المهام</label>
                    <input id="eval-tasks-score" name="tasks_score" type="number" min="0" step="any" className="form-input-custom" value={form.tasks_score} onChange={(e) => setForm((p) => ({ ...p, tasks_score: e.target.value }))} />
                  </div>
                  <div className="col-span-full">
                    <label className="form-label-custom">ملاحظات عامة</label>
                    <textarea id="eval-general-notes" name="general_notes" className="form-textarea-custom" rows={3} value={form.general_notes} onChange={(e) => setForm((p) => ({ ...p, general_notes: e.target.value }))} />
                  </div>
                  {!!rubricTemplate?.items?.length && (
                    <div className="col-span-full mt-1 border-t border-[#e9ecef] pt-3">
                      <h5 className="m-0 mb-[10px]">بنود التقييم الخاصة بالقسم</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {rubricTemplate.items.filter((item) => item.field_type === "score").map((item) => (
                          <div key={item.id}>
                            <label className="form-label-custom">
                              {item.title}{item.is_required ? " *" : ""}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-input-custom"
                              value={criteriaValues[`template:${item.id}`] ?? ""}
                              onChange={(e) => setCriteriaValues((prev) => ({ ...prev, [`template:${item.id}`]: e.target.value }))}
                              required={Boolean(item.is_required)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="col-span-full">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input id="eval-is-final" name="is_final" type="checkbox" checked={form.is_final} onChange={(e) => setForm((p) => ({ ...p, is_final: e.target.checked }))} />
                      <span className="text-[0.85rem]">اعتماد التقييم النهائي</span>
                    </label>
                    {form.is_final && completeness() < 100 && (
                      <div className="text-[#dc3545] text-[0.82rem] mt-1">⚠️ لا يمكن الاعتماد والحقول الأساسية ناقصة</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn-primary-custom" type="submit" disabled={saving || (form.is_final && completeness() < 100)}>
                    {saving ? "جاري الحفظ..." : "💾 حفظ التقييم"}
                  </button>
                  {academicEval && <button type="button" className="py-2 px-4 rounded-md border border-[#999] bg-white cursor-pointer" onClick={() => setShowAcademicForm(false)}>إلغاء</button>}
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreFromCriterion(criteriaScores, criterion) {
  const row = (criteriaScores || []).find((item) => item?.criterion === criterion);
  return row?.score ?? "";
}

function buildCriteriaScores(coreForm, rubricTemplate, criteriaValues) {
  const coreRows = [
    { criterion: "field_performance", score: Number(coreForm.field_performance || 0), is_required: true },
    { criterion: "portfolio_score", score: Number(coreForm.portfolio_score || 0), is_required: true },
    { criterion: "attendance_score", score: Number(coreForm.attendance_score || 0), is_required: true },
    { criterion: "daily_log_score", score: Number(coreForm.daily_log_score || 0), is_required: true },
    { criterion: "theory_score", score: Number(coreForm.theory_score || 0), is_required: false },
    { criterion: "tasks_score", score: Number(coreForm.tasks_score || 0), is_required: false },
  ];

  const dynamicRows = (rubricTemplate?.items || [])
    .filter((item) => item.field_type === "score")
    .map((item) => ({
      criterion: `template:${item.id}`,
      score: Number(criteriaValues[`template:${item.id}`] || 0),
      max_score: item.max_score != null ? Number(item.max_score) : null,
      is_required: Boolean(item.is_required),
    }));

  return [...coreRows, ...dynamicRows];
}

function calculateTotalScore(coreForm, rubricTemplate, criteriaValues) {
  const rows = buildCriteriaScores(coreForm, rubricTemplate, criteriaValues);
  return sumFromCriteriaScores(rows);
}

function sumFromCriteriaScores(criteriaScores) {
  const total = (criteriaScores || []).reduce((sum, row) => sum + Number(row?.score || 0), 0);
  return Math.round(total * 100) / 100;
}

function formatScore(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function EvalItem({ label, value }) {
  return (
    <div className="p-[10px] bg-[#f8f9fa] rounded-lg">
      <div className="text-[0.75rem] text-[#999] mb-1">{label}</div>
      <div className="text-[1.1rem] font-bold" style={{ color: value ? "#28a745" : "#999" }}>{value || "—"}</div>
    </div>
  );
}
