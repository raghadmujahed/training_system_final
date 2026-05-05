import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { Download, ExternalLink } from "lucide-react";
import { useToast } from "../../../../components/Toast";

export default function PortfolioTab({ studentId }) {
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState("");

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/portfolio`);
      const data = res.data?.data || res.data;
      const rows = Array.isArray(data?.sections)
        ? data.sections
        : Array.isArray(data?.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
            : [];
      setEntries(rows.map(normalizePortfolioEntry));
    } catch {
      setError("فشل تحميل ملف الإنجاز");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const handleAddComment = async (entryId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.post(`/supervisor/students/${studentId}/portfolio/review-section`, {
        entry_id: entryId,
        status: "reviewed",
        reviewer_note: commentText.trim(),
      });
      setCommentingId(null);
      setCommentText("");
      showToast("تم إضافة الملاحظة بنجاح", "success");
      loadPortfolio();
    } catch {
      showToast("فشل إضافة الملاحظة", "error");
    }
  };

  const completionRate = entries.length > 0
    ? Math.round((entries.filter((e) => e.status === "approved" || e.status === "uploaded").length / entries.length) * 100)
    : 0;

  const statusConfig = {
    uploaded: { label: "مرفوع", color: "#17a2b8", bg: "#e3f2fd", icon: "📤" },
    missing: { label: "ناقص", color: "#dc3545", bg: "#ffebee", icon: "❌" },
    needs_edit: { label: "يحتاج تعديل", color: "#fd7e14", bg: "#fff3e0", icon: "✏️" },
    approved: { label: "معتمد", color: "#28a745", bg: "#e8f5e9", icon: "✅" },
  };

  const showToast = (message, type = "success") => {
    addToast(message, type);
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>⏳ جاري التحميل...</div>;
  if (error && !entries.length) return <div style={{ color: "#dc3545", padding: "20px" }}>⚠️ {error}</div>;

  return (
    <div>
      {/* Completion Progress */}
      <div className="section-card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0 }}>📁 نسبة اكتمال ملف الإنجاز</h4>
          <span style={{ fontSize: "1.3rem", fontWeight: "700", color: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545" }}>
            {completionRate}%
          </span>
        </div>
        <div style={{ background: "#e9ecef", borderRadius: "10px", height: "12px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${completionRate}%`,
              background: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545",
              borderRadius: "10px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
        {completionRate < 100 && (
          <div style={{ marginTop: "8px", fontSize: "0.82rem", color: "#dc3545" }}>
            ⚠️ عناصر ناقصة: {entries.filter((e) => e.status === "missing").map((e) => e.type || e.title).join("، ")}
          </div>
        )}
      </div>

      {/* Entries List */}
      {!entries.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد عناصر في ملف الإنجاز بعد
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map((entry) => {
            const sc = statusConfig[entry.status] || statusConfig.missing;
            return (
              <div
                key={entry.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e9ecef",
                  borderRadius: "10px",
                  padding: "16px",
                  borderRight: `4px solid ${sc.color}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      {sc.icon} {entry.title || entry.type || "عنصر"}
                    </h5>
                    <div style={{ fontSize: "0.78rem", color: "#999", marginTop: "4px" }}>
                      {entry.file_type && <span>نوع: {entry.file_type} | </span>}
                      {entry.uploaded_at && <span>تاريخ الرفع: {entry.uploaded_at}</span>}
                    </div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: "600", color: sc.color, backgroundColor: sc.bg }}>
                    {sc.label}
                  </span>
                </div>

                {entry.file_path && (
                  <div style={{ marginBottom: "8px" }}>
                    <a
                      href={`${apiOrigin}/storage/${entry.file_path.replace(/^\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        color: "#0d6efd",
                        textDecoration: "none",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #dee2e6",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e9ecef";
                        e.currentTarget.style.borderColor = "#0d6efd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                        e.currentTarget.style.borderColor = "#dee2e6";
                      }}
                    >
                      <Download size={14} />
                      تحميل الملف
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {entry.student_note && (
                  <div style={{ background: "#f0f7ff", borderRadius: "6px", padding: "8px", marginBottom: "8px", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: "600", color: "#0d6efd" }}>ملاحظة الطالب:</span> {entry.student_note}
                  </div>
                )}

                {entry.supervisor_comment && (
                  <div style={{ background: "#e8f5e9", borderRadius: "6px", padding: "8px", marginBottom: "8px", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: "600", color: "#28a745" }}>🎓 ملاحظتك:</span> {entry.supervisor_comment}
                    {entry.reviewed_at && (
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
                        {new Date(entry.reviewed_at).toLocaleDateString('ar-SA', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                )}

                {commentingId === entry.id ? (
                  <div style={{ marginTop: "8px" }}>
                    <textarea id="portfolio-comment" name="supervisor_comment" className="form-textarea-custom" rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="أضف ملاحظة..." />
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <button className="btn-primary-custom" style={{ fontSize: "0.82rem", padding: "6px 12px" }} onClick={() => handleAddComment(entry.id)}>حفظ</button>
                      <button style={{ fontSize: "0.82rem", padding: "6px 12px", borderRadius: "6px", border: "1px solid #999", background: "#fff", cursor: "pointer" }} onClick={() => { setCommentingId(null); setCommentText(""); }}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <button
                    style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "6px", border: "1px solid #4361ee", background: "#fff", color: "#4361ee", cursor: "pointer" }}
                    onClick={() => setCommentingId(entry.id)}
                  >
                    💬 إضافة ملاحظة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizePortfolioEntry(entry) {
  const status = entry.review_status === "reviewed"
    ? "approved"
    : entry.review_status === "needs_revision"
      ? "needs_edit"
      : entry.file_path
        ? "uploaded"
        : "missing";

  return {
    ...entry,
    status,
    supervisor_comment: entry.reviewer_note || entry.supervisor_comment,
    student_note: entry.student_note || entry.description,
    uploaded_at: entry.uploaded_at || entry.created_at,
  };
}
