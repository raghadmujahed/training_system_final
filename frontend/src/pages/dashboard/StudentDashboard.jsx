import { useEffect, useState, useCallback, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getStudentDashboardSummary } from "../../services/api";
import { useAnnouncements } from "../../hooks/useSharedData";
import { getStudentDashboardPath, getStudentTrack } from "../../utils/studentSection";
import { readStoredUser } from "../../utils/session";
import { getTrainingRequestStatusMeta, isTaskPending } from "../../utils/status";
import {
  ClipboardList,
  FileText,
  Bell,
  Calendar,
  CheckCircle2,
  BookOpen,
  Award,
  ArrowLeft,
  Megaphone,
} from "lucide-react";
import "../../styles/student-dashboard.css";

const getStudentSpecialization = (user, track) => {
  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .trim();
  const department = user?.department || user?.data?.department;
  const departmentName = normalizeText(department?.name);
  const courseName = user?.current_section?.course_name || user?.data?.current_section?.course_name;
  const specialization = user?.specialization || user?.data?.specialization || user?.major || user?.data?.major;

  if (specialization) {
    return specialization;
  }

  if (departmentName.includes("psych") || departmentName.includes("نفس") || track === "psychology") {
    return "علم النفس";
  }

  if (
    departmentName.includes("usool") ||
    departmentName.includes("اصول") ||
    departmentName.includes("تربي") ||
    track === "education"
  ) {
    return "أصول التربية";
  }

  return department?.name || courseName || "—";
};

const getCollegeLabel = (user, track) => {
  const departmentName = String(user?.department?.name || user?.data?.department?.name || "").toLowerCase();

  if (departmentName.includes("psych") || track === "psychology") {
    return "كلية الآداب";
  }

  if (departmentName.includes("usool") || track === "education") {
    return "كلية التربية";
  }

  return user?.department?.name || user?.data?.department?.name || "—";
};

const getUserStatusLabel = (user) => {
  if (user?.status_label || user?.data?.status_label) {
    return user?.status_label || user?.data?.status_label;
  }

  const status = String(user?.status || user?.data?.status || "").toLowerCase();

  if (status === "active") return "نشط";
  if (status === "inactive") return "غير نشط";
  if (status === "suspended") return "موقوف";

  return user?.status || user?.data?.status || "—";
};

