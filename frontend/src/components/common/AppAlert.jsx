import { memo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * مكون Alert موحد للنظام
 * 
 * @param {string} variant - نوع التنبيه: 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - عنوان التنبيه
 * @param {React.ReactNode} children - محتوى التنبيه
 * @param {boolean} dismissible - إمكانية الإغلاق
 * @param {Function} onDismiss - معالج الإغلاق
 * @param {string} className - classes إضافية
 */
const AppAlert = memo(function AppAlert({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  className = "",
}) {
  const styles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle2,
      iconColor: "text-green-600",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: XCircle,
      iconColor: "text-red-600",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: Info,
      iconColor: "text-blue-600",
    },
  };

  const { bg, border, text, icon: Icon, iconColor } = styles[variant];

  return (
    <div className={`${bg} ${border} ${text} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} flex-shrink-0 mt-0.5`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className={`${text} hover:opacity-70 transition-opacity flex-shrink-0 ml-2`}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
});

export default AppAlert;
