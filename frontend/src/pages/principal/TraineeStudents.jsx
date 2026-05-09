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
import useAppToast from "../../hooks/useAppToast";

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
  const toast = useAppToast();
  const [saving, setSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

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
      if (!students.length) toast.info(`لا يوجد طلبة متدربون معتمدون في ${labels.siteName} حاليًا.`);
    } catch (error) {
      toast.error("تعذر تحميل بيانات الطلبة المتدربين.");
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

  const handleDeptFilterChange = (val) => { setDeptFilter(val); setSelectedStudentId(null); };
  const handleStudentChange = (e) => { const v = e.target.value; setSelectedStudentId(v ? Number(v) : null); };

  const handleNotesChange = (itemId, value) => {
    setScoresByStudent((prev) => ({ ...prev, [selectedStudentId]: { ...(prev[selectedStudentId] || {}), [itemId]: value } }));
  };

  const handleGeneralNotesChange = (value) => {
    setScoresByStudent((prev) => ({ ...prev, [selectedStudentId]: { ...(prev[selectedStudentId] || {}), __generalNotes: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { toast.warning("يرجى اختيار طالب أولاً."); return; }
    try {
      setSaving(true);
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
      toast.success("تم حفظ تقييم الطالب بنجاح وإضافته لملف الإنجاز.");
    } catch (error) {
      toast.apiError(error, "تعذر حفظ التقييم.");
    } finally {
      setSaving(false);
    }
  };

  const educTotal = EDUC_EVAL_FIELDS.reduce((s, f) => s + (Number(selectedScores[f.key]) || 0), 0);
  const psychTotal = PSYCH_EVAL_FIELDS.reduce((s, f) => s + (Number(selectedScores[f.key]) || 0), 0);

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div className="animate-[fadeIn_0.4s_ease]">
        {/* Page Header */}
        <div className="content-header">
          <div className="content-header-icon">
            <ClipboardCheck size={26} />
          </div>
          <div className="content-header-content">
            <h1 className="page-title">تقييم الطلبة</h1>
            <p className="page-subtitle">
              {usePsychForm ? "نموذج تقييم طلاب علم النفس" : "نموذج تقييم طلاب أصول التربية"}
            </p>
          </div>
        </div>

        {/* Messages */}

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل الطلبة..." />
        ) : (
          <>
            {/* Student Selection Card */}
            <div className="bg-white rounded-2xl p-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[10px] text-[#2563eb] flex items-center justify-center bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe]">
                  <Filter size={18} />
                </div>
                <h3 className="m-0 text-[1.1rem] font-bold text-[#1e293b]">اختيار الطالب</h3>
              </div>

              {isSchoolManager && (
                <div className="mb-4">
                  <label className="text-[0.85rem] font-semibold text-[#475569] mb-2 block">تصفية حسب القسم</label>
                  <div className="flex gap-2">
                    {[
                      { val: "education", label: "أصول التربية", activeBg: "#1d4ed8" },
                      { val: "psychology", label: "علم النفس", activeBg: "#7c3aed" },
                    ].map(opt => (
                      <button key={opt.val} type="button" onClick={() => handleDeptFilterChange(opt.val)}
                        className="py-2 px-5 rounded-full font-bold text-[0.85rem] cursor-pointer transition-all"
                        style={{
                          border: deptFilter === opt.val ? "none" : "1.5px solid #e2e8f0",
                          background: deptFilter === opt.val ? opt.activeBg : "#f8fafc",
                          color: deptFilter === opt.val ? "white" : "#475569",
                          boxShadow: deptFilter === opt.val ? `0 2px 8px ${opt.activeBg}40` : "none",
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[0.85rem] font-semibold text-[#475569] mb-2 block">اختر الطالب المتدرب</label>
                <select value={selectedStudentId ?? ""} onChange={handleStudentChange} disabled={!filteredStudents.length}
                  className="w-full max-w-[400px] py-[0.65rem] px-4 rounded-[10px] border-[1.5px] border-[#e2e8f0] text-[0.9rem] font-medium bg-[#f8fafc] text-[#1e293b] outline-none"
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
              <div className="bg-white rounded-2xl p-6 px-8 border border-[#e2e8f0] mb-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-[10px] text-[#0284c7] flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd]">
                    <User size={18} />
                  </div>
                  <h3 className="m-0 text-[1.1rem] font-bold text-[#1e293b]">بيانات الطالب</h3>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
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
                      <div key={i} className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-[10px] border border-[#f1f5f9]">
                        <div className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: item.bg, color: item.color }}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.72rem] text-[#94a3b8] font-medium">{item.label}</div>
                          <div className="text-[0.88rem] font-bold text-[#1e293b] overflow-hidden text-ellipsis whitespace-nowrap">{item.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluation Form Card */}
            <div className="bg-white rounded-2xl p-6 px-8 border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{
                  background: usePsychForm ? "linear-gradient(135deg, #ecfeff, #cffafe)" : "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                  color: usePsychForm ? "#0e7490" : "#1e3a5f",
                }}>
                  <ClipboardCheck size={18} />
                </div>
                <h3 className="m-0 text-[1.1rem] font-bold text-[#1e293b]">نموذج التقييم</h3>
              </div>

              <form onSubmit={handleSubmit}>
                {usePsychForm ? (
                  <div className="overflow-x-auto mb-6 rounded-xl border border-[#cffafe]">
                    <table className="w-full border-collapse direction-rtl text-[0.88rem]">
                      <thead>
                        <tr className="text-white bg-gradient-to-br from-[#0e7490] to-[#0891b2]">
                          <th className="py-[0.85rem] px-[0.6rem] w-11 text-center">#</th>
                          <th className="py-[0.85rem] px-[0.8rem]">المؤشر</th>
                          {[1,2,3,4,5].map(n => <th key={n} className="py-[0.85rem] px-[0.4rem] w-[54px] text-center">{n}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {PSYCH_EVAL_FIELDS.map((field, idx) => (
                          <tr key={field.key} className={idx % 2 === 0 ? "bg-[#f0fdfa]" : "bg-white"}>
                            <td className="py-3 text-center font-bold text-[#0e7490]">{idx + 1}</td>
                            <td className="py-3 px-4 text-[#1e293b] font-medium">{field.label}</td>
                            {[1,2,3,4,5].map(rating => (
                              <td key={rating} className="py-[0.4rem] text-center">
                                <button type="button" onClick={() => handleNotesChange(field.key, rating)}
                                  className="w-9 h-9 rounded-full font-bold cursor-pointer transition-all text-[0.82rem]"
                                  style={{
                                    border: selectedScores[field.key] === rating ? "none" : "1.5px solid #a5f3fc",
                                    background: selectedScores[field.key] === rating
                                      ? "linear-gradient(135deg, #0e7490, #0891b2)" : "#f0fdfa",
                                    color: selectedScores[field.key] === rating ? "white" : "#0e7490",
                                    boxShadow: selectedScores[field.key] === rating ? "0 2px 8px rgba(14,116,144,0.3)" : "none",
                                  }}
                                >{rating}</button>
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-[#ecfeff]">
                          <td colSpan={2} className="py-[0.85rem] text-center font-extrabold text-[#0e7490]">المجموع</td>
                          <td colSpan={5} className="py-[0.85rem] text-center font-extrabold text-[#0e7490] text-[1.1rem]">{psychTotal} / 25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto mb-6 rounded-xl border border-[#dbeafe]">
                    <table className="w-full border-collapse direction-rtl text-[0.88rem]">
                      <thead>
                        <tr className="text-white bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a]">
                          <th className="py-[0.85rem] px-[0.6rem] w-11 text-center">#</th>
                          <th className="py-[0.85rem] px-[0.8rem]">المحور</th>
                          <th className="py-[0.85rem] px-[0.6rem] w-[130px] text-center">التقدير (0-10)</th>
                          <th className="py-[0.85rem] px-[0.8rem]">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EDUC_EVAL_FIELDS.map((field, idx) => (
                          <tr key={field.key} className={idx % 2 === 0 ? "bg-[#f8fafc]" : "bg-white"}>
                            <td className="py-3 text-center font-bold text-[#1e3a5f]">{idx + 1}</td>
                            <td className="py-3 px-4 font-medium text-[#1e293b]">{field.label}</td>
                            <td className="py-2 text-center">
                              <input type="number" min="0" max="10"
                                value={selectedScores[field.key] ?? ""}
                                onChange={(e) => handleNotesChange(field.key, e.target.value)}
                                placeholder="0-10"
                                className="w-20 text-center border-[1.5px] border-[#cbd5e1] rounded-lg py-[0.4rem] px-[0.5rem] text-[0.9rem] font-semibold bg-[#f8fafc] outline-none"
                              />
                            </td>
                            <td className="py-2">
                              <textarea value={selectedScores[`${field.key}__notes`] || ""}
                                onChange={(e) => handleNotesChange(`${field.key}__notes`, e.target.value)}
                                placeholder="ملاحظات" rows={2}
                                className="w-full border-[1.5px] border-[#e2e8f0] rounded-lg py-[0.4rem] px-[0.6rem] text-[0.85rem] resize-y bg-[#f8fafc] outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#eff6ff]">
                          <td colSpan={2} className="py-[0.85rem] text-center font-extrabold text-[#1e3a5f]">المجموع</td>
                          <td className="py-[0.85rem] text-center font-extrabold text-[#1e3a5f] text-[1.1rem]">{educTotal} / 100</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* General Notes */}
                <div className="mb-6">
                  <label className="text-[0.85rem] font-semibold text-[#475569] mb-2 block">ملاحظات عامة</label>
                  <textarea value={selectedScores.__generalNotes || ""}
                    onChange={(e) => handleGeneralNotesChange(e.target.value)}
                    placeholder="اكتب ملاحظات عامة حول أداء الطالب..." rows={3}
                    className="w-full border-[1.5px] border-[#e2e8f0] rounded-xl py-3 px-4 text-[0.9rem] resize-y bg-[#f8fafc] outline-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button type="submit" disabled={saving || !selectedStudent}
                    className="inline-flex items-center gap-2 py-[0.85rem] px-8 border-none rounded-xl text-white text-[1rem] font-bold transition-all shadow-[0_4px_12px_rgba(30,58,95,0.3)]"
                    style={{
                      background: saving ? "#94a3b8" : usePsychForm
                        ? "linear-gradient(135deg, #0e7490, #0891b2)"
                        : "linear-gradient(135deg, #1e3a5f, #2d5f8a)",
                      cursor: saving || !selectedStudent ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
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
