import { useCallback, useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStudentTrainingProgram, saveStudentTrainingProgram, uploadPortfolioFile, updatePortfolioEntry } from "../../services/api";
import html2pdf from "html2pdf.js";
import { Calendar, Clock, Lock, Edit3, Save, RotateCcw, Loader2, AlertCircle, CheckCircle, Printer, User, Building2, GraduationCap, Phone, MapPin, BookOpen } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useToast } from "../../components/Toast";
import { useStudentTrack } from "../../hooks/useStudentTrack";

// Professional Print-specific CSS
const printStyles = `
@media print {
  @page { size: landscape; margin: 5mm; }
  body * { visibility: hidden; }
  #printable-area, #printable-area * { visibility: visible; }
  #printable-area { 
    position: absolute; 
    left: 0; top: 0; 
    width: 100%;
    padding: 3mm;
  }
  .no-print { display: none !important; }
  .print-header { display: block !important; visibility: visible !important; }
  .print-title { font-size: 16px !important; font-weight: 800 !important; color: #142a42 !important; margin-bottom: 8px !important; }
  
  /* Student info table print styles */
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
  
  /* Schedule table print styles */
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #666; padding: 6px 4px; text-align: center; font-size: 9px; }
  th { background-color: #142a42 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .day-cell { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important; font-weight: 700 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .filled-cell { background-color: #e3f2fd !important; color: #1565c0 !important; font-weight: 600 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

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

export default function Schedule() {
  const location = useLocation();
  const { isPsychology, config } = useStudentTrack();

  if (isPsychology) {
    return <Navigate to="/student/dashboard" replace />;
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [isEditable, setIsEditable] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ name: "—", university_id: "—", phone: "—", major: "—", school: "—", school_phone: "—", school_location: "—", teacher_name: "—", start_date: "—", semester: "—" });
  const [schedule, setSchedule] = useState(buildEmptySchedule);
  const [hasSavedProgram, setHasSavedProgram] = useState(false);
  const [programStatus, setProgramStatus] = useState(null);
  const [coordinatorNote, setCoordinatorNote] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const portfolioEntryIdRef = useRef(null);
  const { addToast } = useToast();

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
        setHasSavedProgram(true);
      }
      if (res?.data?.status) setProgramStatus(res.data.status);
      if (res?.data?.coordinator_note) setCoordinatorNote(res.data.coordinator_note);
      if (res?.is_editable !== undefined) {
        setIsEditable(res.is_editable);
      }
      if (res?.student_info) {
        setStudentInfo({
          name: res.student_info.name || "—",
          university_id: res.student_info.university_id || "—",
          phone: res.student_info.phone || "—",
          major: res.student_info.major || "—",
          school: res.student_info.school || "—",
          school_phone: res.student_info.school_phone || "—",
          school_location: res.student_info.school_location || "—",
          teacher_name: res.student_info.teacher_name || "—",
          start_date: res.student_info.start_date || "—",
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

  // Handle edit entry from Portfolio page
  useEffect(() => {
    const editData = location.state?.editEntry;
    if (!editData) return;

    setEditingEntry(editData);
    if (editData.id) {
      portfolioEntryIdRef.current = editData.id;
    }

    // Try to parse schedule from content
    try {
      const parsed = typeof editData.content === "string" ? JSON.parse(editData.content) : editData.content;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const merged = buildEmptySchedule();
        Object.keys(parsed).forEach((dayId) => {
          if (merged[dayId]) {
            Object.keys(parsed[dayId] || {}).forEach((periodId) => {
              if (merged[dayId][periodId] !== undefined) {
                merged[dayId][periodId] = parsed[dayId][periodId] || "";
              }
            });
          }
        });
        setSchedule(merged);
        setHasSavedProgram(true);
      }
    } catch {
      // Content may not be valid schedule JSON — ignore, will load from API
    }

    // Clear navigation state
    window.history.replaceState({}, "");
  }, [location.state]);

  const handleCellChange = (dayId, periodId, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [periodId]: value },
    }));
    setSuccess("");
  };

  const generatePdf = async () => {
    const element = document.getElementById('printable-area');
    if (!element) return null;
    const opt = {
      margin: 10,
      filename: 'training-program.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };
    const blob = await html2pdf().set(opt).from(element).output('blob');
    return blob;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await saveStudentTrainingProgram({ schedule });
      setHasSavedProgram(true);
      if (res?.data?.portfolio_entry_id) {
        portfolioEntryIdRef.current = res.data.portfolio_entry_id;
      }

      // Update existing portfolio entry or generate PDF for new one
      try {
        if (editingEntry && portfolioEntryIdRef.current) {
          const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
          await updatePortfolioEntry(portfolioEntryIdRef.current, {
            title: `جدول الحصص الأسبوعية — ${dateStr}`,
            content: JSON.stringify(schedule, null, 2),
          });
        }
        const pdfBlob = await generatePdf();
        if (pdfBlob && portfolioEntryIdRef.current) {
          await uploadPortfolioFile(portfolioEntryIdRef.current, pdfBlob, 'training-program.pdf');
        }
      } catch (pdfErr) {
        console.error('PDF upload failed:', pdfErr);
      }

      const actionText = editingEntry ? "تعديل" : "حفظ";
      setSuccess(`تم ${actionText} جدول الحصص الأسبوعية بنجاح وإضافته للملف الإنجاز.`);
      addToast(`تم ${actionText} جدول الحصص الأسبوعية بنجاح`, "success");
      setEditingEntry(null);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر حفظ جدول الحصص الأسبوعية.");
      addToast(e?.response?.data?.message || "تعذر حفظ جدول الحصص الأسبوعية.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSchedule(buildEmptySchedule());
    setSuccess("");
  };

  const handlePrint = () => {
    window.print();
  };

  const filledCount = days.reduce(
    (acc, day) => acc + periods.filter((p) => schedule[day.id]?.[p.id]).length,
    0
  );

  if (loading) {
    return (
      <LoadingSpinner size="section" text="جاري تحميل جدول الحصص..." />
    );
  }

  if (error && !Object.keys(schedule).some((d) => periods.some((p) => schedule[d]?.[p.id]))) {
    return (
      <div className="section-card p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[rgba(176,58,72,0.08)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-[var(--danger)]" />
        </div>
        <p className="text-danger m-0 text-[1.05rem] font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <>
      <style>{printStyles}</style>

      {/* Header */}
      <div className="content-header no-print">
        <div className="content-header-icon">
          <Calendar size={26} />
        </div>
        <div className="content-header-content">
          <h1 className="page-title">{config.scheduleTitle}</h1>
          <p className="page-subtitle">{studentInfo.name} — {studentInfo.university_id}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-3 py-3 px-4 bg-[#fee2e2] border border-[#fecaca] rounded-lg text-[#991b1b] text-[0.9rem]">
          {error}
        </div>
      )}
      {success && (
        <div className="no-print mb-3 py-3 px-4 bg-[#dcfce7] border border-[#bbf7d0] rounded-lg text-[#166534] text-[0.9rem]">
          {success}
        </div>
      )}

      {/* نموذج جدول الحصص الأسبوعية */}
      <div id="printable-area" className="section-card p-6">
        
        {/* Print Header - Simple */}
        <div className="print-header mb-5">
          <h2 className="m-0 text-[16px] font-bold text-center text-[#142a42]">
            نموذج جدول الحصص الأسبوعية
          </h2>
          <p className="m-0 mt-1 text-[12px] text-center text-[#64748b]">
            برنامج التدريب العملي - جامعة الخليل
          </p>
        </div>

        {/* Student Info Table - Clean */}
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
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">رقم المدرسة:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.school_phone}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">التخصص:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.major}</td>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">المعلم المتعاون:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.teacher_name}</td>
              </tr>
              <tr className="bg-[#f8fafc]">
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">رقم الهاتف:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.phone}</td>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">تاريخ البدء:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.start_date}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">مكان السكن:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.school_location}</td>
                <td className="py-2 px-3 border border-[#142a42] bg-[#142a42] text-white font-bold">الفترة:</td>
                <td className="py-2 px-3 border border-[#142a42]">{studentInfo.semester}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print Button */}
        {hasSavedProgram && (
          <div className="no-print flex justify-end mb-4">
            <button onClick={handlePrint} className="py-[0.4rem] px-[0.75rem] text-[0.8rem] border border-[#e2e8f0] rounded-md bg-white cursor-pointer flex items-center gap-[0.4rem]">
              <Printer size={14} /> طباعة
            </button>
          </div>
        )}

        {/* Schedule Table - Clean */}
        <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-center text-[0.9rem]">
            <thead>
              <tr>
                <th className="py-3 px-3 bg-[#142a42] text-white font-bold text-[0.85rem] w-[90px]">
                  اليوم
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
                <tr key={day.id} style={{ backgroundColor: dayIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td className="py-3 px-3 font-bold text-[0.85rem] text-[#142a42] border border-[#e2e8f0] bg-[#f1f5f9]">
                    {day.label}
                  </td>
                  {periods.map((period) => {
                    const isFilled = !!schedule[day.id]?.[period.id];
                    return (
                      <td key={`${day.id}-${period.id}`} className="py-[6px] px-1 border border-[#e2e8f0] min-w-[60px]">
                        {isEditable ? (
                          <input type="text" value={schedule[day.id]?.[period.id] || ""}
                            onChange={(e) => handleCellChange(day.id, period.id, e.target.value)}
                            placeholder="..."
                            className="w-full py-[6px] px-1 border border-[#e2e8f0] rounded text-[0.8rem] text-center" style={{ backgroundColor: isFilled ? "#f0f9ff" : "white" }}
                          />
                        ) : (
                          <span className="text-[0.85rem]" style={{ color: isFilled ? "#0369a1" : "#94a3b8" }}>
                            {schedule[day.id]?.[period.id] || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons - Simple */}
        {isEditable && (
          <div className="no-print flex justify-between items-center mt-6">
            <button onClick={handleReset} disabled={saving}
              className="py-2 px-4 text-[0.85rem] border border-[#e2e8f0] rounded-md bg-white" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}
            >
              إعادة تعيين
            </button>
            <button onClick={handleSave} disabled={saving}
              className="py-2 px-5 text-[0.9rem] font-semibold border-none rounded-md bg-[#142a42] text-white" style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        )}

        {/* Simple Note */}
        <div className="no-print mt-4 p-3 bg-[#fefce8] rounded-md text-[0.8rem] text-[#854d0e]">
          <strong>ملاحظة:</strong> عند الحفظ يتم إضافة الجدول تلقائياً لملف الإنجاز.
        </div>

      </div>
    </>
  );
}
