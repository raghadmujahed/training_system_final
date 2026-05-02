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
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.65rem 1rem", background: "#fee2e2", color: "#dc2626",
          borderRadius: 10, marginBottom: "1rem", border: "1px solid #fecaca",
          fontSize: "0.85rem", fontWeight: 600,
        }}>
          <XCircle size={16} /> تم رفض الطلب — راجع التفاصيل أدناه.
        </div>
      )}

      {/* Horizontal Stepper */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", padding: "0.5rem 0" }}>
        {steps.map((step, idx) => {
          const floor = stepFloor(step);
          const isDone = !rejected && r >= floor;
          const active = step.keys.includes(String(bookStatus || ""));
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.label} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : "1 1 0", minWidth: 0 }}>
              {/* Step circle + label */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.82rem", fontWeight: 800,
                  background: isDone ? "#10b981"
                    : active ? "#1e3a5f"
                    : "#e2e8f0",
                  color: isDone || active ? "white" : "#94a3b8",
                  boxShadow: active ? "0 0 0 3px rgba(30,58,95,0.15)" : "none",
                  transition: "all 0.2s",
                }}>
                  {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                </div>
                <span style={{
                  fontSize: "0.72rem", fontWeight: active ? 800 : isDone ? 700 : 500,
                  color: active ? "#1e3a5f" : isDone ? "#059669" : "#94a3b8",
                  textAlign: "center", whiteSpace: "nowrap",
                }}>
                  {step.label}
                </span>
                {active && (
                  <span style={{
                    fontSize: "0.62rem", fontWeight: 700, color: "#1e3a5f",
                    background: "#dbeafe", padding: "1px 6px", borderRadius: 99,
                    display: "flex", alignItems: "center", gap: 2,
                  }}>
                    <Clock size={9} /> حالياً
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  flex: 1, height: 3, marginTop: 17,
                  background: isDone ? "#10b981" : "#e2e8f0",
                  borderRadius: 2, minWidth: 20,
                  transition: "background 0.3s",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
