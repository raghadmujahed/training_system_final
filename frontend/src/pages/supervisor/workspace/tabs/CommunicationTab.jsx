import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

const REASONS = [
  { value: "attendance", label: "حضور", icon: "📊" },
  { value: "daily_log", label: "سجل يومي", icon: "📝" },
  { value: "task", label: "مهمة", icon: "✅" },
  { value: "visit", label: "زيارة", icon: "🏫" },
  { value: "evaluation", label: "تقييم", icon: "📈" },
  { value: "general", label: "عام", icon: "💬" },
];

const TARGETS = [
  { value: "student", label: "الطالب", icon: "🎓" },
];

export default function CommunicationTab({ studentId }) {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ target: "student", reason: "general", content: "" });
  const [filterTarget, setFilterTarget] = useState("");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/messages`, { params: { per_page: 200 } });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];
      setMessages(rows.map(normalizeMessage));
    } catch {
      setError("فشل تحميل الرسائل");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/supervisor/students/${studentId}/messages`, {
        target_user_id: Number(studentId),
        content: form.content,
        related_to: form.reason,
      });
      setForm({ target: "student", reason: "general", content: "" });
      setShowForm(false);
      addToast("تم إرسال الرسالة بنجاح", "success");
      loadMessages();
    } catch {
      addToast("فشل إرسال الرسالة", "error");
    } finally {
      setSending(false);
    }
  };

  const rows = Array.isArray(messages) ? messages : [];
  const filtered = filterTarget ? rows.filter((m) => m.target === filterTarget || m.direction === filterTarget) : rows;

  const getReasonLabel = (reason) => REASONS.find((r) => r.value === reason)?.label || reason;
  const getReasonIcon = (reason) => REASONS.find((r) => r.value === reason)?.icon || "💬";
  const getTargetLabel = (target) => TARGETS.find((t) => t.value === target)?.label || target;

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="m-0">💬 مركز التواصل</h4>
        <button className="btn-primary-custom" onClick={() => setShowForm(true)}>+ رسالة جديدة</button>
      </div>

      {/* New Message Form */}
      {showForm && (
        <div className="section-card mb-4 border border-[#4361ee]">
          <h5 className="m-0 mb-3">✉️ رسالة جديدة</h5>
          <form onSubmit={handleSend}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="form-label-custom">المستلم</label>
                <select id="msg-target" name="target" className="form-select-custom" value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}>
                  {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-custom">السبب</label>
                <select id="msg-reason" name="reason" className="form-select-custom" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                </select>
              </div>
            </div>
            <textarea id="msg-content" name="content" className="form-textarea-custom" rows={3} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="اكتب رسالتك..." required />
            <div className="flex gap-2 mt-[10px]">
              <button className="btn-primary-custom" type="submit" disabled={sending}>{sending ? "جاري الإرسال..." : "📤 إرسال"}</button>
              <button type="button" className="py-2 px-4 rounded-md border border-[#999] bg-white cursor-pointer" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-[6px] mb-4 flex-wrap">
        <button onClick={() => setFilterTarget("")} className="py-1 px-[10px] rounded-[14px] text-[0.75rem] cursor-pointer" style={{ border: `1px solid ${!filterTarget ? "#4361ee" : "#dee2e6"}`, background: !filterTarget ? "#eef0ff" : "#fff", color: !filterTarget ? "#4361ee" : "#666" }}>الكل</button>
        {TARGETS.map((t) => (
          <button key={t.value} onClick={() => setFilterTarget(filterTarget === t.value ? "" : t.value)} className="py-1 px-[10px] rounded-[14px] text-[0.75rem] cursor-pointer" style={{ border: `1px solid ${filterTarget === t.value ? "#4361ee" : "#dee2e6"}`, background: filterTarget === t.value ? "#eef0ff" : "#fff", color: filterTarget === t.value ? "#4361ee" : "#666" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Messages Timeline */}
      {!filtered.length ? (
        <div className="text-center p-10 text-[#999]">
          <div className="text-[2rem] mb-3">📭</div>
          لا توجد رسائل
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {filtered.map((msg, i) => {
            const isSent = msg.direction === "sent" || msg.sender_role === "academic_supervisor";
            return (
              <div key={msg.id || i} className="border border-[#e9ecef] rounded-[10px] p-[14px]" style={{
                background: isSent ? "#eef0ff" : "#f8f9fa",
                borderRight: isSent ? "4px solid #4361ee" : "4px solid #999",
              }}>
                <div className="flex justify-between items-center mb-[6px] flex-wrap gap-1">
                  <div className="flex gap-2 items-center">
                    <span className="text-[0.8rem] font-semibold" style={{ color: isSent ? "#4361ee" : "#555" }}>
                      {isSent ? "← أنت" : `→ ${getTargetLabel(msg.target || msg.sender_role)}`}
                    </span>
                    <span className="text-[0.72rem] py-[2px] px-2 rounded-[10px] bg-[#f0f0f0] text-[#666]">
                      {getReasonIcon(msg.reason)} {getReasonLabel(msg.reason)}
                    </span>
                  </div>
                  <span className="text-[0.72rem] text-[#999]">{msg.created_at || ""}</span>
                </div>
                <p className="m-0 text-[0.88rem] text-[#333] leading-[1.6]">{msg.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizeMessage(message) {
  return {
    ...message,
    content: message.content || message.message,
    sender_role: message.sender_role || message.sender?.role?.name,
    target: message.target || "student",
    reason: message.reason || "general",
  };
}
