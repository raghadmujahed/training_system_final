import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStudentEForms, saveStudentEForm, updateStudentEForm, addPortfolioEntry, uploadPortfolioFile, updatePortfolioEntry } from "../../services/api";
import html2pdf from "html2pdf.js";
import { Loader2, Save, Plus, Trash2, RotateCcw, BookOpen, FileText, ClipboardCheck, FileBarChart, FileSpreadsheet, GraduationCap, ArrowRight, CheckCircle2, Clock, Edit3 } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useStudentTrack } from "../../hooks/useStudentTrack";
import { useToast } from "../../components/Toast";

// CSS Animation for smooth form appearance
const fadeInStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body * { visibility: hidden; }
  #printable-area, #printable-area * { visibility: visible; }
  #printable-area { position: absolute; left: 0; top: 0; width: 100%; direction: rtl; }
  .no-print { display: none !important; }
  .form-section-header { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  input, textarea { border: 1px solid #ccc !important; padding: 4px 8px !important; font-size: 11px !important; width: 100% !important; background: white !important; box-shadow: none !important; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #aaa !important; padding: 6px 8px !important; font-size: 11px !important; }
  th { background-color: #e0e0e0 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h4, h5 { font-size: 13px !important; }
  label { font-size: 11px !important; font-weight: 600; }
}
`;

const allForms = [
  { key: "weekly_reflection", title: "نموذج التأمل الأسبوعي", desc: "تأمل ذاتي أسبوعي في التجربة التدريبية", icon: BookOpen, color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)", educationOnly: true },
  { key: "field_visit_summary", title: "ملخص الزيارة الميدانية", desc: "توثيق الزيارات الميدانية والملاحظات", icon: ClipboardCheck, color: "#0891b2", gradient: "linear-gradient(135deg, #0891b2, #06b6d4)", educationOnly: true },
  { key: "learning_experience_review", title: "نقد خبرات التعلم", desc: "تقييم وتقويم الخبرات التعليمية المكتسبة", icon: FileText, color: "#059669", gradient: "linear-gradient(135deg, #059669, #34d399)", educationOnly: true },
  { key: "weekly_brief_report", title: "التقرير المختصر الأسبوعي", desc: "تقرير شامل عن الأنشطة والتأمل الذاتي", icon: FileBarChart, color: "#d97706", gradient: "linear-gradient(135deg, #d97706, #fbbf24)", educationOnly: true },
  { key: "weekly_full_report", title: "التقرير الأسبوعي", desc: "تقرير مفصل عن الأنشطة والمهام المنفذة", icon: FileSpreadsheet, color: "#dc2626", gradient: "linear-gradient(135deg, #e11d48, #f43f5e)", educationOnly: true },
  { key: "classes_count", title: "عدد الحصص التي درسها الطالب", desc: "تسجيل الحصص النوعية التي قام الطالب بتدريسها", icon: GraduationCap, color: "#7c3aed", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)", educationOnly: true },
  { key: "daily_tasks_report", title: "تقرير المهام والأعمال اليومية", desc: "توثيق المهام والأعمال اليومية وملاحظات المرشد التربوي", icon: ClipboardCheck, color: "#0e7490", gradient: "linear-gradient(135deg, #0e7490, #06b6d4)", psychologyOnly: true },
];

export default function EForms() {
  const { addToast } = useToast();
  const location = useLocation();
  const { config } = useStudentTrack();
  const availableForms = allForms.filter(f => {
    if (f.educationOnly && !config.isEducation) return false;
    if (f.psychologyOnly && !config.isPsychology) return false;
    return true;
  });
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);

  // Teaching sessions state (الحصص النوعية)
  const [teachingSessions, setTeachingSessions] = useState([
    { id: 1, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 2, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 3, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 4, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 5, grade: "", subject: "", topic: "", sessionsCount: "" },
  ]);

  // Learning experience review state (نقد خبرات التعلم)
  const [learningExperience, setLearningExperience] = useState({
    plansAndObjectives: "",
    lessonImplementation: "",
    introduction: "",
    presentation: "",
    closure: "",
    classroomManagement: "",
    studentMotivation: "",
    methodsAndApproaches: "",
    teachingAids: "",
    evaluationAndTesting: "",
    teacherRoles: ""
  });

  // Weekly report state (التقرير الأسبوعي)
  const [weeklyReport, setWeeklyReport] = useState({
    course: "",
    morningAssembly: "",
    duty: "",
    implementedLessons: "",
    teachingAids: "",
    activities: "",
    meetings: ""
  });

  // Weekly brief report state (التقرير المختصر الأسبوعي)
  const [weeklyBriefReport, setWeeklyBriefReport] = useState({
    // القسم الأول: التخطيط والتحضير
    lessonsTaught: "",
    worksheetsCount: "",
    teachingMaterials: "",
    otherWorks: "",
    // القسم الثاني: العمل والإنجاز الصفي
    observedStrengths: "",
    coTeachingReflection: "",
    selfTeachingReflection: "",
    // القسم الثالث: الجوانب السلوكي والمهني
    studentAttendance: "",
    studentDiscipline: "",
    studentInteraction: "",
    schoolSupport: "",
    professionalRelations: "",
    // القسم الرابع: التقييم والتأمل الذاتي
    strengthsThisWeek: "",
    areasForImprovement: "",
    supervisorSupportNeeds: ""
  });

  // Weekly reflection state (التأمل الأسبوعي)
  const [weeklyReflection, setWeeklyReflection] = useState({
    reflection: "",
    notes: "",
    summary: "",
  });

  // Field visit summary state (ملخص الزيارة الميدانية)
  const [fieldVisitSummary, setFieldVisitSummary] = useState({
    visitDate: "",
    visitPurpose: "",
    observations: "",
    recommendations: "",
  });

  // Daily tasks report state (تقرير المهام والأعمال اليومية)
  const emptyDailyTaskRow = () => ({ id: Date.now() + Math.random(), tasksCompleted: "", goals: "", skills: "", challenges: "", effortOnChallenges: "", supervisorNotes: "" });
  const [dailyTaskRows, setDailyTaskRows] = useState(() => Array.from({ length: 5 }, emptyDailyTaskRow));

  const addDailyTaskRow = () => setDailyTaskRows(prev => [...prev, emptyDailyTaskRow()]);
  const deleteDailyTaskRow = (id) => { if (dailyTaskRows.length > 1) setDailyTaskRows(prev => prev.filter(r => r.id !== id)); };
  const updateDailyTaskRow = (id, field, value) => setDailyTaskRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  const resetDailyTaskRows = () => setDailyTaskRows(Array.from({ length: 5 }, emptyDailyTaskRow));

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudentEForms();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setForms(list);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل النماذج.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Handle edit entry from Portfolio page
  useEffect(() => {
    const editData = location.state?.editEntry;
    if (!editData) return;

    const { formKey, content } = editData;
    // Find the eform ID from the saved forms list
    const matchingForm = forms.find(f => f.form_key === formKey);
    const eformId = matchingForm?.id || editData.eformId || null;
    setEditingEntry({ ...editData, eformId });
    setSelectedForm(formKey);

    // Parse saved form data and load it
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      if (formKey === "learning_experience_review" && parsed) {
        setLearningExperience(prev => ({ ...prev, ...parsed }));
      } else if (formKey === "weekly_full_report" && parsed) {
        setWeeklyReport(prev => ({ ...prev, ...parsed }));
      } else if (formKey === "weekly_brief_report" && parsed) {
        setWeeklyBriefReport(prev => ({ ...prev, ...parsed }));
      } else if (formKey === "weekly_reflection" && parsed) {
        setWeeklyReflection(prev => ({ ...prev, ...parsed }));
      } else if (formKey === "field_visit_summary" && parsed) {
        setFieldVisitSummary(prev => ({ ...prev, ...parsed }));
      } else if (formKey === "classes_count" && Array.isArray(parsed)) {
        setTeachingSessions(parsed);
      } else if (formKey === "daily_tasks_report" && Array.isArray(parsed)) {
        setDailyTaskRows(parsed);
      }
    } catch {
      // Content may not be valid JSON — ignore
    }

    // Clear the navigation state so it doesn't reload on re-render
    window.history.replaceState({}, "");
  }, [location.state]);

  const getFormStatus = (formKey) => {
    const form = forms.find(f => f.form_key === formKey);
    if (!form) return { status: "new", label: "جديد" };
    if (form.status === "submitted") return { status: "submitted", label: "مرسل" };
    if (form.status === "draft") return { status: "draft", label: "مسودة" };
    return { status: "new", label: "جديد" };
  };

  const handleFormSelect = (formKey) => {
    if (!formKey) return;
    // Reset form state only when not editing (fresh entry)
    if (editingEntry) return;
    if (formKey === "learning_experience_review") resetLearningExperience();
    else if (formKey === "weekly_full_report") resetWeeklyReport();
    else if (formKey === "weekly_brief_report") resetWeeklyBriefReport();
    else if (formKey === "weekly_reflection") resetWeeklyReflection();
    else if (formKey === "field_visit_summary") resetFieldVisitSummary();
    else if (formKey === "classes_count") resetTeachingSessions();
    else if (formKey === "daily_tasks_report") resetDailyTaskRows();
  };

  // Weekly brief report handlers
  const updateWeeklyBriefReport = (field, value) => {
    setWeeklyBriefReport(prev => ({ ...prev, [field]: value }));
  };

  const resetWeeklyBriefReport = () => {
    setWeeklyBriefReport({
      lessonsTaught: "",
      worksheetsCount: "",
      teachingMaterials: "",
      otherWorks: "",
      observedStrengths: "",
      coTeachingReflection: "",
      selfTeachingReflection: "",
      studentAttendance: "",
      studentDiscipline: "",
      studentInteraction: "",
      schoolSupport: "",
      professionalRelations: "",
      strengthsThisWeek: "",
      areasForImprovement: "",
      supervisorSupportNeeds: ""
    });
  };

  // Weekly report handlers
  const updateWeeklyReport = (field, value) => {
    setWeeklyReport(prev => ({ ...prev, [field]: value }));
  };

  const resetWeeklyReport = () => {
    setWeeklyReport({
      course: "",
      morningAssembly: "",
      duty: "",
      implementedLessons: "",
      teachingAids: "",
      activities: "",
      meetings: ""
    });
  };

  // Learning experience handlers
  const updateLearningExperience = (field, value) => {
    setLearningExperience(prev => ({ ...prev, [field]: value }));
  };

  const resetLearningExperience = () => {
    setLearningExperience({
      plansAndObjectives: "",
      lessonImplementation: "",
      introduction: "",
      presentation: "",
      closure: "",
      classroomManagement: "",
      studentMotivation: "",
      methodsAndApproaches: "",
      teachingAids: "",
      evaluationAndTesting: "",
      teacherRoles: ""
    });
  };

  // Weekly reflection handlers
  const updateWeeklyReflection = (field, value) => {
    setWeeklyReflection(prev => ({ ...prev, [field]: value }));
  };
  const resetWeeklyReflection = () => {
    setWeeklyReflection({ reflection: "", notes: "", summary: "" });
  };

  // Field visit summary handlers
  const updateFieldVisitSummary = (field, value) => {
    setFieldVisitSummary(prev => ({ ...prev, [field]: value }));
  };
  const resetFieldVisitSummary = () => {
    setFieldVisitSummary({ visitDate: "", visitPurpose: "", observations: "", recommendations: "" });
  };

  // Teaching sessions handlers
  const addTeachingSession = () => {
    const newId = teachingSessions.length > 0 ? Math.max(...teachingSessions.map(s => s.id)) + 1 : 1;
    setTeachingSessions([...teachingSessions, { id: newId, grade: "", subject: "", topic: "", sessionsCount: "" }]);
  };

  const deleteTeachingSession = (id) => {
    if (teachingSessions.length > 1) {
      setTeachingSessions(teachingSessions.filter(session => session.id !== id));
    }
  };

  const updateTeachingSession = (id, field, value) => {
    setTeachingSessions(teachingSessions.map(session =>
      session.id === id ? { ...session, [field]: value } : session
    ));
  };

  const resetTeachingSessions = () => {
    setTeachingSessions([
      { id: 1, grade: "", subject: "", topic: "", sessionsCount: "" },
      { id: 2, grade: "", subject: "", topic: "", sessionsCount: "" },
      { id: 3, grade: "", subject: "", topic: "", sessionsCount: "" },
      { id: 4, grade: "", subject: "", topic: "", sessionsCount: "" },
      { id: 5, grade: "", subject: "", topic: "", sessionsCount: "" },
    ]);
  };

  const generatePdf = async () => {
    const element = document.getElementById('printable-area');
    if (!element) return null;
    const formTitle = availableForms.find(f => f.key === selectedForm)?.title || 'form';

    // Inject a temporary style that hides no-print elements and buttons
    const tempStyle = document.createElement('style');
    tempStyle.id = 'pdf-hide-style';
    tempStyle.textContent = `
      #printable-area .no-print,
      #printable-area .no-print * { display: none !important; height: 0 !important; overflow: hidden !important; }
      #printable-area button { display: none !important; }
    `;
    document.head.appendChild(tempStyle);

    // Small delay to let the browser apply the CSS
    await new Promise(r => setTimeout(r, 100));

    const opt = {
      margin: 10,
      filename: `${formTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    try {
      const blob = await html2pdf().set(opt).from(element).output('blob');
      return blob;
    } finally {
      // Remove the temporary style to restore UI
      const s = document.getElementById('pdf-hide-style');
      if (s) s.remove();
    }
  };


  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const formTitle = availableForms.find(f => f.key === selectedForm)?.title || 'نموذج';
      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      const entryTitle = `${formTitle} — ${dateStr} ${timeStr}`;
      // Only reuse the portfolio entry ID if the student explicitly opened an existing entry for editing
      const isExplicitEdit = !!(editingEntry?.eformId && editingEntry?.id);
      let entryId = isExplicitEdit ? editingEntry.id : null;
      let formData = null;

      if (selectedForm === "classes_count") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: teachingSessions });
        } else {
          await saveStudentEForm({ form_key: "classes_count", title: formTitle, payload: teachingSessions });
        }
        formData = teachingSessions;
      } else if (selectedForm === "learning_experience_review") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: learningExperience });
        } else {
          await saveStudentEForm({ form_key: "learning_experience_review", title: formTitle, payload: learningExperience });
        }
        formData = learningExperience;
      } else if (selectedForm === "weekly_full_report") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: weeklyReport });
        } else {
          await saveStudentEForm({ form_key: "weekly_full_report", title: formTitle, payload: weeklyReport });
        }
        formData = weeklyReport;
      } else if (selectedForm === "weekly_brief_report") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: weeklyBriefReport });
        } else {
          await saveStudentEForm({ form_key: "weekly_brief_report", title: formTitle, payload: weeklyBriefReport });
        }
        formData = weeklyBriefReport;
      } else if (selectedForm === "weekly_reflection") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: weeklyReflection });
        } else {
          await saveStudentEForm({ form_key: "weekly_reflection", title: formTitle, payload: weeklyReflection });
        }
        formData = weeklyReflection;
      } else if (selectedForm === "field_visit_summary") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: fieldVisitSummary });
        } else {
          await saveStudentEForm({ form_key: "field_visit_summary", title: formTitle, payload: fieldVisitSummary });
        }
        formData = fieldVisitSummary;
      } else if (selectedForm === "daily_tasks_report") {
        if (editingEntry?.eformId) {
          await updateStudentEForm(editingEntry.eformId, { title: formTitle, payload: dailyTaskRows });
        } else {
          await saveStudentEForm({ form_key: "daily_tasks_report", title: formTitle, payload: dailyTaskRows });
        }
        formData = dailyTaskRows;
      }

      // Update existing entry or always create new one to portfolio
      if (isExplicitEdit && entryId && formData) {
        // Update existing portfolio entry (only when editing from portfolio)
        try {
          await updatePortfolioEntry(entryId, {
            title: entryTitle,
            content: JSON.stringify(formData, null, 2),
          });
        } catch {
          // Portfolio update failure is non-critical
        }
      } else if (formData) {
        // Always create a new portfolio entry for each save
        try {
          const fd = new FormData();
          fd.append("title", entryTitle);
          fd.append("content", JSON.stringify(formData, null, 2));
          const res = await addPortfolioEntry(fd);
          entryId = res?.data?.id || res?.id || null;
        } catch (portfolioErr) {
          console.warn("Portfolio entry creation failed:", portfolioErr?.response?.data || portfolioErr?.message);
          // Portfolio failure is non-critical — e-form was saved successfully
        }
      }

      // Generate PDF and upload to the portfolio entry
      try {
        const pdfBlob = await generatePdf();
        if (pdfBlob && entryId) {
          await uploadPortfolioFile(entryId, pdfBlob, `${formTitle}.pdf`);
        }
      } catch {
        // PDF upload failure is non-critical
      }

      const actionText = editingEntry ? "تعديل" : "حفظ";
      setSuccess(`تم ${actionText} "${formTitle}" وإضافته لملف الإنجاز بنجاح!`);
      addToast(`تم ${actionText} "${formTitle}" بنجاح`, "success");
      setEditingEntry(null);
      // Reset form so student can fill again fresh
      if (selectedForm === "weekly_full_report") resetWeeklyReport();
      else if (selectedForm === "weekly_brief_report") resetWeeklyBriefReport();
      else if (selectedForm === "learning_experience_review") resetLearningExperience();
      else if (selectedForm === "weekly_reflection") resetWeeklyReflection();
      else if (selectedForm === "field_visit_summary") resetFieldVisitSummary();
      else if (selectedForm === "classes_count") resetTeachingSessions();
      else if (selectedForm === "daily_tasks_report") resetDailyTaskRows();
      setTimeout(() => {
        setSuccess("");
        setSelectedForm("");
      }, 2500);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "فشل حفظ النموذج.");
      addToast(e?.response?.data?.message || "فشل حفظ النموذج.", "error");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "submitted") return { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle2, text: "مرسل" };
    if (status === "draft") return { bg: "#fef3c7", color: "#d97706", icon: Edit3, text: "مسودة" };
    return { bg: "#f1f5f9", color: "#64748b", icon: Clock, text: "جديد" };
  };

  return (
    <>
      <style>{fadeInStyles}</style>
      <div className="content-header">
        <h1 className="page-title">النماذج والتقارير</h1>
        <p className="page-subtitle">اختر النموذج أو التقرير المطلوب تعبئته</p>
      </div>

      {error ? <div className="alert-custom alert-danger mb-3">{error}</div> : null}
      {success ? <div className="alert-custom alert-success mb-3">{success}</div> : null}

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : availableForms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#64748b" }}>
          <FileText size={52} color="#cbd5e1" style={{ marginBottom: "1rem" }} />
          <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد نماذج متاحة حالياً</h3>
          <p style={{ margin: 0 }}>النماذج الخاصة بمسار علم النفس ستُضاف قريباً.</p>
        </div>
      ) : (
        <>
          {/* بطاقات النماذج */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
            marginBottom: selectedForm ? "2rem" : 0
          }}>
            {availableForms.map((f) => {
              const status = getFormStatus(f.key);
              const badge = statusBadge(status.status);
              const BadgeIcon = badge.icon;
              const FormIcon = f.icon;
              const isActive = selectedForm === f.key;
              return (
                <div
                  key={f.key}
                  onClick={() => {
                    setSelectedForm(f.key);
                    if (f.key) handleFormSelect(f.key);
                  }}
                  style={{
                    backgroundColor: isActive ? "#f8fafc" : "white",
                    borderRadius: "16px",
                    border: isActive ? `2px solid ${f.color}` : "2px solid #e9ecef",
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: isActive ? `0 8px 24px ${f.color}22` : "0 2px 8px rgba(0,0,0,0.04)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = `0 12px 32px ${f.color}18`;
                      e.currentTarget.style.borderColor = `${f.color}88`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e9ecef";
                    }
                  }}
                >
                  {/* شريط لوني علوي */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    left: 0,
                    height: "4px",
                    background: f.gradient,
                    borderRadius: "16px 16px 0 0",
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    {/* أيقونة النموذج */}
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "14px",
                      background: f.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${f.color}33`,
                    }}>
                      <FormIcon size={26} color="white" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", flex: 1 }}>{f.title}</h4>
                        {/* شارة الحالة */}
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "20px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          whiteSpace: "nowrap",
                        }}>
                          <BadgeIcon size={12} />
                          {badge.text}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </div>

                  {/* سهم فتح */}
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      bottom: "1rem",
                      left: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: f.color,
                    }}>
                      <span>مفتوح الآن</span>
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedForm && (
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              {editingEntry && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 99,
                  background: "#fef3c7", border: "1.5px solid #f59e0b",
                  color: "#92400e", fontSize: "0.85rem", fontWeight: 600,
                }}>
                  <Edit3 size={15} />
                  وضع التعديل — يتم تحديث المدخل الموجود في ملف الإنجاز
                </div>
              )}
              {!editingEntry && <div />}
              <button
                onClick={() => setSelectedForm("")}
                style={{
                  padding: "8px 18px", border: "1.5px solid #e2e8f0", borderRadius: 99,
                  background: "white", color: "#64748b", fontSize: "0.85rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#94a3b8"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                ✕ إغلاق النموذج
              </button>
            </div>
          )}

          <div id="printable-area">
            {selectedForm === "classes_count" && (
              <div style={{
                marginTop: "2rem",
                animation: "fadeIn 0.4s ease-out",
                maxWidth: "100%"
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>عدد الحصص التي درسها الطالب</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    تسجيل الحصص النوعية التي قام الطالب بتدريسها خلال فترة التدريب
                  </p>
                </div>

                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  <div className="table-wrapper" style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        textAlign: "center",
                        borderRadius: "12px",
                        overflow: "hidden"
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{
                            padding: "16px 12px",
                            fontWeight: 600,
                            backgroundColor: "#f8f9fa",
                            color: "#495057",
                            borderBottom: "2px solid #dee2e6",
                            fontSize: "0.95rem"
                          }}>
                            الصف
                          </th>
                          <th style={{
                            padding: "16px 12px",
                            fontWeight: 600,
                            backgroundColor: "#f8f9fa",
                            color: "#495057",
                            borderBottom: "2px solid #dee2e6",
                            fontSize: "0.95rem"
                          }}>
                            المقرر الذي قمت بدراسته
                          </th>
                          <th style={{
                            padding: "16px 12px",
                            fontWeight: 600,
                            backgroundColor: "#f8f9fa",
                            color: "#495057",
                            borderBottom: "2px solid #dee2e6",
                            fontSize: "0.95rem"
                          }}>
                            الموضوع
                          </th>
                          <th style={{
                            padding: "16px 12px",
                            fontWeight: 600,
                            backgroundColor: "#f8f9fa",
                            color: "#495057",
                            borderBottom: "2px solid #dee2e6",
                            fontSize: "0.95rem"
                          }}>
                            عدد الحصص
                          </th>
                          <th style={{
                            padding: "16px 12px",
                            fontWeight: 600,
                            backgroundColor: "#f8f9fa",
                            color: "#495057",
                            borderBottom: "2px solid #dee2e6",
                            fontSize: "0.95rem",
                            width: "60px"
                          }}>
                            حذف
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingSessions.map((session, index) => (
                          <tr
                            key={session.id}
                            style={{
                              backgroundColor: index % 2 === 0 ? "white" : "#fafbfc",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f0f4f8";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = index % 2 === 0 ? "white" : "#fafbfc";
                            }}
                          >
                            <td style={{ padding: "12px", borderBottom: "1px solid #e9ecef" }}>
                              <input
                                type="text"
                                value={session.grade}
                                onChange={(e) => updateTeachingSession(session.id, "grade", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1.5px solid #e0e0e0",
                                  borderRadius: "8px",
                                  textAlign: "center",
                                  fontSize: "0.9rem",
                                  transition: "all 0.2s",
                                  backgroundColor: "white"
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = "var(--primary, #007bff)";
                                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = "#e0e0e0";
                                  e.target.style.boxShadow = "none";
                                }}
                                placeholder="الصف"
                              />
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #e9ecef" }}>
                              <input
                                type="text"
                                value={session.subject}
                                onChange={(e) => updateTeachingSession(session.id, "subject", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1.5px solid #e0e0e0",
                                  borderRadius: "8px",
                                  textAlign: "center",
                                  fontSize: "0.9rem",
                                  transition: "all 0.2s",
                                  backgroundColor: "white"
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = "var(--primary, #007bff)";
                                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = "#e0e0e0";
                                  e.target.style.boxShadow = "none";
                                }}
                                placeholder="المقرر"
                              />
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #e9ecef" }}>
                              <input
                                type="text"
                                value={session.topic}
                                onChange={(e) => updateTeachingSession(session.id, "topic", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1.5px solid #e0e0e0",
                                  borderRadius: "8px",
                                  textAlign: "center",
                                  fontSize: "0.9rem",
                                  transition: "all 0.2s",
                                  backgroundColor: "white"
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = "var(--primary, #007bff)";
                                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = "#e0e0e0";
                                  e.target.style.boxShadow = "none";
                                }}
                                placeholder="الموضوع"
                              />
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #e9ecef" }}>
                              <input
                                type="number"
                                min="0"
                                value={session.sessionsCount}
                                onChange={(e) => updateTeachingSession(session.id, "sessionsCount", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1.5px solid #e0e0e0",
                                  borderRadius: "8px",
                                  textAlign: "center",
                                  fontSize: "0.9rem",
                                  transition: "all 0.2s",
                                  backgroundColor: "white"
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = "var(--primary, #007bff)";
                                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = "#e0e0e0";
                                  e.target.style.boxShadow = "none";
                                }}
                                placeholder="0"
                              />
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #e9ecef" }}>
                              <button
                                onClick={() => deleteTeachingSession(session.id)}
                                disabled={teachingSessions.length <= 1}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: teachingSessions.length <= 1 ? "not-allowed" : "pointer",
                                  color: teachingSessions.length <= 1 ? "#ccc" : "#dc3545",
                                  opacity: teachingSessions.length <= 1 ? 0.5 : 1,
                                  padding: "8px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  if (teachingSessions.length > 1) {
                                    e.currentTarget.style.backgroundColor = "#ffebee";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                                title="حذف الصف"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="no-print" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #e9ecef"
                  }}>
                    <button
                      onClick={addTeachingSession}
                      style={{
                        padding: "0.875rem 1.5rem",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(34,197,94,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#16a34a";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#22c55e";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.3)";
                      }}
                    >
                      <Plus size={18} /> إضافة صف جديد
                    </button>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button
                        onClick={resetTeachingSessions}
                        disabled={saving}
                        style={{
                          padding: "0.875rem 1.5rem",
                          backgroundColor: "#6b7280",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          cursor: saving ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          opacity: saving ? 0.6 : 1,
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          if (!saving) {
                            e.currentTarget.style.backgroundColor = "#4b5563";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#6b7280";
                        }}
                      >
                        <RotateCcw size={18} /> إعادة تعيين
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: "0.875rem 2rem",
                          backgroundColor: "var(--primary, #007bff)",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          cursor: saving ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          opacity: saving ? 0.6 : 1,
                          transition: "all 0.2s",
                          boxShadow: "0 2px 8px rgba(0,123,255,0.3)"
                        }}
                        onMouseEnter={(e) => {
                          if (!saving) {
                            e.currentTarget.style.backgroundColor = "#0056b3";
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--primary, #007bff)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                        }}
                      >
                        {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                        {saving ? "جاري الحفظ..." : editingEntry ? "حفظ التعديل" : "حفظ النموذج"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedForm === "weekly_full_report" && (
              <div style={{
                marginTop: "2rem",
                animation: "fadeIn 0.4s ease-out",
                maxWidth: "100%"
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>التقرير الأسبوعي</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    تقرير الطالب الأسبوعي عن الأنشطة والمهام المنفذة
                  </p>
                </div>

                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                    gap: "1.25rem"
                  }}>
                    {[
                      { key: "course", label: "المساق" },
                      { key: "morningAssembly", label: "الطابور الصباحي" },
                      { key: "duty", label: "المناوبة" },
                      { key: "implementedLessons", label: "الحصص التي نفذها (كلي – جزئي – أوراق العمل)" },
                      { key: "teachingAids", label: "الوسائل التي أعدها" },
                      { key: "activities", label: "الأنشطة التي قام بها" },
                      { key: "meetings", label: "حضور الاجتماعات" }
                    ].map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#495057",
                          marginBottom: "0.5rem"
                        }}>
                          {field.label}
                        </label>
                        <textarea
                          value={weeklyReport[field.key]}
                          onChange={(e) => updateWeeklyReport(field.key, e.target.value)}
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "1.5px solid #e0e0e0",
                            borderRadius: "10px",
                            fontSize: "0.9rem",
                            resize: "vertical",
                            transition: "all 0.2s",
                            backgroundColor: "white",
                            fontFamily: "inherit"
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "var(--primary, #007bff)";
                            e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e0e0e0";
                            e.target.style.boxShadow = "none";
                          }}
                          placeholder={`اكتب ${field.label}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="no-print" style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #e9ecef"
                  }}>
                    <button
                      onClick={resetWeeklyReport}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 1.5rem",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#6b7280";
                      }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 2rem",
                        backgroundColor: "var(--primary, #007bff)",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(0,123,255,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#0056b3";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary, #007bff)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                      }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedForm === "weekly_brief_report" && (
              <div style={{
                marginTop: "2rem",
                animation: "fadeIn 0.4s ease-out",
                maxWidth: "100%"
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>التقرير المختصر الأسبوعي</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    تقرير شامل عن الأنشطة والمهام والتأمل الذاتي للأسبوع
                  </p>
                </div>

                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  {/* القسم الأول: التخطيط والتحضير */}
                  <div style={{ marginBottom: "2rem" }}>
                    <h5 className="form-section-header" style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#495057",
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#e9ecef",
                      borderRadius: "8px",
                      borderRight: "4px solid #fa709a"
                    }}>
                      القسم الأول: العمل والإنجاز اللاصفي (خارج الغرفة الصفية) - التخطيط والتحضير
                    </h5>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "1rem"
                    }}>
                      {[
                        { key: "lessonsTaught", label: "أسماء المباحث والدروس التي نفذتها خلال هذا الأسبوع" },
                        { key: "worksheetsCount", label: "عدد أوراق العمل التي عملتها هذا الأسبوع وعناوينها" },
                        { key: "teachingMaterials", label: "أسماء أبرز الوسائل التعليمية قمت بإعدادها وتوظيفها" },
                        { key: "otherWorks", label: "أسماء أعمال أخرى أعددتها (مقاطع فيديو، نشرات، اختبارات، خطط علاجية...)" }
                      ].map((field) => (
                        <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                          <label style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#495057",
                            marginBottom: "0.5rem"
                          }}>
                            {field.label}
                          </label>
                          <textarea
                            value={weeklyBriefReport[field.key]}
                            onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1.5px solid #e0e0e0",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              resize: "vertical",
                              transition: "all 0.2s",
                              backgroundColor: "white",
                              fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "var(--primary, #007bff)";
                              e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#e0e0e0";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الثاني: العمل والإنجاز الصفي */}
                  <div style={{ marginBottom: "2rem" }}>
                    <h5 className="form-section-header" style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#495057",
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#e9ecef",
                      borderRadius: "8px",
                      borderRight: "4px solid #fee140"
                    }}>
                      القسم الثاني: العمل والإنجاز الصفي (داخل الغرفة الصفية)
                    </h5>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "1rem"
                    }}>
                      {[
                        { key: "observedStrengths", label: "ما أعجبك من مشاهدتك للمعلم المرشد" },
                        { key: "coTeachingReflection", label: "انعكاس على مشاركتك في إعطاء مواقف تعليمية مع المعلم المرشد" },
                        { key: "selfTeachingReflection", label: "تقييمك الذاتي لحصة صفية كاملة نفذتها" }
                      ].map((field) => (
                        <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                          <label style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#495057",
                            marginBottom: "0.5rem"
                          }}>
                            {field.label}
                          </label>
                          <textarea
                            value={weeklyBriefReport[field.key]}
                            onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1.5px solid #e0e0e0",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              resize: "vertical",
                              transition: "all 0.2s",
                              backgroundColor: "white",
                              fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "var(--primary, #007bff)";
                              e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#e0e0e0";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الثالث: الجوانب السلوكي والمهني */}
                  <div style={{ marginBottom: "2rem" }}>
                    <h5 className="form-section-header" style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#495057",
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#e9ecef",
                      borderRadius: "8px",
                      borderRight: "4px solid #11998e"
                    }}>
                      القسم الثالث: الجوانب السلوكي والمهني
                    </h5>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "1rem"
                    }}>
                      {[
                        { key: "studentAttendance", label: "التزام الطلبة بالدوام والزي المدرسي" },
                        { key: "studentDiscipline", label: "احترام الطلبة للقوانين والأنظمة ولوائح السلوك والانضباط" },
                        { key: "studentInteraction", label: "تعاون وتفاعل الطلبة معك في الحصص الصفية" },
                        { key: "schoolSupport", label: "أتاحة المدرسة الفرصة للتدريب بفاعلية والحصول على أقصى فائدة" },
                        { key: "professionalRelations", label: "علاقتك المهنية مع ذوي العلاقة في المدرسة وتقبلهم لك" }
                      ].map((field) => (
                        <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                          <label style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#495057",
                            marginBottom: "0.5rem"
                          }}>
                            {field.label}
                          </label>
                          <textarea
                            value={weeklyBriefReport[field.key]}
                            onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1.5px solid #e0e0e0",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              resize: "vertical",
                              transition: "all 0.2s",
                              backgroundColor: "white",
                              fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "var(--primary, #007bff)";
                              e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#e0e0e0";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الرابع: التقييم والتأمل الذاتي */}
                  <div style={{ marginBottom: "2rem" }}>
                    <h5 className="form-section-header" style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#495057",
                      marginBottom: "1rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#e9ecef",
                      borderRadius: "8px",
                      borderRight: "4px solid #667eea"
                    }}>
                      القسم الرابع: التقييم والتأمل الذاتي
                    </h5>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "1rem"
                    }}>
                      {[
                        { key: "strengthsThisWeek", label: "أهم جوانب القوة والنجاح التي تميزت بها هذا الأسبوع" },
                        { key: "areasForImprovement", label: "الجوانب التي تحتاج لتحسين وتطوير مستقبلاً" },
                        { key: "supervisorSupportNeeds", label: "ما الذي تريد من مشرفك أن يساعدك فيه ليتطور أداؤك" }
                      ].map((field) => (
                        <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                          <label style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#495057",
                            marginBottom: "0.5rem"
                          }}>
                            {field.label}
                          </label>
                          <textarea
                            value={weeklyBriefReport[field.key]}
                            onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1.5px solid #e0e0e0",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              resize: "vertical",
                              transition: "all 0.2s",
                              backgroundColor: "white",
                              fontFamily: "inherit"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "var(--primary, #007bff)";
                              e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#e0e0e0";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="no-print" style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #e9ecef"
                  }}>
                    <button
                      onClick={resetWeeklyBriefReport}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 1.5rem",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#6b7280";
                      }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 2rem",
                        backgroundColor: "var(--primary, #007bff)",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(0,123,255,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#0056b3";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary, #007bff)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                      }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedForm === "learning_experience_review" && (
              <div style={{
                marginTop: "2rem",
                animation: "fadeIn 0.4s ease-out",
                maxWidth: "100%"
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>نموذج نقد خبرات التعلم</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    تقييم وتقويم الخبرات التعليمية المكتسبة خلال فترة التدريب
                  </p>
                </div>

                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "1rem"
                  }}>
                    {[
                      { key: "plansAndObjectives", label: "الخطط والأهداف" },
                      { key: "lessonImplementation", label: "تنفيذ الدرس" },
                      { key: "introduction", label: "التمهيد" },
                      { key: "presentation", label: "العرض" },
                      { key: "closure", label: "الخاتمة والغلق" },
                      { key: "classroomManagement", label: "إدارة الصف" },
                      { key: "studentMotivation", label: "إثارة الدافعية عند الطلبة" },
                      { key: "methodsAndApproaches", label: "الطرائق والأساليب المتبعة" },
                      { key: "teachingAids", label: "إعداد الوسائل التعليمية وتفعيلها" },
                      { key: "evaluationAndTesting", label: "التقييم والاختبارات ومراعاة مبادئ القياس والتقويم" },
                      { key: "teacherRoles", label: "الأدوار التي يقوم بها المعلم إضافة إلى عملية التدريس" }
                    ].map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#495057",
                          marginBottom: "0.5rem"
                        }}>
                          {field.label}
                        </label>
                        <textarea
                          value={learningExperience[field.key]}
                          onChange={(e) => updateLearningExperience(field.key, e.target.value)}
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "1.5px solid #e0e0e0",
                            borderRadius: "10px",
                            fontSize: "0.9rem",
                            resize: "vertical",
                            transition: "all 0.2s",
                            backgroundColor: "white",
                            fontFamily: "inherit"
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "var(--primary, #007bff)";
                            e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e0e0e0";
                            e.target.style.boxShadow = "none";
                          }}
                          placeholder={`اكتب ملاحظاتك عن ${field.label}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="no-print" style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #e9ecef"
                  }}>
                    <button
                      onClick={resetLearningExperience}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 1.5rem",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#4b5563";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#6b7280";
                      }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "0.875rem 2rem",
                        backgroundColor: "var(--primary, #007bff)",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(0,123,255,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "#0056b3";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--primary, #007bff)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,123,255,0.3)";
                      }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ النموذج"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {selectedForm === "daily_tasks_report" && (
              <div style={{ marginTop: "2rem", animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ background: "white", borderRadius: "16px", padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <h4 style={{ fontWeight: 700, color: "#0e7490", marginBottom: "0.25rem" }}>تقرير المهام والأعمال اليومية</h4>
                  <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>توثيق المهام والأعمال اليومية وملاحظات المرشد التربوي</p>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", direction: "rtl" }}>
                      <thead>
                        <tr style={{ background: "#0e7490", color: "white" }}>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 140 }}>المهام والأعمال التي تم تنفيذها</th>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 110 }}>الأهداف</th>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 120 }}>المهارات المكتسبة</th>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 130 }}>الصعوبات والتحديات</th>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 150 }}>المجهود المبذول للتغلب على الصعوبات</th>
                          <th style={{ padding: "0.75rem 0.6rem", border: "1px solid #0891b2", fontWeight: 600, minWidth: 150 }}>ملاحظات المرشد التربوي</th>
                          <th className="no-print" style={{ padding: "0.75rem 0.5rem", border: "1px solid #0891b2", width: 44 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyTaskRows.map((row, idx) => (
                          <tr key={row.id} style={{ background: idx % 2 === 0 ? "#f0f9ff" : "white" }}>
                            {["tasksCompleted", "goals", "skills", "challenges", "effortOnChallenges", "supervisorNotes"].map(field => (
                              <td key={field} style={{ border: "1px solid #bae6fd", padding: "0.3rem" }}>
                                <textarea
                                  value={row[field]}
                                  onChange={e => updateDailyTaskRow(row.id, field, e.target.value)}
                                  rows={3}
                                  style={{ width: "100%", border: "none", background: "transparent", resize: "vertical", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", padding: "2px 4px" }}
                                />
                              </td>
                            ))}
                            <td className="no-print" style={{ border: "1px solid #bae6fd", textAlign: "center", padding: "0.3rem" }}>
                              <button onClick={() => deleteDailyTaskRow(row.id)} disabled={dailyTaskRows.length <= 1} style={{ background: "none", border: "none", cursor: dailyTaskRows.length <= 1 ? "not-allowed" : "pointer", color: "#ef4444", opacity: dailyTaskRows.length <= 1 ? 0.3 : 1 }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="no-print" onClick={addDailyTaskRow} style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.2rem", background: "#f0f9ff", border: "1.5px dashed #0891b2", borderRadius: "8px", color: "#0e7490", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
                    <Plus size={16} /> إضافة صف
                  </button>
                </div>

                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button onClick={resetDailyTaskRows} style={{ padding: "0.875rem 1.5rem", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 500 }}>
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ padding: "0.875rem 2rem", backgroundColor: "var(--primary, #007bff)", color: "white", border: "none", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600, opacity: saving ? 0.6 : 1, boxShadow: "0 2px 8px rgba(0,123,255,0.3)" }}>
                    {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                    {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                  </button>
                </div>
              </div>
            )}

            {selectedForm === "weekly_reflection" && (
              <div style={{ marginTop: "2rem", animation: "fadeIn 0.4s ease-out" }}>
                <div style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>نموذج التأمل الأسبوعي</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    تأمل ذاتي أسبوعي في التجربة التدريبية
                  </p>
                </div>
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                    {[
                      { key: "reflection", label: "التأمل في التجربة التدريبية هذا الأسبوع" },
                      { key: "notes", label: "ملاحظات ونقاط للتحسين" },
                      { key: "summary", label: "ملخص الأسبوع" },
                    ].map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#495057", marginBottom: "0.5rem" }}>
                          {field.label}
                        </label>
                        <textarea
                          value={weeklyReflection[field.key]}
                          onChange={(e) => updateWeeklyReflection(field.key, e.target.value)}
                          rows={4}
                          style={{ width: "100%", padding: "10px", border: "1.5px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", resize: "vertical", backgroundColor: "white", fontFamily: "inherit" }}
                          placeholder="..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button onClick={resetWeeklyReflection} style={{ padding: "0.875rem 1.5rem", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 500 }}>
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ padding: "0.875rem 2rem", backgroundColor: "var(--primary, #007bff)", color: "white", border: "none", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600, opacity: saving ? 0.6 : 1, boxShadow: "0 2px 8px rgba(0,123,255,0.3)" }}>
                    {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                    {saving ? "جاري الحفظ..." : "حفظ النموذج"}
                  </button>
                </div>
              </div>
            )}

            {selectedForm === "field_visit_summary" && (
              <div style={{ marginTop: "2rem", animation: "fadeIn 0.4s ease-out" }}>
                <div style={{
                  background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
                  borderRadius: "16px 16px 0 0",
                  padding: "1.5rem 2rem",
                  color: "white"
                }}>
                  <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>ملخص الزيارة الميدانية</h4>
                  <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                    توثيق الزيارات الميدانية والملاحظات
                  </p>
                </div>
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                  padding: "1.5rem",
                  border: "1px solid #e8e8e8",
                  borderTop: "none"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
                    {[
                      { key: "visitDate", label: "تاريخ الزيارة", type: "date" },
                      { key: "visitPurpose", label: "هدف الزيارة" },
                      { key: "observations", label: "الملاحظات" },
                      { key: "recommendations", label: "التوصيات" },
                    ].map((field) => (
                      <div key={field.key} style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#495057", marginBottom: "0.5rem" }}>
                          {field.label}
                        </label>
                        {field.type === "date" ? (
                          <input
                            type="date"
                            value={fieldVisitSummary[field.key]}
                            onChange={(e) => updateFieldVisitSummary(field.key, e.target.value)}
                            style={{ width: "100%", padding: "10px", border: "1.5px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", backgroundColor: "white" }}
                          />
                        ) : (
                          <textarea
                            value={fieldVisitSummary[field.key]}
                            onChange={(e) => updateFieldVisitSummary(field.key, e.target.value)}
                            rows={4}
                            style={{ width: "100%", padding: "10px", border: "1.5px solid #e0e0e0", borderRadius: "8px", fontSize: "0.85rem", resize: "vertical", backgroundColor: "white", fontFamily: "inherit" }}
                            placeholder="..."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button onClick={resetFieldVisitSummary} style={{ padding: "0.875rem 1.5rem", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 500 }}>
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ padding: "0.875rem 2rem", backgroundColor: "var(--primary, #007bff)", color: "white", border: "none", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600, opacity: saving ? 0.6 : 1, boxShadow: "0 2px 8px rgba(0,123,255,0.3)" }}>
                    {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                    {saving ? "جاري الحفظ..." : "حفظ النموذج"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
