import { useToast } from "../components/Toast";

/**
 * Centralized toast hook with shorthand methods.
 * Use this instead of calling useToast() + addToast() manually.
 *
 * Usage:
 *   const toast = useAppToast();
 *   toast.success("تم الحفظ بنجاح");
 *   toast.error("حدث خطأ");
 *   toast.warning("تحذير");
 *   toast.info("معلومة");
 *
 *   // Extract error message from Axios error automatically:
 *   toast.apiError(err, "فشل تحميل البيانات");
 */
export default function useAppToast() {
  const { addToast } = useToast();

  const success = (message, duration) => addToast(message, "success", duration);
  const error   = (message, duration) => addToast(message, "error",   duration);
  const warning = (message, duration) => addToast(message, "warning", duration);
  const info    = (message, duration) => addToast(message, "info",    duration);

  const apiError = (err, fallback = "حدث خطأ غير متوقع") => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      (typeof err?.response?.data === "string" ? err.response.data : null) ||
      err?.message ||
      fallback;
    addToast(msg, "error");
  };

  return { success, error, warning, info, apiError, addToast };
}
