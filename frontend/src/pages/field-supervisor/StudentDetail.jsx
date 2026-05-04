import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  useFieldSupervisorStudent,
  useSubtypeLabels,
} from "../../hooks/useFieldSupervisorApi";
import PageHeader from "../../components/common/PageHeader";
import {
  User,
  CheckCircle,
  FileText,
  Star,
  MessageCircle,
  Activity,
  FileStack,
} from "lucide-react";
import { ymdLocal } from "../../utils/fieldSupervisorQueues";

import OverviewTab from "./tabs/OverviewTab";
import AttendanceTab from "./tabs/AttendanceTab";
import DailyReportsTab from "./tabs/DailyReportsTab";
import EvaluationTab from "./tabs/EvaluationTab";
import StudentFormsTab from "./tabs/StudentFormsTab";
import CommunicationTab from "./tabs/CommunicationTab";
import TimelineTab from "./tabs/TimelineTab";

const VALID_TABS = [
  "overview",
  "attendance",
  "daily-reports",
  "evaluation",
  "forms",
  "communication",
  "timeline",
];

const TAB_ROWS = [
  { id: "overview", label: "نظرة عامة", icon: User },
  { id: "attendance", label: "الحضور والغياب", icon: CheckCircle },
  { id: "daily-reports", labelKey: "dailyReport", icon: FileText },
  { id: "evaluation", labelKey: "evaluation", icon: Star },
  { id: "forms", label: "النماذج والتقارير", icon: FileStack },
  { id: "communication", label: "الملاحظات والرسائل", icon: MessageCircle },
  { id: "timeline", label: "السجل الزمني", icon: Activity },
];

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "overview"
  );

  const { student, loading, error, refresh } = useFieldSupervisorStudent(studentId);
  const supervisorType = student?.supervisor_type || "mentor_teacher";
  const labels = useSubtypeLabels(supervisorType);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const onTabChange = (value) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <>
        <PageHeader title="ملف الطالب" subtitle="جاري تحميل البيانات..." />
        <div className="section-card fs-panel-loading" aria-busy="true">
          جاري التحميل…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="ملف الطالب" subtitle="تعذر تحميل البيانات" />
        <div className="section-card fs-panel-error">
          <p className="text-danger mb-0">{error}</p>
          <button type="button" className="btn-primary-custom btn-sm-custom fs-forms-retry" onClick={refresh}>
            إعادة المحاولة
          </button>
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <PageHeader title="ملف الطالب" />
        <div className="section-card text-center">
          <p className="text-soft">الطالب غير موجود</p>
          <button type="button" className="btn-outline-custom fs-forms-retry" onClick={() => navigate("/field-supervisor/students")}>
            العودة لقائمة الطلبة
          </button>
        </div>
      </>
    );
  }

  const studentData = student?.student || student;
  const attendance = student?.attendance || {};
  const evaluation = student?.evaluation || {};
  const requiredHours = attendance.required_training_hours ?? 0;
  const todayYmd = ymdLocal();
  const lastReport = student?.last_report;
  const todayReportSummary =
    lastReport && lastReport.date === todayYmd
      ? lastReport.status_label || lastReport.status || "—"
      : "لا يوجد تقرير لليوم";
  const attendanceTodayLabel =
    student?.last_attendance === todayYmd ? "حضور اليوم: مسجّل" : "حضور اليوم: غير مسجّل";

  const evaluationSummary = (() => {
    if (!evaluation || Object.keys(evaluation).length === 0) {
      return "لم يبدأ";
    }
    if (evaluation.is_final || evaluation.status === "submitted" || evaluation.status === "reviewed") {
      const parts = [evaluation.status_label || "مُكتمل"];
      if (evaluation.total_score != null) {
        parts.push(`${evaluation.total_score}`);
      }
      if (evaluation.grade_label) {
        parts.push(`(${evaluation.grade_label})`);
      }
      return parts.filter(Boolean).join(" ");
    }
    return evaluation.status_label || evaluation.status || "—";
  })();

  return (
    <>
      <div className="fs-back-row">
        <button
          type="button"
          className="btn-outline-custom btn-sm-custom"
          onClick={() => navigate("/field-supervisor/students")}
        >
          ← العودة لقائمة الطلبة
        </button>
      </div>

      <PageHeader
        icon={User}
        title={studentData.name || "ملف الطالب"}
        subtitle={
          <>
            <span className="text-soft">
              {studentData.university_id} — {studentData.specialization || "—"}
              {studentData.department ? ` — ${studentData.department}` : ""}
            </span>
            {studentData.section && (
              <span className="badge-custom badge-primary" style={{ marginInlineStart: 8 }}>
                {studentData.section}
              </span>
            )}
            {studentData.training_type && (
              <span className="badge-custom badge-info" style={{ marginInlineStart: 8 }}>
                {studentData.training_type}
              </span>
            )}
          </>
        }
      />

      <div className="section-card fs-student-header-summary" style={{ marginBottom: "1rem" }}>
        <div className="fs-student-header-summary__grid">
          <div>
            <span className="text-soft fs-forms-meta">جهة التدريب</span>
            <div className="fw-bold">{studentData.training_site || "—"}</div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">نوع المشرف الميداني</span>
            <div className="fw-bold">{student?.supervisor_type_label || "—"}</div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">حالة الحضور اليوم</span>
            <div>
              <span className={`badge-custom ${student?.last_attendance === todayYmd ? "badge-success" : "badge-warning"}`}>
                {attendanceTodayLabel}
              </span>
            </div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">تقرير اليوم</span>
            <div>
              <span className="badge-custom badge-info">{todayReportSummary}</span>
            </div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">التقييم الميداني</span>
            <div className="fw-bold">{evaluationSummary}</div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">نسبة الحضور (أيام مسجّلة)</span>
            <div className="fw-bold">{attendance.attendance_rate ?? 0}%</div>
          </div>
          <div>
            <span className="text-soft fs-forms-meta">تاريخ بدء التدريب</span>
            <div className="fw-bold">{studentData.training_start || "—"}</div>
          </div>
          {student?.last_attendance ? (
            <div>
              <span className="text-soft fs-forms-meta">آخر يوم حضور مسجّل</span>
              <div className="fw-bold">{student.last_attendance}</div>
            </div>
          ) : null}
          {requiredHours > 0 ? (
            <div>
              <span className="text-soft fs-forms-meta">الساعات (منجز / مطلوب)</span>
              <div className="fw-bold">
                {attendance.completed_training_hours ?? 0} / {requiredHours}
                {attendance.remaining_training_hours != null ? (
                  <span className="text-soft fs-forms-meta" style={{ marginInlineStart: 6 }}>
                    (متبقي {attendance.remaining_training_hours})
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="tabs">
        {TAB_ROWS.map((row) => {
          const label = row.labelKey ? labels[row.labelKey] : row.label;
          const Icon = row.icon;
          return (
            <button
              key={row.id}
              type="button"
              className={activeTab === row.id ? "tab-active" : "tab"}
              onClick={() => onTabChange(row.id)}
            >
              <span className="fs-tab-label">
                <Icon size={16} aria-hidden />
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        {activeTab === "overview" && <OverviewTab studentId={studentId} labels={labels} />}
        {activeTab === "attendance" && <AttendanceTab studentId={studentId} />}
        {activeTab === "daily-reports" && <DailyReportsTab studentId={studentId} />}
        {activeTab === "evaluation" && <EvaluationTab studentId={studentId} labels={labels} />}
        {activeTab === "forms" && (
          <StudentFormsTab studentId={studentId} studentName={studentData.name} />
        )}
        {activeTab === "communication" && <CommunicationTab studentId={studentId} />}
        {activeTab === "timeline" && <TimelineTab studentId={studentId} />}
      </div>
    </>
  );
}
