import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { getHeadDepartmentDashboardStats } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";

export default function HeadOfDepartmentDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHeadDepartmentDashboardStats();
        setStats(response);
      } catch (err) {
        const apiMsg = err.response?.data?.message;
        setError(apiMsg || "فشل في جلب الإحصائيات");
        console.error("Dashboard stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل الإحصائيات..." />
    );
  }

  if (error) {
    const isNoDept = error.includes("قسم") || error.includes("department");
    return (
      <div className="dashboard-error">
        <div className="error-icon">{isNoDept ? "🏫" : "⚠️"}</div>
        <h2>{isNoDept ? "لم يتم ربط حسابك بقسم أكاديمي بعد" : error}</h2>
        {isNoDept ? (
          <p>يرجى التواصل مع مدير النظام لربط حسابك بالقسم الصحيح</p>
        ) : (
          <>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              إعادة المحاولة
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="head-department-dashboard">
      <PageHeader
        title="لوحة تحكم رئيس القسم"
        subtitle="نظرة عامة على إحصائيات القسم"
        icon={LayoutDashboard}
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats?.total_students || 0}</h3>
            <p>إجمالي الطلاب</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{stats?.total_courses || 0}</h3>
            <p>إجمالي المساقات</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats?.total_sections || 0}</h3>
            <p>إجمالي الشعب</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats?.accepted_rejected_ratio?.accepted_percentage || 0}%</h3>
            <p>نسبة القبول</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section-card">
          <h2>نظرة عامة على التوزيع</h2>
          <div className="overview-stats">
            <div className="overview-item">
              <span className="label">الطلاب مع مكان تدريب:</span>
              <span className="value">{stats?.distribution_overview?.with_training_site || 0}</span>
            </div>
          </div>
          <div className="ratio-stats">
            <div className="ratio-item accepted">
              <div className="ratio-info">
                <span className="ratio-label">مقبول</span>
                <span className="ratio-value">{stats?.accepted_rejected_ratio?.accepted || 0}</span>
              </div>
              <div className="ratio-bar">
                <div className="bar-fill accepted" style={{width: `${stats?.accepted_rejected_ratio?.accepted > 0 ? (stats.accepted_rejected_ratio.accepted / ((stats.accepted_rejected_ratio.accepted || 0) + (stats.accepted_rejected_ratio.rejected || 0) + (stats.accepted_rejected_ratio.pending || 0)) * 100) : 0}%`}}></div>
              </div>
            </div>
            <div className="ratio-item rejected">
              <div className="ratio-info">
                <span className="ratio-label">مرفوض</span>
                <span className="ratio-value">{stats?.accepted_rejected_ratio?.rejected || 0}</span>
              </div>
              <div className="ratio-bar">
                <div className="bar-fill rejected" style={{width: `${stats?.accepted_rejected_ratio?.rejected > 0 ? (stats.accepted_rejected_ratio.rejected / ((stats.accepted_rejected_ratio.accepted || 0) + (stats.accepted_rejected_ratio.rejected || 0) + (stats.accepted_rejected_ratio.pending || 0)) * 100) : 0}%`}}></div>
              </div>
            </div>
            <div className="ratio-item pending">
              <div className="ratio-info">
                <span className="ratio-label">معلق</span>
                <span className="ratio-value">{stats?.accepted_rejected_ratio?.pending || 0}</span>
              </div>
              <div className="ratio-bar">
                <div className="bar-fill pending" style={{width: `${stats?.accepted_rejected_ratio?.pending > 0 ? (stats.accepted_rejected_ratio.pending / ((stats.accepted_rejected_ratio.accepted || 0) + (stats.accepted_rejected_ratio.rejected || 0) + (stats.accepted_rejected_ratio.pending || 0)) * 100) : 0}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>نظرة عامة على التوزيع</h2>
            <div className="card-icon">🎯</div>
          </div>
          <div className="distribution-stats">
            <div className="dist-item">
              <div className="dist-info">
                <span className="dist-label">مع مكان تدريب</span>
                <span className="dist-value">{stats?.distribution_overview?.with_training_site || 0}</span>
              </div>
              <div className="dist-percentage">
                {(stats?.distribution_overview?.total_students || 0) > 0 ? Math.round(((stats.distribution_overview.with_training_site || 0) / stats.distribution_overview.total_students) * 100) : 0}%
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-info">
                <span className="dist-label">بدون مكان تدريب</span>
                <span className="dist-value">{stats?.distribution_overview?.without_training_site || 0}</span>
              </div>
              <div className="dist-percentage">
                {(stats?.distribution_overview?.total_students || 0) > 0 ? Math.round(((stats.distribution_overview.without_training_site || 0) / stats.distribution_overview.total_students) * 100) : 0}%
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-info">
                <span className="dist-label">مسجلين في شعب</span>
                <span className="dist-value">{stats?.distribution_overview?.assigned_to_sections || 0}</span>
              </div>
              <div className="dist-percentage">
                {(stats?.distribution_overview?.total_students || 0) > 0 ? Math.round(((stats.distribution_overview.assigned_to_sections || 0) / stats.distribution_overview.total_students) * 100) : 0}%
              </div>
            </div>
            <div className="dist-item">
              <div className="dist-info">
                <span className="dist-label">غير مسجلين</span>
                <span className="dist-value">{stats?.distribution_overview?.not_assigned_to_sections || 0}</span>
              </div>
              <div className="dist-percentage">
                {(stats?.distribution_overview?.total_students || 0) > 0 ? Math.round(((stats.distribution_overview.not_assigned_to_sections || 0) / stats.distribution_overview.total_students) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats?.students_per_section && stats.students_per_section.length > 0 && (
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>الطلاب لكل شعبة</h2>
            <div className="card-icon">📋</div>
          </div>
          <div className="students-per-section">
            {stats.students_per_section.map((section, index) => (
              <div key={index} className="section-item">
                <div className="section-info">
                  <span className="section-name">{section.section_name}</span>
                  <span className="section-course">{section.course_name}</span>
                </div>
                <div className="section-count">
                  <span className="count-number">{section.active_students}</span>
                  <span className="count-label">طالب</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .head-department-dashboard {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .page-header p {
          color: #6c757d;
          margin: 0;
          font-size: 1.1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-left: 4px solid transparent;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }

        .stat-card.primary {
          border-left-color: #3498db;
        }

        .stat-card.success {
          border-left-color: #27ae60;
        }

        .stat-card.info {
          border-left-color: #8e44ad;
        }

        .stat-icon {
          font-size: 2.5rem;
          opacity: 0.8;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-content h3 {
          font-size: 2.2rem;
          margin: 0;
          color: #2c3e50;
          font-weight: 700;
        }

        .stat-content p {
          margin: 4px 0 0 0;
          color: #6c757d;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .dashboard-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h2 {
          color: #2c3e50;
          margin: 0;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .card-icon {
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .ratio-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ratio-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .ratio-item.accepted {
          background: rgba(39, 174, 96, 0.1);
        }

        .ratio-item.rejected {
          background: rgba(231, 76, 60, 0.1);
        }

        .ratio-item.pending {
          background: rgba(241, 196, 15, 0.1);
        }

        .ratio-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ratio-label {
          font-weight: 500;
          color: #2c3e50;
        }

        .ratio-value {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .ratio-item.accepted .ratio-value {
          color: #27ae60;
        }

        .ratio-item.rejected .ratio-value {
          color: #e74c3c;
        }

        .ratio-item.pending .ratio-value {
          color: #f39c12;
        }

        .ratio-bar {
          height: 8px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .bar-fill.accepted {
          background: #27ae60;
        }

        .bar-fill.rejected {
          background: #e74c3c;
        }

        .bar-fill.pending {
          background: #f39c12;
        }

        .distribution-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid #3498db;
        }

        .dist-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dist-label {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .dist-value {
          font-weight: 700;
          color: #2c3e50;
          font-size: 1.1rem;
        }

        .dist-percentage {
          background: #3498db;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .dashboard-card.full-width {
          grid-column: 1 / -1;
        }

        .students-per-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid #8e44ad;
          transition: transform 0.2s ease;
        }

        .section-item:hover {
          transform: translateX(4px);
          background: #e9ecef;
        }

        .section-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-name {
          color: #2c3e50;
          font-weight: 600;
        }

        .section-course {
          color: #6c757d;
          font-size: 0.85rem;
        }

        .section-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .count-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #8e44ad;
        }

        .count-label {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .dashboard-loading,
        .dashboard-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 20px;
          color: #e74c3c;
        }

        .dashboard-error h2 {
          color: #e74c3c;
          margin-bottom: 10px;
          font-size: 1.5rem;
        }

        .dashboard-error p {
          color: #6c757d;
          margin-bottom: 20px;
          font-size: 1.1rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
        }

        @media (max-width: 768px) {
          .head-department-dashboard {
            padding: 16px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .page-header h1 {
            font-size: 2rem;
          }

          .stat-card {
            padding: 20px;
          }

          .dashboard-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
