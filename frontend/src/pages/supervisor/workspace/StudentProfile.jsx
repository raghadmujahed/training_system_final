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
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#f0f0f0",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          → العودة للقائمة
        </button>

        {loading ? (
          <LoadingSpinner size="inline" text="جاري التحميل..." />
        ) : student ? (
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
              🎓 {student.name || "الطالب"}
              <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "400" }}>
                ({student.university_id || ""})
              </span>
            </h2>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: "0.85rem" }}>
              {student.specialization || ""} — {student.section_name || ""} — {student.site_name || ""}
            </p>
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "4px 10px", borderRadius: "16px", background: "#f8f9fa", border: "1px solid #e9ecef", fontSize: "0.78rem", fontWeight: "700" }}>
                الحالة: {academicSupervision?.status_label || "لم يباشر"}
              </span>
              <span style={{ color: "#777", fontSize: "0.78rem" }}>
                آخر تحديث: {formatDateTime(academicSupervision?.updated_at)}
                {academicSupervision?.updated_by ? ` بواسطة ${academicSupervision.updated_by}` : ""}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {student && (
        <form className="section-card" onSubmit={handleStatusSubmit} style={{ marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr auto", gap: "12px", alignItems: "end" }}>
            <label>
              <span style={{ display: "block", marginBottom: "6px", color: "#555", fontSize: "0.82rem" }}>حالة الإشراف الأكاديمي</span>
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
              <span style={{ display: "block", marginBottom: "6px", color: "#555", fontSize: "0.82rem" }}>ملاحظات الحالة</span>
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
        <div className="section-card" style={{ borderRight: "4px solid #dc3545", marginBottom: "16px" }}>
          <p style={{ color: "#dc3545", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #e9ecef",
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? "var(--primary, #4361ee)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "#555",
              border: "1px solid",
              borderColor: activeTab === tab.key ? "var(--primary, #4361ee)" : "#dee2e6",
              borderRadius: "8px",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.key ? "600" : "400",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
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
