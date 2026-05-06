import { useEffect, useState } from "react";
import { getFeatureFlags, updateFeatureFlag } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function FeatureFlagsList() {
  const toast = useAppToast();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const data = await getFeatureFlags();
        setFlags(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("فشل تحميل الميزات");
      } finally {
        setLoading(false);
      }
    };
    fetchFlags();
  }, []);

  const toggle = async (id, current) => {
    try {
      await updateFeatureFlag(id, !current);
      setFlags(flags.map(f => f.id === id ? {...f, is_open: !current} : f));
    } catch (err) {
      console.error(err);
      toast.error("فشل تحديث الميزة");
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>الميزات الديناميكية</h1>
      </div>

      {flags.length === 0 ? (
        <p>لا توجد ميزات حالياً</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(flag => (
              <tr key={flag.id}>
                <td>{flag.display_name || flag.name}</td>
                <td>{flag.is_open ? "مفتوحة" : "مغلقة"}</td>
                <td>
                  <button 
                    onClick={() => toggle(flag.id, flag.is_open)} 
                    className="btn-sm"
                  >
                    {flag.is_open ? "إغلاق" : "فتح"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}