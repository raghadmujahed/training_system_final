import { useEffect, useState } from "react";
import { X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import StatusBadge from "./StatusBadge";
import { COORDINATOR_DECISIONS } from "../../config/coordinator/workflowSteps";
import { GOVERNING_BODIES } from "../../config/coordinator/governingBodies";

export default function RequestReviewDrawer({
  request,
  open,
  onClose,
  onReview,
  saving,
  sites = [],
  initialDecision = "",
  initialReason = "",
}) {
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");

  // مزامنة الحقول عند فتح الدروer أو تغيّر الطلب — نمط معتاد مع حقول متحكم بها محلياً
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    setDecision(initialDecision || "");
    setReason(initialReason || "");
    setSelectedSiteId("");
  }, [open, request?.id, initialDecision, initialReason]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open || !request) return null;

  const s0 = request.students?.[0];
  const studentName = s0?.user?.name || request.requested_by?.name || "—";
  const universityId = s0?.user?.university_id || "—";
  const courseName = s0?.course?.name || "—";
  const periodName = request.training_period?.name || "—";
  const siteName = request.training_site?.name || "—";
  const governingBody = request.governing_body || "—";
  const attachments = request.attachments || [];
  const notes = request.coordinator_notes || request.notes || [];

  const handleSubmit = () => {
    if (!decision) return;
    onReview(request.id, decision, decision !== "prelim_approved" ? reason : null);
    setDecision("");
    setReason("");
    setSelectedSiteId("");
  };

  const handleClose = () => {
    setDecision("");
    setReason("");
    setSelectedSiteId("");
    onClose();
  };

  const decisionIcons = {
    prelim_approved: <CheckCircle2 size={16} />,
    rejected: <XCircle size={16} />,
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.4)] z-[1000]"
          onClick={handleClose}
        />
      )}
      <div
        className="fixed top-0 right-0 bottom-0 w-[min(560px,95vw)] bg-white z-[1001] overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.12)] p-6 transition-transform duration-250 ease-in-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div
          className="flex justify-between items-center mb-5"
        >
          <h3 className="m-0">
            مراجعة طلب #{request.id}
          </h3>
          <button
            onClick={handleClose}
            className="bg-transparent border-none cursor-pointer text-[1.2rem]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="info-grid mb-5">
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <span className="text-white font-extrabold">{studentName?.[0] || "؟"}</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">الطالب</div>
              <div className="info-value text-lg">{studentName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper accent">
              <span className="text-white font-extrabold">#</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">الرقم الجامعي</div>
              <div className="info-value text-lg">{universityId}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper success">
              <span className="text-white font-extrabold">📚</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">المساق</div>
              <div className="info-value text-lg">{courseName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper info">
              <span className="text-white font-extrabold">📅</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">الفترة التدريبية</div>
              <div className="info-value text-lg">{periodName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper warning">
              <span className="text-white font-extrabold">🏫</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">جهة التدريب</div>
              <div className="info-value text-lg">{siteName}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <span className="text-white font-extrabold">🏛</span>
            </div>
            <div className="info-content">
              <div className="info-label text-sm font-bold">الجهة الرسمية</div>
              <div className="info-value text-lg">
                {GOVERNING_BODIES.find((b) => b.value === governingBody)?.label || governingBody}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <strong>الحالة:</strong>{" "}
          <StatusBadge status={request.book_status} size="lg" />
        </div>

        {attachments.length > 0 && (
          <div className="mb-4">
            <strong>المرفقات:</strong>
            <ul className="mt-[6px] pr-[18px]">
              {attachments.map((a, i) => (
                <li key={i}>
                  <a href={a.url || "#"} target="_blank" rel="noreferrer">
                    {a.name || `مرفق ${i + 1}`}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notes.length > 0 && (
          <div className="mb-4">
            <strong>ملاحظات سابقة:</strong>
            <div
              className="bg-[#f8f9fa] rounded-lg p-3 mt-[6px]"
            >
              {notes.map((n, i) => (
                <p key={i} className="my-1 text-[0.9rem]">
                  {n.content || n}
                </p>
              ))}
            </div>
          </div>
        )}

        <hr className="my-5" />

        <div className="mb-4">
          <label className="form-label font-bold">
            القرار
          </label>
          <div className="flex gap-2 flex-wrap">
            {COORDINATOR_DECISIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDecision(d.value)}
                className={`py-2 px-4 rounded-lg font-bold cursor-pointer flex items-center gap-[6px] ${
                  decision === d.value
                    ? "border-2 border-primary bg-primary text-white"
                    : "border border-gray-300 bg-white text-gray-600"
                }`}
              >
                {decisionIcons[d.value]}
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {decision && decision !== "prelim_approved" && (
          <div className="mb-4">
            <label className="form-label font-bold">
              {decision === "rejected" ? "سبب الرفض (اختياري)" : "سبب طلب التعديل"}
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                decision === "rejected"
                  ? "اكتب سبب الرفض..."
                  : "اكتب الملاحظات المطلوبة..."
              }
            />
          </div>
        )}

        {decision === "prelim_approved" && (
          <div className="mb-4">
            <label className="form-label font-bold">
              اقتراح/اختيار جهة تدريب (اختياري)
            </label>
            <select
              className="form-select"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">بدون تغيير</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions mt-5">
          <button
            className="bg-transparent border-none cursor-pointer text-[1.2rem]"
            onClick={handleClose}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            className={`bg-primary text-white py-2 px-4 rounded-lg font-bold cursor-pointer flex items-center gap-[6px] ${
              saving ? "opacity-50" : ""
            }`}
            onClick={handleSubmit}
            disabled={!decision || saving}
          >
            {saving && <LoadingSpinner size="button" />}
            تأكيد القرار
          </button>
        </div>
      </div>
    </>
  );
}
