import { Fragment, useEffect, useState } from "react";
import { getOfficialLetters, receiveOfficialLetter } from "../../services/api";
import {
  Mail, Send, CheckCircle2, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp, FileText, Inbox
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

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
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [expandedLetterId, setExpandedLetterId] = useState(null);

  useEffect(() => { fetchLetters(); }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await getOfficialLetters({ type: "to_school", per_page: 100 });
      const list = Array.isArray(data?.data) ? data.data : [];
      setLetters(list.map(normalizeLetter));
    } catch (error) {
      toast.error("تعذر تحميل طلبات التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (letter) => {
    try {
      setSavingId(letter.id);
      await receiveOfficialLetter(letter.id, { received_at: new Date().toISOString(), status: "school_received" });
      toast.success("تم استلام الكتاب وتحديث حالته بنجاح.");
      await fetchLetters();
    } catch (error) {
      toast.apiError(error, "تعذر استلام الكتاب.");
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
      <div className="animate-[fadeIn_0.4s_ease]">
        {/* Hero */}
        <div className="text-white mb-6 py-8 px-10 rounded-[20px]" style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
          boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
        }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.2)] flex items-center justify-center">
              <Mail size={28} />
            </div>
            <div>
              <h1 className="m-0 text-[1.5rem] font-extrabold">طلبات التدريب</h1>
              <p className="mt-1 opacity-90 text-[0.95rem]">
                متابعة طلبات التدريب الواردة من المديرية أو الكلية وإدارة حالتها
              </p>
            </div>
          </div>
        </div>


        {loading ? (
          <LoadingSpinner size="section" text="جاري تحميل طلبات التدريب..." />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
              {[
                { title: "إجمالي الكتب", value: letters.length, icon: FileText, color: "#1e3a5f", bg: "#dbeafe" },
                { title: "كتب معلقة", value: pendingCount, icon: Clock, color: "#f59e0b", bg: "#fef3c7" },
                { title: "تم الاستلام", value: receivedCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#e2e8f0] flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center" style={{ background: card.bg, color: card.color }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="text-[0.78rem] text-[#94a3b8] font-medium">{card.title}</div>
                      <div className="text-[1.5rem] font-extrabold text-[#1e293b]">{card.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Letters List */}
            {letters.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#e2e8f0] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                <Inbox size={56} className="mb-4 opacity-30 text-[#94a3b8]" />
                <h3 className="m-0 mb-2 text-[#64748b] text-[1.1rem]">لا توجد كتب رسمية حاليًا</h3>
                <p className="m-0 text-[#94a3b8] text-[0.9rem]">عند وصول كتاب من المديرية سيظهر هنا</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {letters.map((letter) => {
                  const st = statusConfig[letter.status] || { label: letter.statusLabel, color: "#6b7280", bg: "#f3f4f6", icon: Clock };
                  const StatusIcon = st.icon;
                  const isExpanded = expandedLetterId === letter.id;
                  const isReceived = letter.status === "school_received";
                  const isSaving = savingId === letter.id;

                  return (
                    <div key={letter.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200" style={{ border: isReceived ? "1px solid #d1fae5" : "1px solid #e2e8f0" }}>
                      {/* Letter Header */}
                      <div className="flex items-center justify-between py-5 px-6 gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{
                            background: isReceived ? "#d1fae5" : "#fef3c7",
                            color: isReceived ? "#059669" : "#d97706",
                          }}>
                            <FileText size={22} />
                          </div>
                          <div>
                            <h4 className="m-0 mb-1 text-base font-bold text-[#1e293b]">{letter.subject}</h4>
                            <div className="flex flex-wrap gap-3 text-[0.8rem] text-[#64748b]">
                              <span className="flex items-center gap-1">
                                <Send size={13} /> {letter.sender}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} /> {letter.date}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-[0.375rem] py-[0.375rem] px-3 rounded-full text-[0.8rem] font-bold" style={{ background: st.bg, color: st.color }}>
                            <StatusIcon size={14} /> {st.label}
                          </span>

                          <button type="button" onClick={() => toggleContent(letter.id)}
                            className="inline-flex items-center gap-1 py-2 px-[0.85rem] bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-lg text-[0.82rem] font-semibold cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? "إخفاء" : "المحتوى"}
                          </button>

                          {!isReceived && (
                            <button type="button" onClick={() => handleReceive(letter)} disabled={isSaving}
                              className="inline-flex items-center gap-1 py-2 px-4 text-white border-none rounded-lg text-[0.85rem] font-semibold" style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
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
                        <div className="px-6 pb-5 animate-[fadeIn_0.3s_ease]">
                          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl py-4 px-5 whitespace-pre-wrap leading-[1.8] text-[0.9rem] text-[#334155]">
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
