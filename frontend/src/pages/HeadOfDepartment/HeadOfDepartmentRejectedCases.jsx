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
      setError('فشل في جلب بيانات الحالات المرفوضة');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>الحالات المرفوضة</h1>
            <p>عرض وإدارة الطلاب الذين تم رفض توزيعهم على الشعب</p>
          </div>
          <button
            className="btn-secondary"
            onClick={fetchRejectedCases}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {loading ? <LoadingSpinner size="button" /> : <RefreshCw size={16} />}
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="section-card" style={{ marginBottom: 12 }}>
          <p className="text-danger">{error}</p>
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
        <div className="activity-list" style={{ marginTop: 16 }}>
          {rejectedCases.map((item) => (
            <div className="activity-item" key={item.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h6 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} style={{ color: '#dc3545' }} />
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="status-badge rejected">مرفوض</span>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    مصدر الرفض: {getSourceLabel(item.source)}
                  </span>
                </div>
              </div>
              
              {item.rejection_reason && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  backgroundColor: '#fff3cd', 
                  borderRadius: 4, 
                  fontSize: 14,
                  color: '#856404'
                }}>
                  <strong>سبب الرفض:</strong> {item.rejection_reason}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => handleReassign(item.student?.id, item.section?.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
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
