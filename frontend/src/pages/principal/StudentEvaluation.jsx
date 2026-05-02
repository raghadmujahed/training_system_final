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
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to load students:", error);
      setErrorMessage("تعذر تحميل بيانات الطلبة.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    const student = students.find((s) => s.studentRowId === parseInt(studentId));
    setSelectedStudent(student);
    setSavedMessage("");
    setErrorMessage("");
    setEvaluation(buildEmptyEval(student));
  };

  const handleEvaluationChange = (field, value) => {
    setEvaluation((prev) => ({ ...prev, [field]: value }));
    setSavedMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage("يرجى اختيار طالب أولاً.");
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
      setSavedMessage("تم حفظ التقييم بنجاح.");
      setErrorMessage("");
      setEvaluation(buildEmptyEval(selectedStudent));
    } catch (error) {
      console.error("Failed to save evaluation:", error);
      if (error.response?.status === 422) {
        setErrorMessage(error.response.data.message || "تعذر حفظ التقييم.");
      } else {
        setErrorMessage("حدث خطأ أثناء حفظ التقييم.");
      }
      setSavedMessage("");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "3rem", color: "var(--text-soft)" }}>
        <Loader2 size={28} className="spin" />
        {"جاري تحميل بيانات الطلبة..."}
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)" }}>
            <Users size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{"تقييم الطلبة"}</h1>
            <p className="hero-subtitle">
              {"اختر الطالب ثم قم بتعبئة نموذج التقييم"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {savedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#d1fae5", color: "#059669", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <CheckCircle size={18} /> {savedMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#fee2e2", color: "#dc2626", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Student Selection */}
      <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Users size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"اختيار الطالب"}</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"اختر الطالب الذي تريد تقييمه"}</p>
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 400 }}>
          <select
            value={selectedStudent?.studentRowId || ""}
            onChange={(e) => handleStudentSelect(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem",
              background: "#f8fafc",
              outline: "none",
              appearance: "none",
              cursor: "pointer",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">اختر الطالب...</option>
            {students.map((student) => (
              <option key={student.studentRowId} value={student.studentRowId}>
                {student.studentName} - {student.universityId}
              </option>
            ))}
          </select>
          <ChevronDown size={20} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Student Info Card */}
      {selectedStudent && (
        <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", fontWeight: 700 }}>{selectedStudent.studentName}</h4>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-faint)" }}>{"معلومات الطالب التدريبية"}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <GraduationCap size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>الرقم الجامعي</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.universityId}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>المساق</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.specialization}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>موقع التدريب</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.site}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>الموقع</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.siteLocation}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <School size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>المديرية</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.siteDirectorate}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Star size={16} style={{ color: "#64748b" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>فترة التدريب</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{selectedStudent.period}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Form */}
      {selectedStudent && (
        <form onSubmit={handleSubmit}>
          <div className="section-card mb-4" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <FileText size={20} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{"نموذج تقييم أداء الطالب"}</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-faint)" }}>{"يرجى تقييم أداء الطالب في جميع الجوانب"}</p>
              </div>
            </div>

            {/* Rating Fields */}
            {isPsychCenter ? (
              <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ background: "#0e7490", color: "white" }}>
                      <th style={{ padding: "0.75rem 1rem", border: "1px solid #0891b2", fontWeight: 600, width: 40 }}>الرقم</th>
                      <th style={{ padding: "0.75rem 1rem", border: "1px solid #0891b2", fontWeight: 600 }}>المؤشر</th>
                      {[1,2,3,4,5].map(n => <th key={n} style={{ padding: "0.75rem 0.5rem", border: "1px solid #0891b2", fontWeight: 600, width: 52, textAlign: "center" }}>{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PSYCH_CENTER_EVAL_FIELDS.map((field, idx) => (
                      <tr key={field.key} style={{ background: idx % 2 === 0 ? "#f0f9ff" : "white" }}>
                        <td style={{ padding: "0.75rem", border: "1px solid #bae6fd", textAlign: "center", fontWeight: 600, color: "#0e7490" }}>{idx + 1}</td>
                        <td style={{ padding: "0.75rem 1rem", border: "1px solid #bae6fd" }}>{field.label}</td>
                        {[1,2,3,4,5].map(rating => (
                          <td key={rating} style={{ padding: "0.5rem", border: "1px solid #bae6fd", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleEvaluationChange(field.key, rating)}
                              style={{
                                width: 36, height: 36, borderRadius: "50%",
                                border: evaluation[field.key] === rating ? "none" : "1.5px solid #cbd5e1",
                                background: evaluation[field.key] === rating ? "#0e7490" : "#f8fafc",
                                color: evaluation[field.key] === rating ? "white" : "#64748b",
                                fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                                fontSize: "0.85rem",
                              }}
                            >{rating}</button>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ background: "#f0f9ff", fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: "0.75rem 1rem", border: "1px solid #bae6fd", textAlign: "center" }}>المجموع</td>
                      <td colSpan={5} style={{ padding: "0.75rem 1rem", border: "1px solid #bae6fd", textAlign: "center", color: "#0e7490", fontSize: "1.05rem" }}>
                        {PSYCH_CENTER_EVAL_FIELDS.reduce((sum, f) => sum + (Number(evaluation[f.key]) || 0), 0)} / 25
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              {evalFields.map((field) => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                    {field.label}
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleEvaluationChange(field.key, rating)}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          background: evaluation[field.key] === rating ? "#3b82f6" : "#f8fafc",
                          color: evaluation[field.key] === rating ? "white" : "#64748b",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
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
            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                ملاحظات عامة
              </label>
              <textarea
                value={evaluation.general_notes}
                onChange={(e) => handleEvaluationChange("general_notes", e.target.value)}
                placeholder=""
                rows={5}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: "0.9rem",
                  background: "#f8fafc",
                  resize: "vertical",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 2rem",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
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