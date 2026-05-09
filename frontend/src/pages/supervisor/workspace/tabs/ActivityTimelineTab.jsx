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
  if (error) return <div className="text-[#dc3545] p-5">⚠️ {error}</div>;

  return (
    <div>
      <h4 className="m-0 mb-4">🕐 سجل النشاط الكامل</h4>

      {!events.length ? (
        <div className="text-center p-10 text-[#999]">
          <div className="text-[2rem] mb-3">📭</div>
          لا توجد أنشطة مسجلة بعد
        </div>
      ) : (
        <div className="relative pr-6">
          {/* Timeline line */}
          <div className="absolute right-2 top-0 bottom-0 w-[2px] bg-[#dee2e6]" />

          {events.map((event, i) => {
            const cfg = EVENT_CONFIG[event.event_type] || { label: event.event_type, icon: "📌", color: "#666" };
            return (
              <div key={event.id || i} className="relative mb-5 pr-5">
                {/* Timeline dot */}
                <div
                  className="absolute right-[-20px] top-[14px] w-[14px] h-[14px] rounded-full border-[3px] border-white z-[1]"
                  style={{ background: cfg.color }}
                />

                <div
                  className="bg-white border border-[#e9ecef] rounded-[10px] p-[14px] border-r-[3px]"
                  style={{ borderRightColor: cfg.color }}
                >
                  <div className="flex justify-between items-center mb-[6px] flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[1.1rem]">{cfg.icon}</span>
                      <span className="font-semibold text-[0.9rem]" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <span className="text-[0.72rem] text-[#999]">{event.created_at || event.timestamp || ""}</span>
                  </div>

                  {event.description && (
                    <p className="m-0 text-[0.85rem] text-[#555] leading-[1.5]">
                      {event.description}
                    </p>
                  )}

                  {event.performed_by && (
                    <div className="text-[0.75rem] text-[#999] mt-[6px]">
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
