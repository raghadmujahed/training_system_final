import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Upload,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  MessageSquare,
  Calendar,
  BookOpen,
  FileCheck,
  TrendingUp,
  Award,
  Paperclip,
} from "lucide-react";
import {
  getStudentTasks,
  itemsFromPagedResponse,
  submitStudentTask,
  updateStudentTaskSubmission,
} from "../../services/api";
import { useStudentTrack } from "../../hooks/useStudentTrack";

const STATUS_CONFIG = {
  pending: { 
    label: "قيد الانتظار", 
    bg: "#fef3c7", 
    color: "#92400e",
    border: "#f59e0b",
    icon: Clock 
  },
  in_progress: { 
    label: "قيد التنفيذ", 
    bg: "#dbeafe", 
    color: "#1e40af",
    border: "#3b82f6",
    icon: RefreshCw 
  },
  submitted: { 
    label: "تم التسليم", 
    bg: "#e0e7ff", 
    color: "#3730a3",
    border: "#6366f1",
    icon: FileCheck 
  },
  graded: { 
    label: "تم التقييم", 
    bg: "#d1fae5", 
    color: "#065f46",
    border: "#10b981",
    icon: Award 
  },
  overdue: { 
    label: "متأخر", 
    bg: "#fee2e2", 
    color: "#991b1b",
    border: "#ef4444",
    icon: AlertCircle 
  },
};

const getAssignerRoleLabel = (role, mentorLabel) => {
  if (!role) return "مُكلِّف";
  const map = {
    teacher: mentorLabel,
    academic_supervisor: "المشرف الأكاديمي",
    field_supervisor: "المشرف الميداني",
    admin: "الإدارة",
  };
  return map[role] || role;
};

