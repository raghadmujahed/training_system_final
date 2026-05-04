import { useState } from "react";
import { useStudentMessages } from "../../../hooks/useFieldSupervisorApi";
import {
  MessageCircle,
  Send,
  User,
  AlertTriangle,
  Check,
  CheckCircle,
  FileText,
  Star,
} from "lucide-react";

export default function CommunicationTab({ studentId }) {
  const { messages, loading, error, sendMessage, messageAcademicSupervisor } = useStudentMessages(studentId);
  const [newMessage, setNewMessage] = useState("");
  const [relatedTo, setRelatedTo] = useState("general");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [messageTo, setMessageTo] = useState("student");

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    setSuccess(false);
    try {
      if (messageTo === "student") {
        await sendMessage(newMessage, relatedTo);
      } else {
        await messageAcademicSupervisor(newMessage, relatedTo);
      }
      setNewMessage("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // —
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  const getRelatedIcon = (rel) => {
    switch (rel) {
      case "attendance":
        return <CheckCircle size={16} />;
      case "daily_report":
        return <FileText size={16} />;
      case "evaluation":
        return <Star size={16} />;
      default:
        return <MessageCircle size={16} />;
    }
  };

  const getRelatedLabel = (rel) => {
    switch (rel) {
      case "attendance":
        return "حضور";
      case "daily_report":
        return "تقرير يومي";
      case "evaluation":
        return "تقييم";
      case "issue":
        return "مشكلة ميدانية";
      default:
        return "متابعة عامة";
    }
  };

  return (
    <div>
      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Send size={20} />
          إرسال رسالة جديدة
        </h4>
        {success && (
          <div className="section-card" style={{ padding: 12, marginBottom: 12, background: "rgba(25, 135, 84, 0.08)" }}>
            <Check size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            تم إرسال الرسالة بنجاح
          </div>
        )}
        <form onSubmit={handleSend}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <div className="form-field">
              <label className="form-label-custom" htmlFor="comm-message-to">
                المرسل إليه
              </label>
              <select
                id="comm-message-to"
                className="form-select-custom"
                value={messageTo}
                onChange={(e) => setMessageTo(e.target.value)}
              >
                <option value="student">الطالب</option>
                <option value="supervisor">المشرف الأكاديمي</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label-custom" htmlFor="comm-related-to">
                الموضوع
              </label>
              <select
                id="comm-related-to"
                className="form-select-custom"
                value={relatedTo}
                onChange={(e) => setRelatedTo(e.target.value)}
              >
                <option value="general">متابعة عامة</option>
                <option value="attendance">حضور</option>
                <option value="daily_report">تقرير يومي</option>
                <option value="evaluation">تقييم</option>
                <option value="issue">مشكلة ميدانية</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label-custom" htmlFor="comm-message">
              الرسالة
            </label>
            <textarea
              id="comm-message"
              className="form-textarea-custom"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              required
            />
          </div>
          <button type="submit" className="btn-primary-custom btn-sm-custom" disabled={sending || !newMessage.trim()}>
            <Send size={16} />
            {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
          </button>
        </form>
      </div>

      <div className="section-card">
        <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <MessageCircle size={20} />
          سجل الرسائل
        </h4>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32 }} className="text-soft">
            لا توجد رسائل مسجلة
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: message.is_from_me ? "flex-start" : "flex-end",
                }}
              >
                <div
                  className="section-card"
                  style={{
                    maxWidth: "85%",
                    padding: 14,
                    background: message.is_from_me ? "rgba(13, 110, 253, 0.07)" : "#f7f9fc",
                    borderColor: message.is_from_me ? "rgba(13, 110, 253, 0.2)" : "var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: message.is_from_me ? "rgba(13, 110, 253, 0.15)" : "#e9ecef",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>{message.is_from_me ? "أنت" : message.sender_name}</strong>
                      <div className="text-soft" style={{ fontSize: "0.82rem" }}>
                        {message.created_at}
                      </div>
                    </div>
                  </div>
                  {message.related_to && (
                    <div className="table-actions" style={{ marginBottom: 8 }}>
                      {getRelatedIcon(message.related_to)}
                      <span className="badge-custom badge-primary">{getRelatedLabel(message.related_to)}</span>
                    </div>
                  )}
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
