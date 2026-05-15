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
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-[16px] p-6 text-center">حدث خطأ أثناء تحميل البيانات، يرجى المحاولة مرة أخرى.</div>;

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
    <>
      <PageHeader title="لوحة تحكم مدير النظام" subtitle="نظرة عامة على عمليات التدريب الميداني والأنشطة داخل النظام" icon={LayoutDashboard} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 border-r-4 ${card.color} hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-[10px] ${card.bg} flex items-center justify-center`}>
                <card.icon size={20} className="text-secondary" />
              </div>
              <div className="stat-title text-text-faint text-[0.85rem] font-bold">{card.title}</div>
            </div>
            <div className="text-[1.8rem] font-extrabold text-secondary">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-extrabold text-secondary mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.path}
              className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon size={24} className="text-white" />
              </div>
              <h4 className="font-bold text-secondary mb-1">{action.title}</h4>
              <p className="text-sm text-text-faint">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">آخر الأنشطة</h4>
          {activities.length === 0 ? (
            <EmptyState
              title="لا توجد أنشطة حديثة"
              description="لم يتم تسجيل أي أنشطة في النظام مؤخراً"
              icon={Clock}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {activities.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                  <div className="font-bold text-text text-[0.95rem]">
                    {activity.description || activity.action || "نشاط"}
                  </div>
                  <small className="text-text-faint">
                    {activity.created_at
                      ? new Date(activity.created_at).toLocaleString('ar-EG')
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h5 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">آخر إعلان</h5>
          {announcement ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="font-bold text-text mb-2 text-lg">{announcement.title}</div>
              <p className="text-text-soft text-[0.92rem] m-0 mb-2">{announcement.content}</p>
              <small className="text-text-faint">
                {announcement.created_at
                  ? new Date(announcement.created_at).toLocaleString('ar-EG')
                  : ""}
              </small>
            </div>
          ) : (
            <EmptyState
              title="لا توجد إعلانات حالية"
              description="لم يتم نشر أي إعلانات في النظام"
              icon={Bell}
            />
          )}
        </div>
      </div>
    </>
  );
}