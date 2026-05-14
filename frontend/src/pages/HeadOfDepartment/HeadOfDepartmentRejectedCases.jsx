import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { getRejectedCases } from '../../services/api';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HeadOfDepartmentRejectedCases() {
  const [rejectedCases, setRejectedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRejectedCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getRejectedCases();
      setRejectedCases(response.data?.data || response.data || []);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setError(apiMsg || 'فشل في جلب بيانات الحالات المرفوضة');
      console.error('Rejected cases error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (source) => {
    const labels = {
      'section': 'الشعبة',
      'coordinator': 'المنسق',
      'directorate': 'المديرية',
      'school': 'المدرسة',
      'general': 'عام',
      'unknown': 'غير معروف'
    };
    return labels[source] || source;
  };

  useEffect(() => {
    fetchRejectedCases();
  }, []);

  const handleReassign = () => {
    // TODO: Implement reassign functionality
  };

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1>الحالات المرفوضة</h1>
            <p>عرض وإدارة الطلاب الذين تم رفض توزيعهم على الشعب</p>
          </div>
          <button
            className="btn-secondary flex items-center gap-[6px]"
            onClick={fetchRejectedCases}
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

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : rejectedCases.length === 0 ? (
        <EmptyState
          title="لا توجد حالات مرفوضة"
          description="لا يوجد طلاب مرفوضين في القسم الحالي"
        />
      ) : (
        <div className="activity-list mt-4">
          {rejectedCases.map((item) => (
            <div className="activity-item" key={item.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h6 className="m-0 flex items-center gap-2">
                    <AlertCircle size={16} className="text-[#dc3545]" />
                    {item.student?.name || 'غير محدد'}
                  </h6>
                  <div className="activity-meta">
                    رقم جامعي: {item.student?.university_id || '—'}
                    {item.type === 'section_assignment' && (
                      <> · الشعبة: {item.section?.name || '—'} · المساق: {item.course?.name || '—'}</>
                    )}
                    {item.type === 'training_request' && (
                      <> · مكان التدريب: {item.training_site?.name || 'غير محدد'}</>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="status-badge rejected">مرفوض</span>
                  <span className="text-xs text-[#666]">
                    مصدر الرفض: {getSourceLabel(item.source)}
                  </span>
                </div>
              </div>
              
              {item.rejection_reason && (
                <div className="mt-2 p-2 bg-[#fff3cd] border border-[#ffc107] rounded-lg text-[#856404] text-[0.85rem]">
                  <strong>سبب الرفض:</strong> {item.rejection_reason}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  className="btn-primary flex items-center gap-[6px] text-[14px]"
                  onClick={() => handleReassign(item.student?.id, item.section?.id)}
                >
                  <CheckCircle size={14} />
                  إعادة التوزيع
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
