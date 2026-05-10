import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

export default function TaskSubmissionsTab({ studentId }) {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [gradingId, setGradingId] = useState(null);
  const [gradeValue, setGradeValue] = useState("");
  const [gradeNote, setGradeNote] = useState("");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/task-submissions`, { params: { per_page: 200 } });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];
      setSubmissions(rows.map(normalizeSubmission));
    } catch {
      setError("فشل تحميل الحلول");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const handleGrade = async (submissionId) => {
    if (!gradeValue) return;
    try {
      await apiClient.post(`/task-submissions/${submissionId}/grade`, {
        score: Number(gradeValue),
        feedback: gradeNote || null,
      });
      setGradingId(null);
      setGradeValue("");
      setGradeNote("");
      addToast("تم تسجيل الدرجة بنجاح", "success");
      loadSubmissions();
    } catch {
      addToast("فشل تسجيل الدرجة", "error");
    }
  };

  const handleReopen = async (submissionId) => {
    if (!window.confirm("هل تريد إعادة فتح المهمة للطالب؟")) return;
    try {
      await apiClient.patch(`/task-submissions/${submissionId}`, { status: "resubmit" });
      addToast("تم إعادة فتح المهمة بنجاح", "success");
      loadSubmissions();
    } catch {
      addToast("فشل إعادة فتح المهمة", "error");
    }
  };

  const statusConfig = {
    not_submitted: { label: "لم يسلّم", color: "#dc3545", bg: "#ffebee" },
    submitted: { label: "تم التسليم", color: "#17a2b8", bg: "#e0f7fa" },
    under_review: { label: "تحت المراجعة", color: "#ffc107", bg: "#fff8e1" },
    graded: { label: "تم التقييم", color: "#28a745", bg: "#e8f5e9" },
    resubmit: { label: "إعادة تسليم", color: "#fd7e14", bg: "#fff3e0" },
  };

  const rows = Array.isArray(submissions) ? submissions : [];
  const filtered = filterStatus ? rows.filter((s) => s.status === filterStatus) : rows;
  const notSubmitted = rows.filter((s) => s.status === "not_submitted").length;
  const lateSubmissions = rows.filter((s) => s.is_late).length;

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error) return <div className="text-[#dc3545] p-5">⚠️ {error}</div>;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-4">
        <div className="p-3 bg-[#e3f2fd] rounded-lg text-center">
          <div className="text-[1.2rem] font-bold text-[#0d6efd]">{rows.length}</div>
          <div className="text-[0.75rem] text-[#666]">إجمالي</div>
        </div>
        <div className="p-3 bg-[#ffebee] rounded-lg text-center">
          <div className="text-[1.2rem] font-bold text-[#dc3545]">{notSubmitted}</div>
          <div className="text-[0.75rem] text-[#666]">لم يسلّم</div>
        </div>
        <div className="p-3 bg-[#fff3e0] rounded-lg text-center">
          <div className="text-[1.2rem] font-bold text-[#fd7e14]">{lateSubmissions}</div>
          <div className="text-[0.75rem] text-[#666]">تسليم متأخر</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-[6px] mb-4 flex-wrap">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
            className="py-1 px-[10px] rounded-[14px] text-[0.75rem] font-semibold cursor-pointer" style={{ border: `1px solid ${filterStatus === key ? cfg.color : "#dee2e6"}`, background: filterStatus === key ? cfg.bg : "#fff", color: filterStatus === key ? cfg.color : "#666" }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="text-center p-10 text-[#999]">📭 لا توجد حلول</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sub) => {
            const sc = statusConfig[sub.status] || statusConfig.not_submitted;
            return (
              <div key={sub.id} className="bg-white border border-[#e9ecef] rounded-[10px] p-4" style={{ borderRight: `4px solid ${sc.color}` }}>
                <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                  <div>
                    <h5 className="m-0 mb-1">{sub.task_title || `مهمة #${sub.task_id}`}</h5>
                    <span className="text-[0.78rem] text-[#666]">
                      التسليم: {sub.submitted_at || "—"}
                      {sub.is_late && <span className="text-[#dc3545] font-semibold mr-[6px]">(متأخر)</span>}
                    </span>
                  </div>
                  <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
                </div>

                {sub.attachment_path && <div className="text-[0.82rem] text-[#0d6efd] mb-2">📎 {sub.attachment_path}</div>}
                {sub.student_notes && <div className="bg-[#f0f7ff] rounded-md p-2 mb-2 text-[0.85rem]"><span className="font-semibold">ملاحظة الطالب:</span> {sub.student_notes}</div>}
                {sub.score != null && <div className="text-[0.9rem] font-semibold text-[#28a745]">الدرجة: {sub.score}</div>}

                {gradingId === sub.id ? (
                  <div className="mt-[10px] bg-[#f8f9fa] p-3 rounded-lg">
                    <div className="flex gap-2 flex-wrap items-end">
                      <div>
                        <label className="text-[0.8rem] text-[#666] block mb-1">الدرجة</label>
                        <input id="grade-value" name="score" type="number" min="0" max="100" className="form-input-custom w-20" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-[0.8rem] text-[#666] block mb-1">ملاحظة</label>
                        <input id="grade-note" name="notes" className="form-input-custom" value={gradeNote} onChange={(e) => setGradeNote(e.target.value)} placeholder="ملاحظة..." />
                      </div>
                      <button className="btn-primary-custom text-[0.82rem] py-[6px] px-[14px]" onClick={() => handleGrade(sub.id)}>تقييم</button>
                      <button className="text-[0.82rem] py-[6px] px-[14px] rounded-md border border-[#999] bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => { setGradingId(null); setGradeValue(""); setGradeNote(""); }}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-[10px]">
                    {sub.status === "submitted" || sub.status === "under_review" ? (
                      <button className="text-[0.82rem] py-1 px-3 rounded-md border border-[#28a745] bg-[#28a745] text-white cursor-pointer hover:bg-[#218838]" onClick={() => setGradingId(sub.id)}>📊 تقييم</button>
                    ) : null}
                    {sub.status === "graded" && (
                      <button className="text-[0.82rem] py-1 px-3 rounded-md border border-[#fd7e14] bg-[#fd7e14] text-white cursor-pointer hover:bg-[#e76f00]" onClick={() => handleReopen(sub.id)}>🔄 إعادة فتح</button>
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

function normalizeSubmission(submission) {
  const task = submission.task || {};
  const submittedAt = submission.submitted_at || null;
  const dueDate = task.due_date || null;
  const reviewStatus = submission.review_status || (submission.score != null ? "graded" : "submitted");
  const status = submission.needs_resubmission
    ? "resubmit"
    : reviewStatus === "graded"
      ? "graded"
      : reviewStatus === "under_review"
        ? "under_review"
        : submittedAt
          ? "submitted"
          : "not_submitted";

  return {
    ...submission,
    status,
    task_title: submission.task_title || task.title,
    task_id: submission.task_id || task.id,
    student_notes: submission.student_notes || submission.notes,
    attachment_path: submission.attachment_path || submission.file_path,
    is_late: Boolean(submittedAt && dueDate && new Date(submittedAt) > new Date(dueDate)),
  };
}
