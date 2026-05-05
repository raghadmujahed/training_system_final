import { useCallback, useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStudentTrainingProgram, saveStudentTrainingProgram, uploadPortfolioFile, updatePortfolioEntry } from "../../services/api";
import html2pdf from "html2pdf.js";
import { Calendar, Clock, Lock, Edit3, Save, RotateCcw, Loader2, AlertCircle, CheckCircle, Printer } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useToast } from "../../components/Toast";
import { useStudentTrack } from "../../hooks/useStudentTrack";

// Print-specific CSS
const printStyles = `
@media print {
  @page { size: landscape; margin: 8mm; }
  body * { visibility: hidden; }
  #printable-area, #printable-area * { visibility: visible; }
  #printable-area { 
    position: absolute; 
    left: 0; top: 0; 
    width: 100%;
    padding: 6mm;
  }
  .no-print { display: none !important; }
  .print-header { display: block !important; visibility: visible !important; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 6px 4px; text-align: center; font-size: 10px; }
  th { background-color: var(--primary, #142a42) !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .day-cell { background-color: #f0f0f0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .filled-cell { background-color: #e8f0fe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      <div className="section-card" style={{ padding: "2.5rem", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(176,58,72,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <AlertCircle size={28} style={{ color: "var(--danger)" }} />
        </div>
        <p className="text-danger" style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="content-header no-print">
        <h1 className="page-title">{config.scheduleTitle}</h1>
        <p className="page-subtitle">
          الجدول الأسبوعي للحصص التدريبية — {studentInfo.name} — {studentInfo.university_id}
        </p>
      </div>

      {/* Status Alerts */}
      {!isEditable && (
        <div className="alert-custom alert-warning mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <Lock size={18} />
          تعبئة جدول الحصص الأسبوعية مغلقة حالياً من قبل المنسق. يمكنك مشاهدة الجدول فقط.
        </div>
      )}

      {isEditable && (
        <div className="alert-custom alert-info mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <Edit3 size={18} />
          تعبئة جدول الحصص الأسبوعية مفتوحة — يمكنك تعديل الجدول وحفظه.
        </div>
      )}

      {programStatus === "submitted" && hasSavedProgram && (
        <div className="alert-custom alert-info mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <Clock size={18} />
          {"تم إرسال جدول الحصص الأسبوعية للمنسق — بانتظار المراجعة."}
        </div>
      )}

      {programStatus === "approved" && hasSavedProgram && (
        <div className="alert-custom alert-success mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <CheckCircle size={18} />
          {"تمت الموافقة على جدول الحصص الأسبوعية من المنسق."}
        </div>
      )}

      {programStatus === "rejected" && hasSavedProgram && (
        <div className="alert-custom alert-danger mb-3 no-print" style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.95rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <AlertCircle size={18} />
            {"تم رفض جدول الحصص الأسبوعية من المنسق."}
          </div>
          {coordinatorNote && (
            <div style={{ marginRight: "1.8rem", fontSize: "0.88rem", opacity: 0.9, fontWeight: 500 }}>
              <strong>{"ملاحظة المنسق:"}</strong> {coordinatorNote}
            </div>
          )}
        </div>
      )}

      {editingEntry && (
        <div className="alert-custom alert-warning mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <Edit3 size={18} />
          وضع التعديل — يتم تحديث المدخل الموجود في ملف الإنجاز
        </div>
      )}

      {error && (
        <div className="alert-custom alert-danger mb-3" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="alert-custom alert-success mb-3 no-print" style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* Info Strip */}
      <div className="section-card mb-3" style={{ padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160, padding: "0.6rem 1.25rem", borderLeft: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-faint)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>الطالب</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary-dark)" }}>{studentInfo.name}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>{studentInfo.university_id}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: "0.6rem 1.25rem", borderLeft: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-faint)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>جهة التدريب</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary-dark)" }}>{studentInfo.school || "—"}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>المدرسة / المركز</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: "0.6rem 1.25rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-faint)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>الفترة التدريبية</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary-dark)" }}>{studentInfo.semester || "—"}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>الفترة الحالية</div>
          </div>
        </div>
      </div>

      {/* نموذج جدول الحصص الأسبوعية */}
      <div id="printable-area" className="section-card">
        {/* Personal info table — visible on screen and in print */}
        <div className="print-header" style={{ marginBottom: '16px' }}>
          <h2 className="no-print" style={{ display: 'none' }}></h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '13px', direction: 'rtl', border: '1px solid #dee2e6' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999', width: '25%' }}><strong>اسم الطالب :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999', width: '25%' }}>{studentInfo.name}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999', width: '25%' }}><strong>المدرسة :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999', width: '25%' }}>{studentInfo.school}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>مكان السكن :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.school_location}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>البلدة :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>الرقم الجامعي :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.university_id}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>رقم المدرسة :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.school_phone}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>التخصص :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.major}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>اسم مدير المدرسة :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>رقم الهاتف :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.phone}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>اسم المعلم المتعاون :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.teacher_name}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>تاريخ بداية التدريب :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}>{studentInfo.start_date}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>الصفوف التي سيطبق فيها الطالب :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>أيام التطبيق :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}><strong>المباحث التي سيتم التطبيق فيها :</strong></td>
                <td style={{ padding: '5px 8px', border: '1px solid #999' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Panel Header */}
        <div className="no-print" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          marginBottom: "1.5rem",
          borderBottom: "1.5px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
              boxShadow: "0 4px 14px rgba(20,42,66,0.2)",
            }}>
              <Calendar size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--primary-dark)" }}>
                {config.scheduleTitle}
              </h3>
              <p style={{ margin: "0.2rem 0 0", color: "var(--text-faint)", fontSize: "0.88rem" }}>
                5 أيام × 7 حصص تدريبية
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {hasSavedProgram && (
              <button onClick={handlePrint} className="btn-outline-custom btn-sm-custom">
                <Printer size={14} /> طباعة
              </button>
            )}
            <span className={isEditable ? "badge-custom badge-success" : "badge-custom badge-warning"}>
              {isEditable ? <><Edit3 size={13} /> قابل للتعديل</> : <><Lock size={13} /> للعرض فقط</>}
            </span>
          </div>
        </div>

        <div className="table-wrapper" style={{ borderRadius: "var(--radius-md, 16px)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              textAlign: "center",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "14px 14px",
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    border: "none",
                    width: "110px",
                    letterSpacing: "0.02em",
                  }}
                >
                  اليوم / الحصة
                </th>
                {periods.map((period, idx) => (
                  <th
                    key={period.id}
                    style={{
                      padding: "12px 8px",
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      border: "none",
                      borderRight: idx < periods.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", opacity: 0.7, marginBottom: 2 }}>{period.id}</div>
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => (
                <tr
                  key={day.id}
                  style={{
                    backgroundColor: dayIdx % 2 === 0 ? "#ffffff" : "var(--bg-soft, #faf8f5)",
                    transition: "var(--transition)",
                  }}
                >
                  <td
                    style={{
                      padding: "16px 14px",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      background: "linear-gradient(135deg, #f7f9fc 0%, #edf1f7 100%)",
                      color: "var(--primary)",
                      border: "1px solid var(--border)",
                      borderRight: "4px solid var(--primary)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {day.label}
                  </td>
                  {periods.map((period) => {
                    const isFilled = !!schedule[day.id]?.[period.id];
                    return (
                      <td
                        key={`${day.id}-${period.id}`}
                        style={{
                          padding: "8px 6px",
                          border: "1px solid var(--border)",
                          backgroundColor: isFilled ? "rgba(59,130,182,0.06)" : "transparent",
                          transition: "var(--transition)",
                        }}
                      >
                        {isEditable ? (
                          <input
                            type="text"
                            value={schedule[day.id]?.[period.id] || ""}
                            onChange={(e) => handleCellChange(day.id, period.id, e.target.value)}
                            placeholder="..."
                            style={{
                              width: "100%",
                              minHeight: "42px",
                              padding: "8px 6px",
                              border: "2px solid transparent",
                              borderRadius: "var(--radius-sm, 10px)",
                              fontSize: "0.85rem",
                              textAlign: "center",
                              backgroundColor: isFilled ? "rgba(59,130,182,0.04)" : "rgba(255,255,255,0.6)",
                              transition: "var(--transition)",
                              outline: "none",
                              color: "var(--text)",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "var(--primary)";
                              e.target.style.backgroundColor = "white";
                              e.target.style.boxShadow = "0 0 0 4px rgba(20,42,66,0.08)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "transparent";
                              e.target.style.backgroundColor = isFilled ? "rgba(59,130,182,0.04)" : "rgba(255,255,255,0.6)";
                              e.target.style.boxShadow = "none";
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: "0.9rem",
                              color: isFilled ? "var(--info)" : "var(--border-strong)",
                              fontWeight: isFilled ? 600 : 400,
                            }}
                          >
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

        {/* Action Buttons */}
        {isEditable && (
          <div className="no-print" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.5rem",
            padding: "1rem 1.25rem",
            background: "var(--bg-soft)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}>
            <button
              onClick={handleReset}
              disabled={saving}
              className="btn-light-custom btn-sm-custom"
              style={{ opacity: saving ? 0.55 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            >
              <RotateCcw size={15} /> إعادة تعيين
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary-custom"
              style={{ opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer", minWidth: 130 }}
            >
              {saving ? <LoadingSpinner size="button" /> : <Save size={15} />}
              {saving ? "جاري الحفظ..." : "حفظ الجدول"}
            </button>
          </div>
        )}

        {/* Note */}
        <div className="no-print" style={{
          marginTop: "1rem",
          padding: "0.85rem 1.1rem",
          background: "rgba(158,115,70,0.05)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid rgba(158,115,70,0.15)",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.6rem",
        }}>
          <Clock size={15} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: "0.88rem", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--secondary)" }}>ملاحظة:</strong> عند الحفظ يتم إضافة الجدول تلقائياً لملف الإنجاز وإرساله للمنسق للمراجعة.
            المنسق يتحكم بفتح وإغلاق التعبئة.
          </p>
        </div>

      </div>
    </>
  );
}
