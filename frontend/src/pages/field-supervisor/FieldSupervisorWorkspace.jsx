import {
  useFieldSupervisorDashboard,
  useFieldSupervisorStudents,
  useSubtypeLabels,
} from "../../hooks/useFieldSupervisorApi";
import FieldSupervisorStudentsPanel from "./FieldSupervisorStudentsPanel";
import PageHeader from "../../components/common/PageHeader";
import { LayoutDashboard } from "lucide-react";

const COLOR_HEX = {
  blue: "#0d6efd",
  yellow: "#ffc107",
  orange: "#fd7e14",
  purple: "#6f42c1",
  red: "#dc3545",
  green: "#198754",
  indigo: "#6610f2",
  cyan: "#0dcaf0",
};

function normalizeSubtype(supervisorType) {
  if (supervisorType === "clinical_psychologist") return "psychologist";
  return supervisorType;
}

export default function FieldSupervisorWorkspace() {
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashError,
    refresh: refreshDash,
  } = useFieldSupervisorDashboard();
  const { students, loading: studentsLoading, error: studentsError, refresh: refreshStudents } =
    useFieldSupervisorStudents();

  const supervisorTypeRaw = dashboardData?.supervisor_type || "mentor_teacher";
  const supervisorType = normalizeSubtype(supervisorTypeRaw);
  const labels = useSubtypeLabels(supervisorTypeRaw);
  const stats = dashboardData?.stats || {};

  const getStatCards = () => {
    const base = [
      { title: "الطلبة المرتبطون", value: stats.students_count ?? 0, color: "blue" },
      { title: "تقارير تحتاج مراجعة (اليوم)", value: stats.unreviewed_reports_today ?? 0, color: "yellow" },
      { title: "حضور غير مسجّل اليوم", value: stats.pending_attendance_today ?? 0, color: "orange" },
      { title: "تقييمات ميدانية غير مكتملة", value: stats.incomplete_evaluations ?? 0, color: "purple" },
      { title: "تنبيهات جديدة", value: stats.new_alerts ?? 0, color: "red" },
      { title: "رسائل من المشرف الأكاديمي (غير مقروءة)", value: stats.messages_from_supervisor ?? 0, color: "green" },
    ];

    if (supervisorType === "mentor_teacher") {
      base.push(
        { title: "دروس منفّذة (مؤشر)", value: stats.lessons_conducted ?? 0, color: "indigo" },
        { title: "ملاحظات صف", value: stats.classroom_notes ?? 0, color: "cyan" }
      );
    } else if (supervisorType === "school_counselor") {
      base.push(
        { title: "تقارير إرشادية (اليوم)", value: stats.counseling_reports_today ?? 0, color: "indigo" },
        { title: "حالات مرصودة", value: stats.observed_cases ?? 0, color: "cyan" }
      );
    } else if (supervisorType === "psychologist") {
      base.push(
        { title: "تقارير مهنية موثّقة", value: stats.professional_reports ?? 0, color: "indigo" },
        { title: "جلسات موثّقة", value: stats.sessions_documented ?? 0, color: "cyan" }
      );
    }

    return base.map((c) => ({
      ...c,
      colorHex: COLOR_HEX[c.color] || COLOR_HEX.blue,
    }));
  };

  const statCards = getStatCards();
  const loading = dashboardLoading && studentsLoading;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title={`مساحة المشرف الميداني — ${labels.title}`}
        subtitle={`${dashboardData?.supervisor_type_label ? `النوع: ${dashboardData.supervisor_type_label} — ` : ""}مرحباً ${dashboardData?.profile?.user?.name || ""} — لديك ${stats.students_count ?? 0} طالب مرتبط بك.`}
      />

      {dashError && (
        <div className="fs-dash-alert">
          <p style={{ margin: 0, color: "var(--danger)" }}>{dashError}</p>
          <button type="button" className="btn-outline-custom btn-sm-custom" style={{ marginTop: 10 }} onClick={refreshDash}>
            إعادة التحميل
          </button>
        </div>
      )}

      {loading ? (
        <div className="section-card fs-panel-loading" aria-busy="true">
          جاري تحميل لوحة المشرف الميداني…
        </div>
      ) : (
        <>
          <div className="fs-stats-grid">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="fs-stat-card hover-lift"
                style={{ "--fs-stat-accent": card.colorHex }}
              >
                <p className="fs-stat-card__value">{card.value}</p>
                <p className="fs-stat-card__label">{card.title}</p>
              </div>
            ))}
          </div>

          <FieldSupervisorStudentsPanel
            students={students}
            loading={studentsLoading}
            error={studentsError}
            onRetry={refreshStudents}
          />
        </>
      )}
    </>
  );
}
