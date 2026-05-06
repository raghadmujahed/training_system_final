import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteTrainingSite } from "../../../services/api";
import { apiCache } from "../../../services/apiCache";
import { useTrainingSites } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function TrainingSitesList() {
  const { data: cachedSites, loading } = useTrainingSites();
  const [removedIds, setRemovedIds] = useState([]);
  const sites = cachedSites.filter((s) => !removedIds.includes(s.id));

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف موقع التدريب؟")) {
      await deleteTrainingSite(id);
      setRemovedIds((prev) => [...prev, id]);
      apiCache.invalidatePrefix("training-sites:");
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>مواقع التدريب</h1>
        <div>
          <Link to="/admin/training-sites/create" className="btn-primary">+ إضافة موقع</Link>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الموقع</th>
            <th>الهاتف</th>
            <th>البريد</th>
            <th>المحمول</th>
            <th>المديرية</th>
            <th>نوع المدرسة</th>
            <th>التصنيف</th>
            <th>المرحلة</th>
            <th>السعة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.location}</td>
              <td>{s.phone}</td>
              <td>{s.email}</td>
              <td>{s.mobile}</td>
              <td>{s.directorate_label || s.directorate}</td>
              <td>{s.school_type === 'private' ? 'خاصة' : 'حكومية'}</td>
              <td>{s.gender_classification === 'boys' ? 'ذكور' : s.gender_classification === 'girls' ? 'إناث' : s.gender_classification === 'mixed' ? 'مختلطة' : '-'}</td>
              <td>{s.school_level === 'lower' ? 'دنيا' : s.school_level === 'upper' ? 'عليا' : '-'}</td>
              <td>{s.capacity}</td>
              <td>
                <Link to={`/admin/training-sites/edit/${s.id}`} className="btn-sm">تعديل</Link>
                <button onClick={() => handleDelete(s.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan="11" className="text-center">لا توجد مواقع تدريب</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}