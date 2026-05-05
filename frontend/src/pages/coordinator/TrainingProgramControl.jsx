import { useEffect, useState, useCallback } from "react";
import { getFeatureFlags, updateFeatureFlag, getCoordinatorTrainingPrograms, updateTrainingProgramStatus, getSections, getSectionEnrollments, apiClient } from "../../services/api";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";
import { useToast } from "../../components/Toast";
import { Loader2, Lock, Unlock, AlertCircle, Settings, CheckCircle2, XCircle, Users, BookOpen, Search, ChevronDown, ChevronUp, GraduationCap, Building2, Clock, MessageSquare, Send, CheckCircle, XOctagon, ArrowRight, Calendar, User, RotateCcw } from "lucide-react";

const STATUS_MAP = {
  draft: { label: "مسودة", bg: "#e9ecef", text: "#495057", icon: Clock },
  submitted: { label: "مرسل", bg: "#cce5ff", text: "#004085", icon: Send },
  approved: { label: "موافق عليه", bg: "#d4edda", text: "#155724", icon: CheckCircle },
  rejected: { label: "مرفوض", bg: "#f8d7da", text: "#721c24", icon: XOctagon },
};

const days = [
  { id: "sunday", label: "الأحد" }, { id: "monday", label: "الاثنين" },
  { id: "tuesday", label: "الثلاثاء" }, { id: "wednesday", label: "الأربعاء" },
  { id: "thursday", label: "الخميس" },
];
const periods = [
  { id: "1", label: "الحصة ١" }, { id: "2", label: "الحصة ٢" },
  { id: "3", label: "الحصة ٣" }, { id: "4", label: "الحصة ٤" },
  { id: "5", label: "الحصة ٥" }, { id: "6", label: "الحصة ٦" },
  { id: "7", label: "الحصة ٧" },
];

