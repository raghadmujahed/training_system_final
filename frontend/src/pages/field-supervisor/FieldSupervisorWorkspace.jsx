import React from "react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  useFieldSupervisorDashboard,
  useFieldSupervisorStudents,
  useSubtypeLabels,
} from "../../hooks/useFieldSupervisorApi";
import FieldSupervisorStudentsPanel from "./FieldSupervisorStudentsPanel";
import PageHeader from "../../components/common/PageHeader";
import { LayoutDashboard, Megaphone } from "lucide-react";
import { useAnnouncements } from "../../hooks/useSharedData";
import { normalizeFieldSupervisorType } from "../../utils/fieldSupervisorType";

const COLOR_HEX = {
  blue: "#0d6efd",
  yellow: "#ffc107",
  orange: "#fd7e14",
  indigo: "#6610f2",
  cyan: "#0dcaf0",
};

export default function FieldSupervisorWorkspace() {
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashError,
    refresh: refreshDash,
  } = useFieldSupervisorDashboard();
  const { students, loading: studentsLoading, error: studentsError, refresh: refreshStudents } =
    useFieldSupervisorStudents();

  const { data: announcements, loading: announcementsLoading, error: announcementsErrorObj } = useAnnouncements({ per_page: 10, status: "active" });
  const announcementsError = announcementsErrorObj ? (
    announcementsErrorObj?.response?.data?.message || announcementsErrorObj?.response?.data?.error || "تعذر تحميل الإعلانات"
  ) : "";

  const supervisorTypeRaw = dashboardData?.supervisor_type || "mentor_teacher";
  const supervisorType = normalizeFieldSupervisorType(supervisorTypeRaw);
  const labels = useSubtypeLabels(supervisorTypeRaw);
  const stats = dashboardData?.stats || {};

  const getStatCards = () => {
    const base = [
      { title: "الطلبة المرتبطون", value: stats.students_count ?? 0, color: "blue" },
      { title: "تقارير تحتاج مراجعة (اليوم)", value: stats.unreviewed_reports_today ?? 0, color: "yellow" },
      { title: "حضور غير مسجّل اليوم", value: stats.pending_attendance_today ?? 0, color: "orange" },
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
          <p className="m-0 text-[var(--danger)]">{dashError}</p>
          <button type="button" className="btn-outline-custom btn-sm-custom mt-[10px]" onClick={refreshDash}>
            إعادة التحميل
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="section" text="جاري تحميل لوحة المشرف الميداني..." />
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

          <div
            className="section-card fs-announcements-panel mb-[1.25rem] border-r-4 border-r-[var(--primary)]"
          >
            <div className="flex items-center gap-[10px] mb-[14px]">
              <div
                className="section-icon"
                style={{
                  background: "linear-gradient(135deg, var(--primary) 0%, #0a2540 100%)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <Megaphone size={20} aria-hidden />
              </div>
              <h4 className="m-0 text-[1.05rem] font-extrabold text-[var(--primary)]">
                الإعلانات
              </h4>
            </div>

            {announcementsLoading ? (
              <p className="text-soft m-0">
                جاري تحميل الإعلانات…
              </p>
            ) : announcementsError ? (
              <p className="m-0 text-[var(--danger)] text-[0.92rem]">{announcementsError}</p>
            ) : announcements.length === 0 ? (
              <p className="text-soft m-0 text-[0.92rem]">
                لا توجد إعلانات موجّهة إليك حالياً. تظهر هنا الإعلانات النشطة التي يحددها المنسّق أو الإدارة
                (حسب الدور أو القسم أو المستخدم).
              </p>
            ) : (
              <ul className="fs-announcements-list">
                {announcements.map((a) => (
                  <li key={a.id} className="fs-announcement-item">
                    <div className="fs-announcement-item__title">{a.title}</div>
                    <div className="fs-announcement-item__body">{a.content}</div>
                    {a.published_at ? (
                      <div className="fs-announcement-item__meta">
                        نُشر في {new Date(a.published_at).toLocaleString("ar-SA")}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FieldSupervisorStudentsPanel
            students={students}
            loading={studentsLoading}
            error={studentsError}
            onRetry={refreshStudents}
            panelTitle="الطلبة المتدربون"
            titleHref="/field-supervisor/students"
          />
        </>
      )}
    </>
  );
}
