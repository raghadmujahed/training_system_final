import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, AlertCircle, Lock, Plus, Trash2, FileText, Send, ChevronLeft } from "lucide-react";
import {
  getStudentTrainingProgram,
  saveStudentTrainingProgram,
  submitFormToSupervisor,
} from "../../services/api";

const days = [
  { id: "sunday", label: "الأحد" },
  { id: "monday", label: "الاثنين" },
  { id: "tuesday", label: "الثلاثاء" },
  { id: "wednesday", label: "الأربعاء" },
  { id: "thursday", label: "الخميس" },
];

const periods = [
  { id: 1, label: "الأولى" },
  { id: 2, label: "الثانية" },
  { id: 3, label: "الثالثة" },
  { id: 4, label: "الرابعة" },
  { id: 5, label: "الخامسة" },
  { id: 6, label: "السادسة" },
  { id: 7, label: "السابعة" },
];

const buildEmptySchedule = () => {
  const initial = {};
  days.forEach((day) => {
    initial[day.id] = {};
    periods.forEach((period) => {
      initial[day.id][period.id] = "";
    });
  });
  return initial;
};

export default function EvaluationProgram() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditable, setIsEditable] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: "—",
    universityId: "—",
    school: "—",
    semester: "—",
  });
  const [schedule, setSchedule] = useState(buildEmptySchedule);

  // Form selection state
  const [selectedForm, setSelectedForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Available forms list
  const availableForms = [
    {
      id: "teaching_sessions",
      title: "عدد الحصص التي درسها الطالب",
      description: "تسجيل الحصص النوعية التي قام الطالب بتدريسها خلال فترة التدريب",
      icon: FileText,
    },
  ];

  // Teaching sessions state (الحصص النوعية)
  const [teachingSessions, setTeachingSessions] = useState([
    { id: 1, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 2, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 3, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 4, grade: "", subject: "", topic: "", sessionsCount: "" },
    { id: 5, grade: "", subject: "", topic: "", sessionsCount: "" },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudentTrainingProgram();
      if (res?.data?.schedule) {
        const merged = buildEmptySchedule();
        Object.keys(res.data.schedule).forEach((dayId) => {
          if (merged[dayId]) {
            Object.keys(res.data.schedule[dayId]).forEach((periodId) => {
              if (merged[dayId][periodId] !== undefined) {
                merged[dayId][periodId] = res.data.schedule[dayId][periodId] || "";
              }
            });
          }
        });
        setSchedule(merged);
      }
      // Load teaching sessions if available
      if (res?.data?.teachingSessions && Array.isArray(res.data.teachingSessions) && res.data.teachingSessions.length > 0) {
        setTeachingSessions(res.data.teachingSessions);
      }
      if (res?.is_editable !== undefined) {
        setIsEditable(res.is_editable);
      }
      if (res?.student_info) {
        setStudentInfo({
          name: res.student_info.name || "—",
          universityId: res.student_info.university_id || "—",
          school: res.student_info.school || "—",
          semester: res.student_info.semester || "—",
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل جدول الحصص الأسبوعية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCellChange = (dayId, periodId, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [periodId]: value },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveStudentTrainingProgram({ schedule });
      setSuccess("تم حفظ جدول الحصص الأسبوعية بنجاح");
    } catch (e) {
      setError(e?.response?.data?.message || "فشل حفظ جدول الحصص الأسبوعية.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSchedule(buildEmptySchedule());
  };

  // Form submission handler
  const handleSubmitToSupervisor = async () => {
    if (!selectedForm) return;

    setSubmitting(true);
    setError("");
    setSubmitSuccess("");

    try {
      const formData = selectedForm === "teaching_sessions" ? teachingSessions : null;
      await submitFormToSupervisor({
        formType: selectedForm,
        data: formData,
      });
      setSubmitSuccess("تم إرسال النموذج للمشرف الأكاديمي بنجاح");
    } catch (e) {
      setError(e?.response?.data?.message || "فشل إرسال النموذج للمشرف.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToForms = () => {
    setSelectedForm(null);
    setError("");
    setSubmitSuccess("");
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

  const infoFieldStyle = {
    width: "100%",
    padding: "0.5rem",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    color: "#333",
  };

  // Form card style
  const formCardStyle = {
    padding: "1.5rem",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    cursor: isEditable ? "pointer" : "default",
    transition: "all 0.2s ease",
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    opacity: isEditable ? 1 : 0.7,
  };

  const formCardHoverStyle = {
    borderColor: "var(--primary, #007bff)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transform: "translateY(-2px)",
  };

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">نماذج التدريب</h1>
        <p className="page-subtitle">
          اختر النموذج الذي تريد تعبئته وإرساله للمشرف الأكاديمي
        </p>
      </div>

      {loading ? (
        <div className="section-card" style={{ textAlign: "center", padding: "2rem" }}>
          <Loader2 className="spin" size={24} /> جاري التحميل...
        </div>
      ) : (
        <>
          {!isEditable && !selectedForm && (
            <div className="alert-custom alert-warning mb-3" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Lock size={18} />
              تعبئة النماذج مغلقة حالياً من قبل المنسق. يمكنك مشاهدة النماذج فقط.
            </div>
          )}

          {error && (
            <div className="alert-custom alert-danger mb-3" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {success && (
            <div className="alert-custom alert-success mb-3">{success}</div>
          )}

          {submitSuccess && (
            <div className="alert-custom alert-success mb-3">{submitSuccess}</div>
          )}

          {/* Forms List View */}
          {!selectedForm && (
            <div className="section-card">
              <div className="panel-header">
                <h3 className="panel-title">النماذج المتاحة</h3>
                <p className="panel-subtitle">
                  اختر النموذج الذي تريد تعبئته
                </p>
              </div>

              <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
                {availableForms.map((form) => (
                  <div
                    key={form.id}
                    onClick={() => isEditable && setSelectedForm(form.id)}
                    style={formCardStyle}
                    onMouseEnter={(e) => {
                      if (isEditable) {
                        Object.assign(e.currentTarget.style, formCardHoverStyle);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e0e0e0";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "8px",
                        backgroundColor: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--primary, #007bff)",
                      }}
                    >
                      <form.icon size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                        {form.title}
                      </h4>
                      <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                        {form.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Form View */}
          {selectedForm && (
            <>
              <button
                onClick={handleBackToForms}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginBottom: "1rem",
                  color: "#333",
                }}
              >
                <ChevronLeft size={18} /> العودة للنماذج
              </button>

          {/* Teaching Sessions Table (الحصص النوعية) */}
          <div className="section-card" style={{ marginTop: "2rem" }}>
            <div className="panel-header">
              <h3 className="panel-title">عدد الحصص التي درسها الطالب</h3>
              <p className="panel-subtitle">
                تسجيل الحصص النوعية التي قام الطالب بتدريسها خلال فترة التدريب
              </p>
            </div>

            <div className="table-wrapper" style={{ marginTop: "1rem" }}>
              <table
                className="table-custom"
                style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        fontWeight: "bold",
                        backgroundColor: "#e8e8e8",
                        width: "15%",
                      }}
                    >
                      الصف
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        fontWeight: "bold",
                        backgroundColor: "#e8e8e8",
                        width: "30%",
                      }}
                    >
                      المقرر الذي قمت بدراسته
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        fontWeight: "bold",
                        backgroundColor: "#e8e8e8",
                        width: "35%",
                      }}
                    >
                      الموضوع
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        border: "1px solid #ddd",
                        fontWeight: "bold",
                        backgroundColor: "#e8e8e8",
                        width: "20%",
                      }}
                    >
                      عدد الحصص التي درستها لكل مقرر
                    </th>
                    {isEditable && (
                      <th
                        style={{
                          padding: "12px",
                          border: "1px solid #ddd",
                          fontWeight: "bold",
                          backgroundColor: "#e8e8e8",
                          width: "5%",
                        }}
                      >
                        حذف
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {teachingSessions.map((session) => (
                    <tr key={session.id}>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        {isEditable ? (
                          <input
                            type="text"
                            value={session.grade}
                            onChange={(e) => updateTeachingSession(session.id, "grade", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                            placeholder="الصف"
                          />
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: session.grade ? "#333" : "#aaa" }}>
                            {session.grade || "—"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        {isEditable ? (
                          <input
                            type="text"
                            value={session.subject}
                            onChange={(e) => updateTeachingSession(session.id, "subject", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                            placeholder="المقرر"
                          />
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: session.subject ? "#333" : "#aaa" }}>
                            {session.subject || "—"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        {isEditable ? (
                          <input
                            type="text"
                            value={session.topic}
                            onChange={(e) => updateTeachingSession(session.id, "topic", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                            placeholder="الموضوع"
                          />
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: session.topic ? "#333" : "#aaa" }}>
                            {session.topic || "—"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        {isEditable ? (
                          <input
                            type="number"
                            min="0"
                            value={session.sessionsCount}
                            onChange={(e) => updateTeachingSession(session.id, "sessionsCount", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontSize: "0.9rem",
                            }}
                            placeholder="0"
                          />
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: session.sessionsCount ? "#333" : "#aaa" }}>
                            {session.sessionsCount || "—"}
                          </span>
                        )}
                      </td>
                      {isEditable && (
                        <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                          <button
                            onClick={() => deleteTeachingSession(session.id)}
                            disabled={teachingSessions.length <= 1}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: teachingSessions.length <= 1 ? "not-allowed" : "pointer",
                              color: teachingSessions.length <= 1 ? "#ccc" : "#dc3545",
                              opacity: teachingSessions.length <= 1 ? 0.5 : 1,
                            }}
                            title="حذف الصف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isEditable && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  onClick={addTeachingSession}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Plus size={16} /> إضافة صف
                </button>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={resetTeachingSessions}
                    disabled={saving}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    <RotateCcw size={16} /> إعادة تعيين
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "var(--primary, #007bff)",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    {saving ? "جاري الحفظ..." : "حفظ الجدول"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit to Supervisor Button */}
          <div
            className="section-card"
            style={{
              marginTop: "1.5rem",
              backgroundColor: "#f8f9fa",
              border: "2px dashed #dee2e6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
                  إرسال للمشرف الأكاديمي
                </h4>
                <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                  بعد الانتهاء من تعبئة النموذج، قم بإرساله للمشرف الأكاديمي للمراجعة والاعتماد
                </p>
              </div>
              <button
                onClick={handleSubmitToSupervisor}
                disabled={submitting || !isEditable}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: submitting || !isEditable ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  opacity: submitting || !isEditable ? 0.6 : 1,
                  fontSize: "1rem",
                }}
              >
                {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                {submitting ? "جاري الإرسال..." : "إرسال للمشرف"}
              </button>
            </div>
          </div>
            </>
          )}
        </>
      )}
    </>
  );
}
