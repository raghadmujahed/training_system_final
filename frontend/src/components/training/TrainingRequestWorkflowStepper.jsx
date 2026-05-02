import { CheckCircle2, Circle } from "lucide-react";

const STEPS_EDUCATION = [
  { keys: ["draft", "sent_to_coordinator", "coordinator_under_review"], label: "تم تقديم الطلب / قيد مراجعة المنسق" },
  { keys: ["needs_edit"], label: "بحاجة تعديل" },
  { keys: ["prelim_approved", "batched_pending_send"], label: "معتمد مبدئيًا من المنسق (ليس قبولاً نهائياً)" },
  { keys: ["sent_to_directorate"], label: "أُرسل إلى المديرية" },
  { keys: ["directorate_approved"], label: "معتمد من المديرية" },
  { keys: ["sent_to_school"], label: "قيد مراجعة جهة التدريب" },
  { keys: ["school_approved"], label: "مقبول نهائيًا من جهة التدريب" },
];

const STEPS_HEALTH = [
  { keys: ["draft", "sent_to_coordinator", "coordinator_under_review"], label: "تم تقديم الطلب / قيد مراجعة المنسق" },
  { keys: ["needs_edit"], label: "بحاجة تعديل" },
  { keys: ["prelim_approved", "batched_pending_send"], label: "معتمد مبدئيًا من المنسق" },
  { keys: ["sent_to_health_ministry"], label: "مرسل لوزارة الصحة" },
  { keys: ["sent_to_school"], label: "قيد مراجعة الجهة التدريبية" },
  { keys: ["school_approved"], label: "مقبول نهائيًا" },
];

const ORDERED = [
  "draft",
  "sent_to_coordinator",
  "coordinator_under_review",
  "needs_edit",
  "coordinator_rejected",
  "prelim_approved",
  "batched_pending_send",
  "sent_to_directorate",
  "directorate_approved",
  "directorate_rejected",
  "sent_to_health_ministry",
  "health_ministry_rejected",
  "sent_to_school",
  "school_approved",
  "school_rejected",
  "rejected",
];

const REJECT_KEYS = new Set([
  "coordinator_rejected",
  "directorate_rejected",
  "school_rejected",
  "health_ministry_rejected",
  "rejected",
]);

function rank(status) {
  const i = ORDERED.indexOf(String(status || ""));
  return i === -1 ? 0 : i;
}

function stepFloor(step) {
  return Math.min(
    ...step.keys.map((k) => {
      const i = ORDERED.indexOf(k);
      return i === -1 ? 999 : i;
    })
  );
}

export default function TrainingRequestWorkflowStepper({ bookStatus, governingBody }) {
  const isHealth = governingBody === "ministry_of_health";
  const steps = isHealth ? STEPS_HEALTH : STEPS_EDUCATION;
  const r = rank(bookStatus);
  const rejected = REJECT_KEYS.has(String(bookStatus || ""));

  return (
    <div className="section-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 12px", fontSize: "1rem" }}>مسار طلب التدريب</h4>
      {rejected && (
        <p className="text-danger" style={{ marginBottom: 12 }}>
          تم رفض الطلب أو إيقافه في إحدى المراحل — راجع التفاصيل والإشعارات.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step) => {
          const floor = stepFloor(step);
          const isDone = !rejected && r >= floor;
          const active = step.keys.includes(String(bookStatus || ""));
          return (
            <div
              key={step.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: isDone || active ? 1 : 0.4,
              }}
            >
              {isDone ? (
                <CheckCircle2 size={20} style={{ color: "var(--success, #198754)", flexShrink: 0 }} />
              ) : (
                <Circle size={20} color="#adb5bd" style={{ flexShrink: 0 }} />
              )}
              <span style={{ fontWeight: active ? 700 : 500 }}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