export default function StudentDashboard({ forcedTrack = null }) {
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    universityId: "",
    department: "",
    major: "",
    college: "",
    status: "",
    directorate: "",
    school: "",
    trainingRequestStatus: "",
    sectionName: "",
    courseName: "",
    academicSupervisorName: "",
    mentorName: "",
    trainingSiteName: "",
  });
  const [summaryCards, setSummaryCards] = useState([
    { title: "طلب التدريب", value: "جاري التحميل...", desc: "حالة طلب التدريب الحالي", className: "warning", icon: ClipboardList, link: "/student/training-request" },
    { title: "جدول الحصص الأسبوعية", value: "0 أيام مسجلة", desc: "عدد الأيام المضافة في البرنامج", className: "primary", icon: Calendar, link: "/student/schedule" },
    { title: "ملف الإنجاز", value: "0 ملفات", desc: "عدد الملفات المرفوعة", className: "success", icon: Award, link: "/student/portfolio" },
    { title: "التكليفات", value: "0 تكليف متبقي", desc: "التكليفات التي تحتاج متابعة", className: "accent", icon: CheckCircle2, link: "/student/assignments" },
  ]);
  const [latestItems, setLatestItems] = useState([]);
  const [latestTasks, setLatestTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: publicAnnouncements } = useAnnouncements({ per_page: 6 });
  const currentUser = useMemo(() => readStoredUser(), []);
  const detectedTrack = getStudentTrack(currentUser);
  const effectiveTrack = forcedTrack || detectedTrack || "education";

  const displaySummaryCards = useMemo(() => {
    return summaryCards.map((card) => {
      if (effectiveTrack === "psychology" && card.title === "طلب التدريب") {
        return {
          ...card,
          link: "/student/training-request-status",
          desc: "متابعة المسار (يُنشأ الطلب عبر المشرف الأكاديمي للقسم)",
        };
      }
      return card;
    });
  }, [summaryCards, effectiveTrack]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await getStudentDashboardSummary();
      const user = summary?.user || {};

      // 1. بيانات المستخدم + الشعبة + المشرفين
      const cs = user?.current_section || user?.data?.current_section || {};
      setStudentInfo(prev => ({
        ...prev,
        name: user?.name || user?.data?.name || "",
        universityId: user?.university_id || user?.data?.university_id || "",
        department: user?.department?.label || user?.data?.department?.label || getStudentSpecialization(user, effectiveTrack),
        major: user?.major || user?.data?.major || "",
        college: getCollegeLabel(user, effectiveTrack),
        status: getUserStatusLabel(user),
        sectionName: cs.section_name || "",
        courseName: cs.course_name || "",
        academicSupervisorName: cs.academic_supervisor?.name || "",
        mentorName: cs.mentor?.name || "",
        trainingSiteName: cs.training_site?.name || "",
      }));

      // 2. طلبات التدريب
      const trainingRequest = summary?.training_request || null;
      let requestStatus = "لم يتم التقديم بعد";
      let schoolName = "";
      let directorateName = "";
      if (trainingRequest) {
        requestStatus = getTrainingRequestStatusMeta(
          trainingRequest.book_status,
          trainingRequest.book_status_label || trainingRequest.status_label
        ).label;
        schoolName = trainingRequest.training_site?.name || "";
        directorateName = trainingRequest.training_site?.directorate_label || trainingRequest.training_site?.directorate || "";
      }
      setStudentInfo(prev => ({
        ...prev,
        trainingRequestStatus: requestStatus,
        school: schoolName || prev.trainingSiteName,
        directorate: directorateName,
      }));

      // 3. تحديث بطاقات الملخص
      setSummaryCards(prev =>
        prev.map(card => {
          if (card.title === "طلب التدريب") return { ...card, value: requestStatus };
          if (card.title === "التكليفات") {
            const pendingTasks = summary?.tasks?.pending_count ?? 0;
            return { ...card, value: `${pendingTasks} تكليف متبقي` };
          }
          if (card.title === "ملف الإنجاز") {
            const entriesCount = summary?.portfolio?.entries_count || 0;
            return { ...card, value: `${entriesCount} ملفات` };
          }
          if (card.title === "جدول الحصص الأسبوعية") {
            const hasProgram = !!summary?.training_program?.data?.schedule;
            const isEditable = summary?.training_program?.is_editable;
            if (!hasProgram) return { ...card, value: "لم يُعبَّأ بعد", desc: "الجدول الأسبوعي للحصص التدريبية" };
            return { ...card, value: isEditable ? "مفتوح للتعديل" : "معبأ ✓", desc: "الجدول الأسبوعي للحصص التدريبية" };
          }
          return card;
        })
      );

      // 4. آخر الإشعارات
      const notifications = Array.isArray(summary?.notifications) ? summary.notifications : [];
      const tasks = Array.isArray(summary?.tasks?.latest) ? summary.tasks.latest : [];
      const typeLabels = {
        training_request_approved: { title: "موافقة على طلب التدريب", color: "#10b981", bg: "#ecfdf5", dot: "#10b981" },
        training_request_coordinator_review: { title: "مراجعة منسق", color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
        training_request_directorate_approved: { title: "موافقة الجهة الرسمية", color: "#6366f1", bg: "#eef2ff", dot: "#6366f1" },
        training_request_directorate_approved_student: { title: "موافقة الجهة الرسمية", color: "#6366f1", bg: "#eef2ff", dot: "#6366f1" },
        training_request_school_approved_student: { title: "موافقة جهة التدريب", color: "#10b981", bg: "#ecfdf5", dot: "#10b981" },
        training_request_received_from_directorate: { title: "كتاب من الجهة الرسمية", color: "#0ea5e9", bg: "#f0f9ff", dot: "#0ea5e9" },
        training_request_directorate_rejected: { title: "رفض من الجهة الرسمية", color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
        training_request_directorate_rejected_student: { title: "رفض من الجهة الرسمية", color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
        training_request_school_rejected_student: { title: "رفض من جهة التدريب", color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
        training_request_rejected_student: { title: "رفض طلب التدريب", color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
        training_request_new_from_student: { title: "طلب جديد", color: "#0ea5e9", bg: "#f0f9ff", dot: "#0ea5e9" },
        training_request_student_resubmitted: { title: "إعادة تقديم طلب", color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
      };
      const formattedNotif = notifications.slice(0, 3).map(notif => {
        const meta = typeLabels[notif.type] || { title: "تحديث جديد", color: "#6b7280", bg: "#f9fafb", dot: "#6b7280" };
        return {
          title: meta.title,
          text: notif.message || notif.data?.message || "لا يوجد محتوى",
          color: meta.color,
          bg: meta.bg,
          dot: meta.dot,
          time: notif.created_at ? new Date(notif.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }) : "",
          read: !!notif.read_at,
        };
      });
      setLatestItems(formattedNotif);
      setLatestTasks(tasks.slice(0, 4));
    } catch (error) {
      console.error("خطأ في جلب بيانات لوحة التحكم:", error);
    } finally {
      setLoading(false);
    }
  }, [effectiveTrack]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (forcedTrack && forcedTrack !== detectedTrack && detectedTrack) {
    return <Navigate to={getStudentDashboardPath(currentUser)} replace />;
  }

  const trainingStatusLink = "/student/training-request-status";

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل لوحة التحكم..." />
    );
  }

  const announcementItems = publicAnnouncements.slice(0, 3);
  const hasSectionData =
    studentInfo.sectionName || studentInfo.academicSupervisorName || studentInfo.mentorName;

  return (
    <div className="student-dashboard" dir="rtl">
      <header className="sd-hero">
        <h1 className="sd-hero-title">مرحبًا بك في لوحة التدريب</h1>
        <p className="sd-hero-sub">تابع طلب التدريب، المهام، الحضور، والإشعارات</p>
      </header>

      <section className="sd-training-card">
        <div className="sd-training-head">
          <h2>
            <ClipboardList size={18} aria-hidden />
            متابعة التدريب
          </h2>
          <Link to={trainingStatusLink} className="sd-cta">
            متابعة حالة طلب التدريب
            <ArrowLeft size={14} aria-hidden />
          </Link>
        </div>
        <div className="sd-training-grid">
          <div className="sd-training-item sd-training-item--status">
            <span className="sd-training-label">حالة طلب التدريب</span>
            <strong className="sd-training-value">{studentInfo.trainingRequestStatus}</strong>
          </div>
          <div className="sd-training-item">
            <span className="sd-training-label">
              {effectiveTrack === "psychology" ? "الجهة المعتمدة" : "المدرسة المعتمدة"}
            </span>
            <strong className="sd-training-value">{studentInfo.school || "—"}</strong>
          </div>
          <div className="sd-training-item">
            <span className="sd-training-label">
              {effectiveTrack === "psychology" ? "الجهة/المديرية" : "مديرية التربية"}
            </span>
            <strong className="sd-training-value">{studentInfo.directorate || "—"}</strong>
          </div>
        </div>
        {effectiveTrack === "psychology" ? (
          <p className="sd-psych-note">
            يُنشأ طلب التدريب عبر المشرف الأكاديمي للقسم؛ يمكنك متابعة الحالة من الزر أعلاه.
          </p>
        ) : null}
      </section>

      {announcementItems.length > 0 ? (
        <section className="sd-announce">
          <h2 className="sd-training-head" style={{ marginBottom: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.92rem", fontWeight: 800 }}>
              <Megaphone size={18} aria-hidden />
              إعلانات عامة
            </span>
          </h2>
          <ul className="sd-announce-list">
            {announcementItems.map((a) => (
              <li key={a.id} className="sd-announce-item">
                <strong>{a.title}</strong>
                <div style={{ marginTop: "0.25rem", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{a.content}</div>
                {a.published_at ? (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-soft)", marginTop: "0.35rem" }}>
                    نُشر في {new Date(a.published_at).toLocaleString("ar-SA")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasSectionData ? (
        <section className="sd-section-block">
          <h2 className="sd-training-head" style={{ marginBottom: "0.65rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.92rem", fontWeight: 800 }}>
              <BookOpen size={18} aria-hidden />
              الشعبة والمشرفون
            </span>
          </h2>
          <div className="sd-section-grid">
            <div className="sd-section-pill">
              <span>المساق</span>
              <strong>{studentInfo.courseName || "—"}</strong>
            </div>
            <div className="sd-section-pill">
              <span>الشعبة</span>
              <strong>{studentInfo.sectionName || "—"}</strong>
            </div>
            <div className="sd-section-pill">
              <span>المشرف الأكاديمي</span>
              <strong>{studentInfo.academicSupervisorName || "لم يُعيَّن بعد"}</strong>
            </div>
            <div className="sd-section-pill">
              <span>{effectiveTrack === "psychology" ? "الأخصائي المرشد" : "المعلم المرشد"}</span>
              <strong>{studentInfo.mentorName || "لم يُعيَّن بعد"}</strong>
            </div>
          </div>
        </section>
      ) : null}

      <div className="sd-quick-grid">
        {displaySummaryCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Link key={index} to={card.link} className={`sd-quick-card ${card.className}`}>
              <div className="sd-quick-top">
                <div className="sd-quick-icon">
                  <IconComponent size={20} aria-hidden />
                </div>
                <ArrowLeft size={14} aria-hidden />
              </div>
              <div className="sd-quick-value">{card.value}</div>
              <div className="sd-quick-title">{card.title}</div>
              <div className="sd-quick-desc">{card.desc}</div>
            </Link>
          );
        })}
      </div>

      <div className="sd-feed-row">
        <section className="sd-feed-card">
          <div className="sd-feed-head">
            <h3>
              <Bell size={16} aria-hidden />
              آخر الإشعارات
            </h3>
            <Link to="/student/notifications-updates" className="sd-feed-link">
              عرض الكل
            </Link>
          </div>
          {latestItems.length === 0 ? (
            <div className="sd-empty">
              <Bell size={24} style={{ opacity: 0.35 }} aria-hidden />
              <p>لا توجد إشعارات حديثة.</p>
            </div>
          ) : (
            latestItems.map((item, index) => (
              <div
                key={index}
                className="sd-notif-item"
                style={{ backgroundColor: item.bg, border: `1px solid ${item.color}22` }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: item.dot,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                  aria-hidden
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: item.color }}>{item.title}</span>
                    {item.time ? (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", flexShrink: 0 }}>{item.time}</span>
                    ) : null}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.45 }}>{item.text}</p>
                </div>
                {!item.read ? (
                  <div
                    style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#6366f1", flexShrink: 0, marginTop: 6 }}
                    aria-hidden
                  />
                ) : null}
              </div>
            ))
          )}
        </section>

        <section className="sd-feed-card">
          <div className="sd-feed-head">
            <h3>
              <FileText size={16} aria-hidden />
              آخر التكليفات
            </h3>
            <Link to="/student/assignments" className="sd-feed-link">
              عرض الكل
            </Link>
          </div>
          {latestTasks.length === 0 ? (
            <div className="sd-empty">
              <FileText size={22} style={{ opacity: 0.35 }} aria-hidden />
              <p>لا توجد تكليفات حديثة.</p>
            </div>
          ) : (
            latestTasks.map((task) => (
              <div key={task.id} className="sd-task-item">
                <span style={{ fontWeight: 600 }}>{task.title || "تكليف"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  {task.due_date ? (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{task.due_date}</span>
                  ) : null}
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.45rem",
                      borderRadius: 999,
                      background: isTaskPending(task.status) ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: isTaskPending(task.status) ? "#92400e" : "#166534",
                    }}
                  >
                    {task.status_label || task.status || "—"}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
