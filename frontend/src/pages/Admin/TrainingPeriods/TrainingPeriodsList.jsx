import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteTrainingPeriod, setActivePeriod } from "../../../services/api";
import { apiCache } from "../../../services/apiCache";
import { useTrainingPeriods } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

const SEMESTER_LABELS = { first: "الفصل الأول", second: "الفصل الثاني", summer: "الفصل الصيفي" };

const StatusBadge = ({ status }) => {
  const map = {
    active:   "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
    draft:    "bg-yellow-100 text-yellow-800",
  };
  const labels = { active: "نشطة", archived: "مؤرشفة", draft: "مسودة" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? map.draft}`}>
      {labels[status] ?? status}
    </span>
  );
};

export default function TrainingPeriodsList() {
  const toast = useAppToast();
  const { data: cachedPeriods, loading } = useTrainingPeriods();
  const [removedIds, setRemovedIds] = useState([]);
  const [localPeriods, setLocalPeriods] = useState(null);
  const [activating, setActivating] = useState(null);
  const periods = (localPeriods ?? cachedPeriods).filter((p) => !removedIds.includes(p.id));

  const invalidate = () => { apiCache.invalidatePrefix("training-periods:"); setLocalPeriods(null); };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الفترة؟")) return;
    try {
      await deleteTrainingPeriod(id);
      setRemovedIds((prev) => [...prev, id]);
      invalidate();
      toast.success("تم حذف الفترة التدريبية");
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSetActive = async (period) => {
    const hasCurrentActive = periods.some((p) => p.is_active && p.id !== period.id);
    let autoArchive = false;

    if (hasCurrentActive) {
      const choice = window.confirm(
        `سيتم تفعيل الفترة "${period.name}".\n\nهل تريد أرشفة الفترة النشطة الحالية تلقائياً؟\n(اضغط موافق للأرشفة، إلغاء لإلغاء التفعيل فقط دون أرشفة)`
      );
      autoArchive = choice;
    }

    setActivating(period.id);
    try {
      await setActivePeriod(period.id, autoArchive);
      setLocalPeriods((prev) =>
        (prev ?? cachedPeriods).map((p) => ({
          ...p,
          is_active: p.id === period.id,
          status: p.id === period.id ? "active" : (p.is_active ? "draft" : p.status),
        }))
      );
      invalidate();
      toast.success(`تم تفعيل الفترة "${period.name}" بنجاح`);
    } catch {
      toast.error("حدث خطأ أثناء تفعيل الفترة");
    } finally {
      setActivating(null);
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>الفترات التدريبية</h1>
        <Link to="/admin/training-periods/create" className="btn-primary">+ إضافة فترة</Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>السنة / الفصل</th>
            <th>تاريخ البداية</th>
            <th>تاريخ النهاية</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>
                {p.academic_year
                  ? `${p.academic_year} — ${SEMESTER_LABELS[p.semester] ?? p.semester ?? "—"}`
                  : "—"}
              </td>
              <td>{p.start_date}</td>
              <td>{p.end_date}</td>
              <td><StatusBadge status={p.status ?? (p.is_active ? "active" : "draft")} /></td>
              <td>
                <Link to={`/admin/training-periods/edit/${p.id}`} className="btn-sm">تعديل</Link>
                {!p.is_active && (
                  <button
                    onClick={() => handleSetActive(p)}
                    className="btn-sm"
                    disabled={activating === p.id}
                  >
                    {activating === p.id ? "جاري التفعيل..." : "تفعيل"}
                  </button>
                )}
                <button onClick={() => handleDelete(p.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {periods.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center">لا توجد فترات تدريبية</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}