import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../../services/api";
import { isPsychologyAcademicSupervisor } from "../../../utils/psychologyWorkflow";
import { readStoredUser } from "../../../utils/session";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import OverviewTab from "./tabs/OverviewTab";
import AttendanceTab from "./tabs/AttendanceTab";
import DailyLogsTab from "./tabs/DailyLogsTab";
import PortfolioTab from "./tabs/PortfolioTab";
import TasksTab from "./tabs/TasksTab";
import TaskSubmissionsTab from "./tabs/TaskSubmissionsTab";
import FieldVisitsTab from "./tabs/FieldVisitsTab";
import EvaluationsTab from "./tabs/EvaluationsTab";
import CommunicationTab from "./tabs/CommunicationTab";
import ActivityTimelineTab from "./tabs/ActivityTimelineTab";
import ScheduleTab from "./tabs/ScheduleTab";

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: "📋" },
  { key: "attendance", label: "الحضور", icon: "📊" },
  { key: "daily-logs", label: "السجلات اليومية", icon: "📝" },
  { key: "portfolio", label: "ملف الإنجاز", icon: "📁" },
  { key: "schedule", label: "جدول الحصص", icon: "📅" },
  { key: "tasks", label: "المهام", icon: "✅" },
  { key: "submissions", label: "حلول الطلبة", icon: "📩" },
  { key: "field-visits", label: "الزيارات الميدانية", icon: "🏫" },
  { key: "evaluations", label: "التقييمات", icon: "📊" },
  { key: "communication", label: "التواصل", icon: "💬" },
  { key: "timeline", label: "سجل النشاط", icon: "🕐" },
];

const ACADEMIC_STATUS_OPTIONS = [
  { value: "not_started", label: "لم يباشر" },
  { value: "in_training", label: "قيد التدريب" },
  { value: "needs_follow_up", label: "يحتاج متابعة" },
  { value: "completed", label: "مكتمل" },
  { value: "late", label: "متأخر" },
  { value: "withdrawn", label: "منسحب" },
];

