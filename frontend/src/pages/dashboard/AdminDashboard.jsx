import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardStats,
  getRecentActivities,
  getLatestAnnouncement,
} from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import {
  LayoutDashboard,
  MapPin,
  GraduationCap,
  Clock,
  Users,
  Building2,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  Archive,
  Database,
  Bell,
  ClipboardCheck,
  ChevronLeft,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_students: 0,
    total_sites: 0,
    completed_evaluations: 0,
    pending_reports: 0,
  });

  const [activities, setActivities] = useState([]);
  const [announcement, setAnnouncement] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await getDashboardStats();
        setStats({
          total_users: statsData.total_users || 0,
          total_students: statsData.total_students || 0,
          total_sites: statsData.total_sites || 0,
          completed_evaluations: statsData.completed_evaluations || 0,
          pending_reports: statsData.pending_evaluations || 0,
        });

        const activitiesData = await getRecentActivities(4);
        setActivities(activitiesData?.data?.data || activitiesData?.data || []);

        const announcementData = await getLatestAnnouncement();
        setAnnouncement(announcementData || null);
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="page" text="جاري تحميل البيانات..." />;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-[12px] p-4 text-center text-sm">
        حدث خطأ أثناء تحميل البيانات، يرجى المحاولة مرة أخرى.
      </div>
    );
  }

  const statCards = [
    { title: "إجمالي المستخدمين", value: stats.total_users, icon: Users, color: "border-r-info", bg: "bg-info/8" },
    { title: "إجمالي الطلبة", value: stats.total_students, icon: GraduationCap, color: "border-r-success", bg: "bg-success/8" },
    { title: "أماكن التدريب", value: stats.total_sites, icon: MapPin, color: "border-r-accent", bg: "bg-accent/8" },
    { title: "التقييمات المعلقة", value: stats.pending_reports, icon: Clock, color: "border-r-primary", bg: "bg-primary/8" },
  ];

  const quickActions = [
    { title: "إدارة المستخدمين", description: "إضافة وتعديل وحذف المستخدمين", icon: Users, path: "/admin/users", color: "from-blue-500 to-blue-600" },
    { title: "إدارة الأقسام", description: "إدارة الأقسام الأكاديمية", icon: Building2, path: "/admin/departments", color: "from-indigo-500 to-indigo-600" },
    { title: "إدارة المساقات", description: "إدارة المساقات الدراسية", icon: BookOpen, path: "/admin/courses", color: "from-purple-500 to-purple-600" },
    { title: "إدارة الشعب", description: "إدارة شعب التدريب", icon: LayoutDashboard, path: "/admin/sections", color: "from-pink-500 to-pink-600" },
    { title: "الفترات التدريبية", description: "إدارة فترات التدريب", icon: Calendar, path: "/admin/training-periods", color: "from-orange-500 to-orange-600" },
    { title: "أماكن التدريب", description: "إدارة أماكن التدريب", icon: MapPin, path: "/admin/training-sites", color: "from-amber-500 to-amber-600" },
    { title: "الإعلانات", description: "إدارة الإعلانات العامة", icon: Bell, path: "/admin/announcements", color: "from-teal-500 to-teal-600" },
    { title: "قوالب التقييم", description: "إدارة قوالب التقييم", icon: ClipboardCheck, path: "/admin/evaluation-templates", color: "from-cyan-500 to-cyan-600" },
    { title: "الأرشفة", description: "أرشفة البيانات القديمة", icon: Archive, path: "/admin/archive", color: "from-gray-500 to-gray-600" },
    { title: "النسخ الاحتياطي", description: "إدارة النسخ الاحتياطية", icon: Database, path: "/admin/backups", color: "from-slate-500 to-slate-600" },
    { title: "سجل النشاطات", description: "عرض سجل نشاطات النظام", icon: FileText, path: "/admin/activity-logs", color: "from-zinc-500 to-zinc-600" },
    { title: "إعدادات النظام", description: "إعدادات النظام العامة", icon: Settings, path: "/admin/feature-flags", color: "from-neutral-500 to-neutral-600" },
  ];

  return (
    <div className="admin-dashboard mx-auto w-full max-w-[1400px] min-w-0 space-y-3 sm:space-y-4">
      <PageHeader
        title="لوحة تحكم مدير النظام"
        subtitle="نظرة عامة على عمليات التدريب الميداني والأنشطة داخل النظام"
        icon={LayoutDashboard}
        className="!py-5 !px-6 !mb-0 !min-h-[80px]"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`bg-white border border-border rounded-[14px] p-3 sm:p-3.5 border-r-4 ${card.color} shadow-sm`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-text-faint text-[0.78rem] sm:text-[0.82rem] font-bold leading-snug">{card.title}</span>
              <div className={`w-8 h-8 rounded-[8px] ${card.bg} flex items-center justify-center shrink-0`}>
                <card.icon size={17} className="text-secondary" />
              </div>
            </div>
            <div className="text-[1.45rem] sm:text-[1.6rem] font-extrabold text-secondary leading-none">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border rounded-[14px] p-3 sm:p-4 shadow-sm">
        <h3 className="text-[0.95rem] sm:text-base font-extrabold text-secondary mb-2.5 sm:mb-3">الوصول السريع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.path}
              className="flex items-center gap-2.5 rounded-[10px] border border-[#e8edf3] bg-[#f8fafc] px-2.5 py-2 sm:py-2.5 no-underline transition-colors hover:border-accent/35 hover:bg-white hover:shadow-sm group min-w-0"
            >
              <div
                className={`w-9 h-9 rounded-[9px] bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <action.icon size={17} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="m-0 text-[0.82rem] sm:text-[0.85rem] font-bold text-secondary leading-snug line-clamp-2">
                  {action.title}
                </h4>
                <p className="m-0 mt-0.5 text-[0.72rem] text-text-faint line-clamp-1 hidden md:block">{action.description}</p>
              </div>
              <ChevronLeft size={14} className="text-text-faint shrink-0 opacity-60 group-hover:opacity-100 hidden sm:block" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3 pb-1">
        <div className="bg-white border border-border rounded-[14px] p-3 sm:p-4 shadow-sm min-h-0">
          <h4 className="m-0 mb-2.5 text-secondary font-extrabold text-[0.95rem]">آخر الأنشطة</h4>
          {activities.length === 0 ? (
            <EmptyState
              compact
              title="لا توجد أنشطة حديثة"
              description="لم يتم تسجيل أي أنشطة في النظام مؤخراً"
              icon={Clock}
            />
          ) : (
            <div className="flex flex-col divide-y divide-[#edf2f7]">
              {activities.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="py-2 first:pt-0 last:pb-0">
                  <div className="font-bold text-text text-[0.88rem] leading-snug">
                    {activity.description || activity.action || "نشاط"}
                  </div>
                  <small className="text-text-faint text-[0.78rem]">
                    {activity.created_at ? new Date(activity.created_at).toLocaleString("ar-EG") : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-[14px] p-3 sm:p-4 shadow-sm min-h-0">
          <h5 className="m-0 mb-2.5 text-secondary font-extrabold text-[0.95rem]">آخر إعلان</h5>
          {announcement ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[10px] p-3 border border-blue-100">
              <div className="font-bold text-text mb-1.5 text-[0.95rem] leading-snug">{announcement.title}</div>
              <p className="text-text-soft text-[0.85rem] m-0 mb-1.5 line-clamp-3">{announcement.content}</p>
              <small className="text-text-faint text-[0.78rem]">
                {announcement.created_at ? new Date(announcement.created_at).toLocaleString("ar-EG") : ""}
              </small>
            </div>
          ) : (
            <EmptyState
              compact
              title="لا توجد إعلانات حالية"
              description="لم يتم نشر أي إعلانات في النظام"
              icon={Bell}
            />
          )}
        </div>
      </div>
    </div>
  );
}
