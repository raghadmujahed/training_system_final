import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getWeeklySchedules, itemsFromPagedResponse } from "../../services/api";
import { readStoredUser } from "../../utils/session";

export default function MentorSchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [teacherId, setTeacherId] = useState(null);

  useEffect(() => {
    const user = readStoredUser();
    setTeacherId(user?.id ?? null);
  }, []);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    let m = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getWeeklySchedules({ teacher_id: teacherId, per_page: 100 });
        if (m) setRows(itemsFromPagedResponse(res));
      } catch (e) {
        if (m) setError(e?.response?.data?.message || "فشل تحميل الجدول");
      } finally {
        if (m) setLoading(false);
      }
    }
    load();
    return () => {
      m = false;
    };
  }, [teacherId]);

  return (
    <>
      <PageHeader
        title="الجدول الأسبوعي"
        subtitle="الحصص المسجلة باسمك في جهة التدريب (حسب إدخال النظام)."
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>اليوم</th>
                <th>من</th>
                <th>إلى</th>
                <th>جهة التدريب</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center">
                    لا توجد حصص في الجدول. يمكن لإدارة النظام أو المدرسة إضافة الحصص.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.day_label || r.day}</td>
                    <td>{r.start_time || "—"}</td>
                    <td>{r.end_time || "—"}</td>
                    <td>{r.training_site?.name || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
