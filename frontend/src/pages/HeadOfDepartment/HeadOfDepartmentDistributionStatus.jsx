import { useState, useEffect } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { getDistributionStatus } from '../../services/api';
import { useCourses } from '../../hooks/useSharedData';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HeadOfDepartmentDistributionStatus() {
  const [distribution, setDistribution] = useState([]);
  const { data: courses } = useCourses();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    course_id: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchDistribution = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.course_id) params.course_id = filters.course_id;
      if (filters.status) params.status = filters.status;
      
      const response = await getDistributionStatus(params);
      setDistribution(response.data?.data || response.data || []);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setError(apiMsg || 'فشل في جلب بيانات حالة التوزيع');
      console.error('Distribution status error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  useEffect(() => {
    fetchDistribution();
  }, [filters]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      accepted: { label: 'مقبول', className: 'status-badge accepted' },
      rejected: { label: 'مرفوض', className: 'status-badge rejected' },
      pending: { label: 'معلق', className: 'status-badge pending' },
    };
    const config = statusConfig[status] || { label: status, className: 'status-badge' };
    return <span className={config.className}>{config.label}</span>;
  };

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1>حالة التوزيع</h1>
            <p>تتبع حالة توزيع الطلاب على الشعب وأماكن التدريب</p>
          </div>
          <button
            className="btn-secondary flex items-center gap-[6px]"
            onClick={fetchDistribution}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="button" /> : <RefreshCw size={16} />}
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
        <div className="flex justify-between items-center mb-4">
          <button
            className="btn-secondary flex items-center gap-[6px]"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            الفلاتر
          </button>
          {(filters.course_id || filters.status) && (
            <button
              className="btn-secondary"
              onClick={() => setFilters({ course_id: '', status: '' })}
            >
              إعادة تعيين
            </button>
          )}
        </div>

        {showFilters && (
          <div className="filters-grid mb-4">
            <div className="form-group">
              <label htmlFor="hod-dist-filter-course">المساق</label>
              <select
                id="hod-dist-filter-course"
                name="course_id"
                value={filters.course_id}
                onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
              >
                <option value="">جميع المساقات</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="hod-dist-filter-status">الحالة</label>
              <select
                id="hod-dist-filter-status"
                name="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">جميع الحالات</option>
                <option value="accepted">مقبول</option>
                <option value="rejected">مرفوض</option>
                <option value="pending">معلق</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : distribution.length === 0 ? (
        <EmptyState
          title="لا توجد بيانات"
          description="لا يوجد طلاب موزعين على الشعب"
        />
      ) : (
        <div className="activity-list mt-4">
          {distribution.map((item) => (
            <div className="activity-item" key={item.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h6 className="m-0">
                    {item.student?.name || 'غير محدد'}
                  </h6>
                  <div className="activity-meta">
                    رقم جامعي: {item.student?.university_id || '—'} · 
                    الشعبة: {item.section?.name || '—'} · 
                    المساق: {item.section?.course?.name || '—'}
                  </div>
                  {item.student?.trainingSite && (
                    <div className="activity-meta">
                      مكان التدريب: {item.student.trainingSite.name}
                    </div>
                  )}
                </div>
                {getStatusBadge(item.status)}
              </div>
              {item.notes && (
                <div className="mt-2 text-[14px] text-[#666]">
                  ملاحظات: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
