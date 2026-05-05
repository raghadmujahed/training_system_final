import { useState, useEffect } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { getHeadDepartmentReports, getCourses } from '../../services/api';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HeadOfDepartmentReports() {
  const [reports, setReports] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [selectedCourse, setSelectedCourse] = useState('');

  const reportTypes = [
    { value: 'overview', label: 'نظرة عامة', icon: <BarChart3 size={16} /> },
    { value: 'students_per_section', label: 'الطلاب لكل شعبة', icon: <FileText size={16} /> },
    { value: 'distribution_status', label: 'حالة التوزيع', icon: <FileText size={16} /> },
    { value: 'capacity_utilization', label: 'استيعاب السعة', icon: <BarChart3 size={16} /> },
  ];

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      params.type = selectedReport;
      if (selectedCourse) params.course_id = selectedCourse;
      
      const response = await getHeadDepartmentReports(params);
      setReports(response);
    } catch (err) {
      setError('فشل في جلب بيانات التقارير');
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Courses fetch error:', err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedReport, selectedCourse]);

  const renderOverviewReport = () => {
    if (!reports) return null;
    
    return (
      <div className="stats-grid">
        {reports.stats && (
          <>
            <div className="stat-card">
              <h3>إجمالي الطلاب</h3>
              <p className="stat-value">{reports.stats.total_students || 0}</p>
            </div>
            <div className="stat-card">
              <h3>إجمالي المساقات</h3>
              <p className="stat-value">{reports.stats.total_courses || 0}</p>
            </div>
            <div className="stat-card">
              <h3>إجمالي الشعب</h3>
              <p className="stat-value">{reports.stats.total_sections || 0}</p>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStudentsPerSection = () => {
    if (!reports || !reports.students_per_section) return null;
    
    return (
      <div className="activity-list">
        {reports.students_per_section.map((section) => (
          <div className="activity-item" key={section.section_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h6>{section.section_name}</h6>
                <div className="activity-meta">
                  المساق: {section.course_name} · السعة: {section.capacity}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="activity-meta">الطلاب النشطين: {section.active_students}</div>
                <div className="activity-meta">السعة المتاحة: {section.available_capacity}</div>
                <div className="activity-meta">نسبة الاستخدام: {section.utilization_percentage}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDistributionStatus = () => {
    if (!reports || !reports.distribution_overview) return null;
    
    const overview = reports.distribution_overview;
    
    return (
      <div className="stats-grid">
        <div className="stat-card">
          <h3>إجمالي الطلاب</h3>
          <p className="stat-value">{overview.total_students || 0}</p>
        </div>
        <div className="stat-card">
          <h3>مع مكان تدريب</h3>
          <p className="stat-value">{overview.with_training_site || 0}</p>
        </div>
        <div className="stat-card">
          <h3>بدون مكان تدريب</h3>
          <p className="stat-value">{overview.without_training_site || 0}</p>
        </div>
        <div className="stat-card">
          <h3>مسجلين في شعب</h3>
          <p className="stat-value">{overview.assigned_to_sections || 0}</p>
        </div>
        <div className="stat-card">
          <h3>غير مسجلين</h3>
          <p className="stat-value">{overview.not_assigned_to_sections || 0}</p>
        </div>
      </div>
    );
  };

  const renderCapacityUtilization = () => {
    if (!reports || !reports.capacity_utilization) return null;
    
    return (
      <div className="activity-list">
        {reports.capacity_utilization.map((item) => (
          <div className="activity-item" key={item.course_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h6>{item.course_name}</h6>
                <div className="activity-meta">
                  السعة الإجمالية: {item.total_capacity} · المستخدم: {item.used_capacity}
                </div>
              </div>
              <div className="activity-meta">
                نسبة الاستخدام: {item.utilization_percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'overview':
        return renderOverviewReport();
      case 'students_per_section':
        return renderStudentsPerSection();
      case 'distribution_status':
        return renderDistributionStatus();
      case 'capacity_utilization':
        return renderCapacityUtilization();
      default:
        return <EmptyState title="اختر نوع التقرير" description="اختر نوع التقرير من القائمة لعرض البيانات" />;
    }
  };

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>التقارير</h1>
            <p>عرض وتحليل بيانات القسم والتوزيع</p>
          </div>
          <button
            className="btn-secondary"
            onClick={fetchReports}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {loading ? <LoadingSpinner size="button" /> : <Download size={16} />}
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <p className="text-danger">{error}</p>
        </div>
      )}

      <div className="section-card">
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="hod-reports-type">نوع التقرير</label>
            <select
              id="hod-reports-type"
              name="report_type"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="hod-reports-course">المساق</label>
            <select
              id="hod-reports-course"
              name="course_id"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">جميع المساقات</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : (
        <div style={{ marginTop: 16 }}>
          {renderReportContent()}
        </div>
      )}
    </div>
  );
}
