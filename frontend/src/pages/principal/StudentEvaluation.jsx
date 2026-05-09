import { useEffect, useState, useMemo } from "react";
import { readStoredUser } from "../../utils/session";
import {
  getMySiteStudents,
  createStudentEvaluation,
} from "../../services/api";
import {
  Users,
  User,
  GraduationCap,
  Building2,
  MapPin,
  School,
  Star,
  FileText,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

const SCHOOL_EVAL_FIELDS = [
  { key: "attendance", label: "الالتزام بالدوام" },
  { key: "cooperation_with_staff", label: "التعاون مع الهيئة التعليمية" },
  { key: "professionalism", label: "الاحترافية والمهنية" },
  { key: "dealing_with_students", label: "التعامل مع الطلبة" },
  { key: "participation_in_activities", label: "المشاركة في الأنشطة" },
  { key: "school", label: "الالتزام بأنظمة المدرسة" },
  { key: "professional_ethics", label: "أخلاقيات المهنة" },
  { key: "manners", label: "السلوك والأخلاق العامة" },
  { key: "comfort", label: "القدرة على التكيف" },
  { key: "supervisor", label: "الاستجابة لتوجيهات المشرف" },
];

const PSYCH_CENTER_EVAL_FIELDS = [
  { key: "attendance", label: "يلتزم الطالب بالدوام وفق برنامج الدوام المحدد" },
  { key: "rules_compliance", label: "يلتزم الطالب بالأنظمة والقوانين الناظمة للعمل في المركز" },
  { key: "initiative", label: "الطالب مبادر ومشارك في الأنشطة الداعمة للعمل الإرشادي في المركز" },
  { key: "communication", label: "لديه مهارات تواصل فعال مع جميع العاملين في المركز" },
  { key: "responsibility", label: "لديه حس المسؤولية والالتزام في تنفيذ المهام المطلوبة منه" },
];

export default function StudentEvaluation() {
  const savedUser = useMemo(() => readStoredUser(), []);
  const isPsychCenter = savedUser?.role?.name === 'psychology_center_manager';

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const evalFields = useMemo(() => {
    if (isPsychCenter) return PSYCH_CENTER_EVAL_FIELDS;
    if (selectedStudent?.track === 'psychology') return PSYCH_CENTER_EVAL_FIELDS;
    return SCHOOL_EVAL_FIELDS;
  }, [isPsychCenter, selectedStudent]);
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);

  const getFieldsForStudent = (student) => {
    if (isPsychCenter) return PSYCH_CENTER_EVAL_FIELDS;
    if (student?.track === 'psychology') return PSYCH_CENTER_EVAL_FIELDS;
    return SCHOOL_EVAL_FIELDS;
  };
  const buildEmptyEval = (student) => Object.fromEntries([...getFieldsForStudent(student).map(f => [f.key, ""]), ["general_notes", ""]]);
  const [evaluation, setEvaluation] = useState(() => buildEmptyEval(null));

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await getMySiteStudents();
      
      const allStudents = (response.students || []).map((student) => ({
        studentRowId: student.id,
        userId: student.student_id,
        studentName: student.student_name || "طالب غير معروف",
        universityId: student.university_id || "—",
        specialization: student.specialization || "—",
        status: student.status || "—",
        site: student.site || "—",
        siteLocation: student.site_location || "—",
        siteDirectorate: student.site_directorate || "—",
        period: student.period || "—",
        requestId: student.request_id,
        track: student.track || null,
      }));
      setStudents(allStudents);
    } catch (error) {
      console.error("Failed to load students:", error);
      toast.error("تعذر تحميل بيانات الطلبة.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    const student = students.find((s) => s.studentRowId === parseInt(studentId));
    setSelectedStudent(student);
    setEvaluation(buildEmptyEval(student));
  };

  const handleEvaluationChange = (field, value) => {
    setEvaluation((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.warning("يرجى اختيار طالب أولاً.");
      return;
    }

    try {
      const dynamicFields = Object.fromEntries(evalFields.map(f => [f.key, evaluation[f.key] || null]));
      const evaluationData = {
        student_id: selectedStudent.userId,
        training_request_student_id: selectedStudent.studentRowId,
        ...dynamicFields,
        general_notes: evaluation.general_notes || null,
        evaluation_date: new Date().toISOString().split('T')[0],
      };

      await createStudentEvaluation(evaluationData);
      toast.success("تم حفظ التقييم بنجاح.");
      setEvaluation(buildEmptyEval(selectedStudent));
    } catch (error) {
      console.error("Failed to save evaluation:", error);
      toast.apiError(error, "حدث خطأ أثناء حفظ التقييم.");
    }
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل بيانات الطلبة..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Users size={26} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">{"تقييم الطلبة"}</h1>
            <p className="hero-subtitle">
              {"اختر الطالب ثم قم بتعبئة نموذج التقييم"}
            </p>
          </div>
        </div>
      </div>

      {/* Student Selection */}
      <div className="section-card mb-4 p-6 rounded-2xl border border-[#e2e8f0]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white bg-gradient-to-br from-[#3b82f6] to-[#2563eb]">
            <Users size={20} />
          </div>
          <div>
            <h4 className="m-0 mb-1 text-[1.1rem] font-bold">{"اختيار الطالب"}</h4>
            <p className="m-0 text-[0.8rem] text-[var(--text-faint)]">{"اختر الطالب الذي تريد تقييمه"}</p>
          </div>
        </div>

        <div className="relative max-w-[400px]">
          <select
            value={selectedStudent?.studentRowId || ""}
            onChange={(e) => handleStudentSelect(e.target.value)}
            className="w-full py-3 pl-4 pr-10 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] outline-none appearance-none cursor-pointer focus:border-[#3b82f6]"
          >
            <option value="">اختر الطالب...</option>
            {students.map((student) => (
              <option key={student.studentRowId} value={student.studentRowId}>
                {student.studentName} - {student.universityId}
              </option>
            ))}
          </select>
          <ChevronDown size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>

      {/* Student Info Card */}
      {selectedStudent && (
        <div className="section-card mb-4 p-6 rounded-2xl border border-[#e2e8f0]">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#e2e8f0]">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#10b981] to-[#059669]">
              <User size={24} />
            </div>
            <div className="flex-1">
              <h4 className="m-0 mb-1 text-[1.2rem] font-bold">{selectedStudent.studentName}</h4>
              <p className="m-0 text-[0.9rem] text-[var(--text-faint)]">{"معلومات الطالب التدريبية"}</p>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">الرقم الجامعي</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.universityId}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">المساق</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.specialization}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">موقع التدريب</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.site}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">الموقع</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.siteLocation}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <School size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">المديرية</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.siteDirectorate}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#64748b]" />
              <div>
                <div className="text-[0.75rem] text-[#94a3b8]">فترة التدريب</div>
                <div className="text-[0.9rem] font-semibold">{selectedStudent.period}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Form */}
      {selectedStudent && (
        <form onSubmit={handleSubmit}>
          <div className="section-card mb-4 p-6 rounded-2xl border border-[#e2e8f0]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#e2e8f0]">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-[1.1rem] font-bold">{"نموذج تقييم أداء الطالب"}</h4>
                <p className="m-0 text-[0.8rem] text-[var(--text-faint)]">{"يرجى تقييم أداء الطالب في جميع الجوانب"}</p>
              </div>
            </div>

            {/* Rating Fields */}
            {isPsychCenter ? (
              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse direction-rtl text-[0.9rem]">
                  <thead>
                    <tr className="bg-[#0e7490] text-white">
                      <th className="py-3 px-4 border border-[#0891b2] font-semibold w-10">الرقم</th>
                      <th className="py-3 px-4 border border-[#0891b2] font-semibold">المؤشر</th>
                      {[1,2,3,4,5].map(n => <th key={n} className="py-3 px-2 border border-[#0891b2] font-semibold w-[52px] text-center">{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PSYCH_CENTER_EVAL_FIELDS.map((field, idx) => (
                      <tr key={field.key} className={idx % 2 === 0 ? "bg-[#f0f9ff]" : "bg-white"}>
                        <td className="py-3 border border-[#bae6fd] text-center font-semibold text-[#0e7490]">{idx + 1}</td>
                        <td className="py-3 px-4 border border-[#bae6fd]">{field.label}</td>
                        {[1,2,3,4,5].map(rating => (
                          <td key={rating} className="py-2 border border-[#bae6fd] text-center">
                            <button
                              type="button"
                              onClick={() => handleEvaluationChange(field.key, rating)}
                              className="w-9 h-9 rounded-full font-bold cursor-pointer transition-all text-[0.85rem]"
                              style={{
                                border: evaluation[field.key] === rating ? "none" : "1.5px solid #cbd5e1",
                                background: evaluation[field.key] === rating ? "#0e7490" : "#f8fafc",
                                color: evaluation[field.key] === rating ? "white" : "#64748b",
                              }}
                            >{rating}</button>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-[#f0f9ff] font-bold">
                      <td colSpan={2} className="py-3 px-4 border border-[#bae6fd] text-center">المجموع</td>
                      <td colSpan={5} className="py-3 px-4 border border-[#bae6fd] text-center text-[#0e7490] text-[1.05rem]">
                        {PSYCH_CENTER_EVAL_FIELDS.reduce((sum, f) => sum + (Number(evaluation[f.key]) || 0), 0)} / 25
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 mb-8">
              {evalFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-[0.85rem] font-semibold text-[#475569] mb-2">
                    {field.label}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleEvaluationChange(field.key, rating)}
                        className="flex-1 py-2 rounded-md text-[0.8rem] cursor-pointer transition-all border"
                        style={{
                          borderColor: "#e2e8f0",
                          background: evaluation[field.key] === rating ? "#3b82f6" : "#f8fafc",
                          color: evaluation[field.key] === rating ? "white" : "#64748b",
                        }}
                        onMouseEnter={(e) => {
                          if (evaluation[field.key] !== rating) {
                            e.currentTarget.style.background = "#e2e8f0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (evaluation[field.key] !== rating) {
                            e.currentTarget.style.background = "#f8fafc";
                          }
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* General Notes */}
            <div className="mt-6">
              <label className="block text-[0.85rem] font-semibold text-[#475569] mb-2">
                ملاحظات عامة
              </label>
              <textarea
                value={evaluation.general_notes}
                onChange={(e) => handleEvaluationChange("general_notes", e.target.value)}
                placeholder=""
                rows={5}
                className="w-full py-3 px-3 rounded-[10px] border border-[#e2e8f0] text-[0.9rem] bg-[#f8fafc] resize-y outline-none focus:border-[#8b5cf6]"
              />
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 py-3 px-8 text-white border-none rounded-[10px] text-[0.95rem] font-semibold cursor-pointer transition-[transform,box-shadow] duration-200 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <CheckCircle size={18} />
                {"حفظ التقييم"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}