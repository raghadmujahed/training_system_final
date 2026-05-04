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
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)" }}>
        <p style={{ margin: 0 }}>{error}</p>
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
      <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <Activity size={20} style={{ color: "var(--primary)" }} />
        سجل النشاط
      </h4>

      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
          <Clock size={48} style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: 0 }}>لا توجد أحداث مسجلة</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sortedDates.map((date) => (
            <div key={date}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "var(--card-bg, #fff)",
                  paddingBottom: 8,
                  marginBottom: 12,
                  borderBottom: "1px solid var(--border-color, #e5e7eb)",
                }}
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
                style={{
                  marginRight: 12,
                  paddingRight: 16,
                  borderRight: "2px solid var(--border-color, #e5e7eb)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {groupedEvents[date].map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  const theme = eventTheme(event.color);
                  return (
                    <div key={`${date}-${index}`} style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          right: -25,
                          top: 10,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#fff",
                          border: `3px solid ${theme.border}`,
                          boxSizing: "border-box",
                        }}
                      />
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${theme.border}`,
                          background: theme.bg,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ marginTop: 2 }}>
                            <Icon size={20} style={{ color: theme.border }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <p style={{ margin: 0, fontWeight: 600 }}>{event.title}</p>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {event.time}
                              </span>
                            </div>
                            {event.description && (
                              <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.9 }}>
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
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--border-color, #e5e7eb)",
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>مفتاح الأحداث:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
