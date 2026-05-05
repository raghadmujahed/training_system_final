import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

export default function DailyLogsTab({ studentId }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [commentingLogId, setCommentingLogId] = useState(null);
  const [commentText, setCommentText] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/daily-logs`, { params: { per_page: 200 } });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.logs)
            ? payload.data.logs
            : [];
      setLogs(rows);
    } catch {
      setError("فشل تحميل السجلات اليومية");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleAddComment = async (logId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.post(`/supervisor/students/${studentId}/daily-logs/${logId}/academic-review`, {
        academic_note: commentText.trim(),
        needs_discussion: false,
      });
      setCommentingLogId(null);
      setCommentText("");
      addToast("تم إضافة الملاحظة بنجاح", "success");
      loadLogs();
    } catch {
      addToast("فشل إضافة الملاحظة", "error");
    }
  };

  const handleSendNote = async (logId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.post(`/supervisor/students/${studentId}/daily-logs/${logId}/academic-review`, {
        academic_note: commentText.trim(),
        needs_discussion: true,
      });
      setCommentingLogId(null);
      setCommentText("");
      addToast("تم إرسال الملاحظة بنجاح", "success");
      loadLogs();
    } catch {
      addToast("فشل إرسال الملاحظة", "error");
    }
  };

  const statusConfig = {
    new: { label: "جديد", color: "#17a2b8", bg: "#e3f2fd" },
    pending_review: { label: "قيد المراجعة", color: "#ffc107", bg: "#fff8e1" },
    reviewed: { label: "معتمد", color: "#28a745", bg: "#e8f5e9" },
    approved: { label: "معتمد", color: "#28a745", bg: "#e8f5e9" },
    under_review: { label: "قيد المراجعة", color: "#ffc107", bg: "#fff8e1" },
    needs_edit: { label: "يحتاج تعديل", color: "#dc3545", bg: "#ffebee" },
    draft: { label: "مسودة", color: "#6c757d", bg: "#f8f9fa" },
  };

  const filtered = filterStatus ? logs.filter((l) => l.status === filterStatus) : logs;

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error) return <div style={{ color: "#dc3545", padding: "20px" }}>⚠️ {error}</div>;

  return (
    <div>
      {/* Filter Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", color: "#666" }}>تصفية حسب الحالة:</span>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
            style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "0.78rem",
              fontWeight: "600",
              border: `1px solid ${filterStatus === key ? cfg.color : "#dee2e6"}`,
              background: filterStatus === key ? cfg.bg : "#fff",
              color: filterStatus === key ? cfg.color : "#666",
              cursor: "pointer",
            }}
          >
            {cfg.label}
          </button>
        ))}
        <span style={{ fontSize: "0.82rem", color: "#999", marginRight: "8px" }}>
          ({filtered.length} سجل)
        </span>
      </div>

      {/* Quick Review Mode */}
      {logs.filter((l) => l.status === "pending_review" || l.status === "new").length > 0 && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffc107", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "#856404", fontWeight: "600" }}>
            📝 {logs.filter((l) => l.status === "pending_review" || l.status === "new").length} سجل بانتظار المراجعة
          </span>
        </div>
      )}

      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد سجلات يومية
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((log) => {
            const sc = statusConfig[log.status] || statusConfig.draft;
            return (
              <div
                key={log.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e9ecef",
                  borderRadius: "10px",
                  padding: "16px",
                  borderRight: `4px solid ${sc.color}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h5 style={{ margin: "0 0 4px", fontSize: "1rem" }}>{log.title || `سجل يوم ${log.date}`}</h5>
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>{log.date || "—"}</span>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>
                    {sc.label}
                  </span>
                </div>

                {log.description && (
                  <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "#444", lineHeight: "1.6" }}>
                    {log.description}
                  </p>
                )}

                {log.mentor_comment && (
                  <div style={{ background: "#f0f7ff", borderRadius: "6px", padding: "10px", marginBottom: "12px", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: "600", color: "#0d6efd" }}>👨‍🏫 ملاحظة المشرف الميداني:</span>
                    <span style={{ color: "#444", marginRight: "8px" }}>{log.mentor_comment}</span>
                  </div>
                )}

                {log.attachment_path && (
                  <div style={{ fontSize: "0.82rem", color: "#666", marginBottom: "12px" }}>
                    📎 مرفق: {log.attachment_path}
                  </div>
                )}

                {/* Supervisor Comment Area */}
                {log.source === "daily_report" ? (
                  <div style={{ background: "#e8f5e9", borderRadius: "6px", padding: "8px 12px", fontSize: "0.82rem", color: "#2e7d32" }}>
                    هذا تقرير يومي راجعه المشرف الميداني ويظهر هنا للاطلاع الأكاديمي.
                  </div>
                ) : commentingLogId === log.id ? (
                  <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px" }}>
                    <textarea
                      id="daily-log-comment"
                      name="supervisor_comment"
                      className="form-textarea-custom"
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="أضف ملاحظتك الأكاديمية..."
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button className="btn-primary-custom" style={{ fontSize: "0.82rem", padding: "6px 14px" }} onClick={() => handleAddComment(log.id)}>
                        ✅ اعتماد مع ملاحظة
                      </button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #fd7e14", background: "#fff", color: "#fd7e14", cursor: "pointer" }} onClick={() => handleSendNote(log.id)}>
                        📤 إرسال للطالب (يحتاج تعديل)
                      </button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #999", background: "#fff", color: "#666", cursor: "pointer" }} onClick={() => { setCommentingLogId(null); setCommentText(""); }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {log.supervisor_comment ? (
                      <div style={{ background: "#e8f5e9", borderRadius: "6px", padding: "8px 12px", fontSize: "0.85rem", flex: 1 }}>
                        <span style={{ fontWeight: "600", color: "#28a745" }}>🎓 ملاحظتك:</span>
                        <span style={{ color: "#444", marginRight: "8px" }}>{log.supervisor_comment}</span>
                      </div>
                    ) : null}
                    <button
                      style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", border: "1px solid #4361ee", background: "#fff", color: "#4361ee", cursor: "pointer" }}
                      onClick={() => setCommentingLogId(log.id)}
                    >
                      💬 إضافة ملاحظة
                    </button>
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
