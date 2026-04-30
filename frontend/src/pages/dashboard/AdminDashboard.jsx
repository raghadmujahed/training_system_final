import { useEffect, useState } from "react";
import {
  getDashboardStats,
  getRecentActivities,
  getLatestAnnouncement,
} from "../../services/api";

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

        // 🔥 آخر 4 أنشطة فقط
        const activitiesData = await getRecentActivities(4);
        setActivities(activitiesData?.data?.data || activitiesData?.data || []);

        // 🔥 آخر إعلان
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

  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">لوحة تحكم مدير النظام</h1>
        <p className="page-subtitle">
          نظرة عامة على عمليات التدريب الميداني والأنشطة داخل النظام
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card primary">
          <div className="stat-title">إجمالي المستخدمين</div>
          <div className="stat-value">{stats.total_students}</div>
        </div>

        <div className="stat-card accent">
          <div className="stat-title">أماكن التدريب</div>
          <div className="stat-value">{stats.total_sites}</div>
        </div>

        <div className="stat-card success">
          <div className="stat-title">التقييمات المكتملة</div>
          <div className="stat-value">{stats.completed_evaluations}</div>
        </div>

        <div className="stat-card info">
          <div className="stat-title">التقارير المعلقة</div>
          <div className="stat-value">{stats.pending_reports}</div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* 🔥 Activities */}
        <div className="section-card">
          <h4>آخر الأنشطة</h4>

          {activities.length === 0 ? (
            <p>لا توجد أنشطة حديثة.</p>
          ) : (
            <div className="activity-list">
              {activities.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div style={{ fontWeight: "bold" }}>
                    {activity.description || activity.action || "نشاط"}
                  </div>

                  <small style={{ color: "#888" }}>
                    {activity.created_at
                      ? new Date(activity.created_at).toLocaleString()
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 Latest Announcement */}
        <div className="announcement-box">
          <h5>آخر إعلان</h5>

          {announcement ? (
            <>
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                {announcement.title}
              </div>
              <p>{announcement.content}</p>
              <small style={{ color: "#888" }}>
                {announcement.created_at
                  ? new Date(announcement.created_at).toLocaleString()
                  : ""}
              </small>
            </>
          ) : (
            <p>لا توجد إعلانات حالية.</p>
          )}
        </div>
      </div>
    </>
  );
}