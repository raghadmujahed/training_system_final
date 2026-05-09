import { useState, useEffect } from "react";
import { FileText, Send, Users, GraduationCap, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";
import StatusBadge from "./StatusBadge";

export default function OfficialLetterPreview({
  batch,
  requests = [],
  letter = null,
  onSend,
  saving,
  sendError = "",
}) {
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [letterNumber, setLetterNumber] = useState("");
  const [letterDate, setLetterDate] = useState("");
  const [letterContent, setLetterContent] = useState("");
  const [formError, setFormError] = useState("");

  const autoLetterNumber = (id) => {
    const year = new Date().getFullYear();
    const padded = String(id).padStart(3, "0");
    return `TR-${year}-${padded}`;
  };

  useEffect(() => {
    if (!batch) return;
    const existing = String(letter?.letter_number || batch.letter_number || "").trim();
    setLetterNumber(existing || autoLetterNumber(batch.id));
    setLetterDate(
      letter?.letter_date || batch.letter_date || new Date().toISOString().slice(0, 10)
    );
    setLetterContent(String(letter?.content || batch.content || "").trim());
    setFormError("");
  }, [batch?.id, letter?.letter_number, letter?.letter_date, letter?.content]);

  if (!batch) return null;

  // Use provided requests prop, or fallback to embedded batch data
  const displayRequests = requests.length > 0 ? requests : (batch.training_requests || batch.trainingRequests || batch.requests || batch.items || []);

  const visibleRequests = showAllStudents ? displayRequests : displayRequests.slice(0, 5);
  const hasMoreStudents = displayRequests.length > 5;

  const statusLabel = BATCH_STATUS_LABELS[batch.status] || batch.status;
  const statusColors = BATCH_STATUS_COLORS[batch.status] || {
    bg: "#e9ecef",
    text: "#495057",
  };

  return (
    <div className="section-card">
      <div
        className="flex justify-between items-center mb-4"
      >
        <div className="flex items-center gap-[10px]">
          <div className="section-icon" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)" }}>
            <FileText size={20} />
          </div>
          <h4 className="m-0">معاملة طلبات تدريب — دفعة #{batch.id}</h4>
        </div>
        <span
          className="py-1 px-3 rounded-full font-bold text-[0.78rem]"
          style={{
            background: statusColors.bg,
            color: statusColors.text,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="info-grid mb-4">
        <div className="info-card">
          <div className="info-content">
            <div className="info-label">الجهة المرسل إليها</div>
            <div className="info-value">
              {batch.recipient_label || getGoverningBodyLabel(batch.governing_body)}
            </div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-content">
            <div className="info-label">المديرية/المنطقة</div>
            <div className="info-value">{batch.directorate || "—"}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-content">
            <div className="info-label">رقم المعاملة</div>
            <div className="info-value">
              {letter?.letter_number || batch.letter_number || "—"}
            </div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-content">
            <div className="info-label">تاريخ المعاملة</div>
            <div className="info-value">
              {letter?.letter_date || batch.letter_date || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Students Section */}
      {displayRequests.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, var(--info) 0%, #0aa2c0 100%)" }}>
              <Users size={16} />
            </div>
            <h5 className="m-0 text-[0.95rem]">الطلاب في الدفعة</h5>
            <span className="bg-[rgba(59,130,182,0.1)] text-[var(--info)] py-[2px] px-[10px] rounded-full text-[0.78rem] font-bold">
              {displayRequests.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {visibleRequests.map((r) => {
              const s0 = r.students?.[0];
              const studentName = s0?.user?.name || r.requested_by?.name || "—";
              const universityId = s0?.user?.university_id || "—";
              const courseName = s0?.course?.name || "—";
              const siteName = r.training_site?.name || r.training_site?.label || "—";
              const phone = s0?.user?.phone || "";
              const email = s0?.user?.email || "";
              return (
                <div
                  key={r.id}
                  className="border border-[var(--border)] rounded-xl py-3 px-[14px] bg-white transition-[var(--transition)]"
                >
                  <div className="flex justify-between items-center mb-[6px]">
                    <div className="flex items-center gap-2">
                      <div className="w-[34px] h-[34px] rounded-[10px] shrink-0 flex items-center justify-center text-white text-[0.82rem] font-extrabold" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #c49b66 100%)" }}>
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <h6 className="m-0 text-[0.9rem]">{studentName}</h6>
                        <span className="text-[0.78rem] text-[var(--text-faint)]">
                          {universityId}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.book_status} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-[6px] text-[0.82rem] text-[var(--text-soft)]">
                    <span className="flex items-center gap-1">
                      <GraduationCap size={13} className="text-[var(--accent)]" />
                      {courseName}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={13} className="text-[var(--info)]" />
                      {siteName}
                    </span>
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} className="text-[var(--success)]" />
                        {phone}
                      </span>
                    )}
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail size={13} className="text-[var(--warning)]" />
                        {email}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayRequests.length === 0 && (
        <div className="text-center p-5 rounded-xl bg-[#fbfcfe] border border-dashed border-[var(--border)] mb-4">
          <p className="text-[var(--text-faint)] m-0 text-[0.88rem]">لا توجد طلبات في هذه الدفعة</p>
        </div>
      )}

      {hasMoreStudents && (
        <button
          onClick={() => setShowAllStudents(!showAllStudents)}
          className="flex items-center justify-center gap-[6px] w-full py-[10px] mt-2 bg-transparent border border-dashed border-[var(--border)] rounded-[10px] text-[var(--info)] text-[0.85rem] font-bold cursor-pointer transition-all duration-200"
        >
          {showAllStudents ? (
            <>
              إخفاء <ChevronUp size={16} />
            </>
          ) : (
            <>
              عرض الكل ({displayRequests.length - 5} إضافي) <ChevronDown size={16} />
            </>
          )}
        </button>
      )}

      {letter?.content && batch.status !== "draft" && (
        <div
          className="bg-[#f8f9fa] border border-[var(--border)] rounded-xl p-4 mb-4 whitespace-pre-wrap text-[0.95rem] leading-[1.8]"
        >
          <strong>نص المعاملة:</strong>
          <br />
          {letter.content}
        </div>
      )}

      {batch.status === "draft" && onSend && (
        <div
          className="mb-3 p-4 rounded-xl border border-[var(--border)] bg-white"
        >
          <div className="font-bold mb-3 text-[0.92rem]">
            بيانات المعاملة قبل الإرسال
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-[6px]">
              <span className="text-[0.82rem] text-[var(--text-soft)] flex items-center gap-[6px]">
                رقم المعاملة
                <span className="text-[0.72rem] bg-[#e0f2fe] text-[#0369a1] py-[1px] px-2 rounded-full font-bold">تلقائي</span>
              </span>
              <input
                type="text"
                className="form-control w-full py-[10px] px-3 rounded-[10px] border-[1.5px] border-[#bae6fd] bg-[#f0f9ff] font-bold text-[#0c4a6e]"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder={autoLetterNumber(batch.id)}
                disabled={saving}
              />
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[0.82rem] text-[var(--text-soft)]">تاريخ المعاملة</span>
              <input
                type="date"
                className="form-control w-full py-[10px] px-3 rounded-[10px] border border-[var(--border)]"
                value={letterDate}
                onChange={(e) => setLetterDate(e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[0.82rem] text-[var(--text-soft)]">نص المعاملة</span>
              <textarea
                value={letterContent}
                onChange={(e) => setLetterContent(e.target.value)}
                placeholder="النص الكامل للمعاملة المرسلة إلى الجهة..."
                disabled={saving}
                rows={8}
                className="w-full p-3 rounded-[10px] border border-[var(--border)] font-inherit text-[0.92rem] leading-[1.7] resize-y"
              />
            </label>
          </div>
        </div>
      )}

      {(formError || sendError) && (
        <div
          className="alert-custom alert-danger mb-3 text-[0.88rem]"
        >
          {formError || sendError}
        </div>
      )}

      <div className="flex gap-2">
        {batch.status === "draft" && onSend && (
          <button
            className="btn-primary-custom flex items-center gap-[6px]"
            type="button"
            onClick={() => {
              const num = letterNumber.trim();
              const date = letterDate;
              const txt = letterContent.trim();
              if (!num || !date || !txt) {
                setFormError("يرجى تعبئة رقم المعاملة وتاريخها ونص المعاملة قبل الإرسال.");
                return;
              }
              setFormError("");
              onSend({
                letter_number: num,
                letter_date: date,
                content: txt,
              });
            }}
            disabled={saving}
          >
            <Send size={16} />
            {saving ? "جاري الإرسال..." : "إرسال الدفعة للجهة"}
          </button>
        )}
      </div>
    </div>
  );
}
