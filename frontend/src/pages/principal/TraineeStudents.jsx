import { useEffect, useMemo, useState } from "react";
import {
  createEvaluation,
  getCurrentUser,
  getTrainingAssignments,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
import { readStoredUser } from "../../utils/session";
import {
  ClipboardCheck, User, School, MapPin, GraduationCap, Calendar, BookOpen, Save, Loader2, CheckCircle2, AlertCircle, Filter
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const spin = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`;

const EDUC_EVAL_FIELDS = [
  { key: "attendance",              label: "الدوام" },
  { key: "cooperation_with_staff",  label: "التعاون مع الهيئة التدريسية" },
  { key: "dealing_with_students",   label: "التعامل مع الطلبة" },
  { key: "participation",           label: "المشاركة في الأنشطة" },
  { key: "school_rules",            label: "الالتزام بأنظمة المدرسة" },
  { key: "classroom_management",    label: "إدارة الصف" },
  { key: "professional_ethics",     label: "أخلاقيات المهنة" },
  { key: "manners",                 label: "السلوك والأخلاق العامة" },
  { key: "adaptability",            label: "القدرة على التكيف" },
  { key: "supervisor_response",     label: "الاستجابة لتوجيهات المشرف" },
];

const PSYCH_EVAL_FIELDS = [
  { key: "attendance",       label: "يلتزم الطالب بالدوام وفق برنامج الدوام المحدد" },
  { key: "rules_compliance", label: "يلتزم الطالب بالأنظمة والقوانين الناظمة للعمل في المدرسة" },
  { key: "initiative",       label: "الطالب مبادر ومشارك في الأنشطة الداعمة للعمل الإرشادي في المدرسة" },
  { key: "communication",   label: "لديه مهارات تواصل فعال مع جميع العاملين في المدرسة" },
  { key: "responsibility",   label: "لديه حس المسؤولية والالتزام في تنفيذ المهام المطلوبة منه" },
];

const TraineeStudents = ({ siteType = "school" }) => {
  const labels = siteLabels(siteType);
  const currentUser = useMemo(() => readStoredUser(), []);
  const isSchoolManager = currentUser?.role?.name === 'school_manager';

  const [studentsData, setStudentsData] = useState([]);
  const [deptFilter, setDeptFilter] = useState("education");
  const [scoresByStudent, setScoresByStudent] = useState({});
  const [schoolInfo, setSchoolInfo] = useState({ name: "—", directorate: "—", location: "—" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const [userRes, assignmentsRes] = await Promise.all([
        getCurrentUser(),
        getTrainingAssignments({ per_page: 200 }),
      ]);
      const user = userRes?.data || userRes || {};
      const trainingSite = user.training_site?.data || user.training_site || {};
      const allAssignments = Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const schoolAssignments = allAssignments.filter((a) => {
        const id = a.training_site?.data?.id || a.training_site?.id;
        return trainingSite?.id ? id === trainingSite.id : true;
      });
      const students = schoolAssignments
        .map((a) => {
          const enrollment = a.enrollment?.data || a.enrollment || {};
          const student = enrollment.user?.data || enrollment.user || {};
          const section = enrollment.section?.data || enrollment.section || {};
          const course = enrollment.section?.data?.course?.data || enrollment.section?.course?.data || enrollment.section?.course || {};
          const mentor = a.teacher?.data || a.teacher || {};
          const deptName = student.department?.data?.name || student.department?.name || null;
          const track = deptName === 'psychology' ? 'psychology' : deptName === 'usool_tarbiah' ? 'education' : null;
          return {
            id: a.id, assignmentId: a.id, name: student.name || "—",
            universityNumber: student.university_id || "—", universityName: "جامعة الخليل",
            academicYear: enrollment.academic_year || section.academic_year || "—",
            semester: enrollment.semester || section.semester || "—",
            mentorName: mentor.name || "—", specialization: course.name || "—",
            directorate: trainingSite.directorate || "—", schoolName: trainingSite.name || "—",
            schoolAddress: trainingSite.location || "—", track, deptName,
          };
        })
        .filter((item) => item.name !== "—");

      setStudentsData(students);
      setDeptFilter("education");
      setSelectedStudentId(null);
      setSchoolInfo({ name: trainingSite.name || "—", directorate: trainingSite.directorate || "—", location: trainingSite.location || "—" });
      if (!students.length) setErrorMessage(`لا يوجد طلبة متدربون معتمدون في ${labels.siteName} حاليًا.`);
      else setErrorMessage("");
    } catch (error) {
      setErrorMessage("تعذر تحميل بيانات الطلبة المتدربين.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!isSchoolManager || deptFilter === "all") return studentsData;
    if (deptFilter === "psychology") return studentsData.filter(s => s.track === 'psychology');
    if (deptFilter === "education") return studentsData.filter(s => s.track === 'education');
    return studentsData;
  }, [studentsData, deptFilter, isSchoolManager]);

  const selectedStudent = useMemo(
    () => filteredStudents.find((s) => s.id === selectedStudentId) || filteredStudents[0] || null,
    [filteredStudents, selectedStudentId]
  );

  const usePsychForm = isSchoolManager && (selectedStudent?.track === 'psychology' || (!selectedStudent && deptFilter === 'psychology'));

  const selectedScores = useMemo(() => scoresByStudent[selectedStudentId] || {}, [scoresByStudent, selectedStudentId]);

  const handleDeptFilterChange = (val) => { setDeptFilter(val); setSavedMessage(""); setSelectedStudentId(null); };
  const handleStudentChange = (e) => { const v = e.target.value; setSelectedStudentId(v ? Number(v) : null); setSavedMessage(""); };

  const handleNotesChange = (itemId, value) => {
    setScoresByStudent((prev) => ({ ...prev, [selectedStudentId]: { ...(prev[selectedStudentId] || {}), [itemId]: value } }));
    setSavedMessage("");
  };

  const handleGeneralNotesChange = (value) => {
    setScoresByStudent((prev) => ({ ...prev, [selectedStudentId]: { ...(prev[selectedStudentId] || {}), __generalNotes: value } }));
    setSavedMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { setErrorMessage("يرجى اختيار طالب أولاً."); return; }
    try {
      setSaving(true); setSavedMessage(""); setErrorMessage("");
      if (usePsychForm) {
        const scoresPayload = PSYCH_EVAL_FIELDS.map((f) => ({ item_id: f.key, response_text: String(selectedScores[f.key] || ""), score: Number(selectedScores[f.key] || 0) }));
        await createEvaluation({ training_assignment_id: selectedStudent.assignmentId, template_id: null, scores: scoresPayload, notes: selectedScores.__generalNotes || null, evaluation_type: "psychology_school" });
      } else {
        const scoresPayload = EDUC_EVAL_FIELDS.flatMap((f) => [
          { item_id: f.key, response_text: String(selectedScores[f.key] || ""), score: Number(selectedScores[f.key] || 0) },
          { item_id: `${f.key}__notes`, response_text: selectedScores[`${f.key}__notes`] || "", score: null },
        ]);
        await createEvaluation({ training_assignment_id: selectedStudent.assignmentId, template_id: null, scores: scoresPayload, notes: selectedScores.__generalNotes || null, evaluation_type: "education_school" });
      }
      setSavedMessage("تم حفظ تقييم الطالب بنجاح وإضافته لملف الإنجاز.");
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "تعذر حفظ التقييم.");
    } finally {
      setSaving(false);
    }
  };

  const educTotal = EDUC_EVAL_FIELDS.reduce((s, f) => s + (Number(selectedScores[f.key]) || 0), 0);
  const psychTotal = PSYCH_EVAL_FIELDS.reduce((s, f) => s + (Number(selectedScores[f.key]) || 0), 0);

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Hero */}
        <div style={{
          background: usePsychForm
            ? "linear-gradient(135deg, #0e7490 0%, #0891b2 60%, #06b6d4 100%)"
            : "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          borderRadius: 20, padding: "2rem 2.5rem", color: "white", marginBottom: "1.5rem",
          boxShadow: usePsychForm ? "0 8px 32px rgba(14,116,144,0.3)" : "0 8px 32px rgba(30,58,95,0.3)",
          transition: "all 0.4s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={28} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>تقييم الطلبة</h1>
              <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                {usePsychForm ? "نموذج تقييم طلاب علم النفس" : "نموذج تقييم طلاب أصول التربية"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {savedMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#d1fae5", color: "#059669", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <CheckCircle2 size={20} /> {savedMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#fee2e2", color: "#dc2626", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <AlertCircle size={20} /> {errorMessage}
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل الطلبة..." />
        ) : (
          <>
            {/* Student Selection Card */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "1.5rem 2rem",
              border: "1px solid #e2e8f0", marginBottom: "1.25rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Filter size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>اختيار الطالب</h3>
              </div>

              {isSchoolManager && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem", display: "block" }}>تصفية حسب القسم</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[
                      { val: "education", label: "أصول التربية", activeBg: "#1d4ed8" },
                      { val: "psychology", label: "علم النفس", activeBg: "#7c3aed" },
                    ].map(opt => (
                      <button key={opt.val} type="button" onClick={() => handleDeptFilterChange(opt.val)}
                        style={{
                          padding: "0.5rem 1.25rem", borderRadius: 99, fontWeight: 700, fontSize: "0.85rem",
                          border: deptFilter === opt.val ? "none" : "1.5px solid #e2e8f0",
                          background: deptFilter === opt.val ? opt.activeBg : "#f8fafc",
                          color: deptFilter === opt.val ? "white" : "#475569",
                          cursor: "pointer", transition: "all 0.2s",
                          boxShadow: deptFilter === opt.val ? `0 2px 8px ${opt.activeBg}40` : "none",
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem", display: "block" }}>اختر الطالب المتدرب</label>
                <select value={selectedStudentId ?? ""} onChange={handleStudentChange} disabled={!filteredStudents.length}
                  style={{
                    width: "100%", maxWidth: 400, padding: "0.65rem 1rem", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontWeight: 500,
                    background: "#f8fafc", color: "#1e293b", outline: "none",
                  }}
                >
                  <option value="">— اختر الطالب —</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.track === 'psychology' ? ' (علم النفس)' : s.track === 'education' ? ' (أصول التربية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Info Card */}
            {selectedStudent && (
              <div style={{
                background: "#fff", borderRadius: 16, padding: "1.5rem 2rem",
                border: "1px solid #e2e8f0", marginBottom: "1.25rem",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #e0f2fe, #bae6fd)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>بيانات الطالب</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                  {[
                    { icon: User, label: "اسم الطالب", value: selectedStudent.name, color: "#2563eb", bg: "#dbeafe" },
                    { icon: GraduationCap, label: "الجامعة", value: selectedStudent.universityName, color: "#7c3aed", bg: "#ede9fe" },
                    { icon: Calendar, label: "العام الدراسي", value: selectedStudent.academicYear, color: "#0284c7", bg: "#e0f2fe" },
                    { icon: BookOpen, label: "الفصل", value: selectedStudent.semester, color: "#059669", bg: "#d1fae5" },
                    { icon: User, label: labels.mentorLabel, value: selectedStudent.mentorName, color: "#d97706", bg: "#fef3c7" },
                    { icon: School, label: labels.siteName, value: schoolInfo.name || selectedStudent.schoolName, color: "#1e3a5f", bg: "#dbeafe" },
                    { icon: MapPin, label: "المديرية", value: schoolInfo.directorate || selectedStudent.directorate, color: "#dc2626", bg: "#fee2e2" },
                    { icon: MapPin, label: "العنوان", value: schoolInfo.location || selectedStudent.schoolAddress, color: "#64748b", bg: "#f1f5f9" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>{item.label}</div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluation Form Card */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "1.5rem 2rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: usePsychForm ? "linear-gradient(135deg, #ecfeff, #cffafe)" : "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                  color: usePsychForm ? "#0e7490" : "#1e3a5f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ClipboardCheck size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>نموذج التقييم</h3>
              </div>

              <form onSubmit={handleSubmit}>
                {usePsychForm ? (
                  <div style={{ overflowX: "auto", marginBottom: "1.5rem", borderRadius: 12, border: "1px solid #cffafe" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl", fontSize: "0.88rem" }}>
                      <thead>
                        <tr style={{ background: "linear-gradient(135deg, #0e7490 0%, #0891b2 100%)", color: "white" }}>
                          <th style={{ padding: "0.85rem 0.6rem", width: 44, textAlign: "center" }}>#</th>
                          <th style={{ padding: "0.85rem 0.8rem" }}>المؤشر</th>
                          {[1,2,3,4,5].map(n => <th key={n} style={{ padding: "0.85rem 0.4rem", width: 54, textAlign: "center" }}>{n}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {PSYCH_EVAL_FIELDS.map((field, idx) => (
                          <tr key={field.key} style={{ background: idx % 2 === 0 ? "#f0fdfa" : "white" }}>
                            <td style={{ padding: "0.75rem", textAlign: "center", fontWeight: 700, color: "#0e7490" }}>{idx + 1}</td>
                            <td style={{ padding: "0.75rem 1rem", color: "#1e293b", fontWeight: 500 }}>{field.label}</td>
                            {[1,2,3,4,5].map(rating => (
                              <td key={rating} style={{ padding: "0.4rem", textAlign: "center" }}>
                                <button type="button" onClick={() => handleNotesChange(field.key, rating)}
                                  style={{
                                    width: 36, height: 36, borderRadius: "50%",
                                    border: selectedScores[field.key] === rating ? "none" : "1.5px solid #a5f3fc",
                                    background: selectedScores[field.key] === rating
                                      ? "linear-gradient(135deg, #0e7490, #0891b2)" : "#f0fdfa",
                                    color: selectedScores[field.key] === rating ? "white" : "#0e7490",
                                    fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
                                    transition: "all 0.15s",
                                    boxShadow: selectedScores[field.key] === rating ? "0 2px 8px rgba(14,116,144,0.3)" : "none",
                                  }}
                                >{rating}</button>
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr style={{ background: "#ecfeff" }}>
                          <td colSpan={2} style={{ padding: "0.85rem", textAlign: "center", fontWeight: 800, color: "#0e7490" }}>المجموع</td>
                          <td colSpan={5} style={{ padding: "0.85rem", textAlign: "center", fontWeight: 800, color: "#0e7490", fontSize: "1.1rem" }}>{psychTotal} / 25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", marginBottom: "1.5rem", borderRadius: 12, border: "1px solid #dbeafe" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl", fontSize: "0.88rem" }}>
                      <thead>
                        <tr style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)", color: "white" }}>
                          <th style={{ padding: "0.85rem 0.6rem", width: 44, textAlign: "center" }}>#</th>
                          <th style={{ padding: "0.85rem 0.8rem" }}>المحور</th>
                          <th style={{ padding: "0.85rem 0.6rem", width: 130, textAlign: "center" }}>التقدير (0-10)</th>
                          <th style={{ padding: "0.85rem 0.8rem" }}>الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EDUC_EVAL_FIELDS.map((field, idx) => (
                          <tr key={field.key} style={{ background: idx % 2 === 0 ? "#f8fafc" : "white" }}>
                            <td style={{ padding: "0.75rem", textAlign: "center", fontWeight: 700, color: "#1e3a5f" }}>{idx + 1}</td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "#1e293b" }}>{field.label}</td>
                            <td style={{ padding: "0.5rem", textAlign: "center" }}>
                              <input type="number" min="0" max="10"
                                value={selectedScores[field.key] ?? ""}
                                onChange={(e) => handleNotesChange(field.key, e.target.value)}
                                placeholder="0-10"
                                style={{
                                  width: 80, textAlign: "center", border: "1.5px solid #cbd5e1",
                                  borderRadius: 8, padding: "0.4rem 0.5rem", fontSize: "0.9rem",
                                  fontWeight: 600, background: "#f8fafc", outline: "none",
                                }}
                              />
                            </td>
                            <td style={{ padding: "0.5rem" }}>
                              <textarea value={selectedScores[`${field.key}__notes`] || ""}
                                onChange={(e) => handleNotesChange(`${field.key}__notes`, e.target.value)}
                                placeholder="ملاحظات" rows={2}
                                style={{
                                  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
                                  padding: "0.4rem 0.6rem", fontSize: "0.85rem", resize: "vertical",
                                  background: "#f8fafc", outline: "none",
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: "#eff6ff" }}>
                          <td colSpan={2} style={{ padding: "0.85rem", textAlign: "center", fontWeight: 800, color: "#1e3a5f" }}>المجموع</td>
                          <td style={{ padding: "0.85rem", textAlign: "center", fontWeight: 800, color: "#1e3a5f", fontSize: "1.1rem" }}>{educTotal} / 100</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* General Notes */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem", display: "block" }}>ملاحظات عامة</label>
                  <textarea value={selectedScores.__generalNotes || ""}
                    onChange={(e) => handleGeneralNotesChange(e.target.value)}
                    placeholder="اكتب ملاحظات عامة حول أداء الطالب..." rows={3}
                    style={{
                      width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 12,
                      padding: "0.75rem 1rem", fontSize: "0.9rem", resize: "vertical",
                      background: "#f8fafc", outline: "none",
                    }}
                  />
                </div>

                {/* Submit */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={saving || !selectedStudent}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.85rem 2rem", border: "none", borderRadius: 12,
                      background: saving ? "#94a3b8" : usePsychForm
                        ? "linear-gradient(135deg, #0e7490, #0891b2)"
                        : "linear-gradient(135deg, #1e3a5f, #2d5f8a)",
                      color: "white", fontSize: "1rem", fontWeight: 700,
                      cursor: saving || !selectedStudent ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1, transition: "all 0.2s",
                      boxShadow: "0 4px 12px rgba(30,58,95,0.3)",
                    }}
                  >
                    {saving ? <LoadingSpinner size="button" /> : <Save size={20} />}
                    {saving ? "جاري الحفظ..." : "حفظ التقييم"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TraineeStudents;
