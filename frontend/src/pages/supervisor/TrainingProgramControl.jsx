import { useEffect, useState } from "react";
import { getFeatureFlags, updateFeatureFlag } from "../../services/api";
import { useToast } from "../../components/Toast";
import {
  Loader2, Lock, Unlock, Clock, Settings,
  Shield, Users, CalendarDays, AlertTriangle,
} from "lucide-react";

export default function SupervisorTrainingProgramControl() {
  const { addToast } = useToast();
  const [flag, setFlag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const flags = await getFeatureFlags();
        const tpFlag = flags.find((f) => f.name === "training_program.edit");
        setFlag(tpFlag || null);
      } catch {
        addToast("تعذر تحميل حالة برنامج التدريب", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const toggle = async () => {
    if (!flag) return;
    setToggling(true);
    try {
      const updated = await updateFeatureFlag(flag.id, !flag.is_open);
      setFlag(updated);
      const msg = !flag.is_open
        ? "تم فتح إدخال برنامج التدريب للطلاب"
        : "تم إغلاق إدخال برنامج التدريب للطلاب";
      addToast(msg, "success");
    } catch {
      addToast("تعذر تغيير حالة برنامج التدريب", "error");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "100px 20px", minHeight: "50vh",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20, boxShadow: "0 8px 24px rgba(20,42,66,0.15)",
        }}>
          <Loader2 size={30} className="spin" color="white" />
        </div>
        <p style={{ color: "var(--text-faint)", fontSize: "0.95rem", fontWeight: 600 }}>
          جاري تحميل حالة برنامج التدريب...
        </p>
      </div>
    );
  }

  const isOpen = flag?.is_open;

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .45s ease-out}@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.25)}50%{box-shadow:0 0 0 12px rgba(59,130,246,0)}}.pulse-glow{animation:pulse-glow 2.5s ease-in-out infinite}`}</style>

      {/* ── Hero Section ── */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon"><Settings size={44} /></div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">التحكم بجدول الحصص الأسبوعية</h1>
            <p className="hero-subtitle">
              إدارة إمكانية تعبئة جدول الحصص لجميع الطلاب — فتح أو إغلاق الإدخال بضغطة واحدة
            </p>
          </div>
          {isOpen !== undefined && (
            <div style={{
              background: isOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              borderRadius: 14, padding: "10px 18px",
              display: "flex", alignItems: "center", gap: 10,
              backdropFilter: "blur(8px)", flexShrink: 0,
            }}>
              {isOpen ? (
                <Unlock size={20} color="white" />
              ) : (
                <Lock size={20} color="rgba(255,255,255,0.85)" />
              )}
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.2 }}>
                  {isOpen ? "الإدخال مفتوح" : "الإدخال مغلق"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}>
                  {isOpen ? "الطلاب يمكنهم التعديل" : "الطلاب يشاهدون فقط"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto" }}>

        {flag ? (
          <>
            {/* ── Status Overview Cards ── */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20,
            }}>
              <div style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: isOpen ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Users size={20} color={isOpen ? "#16a34a" : "#94a3b8"} />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", fontWeight: 600, marginBottom: 2 }}>تأثير الطلاب</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)" }}>
                    {isOpen ? "يمكنهم التعبئة والإرسال" : "عرض فقط — بدون تعديل"}
                  </div>
                </div>
              </div>
              <div style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: isOpen ? "linear-gradient(135deg, #dbeafe, #bfdbfe)" : "linear-gradient(135deg, #fef3c7, #fde68a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CalendarDays size={20} color={isOpen ? "#2563eb" : "#d97706"} />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", fontWeight: 600, marginBottom: 2 }}>حالة الجدول</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)" }}>
                    {isOpen ? "قابل للتعديل حالياً" : "مقفل — بانتظار الفتح"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Main Toggle Card ── */}
            <div style={{
              background: isOpen
                ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)"
                : "linear-gradient(135deg, #fef2f2 0%, #fff1f2 50%, #fff7ed 100%)",
              borderRadius: 20,
              border: `2px solid ${isOpen ? "#86efac" : "#fecaca"}`,
              padding: "32px 32px 28px",
              boxShadow: isOpen
                ? "0 8px 32px rgba(22,163,74,0.08), 0 2px 8px rgba(0,0,0,0.04)"
                : "0 8px 32px rgba(220,38,38,0.08), 0 2px 8px rgba(0,0,0,0.04)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Decorative background circles */}
              <div style={{
                position: "absolute", top: -30, left: -30,
                width: 120, height: 120, borderRadius: "50%",
                background: isOpen ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
              }} />
              <div style={{
                position: "absolute", bottom: -20, right: -20,
                width: 80, height: 80, borderRadius: "50%",
                background: isOpen ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)",
              }} />

              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                {/* Icon */}
                <div className={isOpen ? "pulse-glow" : ""} style={{
                  width: 72, height: 72, borderRadius: 20, marginBottom: 20,
                  background: isOpen
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isOpen
                    ? "0 8px 24px rgba(22,163,74,0.3)"
                    : "0 8px 24px rgba(220,38,38,0.3)",
                }}>
                  {isOpen ? <Unlock size={34} color="white" /> : <Lock size={34} color="white" />}
                </div>

                {/* Title + Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text)" }}>
                    إدخال جدول الحصص الأسبوعية
                  </h2>
                  <span style={{
                    background: isOpen ? "#dcfce7" : "#fee2e2",
                    color: isOpen ? "#166534" : "#991b1b",
                    fontSize: "0.78rem", fontWeight: 700,
                    padding: "4px 14px", borderRadius: 99,
                    border: `1px solid ${isOpen ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {isOpen ? "● مفتوح" : "● مغلق"}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  margin: "0 0 24px", fontSize: "0.88rem",
                  color: "var(--text-soft)", maxWidth: 420, lineHeight: 1.6,
                }}>
                  {isOpen
                    ? "الطلاب يمكنهم تعبئة جدول الحصص الأسبوعي وتعديله وإرساله للمراجعة. اضغط الزر أدناه لإغلاق الإدخال."
                    : "الطلاب يشاهدون الجدول فقط ولا يمكنهم التعديل. اضغط الزر أدناه لفتح الإدخال."}
                </p>

                {/* Toggle Button */}
                <button
                  onClick={toggle}
                  disabled={toggling}
                  style={{
                    padding: "14px 36px", fontSize: "1rem", fontWeight: 800,
                    background: isOpen
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    color: "#fff", border: "none", borderRadius: 14,
                    cursor: toggling ? "not-allowed" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 10,
                    opacity: toggling ? 0.6 : 1,
                    boxShadow: isOpen
                      ? "0 6px 20px rgba(220,38,38,0.3)"
                      : "0 6px 20px rgba(22,163,74,0.3)",
                    transition: "all 0.25s ease",
                    letterSpacing: "0.02em",
                  }}
                >
                  {toggling ? (
                    <Loader2 className="spin" size={18} />
                  ) : isOpen ? (
                    <Lock size={18} />
                  ) : (
                    <Unlock size={18} />
                  )}
                  {isOpen ? "إغلاق الإدخال" : "فتح الإدخال"}
                </button>
              </div>
            </div>

            {/* ── Info Note ── */}
            <div style={{
              marginTop: 16, padding: "14px 18px", borderRadius: 12,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              display: "flex", alignItems: "flex-start", gap: 10,
              fontSize: "0.82rem", color: "var(--text-soft)",
            }}>
              <Shield size={16} style={{ flexShrink: 0, marginTop: 1, color: "#64748b" }} />
              <span>
                هذا الإعداد يتحكم في إمكانية تعبئة جدول الحصص لجميع الطلاب في المنصة. عند الإغلاق، لن يتمكن أي طالب من تعديل جدوله حتى يتم الفتح مجدداً.
              </span>
            </div>
          </>
        ) : (
          <div style={{
            background: "#fff", borderRadius: 16,
            border: "1.5px solid #fecaca", padding: "32px 28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={26} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                تعذر تحميل حالة زر التحكم
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-faint)" }}>
                تأكد من اتصالك بالخادم وحاول تحديث الصفحة
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
