import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteTrainingPeriod, setActivePeriod } from "../../../services/api";
import { apiCache } from "../../../services/apiCache";
import { useTrainingPeriods } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function TrainingPeriodsList() {
  const { data: cachedPeriods, loading } = useTrainingPeriods();
  const [removedIds, setRemovedIds] = useState([]);
  const [localPeriods, setLocalPeriods] = useState(null);
  const periods = (localPeriods ?? cachedPeriods).filter((p) => !removedIds.includes(p.id));

  const invalidate = () => { apiCache.invalidatePrefix("training-periods:"); setLocalPeriods(null); };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الفترة؟")) {
      await deleteTrainingPeriod(id);
      setRemovedIds((prev) => [...prev, id]);
      invalidate();
    }
  };

  const handleSetActive = async (id) => {
    await setActivePeriod(id);
    setLocalPeriods((prev) =>
      (prev ?? cachedPeriods).map((p) => ({ ...p, is_active: p.id === id }))
    );
    invalidate();
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>الفترات التدريبية</h1>
        <Link to="/admin/training-periods/create" className="btn-primary">+ إضافة فترة</Link>
        {/* يمكن إضافة زر رفع جماعي هنا إذا أردت */}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>تاريخ البداية</th>
            <th>تاريخ النهاية</th>
            <th>نشطة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.start_date}</td>
              <td>{p.end_date}</td>
              <td>{p.is_active ? "نعم" : "لا"}</td>
              <td>
                <Link to={`/admin/training-periods/edit/${p.id}`} className="btn-sm">تعديل</Link>
                {!p.is_active && (
                  <button onClick={() => handleSetActive(p.id)} className="btn-sm">تفعيل</button>
                )}
                <button onClick={() => handleDelete(p.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {periods.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center">لا توجد فترات تدريبية</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}