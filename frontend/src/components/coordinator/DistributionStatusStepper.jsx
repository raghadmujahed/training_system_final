import { CheckCircle2, XCircle, Clock, Send, ArrowLeft } from "lucide-react";
import { STATUS_LABELS } from "../../config/coordinator/statusLabels";
import { getActiveWorkflowSteps, getWorkflowStepIndex } from "../../config/coordinator/workflowSteps";

export default function DistributionStatusStepper({
  currentStatus,
  governingBody,
}) {
  const steps = getActiveWorkflowSteps(governingBody);
  const currentIndex = getWorkflowStepIndex(currentStatus);

  const isRejected =
    currentStatus?.includes("rejected") ||
    currentStatus === "coordinator_rejected";

  const rejectedStep = isRejected
    ? steps.find((s) => s.key === currentStatus)
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        overflowX: "auto",
        padding: "12px 0",
        direction: "rtl",
      }}
    >
      {steps.map((step, idx) => {
        const stepOrder = step.order;
        const isCurrent = step.key === currentStatus;
        const isPast = currentIndex > stepOrder && !isRejected;
        const isRejectedStep = rejectedStep && step.key === rejectedStep.key;

        let bgColor = "#e9ecef";
        let textColor = "#6c757d";
        let icon = <Clock size={14} />;

        if (isPast) {
          bgColor = "#d4edda";
          textColor = "#155724";
          icon = <CheckCircle2 size={14} />;
        } else if (isCurrent && !isRejected) {
          bgColor = "#cce5ff";
          textColor = "#004085";
          icon = <ArrowLeft size={14} />;
        } else if (isRejectedStep) {
          bgColor = "#f8d7da";
          textColor = "#721c24";
          icon = <XCircle size={14} />;
        }

        return (
          <div
            key={step.key}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 80,
              flex: "1 1 80px",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: bgColor,
                color: textColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                border: isCurrent ? "2px solid " + textColor : "none",
              }}
            >
              {icon}
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                textAlign: "center",
                color: textColor,
                fontWeight: isCurrent ? 800 : 400,
                lineHeight: 1.3,
              }}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                style={{
                  width: "100%",
                  height: 2,
                  background: isPast ? "#28a745" : "#dee2e6",
                  marginTop: 4,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
