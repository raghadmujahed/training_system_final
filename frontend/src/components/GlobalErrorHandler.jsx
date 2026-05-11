import { useEffect } from "react";
import useAppToast from "../hooks/useAppToast";

/**
 * Global error handler component that listens for API error events
 * and displays toast notifications accordingly.
 */
export default function GlobalErrorHandler({ children }) {
  const toast = useAppToast();

  useEffect(() => {
    const handleForbidden = (event) => {
      const { message } = event.detail || {};
      toast.error(message || "لا تملك صلاحية تنفيذ هذه العملية");
    };

    // Listen for 403 forbidden errors from API
    window.addEventListener("api-forbidden", handleForbidden);

    return () => {
      window.removeEventListener("api-forbidden", handleForbidden);
    };
  }, [toast]);

  return children;
}
