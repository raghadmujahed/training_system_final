import { useEffect, useState } from "react";
import {
  getDashboardStats,
  getRecentActivities,
  getLatestAnnouncement,
} from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { LayoutDashboard, MapPin, CheckCircle2, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
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

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="bg-danger/8 border border-danger/20 text-danger rounded-[16px] p-4">{error}</div>;

  const statCards = [
    { title: "إجمالي المستخدمين", value: stats.total_students, icon: LayoutDashboard, color: "border-r-info", bg: "bg-info/8" },
    { title: "أماكن التدريب", value: stats.total_sites, icon: MapPin, color: "border-r-accent", bg: "bg-accent/8" },
    { title: "التقييمات المكتملة", value: stats.completed_evaluations, icon: CheckCircle2, color: "border-r-success", bg: "bg-success/8" },
    { title: "التقارير المعلقة", value: stats.pending_reports, icon: Clock, color: "border-r-primary", bg: "bg-primary/8" },
  ];

  return (
    <>
      <PageHeader title="لوحة تحكم مدير النظام" subtitle="نظرة عامة على عمليات التدريب الميداني والأنشطة داخل النظام" icon={LayoutDashboard} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 border-r-4 ${card.color}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">آخر الأنشطة</h4>
          {activities.length === 0 ? (
            <p className="text-text-faint">لا توجد أنشطة حديثة.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activities.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                  <div className="font-bold text-text text-[0.95rem]">
                    {activity.description || activity.action || "نشاط"}
                  </div>
                  <small className="text-text-faint">
                    {activity.created_at
                      ? new Date(activity.created_at).toLocaleString()
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
            <>
              <div className="font-bold text-text mb-1">{announcement.title}</div>
              <p className="text-text-soft text-[0.92rem] m-0">{announcement.content}</p>
              <small className="text-text-faint">
                {announcement.created_at
                  ? new Date(announcement.created_at).toLocaleString()
                  : ""}
              </small>
            </>
          ) : (
            <p className="text-text-faint">لا توجد إعلانات حالية.</p>
          )}
        </div>
      </div>
    </>
  );
}