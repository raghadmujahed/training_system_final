import { useEffect, useState } from "react";
import { apiClient } from "../../../../services/api";
import huLogo from "../../../../assets/HU Logo.webp";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function dayName(d) { return d ? DAYS[new Date(d).getDay()] : ""; }
function fmtTime(v) { const m = v?.match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : "—"; }
function fmtDate(v) { return v ? v.slice(0, 10) : "—"; }

function printForm() {
  const el = document.querySelector('.sat-form-view');
  if (!el) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
    <title>نموذج الحضور والغياب</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #fff; }
      ${Array.from(document.styleSheets).flatMap(s => { try { return Array.from(s.cssRules).map(r => r.cssText); } catch { return []; } }).join('\n')}
    </style>
  </head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

export default function AttendanceTab({ studentId, student }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await apiClient.get(`/supervisor/students/${studentId}/attendance`, { params: { per_page: 200 } });
        const data = res.data?.data;
        if (active) {
          setRecords(data?.records || []);
          setSummary(data?.summary || null);
        }
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

  const first = records[0];
  const ta = first?.training_assignment || first?.trainingAssignment;
  const enrollment = ta?.enrollment;
  const studentName = student?.name || enrollment?.user?.name || "—";
  const universityId = student?.university_id || enrollment?.user?.university_id || "—";
  const siteName = student?.site_name || ta?.training_site?.name || ta?.trainingSite?.name || "—";
  const startDate = ta?.start_date ? String(ta.start_date).slice(0, 10) : "—";
  const endDate = ta?.end_date ? String(ta.end_date).slice(0, 10) : "—";
  const statusLabel = ta?.status_label || ta?.status || "—";

  return (
    <div className="sat-form-view">
      {/* رأسية */}
      <div className="sat-letterhead">
        <div className="sat-lh-logo">
          <img src={huLogo} alt="شعار جامعة الخليل" width="52" height="52" style={{ objectFit: "contain" }} />
          <div>
            <div className="sat-lh-title">جامعة الخليل</div>
            <div className="sat-lh-sub">كلية العلوم التربوية — قسم التدريب الميداني</div>
          </div>
        </div>
        <div className="sat-lh-actions">
          <div className="sat-lh-form-title">نموذج الحضور والغياب</div>
          <button type="button" className="sat-print-btn" onClick={printForm}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            طباعة
          </button>
        </div>
      </div>

      {/* معلومات الطالب */}
      <div className="sat-info-grid">
        <div className="sat-info-item">
          <span className="sat-info-label">اسم الطالب</span>
          <span className="sat-info-value">{studentName}</span>
        </div>
        <div className="sat-info-item">
          <span className="sat-info-label">الرقم الجامعي</span>
          <span className="sat-info-value">{universityId}</span>
        </div>
        <div className="sat-info-item">
          <span className="sat-info-label">جهة التدريب</span>
          <span className="sat-info-value">{siteName}</span>
        </div>
        <div className="sat-info-item">
          <span className="sat-info-label">الفترة من</span>
          <span className="sat-info-value">{startDate}</span>
        </div>
        <div className="sat-info-item">
          <span className="sat-info-label">الفترة إلى</span>
          <span className="sat-info-value">{endDate}</span>
        </div>
        <div className="sat-info-item">
          <span className="sat-info-label">الحالة</span>
          <span className="sat-info-value">{statusLabel}</span>
        </div>
      </div>

      {/* ملخص */}
      <div className="sat-summary-row">
        <div className="sat-sum-card">
          <div className="sat-sum-icon sat-icon-blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div><div className="sat-sum-num">{records.length}</div><div className="sat-sum-lbl">يوم تدريب</div></div>
        </div>
        <div className="sat-sum-card">
          <div className="sat-sum-icon sat-icon-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div><div className="sat-sum-num">{records.filter(r => r.approved_at).length}</div><div className="sat-sum-lbl">معتمد</div></div>
        </div>
        <div className="sat-sum-card">
          <div className="sat-sum-icon sat-icon-purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div><div className="sat-sum-num">{records.filter(r => r.check_in && r.check_out).length}</div><div className="sat-sum-lbl">يوم مكتمل</div></div>
        </div>
      </div>

      {/* الجدول */}
      {!records.length ? (
        <div style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: 14 }}>لا توجد سجلات حضور بعد</div>
      ) : (
        <div className="sat-table-wrap">
          <table className="sat-table">
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
              {records.map((r, idx) => (
                <tr key={r.id} className={r.approved_at ? "sat-row-ok" : r.status === "rejected" ? "sat-row-rej" : ""}>
                  <td className="sat-td-num">{idx + 1}</td>
                  <td>
                    <div className="sat-date-cell">
                      <span>{fmtDate(r.date)}</span>
                      <span className="sat-day-badge">{dayName(fmtDate(r.date))}</span>
                    </div>
                  </td>
                  <td className="sat-td-time">{fmtTime(r.check_in)}</td>
                  <td className="sat-td-time">{fmtTime(r.check_out)}</td>
                  <td>{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
                  <td className="sat-td-notes">{r.notes || "—"}</td>
                  <td>
                    {r.approved_at ? (
                      <span className="sat-badge sat-badge-success">معتمد ✓</span>
                    ) : r.status === "rejected" ? (
                      <div>
                        <span className="sat-badge sat-badge-danger">مرفوض ✗</span>
                        {r.rejection_reason && <div className="sat-rej-reason">{r.rejection_reason}</div>}
                      </div>
                    ) : (
                      <span className="sat-badge sat-badge-warning">بانتظار</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .sat-form-view { background:#fff; border:1.5px solid #e4e2f0; border-radius:14px; box-shadow:0 4px 16px rgba(108,60,225,0.07); overflow:hidden; direction:rtl; }
        .sat-letterhead { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:2px solid #6C3CE1; background:linear-gradient(135deg,#f8f5ff,#f0ecff); }
        .sat-lh-logo { display:flex; align-items:center; gap:11px; }
        .sat-lh-title { font-size:1rem; font-weight:800; color:#1e1e2d; }
        .sat-lh-sub { font-size:10.5px; color:#888; margin-top:2px; }
        .sat-lh-actions { display:flex; align-items:center; gap:12px; }
        .sat-lh-form-title { font-size:0.9rem; font-weight:700; color:#6C3CE1; background:#ede9ff; padding:5px 16px; border-radius:20px; }
        .sat-print-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; font-size:12px; font-weight:600; color:#6C3CE1; background:#f3f0ff; border:1px solid #e0d8f5; border-radius:8px; cursor:pointer; }
        .sat-print-btn:hover { background:#ede9ff; }
        .sat-info-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:16px 20px; border-bottom:1px solid #f0eef8; background:#fafaff; }
        .sat-info-item { background:#fff; border:1px solid #e8e8ef; border-radius:8px; padding:10px 14px; }
        .sat-info-label { display:block; font-size:10px; color:#999; font-weight:600; margin-bottom:4px; }
        .sat-info-value { display:block; font-size:13px; font-weight:700; color:#1e1e2d; }
        .sat-summary-row { display:flex; gap:10px; padding:14px 20px; border-bottom:1px solid #f0eef8; background:#fdfdff; }
        .sat-sum-card { flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #eee; border-radius:9px; padding:10px 12px; }
        .sat-sum-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .sat-icon-blue { background:#eef2ff; color:#4f6ef7; }
        .sat-icon-purple { background:#f3f0ff; color:#6C3CE1; }
        .sat-icon-green { background:#e6fcf0; color:#1a9d5c; }
        .sat-sum-num { font-size:1.2rem; font-weight:800; color:#1e1e2d; line-height:1.2; }
        .sat-sum-lbl { font-size:10.5px; color:#999; font-weight:500; margin-top:2px; }
        .sat-table-wrap { overflow-x:auto; }
        .sat-table { width:100%; min-width:600px; border-collapse:collapse; font-size:12.5px; }
        .sat-table th { background:linear-gradient(135deg,#f0ecff,#e8e2ff); color:#5a4a8a; font-weight:700; font-size:11px; padding:10px 11px; text-align:center; border-bottom:2px solid #d8d0f0; white-space:nowrap; }
        .sat-table td { padding:10px 11px; text-align:center; border-bottom:1px solid #f0eef8; vertical-align:middle; color:#2d2d3a; }
        .sat-table tbody tr:last-child td { border-bottom:none; }
        .sat-table tbody tr:hover td { background:#faf8ff; }
        .sat-row-ok td { background:#f0fdf4 !important; }
        .sat-row-rej td { background:#fff5f5 !important; }
        .sat-td-num { color:#b0a8c8; font-weight:700; font-size:11px; }
        .sat-td-time { font-weight:600; }
        .sat-td-notes { color:#666; max-width:120px; }
        .sat-date-cell { display:flex; flex-direction:column; align-items:center; gap:2px; }
        .sat-day-badge { font-size:9.5px; font-weight:700; color:#6C3CE1; background:#ede9ff; padding:1px 7px; border-radius:20px; }
        .sat-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:20px; font-size:10.5px; font-weight:700; }
        .sat-badge-success { background:#dcfce7; color:#15803d; }
        .sat-badge-warning { background:#fef9c3; color:#a16207; border:1px solid #fde68a; }
        .sat-badge-danger { background:#fee2e2; color:#b91c1c; }
        .sat-rej-reason { font-size:9.5px; color:#b91c1c; margin-top:3px; }
      `}</style>
    </div>
  );
}
