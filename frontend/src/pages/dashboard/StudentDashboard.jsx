import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  getStudentDashboardSummary,
  getAnnouncements,
  itemsFromPagedResponse,
} from "../../services/api";
import { getStudentDashboardPath, getStudentTrack } from "../../utils/studentSection";
import { readStoredUser } from "../../utils/session";
import { useStudentTrack, TRACK_CONFIG } from "../../hooks/useStudentTrack";
import { getTrainingRequestStatusMeta, isTaskPending } from "../../utils/status";
import {
  User,
  IdCard,
  GraduationCap,
  Building2,
  School,
  MapPin,
  ClipboardList,
  FileText,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  ArrowLeft,
  Loader2,
  Megaphone,
} from "lucide-react";

const getStudentSpecialization = (user, config) => {
  const specialization = user?.specialization || user?.data?.specialization || user?.major || user?.data?.major;
  if (specialization) return specialization;
  return config.specializationLabel;
};

const getCollegeLabel = (user, config) => {
  const departmentName = user?.department?.name || user?.data?.department?.name;
  if (departmentName === "psychology" || config.isPsychology) return config.collegeLabel;
  if (departmentName === "usool_tarbiah" || config.isEducation) return config.collegeLabel;
  return departmentName || "—";
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
  const [publicAnnouncements, setPublicAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef(null);
  const currentUser = useMemo(() => readStoredUser(), []);
  const { track: detectedTrack, config: detectedConfig } = useStudentTrack();
  const effectiveTrack = forcedTrack || detectedTrack || "education";
  const config = forcedTrack && forcedTrack !== detectedTrack
    ? (forcedTrack === "psychology" ? TRACK_CONFIG.psychology : TRACK_CONFIG.education)
    : detectedConfig;

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
    // إلغاء أي طلب سابق قبل بدء طلب جديد
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setLoading(true);
    try {
      const summary = await getStudentDashboardSummary({ signal });
      let announcementsList = [];
      try {
        const annRes = await getAnnouncements({ per_page: 6 });
        announcementsList = itemsFromPagedResponse(annRes);
      } catch {
        announcementsList = [];
      }
      const user = summary?.user || {};

      // 1. بيانات المستخدم + الشعبة + المشرفين
      const cs = user?.current_section || user?.data?.current_section || {};
      setStudentInfo(prev => ({
        ...prev,
        name: user?.name || user?.data?.name || "",
        universityId: user?.university_id || user?.data?.university_id || "",
        department: user?.department?.label || user?.data?.department?.label || getStudentSpecialization(user, config),
        major: user?.major || user?.data?.major || "",
        college: getCollegeLabel(user, config),
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
      setPublicAnnouncements(announcementsList);
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
        return;
      }
      console.error("خطأ في جلب بيانات لوحة التحكم:", error);
    } finally {
      // فقط إذا لم يتم الإلغاء ننهي حالة التحميل
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [effectiveTrack, config]);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      // إلغاء أي طلب قيد التنفيذ عند إزالة المكون
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDashboardData]);

  if (forcedTrack && forcedTrack !== detectedTrack && detectedTrack) {
    return <Navigate to={getStudentDashboardPath(currentUser)} replace />;
  }

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <Loader2 size={40} className="animate-spin text-primary mb-3" />
        <p className="text-muted">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <GraduationCap size={48} />
          </div>
          <div className="hero-text">
            <h1 className="hero-title">مرحباً، {studentInfo.name || "طالب"} 👋</h1>
            <p className="hero-subtitle">
              {config.dashboardTitle}
            </p>
          </div>
        </div>
      </div>

      {effectiveTrack === "psychology" && (
        <div
          className="section-card mb-4"
          style={{
            borderRight: "4px solid #0284c7",
            background: "linear-gradient(135deg, #f0f9ff 0%, #fff 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              className="section-icon"
              style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", flexShrink: 0 }}
            >
              <ClipboardList size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>طلب التدريب — قسم علم النفس</h4>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.65, color: "var(--text-soft)" }}>
                لا يتم إنشاء طلب التدريب من حساب الطالب. يقوم المشرف الأكاديمي للقسم بإنشاء الطلب ومتابعة الجهات
                الرسمية حتى صدور الموافقة النهائية من جهة التدريب.
              </p>
              <Link
                to="/student/training-request-status"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  fontWeight: 700,
                  color: "#0284c7",
                  textDecoration: "none",
                }}
              >
                متابعة حالة طلب التدريب <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {publicAnnouncements.length > 0 ? (
        <div className="section-card mb-4" style={{ borderRight: "4px solid var(--accent, #b08d57)" }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="section-icon">
              <Megaphone size={20} />
            </div>
            <h4 className="mb-0">إعلانات عامة</h4>
          </div>
          <ul className="list-unstyled mb-0" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {publicAnnouncements.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{a.title}</div>
                <div style={{ fontSize: "0.88rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{a.content}</div>
                {a.published_at ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 8 }}>
                    نُشر في {new Date(a.published_at).toLocaleString("ar-SA")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Student Info Cards */}
      <div className="section-card mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <div className="section-icon">
            <User size={20} />
          </div>
          <h4 className="mb-0">المعلومات الأساسية</h4>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <User size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">اسم الطالب</span>
              <strong className="info-value">{studentInfo.name || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper accent">
              <IdCard size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">الرقم الجامعي</span>
              <strong className="info-value">{studentInfo.universityId || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper info">
              <Building2 size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">الكلية</span>
              <strong className="info-value">{studentInfo.college}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper accent">
              <BookOpen size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">التخصص</span>
              <strong className="info-value">{studentInfo.major || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper success">
              <BookOpen size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">القسم</span>
              <strong className="info-value">{studentInfo.department || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper warning">
              <MapPin size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">{config.directorateLabel}</span>
              <strong className="info-value">{studentInfo.directorate || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <School size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">{config.siteLabel}</span>
              <strong className="info-value">{studentInfo.school || "—"}</strong>
            </div>
          </div>
          <div className="info-card highlight">
            <div className="info-icon-wrapper danger">
              <ClipboardList size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">حالة طلب التدريب</span>
              <strong className="info-value">{studentInfo.trainingRequestStatus}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Section & Supervisors Card — يظهر عند تسجيل الطالب في شعبة */}
      {(studentInfo.sectionName || studentInfo.academicSupervisorName || studentInfo.mentorName) && (
        <div className="section-card mb-4">
          <div className="d-flex align-items-center gap-2 mb-4">
            <div className="section-icon">
              <BookOpen size={20} />
            </div>
            <h4 className="mb-0">الشعبة والمشرفون</h4>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon-wrapper primary">
                <BookOpen size={18} />
              </div>
              <div className="info-content">
                <span className="info-label">المساق</span>
                <strong className="info-value">{studentInfo.courseName || "—"}</strong>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon-wrapper info">
                <ClipboardList size={18} />
              </div>
              <div className="info-content">
                <span className="info-label">الشعبة</span>
                <strong className="info-value">{studentInfo.sectionName || "—"}</strong>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon-wrapper accent">
                <User size={18} />
              </div>
              <div className="info-content">
                <span className="info-label">المشرف الأكاديمي</span>
                <strong className="info-value">{studentInfo.academicSupervisorName || "لم يُعيَّن بعد"}</strong>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon-wrapper success">
                <School size={18} />
              </div>
              <div className="info-content">
                <span className="info-label">{config.mentorLabel}</span>
                <strong className="info-value">{studentInfo.mentorName || "لم يُعيَّن بعد"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="dashboard-grid mb-4">
        {displaySummaryCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Link key={index} to={card.link} className="stat-card-link">
              <div className={`stat-card-modern ${card.className}`}>
                <div className="stat-card-header">
                  <div className={`stat-icon-modern ${card.className}`}>
                    <IconComponent size={22} />
                  </div>
                  <ArrowLeft size={16} className="stat-arrow" />
                </div>
                <div className="stat-card-body">
                  <div className="stat-value-modern">{card.value}</div>
                  <div className="stat-title-modern">{card.title}</div>
                </div>
                <div className="stat-meta-modern">{card.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-card">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="section-icon"><Bell size={20} /></div>
            <h4 className="mb-0">آخر الإشعارات والتحديثات</h4>
          </div>
          <Link to="/student/notifications-updates" style={{ fontSize: "0.82rem", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>عرض الكل ←</Link>
        </div>
        {latestItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8" }}>
            <Bell size={32} style={{ marginBottom: "0.5rem", opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>لا توجد إشعارات حديثة.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {latestItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  backgroundColor: item.bg,
                  border: `1px solid ${item.color}22`,
                  transition: "box-shadow 0.2s",
                }}
              >
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  backgroundColor: item.dot, marginTop: "5px", flexShrink: 0,
                  boxShadow: `0 0 0 3px ${item.dot}33`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.87rem", color: item.color }}>{item.title}</span>
                    {item.time && <span style={{ fontSize: "0.73rem", color: "#94a3b8", flexShrink: 0 }}>{item.time}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.5,
                    overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.text}
                  </p>
                </div>
                {!item.read && (
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%",
                    backgroundColor: "#6366f1", flexShrink: 0, marginTop: "6px" }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-card mt-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="section-icon"><FileText size={20} /></div>
            <h4 className="mb-0">آخر التكليفات</h4>
          </div>
          <Link to="/student/assignments" style={{ fontSize: "0.82rem", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>عرض الكل ←</Link>
        </div>
        {latestTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "#94a3b8" }}>
            <FileText size={28} style={{ marginBottom: "0.4rem", opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>لا توجد تكليفات حديثة.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {latestTasks.map((task) => (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.75rem 1rem", borderRadius: "10px",
                backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" }}>{task.title || "تكليف"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                  {task.due_date && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{task.due_date}</span>}
                  <span style={{
                    fontSize: "0.73rem", fontWeight: 600, padding: "2px 8px", borderRadius: "99px",
                    backgroundColor: isTaskPending(task.status) ? "#fef3c7" : "#dcfce7",
                    color: isTaskPending(task.status) ? "#92400e" : "#166534",
                  }}>{task.status_label || task.status || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