export default function TrainingProgramControl() {
  const { addToast } = useToast();
  const [flag, setFlag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Section selector state
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Selected student detail
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgram, setStudentProgram] = useState(null);
  const [programLoading, setProgramLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteModal, setNoteModal] = useState(null);

  // Programs list (for summary counts)
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const flags = await getFeatureFlags();
      const tpFlag = flags.find((f) => f.name === "training_program.edit");
      setFlag(tpFlag || null);
    } catch {
      setError("تعذر تحميل حالة برنامج التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const loadSections = useCallback(async () => {
    try {
      const res = await getSections({ per_page: 200 });
      const data = res?.data || res;
      const items = Array.isArray(data) ? data : data?.data || [];
      setSections(items);
    } catch {
      addToast("تعذر تحميل الشعب", "error");
    }
  }, [addToast]);

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const res = await getCoordinatorTrainingPrograms({});
      setPrograms(res.data || []);
    } catch { /* silent */ } finally {
      setProgramsLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadSections(); loadPrograms(); }, [loadSections, loadPrograms]);

  // Load students when section is selected
  useEffect(() => {
    if (!selectedSectionId) {
      setStudents([]);
      setSelectedStudent(null);
      setStudentProgram(null);
      return;
    }
    const fetchStudents = async () => {
      setStudentsLoading(true);
      setSelectedStudent(null);
      setStudentProgram(null);
      setStudentSearch("");
      try {
        const res = await getSectionEnrollments(selectedSectionId);
        const data = res?.data || res;
        const enrollments = Array.isArray(data) ? data : data?.data || [];
        setStudents(enrollments.map(e => ({
          id: e.user?.id || e.student_id || e.id,
          name: e.user?.name || e.name || "—",
          university_id: e.user?.university_id || e.university_id || "—",
          email: e.user?.email || "",
          status: e.status || "accepted",
        })));
      } catch {
        setStudents([]);
        addToast("تعذر تحميل طلاب الشعبة", "error");
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [selectedSectionId, addToast]);

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setStudentProgram(null);
    setProgramLoading(true);
    try {
      const res = await apiClient.get(`/students/${student.id}/training-program`);
      setStudentProgram(res.data?.data || res.data);
    } catch {
      setStudentProgram(null);
    } finally {
      setProgramLoading(false);
    }
  };

  const toggle = async () => {
    if (!flag) return;
    setToggling(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateFeatureFlag(flag.id, !flag.is_open);
      setFlag(updated);
      const msg = !flag.is_open ? "تم فتح إدخال برنامج التدريب للطلاب" : "تم إغلاق إدخال برنامج التدريب للطلاب";
      setSuccess(msg);
      addToast(msg, "success");
    } catch {
      setError("تعذر تغيير حالة برنامج التدريب.");
      addToast("تعذر تغيير حالة برنامج التدريب", "error");
    } finally {
      setToggling(false);
    }
  };

  const handleStatusAction = async (programId, status, note = "") => {
    setActionLoading(true);
    try {
      await updateTrainingProgramStatus(programId, { status, coordinator_note: note });
      setNoteModal(null);
      addToast(status === "approved" ? "تمت الموافقة على الجدول بنجاح" : "تم رفض الجدول", status === "approved" ? "success" : "error");
      if (selectedStudent) {
        const res = await apiClient.get(`/students/${selectedStudent.id}/training-program`);
        setStudentProgram(res.data?.data || res.data);
      }
      loadPrograms();
    } catch {
      addToast("تعذر تحديث حالة البرنامج", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const submittedCount = programs.filter(p => p.status === "submitted").length;
  const approvedCount = programs.filter(p => p.status === "approved").length;
  const rejectedCount = programs.filter(p => p.status === "rejected").length;
  const scheduleData = studentProgram?.schedule || {};
  const filledCount = days.reduce((acc, day) => acc + periods.filter((p) => scheduleData[day.id]?.[p.id]).length, 0);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
        <Loader2 size={40} className="spin" style={{ color: "var(--primary)", marginBottom: 12 }} />
        <p style={{ color: "var(--text-faint)", fontSize: "0.95rem" }}>جاري تحميل حالة برنامج التدريب...</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>

      {/* Hero */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon"><Settings size={44} /></div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">التحكم بجدول الحصص الأسبوعية</h1>
            <p className="hero-subtitle">اختر الشعبة ثم الطالب لعرض جدول الحصص واتخاذ القرار</p>
          </div>
        </div>
      </div>

      {/* Top bar: toggle + stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "stretch" }}>
        {/* Feature Flag Toggle */}
        {flag ? (
          <div style={{
            flex: "1 1 320px", background: "#fff", borderRadius: 14,
            border: `2px solid ${flag.is_open ? "#b7e0c4" : "#f1b8bc"}`,
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: flag.is_open ? "linear-gradient(135deg,#d4edda,#b7dfc5)" : "linear-gradient(135deg,#f8d7da,#f1b8bc)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {flag.is_open ? <Unlock size={20} color="#155724" /> : <Lock size={20} color="#721c24" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>إدخال جدول الحصص</span>
                <span style={{
                  background: flag.is_open ? "#d4edda" : "#f8d7da",
                  color: flag.is_open ? "#155724" : "#721c24",
                  fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px", borderRadius: 99,
                }}>
                  {flag.is_open ? "مفتوح الآن" : "مغلق الآن"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "var(--text-faint)" }}>
                {flag.is_open ? "الطلاب يمكنهم التعديل على الجدول" : "الطلاب يشاهدون فقط"}
              </p>
            </div>
            <button onClick={toggle} disabled={toggling} style={{
              padding: "8px 16px", fontSize: "0.82rem", fontWeight: 700,
              background: flag.is_open ? "linear-gradient(135deg,#dc3545,#c9302c)" : "linear-gradient(135deg,#28a745,#218838)",
              color: "#fff", border: "none", borderRadius: 10,
              cursor: toggling ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              opacity: toggling ? 0.6 : 1, flexShrink: 0, whiteSpace: "nowrap",
            }}>
              {toggling ? <Loader2 className="spin" size={14} /> : flag.is_open ? <Lock size={14} /> : <Unlock size={14} />}
              {flag.is_open ? "إغلاق" : "فتح"}
            </button>
          </div>
        ) : (
          <div className="section-card" style={{ flex: "1 1 320px", textAlign: "center", padding: "24px 20px" }}>
            <AlertCircle size={32} style={{ color: "var(--danger)", marginBottom: 8 }} />
            <p style={{ color: "var(--danger)", fontWeight: 600, margin: 0, fontSize: "0.88rem" }}>لم يتم العثور على خاصية برنامج التدريب.</p>
          </div>
        )}

        {/* Summary Stats */}
        {[
          { label: "بانتظار المراجعة", count: submittedCount, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", iconBg: "#dbeafe" },
          { label: "موافق عليه", count: approvedCount, bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", iconBg: "#dcfce7" },
          { label: "مرفوض", count: rejectedCount, bg: "#fff1f2", border: "#fecdd3", color: "#dc2626", iconBg: "#fee2e2" },
        ].map(s => (
          <div key={s.label} style={{
            flex: "0 1 130px", background: s.bg, borderRadius: 14,
            border: `1.5px solid ${s.border}`, padding: "14px 16px",
            display: "flex", flexDirection: "column", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: "0.72rem", color: s.color, opacity: 0.85, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert-custom alert-danger mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={18} /> {error}</div>}
      {success && <div className="alert-custom alert-success mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={18} /> {success}</div>}
      <CoordinatorPsychologyReadOnlyNotice />

      {/* Main Content: Left Panel + Right Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Left Panel: Section Selector + Student List ── */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1.5px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden", position: "sticky", top: 16,
        }}>
          {/* Panel Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Users size={18} color="white" />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "white" }}>الشعب والطلاب</span>
          </div>

          <div style={{ padding: "14px" }}>
            {/* Section Selector */}
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px",
                border: "1.5px solid var(--border)", borderRadius: 10,
                fontSize: "0.85rem", background: "#f8fafc", cursor: "pointer",
                marginBottom: 12, fontWeight: 600, color: "var(--text)",
                outline: "none",
              }}
            >
              <option value="">— اختر الشعبة —</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.course?.name ? ` — ${s.course.name}` : ""} ({s.students_count || 0})
                </option>
              ))}
            </select>

            {/* Search Box */}
            {selectedSectionId && students.length > 0 && (
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} style={{
                  position: "absolute", top: "50%", right: 10,
                  transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none",
                }} />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم الجامعي..."
                  style={{
                    width: "100%", padding: "8px 32px 8px 10px",
                    border: "1.5px solid var(--border)", borderRadius: 9,
                    fontSize: "0.82rem", background: "#f8fafc",
                    outline: "none", color: "var(--text)",
                    boxSizing: "border-box",
                  }}
                />
                {studentSearch && (
                  <button onClick={() => setStudentSearch("")} style={{
                    position: "absolute", top: "50%", left: 8,
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", padding: 0, color: "var(--text-faint)",
                    display: "flex", alignItems: "center",
                  }}>
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Student List */}
            {studentsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <Loader2 size={24} className="spin" style={{ color: "var(--primary)" }} />
              </div>
            ) : !selectedSectionId ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
                <Users size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: "0.82rem" }}>اختر شعبة لعرض الطلاب</p>
              </div>
            ) : students.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
                <Users size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: "0.82rem" }}>لا يوجد طلاب في هذه الشعبة</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 480, overflowY: "auto" }}>
                {(() => {
                  const q = studentSearch.trim().toLowerCase();
                  const filtered = q
                    ? students.filter(s =>
                        s.name?.toLowerCase().includes(q) ||
                        s.university_id?.toString().toLowerCase().includes(q)
                      )
                    : students;
                  return (
                    <>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 600, marginBottom: 4, padding: "0 4px" }}>
                        {q ? `${filtered.length} نتيجة من ${students.length}` : `${students.length} طالب`}
                      </div>
                      {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-faint)" }}>
                          <Search size={24} style={{ opacity: 0.2, marginBottom: 6 }} />
                          <p style={{ margin: 0, fontSize: "0.8rem" }}>لا توجد نتائج</p>
                        </div>
                      ) : filtered.map(st => {
                  const isSelected = selectedStudent?.id === st.id;
                  const prog = programs.find(p => p.student?.id === st.id);
                  const progStatus = prog?.status;
                  const st_ = progStatus ? STATUS_MAP[progStatus] : null;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleSelectStudent(st)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 10px", borderRadius: 10,
                        border: isSelected ? "2px solid var(--primary)" : "1px solid transparent",
                        background: isSelected ? "rgba(20,42,66,0.06)" : "transparent",
                        cursor: "pointer", textAlign: "right", width: "100%",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f1f5f9"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        background: isSelected
                          ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                          : "linear-gradient(135deg, #94a3b8, #64748b)",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.82rem", fontWeight: 800,
                      }}>
                        {st.name?.charAt(0) || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>{st.university_id}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        {st_ && (
                          <span style={{ background: st_.bg, color: st_.text, fontSize: "0.62rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>
                            {st_.label}
                          </span>
                        )}
                        {isSelected && <ArrowRight size={13} style={{ color: "var(--primary)" }} />}
                      </div>
                    </button>
                  );
                })}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Student Detail + Schedule + Decision ── */}
        {!selectedStudent ? (
          <div style={{
            background: "#fff", borderRadius: 16, border: "1.5px dashed var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "80px 20px", color: "var(--text-faint)", textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}>
            <Calendar size={52} style={{ opacity: 0.15, marginBottom: 16 }} />
            <h3 style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "1.05rem", color: "var(--text-soft)" }}>
              اختر طالباً لعرض جدوله
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", maxWidth: 300 }}>
              اختر الشعبة من القائمة على اليسار ثم انقر على اسم الطالب لعرض جدول حصصه الأسبوعية
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Student Header Card */}
            <div style={{
              background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              borderRadius: 16, padding: "18px 22px",
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 6px 20px rgba(20,42,66,0.2)",
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                background: "rgba(255,255,255,0.18)",
                border: "2px solid rgba(255,255,255,0.3)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", fontWeight: 900,
              }}>
                {selectedStudent.name?.charAt(0) || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{selectedStudent.name}</h4>
                <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <GraduationCap size={13} /> {selectedStudent.university_id}
                  </span>
                  {selectedStudent.email && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <BookOpen size={13} /> {selectedStudent.email}
                    </span>
                  )}
                </div>
              </div>
              {studentProgram?.status && (() => {
                const st = STATUS_MAP[studentProgram.status] || STATUS_MAP.draft;
                const StatusIcon = st.icon;
                return (
                  <span style={{
                    background: "rgba(255,255,255,0.92)", color: st.text,
                    padding: "7px 16px", borderRadius: 99,
                    fontSize: "0.82rem", fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}>
                    <StatusIcon size={14} /> {st.label}
                  </span>
                );
              })()}
            </div>

            {/* Coordinator Note */}
            {studentProgram?.coordinator_note && (
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: studentProgram.status === "rejected" ? "#fff1f2" : "#f0f9ff",
                border: `1.5px solid ${studentProgram.status === "rejected" ? "#fecdd3" : "#bae6fd"}`,
                fontSize: "0.85rem", display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <MessageSquare size={16} style={{ flexShrink: 0, marginTop: 2, color: studentProgram.status === "rejected" ? "#e11d48" : "#0284c7" }} />
                <div>
                  <strong style={{ display: "block", marginBottom: 3, fontSize: "0.8rem" }}>
                    {studentProgram.status === "rejected" ? "سبب الرفض:" : "ملاحظة المنسق:"}
                  </strong>
                  {studentProgram.coordinator_note}
                </div>
              </div>
            )}

            {/* Schedule Card */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid var(--border)", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {/* Card Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Calendar size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>جدول الحصص الأسبوعي</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>5 أيام × 7 حصص</div>
                  </div>
                </div>
                {studentProgram && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{
                      background: filledCount > 0 ? "#dcfce7" : "#f1f5f9",
                      color: filledCount > 0 ? "#16a34a" : "#64748b",
                      padding: "4px 12px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <CheckCircle2 size={12} /> {filledCount} / {days.length * periods.length} معبأة
                    </span>
                  </div>
                )}
              </div>

              {/* Table Content */}
              {programLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <Loader2 size={32} className="spin" style={{ color: "var(--primary)" }} />
                </div>
              ) : !studentProgram ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-faint)" }}>
                  <Calendar size={44} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>لم يرفع الطالب جدول الحصص بعد</p>
                  <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>سيظهر الجدول هنا بعد أن يقوم الطالب بتعبئته وإرساله</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th style={{
                          padding: "12px 14px", minWidth: 90,
                          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                          color: "white", fontWeight: 800, fontSize: "0.82rem",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                          اليوم
                        </th>
                        {periods.map(p => (
                          <th key={p.id} style={{
                            padding: "10px 8px", minWidth: 80,
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                            color: "white", fontWeight: 600, fontSize: "0.78rem",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}>
                            <div style={{ opacity: 0.65, fontSize: "0.68rem", marginBottom: 2 }}>{p.id}</div>
                            الحصة {p.id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, di) => (
                        <tr key={day.id} style={{ background: di % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{
                            padding: "13px 14px", fontWeight: 800, fontSize: "0.88rem",
                            color: "var(--primary)", borderLeft: "4px solid var(--primary)",
                            borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0",
                            background: "linear-gradient(90deg, #f0f4ff, #f8fafc)",
                          }}>
                            {day.label}
                          </td>
                          {periods.map(p => {
                            const val = scheduleData[day.id]?.[p.id];
                            return (
                              <td key={`${day.id}-${p.id}`} style={{
                                padding: "10px 6px", border: "1px solid #e2e8f0",
                                background: val ? "rgba(59,130,246,0.05)" : "transparent",
                                transition: "background 0.15s",
                              }}>
                                {val ? (
                                  <span style={{ fontSize: "0.82rem", color: "#1d4ed8", fontWeight: 600 }}>{val}</span>
                                ) : (
                                  <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Decision Footer */}
              {studentProgram && (
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
                  {studentProgram.status === "submitted" && (
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setNoteModal({ id: studentProgram.id, status: "rejected", note: "" })}
                        disabled={actionLoading}
                        style={{
                          padding: "10px 22px", border: "none", borderRadius: 10,
                          background: "linear-gradient(135deg,#ef4444,#dc2626)",
                          color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: "0.88rem", fontWeight: 700, opacity: actionLoading ? 0.5 : 1,
                          boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
                        }}
                      >
                        {actionLoading ? <Loader2 className="spin" size={16} /> : <XCircle size={16} />}
                        رفض الجدول
                      </button>
                      <button
                        onClick={() => handleStatusAction(studentProgram.id, "approved")}
                        disabled={actionLoading}
                        style={{
                          padding: "10px 22px", border: "none", borderRadius: 10,
                          background: "linear-gradient(135deg,#22c55e,#16a34a)",
                          color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: "0.88rem", fontWeight: 700, opacity: actionLoading ? 0.5 : 1,
                          boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                        }}
                      >
                        {actionLoading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                        الموافقة على الجدول
                      </button>
                    </div>
                  )}
                  {studentProgram.status === "approved" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 700, fontSize: "0.88rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                      </div>
                      تمت الموافقة على هذا الجدول
                    </div>
                  )}
                  {studentProgram.status === "rejected" && (
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleStatusAction(studentProgram.id, "approved")}
                        disabled={actionLoading}
                        style={{
                          padding: "10px 22px", border: "none", borderRadius: 10,
                          background: "linear-gradient(135deg,#22c55e,#16a34a)",
                          color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: "0.88rem", fontWeight: 700, opacity: actionLoading ? 0.5 : 1,
                          boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                        }}
                      >
                        {actionLoading ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />}
                        إعادة الموافقة
                      </button>
                    </div>
                  )}
                  {studentProgram.status === "draft" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: "0.85rem" }}>
                      <Clock size={16} /> الجدول في مرحلة المسودة ولم يُرسل بعد
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rejection Note Modal */}
      {noteModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setNoteModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 24, width: 400, maxWidth: "90vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={20} style={{ color: "var(--danger)" }} />
              سبب الرفض
            </h4>
            <textarea
              value={noteModal.note}
              onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="أدخل سبب الرفض (اختياري)..."
              rows={3}
              style={{
                width: "100%", padding: 10, border: "1px solid var(--border)",
                borderRadius: 10, fontSize: "0.85rem", resize: "vertical", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setNoteModal(null)} style={{
                padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 10,
                background: "#fff", cursor: "pointer", fontSize: "0.85rem",
              }}>
                إلغاء
              </button>
              <button onClick={() => handleStatusAction(noteModal.id, "rejected", noteModal.note)} style={{
                padding: "8px 16px", border: "none", borderRadius: 10,
                background: "var(--danger)", color: "#fff", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 700,
              }}>
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
