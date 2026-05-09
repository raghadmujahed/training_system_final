import { useStudentTimeline } from "../../../hooks/useFieldSupervisorApi";
import {
  CheckCircle,
  FileText,
  Star,
  MessageCircle,
  Activity,
  Clock,
} from "lucide-react";

function eventTheme(color) {
  const map = {
    green: { border: "#22c55e", bg: "rgba(34, 197, 94, 0.08)" },
    red: { border: "#ef4444", bg: "rgba(239, 68, 68, 0.08)" },
    yellow: { border: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
    blue: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
    purple: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.08)" },
  };
  return map[color] || map.blue;
}

/**
 * تبويب سجل النشاط (Timeline)
 */
export default function TimelineTab({ studentId }) {
  const { events, loading, error } = useStudentTimeline(studentId);

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card border-r-[4px] border-[var(--danger)]">
        <p className="m-0">{error}</p>
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case "attendance":
        return CheckCircle;
      case "report":
        return FileText;
      case "evaluation":
        return Star;
      case "message":
        return MessageCircle;
      default:
        return Activity;
    }
  };

  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  return (
    <div className="section-card">
      <h4 className="mt-0 flex items-center gap-2">
        <Activity size={20} className="text-[var(--primary)]" />
        سجل النشاط
      </h4>

      {events.length === 0 ? (
        <div className="text-center py-12 px-4 text-[var(--text-muted)]">
          <Clock size={48} className="opacity-35 mb-3" />
          <p className="m-0">لا توجد أحداث مسجلة</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div
                className="sticky top-0 z-[2] pb-2 mb-3 border-b border-[var(--border-color,#e5e7eb)]"
                style={{ background: "var(--card-bg, #fff)" }}
              >
                <span className="badge-custom badge-info">
                  {new Date(date).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div
                className="mr-3 pr-4 border-r-2 border-[var(--border-color,#e5e7eb)] flex flex-col gap-3"
              >
                {groupedEvents[date].map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  const theme = eventTheme(event.color);
                  return (
                    <div key={`${date}-${index}`} className="relative">
                      <div
                        className="absolute -right-[25px] top-[10px] w-3 h-3 rounded-full bg-white box-border"
                        style={{ border: `3px solid ${theme.border}` }}
                      />
                      <div
                        className="p-3 rounded-lg"
                        style={{
                          border: `1px solid ${theme.border}`,
                          background: theme.bg,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-[2px]">
                            <Icon size={20} style={{ color: theme.border }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="flex items-start justify-between gap-2 flex-wrap"
                            >
                              <p className="m-0 font-semibold">{event.title}</p>
                              <span
                                className="text-xs text-[var(--text-muted)] whitespace-nowrap"
                              >
                                {event.time}
                              </span>
                            </div>
                            {event.description && (
                              <p className="mt-2 mb-0 text-sm opacity-90">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-6 pt-4 border-t border-[var(--border-color,#e5e7eb)]"
      >
        <p className="text-sm font-semibold mb-3">مفتاح الأحداث:</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Legend dot="#22c55e" label="حضور" />
          <Legend dot="#3b82f6" label="تقرير" />
          <Legend dot="#a855f7" label="تقييم" />
          <Legend dot="#eab308" label="رسالة" />
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-[14px] h-[14px] rounded-full shrink-0"
        style={{ background: dot }}
      />
      <span>{label}</span>
    </div>
  );
}
