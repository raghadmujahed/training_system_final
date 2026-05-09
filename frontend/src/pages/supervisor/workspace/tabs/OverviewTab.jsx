import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../components/Toast";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";

export default function OverviewTab({ studentId, student, onOpenTab }) {
  const { addToast } = useToast();
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
    return <LoadingSpinner size="section" text="جاري التحميل..." />;
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
            addToast("تم تصعيد الحالة بنجاح", "success");
          } catch {
            addToast("فشل تصعيد الحالة", "error");
          }
        }
        break;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-5">
      {hasNoAssignment && (
        <div className="section-card col-span-2 border-r-4 border-[#ffc107] bg-[#fff8e1]">
          <p className="m-0 text-[#856404] text-[0.9rem]">
            ⚠️ هذا الطالب مسجل في شعبتك لكن لم يُعيّن في جهة تدريب بعد. بعض البيانات (الحضور، السجلات، التقييم) ستكون متاحة بعد تعيينه.
          </p>
        </div>
      )}
      {/* Student Info Card */}
      <div className="section-card col-span-2">
        <h4 className="m-0 mb-4 flex items-center gap-2">
          📋 البيانات الأساسية
        </h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
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
        <h4 className="m-0 mb-4 flex items-center gap-2">
          ⚡ إجراءات سريعة
        </h4>
        <div className="flex flex-col gap-[10px]">
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
        <h4 className="m-0 mb-4 flex items-center gap-2">
          📊 ملخص الأداء
        </h4>
        <div className="grid grid-cols-2 gap-3">
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
      <span className="text-[0.75rem] text-[#999] block mb-[2px]">{label}</span>
      <span
        className="text-[0.9rem] font-medium"
        style={{ color: highlight === true ? "#28a745" : highlight === false ? "#dc3545" : "#333" }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[10px] p-3 rounded-lg border border-[#eee] bg-white cursor-pointer transition-colors text-[0.88rem] w-full text-right border-r-[3px]"
      style={{ color: color || "#333", borderRightColor: color || "#4361ee" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eef0ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#f8f9fa";
      }}
    >
      <span className="text-[1.1rem]">{icon}</span>
      {label}
    </button>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div
      className="p-3 rounded-lg text-center"
      style={{
        background: color + "10",
        border: `1px solid ${color}20`,
      }}
    >
      <div className="text-[1.2rem] font-bold" style={{ color }}>{value}</div>
      <div className="text-[0.72rem] text-[#666] mt-1">{label}</div>
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
