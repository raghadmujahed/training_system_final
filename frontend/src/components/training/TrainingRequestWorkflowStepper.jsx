import { CheckCircle2, XCircle, Clock } from "lucide-react";

const STEPS_EDUCATION = [
  { keys: ["draft", "sent_to_coordinator", "coordinator_under_review"], label: "المنسق" },
  { keys: ["prelim_approved", "batched_pending_send"], label: "المديرية" },
  { keys: ["sent_to_directorate", "directorate_approved"], label: "اعتماد المديرية" },
  { keys: ["sent_to_school"], label: "جهة التدريب" },
  { keys: ["school_approved"], label: "مقبول" },
];

const STEPS_HEALTH = [
  { keys: ["draft", "sent_to_coordinator", "coordinator_under_review"], label: "المنسق" },
  { keys: ["prelim_approved", "batched_pending_send"], label: "وزارة الصحة" },
  { keys: ["sent_to_health_ministry"], label: "اعتماد الوزارة" },
  { keys: ["sent_to_school"], label: "الجهة التدريبية" },
  { keys: ["school_approved"], label: "مقبول" },
];

const ORDERED = [
  "draft", "sent_to_coordinator", "coordinator_under_review", "needs_edit",
  "coordinator_rejected", "prelim_approved", "batched_pending_send",
  "sent_to_directorate", "directorate_approved", "directorate_rejected",
  "sent_to_health_ministry", "health_ministry_rejected",
  "sent_to_school", "school_approved", "school_rejected", "rejected",
];

const REJECT_KEYS = new Set(["coordinator_rejected", "directorate_rejected", "school_rejected", "health_ministry_rejected", "rejected"]);

function rank(status) { const i = ORDERED.indexOf(String(status || "")); return i === -1 ? 0 : i; }
function stepFloor(step) { return Math.min(...step.keys.map(k => { const i = ORDERED.indexOf(k); return i === -1 ? 999 : i; })); }

export default function TrainingRequestWorkflowStepper({ bookStatus, governingBody }) {
  const isHealth = governingBody === "ministry_of_health";
  const steps = isHealth ? STEPS_HEALTH : STEPS_EDUCATION;
  const r = rank(bookStatus);
  const rejected = REJECT_KEYS.has(String(bookStatus || ""));

  // Find current step index
  let currentIdx = -1;
  steps.forEach((step, idx) => { if (step.keys.includes(String(bookStatus || ""))) currentIdx = idx; });

  return (
    <div>
      {rejected && (
        <div className="flex items-center gap-2 py-[0.65rem] px-4 bg-[#fee2e2] text-[#dc2626] rounded-[10px] mb-4 border border-[#fecaca] text-[0.85rem] font-semibold">
          <XCircle size={16} /> تم رفض الطلب — راجع التفاصيل أدناه.
        </div>
      )}

      {/* Horizontal Stepper */}
      <div className="flex items-start gap-0 overflow-x-auto py-2">
        {steps.map((step, idx) => {
          const floor = stepFloor(step);
          const isDone = !rejected && r >= floor;
          const active = step.keys.includes(String(bookStatus || ""));
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.label} className={"flex items-start " + (isLast ? "flex-none" : "flex-[1_1_0] min-w-0")}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-[0.4rem] shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[0.82rem] font-extrabold transition-all"
                  style={{
                    background: isDone ? "#10b981" : active ? "#1e3a5f" : "#e2e8f0",
                    color: isDone || active ? "white" : "#94a3b8",
                    boxShadow: active ? "0 0 0 3px rgba(30,58,95,0.15)" : "none",
                  }}>
                  {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                </div>
                <span className="text-[0.72rem] text-center whitespace-nowrap"
                  style={{
                    fontWeight: active ? 800 : isDone ? 700 : 500,
                    color: active ? "#1e3a5f" : isDone ? "#059669" : "#94a3b8",
                  }}>
                  {step.label}
                </span>
                {active && (
                  <span className="text-[0.62rem] font-bold text-[#1e3a5f] bg-[#dbeafe] py-[1px] px-[6px] rounded-full flex items-center gap-[2px]">
                    <Clock size={9} /> حالياً
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 h-[3px] mt-[17px] rounded-[2px] min-w-[20px] transition-[background] duration-300"
                  style={{ background: isDone ? "#10b981" : "#e2e8f0" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
