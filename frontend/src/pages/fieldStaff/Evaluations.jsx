import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ClipboardList, Plus, User, FileText, Star, MessageSquare, Calendar, X, Tag } from "lucide-react";
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

function ScoreBar({ score, max }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  let color = "#ef4444";
  if (pct >= 80) color = "#22c55e";
  else if (pct >= 60) color = "#3b82f6";
  else if (pct >= 40) color = "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color }}>{score}</span>
      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>/ {max}</span>
    </div>
  );
}

export default function FieldStaffEvaluations() {
  const {
    targetRole,
    label,
    isSupervisor,
    isPsychologist,
    isMentor,
    isAdviser,
    isFieldSupervisor,
    supervisorSubtype,
    terms,
  } = useFieldStaffRole();
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

  // Detail modal
  const [detailEval, setDetailEval] = useState(null);

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

  const showCounselorFieldEval =
    (isFieldSupervisor && supervisorSubtype === "school_counselor") || isAdviser;
  const showMentorFieldEval =
    (isFieldSupervisor && supervisorSubtype === "mentor_teacher") || isMentor;

  useEffect(() => {
    if (!showCounselorFieldEval) return;
    if (counselorStudentId || !counselorStudentOptions.length) return;
    setCounselorStudentId(String(counselorStudentOptions[0].id));
  }, [showCounselorFieldEval, counselorStudentOptions, counselorStudentId]);

  useEffect(() => {
    if (!showMentorFieldEval) return;
    if (mentorStudentId || !counselorStudentOptions.length) return;
    setMentorStudentId(String(counselorStudentOptions[0].id));
  }, [showMentorFieldEval, counselorStudentOptions, mentorStudentId]);

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

  if (showCounselorFieldEval) {
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

  if (showMentorFieldEval) {
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

  function formatDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  }

  const maxPossible = (ev) => {
    if (ev.template?.items) return ev.template.items.reduce((s, i) => s + (i.max_score || i.pivot?.max_score || 10), 0);
    return 0;
  };

  return (
    <>
      <PageHeader
        title={isFieldSupervisor ? (terms.evaluation || "التقييمات") : "التقييمات"}
        subtitle={`إضافة ومتابعة ${isFieldSupervisor ? (terms.evaluation || "تقييمات") : "تقييمات"} أداء الطلبة باستخدام نماذج التقييم الخاصة بـ${label}.`}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          type="button"
          onClick={openCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 22px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #0369a1, #0284c7)", color: "#fff",
            fontSize: "0.92rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(3,105,161,0.3)", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(3,105,161,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(3,105,161,0.3)"; }}
        >
          <Plus size={18} />
          تقييم جديد
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>جاري التحميل...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>{error}</div>
      ) : !items.length ? (
        <EmptyState title="لا توجد تقييمات" description="لم تُضف تقييمات بعد. اضغط الزر أعلاه لتقييم طالب." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((ev) => {
            const stu = ev.training_assignment?.enrollment?.user;
            const site = ev.training_assignment?.training_site;
            const maxScore = maxPossible(ev) || 100;
            const pct = maxScore > 0 ? Math.min(((ev.total_score || 0) / maxScore) * 100, 100) : 0;
            let scoreColor = "#ef4444";
            if (pct >= 80) scoreColor = "#22c55e";
            else if (pct >= 60) scoreColor = "#3b82f6";
            else if (pct >= 40) scoreColor = "#f59e0b";

            return (
              <div
                key={ev.id}
                onClick={() => setDetailEval(ev)}
                style={{
                  background: "#fff", borderRadius: 16, overflow: "hidden",
                  border: "1px solid #e2e8f0", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ background: "linear-gradient(135deg, #0369a1, #0ea5e9)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ClipboardList size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>{ev.template?.name || "تقييم"}</div>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>{site?.name || ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {ev.template?.target_role_label && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 10px" }}>
                        <Tag size={12} color="#fff" />
                        <span style={{ color: "#fff", fontSize: "0.78rem" }}>{ev.template.target_role_label}</span>
                      </div>
                    )}
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Star size={14} color="#fbbf24" />
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{ev.total_score ?? 0}</span>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>/ {maxScore}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={16} color="#0369a1" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{stu?.name || "طالب"}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} />
                        {formatDate(ev.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <ScoreBar score={ev.total_score || 0} max={maxScore} />
                    {ev.notes && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: "0.8rem", maxWidth: 200 }}>
                        <MessageSquare size={13} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.notes.length > 35 ? ev.notes.slice(0, 35) + "…" : ev.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailEval && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={() => setDetailEval(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 620, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg, #0369a1, #0ea5e9)", padding: "20px 24px", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{detailEval.template?.name || "تقييم"}</div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>{detailEval.training_assignment?.training_site?.name || ""}</div>
                </div>
              </div>
              <button onClick={() => setDetailEval(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={18} color="#fff" />
              </button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={20} color="#0369a1" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>{detailEval.training_assignment?.enrollment?.user?.name || "طالب"}</div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} />{formatDate(detailEval.created_at)}
                  </div>
                </div>
                <div style={{ marginRight: "auto", textAlign: "left" }}>
                  {(() => {
                    const ms = maxPossible(detailEval) || 100;
                    const p = ms > 0 ? Math.min(((detailEval.total_score || 0) / ms) * 100, 100) : 0;
                    let c = "#ef4444";
                    if (p >= 80) c = "#22c55e"; else if (p >= 60) c = "#3b82f6"; else if (p >= 40) c = "#f59e0b";
                    return <>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: c }}>{detailEval.total_score ?? 0}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>من {ms}</div>
                    </>;
                  })()}
                </div>
              </div>

              {detailEval.scores && detailEval.scores.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Star size={15} color="#f59e0b" /> بنود التقييم
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detailEval.scores.map((s, idx) => {
                      const item = detailEval.template?.items?.find((i) => i.id === s.item_id);
                      const lbl = item?.description || item?.name || item?.title || `بند ${idx + 1}`;
                      const maxS = item?.max_score || item?.pivot?.max_score || 10;
                      const sc = s.score || 0;
                      const p = maxS > 0 ? Math.min((sc / maxS) * 100, 100) : 0;
                      let c = "#ef4444";
                      if (p >= 80) c = "#22c55e"; else if (p >= 60) c = "#3b82f6"; else if (p >= 40) c = "#f59e0b";
                      return (
                        <div key={s.id || idx} style={{ padding: "10px 14px", background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#334155" }}>{lbl}</span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: c }}>{sc} <span style={{ color: "#94a3b8", fontWeight: 400 }}>/ {maxS}</span></span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p}%`, borderRadius: 3, background: c, transition: "width 0.4s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {detailEval.notes && (
                <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <MessageSquare size={14} color="#d97706" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#92400e" }}>ملاحظات</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detailEval.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Evaluation Modal ─── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={closeModal}>
          <div style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 640, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg, #0369a1, #0ea5e9)", padding: "20px 24px", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>تقييم جديد ({label})</div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>أضف تقييماً لأداء طالب التدريب</div>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={18} color="#fff" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: "20px 24px" }}>
                {formError && (
                  <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: "0.88rem", marginBottom: 16 }}>{formError}</div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                    <User size={14} color="#0369a1" /> تعيين التدريب (الطالب) *
                  </label>
                  <select
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", background: "#fff", color: "#0f172a", outline: "none" }}
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
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                    <FileText size={14} color="#0369a1" /> قالب التقييم *
                  </label>
                  <select
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", background: "#fff", color: "#0f172a", outline: "none" }}
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
                  <div style={{ marginTop: 16, padding: "16px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                    <h5 style={{ margin: "0 0 14px", fontSize: "0.92rem", fontWeight: 600, color: "#0369a1", display: "flex", alignItems: "center", gap: 6 }}>
                      <Star size={15} color="#f59e0b" /> بنود التقييم
                    </h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {templateItems.map((item, idx) => {
                        const maxS = item.max_score || 10;
                        const sc = Number(scores[item.id]) || 0;
                        const p = maxS > 0 ? Math.min((sc / maxS) * 100, 100) : 0;
                        let c = "#94a3b8";
                        if (sc > 0) { c = "#ef4444"; if (p >= 80) c = "#22c55e"; else if (p >= 60) c = "#3b82f6"; else if (p >= 40) c = "#f59e0b"; }
                        return (
                          <div key={item.id} style={{ padding: "12px 14px", background: idx % 2 === 0 ? "#fff" : "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#334155" }}>{item.title || item.description || `بند ${item.id}`}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                  type="number" min={0} max={maxS}
                                  value={scores[item.id] || ""}
                                  onChange={(e) => handleScoreChange(item.id, e.target.value)}
                                  placeholder="0"
                                  style={{ width: 52, padding: "6px 8px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.88rem", textAlign: "center", fontWeight: 600, color: c, outline: "none" }}
                                />
                                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>/ {maxS}</span>
                              </div>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${p}%`, borderRadius: 3, background: c, transition: "width 0.3s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                    <MessageSquare size={14} color="#0369a1" /> ملاحظات عامة
                  </label>
                  <textarea
                    rows={3} value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية على أداء الطالب..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", resize: "vertical", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={closeModal} disabled={saving}
                  style={{ padding: "10px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "0.9rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}>
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #0369a1, #0ea5e9)", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(3,105,161,0.3)", opacity: saving ? 0.6 : 1 }}>
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
