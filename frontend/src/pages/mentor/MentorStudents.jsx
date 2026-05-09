import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import { getTrainingAssignments, itemsFromPagedResponse } from "../../services/api";

export default function MentorStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let m = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getTrainingAssignments({ per_page: 100 });
        if (m) setRows(itemsFromPagedResponse(res));
      } catch (e) {
        if (m) setError(e?.response?.data?.message || "فشل تحميل التعيينات");
      } finally {
        if (m) setLoading(false);
      }
    }
    load();
    return () => {
      m = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="طلبة التدريب"
        subtitle="الطلبة المرتبطون بتعييناتك كمعلم مرشد في جهات التدريب."
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
                <th>الطالب</th>
                <th>الرقم الجامعي</th>
                <th>جهة التدريب</th>
                <th>حالة التعيين</th>
                <th>من — إلى</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    لا يوجد طلبة مرتبطون بحسابك.
                  </td>
                </tr>
              ) : (
                rows.map((a) => {
                  const u = a.enrollment?.user;
                  return (
                    <tr key={a.id}>
                      <td>{u?.name || "—"}</td>
                      <td>{u?.university_id || "—"}</td>
                      <td>{a.training_site?.name || "—"}</td>
                      <td>{a.status_label || a.status}</td>
                      <td>
                        {a.start_date || "—"} — {a.end_date || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