export default function Assignments() {
  const { config } = useStudentTrack();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [notes, setNotes] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [success, setSuccess] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudentTasks();
      setTasks(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل التكليفات.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (task) => {
    const id = task.id;
    setSavingId(id);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      if (files[id]) {
        fd.append("file", files[id]);
      }
      const n = (notes[id] || "").trim();
      if (n) fd.append("notes", n);
      await submitStudentTask(id, fd);
      setSuccess("تم تسليم التكليف بنجاح.");
      setFiles((prev) => ({ ...prev, [id]: null }));
      setNotes((prev) => ({ ...prev, [id]: "" }));
      setExpandedTaskId(null);
      await load();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل التسليم.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSavingId(null);
    }
  };

  const handleResubmit = async (task) => {
    const submission = task.submissions?.[0];
    if (!submission) return;
    setSavingId(task.id);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      if (files[task.id]) {
        fd.append("file", files[task.id]);
      }
      const n = (notes[task.id] || "").trim();
      if (n) fd.append("notes", n);
      fd.append("_method", "PUT");
      await updateStudentTaskSubmission(submission.id, fd);
      setSuccess("تم إعادة تسليم التكليف بنجاح.");
      setFiles((prev) => ({ ...prev, [task.id]: null }));
      setNotes((prev) => ({ ...prev, [task.id]: "" }));
      setExpandedTaskId(null);
      await load();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل إعادة التسليم.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSavingId(null);
    }
  };

  const canSubmit = (t) => !["submitted", "graded"].includes(t.status);
  const canResubmit = (t) => {
    const sub = t.submissions?.[0];
    return t.status === "submitted" && sub && sub.grade === null;
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "pending") return !["submitted", "graded"].includes(t.status);
    if (filter === "submitted") return t.status === "submitted";
    if (filter === "graded") return t.status === "graded";
    return true;
  });

  const toggleExpand = (id) => {
    setExpandedTaskId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const isOverdue = (task) => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && task.status !== "graded";
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
      {/* Professional Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)",
          borderRadius: 16,
          padding: "32px 28px",
          marginBottom: 28,
          color: "white",
          boxShadow: "0 10px 40px rgba(79, 70, 229, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            background: "rgba(255,255,255,0.08)",
            borderRadius: "50%",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                padding: 12,
                backdropFilter: "blur(10px)",
              }}
            >
              <BookOpen size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>التكليفات الدراسية</h1>
              <p style={{ margin: "4px 0 0", opacity: 0.9, fontSize: "1rem" }}>
                متابعة المهام ورفع الحلول
              </p>
            </div>
          </div>
          <div className="d-flex gap-4 mt-4 flex-wrap" style={{ fontSize: "0.9rem" }}>
            <span className="d-flex align-items-center gap-2">
              <ClipboardList size={16} />
              {tasks.length} تكليف إجمالي
            </span>
            <span className="d-flex align-items-center gap-2">
              <Clock size={16} />
              {tasks.filter((t) => !["submitted","graded"].includes(t.status)).length} قيد الانتظار
            </span>
            <span className="d-flex align-items-center gap-2">
              <CheckCircle2 size={16} />
              {tasks.filter((t) => t.status === "submitted").length} مُسلَّم
            </span>
            <span className="d-flex align-items-center gap-2">
              <Award size={16} />
              {tasks.filter((t) => t.status === "graded").length} مُقيَّم
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div
          className="mb-4 d-flex align-items-center gap-2"
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: 12,
            padding: "16px 20px",
            color: "#065f46",
          }}
        >
          <div
            style={{
              background: "#10b981",
              borderRadius: "50%",
              padding: 4,
              color: "white",
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <span style={{ fontWeight: 500 }}>{success}</span>
        </div>
      )}
      {error && (
        <div
          className="mb-4 d-flex align-items-center gap-2"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "16px 20px",
            color: "#991b1b",
          }}
        >
          <div
            style={{
              background: "#ef4444",
              borderRadius: "50%",
              padding: 4,
              color: "white",
            }}
          >
            <AlertCircle size={16} />
          </div>
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "الكل", count: tasks.length },
            { key: "pending", label: "قيد الانتظار", count: tasks.filter(t => !["submitted","graded"].includes(t.status)).length },
            { key: "submitted", label: "تم التسليم", count: tasks.filter(t => t.status === "submitted").length },
            { key: "graded", label: "تم التقييم", count: tasks.filter(t => t.status === "graded").length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "8px 18px",
                borderRadius: 99,
                border: filter === tab.key ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                background: filter === tab.key ? "#4f46e5" : "white",
                color: filter === tab.key ? "white" : "#6b7280",
                fontWeight: filter === tab.key ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                background: filter === tab.key ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                color: filter === tab.key ? "white" : "#374151",
                borderRadius: 99, padding: "1px 7px", fontSize: "0.78rem", fontWeight: 700,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <RefreshCw size={48} className="animate-spin" style={{ color: "#4f46e5", marginBottom: 16 }} />
          <p style={{ color: "#6b7280", margin: 0 }}>جاري تحميل التكليفات...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              background: "#f3f4f6",
              borderRadius: "50%",
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <ClipboardList size={40} style={{ color: "#9ca3af" }} />
          </div>
          <h5 style={{ color: "#374151", marginBottom: 8 }}>لا توجد تكليفات</h5>
          <p style={{ color: "#9ca3af", margin: 0 }}>لم يتم إرسال تكليفات مرتبطة بتدريبك حاليًا.</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ background: "white", borderRadius: 16, padding: 48, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <ClipboardList size={44} style={{ color: "#d1d5db", marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.95rem" }}>لا توجد تكليفات في هذه الفئة.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredTasks.map((task) => {
            const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConf.icon;
            const assigner = task.assigned_by;
            const submission = task.submissions?.[0] || null;
            const isExpanded = expandedTaskId === task.id;
            const overdue = isOverdue(task);

            return (
              <div
                key={task.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: "24px 28px",
                    borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                    background: overdue
                      ? "linear-gradient(to right, #fef2f2, white)"
                      : submission?.grade !== null
                      ? "linear-gradient(to right, #f0fdf4, white)"
                      : submission
                      ? "linear-gradient(to right, #eff6ff, white)"
                      : "white",
                    borderRight: overdue
                      ? "4px solid #ef4444"
                      : submission?.grade !== null
                      ? "4px solid #10b981"
                      : submission
                      ? "4px solid #3b82f6"
                      : "4px solid #f59e0b",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title & Status */}
                      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <h5
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "#111827",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {task.title}
                        </h5>
                        <span
                          style={{
                            background: statusConf.bg,
                            color: statusConf.color,
                            border: `1px solid ${statusConf.border}`,
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <StatusIcon size={12} />
                          {statusConf.label}
                        </span>
                        {overdue && (
                          <span
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              borderRadius: 20,
                              padding: "4px 12px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <AlertCircle size={12} />
                            متأخر
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p
                          style={{
                            color: "#4b5563",
                            fontSize: "0.95rem",
                            lineHeight: 1.7,
                            marginBottom: 16,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {task.description.length > 200 && !isExpanded
                            ? task.description.slice(0, 200) + "..."
                            : task.description}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="d-flex flex-wrap gap-4" style={{ fontSize: "0.875rem" }}>
                        {assigner && (
                          <div className="d-flex align-items-center gap-2" style={{ color: "#6b7280" }}>
                            <div
                              style={{
                                background: "#e0e7ff",
                                borderRadius: 8,
                                padding: 6,
                                color: "#4f46e5",
                              }}
                            >
                              <User size={14} />
                            </div>
                            <span>
                              <strong style={{ color: "#374151" }}>
                                {getAssignerRoleLabel(assigner.role?.name, config.mentorLabel)}:
                              </strong>{" "}
                              {assigner.name}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="d-flex align-items-center gap-2" style={{ color: "#6b7280" }}>
                            <div
                              style={{
                                background: overdue ? "#fee2e2" : "#dbeafe",
                                borderRadius: 8,
                                padding: 6,
                                color: overdue ? "#dc2626" : "#2563eb",
                              }}
                            >
                              <Calendar size={14} />
                            </div>
                            <span>
                              <strong style={{ color: "#374151" }}>موعد التسليم:</strong>{" "}
                              <span style={{ color: overdue ? "#dc2626" : "inherit" }}>
                                {formatDate(task.due_date)}
                              </span>
                            </span>
                          </div>
                        )}
                        {task.created_at && (
                          <div className="d-flex align-items-center gap-2" style={{ color: "#6b7280" }}>
                            <div
                              style={{
                                background: "#f3f4f6",
                                borderRadius: 8,
                                padding: 6,
                                color: "#6b7280",
                              }}
                            >
                              <Clock size={14} />
                            </div>
                            <span>
                              <strong style={{ color: "#374151" }}>تاريخ النشر:</strong>{" "}
                              {formatDate(task.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => toggleExpand(task.id)}
                      style={{
                        background: isExpanded ? "#f3f4f6" : "white",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#374151",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f3f4f6";
                        e.currentTarget.style.borderColor = "#9ca3af";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isExpanded ? "#f3f4f6" : "white";
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {isExpanded ? "إخفاء" : "عرض التفاصيل"}
                    </button>
                  </div>
                </div>

                {/* Submission Info */}
                {submission && (
                  <div
                    style={{
                      padding: "20px 28px",
                      background:
                        task.status === "graded"
                          ? "#f0fdf4"
                          : "#f8fafc",
                      borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div
                        style={{
                          background: task.status === "graded" ? "#22c55e" : "#3b82f6",
                          borderRadius: "50%",
                          padding: 6,
                          color: "white",
                        }}
                      >
                        {task.status === "graded" ? <Award size={16} /> : <FileCheck size={16} />}
                      </div>
                      <h6 style={{ margin: 0, fontWeight: 600, color: "#374151" }}>
                        {task.status === "graded" ? "التسليم والتقييم" : "تفاصيل التسليم"}
                      </h6>
                      {submission.submitted_at && (
                        <span style={{ color: "#9ca3af", fontSize: "0.8rem", marginRight: "auto" }}>
                          تم التسليم بتاريخ {formatDate(submission.submitted_at)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {submission.file_url && (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            background: "white",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            padding: "10px 16px",
                            color: "#374151",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            width: "fit-content",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                            e.currentTarget.style.borderColor = "#9ca3af";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#d1d5db";
                          }}
                        >
                          <Paperclip size={16} style={{ color: "#6b7280" }} />
                          تحميل الملف المُسلَّم
                        </a>
                      )}

                      {submission.notes && (
                        <div
                          style={{
                            background: "white",
                            borderRadius: 8,
                            padding: "12px 16px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <span style={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 600 }}>
                            ملاحظاتك:
                          </span>
                          <p style={{ margin: "8px 0 0", color: "#374151", fontSize: "0.9rem", lineHeight: 1.6 }}>
                            {submission.notes}
                          </p>
                        </div>
                      )}

                      {task.status === "graded" && (
                        <div
                          style={{
                            background: "white",
                            borderRadius: 12,
                            padding: "20px",
                            border: "2px solid #22c55e",
                          }}
                        >
                          <div className="d-flex align-items-center gap-3 mb-3">
                            <div
                              style={{
                                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                                borderRadius: 12,
                                padding: "10px 16px",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                              }}
                            >
                              <TrendingUp size={20} style={{ marginLeft: 6 }} />
                              {submission.grade !== null ? `${submission.grade}/100` : "—"}
                            </div>
                            <span style={{ color: "#22c55e", fontWeight: 600 }}>تم التقييم بنجاح</span>
                          </div>
                          {submission.feedback && (
                            <div>
                              <span
                                style={{ color: "#6b7280", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 8 }}
                              >
                                ملاحظات المُقيِّم:
                              </span>
                              <p
                                style={{
                                  margin: 0,
                                  color: "#374151",
                                  fontSize: "0.95rem",
                                  lineHeight: 1.8,
                                  whiteSpace: "pre-line",
                                  background: "#f9fafb",
                                  padding: "12px 16px",
                                  borderRadius: 8,
                                }}
                              >
                                {submission.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Form */}
                {isExpanded && (
                  <div style={{ padding: "24px 28px", background: "#fafafa" }}>
                    {canSubmit(task) && (
                      <div>
                        <h6
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 20,
                            color: "#111827",
                            fontWeight: 600,
                          }}
                        >
                          <div
                            style={{
                              background: "#4f46e5",
                              borderRadius: 8,
                              padding: 6,
                              color: "white",
                            }}
                          >
                            <Upload size={16} />
                          </div>
                          تسليم التكليف
                        </h6>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#374151",
                              }}
                            >
                              <FileText size={14} style={{ color: "#6b7280" }} />
                              رفع ملف
                            </label>
                            <input
                              type="file"
                              onChange={(e) =>
                                setFiles((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.files?.[0] || null,
                                }))
                              }
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "2px dashed #d1d5db",
                                borderRadius: 10,
                                background: "white",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            />
                            {files[task.id] && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: "8px 12px",
                                  background: "#ecfdf5",
                                  borderRadius: 6,
                                  color: "#065f46",
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Paperclip size={14} />
                                {files[task.id].name}
                              </div>
                            )}
                          </div>
                          <div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#374151",
                              }}
                            >
                              <MessageSquare size={14} style={{ color: "#6b7280" }} />
                              ملاحظات (اختياري)
                            </label>
                            <textarea
                              value={notes[task.id] || ""}
                              onChange={(e) =>
                                setNotes((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.value,
                                }))
                              }
                              placeholder="أضف ملاحظاتك أو شرحاً للحل..."
                              style={{
                                width: "100%",
                                padding: "14px 16px",
                                border: "1px solid #d1d5db",
                                borderRadius: 10,
                                background: "white",
                                fontSize: "0.9rem",
                                minHeight: 100,
                                resize: "vertical",
                                lineHeight: 1.6,
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleSubmit(task)}
                            disabled={savingId === task.id}
                            style={{
                              background: savingId === task.id ? "#9ca3af" : "#4f46e5",
                              color: "white",
                              border: "none",
                              borderRadius: 10,
                              padding: "14px 28px",
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              cursor: savingId === task.id ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              width: "fit-content",
                              transition: "all 0.2s",
                              boxShadow: savingId === task.id ? "none" : "0 4px 14px rgba(79, 70, 229, 0.4)",
                            }}
                            onMouseEnter={(e) => {
                              if (savingId !== task.id) {
                                e.currentTarget.style.background = "#4338ca";
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = savingId === task.id ? "#9ca3af" : "#4f46e5";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {savingId === task.id ? (
                              <>
                                <RefreshCw size={18} className="animate-spin" />
                                جاري الإرسال...
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                تسليم التكليف
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {canResubmit(task) && (
                      <div>
                        <div
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: 10,
                            padding: "14px 18px",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#1e40af",
                            fontSize: "0.9rem",
                          }}
                        >
                          <RefreshCw size={18} />
                          <span>يمكنك إعادة تسليم هذا التكليف قبل تقييمه</span>
                        </div>
                        <h6
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 20,
                            color: "#111827",
                            fontWeight: 600,
                          }}
                        >
                          <div
                            style={{
                              background: "#f59e0b",
                              borderRadius: 8,
                              padding: 6,
                              color: "white",
                            }}
                          >
                            <RefreshCw size={16} />
                          </div>
                          إعادة تسليم التكليف
                        </h6>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#374151",
                              }}
                            >
                              <FileText size={14} style={{ color: "#6b7280" }} />
                              رفع ملف جديد
                            </label>
                            <input
                              type="file"
                              onChange={(e) =>
                                setFiles((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.files?.[0] || null,
                                }))
                              }
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "2px dashed #d1d5db",
                                borderRadius: 10,
                                background: "white",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            />
                            {files[task.id] && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: "8px 12px",
                                  background: "#fef3c7",
                                  borderRadius: 6,
                                  color: "#92400e",
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Paperclip size={14} />
                                {files[task.id].name}
                              </div>
                            )}
                          </div>
                          <div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#374151",
                              }}
                            >
                              <MessageSquare size={14} style={{ color: "#6b7280" }} />
                              ملاحظات مُحدَّثة
                            </label>
                            <textarea
                              value={notes[task.id] || submission?.notes || ""}
                              onChange={(e) =>
                                setNotes((prev) => ({
                                  ...prev,
                                  [task.id]: e.target.value,
                                }))
                              }
                              placeholder="أضف ملاحظاتك أو شرحاً للحل..."
                              style={{
                                width: "100%",
                                padding: "14px 16px",
                                border: "1px solid #d1d5db",
                                borderRadius: 10,
                                background: "white",
                                fontSize: "0.9rem",
                                minHeight: 100,
                                resize: "vertical",
                                lineHeight: 1.6,
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleResubmit(task)}
                            disabled={savingId === task.id}
                            style={{
                              background: savingId === task.id ? "#9ca3af" : "#f59e0b",
                              color: "white",
                              border: "none",
                              borderRadius: 10,
                              padding: "14px 28px",
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              cursor: savingId === task.id ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              width: "fit-content",
                              transition: "all 0.2s",
                              boxShadow: savingId === task.id ? "none" : "0 4px 14px rgba(245, 158, 11, 0.4)",
                            }}
                            onMouseEnter={(e) => {
                              if (savingId !== task.id) {
                                e.currentTarget.style.background = "#d97706";
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = savingId === task.id ? "#9ca3af" : "#f59e0b";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {savingId === task.id ? (
                              <>
                                <RefreshCw size={18} className="animate-spin" />
                                جاري الإرسال...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={18} />
                                إعادة تسليم
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {task.status === "graded" && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          borderRadius: 10,
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          color: "#166534",
                        }}
                      >
                        <div
                          style={{
                            background: "#22c55e",
                            borderRadius: "50%",
                            padding: 6,
                            color: "white",
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          تم تقييم هذا التكليف ولا يمكن إعادة تسليمه.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
