import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowRight, BookOpen, GraduationCap, CheckCircle2 } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getStudentTrainingProgramById } from "../../services/api";

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

export default function StudentTrainingProgram() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentInfo, setStudentInfo] = useState({ name: "—", university_id: "—" });
  const [schedule, setSchedule] = useState({});

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getStudentTrainingProgramById(studentId);
      if (res?.data?.schedule) {
        setSchedule(res.data.schedule);
      }
      if (res?.data?.student) {
        setStudentInfo(res.data.student);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل برنامج التدريب.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const getCellValue = (dayId, periodId) => {
    return schedule?.[dayId]?.[periodId] || "";
  };

  const hasAnyContent = Object.keys(schedule).some(dayId =>
    periods.some(p => getCellValue(dayId, p.id))
  );

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل برنامج التدريب..." />
    );
  }

  if (error) {
    return (
      <div>
        <div className="hero-section mb-4">
          <div className="hero-content">
            <div className="hero-icon">
              <BookOpen size={44} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 className="hero-title">برنامج التدريب</h1>
              <p className="hero-subtitle">عرض جدول الحصص الأسبوعي للطالب</p>
            </div>
          </div>
        </div>
        <div className="alert-custom alert-danger mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={18} /> {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <BookOpen size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">برنامج التدريب</h1>
            <p className="hero-subtitle">
              عرض جدول الحصص الأسبوعي كما أدخله الطالب
            </p>
          </div>
          <button
            className="btn-outline-custom"
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            <ArrowRight size={16} />
            رجوع
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="section-card mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {studentInfo.name?.charAt(0) || "—"}
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontSize: "1rem" }}>{studentInfo.name}</h5>
            <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "var(--text-soft)", marginTop: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <GraduationCap size={13} style={{ color: "var(--info)" }} />
                {studentInfo.university_id}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
                {hasAnyContent ? "تم إدخال الجدول" : "لم يتم إدخال الجدول بعد"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="section-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
            <BookOpen size={18} />
          </div>
          <h5 style={{ margin: 0 }}>جدول التطبيق</h5>
        </div>

        {hasAnyContent ? (
          <div className="table-wrapper">
            <table className="data-table" style={{ textAlign: "center" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center", minWidth: 90 }}>اليوم / الحصة</th>
                  {periods.map((period) => (
                    <th key={period.id} style={{ textAlign: "center", minWidth: 80 }}>
                      {period.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id}>
                    <td style={{ fontWeight: 700, background: "#f8f9fa" }}>
                      {day.label}
                    </td>
                    {periods.map((period) => {
                      const value = getCellValue(day.id, period.id);
                      return (
                        <td key={`${day.id}-${period.id}`} style={{
                          color: value ? "var(--text-primary)" : "var(--text-faint)",
                          background: value ? "#fff" : "#fafbfc",
                        }}>
                          {value || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-faint)",
          }}>
            <BookOpen size={40} style={{ marginBottom: 10, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>لم يقم الطالب بإدخال جدول الحصص بعد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
