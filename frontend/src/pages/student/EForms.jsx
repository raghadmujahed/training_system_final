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
    // Find the specific eform by ID (preferred) or fall back to form_key match
    const eformId = editData.eformId || editData.id || null;
    const matchingForm = eformId
      ? forms.find(f => f.id === eformId)
      : forms.find(f => f.form_key === formKey);
    const resolvedEformId = matchingForm?.id || eformId || null;
    setEditingEntry({ ...editData, eformId: resolvedEformId });
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
        <div className="content-header-icon">
          <FileText size={26} />
        </div>
        <div className="content-header-content">
          <h1 className="page-title">النماذج والتقارير</h1>
          <p className="page-subtitle">اختر النموذج أو التقرير المطلوب تعبئته</p>
        </div>
      </div>

      {error ? <div className="alert-custom alert-danger mb-3">{error}</div> : null}
      {success ? <div className="alert-custom alert-success mb-3">{success}</div> : null}

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : availableForms.length === 0 ? (
        <div className="text-center py-16 px-8 text-[#64748b]">
          <FileText size={52} color="#cbd5e1" className="mb-4" />
          <h3 className="font-bold mb-2">لا توجد نماذج متاحة حالياً</h3>
          <p className="m-0">النماذج الخاصة بمسار علم النفس ستُضاف قريباً.</p>
        </div>
      ) : (
        <>
          {/* بطاقات النماذج */}
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 ${selectedForm ? "mb-8" : ""}`}>
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
                  className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 ${isActive ? 'bg-[#f8fafc]' : 'bg-white'}`}
                  style={{
                    border: isActive ? `2px solid ${f.color}` : "2px solid #e9ecef",
                    boxShadow: isActive ? `0 8px 24px ${f.color}22` : "0 2px 8px rgba(0,0,0,0.04)",
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
                  <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl" style={{ background: f.gradient }} />

                  <div className="flex items-start gap-4">
                    {/* أيقونة النموذج */}
                    <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0" style={{ background: f.gradient, boxShadow: `0 4px 12px ${f.color}33` }}>
                      <FormIcon size={26} color="white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-[0.35rem]">
                        <h4 className="m-0 text-[1.05rem] font-bold text-[#1e293b] flex-1">{f.title}</h4>
                        {/* شارة الحالة */}
                        <span className="inline-flex items-center gap-[0.3rem] py-[0.2rem] px-[0.6rem] rounded-[20px] text-[0.72rem] font-semibold whitespace-nowrap" style={{ backgroundColor: badge.bg, color: badge.color }}>
                          <BadgeIcon size={12} />
                          {badge.text}
                        </span>
                      </div>
                      <p className="m-0 text-[0.85rem] text-[#64748b] leading-[1.5]">{f.desc}</p>
                    </div>
                  </div>

                  {/* سهم فتح */}
                  {isActive && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-[0.4rem] text-[0.8rem] font-semibold" style={{ color: f.color }}>
                      <span>مفتوح الآن</span>
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedForm && (
            <div className="no-print flex justify-between items-center mb-3">
              {editingEntry && (
                <div className="flex items-center gap-2 py-2 px-4 rounded-full bg-[#fef3c7] border-[1.5px] border-[#f59e0b] text-[#92400e] text-[0.85rem] font-semibold">
                  <Edit3 size={15} />
                  وضع التعديل — يتم تحديث المدخل الموجود في ملف الإنجاز
                </div>
              )}
              {!editingEntry && <div />}
              <button
                onClick={() => setSelectedForm("")}
                className="py-2 px-[18px] border-[1.5px] border-[#e2e8f0] rounded-full bg-white text-[#64748b] text-[0.85rem] font-semibold cursor-pointer flex items-center gap-[6px] transition-all duration-200 hover:bg-[#f1f5f9] hover:border-[#94a3b8]"
              >
                ✕ إغلاق النموذج
              </button>
            </div>
          )}

          <div id="printable-area">
            {selectedForm === "classes_count" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out] max-w-full">
                <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">عدد الحصص التي درسها الطالب</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">تسجيل الحصص النوعية التي قام الطالب بتدريسها خلال فترة التدريب</p>
                </div>

                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  <div className="table-wrapper overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0 text-center rounded-xl overflow-hidden">
                      <thead>
                        <tr>
                          {["الصف", "المقرر الذي قمت بدراسته", "الموضوع", "عدد الحصص", "حذف"].map((h, i) => (
                            <th key={i} className={`py-4 px-3 font-semibold bg-[#f8f9fa] text-[#495057] border-b-2 border-[#dee2e6] text-[0.95rem] ${i === 4 ? 'w-[60px]' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teachingSessions.map((session, index) => (
                          <tr
                            key={session.id}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'} hover:bg-[#f0f4f8] transition-colors duration-200`
                            }
                          >
                            <td className="py-3 px-3 border-b border-[#e9ecef]">
                              <input type="text" value={session.grade} onChange={(e) => updateTeachingSession(session.id, "grade", e.target.value)}
                                className="w-full py-[10px] px-3 border-[1.5px] border-[#e0e0e0] rounded-lg text-center text-[0.9rem] transition-all bg-white focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                                placeholder="الصف"
                              />
                            </td>
                            <td className="py-3 px-3 border-b border-[#e9ecef]">
                              <input type="text" value={session.subject} onChange={(e) => updateTeachingSession(session.id, "subject", e.target.value)}
                                className="w-full py-[10px] px-3 border-[1.5px] border-[#e0e0e0] rounded-lg text-center text-[0.9rem] transition-all bg-white focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                                placeholder="المقرر"
                              />
                            </td>
                            <td className="py-3 px-3 border-b border-[#e9ecef]">
                              <input type="text" value={session.topic} onChange={(e) => updateTeachingSession(session.id, "topic", e.target.value)}
                                className="w-full py-[10px] px-3 border-[1.5px] border-[#e0e0e0] rounded-lg text-center text-[0.9rem] transition-all bg-white focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                                placeholder="الموضوع"
                              />
                            </td>
                            <td className="py-3 px-3 border-b border-[#e9ecef]">
                              <input type="number" min="0" value={session.sessionsCount} onChange={(e) => updateTeachingSession(session.id, "sessionsCount", e.target.value)}
                                className="w-full py-[10px] px-3 border-[1.5px] border-[#e0e0e0] rounded-lg text-center text-[0.9rem] transition-all bg-white focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-3 px-3 border-b border-[#e9ecef]">
                              <button onClick={() => deleteTeachingSession(session.id)} disabled={teachingSessions.length <= 1}
                                className={`bg-transparent border-none p-2 rounded-md transition-all ${teachingSessions.length <= 1 ? 'text-[#ccc] opacity-50 cursor-not-allowed' : 'text-[#dc3545] cursor-pointer hover:bg-[#ffebee]'}`}
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

                  <div className="no-print flex justify-between items-center mt-8 pt-6 border-t border-[#e9ecef]">
                    <button onClick={addTeachingSession}
                      className="py-[0.875rem] px-6 bg-[#22c55e] text-white border-none rounded-[10px] cursor-pointer flex items-center gap-2 text-[0.95rem] font-medium transition-all shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(34,197,94,0.4)]"
                    >
                      <Plus size={18} /> إضافة صف جديد
                    </button>

                    <div className="flex gap-3">
                      <button onClick={resetTeachingSessions} disabled={saving}
                        className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-medium transition-all hover:bg-[#4b5563]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                      >
                        <RotateCcw size={18} /> إعادة تعيين
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold transition-all shadow-[0_2px_8px_rgba(0,123,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,123,255,0.4)] hover:-translate-y-px" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
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
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out] max-w-full">
                <div className="bg-gradient-to-br from-[#f093fb] to-[#f5576c] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">التقرير الأسبوعي</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">تقرير الطالب الأسبوعي عن الأنشطة والمهام المنفذة</p>
                </div>

                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
                    {[
                      { key: "course", label: "المساق" },
                      { key: "morningAssembly", label: "الطابور الصباحي" },
                      { key: "duty", label: "المناوبة" },
                      { key: "implementedLessons", label: "الحصص التي نفذها (كلي – جزئي – أوراق العمل)" },
                      { key: "teachingAids", label: "الوسائل التي أعدها" },
                      { key: "activities", label: "الأنشطة التي قام بها" },
                      { key: "meetings", label: "حضور الاجتماعات" }
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <label className="text-[0.9rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                        <textarea
                          value={weeklyReport[field.key]}
                          onChange={(e) => updateWeeklyReport(field.key, e.target.value)}
                          rows={4}
                          className="w-full p-3 border-[1.5px] border-[#e0e0e0] rounded-[10px] text-[0.9rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                          placeholder={`اكتب ${field.label}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="no-print flex justify-end items-center gap-3 mt-8 pt-6 border-t border-[#e9ecef]">
                    <button onClick={resetWeeklyReport} disabled={saving}
                      className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-medium transition-all hover:bg-[#4b5563]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold transition-all shadow-[0_2px_8px_rgba(0,123,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,123,255,0.4)] hover:-translate-y-px" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedForm === "weekly_brief_report" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out] max-w-full">
                <div className="bg-gradient-to-br from-[#fa709a] to-[#fee140] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">التقرير المختصر الأسبوعي</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">تقرير شامل عن الأنشطة والمهام والتأمل الذاتي للأسبوع</p>
                </div>

                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  {/* القسم الأول */}
                  <div className="mb-8">
                    <h5 className="form-section-header text-[1.1rem] font-bold text-[#495057] mb-4 py-3 px-4 bg-[#e9ecef] rounded-lg border-r-4 border-[#fa709a]">
                      القسم الأول: العمل والإنجاز اللاصفي (خارج الغرفة الصفية) - التخطيط والتحضير
                    </h5>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                      {[
                        { key: "lessonsTaught", label: "أسماء المباحث والدروس التي نفذتها خلال هذا الأسبوع" },
                        { key: "worksheetsCount", label: "عدد أوراق العمل التي عملتها هذا الأسبوع وعناوينها" },
                        { key: "teachingMaterials", label: "أسماء أبرز الوسائل التعليمية قمت بإعدادها وتوظيفها" },
                        { key: "otherWorks", label: "أسماء أعمال أخرى أعددتها (مقاطع فيديو، نشرات، اختبارات، خطط علاجية...)" }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                          <textarea value={weeklyBriefReport[field.key]} onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)} rows={3}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الثاني */}
                  <div className="mb-8">
                    <h5 className="form-section-header text-[1.1rem] font-bold text-[#495057] mb-4 py-3 px-4 bg-[#e9ecef] rounded-lg border-r-4 border-[#fee140]">
                      القسم الثاني: العمل والإنجاز الصفي (داخل الغرفة الصفية)
                    </h5>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                      {[
                        { key: "observedStrengths", label: "ما أعجبك من مشاهدتك للمعلم المرشد" },
                        { key: "coTeachingReflection", label: "انعكاس على مشاركتك في إعطاء مواقف تعليمية مع المعلم المرشد" },
                        { key: "selfTeachingReflection", label: "تقييمك الذاتي لحصة صفية كاملة نفذتها" }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                          <textarea value={weeklyBriefReport[field.key]} onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)} rows={3}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الثالث */}
                  <div className="mb-8">
                    <h5 className="form-section-header text-[1.1rem] font-bold text-[#495057] mb-4 py-3 px-4 bg-[#e9ecef] rounded-lg border-r-4 border-[#11998e]">
                      القسم الثالث: الجوانب السلوكي والمهني
                    </h5>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                      {[
                        { key: "studentAttendance", label: "التزام الطلبة بالدوام والزي المدرسي" },
                        { key: "studentDiscipline", label: "احترام الطلبة للقوانين والأنظمة ولوائح السلوك والانضباط" },
                        { key: "studentInteraction", label: "تعاون وتفاعل الطلبة معك في الحصص الصفية" },
                        { key: "schoolSupport", label: "أتاحة المدرسة الفرصة للتدريب بفاعلية والحصول على أقصى فائدة" },
                        { key: "professionalRelations", label: "علاقتك المهنية مع ذوي العلاقة في المدرسة وتقبلهم لك" }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                          <textarea value={weeklyBriefReport[field.key]} onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)} rows={3}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* القسم الرابع */}
                  <div className="mb-8">
                    <h5 className="form-section-header text-[1.1rem] font-bold text-[#495057] mb-4 py-3 px-4 bg-[#e9ecef] rounded-lg border-r-4 border-[#667eea]">
                      القسم الرابع: التقييم والتأمل الذاتي
                    </h5>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                      {[
                        { key: "strengthsThisWeek", label: "أهم جوانب القوة والنجاح التي تميزت بها هذا الأسبوع" },
                        { key: "areasForImprovement", label: "الجوانب التي تحتاج لتحسين وتطوير مستقبلاً" },
                        { key: "supervisorSupportNeeds", label: "ما الذي تريد من مشرفك أن يساعدك فيه ليتطور أداؤك" }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                          <textarea value={weeklyBriefReport[field.key]} onChange={(e) => updateWeeklyBriefReport(field.key, e.target.value)} rows={3}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="no-print flex justify-end items-center gap-3 mt-8 pt-6 border-t border-[#e9ecef]">
                    <button onClick={resetWeeklyBriefReport} disabled={saving}
                      className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-medium transition-all hover:bg-[#4b5563]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold transition-all shadow-[0_2px_8px_rgba(0,123,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,123,255,0.4)] hover:-translate-y-px" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedForm === "learning_experience_review" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out] max-w-full">
                <div className="bg-gradient-to-br from-[#11998e] to-[#38ef7d] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">نموذج نقد خبرات التعلم</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">تقييم وتقويم الخبرات التعليمية المكتسبة خلال فترة التدريب</p>
                </div>

                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
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
                      <div key={field.key} className="flex flex-col">
                        <label className="text-[0.9rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                        <textarea value={learningExperience[field.key]} onChange={(e) => updateLearningExperience(field.key, e.target.value)} rows={3}
                          className="w-full p-3 border-[1.5px] border-[#e0e0e0] rounded-[10px] text-[0.9rem] resize-y transition-all bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                          placeholder={`اكتب ملاحظاتك عن ${field.label}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="no-print flex justify-end items-center gap-3 mt-8 pt-6 border-t border-[#e9ecef]">
                    <button onClick={resetLearningExperience} disabled={saving}
                      className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-medium transition-all hover:bg-[#4b5563]" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      <RotateCcw size={18} /> إعادة تعيين
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold transition-all shadow-[0_2px_8px_rgba(0,123,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,123,255,0.4)] hover:-translate-y-px" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                      {saving ? "جاري الحفظ..." : "حفظ النموذج"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {selectedForm === "daily_tasks_report" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out]">
                <div className="bg-white rounded-2xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
                  <h4 className="font-bold text-[#0e7490] mb-1">تقرير المهام والأعمال اليومية</h4>
                  <p className="text-[#64748b] text-[0.9rem] mb-6">توثيق المهام والأعمال اليومية وملاحظات المرشد التربوي</p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[0.88rem] direction-rtl">
                      <thead>
                        <tr className="bg-[#0e7490] text-white">
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[140px]">المهام والأعمال التي تم تنفيذها</th>
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[110px]">الأهداف</th>
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[120px]">المهارات المكتسبة</th>
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[130px]">الصعوبات والتحديات</th>
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[150px]">المجهود المبذول للتغلب على الصعوبات</th>
                          <th className="py-3 px-[0.6rem] border border-[#0891b2] font-semibold min-w-[150px]">ملاحظات المرشد التربوي</th>
                          <th className="no-print py-3 px-[0.5rem] border border-[#0891b2] w-[44px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyTaskRows.map((row, idx) => (
                          <tr key={row.id} className={idx % 2 === 0 ? "bg-[#f0f9ff]" : "bg-white"}>
                            {["tasksCompleted", "goals", "skills", "challenges", "effortOnChallenges", "supervisorNotes"].map(field => (
                              <td key={field} className="border border-[#bae6fd] py-[0.3rem]">
                                <textarea value={row[field]} onChange={e => updateDailyTaskRow(row.id, field, e.target.value)} rows={3}
                                  className="w-full border-none bg-transparent resize-y text-[0.85rem] font-inherit outline-none py-[2px] px-1"
                                />
                              </td>
                            ))}
                            <td className="no-print border border-[#bae6fd] text-center py-[0.3rem]">
                              <button onClick={() => deleteDailyTaskRow(row.id)} disabled={dailyTaskRows.length <= 1}
                                className={`bg-transparent border-none ${dailyTaskRows.length <= 1 ? 'text-[#ef4444] opacity-30 cursor-not-allowed' : 'text-[#ef4444] cursor-pointer'}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="no-print mt-4 flex items-center gap-[0.4rem] py-2 px-[1.2rem] bg-[#f0f9ff] border-[1.5px] border-dashed border-[#0891b2] rounded-lg text-[#0e7490] font-semibold cursor-pointer text-[0.9rem]">
                    <Plus size={16} /> إضافة صف
                  </button>
                </div>

                <div className="no-print flex justify-end gap-3 mt-6">
                  <button onClick={resetDailyTaskRows} className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] cursor-pointer flex items-center gap-2 text-[0.95rem] font-medium">
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold shadow-[0_2px_8px_rgba(0,123,255,0.3)]" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                    {saving ? "جاري الحفظ..." : "حفظ التقرير"}
                  </button>
                </div>
              </div>
            )}

            {selectedForm === "weekly_reflection" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out]">
                <div className="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">نموذج التأمل الأسبوعي</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">تأمل ذاتي أسبوعي في التجربة التدريبية</p>
                </div>
                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                    {[
                      { key: "reflection", label: "التأمل في التجربة التدريبية هذا الأسبوع" },
                      { key: "notes", label: "ملاحظات ونقاط للتحسين" },
                      { key: "summary", label: "ملخص الأسبوع" },
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                        <textarea value={weeklyReflection[field.key]} onChange={(e) => updateWeeklyReflection(field.key, e.target.value)} rows={4}
                          className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y bg-white font-inherit focus:border-[var(--primary,#007bff)] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                          placeholder="..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="no-print flex justify-end gap-3 mt-6">
                  <button onClick={resetWeeklyReflection} className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] cursor-pointer flex items-center gap-2 text-[0.95rem] font-medium">
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold shadow-[0_2px_8px_rgba(0,123,255,0.3)]" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? <LoadingSpinner size="button" /> : <Save size={18} />}
                    {saving ? "جاري الحفظ..." : "حفظ النموذج"}
                  </button>
                </div>
              </div>
            )}

            {selectedForm === "field_visit_summary" && (
              <div className="mt-8 animate-[fadeIn_0.4s_ease-out]">
                <div className="bg-gradient-to-br from-[#0891b2] to-[#06b6d4] rounded-t-2xl py-6 px-8 text-white">
                  <h4 className="m-0 text-[1.25rem] font-semibold">ملخص الزيارة الميدانية</h4>
                  <p className="m-0 mt-2 opacity-90 text-[0.95rem]">توثيق الزيارات الميدانية والملاحظات</p>
                </div>
                <div className="bg-white rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 border border-[#e8e8e8] border-t-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                    {[
                      { key: "visitDate", label: "تاريخ الزيارة", type: "date" },
                      { key: "visitPurpose", label: "هدف الزيارة" },
                      { key: "observations", label: "الملاحظات" },
                      { key: "recommendations", label: "التوصيات" },
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <label className="text-[0.85rem] font-semibold text-[#495057] mb-2">{field.label}</label>
                        {field.type === "date" ? (
                          <input type="date" value={fieldVisitSummary[field.key]} onChange={(e) => updateFieldVisitSummary(field.key, e.target.value)}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] bg-white"
                          />
                        ) : (
                          <textarea value={fieldVisitSummary[field.key]} onChange={(e) => updateFieldVisitSummary(field.key, e.target.value)} rows={4}
                            className="w-full p-[10px] border-[1.5px] border-[#e0e0e0] rounded-lg text-[0.85rem] resize-y bg-white font-inherit"
                            placeholder="..."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="no-print flex justify-end gap-3 mt-6">
                  <button onClick={resetFieldVisitSummary} className="py-[0.875rem] px-6 bg-[#6b7280] text-white border-none rounded-[10px] cursor-pointer flex items-center gap-2 text-[0.95rem] font-medium">
                    <RotateCcw size={18} /> إعادة تعيين
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="py-[0.875rem] px-8 text-white border-none rounded-[10px] flex items-center gap-2 text-[0.95rem] font-semibold shadow-[0_2px_8px_rgba(0,123,255,0.3)]" style={{ backgroundColor: "var(--primary, #007bff)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
                  >
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
