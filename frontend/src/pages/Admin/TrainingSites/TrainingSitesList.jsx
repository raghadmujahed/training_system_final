import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteTrainingSite, getTrainingSite } from "../../../services/api";
import { apiCache } from "../../../services/apiCache";
import { useTrainingSites } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function TrainingSitesList() {
  const { data: cachedSites, loading } = useTrainingSites();
  const [removedIds, setRemovedIds] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const sites = cachedSites.filter((s) => !removedIds.includes(s.id));

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف موقع التدريب؟")) {
      await deleteTrainingSite(id);
      setRemovedIds((prev) => [...prev, id]);
      apiCache.invalidatePrefix("training-sites:");
    }
  };

  const handleShowDetails = async (site) => {
    setLoadingDetails(true);
    try {
      const fullDetails = await getTrainingSite(site.id);
      setSelectedSite(fullDetails);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching site details:', error);
      alert('تعذر تحميل تفاصيل مكان التدريب');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedSite(null);
  };

  const getSchoolTypeLabel = (type) => {
    const labels = {
      'public': 'حكومية',
      'private': 'خاصة',
      'unrwa': 'وكالة'
    };
    return labels[type] || type || 'غير محدد';
  };

  const getSchoolLevelLabel = (level) => {
    const labels = {
      'lower': 'أساسية',
      'upper': 'ثانوية',
      'both': 'أساسية وثانوية'
    };
    return labels[level] || level || 'غير محدد';
  };

  const getGenderLabel = (classification) => {
    const labels = {
      'boys': 'ذكور',
      'girls': 'إناث',
      'mixed': 'مختلطة'
    };
    return labels[classification] || classification || 'غير محدد';
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>مواقع التدريب</h1>
        <div>
          <Link to="/admin/training-sites/without-manager" className="btn-secondary me-2">المدارس بدون مدير</Link>
          <Link to="/admin/training-sites/create" className="btn-primary">+ إضافة موقع</Link>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>اسم المدرسة / مكان التدريب</th>
            <th>التصنيف</th>
            <th>النوع</th>
            <th>المرحلة الدراسية</th>
            <th>رقم الهاتف</th>
            <th>رقم المحمول</th>
            <th>مدير المدرسة</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.school_type === 'private' ? 'خاصة' : s.school_type === 'unrwa' ? 'وكالة' : 'حكومية'}</td>
              <td>{s.site_type === 'school' ? 'مدرسة' : 'مركز صحي'}</td>
              <td>{s.school_level === 'lower' ? 'أساسية' : s.school_level === 'upper' ? 'ثانوية' : s.school_level === 'both' ? 'أساسية وثانوية' : '-'}</td>
              <td>{s.phone || '-'}</td>
              <td>{s.mobile || '-'}</td>
              <td>{s.manager ? s.manager.name : 'غير مرتبط بمدير'}</td>
              <td>
                <span className={`badge ${s.is_active ? 'badge-success' : 'badge-secondary'}`}>
                  {s.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </td>
              <td>
                <button 
                  onClick={() => handleShowDetails(s)} 
                  className="btn-sm info me-1"
                >
                  عرض التفاصيل
                </button>
                <Link to={`/admin/training-sites/edit/${s.id}`} className="btn-sm me-1">تعديل</Link>
                {!s.manager && (
                  <Link 
                    to={`/admin/training-sites/without-manager`} 
                    className="btn-sm warning"
                    title="ربط مدير"
                  >
                    ربط مدير
                  </Link>
                )}
                <button onClick={() => handleDelete(s.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan="9" className="text-center">لا توجد مواقع تدريب</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Details Modal */}
      {showDetailsModal && selectedSite && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>تفاصيل مكان التدريب</h3>
              <button className="modal-close" onClick={handleCloseDetails}>×</button>
            </div>
            <div className="modal-body">
              {loadingDetails ? (
                <div className="text-center py-4">
                  <LoadingSpinner size="small" text="جاري تحميل التفاصيل..." />
                </div>
              ) : (
                <div className="row">
                  {/* Basic Information */}
                  <div className="col-md-6">
                    <h5 className="section-title">المعلومات الأساسية</h5>
                    <div className="detail-item">
                      <strong>اسم المدرسة / مكان التدريب:</strong> {selectedSite.name || 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>التصنيف:</strong> {getSchoolTypeLabel(selectedSite.school_type)}
                    </div>
                    <div className="detail-item">
                      <strong>النوع:</strong> {selectedSite.site_type === 'school' ? 'مدرسة' : 'مركز صحي'}
                    </div>
                    <div className="detail-item">
                      <strong>المرحلة الدراسية:</strong> {getSchoolLevelLabel(selectedSite.school_level)}
                    </div>
                    <div className="detail-item">
                      <strong>تصنيف الطلاب:</strong> {getGenderLabel(selectedSite.gender_classification)}
                    </div>
                    <div className="detail-item">
                      <strong>الحالة:</strong> 
                      <span className={`badge ${selectedSite.is_active ? 'badge-success' : 'badge-secondary'} me-2`}>
                        {selectedSite.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>السعة التدريبية:</strong> {selectedSite.capacity || 'غير محدد'}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="col-md-6">
                    <h5 className="section-title">معلومات الاتصال</h5>
                    <div className="detail-item">
                      <strong>رقم الهاتف:</strong> {selectedSite.phone || 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>رقم المحمول:</strong> {selectedSite.mobile || 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>البريد الإلكتروني:</strong> {selectedSite.email || 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>الموقع:</strong> {selectedSite.location || 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>المديرية:</strong> {selectedSite.directorate_label || selectedSite.directorate || 'غير محدد'}
                    </div>
                  </div>

                  {/* Manager Information */}
                  <div className="col-md-6">
                    <h5 className="section-title">مدير المدرسة</h5>
                    <div className="detail-item">
                      <strong>اسم المدير:</strong> {selectedSite.manager ? selectedSite.manager.name : 'غير مرتبط بمدير'}
                    </div>
                    <div className="detail-item">
                      <strong>حالة الربط:</strong> 
                      <span className={`badge ${selectedSite.manager ? 'badge-success' : 'badge-warning'} me-2`}>
                        {selectedSite.manager ? 'مرتبط بمدير' : 'غير مرتبط بمدير'}
                      </span>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="col-md-6">
                    <h5 className="section-title">معلومات النظام</h5>
                    <div className="detail-item">
                      <strong>تاريخ الإنشاء:</strong> {selectedSite.created_at ? new Date(selectedSite.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                    </div>
                    <div className="detail-item">
                      <strong>آخر تحديث:</strong> {selectedSite.updated_at ? new Date(selectedSite.updated_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                    </div>
                  </div>

                  {/* Training Information */}
                  <div className="col-md-6">
                    <h5 className="section-title">معلومات التدريب</h5>
                    <div className="detail-item">
                      <strong>عدد طلبات التدريب:</strong> {selectedSite.training_requests_count || 0}
                    </div>
                    <div className="detail-item">
                      <strong>التكليفات النشطة:</strong> {selectedSite.active_assignments_count || 0}
                    </div>
                    <div className="detail-item">
                      <strong>التكليفات المكتملة:</strong> {selectedSite.completed_assignments_count || 0}
                    </div>
                    <div className="detail-item">
                      <strong>السعة المتبقية:</strong> {Math.max(0, (selectedSite.capacity || 0) - (selectedSite.active_assignments_count || 0))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-md-6">
                    <h5 className="section-title">ملاحظات</h5>
                    <div className="detail-item">
                      <p>{selectedSite.description || 'لا توجد ملاحظات'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseDetails}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}