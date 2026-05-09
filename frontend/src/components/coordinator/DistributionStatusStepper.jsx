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
      className="flex items-start gap-0 overflow-x-auto py-3 direction-rtl"
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
            className="flex flex-col items-center min-w-[80px] flex-[1_1_80px]"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center mb-1"
              style={{
                background: bgColor,
                color: textColor,
                border: isCurrent ? "2px solid " + textColor : "none",
              }}
            >
              {icon}
            </div>
            <span
              className="text-[0.72rem] text-center leading-[1.3]"
              style={{
                color: textColor,
                fontWeight: isCurrent ? 800 : 400,
              }}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className="w-full h-[2px] mt-1"
                style={{ background: isPast ? "#28a745" : "#dee2e6" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
