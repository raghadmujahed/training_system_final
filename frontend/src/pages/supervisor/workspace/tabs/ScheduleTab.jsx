import { useState, useEffect, useCallback } from "react";
import { apiClient, apiOrigin } from "../../../../services/api";
import { Calendar, Clock, Download, Printer, CheckCircle, AlertCircle, FileText } from "lucide-react";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import { useToast } from "../../../../components/Toast";

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

// Print-specific CSS
const printStyles = `
@media print {
  @page { size: landscape; margin: 5mm; }
  body * { visibility: hidden; }
  #printable-schedule, #printable-schedule * { visibility: visible; }
  #printable-schedule { 
    position: absolute; 
    left: 0; top: 0; 
    width: 100%;
    padding: 3mm;
  }
  .no-print { display: none !important; }
  .print-header { display: block !important; visibility: visible !important; }
  .print-title { font-size: 16px !important; font-weight: 800 !important; color: #142a42 !important; margin-bottom: 8px !important; }
  
  .print-header table { 
    width: 100%; 
    border-collapse: collapse; 
    font-size: 10px !important;
  }
  .print-header td { 
    border: 1px solid #142a42 !important; 
    padding: 8px 10px !important; 
    text-align: right;
  }
  .print-header td:first-child { 
    background-color: #142a42 !important; 
    color: white !important;
    font-weight: 700 !important;
    width: 16% !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #666; padding: 6px 4px; text-align: center; font-size: 9px; }
  th { background-color: #142a42 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .day-cell { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important; font-weight: 700 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .filled-cell { background-color: #e3f2fd !important; color: #1565c0 !important; font-weight: 600 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default function ScheduleTab({ studentId, student }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(buildEmptySchedule);
  const [studentInfo, setStudentInfo] = useState({
    name: "—",
    university_id: "—",
    phone: "—",
    major: "—",
    school: "—",
    school_phone: "—",
    school_location: "—",
    teacher_name: "—",
    start_date: "—",
    semester: "—",
  });
  const [programStatus, setProgramStatus] = useState(null);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [filePath, setFilePath] = useState(null);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/training-program`);
      const data = res.data?.data || res.data;

      if (data?.schedule) {
        const merged = buildEmptySchedule();
        Object.keys(data.schedule).forEach((dayId) => {
          if (merged[dayId]) {
            Object.keys(data.schedule[dayId]).forEach((periodId) => {
              if (merged[dayId][periodId] !== undefined) {
                merged[dayId][periodId] = data.schedule[dayId][periodId] || "";
              }
            });
          }
        });
        setSchedule(merged);
        setHasSchedule(true);
      } else {
        setHasSchedule(false);
      }

      if (data?.status) setProgramStatus(data.status);
      if (data?.file_path) setFilePath(data.file_path);

      // Use student info from API or fallback to prop
      const info = data?.student_info || {};
      setStudentInfo({
        name: info.name || student?.name || "—",
        university_id: info.university_id || student?.university_id || "—",
        phone: info.phone || student?.phone || "—",
        major: info.major || student?.specialization || "—",
        school: info.school || student?.site_name || "—",
        school_phone: info.school_phone || "—",
        school_location: info.school_location || "—",
        teacher_name: info.teacher_name || student?.mentor_name || "—",
        start_date: info.start_date || "—",
        semester: info.semester || "—",
      });
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل جدول الحصص الأسبوعية");
    } finally {
      setLoading(false);
    }
  }, [studentId, student]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handlePrint = () => {
    window.print();
  };

  const filledCount = days.reduce(
    (acc, day) => acc + periods.filter((p) => schedule[day.id]?.[p.id]).length,
    0
  );

  const totalCells = days.length * periods.length;
  const completionRate = Math.round((filledCount / totalCells) * 100);

  if (loading) return <LoadingSpinner size="section" text="جاري تحميل الجدول..." />;

  if (error) {
    return (
      <div className="section-card" style={{ padding: "2.5rem", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(176,58,72,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <AlertCircle size={28} style={{ color: "var(--danger)" }} />
        </div>
        <p className="text-danger" style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (!hasSchedule) {
    return (
      <div className="section-card" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
        <h4 style={{ margin: "0 0 0.5rem", color: "#142a42" }}>لم يتم إنشاء جدول الحصص الأسبوعية بعد</h4>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          الطالب لم يقم بإنشاء جدول الحصص الأسبوعية حتى الآن.
        </p>
      </div>
    );
  }

  return (
    <div>
      <style>{printStyles}</style>

      {/* Progress Card */}
      <div className="section-card no-print" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={18} /> نسبة اكتمال جدول الحصص
          </h4>
          <span style={{ fontSize: "1.3rem", fontWeight: "700", color: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545" }}>
            {completionRate}%
          </span>
        </div>
        <div style={{ background: "#e9ecef", borderRadius: "10px", height: "12px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${completionRate}%`,
              background: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545",
              borderRadius: "10px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div style={{ marginTop: "12px", display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "#64748b" }}>
          <span>📊 الحصص المحددة: {filledCount} من {totalCells}</span>
          {programStatus && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle size={14} /> الحالة: {programStatus === "approved" ? "معتمد" : programStatus === "submitted" ? "مُقدم" : "مسودة"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="section-card no-print" style={{ marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          onClick={handlePrint}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Printer size={16} /> طباعة
        </button>
        {filePath && (
          <a
            href={`${apiOrigin}/storage/${filePath.replace(/^\//, "")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "#0d6efd",
              textDecoration: "none",
            }}
          >
            <Download size={16} /> تحميل PDF
          </a>
        )}
      </div>

      {/* Schedule Display */}
      <div id="printable-schedule" className="section-card" style={{ padding: "1.5rem" }}>
        {/* Print Header */}
        <div className="print-header" style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, textAlign: "center", color: "#142a42" }}>
            نموذج جدول الحصص الأسبوعية
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "12px", textAlign: "center", color: "#64748b" }}>
            برنامج التدريب العملي - جامعة الخليل
          </p>
        </div>

        {/* Student Info Table */}
        <div className="print-header" style={{ marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", direction: "rtl", border: "1px solid #142a42" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", width: "15%", background: "#142a42", color: "white", fontWeight: 700 }}>اسم الطالب:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", width: "35%" }}>{studentInfo.name}</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", width: "15%", background: "#142a42", color: "white", fontWeight: 700 }}>المدرسة:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", width: "35%" }}>{studentInfo.school}</td>
              </tr>
              <tr style={{ background: "#f8fafc" }}>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", background: "#142a42", color: "white", fontWeight: 700 }}>الرقم الجامعي:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42" }}>{studentInfo.university_id}</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", background: "#142a42", color: "white", fontWeight: 700 }}>المعلم المتعاون:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42" }}>{studentInfo.teacher_name}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", background: "#142a42", color: "white", fontWeight: 700 }}>التخصص:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42" }}>{studentInfo.major}</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42", background: "#142a42", color: "white", fontWeight: 700 }}>الفترة:</td>
                <td style={{ padding: "8px 12px", border: "1px solid #142a42" }}>{studentInfo.semester}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Schedule Table */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px", background: "#142a42", color: "white", fontWeight: 700, fontSize: "0.85rem", width: "90px" }}>
                  اليوم / الحصة
                </th>
                {periods.map((period) => (
                  <th key={period.id} style={{ padding: "10px 4px", background: "#142a42", color: "white", fontWeight: 600, fontSize: "0.8rem" }}>
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => (
                <tr key={day.id} style={{ backgroundColor: dayIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "12px", fontWeight: 700, fontSize: "0.85rem", color: "#142a42", border: "1px solid #e2e8f0", background: "#f1f5f9" }}>
                    {day.label}
                  </td>
                  {periods.map((period) => {
                    const value = schedule[day.id]?.[period.id];
                    const isFilled = !!value;
                    return (
                      <td
                        key={`${day.id}-${period.id}`}
                        style={{
                          padding: "12px 8px",
                          border: "1px solid #e2e8f0",
                          minWidth: "80px",
                          backgroundColor: isFilled ? "#f0f9ff" : "white",
                          color: isFilled ? "#0369a1" : "#94a3b8",
                          fontWeight: isFilled ? 600 : 400,
                        }}
                      >
                        {value || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="no-print" style={{ marginTop: "1rem", display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 16, height: 16, background: "#f0f9ff", border: "1px solid #e2e8f0", borderRadius: "4px" }}></span>
            حصة محددة
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 16, height: 16, background: "white", border: "1px solid #e2e8f0", borderRadius: "4px" }}></span>
            غير محدد
          </span>
        </div>
      </div>
    </div>
  );
}
