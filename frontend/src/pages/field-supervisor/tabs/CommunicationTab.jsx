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
      <div className="section-card border-r-4 border-[var(--danger)]">
        <p className="m-0 flex items-center gap-2">
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
      <div className="section-card mb-4">
        <h4 className="mt-0 flex items-center gap-2">
          <Send size={20} />
          إرسال رسالة جديدة
        </h4>
        {success && (
          <div className="section-card p-3 mb-3 bg-[rgba(25,135,84,0.08)]">
            <Check size={18} className="align-middle ml-[6px]" />
            تم إرسال الرسالة بنجاح
          </div>
        )}
        <form onSubmit={handleSend}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
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
        <h4 className="mt-0 flex items-center gap-2">
          <MessageCircle size={20} />
          سجل الرسائل
        </h4>
        {messages.length === 0 ? (
          <div className="text-center p-8 text-soft">
            لا توجد رسائل مسجلة
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_from_me ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`section-card max-w-[85%] p-[14px] ${message.is_from_me ? "bg-[rgba(13,110,253,0.07)] border-[rgba(13,110,253,0.2)]" : "bg-[#f7f9fc] border-[var(--border)]"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${message.is_from_me ? "bg-[rgba(13,110,253,0.15)] text-[#0d6efd]" : "bg-[#e9ecef] text-[#666]"}`}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <strong className="text-[0.95rem]">{message.is_from_me ? "أنت" : message.sender_name}</strong>
                      <div className="text-soft text-[0.82rem]">
                        {message.created_at}
                      </div>
                    </div>
                  </div>
                  {message.related_to && (
                    <div className="table-actions mb-2">
                      {getRelatedIcon(message.related_to)}
                      <span className="badge-custom badge-primary">{getRelatedLabel(message.related_to)}</span>
                    </div>
                  )}
                  <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
