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
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getStudentTasks,
  itemsFromPagedResponse,
  submitStudentTask,
  updateStudentTaskSubmission,
} from "../../services/api";
import { useStudentTrack } from "../../hooks/useStudentTrack";
import { useToast } from "../../components/Toast";

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
  const { addToast } = useToast();
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
      addToast("تم تسليم التكليف بنجاح", "success");
      setFiles((prev) => ({ ...prev, [id]: null }));
      setNotes((prev) => ({ ...prev, [id]: "" }));
      setExpandedTaskId(null);
      await load();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل التسليم.");
      addToast(e?.response?.data?.message || "فشل التسليم.", "error");
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
      addToast("تم إعادة تسليم التكليف بنجاح", "success");
      setFiles((prev) => ({ ...prev, [task.id]: null }));
      setNotes((prev) => ({ ...prev, [task.id]: "" }));
      setExpandedTaskId(null);
      await load();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e?.response?.data?.message || "فشل إعادة التسليم.");
      addToast(e?.response?.data?.message || "فشل إعادة التسليم.", "error");
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
    <div className="max-w-[1200px] mx-auto px-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] via-[#2d5f8a] to-[#3b82f6] rounded-[20px] py-7 px-10 mb-6 text-white shadow-[0_8px_32px_rgba(30,58,95,0.3)] flex items-center gap-4">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-white/20 flex items-center justify-center shrink-0">
          <BookOpen size={26} />
        </div>
        <div className="flex-1">
          <h1 className="m-0 text-[1.4rem] font-extrabold">التكليفات الدراسية</h1>
          <p className="m-0 mt-1 opacity-90 text-[0.92rem]">متابعة المهام ورفع الحلول</p>
          <div className="flex gap-5 mt-[0.6rem] flex-wrap text-[0.85rem] opacity-90">
            <span className="flex items-center gap-[5px]"><ClipboardList size={14} /> {tasks.length} تكليف إجمالي</span>
            <span className="flex items-center gap-[5px]"><Clock size={14} /> {tasks.filter((t) => !["submitted","graded"].includes(t.status)).length} قيد الانتظار</span>
            <span className="flex items-center gap-[5px]"><CheckCircle2 size={14} /> {tasks.filter((t) => t.status === "submitted").length} مُسلَّم</span>
            <span className="flex items-center gap-[5px]"><Award size={14} /> {tasks.filter((t) => t.status === "graded").length} مُقيَّم</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-[#ecfdf5] border border-[#6ee7b7] rounded-xl py-4 px-5 text-[#065f46]">
          <div className="bg-[#10b981] rounded-full p-1 text-white">
            <CheckCircle2 size={16} />
          </div>
          <span className="font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] rounded-xl py-4 px-5 text-[#991b1b]">
          <div className="bg-[#ef4444] rounded-full p-1 text-white">
            <AlertCircle size={16} />
          </div>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && tasks.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: "all", label: "الكل", count: tasks.length },
            { key: "pending", label: "قيد الانتظار", count: tasks.filter(t => !["submitted","graded"].includes(t.status)).length },
            { key: "submitted", label: "تم التسليم", count: tasks.filter(t => t.status === "submitted").length },
            { key: "graded", label: "تم التقييم", count: tasks.filter(t => t.status === "graded").length },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`py-2 px-[18px] rounded-full text-[0.85rem] cursor-pointer transition-all flex items-center gap-[6px] ${filter === tab.key ? 'border-2 border-[#4f46e5] bg-[#4f46e5] text-white font-bold' : 'border border-[#e5e7eb] bg-white text-[#6b7280] font-medium hover:bg-[#f9fafb]'}`}
            >
              {tab.label}
              <span className={`rounded-full py-[1px] px-[7px] text-[0.78rem] font-bold ${filter === tab.key ? 'bg-white/25 text-white' : 'bg-[#f3f4f6] text-[#374151]'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="section" text="جاري تحميل التكليفات..." />
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-[60px] text-center shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="bg-[#f3f4f6] rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
            <ClipboardList size={40} className="text-[#9ca3af]" />
          </div>
          <h5 className="text-[#374151] mb-2">لا توجد تكليفات</h5>
          <p className="text-[#9ca3af] m-0">لم يتم إرسال تكليفات مرتبطة بتدريبك حاليًا.</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <ClipboardList size={44} className="text-[#d1d5db] mb-3" />
          <p className="text-[#9ca3af] m-0 text-[0.95rem]">لا توجد تكليفات في هذه الفئة.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredTasks.map((task) => {
            const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConf.icon;
            const assigner = task.assigned_by;
            const submission = task.submissions?.[0] || null;
            const isExpanded = expandedTaskId === task.id;
            const overdue = isOverdue(task);

            return (
              <div key={task.id}
                className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#e5e7eb] overflow-hidden transition-all duration-300"
              >
                {/* Card Header */}
                <div
                  className={`py-6 px-7 ${isExpanded ? 'border-b border-[#e5e7eb]' : 'border-b-0'}`}
                  style={{
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
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title & Status */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h5 className="m-0 text-[1.25rem] font-bold text-[#111827] leading-[1.4]">
                          {task.title}
                        </h5>
                        <span
                          className="rounded-[20px] py-1 px-3 text-[0.8rem] font-semibold inline-flex items-center gap-1"
                          style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}` }}
                        >
                          <StatusIcon size={12} />
                          {statusConf.label}
                        </span>
                        {overdue && (
                          <span className="bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] rounded-[20px] py-1 px-3 text-[0.8rem] font-semibold inline-flex items-center gap-1">
                            <AlertCircle size={12} />
                            متأخر
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-[#4b5563] text-[0.95rem] leading-[1.7] mb-4 whitespace-pre-line m-0">
                          {task.description.length > 200 && !isExpanded
                            ? task.description.slice(0, 200) + "..."
                            : task.description}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-4 text-[0.875rem]">
                        {assigner && (
                          <div className="flex items-center gap-2 text-[#6b7280]">
                            <div className="bg-[#e0e7ff] rounded-lg p-[6px] text-[#4f46e5]">
                              <User size={14} />
                            </div>
                            <span>
                              <strong className="text-[#374151]">
                                {getAssignerRoleLabel(assigner.role?.name, config.mentorLabel)}:
                              </strong>{" "}
                              {assigner.name}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-2 text-[#6b7280]">
                            <div className="rounded-lg p-[6px]" style={{ background: overdue ? "#fee2e2" : "#dbeafe", color: overdue ? "#dc2626" : "#2563eb" }}>
                              <Calendar size={14} />
                            </div>
                            <span>
                              <strong className="text-[#374151]">موعد التسليم:</strong>{" "}
                              <span style={{ color: overdue ? "#dc2626" : "inherit" }}>
                                {formatDate(task.due_date)}
                              </span>
                            </span>
                          </div>
                        )}
                        {task.created_at && (
                          <div className="flex items-center gap-2 text-[#6b7280]">
                            <div className="bg-[#f3f4f6] rounded-lg p-[6px] text-[#6b7280]">
                              <Clock size={14} />
                            </div>
                            <span>
                              <strong className="text-[#374151]">تاريخ النشر:</strong>{" "}
                              {formatDate(task.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button onClick={() => toggleExpand(task.id)}
                      className={`rounded-[10px] py-2 px-4 text-[0.875rem] font-medium text-[#374151] cursor-pointer flex items-center gap-[6px] transition-all shrink-0 border ${isExpanded ? 'bg-[#f3f4f6] border-[#d1d5db]' : 'bg-white border-[#d1d5db] hover:bg-[#f3f4f6] hover:border-[#9ca3af]'}`}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {isExpanded ? "إخفاء" : "عرض التفاصيل"}
                    </button>
                  </div>
                </div>

                {/* Submission Info */}
                {submission && (
                  <div
                    className={`py-5 px-7 ${isExpanded ? 'border-b border-[#e5e7eb]' : ''}`}
                    style={{ background: task.status === "graded" ? "#f0fdf4" : "#f8fafc" }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="rounded-full p-[6px] text-white" style={{ background: task.status === "graded" ? "#22c55e" : "#3b82f6" }}>
                        {task.status === "graded" ? <Award size={16} /> : <FileCheck size={16} />}
                      </div>
                      <h6 className="m-0 font-semibold text-[#374151]">
                        {task.status === "graded" ? "التسليم والتقييم" : "تفاصيل التسليم"}
                      </h6>
                      {submission.submitted_at && (
                        <span className="text-[#9ca3af] text-[0.8rem] mr-auto">
                          تم التسليم بتاريخ {formatDate(submission.submitted_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {submission.file_url && (
                        <a href={submission.file_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white border border-[#d1d5db] rounded-lg py-[10px] px-4 text-[#374151] no-underline text-[0.9rem] font-medium w-fit transition-all hover:bg-[#f9fafb] hover:border-[#9ca3af]"
                        >
                          <Paperclip size={16} className="text-[#6b7280]" />
                          تحميل الملف المُسلَّم
                        </a>
                      )}

                      {submission.notes && (
                        <div className="bg-white rounded-lg py-3 px-4 border border-[#e5e7eb]">
                          <span className="text-[#6b7280] text-[0.8rem] font-semibold">
                            ملاحظاتك:
                          </span>
                          <p className="m-0 mt-2 text-[#374151] text-[0.9rem] leading-[1.6]">
                            {submission.notes}
                          </p>
                        </div>
                      )}

                      {task.status === "graded" && (
                        <div className="bg-white rounded-xl py-5 px-5 border-2 border-[#22c55e]">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-xl py-[10px] px-4 text-white font-bold text-[1.1rem]">
                              <TrendingUp size={20} className="ml-[6px] inline" />
                              {submission.grade !== null ? `${submission.grade}/100` : "—"}
                            </div>
                            <span className="text-[#22c55e] font-semibold">تم التقييم بنجاح</span>
                          </div>
                          {submission.feedback && (
                            <div>
                              <span className="text-[#6b7280] text-[0.8rem] font-semibold block mb-2">
                                ملاحظات المُقيِّم:
                              </span>
                              <p className="m-0 text-[#374151] text-[0.95rem] leading-[1.8] whitespace-pre-line bg-[#f9fafb] py-3 px-4 rounded-lg">
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
                  <div className="py-6 px-7 bg-[#fafafa]">
                    {canSubmit(task) && (
                      <div>
                        <h6 className="flex items-center gap-2 mb-5 text-[#111827] font-semibold m-0">
                          <div className="bg-[#4f46e5] rounded-lg p-[6px] text-white">
                            <Upload size={16} />
                          </div>
                          تسليم التكليف
                        </h6>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="flex items-center gap-[6px] mb-2 text-[0.875rem] font-medium text-[#374151]">
                              <FileText size={14} className="text-[#6b7280]" />
                              رفع ملف
                            </label>
                            <input type="file"
                              onChange={(e) => setFiles((prev) => ({ ...prev, [task.id]: e.target.files?.[0] || null }))}
                              className="w-full py-3 px-4 border-2 border-dashed border-[#d1d5db] rounded-[10px] bg-white cursor-pointer text-[0.9rem]"
                            />
                            {files[task.id] && (
                              <div className="mt-2 py-2 px-3 bg-[#ecfdf5] rounded-md text-[#065f46] text-[0.85rem] flex items-center gap-[6px]">
                                <Paperclip size={14} />
                                {files[task.id].name}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="flex items-center gap-[6px] mb-2 text-[0.875rem] font-medium text-[#374151]">
                              <MessageSquare size={14} className="text-[#6b7280]" />
                              ملاحظات (اختياري)
                            </label>
                            <textarea value={notes[task.id] || ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              placeholder="أضف ملاحظاتك أو شرحاً للحل..."
                              className="w-full py-[14px] px-4 border border-[#d1d5db] rounded-[10px] bg-white text-[0.9rem] min-h-[100px] resize-y leading-[1.6]"
                            />
                          </div>
                          <button onClick={() => handleSubmit(task)} disabled={savingId === task.id}
                            className="text-white border-none rounded-[10px] py-[14px] px-7 text-[0.95rem] font-semibold inline-flex items-center justify-center gap-2 w-fit transition-all" style={{ background: savingId === task.id ? "#9ca3af" : "#4f46e5", cursor: savingId === task.id ? "not-allowed" : "pointer", boxShadow: savingId === task.id ? "none" : "0 4px 14px rgba(79, 70, 229, 0.4)" }}
                            onMouseEnter={(e) => { if (savingId !== task.id) { e.currentTarget.style.background = "#4338ca"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = savingId === task.id ? "#9ca3af" : "#4f46e5"; e.currentTarget.style.transform = "translateY(0)"; }}
                          >
                            {savingId === task.id ? (
                              <><LoadingSpinner size="button" /> جاري الإرسال...</>
                            ) : (
                              <><Send size={18} /> تسليم التكليف</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {canResubmit(task) && (
                      <div>
                        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] py-[14px] px-[18px] mb-5 flex items-center gap-[10px] text-[#1e40af] text-[0.9rem]">
                          <RefreshCw size={18} />
                          <span>يمكنك إعادة تسليم هذا التكليف قبل تقييمه</span>
                        </div>
                        <h6 className="flex items-center gap-2 mb-5 text-[#111827] font-semibold m-0">
                          <div className="bg-[#f59e0b] rounded-lg p-[6px] text-white">
                            <RefreshCw size={16} />
                          </div>
                          إعادة تسليم التكليف
                        </h6>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="flex items-center gap-[6px] mb-2 text-[0.875rem] font-medium text-[#374151]">
                              <FileText size={14} className="text-[#6b7280]" />
                              رفع ملف جديد
                            </label>
                            <input type="file"
                              onChange={(e) => setFiles((prev) => ({ ...prev, [task.id]: e.target.files?.[0] || null }))}
                              className="w-full py-3 px-4 border-2 border-dashed border-[#d1d5db] rounded-[10px] bg-white cursor-pointer text-[0.9rem]"
                            />
                            {files[task.id] && (
                              <div className="mt-2 py-2 px-3 bg-[#fef3c7] rounded-md text-[#92400e] text-[0.85rem] flex items-center gap-[6px]">
                                <Paperclip size={14} />
                                {files[task.id].name}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="flex items-center gap-[6px] mb-2 text-[0.875rem] font-medium text-[#374151]">
                              <MessageSquare size={14} className="text-[#6b7280]" />
                              ملاحظات مُحدَّثة
                            </label>
                            <textarea value={notes[task.id] || submission?.notes || ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              placeholder="أضف ملاحظاتك أو شرحاً للحل..."
                              className="w-full py-[14px] px-4 border border-[#d1d5db] rounded-[10px] bg-white text-[0.9rem] min-h-[100px] resize-y leading-[1.6]"
                            />
                          </div>
                          <button onClick={() => handleResubmit(task)} disabled={savingId === task.id}
                            className="text-white border-none rounded-[10px] py-[14px] px-7 text-[0.95rem] font-semibold inline-flex items-center justify-center gap-2 w-fit transition-all" style={{ background: savingId === task.id ? "#9ca3af" : "#f59e0b", cursor: savingId === task.id ? "not-allowed" : "pointer", boxShadow: savingId === task.id ? "none" : "0 4px 14px rgba(245, 158, 11, 0.4)" }}
                            onMouseEnter={(e) => { if (savingId !== task.id) { e.currentTarget.style.background = "#d97706"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = savingId === task.id ? "#9ca3af" : "#f59e0b"; e.currentTarget.style.transform = "translateY(0)"; }}
                          >
                            {savingId === task.id ? (
                              <><LoadingSpinner size="button" /> جاري الإرسال...</>
                            ) : (
                              <><RefreshCw size={18} /> إعادة تسليم</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {task.status === "graded" && (
                      <div className="bg-[#f0fdf4] rounded-[10px] py-4 px-5 flex items-center gap-3 text-[#166534]">
                        <div className="bg-[#22c55e] rounded-full p-[6px] text-white">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="font-medium">
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
