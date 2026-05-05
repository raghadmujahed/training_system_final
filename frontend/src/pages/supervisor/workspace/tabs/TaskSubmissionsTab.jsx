import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";

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

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>⏳ جاري التحميل...</div>;
  if (error) return <div style={{ color: "#dc3545", padding: "20px" }}>⚠️ {error}</div>;

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ padding: "12px", background: "#e3f2fd", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0d6efd" }}>{rows.length}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>إجمالي</div>
        </div>
        <div style={{ padding: "12px", background: "#ffebee", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#dc3545" }}>{notSubmitted}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>لم يسلّم</div>
        </div>
        <div style={{ padding: "12px", background: "#fff3e0", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fd7e14" }}>{lateSubmissions}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>تسليم متأخر</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
            style={{ padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: "600", border: `1px solid ${filterStatus === key ? cfg.color : "#dee2e6"}`, background: filterStatus === key ? cfg.bg : "#fff", color: filterStatus === key ? cfg.color : "#666", cursor: "pointer" }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>📭 لا توجد حلول</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((sub) => {
            const sc = statusConfig[sub.status] || statusConfig.not_submitted;
            return (
              <div key={sub.id} style={{ background: "#fff", border: "1px solid #e9ecef", borderRadius: "10px", padding: "16px", borderRight: `4px solid ${sc.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h5 style={{ margin: "0 0 4px" }}>{sub.task_title || `مهمة #${sub.task_id}`}</h5>
                    <span style={{ fontSize: "0.78rem", color: "#666" }}>
                      التسليم: {sub.submitted_at || "—"}
                      {sub.is_late && <span style={{ color: "#dc3545", fontWeight: "600", marginRight: "6px" }}>(متأخر)</span>}
                    </span>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
                </div>

                {sub.attachment_path && <div style={{ fontSize: "0.82rem", color: "#0d6efd", marginBottom: "8px" }}>📎 {sub.attachment_path}</div>}
                {sub.student_notes && <div style={{ background: "#f0f7ff", borderRadius: "6px", padding: "8px", marginBottom: "8px", fontSize: "0.85rem" }}><span style={{ fontWeight: "600" }}>ملاحظة الطالب:</span> {sub.student_notes}</div>}
                {sub.score != null && <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#28a745" }}>الدرجة: {sub.score}</div>}

                {gradingId === sub.id ? (
                  <div style={{ marginTop: "10px", background: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "#666", display: "block", marginBottom: "4px" }}>الدرجة</label>
                        <input id="grade-value" name="score" type="number" min="0" max="100" className="form-input-custom" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} style={{ width: "80px" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{ fontSize: "0.8rem", color: "#666", display: "block", marginBottom: "4px" }}>ملاحظة</label>
                        <input id="grade-note" name="notes" className="form-input-custom" value={gradeNote} onChange={(e) => setGradeNote(e.target.value)} placeholder="ملاحظة..." />
                      </div>
                      <button className="btn-primary-custom" style={{ fontSize: "0.82rem", padding: "6px 14px" }} onClick={() => handleGrade(sub.id)}>تقييم</button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #999", background: "#fff", cursor: "pointer" }} onClick={() => { setGradingId(null); setGradeValue(""); setGradeNote(""); }}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    {sub.status === "submitted" || sub.status === "under_review" ? (
                      <button style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "6px", border: "1px solid #28a745", background: "#fff", color: "#28a745", cursor: "pointer" }} onClick={() => setGradingId(sub.id)}>📊 تقييم</button>
                    ) : null}
                    {sub.status === "graded" && (
                      <button style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "6px", border: "1px solid #fd7e14", background: "#fff", color: "#fd7e14", cursor: "pointer" }} onClick={() => handleReopen(sub.id)}>🔄 إعادة فتح</button>
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
