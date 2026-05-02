import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFeatureFlags, updateFeatureFlag, getCoordinatorTrainingPrograms, updateTrainingProgramStatus } from "../../services/api";
import CoordinatorPsychologyReadOnlyNotice from "../../components/coordinator/CoordinatorPsychologyReadOnlyNotice";
import { Loader2, Lock, Unlock, AlertCircle, Settings, CheckCircle2, XCircle, Users, BookOpen, Search, Eye, ChevronDown, ChevronUp, GraduationCap, Building2, Clock, MessageSquare, Send, CheckCircle, XOctagon } from "lucide-react";

const STATUS_MAP = {
  draft: { label: "مسودة", bg: "#e9ecef", text: "#495057", icon: Clock },
  submitted: { label: "مرسل", bg: "#cce5ff", text: "#004085", icon: Send },
  approved: { label: "موافق عليه", bg: "#d4edda", text: "#155724", icon: CheckCircle },
  rejected: { label: "مرفوض", bg: "#f8d7da", text: "#721c24", icon: XOctagon },
};

const LIMIT = 5;

export default function TrainingProgramControl() {
  const navigate = useNavigate();
  const [flag, setFlag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Programs list state
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programsError, setProgramsError] = useState("");
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { id, status, note }

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

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    setProgramsError("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await getCoordinatorTrainingPrograms(params);
      setPrograms(res.data || []);
    } catch {
      setProgramsError("تعذر تحميل برامج التدريب.");
    } finally {
      setProgramsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const toggle = async () => {
    if (!flag) return;
    setToggling(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateFeatureFlag(flag.id, !flag.is_open);
      setFlag(updated);
      setSuccess(
        !flag.is_open
          ? "تم فتح إدخال برنامج التدريب للطلاب"
          : "تم إغلاق إدخال برنامج التدريب للطلاب"
      );
    } catch {
      setError("تعذر تغيير حالة برنامج التدريب.");
    } finally {
      setToggling(false);
    }
  };

  const handleStatusAction = async (id, status, note = "") => {
    setActionLoading(id);
    try {
      await updateTrainingProgramStatus(id, { status, coordinator_note: note });
      setNoteModal(null);
      loadPrograms();
    } catch {
      setProgramsError("تعذر تحديث حالة البرنامج.");
    } finally {
      setActionLoading(null);
    }
  };

  const submittedCount = programs.filter(p => p.status === "submitted").length;
  const approvedCount = programs.filter(p => p.status === "approved").length;
  const rejectedCount = programs.filter(p => p.status === "rejected").length;

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
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Settings size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">التحكم بجدول الحصص الأسبوعية</h1>
            <p className="hero-subtitle">
              فتح أو إغلاق إمكانية تعديل الطلاب لجدول الحصص ومراجعة البرامج المرسلة
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="alert-custom alert-success mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      <CoordinatorPsychologyReadOnlyNotice />

      {/* Feature Flag Toggle Card */}
      {flag ? (
        <div style={{
          background: "#fff",
          borderRadius: 14,
          border: `1.5px solid ${flag.is_open ? "#b7e0c4" : "#f1b8bc"}`,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}>
          {/* Status indicator */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: flag.is_open
              ? "linear-gradient(135deg, #d4edda 0%, #b7dfc5 100%)"
              : "linear-gradient(135deg, #f8d7da 0%, #f1b8bc 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: flag.is_open ? "0 2px 8px rgba(21,87,36,0.15)" : "0 2px 8px rgba(114,28,36,0.15)",
          }}>
            {flag.is_open ? <Unlock size={20} color="#155724" /> : <Lock size={20} color="#721c24" />}
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>
                حالة إدخال جدول الحصص
              </span>
              <span style={{
                background: flag.is_open ? "#d4edda" : "#f8d7da",
                color: flag.is_open ? "#155724" : "#721c24",
                fontSize: "0.72rem", fontWeight: 700,
                padding: "2px 10px", borderRadius: 99,
              }}>
                {flag.is_open ? "مفتوح" : "مغلق"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-faint)" }}>
              {flag.is_open ? "الطلاب يمكنهم إدخال وتعديل جدول الحصص الأسبوعية" : "الطلاب يمكنهم مشاهدة الجدول فقط"}
            </p>
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggle}
            disabled={toggling}
            style={{
              padding: "8px 18px",
              fontSize: "0.83rem", fontWeight: 700,
              background: flag.is_open
                ? "linear-gradient(135deg, #dc3545 0%, #c9302c 100%)"
                : "linear-gradient(135deg, #28a745 0%, #218838 100%)",
              color: "#fff", border: "none", borderRadius: 10,
              cursor: toggling ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              opacity: toggling ? 0.6 : 1,
              transition: "all 0.2s",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {toggling
              ? <Loader2 className="spin" size={15} />
              : flag.is_open ? <Lock size={15} /> : <Unlock size={15} />}
            {flag.is_open ? "إغلاق" : "فتح"}
          </button>
        </div>
      ) : (
        <div className="section-card mb-4" style={{ textAlign: "center", padding: "40px 20px" }}>
          <AlertCircle size={40} style={{ color: "var(--danger)", marginBottom: 12 }} />
          <p style={{ color: "var(--danger)", fontWeight: 600, margin: 0 }}>
            {"لم يتم العثور على خاصية برنامج التدريب. يرجى تشغيل الـ Seeder."}
          </p>
        </div>
      )}

      {/* Submitted Programs Section */}
      <div className="section-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="section-icon" style={{ color: "var(--info)" }}>
            <BookOpen size={16} />
          </div>
          <h5 style={{ margin: 0 }}>{"برامج التدريب المرسلة"}</h5>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--info)" }}>{submittedCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{"مرسل"}</div>
          </div>
          <div style={{ padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--success)" }}>{approvedCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{"موافق عليه"}</div>
          </div>
          <div style={{ padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--danger)" }}>{rejectedCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{"مرفوض"}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
            <input
              type="text"
              placeholder={"بحث باسم الطالب أو الرقم الجامعي..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px 10px 12px", paddingRight: 36,
                border: "1px solid var(--border)", borderRadius: 10,
                fontSize: "0.85rem", outline: "none",
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10,
              fontSize: "0.85rem", background: "#fff", cursor: "pointer",
            }}
          >
            <option value="">{"الكل"}</option>
            <option value="submitted">{"مرسل"}</option>
            <option value="approved">{"موافق عليه"}</option>
            <option value="rejected">{"مرفوض"}</option>
          </select>
        </div>

        {/* Programs List */}
        {programsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
            <Loader2 size={28} className="spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : programsError ? (
          <div className="alert-custom alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} /> {programsError}
          </div>
        ) : programs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-faint)" }}>
            <BookOpen size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{"لا توجد برامج تدريب."}</p>
          </div>
        ) : (
          <>
            {(showAll ? programs : programs.slice(0, LIMIT)).map((p) => {
              const st = STATUS_MAP[p.status] || STATUS_MAP.draft;
              const StatusIcon = st.icon;
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px", marginBottom: 8,
                  background: "#f8f9fa", borderRadius: 12,
                  border: "1px solid var(--border)",
                }}>
                  {/* Student Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.95rem", fontWeight: 800,
                  }}>
                    {p.student?.name?.charAt(0) || "?"}
                  </div>

                  {/* Student Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.student?.name}</span>
                      <span style={{
                        background: st.bg, color: st.text,
                        padding: "2px 8px", borderRadius: 99,
                        fontSize: "0.7rem", fontWeight: 700,
                        display: "inline-flex", alignItems: "center", gap: 3,
                      }}>
                        <StatusIcon size={10} /> {st.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: "0.78rem", color: "var(--text-soft)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <GraduationCap size={12} /> {p.student?.university_id}
                      </span>
                      {p.student?.department && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <BookOpen size={12} /> {p.student.department}
                        </span>
                      )}
                      {p.training_site && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Building2 size={12} /> {p.training_site}
                        </span>
                      )}
                      {p.updated_at && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={12} /> {p.updated_at}
                        </span>
                      )}
                    </div>
                    {p.coordinator_note && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <MessageSquare size={11} /> {p.coordinator_note}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/coordinator/students/${p.student?.id}/training-program`)}
                      style={{
                        padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8,
                        background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        fontSize: "0.78rem", color: "var(--info)", fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> {"عرض"}
                    </button>
                    {p.status === "submitted" && (
                      <>
                        <button
                          onClick={() => handleStatusAction(p.id, "approved")}
                          disabled={actionLoading === p.id}
                          style={{
                            padding: "6px 10px", border: "none", borderRadius: 8,
                            background: "var(--success)", color: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: "0.78rem", fontWeight: 600, opacity: actionLoading === p.id ? 0.5 : 1,
                          }}
                        >
                          {actionLoading === p.id ? <Loader2 className="spin" size={13} /> : <CheckCircle2 size={13} />}
                          {"موافقة"}
                        </button>
                        <button
                          onClick={() => setNoteModal({ id: p.id, status: "rejected", note: "" })}
                          disabled={actionLoading === p.id}
                          style={{
                            padding: "6px 10px", border: "none", borderRadius: 8,
                            background: "var(--danger)", color: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: "0.78rem", fontWeight: 600, opacity: actionLoading === p.id ? 0.5 : 1,
                          }}
                        >
                          <XCircle size={13} /> {"رفض"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {programs.length > LIMIT && (
              <button onClick={() => setShowAll(!showAll)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", padding: 8, marginTop: 6,
                background: "transparent", border: "1px dashed var(--border)", borderRadius: 10,
                color: "var(--info)", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
              }}>
                {showAll ? <>{'إخفاء'} <ChevronUp size={16} /></> : <>{'عرض الكل'} <ChevronDown size={16} /></>}
              </button>
            )}
          </>
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
              {"سبب الرفض"}
            </h4>
            <textarea
              value={noteModal.note}
              onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder={"أدخل سبب الرفض (اختياري)..."}
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
                {"إلغاء"}
              </button>
              <button onClick={() => handleStatusAction(noteModal.id, "rejected", noteModal.note)} style={{
                padding: "8px 16px", border: "none", borderRadius: 10,
                background: "var(--danger)", color: "#fff", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 700,
              }}>
                {"تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
