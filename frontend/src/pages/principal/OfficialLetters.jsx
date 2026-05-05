import { Fragment, useEffect, useState } from "react";
import { getOfficialLetters, receiveOfficialLetter } from "../../services/api";
import {
  Mail, Send, CheckCircle2, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp, FileText, Inbox
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const fadeIn = `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`;
const spin = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`;

const normalizeLetter = (item) => ({
  id: item.id,
  subject: item.training_request?.data?.letter_number || item.training_request?.letter_number || item.letter_number || "بدون عنوان",
  sender: item.sent_by?.data?.name || item.sent_by?.name || "غير محدد",
  date: item.letter_date || item.created_at || "—",
  status: item.status || "sent_to_school",
  statusLabel: item.status_label || "مرسل للمدرسة",
  content: item.content || "",
});

const statusConfig = {
  sent_to_school: { label: "مرسل", color: "#f59e0b", bg: "#fef3c7", icon: Send },
  school_received: { label: "مستلم", color: "#10b981", bg: "#d1fae5", icon: CheckCircle2 },
  completed: { label: "مكتمل", color: "#6366f1", bg: "#e0e7ff", icon: CheckCircle2 },
};

const OfficialLetters = () => {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [expandedLetterId, setExpandedLetterId] = useState(null);

  useEffect(() => { fetchLetters(); }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await getOfficialLetters({ type: "to_school", per_page: 100 });
      const list = Array.isArray(data?.data) ? data.data : [];
      setLetters(list.map(normalizeLetter));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("تعذر تحميل طلبات التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (letter) => {
    try {
      setSavingId(letter.id); setSavedMessage(""); setErrorMessage("");
      await receiveOfficialLetter(letter.id, { received_at: new Date().toISOString(), status: "school_received" });
      setSavedMessage("تم استلام الكتاب وتحديث حالته بنجاح.");
      await fetchLetters();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "تعذر استلام الكتاب.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleContent = (id) => setExpandedLetterId((cur) => (cur === id ? null : id));

  const pendingCount = letters.filter(l => l.status === "sent_to_school").length;
  const receivedCount = letters.filter(l => l.status === "school_received").length;

  return (
    <>
      <style>{fadeIn}{spin}</style>
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          borderRadius: 20, padding: "2rem 2.5rem", color: "white", marginBottom: "1.5rem",
          boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={28} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>طلبات التدريب</h1>
              <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "0.95rem" }}>
                متابعة طلبات التدريب الواردة من المديرية أو الكلية وإدارة حالتها
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {savedMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#d1fae5", color: "#059669", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <CheckCircle2 size={20} /> {savedMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.25rem", background: "#fee2e2", color: "#dc2626", borderRadius: 14, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
            <AlertCircle size={20} /> {errorMessage}
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل طلبات التدريب..." />
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { title: "إجمالي الكتب", value: letters.length, icon: FileText, color: "#1e3a5f", bg: "#dbeafe" },
                { title: "كتب معلقة", value: pendingCount, icon: Clock, color: "#f59e0b", bg: "#fef3c7" },
                { title: "تم الاستلام", value: receivedCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} style={{
                    background: "#fff", borderRadius: 16, padding: "1.25rem",
                    border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 }}>{card.title}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Letters List */}
            {letters.length === 0 ? (
              <div style={{
                background: "#fff", borderRadius: 16, padding: "3rem", textAlign: "center",
                border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              }}>
                <Inbox size={56} style={{ marginBottom: "1rem", opacity: 0.3, color: "#94a3b8" }} />
                <h3 style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "1.1rem" }}>لا توجد كتب رسمية حاليًا</h3>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>عند وصول كتاب من المديرية سيظهر هنا</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {letters.map((letter) => {
                  const st = statusConfig[letter.status] || { label: letter.statusLabel, color: "#6b7280", bg: "#f3f4f6", icon: Clock };
                  const StatusIcon = st.icon;
                  const isExpanded = expandedLetterId === letter.id;
                  const isReceived = letter.status === "school_received";
                  const isSaving = savingId === letter.id;

                  return (
                    <div key={letter.id} style={{
                      background: "#fff", borderRadius: 16, overflow: "hidden",
                      border: isReceived ? "1px solid #d1fae5" : "1px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "all 0.2s",
                    }}>
                      {/* Letter Header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "1.25rem 1.5rem", gap: "1rem", flexWrap: "wrap",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 200 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isReceived ? "#d1fae5" : "#fef3c7",
                            color: isReceived ? "#059669" : "#d97706",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <FileText size={22} />
                          </div>
                          <div>
                            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{letter.subject}</h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Send size={13} /> {letter.sender}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Clock size={13} /> {letter.date}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "0.375rem",
                            padding: "0.375rem 0.75rem", borderRadius: 99,
                            fontSize: "0.8rem", fontWeight: 700,
                            background: st.bg, color: st.color,
                          }}>
                            <StatusIcon size={14} /> {st.label}
                          </span>

                          <button type="button" onClick={() => toggleContent(letter.id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "0.5rem 0.85rem", background: "#f8fafc",
                              color: "#475569", border: "1px solid #e2e8f0",
                              borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? "إخفاء" : "المحتوى"}
                          </button>

                          {!isReceived && (
                            <button type="button" onClick={() => handleReceive(letter)} disabled={isSaving}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "0.5rem 1rem",
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "white", border: "none", borderRadius: 8,
                                fontSize: "0.85rem", fontWeight: 600,
                                cursor: isSaving ? "not-allowed" : "pointer",
                                opacity: isSaving ? 0.7 : 1,
                              }}
                            >
                              {isSaving ? <LoadingSpinner size="button" /> : <CheckCircle2 size={14} />}
                              {isSaving ? "جاري التحديث..." : "تأكيد الاستلام"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div style={{
                          padding: "0 1.5rem 1.25rem",
                          animation: "fadeIn 0.3s ease",
                        }}>
                          <div style={{
                            background: "#f8fafc", border: "1px solid #e2e8f0",
                            borderRadius: 12, padding: "1rem 1.25rem",
                            whiteSpace: "pre-wrap", lineHeight: 1.8,
                            fontSize: "0.9rem", color: "#334155",
                          }}>
                            {letter.content || "لا يوجد محتوى محفوظ لهذا الكتاب."}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default OfficialLetters;
