import { useState, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", durationMs) => {
    const id = Date.now();
    const fallback =
      type === "error" ? 6500 : type === "warning" ? 5500 : 3800;
    const ms = typeof durationMs === "number" ? durationMs : fallback;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none"
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            onClick={() => removeToast(toast.id)}
            dir="rtl"
            style={{
              padding: "14px 20px",
              borderRadius: "10px",
              fontSize: "0.92rem",
              fontWeight: 600,
              lineHeight: 1.45,
              color: toast.type === "warning" ? "#1a1a1a" : "#fff",
              backgroundColor:
                toast.type === "success"
                  ? "#28a745"
                  : toast.type === "error"
                    ? "#dc3545"
                    : "#ffc107",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              pointerEvents: "auto",
              cursor: "pointer",
              animation: "toastIn 0.3s ease",
              whiteSpace: "normal",
              maxWidth: "min(480px, 94vw)",
              textAlign: "right",
            }}
          >
            <span style={{ flexShrink: 0, lineHeight: 1.2 }}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "⚠️"}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
