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

  if (loading) return <div className="p-5 text-[#888]">جاري التحميل...</div>;
  if (error) return <div className="p-5 text-[#c0392b]">{error}</div>;
  if (!records.length) return <div className="p-5 text-[#aaa] text-center">لا توجد سجلات حضور</div>;

  return (
    <div className="direction-rtl">
      <table className="data-table w-full text-[13px]">
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
                <span className="text-[10px] text-[#6C3CE1] mr-[6px] bg-[#ede9ff] py-[1px] px-[6px] rounded-[10px]">
                  {dayName(fmtDate(r.date))}
                </span>
              </td>
              <td>{fmtTime(r.check_in)}</td>
              <td>{fmtTime(r.check_out)}</td>
              <td>{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
              <td>{r.notes || "—"}</td>
              <td>
                {r.approved_at ? (
                  <span className="bg-[#dcfce7] text-[#15803d] py-[2px] px-2 rounded-[20px] text-[11px] font-bold">معتمد ✓</span>
                ) : r.status === "rejected" ? (
                  <span className="bg-[#fee2e2] text-[#b91c1c] py-[2px] px-2 rounded-[20px] text-[11px] font-bold">مرفوض ✗</span>
                ) : (
                  <span className="bg-[#fef9c3] text-[#a16207] py-[2px] px-2 rounded-[20px] text-[11px] font-bold">بانتظار</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
