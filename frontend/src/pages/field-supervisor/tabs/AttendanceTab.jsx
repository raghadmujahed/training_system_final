import { useEffect, useState } from "react";
import { getAttendances, itemsFromPagedResponse } from "../../../services/api";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function dayName(d) { return d ? DAYS[new Date(d).getDay()] : ""; }
function fmtTime(v) { const m = v?.match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : "—"; }
function fmtDate(v) { return v ? v.slice(0, 10) : "—"; }

export default function AttendanceTab({ studentId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await getAttendances({ training_assignment_id: studentId, per_page: 200 });
        if (active) setRecords(itemsFromPagedResponse(res));
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "تعذر تحميل السجلات");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <div style={{ padding: 20, color: "#888" }}>جاري التحميل...</div>;
  if (error) return <div style={{ padding: 20, color: "#c0392b" }}>{error}</div>;
  if (!records.length) return <div style={{ padding: 20, color: "#aaa", textAlign: "center" }}>لا توجد سجلات حضور</div>;

  return (
    <div style={{ direction: "rtl" }}>
      <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>التاريخ</th>
            <th>الدخول</th>
            <th>الخروج</th>
            <th>الحصص</th>
            <th>ملاحظات</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => (
            <tr key={r.id}>
              <td>{idx + 1}</td>
              <td>
                {fmtDate(r.date)}
                <span style={{ fontSize: 10, color: "#6C3CE1", marginRight: 6, background: "#ede9ff", padding: "1px 6px", borderRadius: 10 }}>
                  {dayName(fmtDate(r.date))}
                </span>
              </td>
              <td>{fmtTime(r.check_in)}</td>
              <td>{fmtTime(r.check_out)}</td>
              <td>{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
              <td>{r.notes || "—"}</td>
              <td>
                {r.approved_at ? (
                  <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>معتمد ✓</span>
                ) : r.status === "rejected" ? (
                  <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>مرفوض ✗</span>
                ) : (
                  <span style={{ background: "#fef9c3", color: "#a16207", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>بانتظار</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