export default function StudentProfile({ studentId, onBack, onRefresh }) {
  const currentUser = readStoredUser();
  const isPsychSupervisor = isPsychologyAcademicSupervisor(currentUser);
  const visibleTabs = useMemo(() => {
    const tabs = isPsychSupervisor ? TABS.filter((t) => t.key !== "schedule") : TABS;
    if (!isPsychSupervisor) {
      return tabs.map((t) =>
        t.key === "daily-logs" ? { ...t, label: "التقرير الأسبوعي" } : t
      );
    }
    return tabs;
  }, [isPsychSupervisor]);
  const [activeTab, setActiveTab] = useState("overview");
  const [student, setStudent] = useState(null);
  const [academicSupervision, setAcademicSupervision] = useState(null);
  const [statusForm, setStatusForm] = useState({ academic_status: "not_started", note: "" });
  const [statusSaving, setStatusSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/supervisor/students/${studentId}/overview`);
      const payload = res.data?.data;
      if (!payload?.student) {
        setError(res.data?.message || "فشل تحميل بيانات الطالب");
        setStudent(null);
        return;
      }
      setStudent({
        ...payload.student,
        specialization: payload.student?.department?.name || payload.student?.specialization,
        section_name: payload.related_data?.section?.name,
        site_name: payload.related_data?.training_site?.name,
        assignment_id: payload.related_data?.assignment?.id,
        training_assignment_id: payload.related_data?.assignment?.id,
        mentor_name: payload.related_data?.field_supervisor?.name,
      });
      const supervision = payload.related_data?.academic_supervision || {};
      setAcademicSupervision(supervision);
      setStatusForm({
        academic_status: supervision.status || "not_started",
        note: supervision.note || "",
      });
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل بيانات الطالب");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const renderTab = () => {
    const props = { studentId, student, onRefresh: loadStudent, onOpenTab: setActiveTab };
    switch (activeTab) {
      case "overview": return <OverviewTab {...props} />;
      case "attendance": return <AttendanceTab {...props} />;
      case "daily-logs": return <DailyLogsTab {...props} />;
      case "portfolio": return <PortfolioTab {...props} />;
      case "schedule": return <ScheduleTab {...props} />;
      case "tasks": return <TasksTab {...props} />;
      case "submissions": return <TaskSubmissionsTab {...props} />;
      case "field-visits": return <FieldVisitsTab {...props} />;
      case "evaluations": return <EvaluationsTab {...props} />;
      case "communication": return <CommunicationTab {...props} />;
      case "timeline": return <ActivityTimelineTab {...props} />;
      default: return <OverviewTab {...props} />;
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusSaving(true);
    try {
      const res = await apiClient.patch(`/supervisor/students/${studentId}/academic-status`, statusForm);
      const updated = res.data?.data;
      if (updated) {
        setAcademicSupervision({
          status: updated.academic_status,
          status_label: updated.academic_status_label,
          note: updated.academic_status_note,
          updated_at: updated.academic_status_updated_at,
          updated_by: updated.academic_status_updated_by,
        });
        setStatusForm({
          academic_status: updated.academic_status || "not_started",
          note: updated.academic_status_note || "",
        });
      }
      onRefresh?.();
    } catch (e) {
      alert(e?.response?.data?.message || "فشل تحديث حالة الطالب");
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center gap-4 mb-4"
      >
        <button
          onClick={onBack}
          className="bg-[#f0f0f0] border-none rounded-lg p-2 cursor-pointer hover:bg-[#e0e0e0] transition-colors text-[0.9rem] flex items-center gap-2"
        >
          → العودة للقائمة
        </button>

        {loading ? (
          <LoadingSpinner size="inline" text="جاري التحميل..." />
        ) : student ? (
          <div className="flex-1">
            <h2 className="m-0 text-[1.3rem] flex items-center gap-2">
              🎓 {student.name || "الطالب"}
              <span className="text-[0.85rem] text-[#666] font-normal">
                ({student.university_id || ""})
              </span>
            </h2>
            <p className="mt-1 mb-0 text-[#888] text-[0.85rem]">
              {student.specialization || ""} — {student.section_name || ""} — {student.site_name || ""}
            </p>
            <div className="mt-2 flex gap-2 flex-wrap items-center">
              <span className="py-1 px-[10px] rounded-2xl bg-[#f8f9fa] border border-[#e9ecef] text-[0.78rem] font-bold">
                الحالة: {academicSupervision?.status_label || "لم يباشر"}
              </span>
              <span className="text-[#777] text-[0.78rem]">
                آخر تحديث: {formatDateTime(academicSupervision?.updated_at)}
                {academicSupervision?.updated_by ? ` بواسطة ${academicSupervision.updated_by}` : ""}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {student && (
        <form className="section-card mb-4" onSubmit={handleStatusSubmit}>
          <div className="grid grid-cols-[minmax(180px,240px)_1fr_auto] gap-3 items-end">
            <label>
              <span className="block mb-[6px] text-[#555] text-[0.82rem]">حالة الإشراف الأكاديمي</span>
              <select
                id="academic-status"
                name="academic_status"
                className="form-select-custom"
                value={statusForm.academic_status}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, academic_status: e.target.value }))}
              >
                {ACADEMIC_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="block mb-[6px] text-[#555] text-[0.82rem]">ملاحظات الحالة</span>
              <input
                id="academic-status-note"
                name="academic_status_note"
                className="form-input-custom"
                value={statusForm.note}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="أضف ملاحظة اختيارية عن حالة الطالب"
              />
            </label>
            <button className="btn-primary-custom" type="submit" disabled={statusSaving}>
              {statusSaving ? "جاري الحفظ..." : "تحديث الحالة"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="section-card border-r-4 border-[#dc3545] mb-4">
          <p className="text-[#dc3545] m-0">⚠️ {error}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div
        className="flex gap-1 overflow-x-auto mb-4 pb-1"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 rounded-lg text-[0.85rem] font-medium cursor-pointer transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-[#4361ee] text-white border-[#4361ee]" : "bg-transparent border-[#dee2e6]"}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{renderTab()}</div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
}
