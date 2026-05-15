import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getStudentDashboardSummary,
  itemsFromPagedResponse,
} from "../../services/api";
import { useAnnouncements } from "../../hooks/useSharedData";
import { getStudentDashboardPath, getStudentTrack } from "../../utils/studentSection";
import { readStoredUser } from "../../utils/session";
import { getTrainingRequestStatusMeta, isTaskPending } from "../../utils/status";
import {
  User,
  GraduationCap,
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

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل لوحة التحكم..." />
    );
  }

  return (
    <>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <GraduationCap size={26} />
          </div>
          <div className="hero-text">
            <h1 className="hero-title">مرحبًا بك في لوحة التدريب 👋</h1>
            <p className="hero-subtitle">
              {effectiveTrack === "psychology"
                ? "لوحة تحكم طالب علم النفس - تابع تقدمك في التدريب الميداني"
                : "لوحة تحكم طالب أصول التربية - تابع تقدمك في التدريب الميداني"}
            </p>
          </div>
        </div>
      </div>

      {effectiveTrack === "psychology" && (
        <div
          className="bg-gradient-to-br from-[#f0f9ff] to-white border border-border rounded-[18px] p-5 mb-4 border-r-4 border-r-info"
        >
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-info to-[#0369a1] flex items-center justify-center text-white shrink-0"
            >
              <ClipboardList size={20} />
            </div>
            <div className="flex-1">
              <h4 className="m-0 mb-2 text-secondary font-extrabold text-[1.05rem]">طلب التدريب — قسم علم النفس</h4>
              <p className="m-0 text-text-soft text-[0.92rem] leading-relaxed">
                لا يتم إنشاء طلب التدريب من حساب الطالب. يقوم المشرف الأكاديمي للقسم بإنشاء الطلب ومتابعة الجهات
                الرسمية حتى صدور الموافقة النهائية من جهة التدريب.
              </p>
              <Link
                to="/student/training-request-status"
                className="inline-flex items-center gap-1.5 mt-3 font-bold text-info no-underline hover:underline"
              >
                متابعة حالة طلب التدريب <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {publicAnnouncements.length > 0 ? (
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 mb-4 border-r-4 border-r-accent">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-[10px] bg-accent/12 flex items-center justify-center text-accent">
              <Megaphone size={20} />
            </div>
            <h4 className="m-0 text-secondary font-extrabold">إعلانات عامة</h4>
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {publicAnnouncements.map((a) => (
              <li
                key={a.id}
                className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]"
              >
                <div className="font-bold mb-1.5 text-text">{a.title}</div>
                <div className="text-[0.88rem] leading-relaxed whitespace-pre-wrap text-text-soft">{a.content}</div>
                {a.published_at ? (
                  <div className="text-[0.78rem] text-text-soft mt-2">
                    نُشر في {new Date(a.published_at).toLocaleString("ar-SA")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* متابعة التدريب — بدون تكرار بيانات الحساب الأكاديمية (تُعرض في الملف الشخصي) */}
      <div className="section-card mb-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <div className="section-icon">
            <ClipboardList size={20} />
          </div>
          <h4 className="mb-0">متابعة التدريب</h4>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon-wrapper warning">
              <MapPin size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">{effectiveTrack === "psychology" ? "الجهة/المديرية" : "مديرية التربية"}</span>
              <strong className="info-value">{studentInfo.directorate || "—"}</strong>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon-wrapper primary">
              <School size={18} />
            </div>
            <div className="info-content">
              <span className="info-label">{effectiveTrack === "psychology" ? "الجهة المعتمدة" : "المدرسة المعتمدة"}</span>
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
                <span className="info-label">{effectiveTrack === "psychology" ? "الأخصائي المرشد" : "المعلم المرشد"}</span>
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
          <Link to="/student/notifications-updates" className="text-[0.82rem] text-[#6366f1] font-semibold no-underline hover:underline">عرض الكل ←</Link>
        </div>
        {latestItems.length === 0 ? (
          <div className="text-center py-8 px-4 text-text-faint">
            <Bell size={32} className="mb-2 opacity-40 mx-auto" />
            <p className="m-0 text-[0.9rem]">لا توجد إشعارات حديثة.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {latestItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3.5 rounded-xl transition-shadow"
                style={{ backgroundColor: item.bg, border: `1px solid ${item.color}22` }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-[5px]"
                  style={{ backgroundColor: item.dot, boxShadow: `0 0 0 3px ${item.dot}33` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-[0.87rem]" style={{ color: item.color }}>{item.title}</span>
                    {item.time && <span className="text-[0.73rem] text-text-faint shrink-0">{item.time}</span>}
                  </div>
                  <p className="m-0 text-[0.82rem] text-[#475569] leading-relaxed line-clamp-2">
                    {item.text}
                  </p>
                </div>
                {!item.read && (
                  <div className="w-[7px] h-[7px] rounded-full bg-[#6366f1] shrink-0 mt-1.5" />
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
          <Link to="/student/assignments" className="text-[0.82rem] text-[#6366f1] font-semibold no-underline hover:underline">عرض الكل ←</Link>
        </div>
        {latestTasks.length === 0 ? (
          <div className="text-center py-6 px-4 text-text-faint">
            <FileText size={28} className="mb-2 opacity-40 mx-auto" />
            <p className="m-0 text-[0.9rem]">لا توجد تكليفات حديثة.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {latestTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="font-semibold text-[0.85rem] text-text">{task.title || "تكليف"}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {task.due_date && <span className="text-[0.75rem] text-text-faint">{task.due_date}</span>}
                  <span className={`text-[0.73rem] font-semibold px-2 py-0.5 rounded-full ${isTaskPending(task.status) ? "bg-warning/15 text-[#92400e]" : "bg-success/15 text-[#166534]"}`}>{task.status_label || task.status || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
