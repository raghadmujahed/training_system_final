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
      <div className="flex flex-col items-center justify-center py-[100px] px-5 min-h-[50vh]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", boxShadow: "0 8px 24px rgba(20,42,66,0.15)" }}>
          <Loader2 size={30} className="spin" color="white" />
        </div>
        <p className="text-[var(--text-faint)] text-[0.95rem] font-semibold">
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
          <div className="hero-icon"><Settings size={26} /></div>
          <div className="flex-1">
            <h1 className="hero-title">التحكم بجدول الحصص الأسبوعية</h1>
            <p className="hero-subtitle">
              إدارة إمكانية تعبئة جدول الحصص لجميع الطلاب — فتح أو إغلاق الإدخال بضغطة واحدة
            </p>
          </div>
          {isOpen !== undefined && (
            <div className="rounded-[14px] py-[10px] px-[18px] flex items-center gap-[10px] shrink-0" style={{ background: isOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" }}>
              {isOpen ? (
                <Unlock size={20} color="white" />
              ) : (
                <Lock size={20} color="rgba(255,255,255,0.85)" />
              )}
              <div>
                <div className="text-white font-bold text-[0.85rem] leading-[1.2]">
                  {isOpen ? "الإدخال مفتوح" : "الإدخال مغلق"}
                </div>
                <div className="text-[rgba(255,255,255,0.6)] text-[0.7rem]">
                  {isOpen ? "الطلاب يمكنهم التعديل" : "الطلاب يشاهدون فقط"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="fade-up max-w-[720px] mx-auto">

        {flag ? (
          <>
            {/* ── Status Overview Cards ── */}
            <div className="grid grid-cols-2 gap-[14px] mb-5">
              <div className="bg-white rounded-[14px] py-[18px] px-5 border-[1.5px] border-[#e2e8f0] flex items-center gap-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{ background: isOpen ? "linear-gradient(135deg, #dcfce7, #bbf7d0)" : "#f1f5f9" }}>
                  <Users size={20} color={isOpen ? "#16a34a" : "#94a3b8"} />
                </div>
                <div>
                  <div className="text-[0.78rem] text-[var(--text-faint)] font-semibold mb-[2px]">تأثير الطلاب</div>
                  <div className="text-[0.92rem] font-bold text-[var(--text)]">
                    {isOpen ? "يمكنهم التعبئة والإرسال" : "عرض فقط — بدون تعديل"}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[14px] py-[18px] px-5 border-[1.5px] border-[#e2e8f0] flex items-center gap-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{ background: isOpen ? "linear-gradient(135deg, #dbeafe, #bfdbfe)" : "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                  <CalendarDays size={20} color={isOpen ? "#2563eb" : "#d97706"} />
                </div>
                <div>
                  <div className="text-[0.78rem] text-[var(--text-faint)] font-semibold mb-[2px]">حالة الجدول</div>
                  <div className="text-[0.92rem] font-bold text-[var(--text)]">
                    {isOpen ? "قابل للتعديل حالياً" : "مقفل — بانتظار الفتح"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Main Toggle Card ── */}
            <div className="rounded-[20px] py-8 px-8 pb-7 relative overflow-hidden" style={{
              background: isOpen
                ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)"
                : "linear-gradient(135deg, #fef2f2 0%, #fff1f2 50%, #fff7ed 100%)",
              border: `2px solid ${isOpen ? "#86efac" : "#fecaca"}`,
              boxShadow: isOpen
                ? "0 8px 32px rgba(22,163,74,0.08), 0 2px 8px rgba(0,0,0,0.04)"
                : "0 8px 32px rgba(220,38,38,0.08), 0 2px 8px rgba(0,0,0,0.04)",
            }}>
              {/* Decorative background circles */}
              <div className="absolute -top-[30px] -left-[30px] w-[120px] h-[120px] rounded-full" style={{ background: isOpen ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)" }} />
              <div className="absolute -bottom-[20px] -right-[20px] w-[80px] h-[80px] rounded-full" style={{ background: isOpen ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)" }} />

              <div className="relative flex flex-col items-center text-center">
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
                <div className="flex items-center gap-[10px] mb-2 flex-wrap justify-center">
                  <h2 className="m-0 text-[1.2rem] font-extrabold text-[var(--text)]">
                    إدخال جدول الحصص الأسبوعية
                  </h2>
                  <span className="text-[0.78rem] font-bold py-1 px-[14px] rounded-full" style={{
                    background: isOpen ? "#dcfce7" : "#fee2e2",
                    color: isOpen ? "#166534" : "#991b1b",
                    border: `1px solid ${isOpen ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {isOpen ? "● مفتوح" : "● مغلق"}
                  </span>
                </div>

                {/* Description */}
                <p className="m-0 mb-6 text-[0.88rem] text-[var(--text-soft)] max-w-[420px] leading-[1.6]">
                  {isOpen
                    ? "الطلاب يمكنهم تعبئة جدول الحصص الأسبوعي وتعديله وإرساله للمراجعة. اضغط الزر أدناه لإغلاق الإدخال."
                    : "الطلاب يشاهدون الجدول فقط ولا يمكنهم التعديل. اضغط الزر أدناه لفتح الإدخال."}
                </p>

                {/* Toggle Button */}
                <button
                  onClick={toggle}
                  disabled={toggling}
                  className="py-[14px] px-9 text-base font-extrabold text-white border-none rounded-[14px] inline-flex items-center gap-[10px] transition-all duration-[250ms] ease-[ease] tracking-[0.02em]"
                  style={{
                    background: isOpen
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    cursor: toggling ? "not-allowed" : "pointer",
                    opacity: toggling ? 0.6 : 1,
                    boxShadow: isOpen
                      ? "0 6px 20px rgba(220,38,38,0.3)"
                      : "0 6px 20px rgba(22,163,74,0.3)",
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
            <div className="mt-4 py-[14px] px-[18px] rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-start gap-[10px] text-[0.82rem] text-[var(--text-soft)]">
              <Shield size={16} className="shrink-0 mt-[1px] text-[#64748b]" />
              <span>
                هذا الإعداد يتحكم في إمكانية تعبئة جدول الحصص لجميع الطلاب في المنصة. عند الإغلاق، لن يتمكن أي طالب من تعديل جدوله حتى يتم الفتح مجدداً.
              </span>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border-[1.5px] border-[#fecaca] py-8 px-7 flex flex-col items-center gap-[14px] text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 rounded-[14px] bg-[#fef2f2] flex items-center justify-center">
              <AlertTriangle size={26} color="#dc2626" />
            </div>
            <div>
              <h3 className="m-0 mb-[6px] text-base font-bold text-[var(--text)]">
                تعذر تحميل حالة زر التحكم
              </h3>
              <p className="m-0 text-[0.85rem] text-[var(--text-faint)]">
                تأكد من اتصالك بالخادم وحاول تحديث الصفحة
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
