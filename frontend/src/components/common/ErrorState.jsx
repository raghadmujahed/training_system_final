import { memo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

const ErrorState = memo(function ErrorState({
  title = "حدث خطأ",
  description = "تعذر تحميل البيانات، يرجى المحاولة مرة أخرى.",
  onRetry = null,
  icon: Icon = AlertCircle,
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-red-200 rounded-[20px] bg-red-50">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <Icon size={32} className="text-red-600" />
      </div>
      <h4 className="mb-2 text-red-800 font-bold text-lg">{title}</h4>
      <p className="m-0 text-red-700 mb-4 max-w-md mx-auto">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <RefreshCw size={16} />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
});

export default ErrorState;
