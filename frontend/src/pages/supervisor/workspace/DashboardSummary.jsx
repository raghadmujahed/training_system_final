const CARDS = [
  { key: "sections_count", label: "الشعب المشرف عليها", icon: "📚", color: "#4361ee", bg: "#eef0ff" },
  { key: "students_count", label: "الطلبة المشرف عليهم", icon: "👥", color: "#3a0ca3", bg: "#ede7f6" },
  { key: "visits_this_week", label: "زيارات مجدولة هذا الأسبوع", icon: "🗓️", color: "#f72585", bg: "#fce4ec" },
  { key: "unreviewed_logs", label: "سجلات يومية غير مراجعة", icon: "📝", color: "#ff9800", bg: "#fff3e0" },
  { key: "absence_alerts", label: "طلبة بغياب أو تأخر", icon: "⚠️", color: "#dc3545", bg: "#ffebee" },
  { key: "incomplete_portfolios", label: "ملفات إنجاز غير مكتملة", icon: "📁", color: "#6f42c1", bg: "#ede7f6" },
  { key: "pending_task_reviews", label: "مهام بانتظار التقييم", icon: "✅", color: "#0d6efd", bg: "#e3f2fd" },
  { key: "unevaluated_students", label: "طلبة بدون تقييم نهائي", icon: "📊", color: "#20c997", bg: "#e0f7fa" },
];

export default function DashboardSummary({ stats, loading }) {
  if (!stats) return null;
  const supervisor = stats.supervisor_profile || {};
  const department = stats.department_summary?.department || supervisor.department || "غير محدد";
  const statusDistribution = Array.isArray(stats.academic_status_distribution)
    ? stats.academic_status_distribution
    : [];

  return (
    <>
      <div className="section-card mb-4 flex justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[0.82rem] text-[#666] mb-1">المشرف الأكاديمي</div>
          <h2 className="m-0 text-[1.35rem]">{supervisor.name || "—"}</h2>
          <div className="text-[#666] mt-1">القسم: {department}</div>
        </div>
        <div className="min-w-[220px]">
          <div className="text-[0.82rem] text-[#666] mb-2">توزيع حالات الطلاب</div>
          <div className="flex gap-2 flex-wrap">
            {statusDistribution.length ? statusDistribution.map((item) => (
              <span key={item.status} className="py-1 px-[10px] rounded-2xl bg-[#f8f9fa] border border-[#e9ecef] text-[0.78rem]">
                {item.label}: {item.count}
              </span>
            )) : <span className="text-[#999]">لا توجد حالات بعد</span>}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
      >
        {CARDS.map((card) => {
          const value = stats[card.key] ?? 0;
          const isUrgent = ["absence_alerts", "unreviewed_logs", "unevaluated_students"].includes(card.key) && value > 0;
          return (
            <div
              key={card.key}
              className="bg-white rounded-xl p-5 relative overflow-hidden border border-[#f0f0f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
              <div className="flex-1">
                <div className="text-[0.8rem] text-[#666] mb-1">{card.label}</div>
                <div className="text-[1.6rem] font-bold" style={{ color: card.color }}>
                  {loading ? "—" : value}
                </div>
              </div>
              {isUrgent && (
                <div
                  className="absolute top-2 left-2 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: card.color }}
                />
              )}
            </div>
          );
        })}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    </>
  );
}
