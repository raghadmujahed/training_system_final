import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { getAttendances, itemsFromPagedResponse } from "../../services/api";
import { CalendarCheck, Clock, CheckCircle2 } from "lucide-react";
import huLogo from "../../assets/HU Logo.webp";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function dayName(d) { return d ? DAYS[new Date(d).getDay()] : ""; }
function fmtTime(v) { const m = v?.match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : "—"; }
function fmtDate(v) { return v ? v.slice(0, 10) : "—"; }

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
        <div className="sa-form-view">
          {/* رأسية */}
          <div className="sa-letterhead">
            <div className="sa-lh-logo">
              <img src={huLogo} alt="شعار جامعة الخليل" width="52" height="52" style={{objectFit:"contain"}} />
              <div>
                <div className="sa-lh-title">جامعة الخليل</div>
                <div className="sa-lh-sub">كلية العلوم التربوية — قسم التدريب الميداني</div>
              </div>
            </div>
            <div className="sa-lh-actions">
              <div className="sa-lh-form-title">نموذج الحضور والغياب</div>
              <button type="button" className="sa-print-btn no-print" onClick={() => window.print()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                طباعة
              </button>
            </div>
          </div>

          {/* معلومات الطالب */}
          <div className="sa-info-grid">
            <div className="sa-info-item">
              <span className="sa-info-label">اسم الطالب</span>
              <span className="sa-info-value">{rows[0]?.training_assignment?.enrollment?.user?.name || "—"}</span>
            </div>
            <div className="sa-info-item">
              <span className="sa-info-label">الرقم الجامعي</span>
              <span className="sa-info-value">{rows[0]?.training_assignment?.enrollment?.user?.university_id || "—"}</span>
            </div>
            <div className="sa-info-item">
              <span className="sa-info-label">جهة التدريب</span>
              <span className="sa-info-value">{rows[0]?.training_assignment?.training_site?.name || "—"}</span>
            </div>
            <div className="sa-info-item">
              <span className="sa-info-label">الفترة من</span>
              <span className="sa-info-value">{rows[0]?.training_assignment?.start_date || "—"}</span>
            </div>
            <div className="sa-info-item">
              <span className="sa-info-label">الفترة إلى</span>
              <span className="sa-info-value">{rows[0]?.training_assignment?.end_date || "—"}</span>
            </div>
            <div className="sa-info-item">
              <span className="sa-info-label">الحالة</span>
              <span className="sa-info-value">
                {rows[0]?.training_assignment?.status_label || rows[0]?.training_assignment?.status || "—"}
              </span>
            </div>
          </div>

          {/* ملخص */}
          <div className="sa-summary-row">
            <div className="sa-sum-card">
              <div className="sa-sum-icon sa-icon-blue"><CalendarCheck size={16} /></div>
              <div><div className="sa-sum-num">{rows.length}</div><div className="sa-sum-lbl">يوم تدريب</div></div>
            </div>
            <div className="sa-sum-card">
              <div className="sa-sum-icon sa-icon-green"><CheckCircle2 size={16} /></div>
              <div><div className="sa-sum-num">{rows.filter(r => r.approved_at).length}</div><div className="sa-sum-lbl">معتمد</div></div>
            </div>
            <div className="sa-sum-card">
              <div className="sa-sum-icon sa-icon-purple"><Clock size={16} /></div>
              <div><div className="sa-sum-num">{rows.filter(r => r.check_in && r.check_out).length}</div><div className="sa-sum-lbl">يوم مكتمل</div></div>
            </div>
          </div>

          {/* الجدول */}
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>رقم السجل</th>
                  <th>اليوم والتاريخ</th>
                  <th>ساعة الحضور</th>
                  <th>ساعة المغادرة</th>
                  <th>الحصص</th>
                  <th>ملاحظات</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={r.approved_at ? "sa-row-ok" : r.status === "rejected" ? "sa-row-rej" : ""}>
                    <td className="sa-td-num">{idx + 1}</td>
                    <td>
                      <div className="sa-date-cell">
                        <span>{fmtDate(r.date)}</span>
                        <span className="sa-day-badge">{dayName(fmtDate(r.date))}</span>
                      </div>
                    </td>
                    <td className="sa-td-time">{fmtTime(r.check_in)}</td>
                    <td className="sa-td-time">{fmtTime(r.check_out)}</td>
                    <td>{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
                    <td className="sa-td-notes">{r.notes || "—"}</td>
                    <td>
                      {r.approved_at ? (
                        <span className="sa-badge sa-badge-success"><CheckCircle2 size={11} /> معتمد ✓</span>
                      ) : r.status === "rejected" ? (
                        <div>
                          <span className="sa-badge sa-badge-danger">مرفوض ✗</span>
                          {r.rejection_reason && <div className="sa-rej-reason">{r.rejection_reason}</div>}
                        </div>
                      ) : (
                        <span className="sa-badge sa-badge-warning">بانتظار</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`
  .sa-form-view { background: #fff; border: 1.5px solid #e4e2f0; border-radius: 14px; box-shadow: 0 4px 16px rgba(108,60,225,0.07); overflow: hidden; direction: rtl; }
  .sa-letterhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 2px solid #6C3CE1; background: linear-gradient(135deg,#f8f5ff,#f0ecff); }
  .sa-lh-logo { display: flex; align-items: center; gap: 11px; }
  .sa-lh-title { font-size: 1rem; font-weight: 800; color: #1e1e2d; }
  .sa-lh-sub { font-size: 10.5px; color: #888; margin-top: 2px; }
  .sa-lh-actions { display: flex; align-items: center; gap: 12px; }
  .sa-lh-form-title { font-size: 0.9rem; font-weight: 700; color: #6C3CE1; background: #ede9ff; padding: 5px 16px; border-radius: 20px; }
  .sa-print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #6C3CE1; background: #f3f0ff; border: 1px solid #e0d8f5; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
  .sa-print-btn:hover { background: #ede9ff; }
  @media print { .no-print { display: none !important; } }
  .sa-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0eef8; background: #fafaff; }
  .sa-info-item { background: #fff; border: 1px solid #e8e8ef; border-radius: 8px; padding: 10px 14px; }
  .sa-info-label { display: block; font-size: 10px; color: #999; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.3px; }
  .sa-info-value { display: block; font-size: 13px; font-weight: 700; color: #1e1e2d; }
  .sa-summary-row { display: flex; gap: 10px; padding: 14px 20px; border-bottom: 1px solid #f0eef8; background: #fdfdff; }
  .sa-sum-card { flex: 1; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #eee; border-radius: 9px; padding: 10px 12px; }
  .sa-sum-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sa-icon-blue { background: #eef2ff; color: #4f6ef7; }
  .sa-icon-purple { background: #f3f0ff; color: #6C3CE1; }
  .sa-icon-green { background: #e6fcf0; color: #1a9d5c; }
  .sa-sum-num { font-size: 1.2rem; font-weight: 800; color: #1e1e2d; line-height: 1.2; }
  .sa-sum-lbl { font-size: 10.5px; color: #999; font-weight: 500; margin-top: 2px; }
  .sa-table-wrap { overflow-x: auto; }
  .sa-table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: 12.5px; }
  .sa-table th { background: linear-gradient(135deg,#f0ecff,#e8e2ff); color: #5a4a8a; font-weight: 700; font-size: 11px; padding: 10px 11px; text-align: center; border-bottom: 2px solid #d8d0f0; white-space: nowrap; }
  .sa-table td { padding: 10px 11px; text-align: center; border-bottom: 1px solid #f0eef8; vertical-align: middle; color: #2d2d3a; }
  .sa-table tbody tr:last-child td { border-bottom: none; }
  .sa-table tbody tr:hover td { background: #faf8ff; }
  .sa-row-ok td { background: #f0fdf4 !important; }
  .sa-row-rej td { background: #fff5f5 !important; }
  .sa-td-num { color: #b0a8c8; font-weight: 700; font-size: 11px; }
  .sa-td-time { font-weight: 600; font-variant-numeric: tabular-nums; }
  .sa-td-notes { color: #666; max-width: 120px; }
  .sa-date-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .sa-day-badge { font-size: 9.5px; font-weight: 700; color: #6C3CE1; background: #ede9ff; padding: 1px 7px; border-radius: 20px; }
  .sa-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 9px; border-radius: 20px; font-size: 10.5px; font-weight: 700; }
  .sa-badge-success { background: #dcfce7; color: #15803d; }
  .sa-badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fde68a; }
  .sa-badge-danger { background: #fee2e2; color: #b91c1c; }
  .sa-rej-reason { font-size: 9.5px; color: #b91c1c; margin-top: 3px; }
`}</style>
    </>
  );
}
