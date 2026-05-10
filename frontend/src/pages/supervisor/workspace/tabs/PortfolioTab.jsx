import { useState, useEffect, useCallback } from "react";
import { apiClient, apiOrigin } from "../../../../services/api";
import { Download, ExternalLink } from "lucide-react";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

export default function PortfolioTab({ studentId }) {
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [draftRating, setDraftRating] = useState(null);

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
    } catch (err) {
      console.error("Error loading portfolio:", err);
      setError("فشل تحميل ملف الإنجاز");
      addToast("تعذر تحميل ملف الإنجاز، يرجى المحاولة لاحقاً", "error");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const openReviewPanel = (entry) => {
    setCommentingId(entry.id);
    setCommentText(entry.supervisor_comment || entry.reviewer_note || "");
    setDraftRating(
      entry.academic_rating != null && entry.academic_rating !== ""
        ? Number(entry.academic_rating)
        : null
    );
  };

  const handleSubmitReview = async (entryId, status) => {
    const note = commentText.trim();
    const hasRating = draftRating != null && draftRating >= 1 && draftRating <= 5;
    if (status === "needs_revision" && !note) {
      addToast("يرجى توضيح سبب طلب التعديل", "error");
      return;
    }
    if (status === "reviewed" && !note && !hasRating) {
      addToast("أدخل تقييماً (1–5) أو ملاحظة نصية", "error");
      return;
    }
    try {
      await apiClient.post(`/supervisor/students/${studentId}/portfolio/review-section`, {
        entry_id: entryId,
        status,
        reviewer_note: note || undefined,
        academic_rating: hasRating ? draftRating : undefined,
      });
      setCommentingId(null);
      setCommentText("");
      setDraftRating(null);
      addToast(status === "reviewed" ? "تم حفظ التقييم والمراجعة" : "تم طلب التعديل على الملف", "success");
      loadPortfolio();
    } catch (err) {
      console.error("Error saving review:", err);
      addToast("فشل حفظ المراجعة، يرجى المحاولة مرة أخرى", "error");
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

  
  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error && !entries.length) return <div className="text-[#dc3545] p-5">⚠️ {error}</div>;

  return (
    <div>
      {/* Completion Progress */}
      <div className="section-card mb-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="m-0">📁 نسبة اكتمال ملف الإنجاز</h4>
          <span className="text-[1.3rem] font-bold" style={{ color: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545" }}>
            {completionRate}%
          </span>
        </div>
        <div className="bg-[#e9ecef] rounded-[10px] h-3 overflow-hidden">
          <div
            className="h-full rounded-[10px] transition-[width] duration-500 ease"
            style={{
              width: `${completionRate}%`,
              background: completionRate >= 80 ? "#28a745" : completionRate >= 50 ? "#ffc107" : "#dc3545",
            }}
          />
        </div>
        {completionRate < 100 && (
          <div className="mt-2 text-[0.82rem] text-[#dc3545]">
            ⚠️ عناصر ناقصة: {entries.filter((e) => e.status === "missing").map((e) => e.type || e.title).join("، ")}
          </div>
        )}
      </div>

      {/* Entries List */}
      {!entries.length ? (
        <div className="text-center p-10 text-[#999]">
          <div className="text-[2rem] mb-3">📭</div>
          لا توجد عناصر في ملف الإنجاز بعد
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const sc = statusConfig[entry.status] || statusConfig.missing;
            return (
              <div
                key={entry.id}
                className="bg-white border border-[#e9ecef] rounded-[10px] p-4"
                style={{ borderRight: `4px solid ${sc.color}` }}
              >
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <div>
                    <h5 className="m-0 text-[0.95rem] flex items-center gap-[6px]">
                      {sc.icon} {entry.title || entry.type || "عنصر"}
                    </h5>
                    <div className="text-[0.78rem] text-[#999] mt-1">
                      {entry.file_type && <span>نوع: {entry.file_type} | </span>}
                      {entry.uploaded_at && <span>تاريخ الرفع: {entry.uploaded_at}</span>}
                    </div>
                  </div>
                  <span className="py-1 px-3 rounded-2xl text-[0.78rem] font-semibold" style={{ color: sc.color, backgroundColor: sc.bg }}>
                    {sc.label}
                  </span>
                </div>

                {entry.file_path && (
                  <div className="mb-2">
                    <a
                      href={`${apiOrigin}/storage/${entry.file_path.replace(/^\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-[6px] text-[0.82rem] text-[#0d6efd] no-underline py-1 px-2 rounded-md bg-[#f8f9fa] border border-[#dee2e6] transition-all duration-200"
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
                  <div className="bg-[#f0f7ff] rounded-md p-2 mb-2 text-[0.85rem]">
                    <span className="font-semibold text-[#0d6efd]">ملاحظة الطالب:</span> {entry.student_note}
                  </div>
                )}

                {entry.academic_rating != null && entry.academic_rating !== "" && (
                  <div className="text-[0.82rem] mb-2 text-[#0f5132] font-semibold">
                    ⭐ تقييمك: {entry.academic_rating} / 5
                  </div>
                )}

                {entry.supervisor_comment && (
                  <div className="bg-[#e8f5e9] rounded-md p-2 mb-2 text-[0.85rem]">
                    <span className="font-semibold text-[#28a745]">🎓 ملاحظتك:</span> {entry.supervisor_comment}
                    {entry.reviewed_at && (
                      <div className="text-[0.75rem] text-[#6b7280] mt-1">
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
                  <div className="mt-2">
                    <div className="mb-2">
                      <span className="text-[0.8rem] font-semibold block mb-[6px]">تقييم الملف (1–5)</span>
                      <div className="flex gap-[6px] flex-wrap">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setDraftRating(n)}
                            className="w-9 h-9 rounded-lg cursor-pointer font-bold text-[0.9rem]"
                            style={{
                              border: draftRating === n ? "2px solid #4361ee" : "1px solid #dee2e6",
                              background: draftRating === n ? "#eef2ff" : "#fff",
                              color: draftRating === n ? "#4361ee" : "#495057",
                            }}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDraftRating(null)}
                          className="text-[0.75rem] py-0 px-[10px] rounded-lg border border-[#ccc] bg-[#f8f9fa] cursor-pointer"
                        >
                          إلغاء التقييم
                        </button>
                      </div>
                    </div>
                    <textarea id="portfolio-comment" name="supervisor_comment" className="form-textarea-custom" rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="ملاحظة (اختياري عند اعتماد المراجعة؛ مطلوب عند طلب التعديل)..." />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button className="btn-primary-custom text-[0.82rem] py-[6px] px-3" type="button" onClick={() => handleSubmitReview(entry.id, "reviewed")}>اعتماد المراجعة</button>
                      <button className="text-[0.82rem] py-[6px] px-3 rounded-md border border-[#fd7e14] bg-[#fff3e0] text-[#c2410c] cursor-pointer" type="button" onClick={() => handleSubmitReview(entry.id, "needs_revision")}>طلب تعديل</button>
                      <button className="text-[0.82rem] py-[6px] px-3 rounded-md border border-[#999] bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200" type="button" onClick={() => { setCommentingId(null); setCommentText(""); setDraftRating(null); }}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="text-[0.82rem] py-1 px-3 rounded-md border border-[#4361ee] bg-[#4361ee] text-white cursor-pointer hover:bg-[#3651de]"
                    type="button"
                    onClick={() => openReviewPanel(entry)}
                  >
                    💬 تقييم وملاحظة
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
    academic_rating: entry.academic_rating,
    supervisor_comment: entry.reviewer_note || entry.supervisor_comment,
    student_note: entry.student_note || entry.description,
    uploaded_at: entry.uploaded_at || entry.created_at,
  };
}
