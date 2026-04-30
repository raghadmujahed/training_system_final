import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";

export default function OverviewTab({ studentId, student, onOpenTab }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/overview`);
      setOverview(res.data?.data || res.data);
    } catch {
      setOverview(getDefaultOverview());
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>⏳ جاري التحميل...</div>;
  }

  const data = overview || getDefaultOverview();
  const s = student || {};
  const hasNoAssignment = overview?.has_training_assignment === false;

  const handleQuickAction = async (action) => {
    switch (action) {
      case "message_student":
        onOpenTab?.("communication");
        break;
      case "message_mentor":
        onOpenTab?.("communication");
        break;
      case "schedule_visit":
        onOpenTab?.("field-visits");
        break;
      case "add_task":
        onOpenTab?.("tasks");
        break;
      case "open_evaluation":
        onOpenTab?.("evaluations");
        break;
      case "escalate":
        if (window.confirm("هل تريد تصعيد حالة الطالب للمنسق الأكاديمي؟")) {
          try {
            await apiClient.post(`/supervisor/students/${studentId}/escalate`, {
              target: "coordinator",
              reason: "general",
              details: "تصعيد عام لحالة الطالب من لوحة المشرف الأكاديمي.",
            });
            alert("تم تصعيد الحالة بنجاح");
          } catch {
            alert("فشل تصعيد الحالة");
          }
        }
        break;
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {hasNoAssignment && (
        <div className="section-card" style={{ gridColumn: "1 / -1", borderRight: "4px solid #ffc107", backgroundColor: "#fff8e1" }}>
          <p style={{ margin: 0, color: "#856404", fontSize: "0.9rem" }}>
            ⚠️ هذا الطالب مسجل في شعبتك لكن لم يُعيّن في جهة تدريب بعد. بعض البيانات (الحضور، السجلات، التقييم) ستكون متاحة بعد تعيينه.
          </p>
        </div>
      )}
      {/* Student Info Card */}
      <div className="section-card" style={{ gridColumn: "1 / -1" }}>
        <h4 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          📋 البيانات الأساسية
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <InfoItem label="الاسم الكامل" value={s.name} />
          <InfoItem label="الرقم الجامعي" value={s.university_id} />
          <InfoItem label="التخصص" value={s.specialization} />
          <InfoItem label="الشعبة" value={s.section_name} />
          <InfoItem label="فترة التدريب" value={data.training_period} />
          <InfoItem label="جهة التدريب" value={s.site_name} />
          <InfoItem label="مدير الجهة" value={data.site_manager} />
          <InfoItem label="المشرف الميداني" value={s.mentor_name} />
          <InfoItem label="حالة التدريب" value={data.training_status} />
          <InfoItem label="نسبة الالتزام" value={data.compliance_rate != null ? `${data.compliance_rate}%` : "—"} highlight={data.compliance_rate >= 80} />
          <InfoItem label="أيام الحضور" value={data.present_days != null ? `${data.present_days} / ${data.total_days}` : "—"} />
          <InfoItem label="أيام الغياب" value={data.absent_days ?? "—"} highlight={data.absent_days === 0} />
          <InfoItem label="آخر زيارة" value={data.last_visit_date || "—"} />
          <InfoItem label="آخر مهمة" value={data.last_task || "—"} />
          <InfoItem label="آخر ملاحظة" value={data.last_note || "—"} />
          <InfoItem label="حالة التقييم النهائي" value={data.final_evaluation_status || "—"} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-card">
        <h4 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚡ إجراءات سريعة
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <ActionButton icon="💬" label="إرسال رسالة للطالب" onClick={() => handleQuickAction("message_student")} />
          <ActionButton icon="👨‍🏫" label="إرسال رسالة للمشرف الميداني" onClick={() => handleQuickAction("message_mentor")} />
          <ActionButton icon="🗓️" label="جدولة زيارة ميدانية" onClick={() => handleQuickAction("schedule_visit")} color="#6f42c1" />
          <ActionButton icon="📝" label="إضافة مهمة" onClick={() => handleQuickAction("add_task")} color="#0d6efd" />
          <ActionButton icon="📊" label="فتح التقييم الأكاديمي" onClick={() => handleQuickAction("open_evaluation")} color="#28a745" />
          <ActionButton icon="🚨" label="تصعيد الحالة للمنسق" onClick={() => handleQuickAction("escalate")} color="#dc3545" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="section-card">
        <h4 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          📊 ملخص الأداء
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <StatBox label="الحضور" value={data.attendance_rate != null ? `${data.attendance_rate}%` : "—"} color={data.attendance_rate >= 80 ? "#28a745" : "#dc3545"} />
          <StatBox label="السجلات اليومية" value={data.logs_reviewed != null ? `${data.logs_reviewed} / ${data.logs_total}` : "—"} color="#ff9800" />
          <StatBox label="ملف الإنجاز" value={data.portfolio_completion != null ? `${data.portfolio_completion}%` : "—"} color={data.portfolio_completion >= 80 ? "#28a745" : "#fd7e14"} />
          <StatBox label="المهام المكتملة" value={data.tasks_completed != null ? `${data.tasks_completed} / ${data.tasks_total}` : "—"} color="#0d6efd" />
          <StatBox label="الزيارات المنفذة" value={data.visits_completed ?? "—"} color="#6f42c1" />
          <StatBox label="التقييم الميداني" value={data.field_evaluation_score != null ? `${data.field_evaluation_score}%` : "لم يُدخل"} color="#20c997" />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }) {
  return (
    <div>
      <span style={{ fontSize: "0.75rem", color: "#999", display: "block", marginBottom: "2px" }}>{label}</span>
      <span style={{
        fontSize: "0.9rem",
        fontWeight: "500",
        color: highlight === true ? "#28a745" : highlight === false ? "#dc3545" : "#333",
      }}>
        {value || "—"}
      </span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        textAlign: "right",
        width: "100%",
        transition: "all 0.2s",
        borderRight: `3px solid ${color || "#4361ee"}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eef0ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#f8f9fa";
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      {label}
    </button>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div
      style={{
        padding: "12px",
        background: color + "10",
        borderRadius: "8px",
        textAlign: "center",
        border: `1px solid ${color}20`,
      }}
    >
      <div style={{ fontSize: "1.2rem", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "#666", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function getDefaultOverview() {
  return {
    training_period: "—",
    site_manager: "—",
    training_status: "—",
    compliance_rate: null,
    present_days: null,
    total_days: null,
    absent_days: null,
    last_visit_date: null,
    last_task: null,
    last_note: null,
    final_evaluation_status: "—",
    attendance_rate: null,
    logs_reviewed: null,
    logs_total: null,
    portfolio_completion: null,
    tasks_completed: null,
    tasks_total: null,
    visits_completed: null,
    field_evaluation_score: null,
  };
}
