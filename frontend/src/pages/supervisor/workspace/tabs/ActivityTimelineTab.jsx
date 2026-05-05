import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

const EVENT_CONFIG = {
  attendance_recorded: { label: "تسجيل حضور", icon: "📊", color: "#28a745" },
  attendance_comment: { label: "تعليق على الحضور", icon: "💬", color: "#17a2b8" },
  daily_log_submitted: { label: "رفع سجل يومي", icon: "📝", color: "#0d6efd" },
  daily_log_reviewed: { label: "اعتماد سجل يومي", icon: "✅", color: "#28a745" },
  daily_log_comment: { label: "تعليق على السجل", icon: "💬", color: "#17a2b8" },
  portfolio_uploaded: { label: "رفع ملف إنجاز", icon: "📁", color: "#6f42c1" },
  portfolio_comment: { label: "تعليق على ملف الإنجاز", icon: "💬", color: "#17a2b8" },
  task_created: { label: "إنشاء مهمة", icon: "✅", color: "#0d6efd" },
  task_submitted: { label: "تسليم مهمة", icon: "📩", color: "#17a2b8" },
  task_graded: { label: "تقييم مهمة", icon: "📊", color: "#28a745" },
  visit_scheduled: { label: "جدولة زيارة", icon: "🗓️", color: "#6f42c1" },
  visit_completed: { label: "رفع تقرير زيارة", icon: "🏫", color: "#28a745" },
  field_evaluation: { label: "إدخال تقييم ميداني", icon: "🏃", color: "#fd7e14" },
  academic_evaluation: { label: "إدخال تقييم أكاديمي", icon: "🎓", color: "#28a745" },
  message_sent: { label: "إرسال رسالة / تنبيه", icon: "💬", color: "#4361ee" },
  status_change: { label: "تغيير حالة", icon: "🔄", color: "#ffc107" },
  escalation: { label: "تصعيد حالة", icon: "🚨", color: "#dc3545" },
};

export default function ActivityTimelineTab({ studentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/timeline`, { params: { per_page: 200 } });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setEvents(rows.map(normalizeTimelineEvent));
    } catch {
      setError("فشل تحميل سجل النشاط");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  if (loading) return <LoadingSpinner size="section" text="جاري التحميل..." />;
  if (error) return <div style={{ color: "#dc3545", padding: "20px" }}>⚠️ {error}</div>;

  return (
    <div>
      <h4 style={{ margin: "0 0 16px" }}>🕐 سجل النشاط الكامل</h4>

      {!events.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          لا توجد أنشطة مسجلة بعد
        </div>
      ) : (
        <div style={{ position: "relative", paddingRight: "24px" }}>
          {/* Timeline line */}
          <div style={{ position: "absolute", right: "8px", top: "0", bottom: "0", width: "2px", background: "#dee2e6" }} />

          {events.map((event, i) => {
            const cfg = EVENT_CONFIG[event.event_type] || { label: event.event_type, icon: "📌", color: "#666" };
            return (
              <div key={event.id || i} style={{ position: "relative", marginBottom: "20px", paddingRight: "20px" }}>
                {/* Timeline dot */}
                <div style={{
                  position: "absolute", right: "-20px", top: "14px",
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: cfg.color, border: "3px solid #fff",
                  boxShadow: "0 0 0 2px #dee2e6",
                  zIndex: 1,
                }} />

                <div style={{
                  background: "#fff", border: "1px solid #e9ecef",
                  borderRadius: "10px", padding: "14px",
                  borderRight: `3px solid ${cfg.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.1rem" }}>{cfg.icon}</span>
                      <span style={{ fontWeight: "600", fontSize: "0.9rem", color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#999" }}>{event.created_at || event.timestamp || ""}</span>
                  </div>

                  {event.description && (
                    <p style={{ margin: "0", fontSize: "0.85rem", color: "#555", lineHeight: "1.5" }}>
                      {event.description}
                    </p>
                  )}

                  {event.performed_by && (
                    <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "6px" }}>
                      بواسطة: {event.performed_by}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizeTimelineEvent(event) {
  const typeMap = {
    attendance: "attendance_recorded",
    daily_log: "daily_log_submitted",
    visit: "visit_scheduled",
    task: "task_created",
    evaluation: "academic_evaluation",
  };

  return {
    ...event,
    event_type: event.event_type || typeMap[event.type] || event.type || "activity",
    created_at: event.created_at || event.datetime || event.timestamp,
    description: event.description || buildDescription(event),
  };
}

function buildDescription(event) {
  const data = event.data || {};
  if (event.type === "attendance") return `حالة الحضور: ${data.status || "—"}`;
  if (event.type === "daily_log") return data.title || data.description || "سجل يومي";
  if (event.type === "visit") return `زيارة ${data.status || ""}`;
  if (event.type === "task") return data.title || "مهمة";
  if (event.type === "evaluation") return data.status || "تقييم";
  return "";
}
