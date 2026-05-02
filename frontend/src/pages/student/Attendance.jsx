import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { getAttendances, itemsFromPagedResponse } from "../../services/api";
import { CalendarCheck, Clock, CheckCircle2 } from "lucide-react";

/**
 * عرض حضور الطالب فقط — التسجيل يتم من المرشد الميداني عبر سجل التدريب الرسمي (Attendance).
 */
export default function StudentAttendance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAttendances({ per_page: 200 });
        if (active) setRows(itemsFromPagedResponse(res));
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "تعذر تحميل سجل الحضور.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="الحضور والغياب"
        subtitle="عرض السجلات المعتمدة من جهة التدريب — التسجيل يقوم به المرشد الميداني."
      />

      <div className="alert-custom alert-info mb-3" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <CalendarCheck size={22} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>تنبيه</strong>
          <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
            لا يمكنك إضافة أو تعديل الحضور بنفسك. يسجّل المعلّم المرشد أو المشرف الميداني حضورك وغيابك في
            جهة التدريب. تظهر هنا السجلات المرتبطة بحسابك بعد اعتمادها في النظام.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card text-danger">{error}</div>
      ) : !rows.length ? (
        <EmptyState
          title="لا توجد سجلات حضور بعد"
          description="عند تسجيل المرشد الميداني لحضورك سيظهر السجل هنا."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الدخول</th>
                <th>الخروج</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date || "—"}</td>
                  <td>
                    <span className="badge-custom badge-info">{r.status_label || r.status || "—"}</span>
                    {r.approved_at && (
                      <span className="badge-custom badge-success ms-1" title={r.approved_at}>
                        <CheckCircle2 size={12} className="inline" /> معتمد
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="d-inline-flex align-items-center gap-1">
                      <Clock size={14} /> {r.check_in ? String(r.check_in).slice(0, 5) : "—"}
                    </span>
                  </td>
                  <td>{r.check_out ? String(r.check_out).slice(0, 5) : "—"}</td>
                  <td>{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
