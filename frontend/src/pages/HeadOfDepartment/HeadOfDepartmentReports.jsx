import { useState, useEffect } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { getHeadDepartmentReports } from '../../services/api';
import { useCourses } from '../../hooks/useSharedData';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HeadOfDepartmentReports() {
  const [reports, setReports] = useState(null);
  const { data: courses } = useCourses();
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
      const apiMsg = err.response?.data?.message;
      setError(apiMsg || 'فشل في جلب بيانات التقارير');
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

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
    if (!reports) return null;
    // Backend returns plain array for students_per_section report type
    const items = Array.isArray(reports) ? reports : (reports.students_per_section || []);
    if (items.length === 0) {
      return <EmptyState title="لا توجد بيانات" description="لا توجد شعب مسجلة في القسم" />;
    }
    return (
      <div className="activity-list">
        {items.map((section) => (
          <div className="activity-item" key={section.section_id}>
            <div className="flex justify-between items-start">
              <div>
                <h6>{section.section_name}</h6>
                <div className="activity-meta">
                  المساق: {section.course_name} · السعة: {section.capacity}
                </div>
              </div>
              <div className="text-left">
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
    if (!reports) return null;
    // Backend returns array of student-section assignments for distribution_status report
    const items = Array.isArray(reports) ? reports : (reports.data || []);
    if (items.length === 0) {
      return <EmptyState title="لا توجد بيانات" description="لا يوجد طلاب موزعين على الشعب" />;
    }
    return (
      <div className="activity-list">
        {items.map((item, idx) => (
          <div className="activity-item" key={idx}>
            <div className="flex justify-between items-start">
              <div>
                <h6>{item.student_name || '—'}</h6>
                <div className="activity-meta">
                  الرقم الجامعي: {item.university_id || '—'} ·
                  المساق: {item.course || '—'} ·
                  الشعبة: {item.section || '—'}
                </div>
                {item.training_place && item.training_place !== 'غير محدد' && (
                  <div className="activity-meta">مكان التدريب: {item.training_place}</div>
                )}
              </div>
              <span className={`status-badge ${item.status}`}>
                {item.status === 'accepted' ? 'مقبول' : item.status === 'rejected' ? 'مرفوض' : item.status === 'pending' ? 'معلق' : item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCapacityUtilization = () => {
    if (!reports || !reports.capacity_utilization) return null;
    
    return (
      <div className="activity-list">
        {reports.capacity_utilization.map((item) => (
          <div className="activity-item" key={item.course_id}>
            <div className="flex justify-between items-start">
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
        <div className="flex justify-between items-start">
          <div>
            <h1>التقارير</h1>
            <p>عرض وتحليل بيانات القسم والتوزيع</p>
          </div>
          <button
            className="btn-secondary flex items-center gap-[6px]"
            onClick={fetchReports}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="button" /> : <Download size={16} />}
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="section-card mb-3">
          <p className="text-danger">
            {error.includes("قسم") || error.includes("department")
              ? "لم يتم ربط حسابك بقسم أكاديمي بعد، يرجى التواصل مع مدير النظام"
              : error}
          </p>
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
        <div className="mt-4">
          {renderReportContent()}
        </div>
      )}
    </div>
  );
}
