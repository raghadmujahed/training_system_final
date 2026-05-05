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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ margin: 0 }}>💬 مركز التواصل</h4>
        <button className="btn-primary-custom" onClick={() => setShowForm(true)}>+ رسالة جديدة</button>
      </div>

      {/* New Message Form */}
      {showForm && (
        <div className="section-card" style={{ marginBottom: "16px", border: "1px solid #4361ee" }}>
          <h5 style={{ margin: "0 0 12px" }}>✉️ رسالة جديدة</h5>
          <form onSubmit={handleSend}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
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
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button className="btn-primary-custom" type="submit" disabled={sending}>{sending ? "جاري الإرسال..." : "📤 إرسال"}</button>
              <button type="button" style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #999", background: "#fff", cursor: "pointer" }} onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => setFilterTarget("")} style={{ padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", border: `1px solid ${!filterTarget ? "#4361ee" : "#dee2e6"}`, background: !filterTarget ? "#eef0ff" : "#fff", color: !filterTarget ? "#4361ee" : "#666", cursor: "pointer" }}>الكل</button>
        {TARGETS.map((t) => (
          <button key={t.value} onClick={() => setFilterTarget(filterTarget === t.value ? "" : t.value)} style={{ padding: "4px 10px", borderRadius: "14px", fontSize: "0.75rem", border: `1px solid ${filterTarget === t.value ? "#4361ee" : "#dee2e6"}`, background: filterTarget === t.value ? "#eef0ff" : "#fff", color: filterTarget === t.value ? "#4361ee" : "#666", cursor: "pointer" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Messages Timeline */}
      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد رسائل
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((msg, i) => {
            const isSent = msg.direction === "sent" || msg.sender_role === "academic_supervisor";
            return (
              <div key={msg.id || i} style={{
                background: isSent ? "#eef0ff" : "#f8f9fa",
                border: "1px solid #e9ecef",
                borderRadius: "10px",
                padding: "14px",
                borderRight: isSent ? "4px solid #4361ee" : "4px solid #999",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: isSent ? "#4361ee" : "#555" }}>
                      {isSent ? "← أنت" : `→ ${getTargetLabel(msg.target || msg.sender_role)}`}
                    </span>
                    <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: "#f0f0f0", color: "#666" }}>
                      {getReasonIcon(msg.reason)} {getReasonLabel(msg.reason)}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#999" }}>{msg.created_at || ""}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#333", lineHeight: "1.6" }}>{msg.content}</p>
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
