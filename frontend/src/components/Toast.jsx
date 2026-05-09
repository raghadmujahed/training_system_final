import { useState, useCallback, createContext, useContext, useEffect, useRef } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const CONFIG = {
  success: {
    bg: "#16a34a",
    border: "#15803d",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    duration: 3800,
  },
  error: {
    bg: "#dc2626",
    border: "#b91c1c",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    duration: 6500,
  },
  warning: {
    bg: "#d97706",
    border: "#b45309",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    duration: 5500,
  },
  info: {
    bg: "#2563eb",
    border: "#1d4ed8",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    duration: 4500,
  },
};

function ToastItem({ toast, onRemove }) {
  const cfg = CONFIG[toast.type] ?? CONFIG.info;
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const total = toast.duration;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / total) * 100);
      setProgress(pct);
      if (pct <= 0) clearInterval(intervalRef.current);
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [toast.duration]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      dir="rtl"
      className="relative overflow-hidden min-w-[280px] max-w-[420px] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] pointer-events-auto text-white font-inherit animate-[toastSlideIn_0.32s_cubic-bezier(0.34,1.56,0.64,1)]"
      style={{
        maxWidth: "min(440px, 92vw)",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <div className="flex items-start gap-3 p-[14px_16px_12px]">
        <span className="shrink-0 mt-[1px] opacity-95">{cfg.icon}</span>
        <span className="flex-1 text-[0.9rem] font-semibold leading-[1.5] text-right">
          {toast.message}
        </span>
        <button
          onClick={() => onRemove(toast.id)}
          aria-label="إغلاق"
          className="shrink-0 bg-transparent border-none cursor-pointer p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity text-[1.1rem] leading-none"
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.75)"}
        >
          ✕
        </button>
      </div>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 right-0 h-[3px] rounded-bl-xl"
        style={{
        width: `${progress}%`,
        background: "rgba(255,255,255,0.45)",
        transition: "width 0.05s linear",
      }} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", durationMs) => {
    const cfg = CONFIG[type] ?? CONFIG.info;
    const duration = typeof durationMs === "number" ? durationMs : cfg.duration;
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration + 100);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-[10px] pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-18px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
