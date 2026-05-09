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
      <div className="section-card p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[rgba(176,58,72,0.08)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} style={{ color: "var(--danger)" }} />
        </div>
        <p className="text-danger text-[1.05rem] font-semibold m-0">{error}</p>
      </div>
    );
  }

  if (!hasSchedule) {
    return (
      <div className="section-card p-12 text-center">
        <div className="text-[3rem] mb-4">📅</div>
        <h4 className="m-0 mb-2 text-[#142a42]">لم يتم إنشاء جدول الحصص الأسبوعية بعد</h4>
        <p className="m-0 text-[#64748b] text-[0.9rem]">
          الطالب لم يقم بإنشاء جدول الحصص الأسبوعية حتى الآن.
        </p>
      </div>
    );
  }

  return (
    <div>
      <style>{printStyles}</style>

      {/* Progress Card */}
      <div className="section-card no-print mb-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="m-0 flex items-center gap-2">
            <Calendar size={18} /> نسبة اكتمال جدول الحصص
          </h4>
          <span className="text-[1.3rem] font-bold" style={{ color: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545" }}>
            {completionRate}%
          </span>
        </div>
        <div className="bg-[#e9ecef] rounded-[10px] h-3 overflow-hidden">
          <div
            className="h-full rounded-[10px] transition-[width] duration-500 ease"
            style={{
              width: `${completionRate}%`,
              background: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545",
            }}
          />
        </div>
        <div className="mt-3 flex gap-4 flex-wrap text-[0.85rem] text-[#64748b]">
          <span>📊 الحصص المحددة: {filledCount} من {totalCells}</span>
          {programStatus && (
            <span className="flex items-center gap-1">
              <CheckCircle size={14} /> الحالة: {programStatus === "approved" ? "معتمد" : programStatus === "submitted" ? "مُقدم" : "مسودة"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="section-card no-print mb-4 flex gap-3 flex-wrap">
        <button
          onClick={handlePrint}
          className="py-2 px-4 text-[0.85rem] border border-[#e2e8f0] rounded-md bg-white cursor-pointer flex items-center gap-[0.4rem]"
        >
          <Printer size={16} /> طباعة
        </button>
        {filePath && (
          <a
            href={`${apiOrigin}/storage/${filePath.replace(/^\//, "")}`}
            target="_blank"
            rel="noreferrer"
            className="py-2 px-4 text-[0.85rem] border border-[#e2e8f0] rounded-md bg-white cursor-pointer flex items-center gap-[0.4rem] text-[#0d6efd] no-underline"
          >
            <Download size={16} /> تحميل PDF
          </a>
        )}
      </div>

      {/* Schedule Display */}
      <div id="printable-schedule" className="section-card p-6">
        {/* Print Header */}
        <div className="print-header mb-5">
          <h2 className="m-0 text-[16px] font-bold text-center text-[#142a42]">
            نموذج جدول الحصص الأسبوعية
          </h2>
          <p className="m-0 mt-1 text-[12px] text-center text-[#64748b]">
            برنامج التدريب العملي - جامعة الخليل
          </p>
        </div>

        {/* Student Info Table */}
        <div className="print-header mb-5">
          <table className="w-full border-collapse text-[12px] direction-rtl border border-[#142a42]">
            <tbody>
              <tr>
                <td className="py-2 px-3 border border-[#142a42] w-[15%] bg-[#142a42] text-white font-bold">اسم الطالب:</td>
                <td className="py-2 px-3 border border-[#142a42] w-[35%]">{studentInfo.name}</td>
                <td className="py-2 px-3 border border-[#142a42] w-[15%] bg-[#142a42] text-white font-bold">المدرسة:</td>
                <td className="py-2 px-3 border border-[#142a42] w-[35%]">{studentInfo.school}</td>
              </tr>
              <tr className="bg-[#f8fafc]">
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">الرقم الجامعي:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.university_id}</td>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">المعلم المتعاون:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.teacher_name}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">التخصص:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.major}</td>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">الفترة:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.semester}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Schedule Table */}
        <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-center text-[0.9rem]">
            <thead>
              <tr>
                <th className="p-3 bg-[#142a42] text-white font-bold text-[0.85rem] w-[90px]">
                  اليوم / الحصة
                </th>
                {periods.map((period) => (
                  <th key={period.id} className="py-[10px] px-1 bg-[#142a42] text-white font-semibold text-[0.8rem]">
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => (
                <tr key={day.id} className={dayIdx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                  <td className="p-3 font-bold text-[0.85rem] text-[#142a42] border border-[#e2e8f0] bg-[#f1f5f9]">
                    {day.label}
                  </td>
                  {periods.map((period) => {
                    const value = schedule[day.id]?.[period.id];
                    const isFilled = !!value;
                    return (
                      <td
                        key={`${day.id}-${period.id}`}
                        className="py-3 px-2 border border-[#e2e8f0] min-w-[80px]"
                        style={{
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
        <div className="no-print mt-4 flex gap-4 text-[0.8rem] text-[#64748b]">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-[#f0f9ff] border border-[#e2e8f0] rounded"></span>
            حصة محددة
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-white border border-[#e2e8f0] rounded"></span>
            غير محدد
          </span>
        </div>
      </div>
    </div>
  );
}
