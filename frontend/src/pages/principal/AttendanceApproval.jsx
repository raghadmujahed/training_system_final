import { useEffect, useState } from "react";
import { getAttendances, approveAttendance, rejectAttendance, itemsFromPagedResponse } from "../../services/api";
import huLogo from "../../assets/HU Logo.webp";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function dayName(d) { return d ? DAYS[new Date(d).getDay()] : ""; }
function fmtTime(v) { const m = v?.match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : "—"; }
function fmtDate(v) { return v ? v.slice(0, 10) : "—"; }
function calcTotalMinutes(recs) {
  return recs.reduce((sum, r) => {
    const ci = fmtTime(r.check_in), co = fmtTime(r.check_out);
    if (ci === "—" || co === "—") return sum;
    const [h1, m1] = ci.split(":").map(Number), [h2, m2] = co.split(":").map(Number);
    const d = (h2 * 60 + m2) - (h1 * 60 + m1);
    return sum + (d > 0 ? d : 0);
  }, 0);
}

export default function AttendanceApproval() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await getAttendances({ per_page: 500 });
      const items = itemsFromPagedResponse(res);
      setRecords(items);
    } catch { setError("تعذر تحميل السجلات"); }
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    setProcessing(true); setError("");
    try { await approveAttendance(id); setMsg("تمت الموافقة ✓"); await load(); }
    catch (e) { setError(e?.response?.data?.message || "فشل الموافقة"); }
    finally { setProcessing(false); }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) { setError("أدخل سبب الرفض"); return; }
    setProcessing(true); setError("");
    try {
      await rejectAttendance(id, { rejection_reason: rejectReason.trim() });
      setMsg("تم رفض السجل ✓"); setRejectingId(null); setRejectReason(""); await load();
    } catch (e) { setError(e?.response?.data?.message || "فشل الرفض"); }
    finally { setProcessing(false); }
  }

  async function handleApproveAll(recs) {
    setProcessing(true); setError("");
    try {
      for (const r of recs) if (!r.approved_at && r.status !== "rejected") await approveAttendance(r.id);
      setMsg("تمت الموافقة على جميع السجلات ✓"); await load();
    } catch (e) { setError(e?.response?.data?.message || "فشل الموافقة"); }
    finally { setProcessing(false); }
  }

  // تجميع حسب training_assignment_id
  const forms = {};
  for (const r of records) {
    const key = r.training_assignment?.id || r.training_assignment_id;
    if (!forms[key]) {
      const ta = r.training_assignment;
      forms[key] = {
        key,
        student: ta?.enrollment?.user || {},
        studentId: ta?.enrollment?.user?.university_id || "—",
        teacherName: ta?.teacher?.name || r.user?.name || "—",
        site: ta?.training_site?.name || "—",
        startDate: ta?.start_date || "—",
        endDate: ta?.end_date || "—",
        records: [],
      };
    }
    forms[key].records.push(r);
  }

  const formList = Object.values(forms);

  // حساب حالة كل نموذج
  function formStatus(f) {
    if (f.records.every(r => !!r.approved_at)) return "approved";
    if (f.records.some(r => r.status === "rejected")) return "rejected";
    return "pending";
  }

  const filtered = formList.filter(f => filterStatus === "all" || formStatus(f) === filterStatus);
  const pendingCount = formList.filter(f => formStatus(f) === "pending").length;
  const approvedCount = formList.filter(f => formStatus(f) === "approved").length;
  const rejectedCount = formList.filter(f => formStatus(f) === "rejected").length;

  const activeForm = formList.find(f => f.key === activeKey);

  return (
    <div className="aa-page">
      {/* شريط العنوان */}
      <div className="aa-toolbar">
        <div className="aa-toolbar-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h1>اعتماد نماذج الحضور</h1>
        </div>
      </div>

      {msg && <div className="aa-alert aa-success" onClick={() => setMsg("")}>{msg} <span>✕</span></div>}
      {error && <div className="aa-alert aa-error" onClick={() => setError("")}>{error} <span>✕</span></div>}

      {loading ? (
        <div className="aa-loading">جاري تحميل النماذج...</div>
      ) : (
        <div className="aa-layout">
          {/* القائمة الجانبية */}
          <div className="aa-sidebar">
            <div className="aa-sidebar-header">
              <span>النماذج المستلمة</span>
              <span className="aa-total-badge">{formList.length}</span>
            </div>

            {/* فلاتر */}
            <div className="aa-filter-tabs">
              {[["all","الكل",formList.length],["pending","بانتظار",pendingCount],["approved","معتمد",approvedCount],["rejected","مرفوض",rejectedCount]].map(([k,l,c]) => (
                <button key={k} className={`aa-filter-tab ${filterStatus===k?"aa-filter-active":""}`} onClick={() => setFilterStatus(k)}>
                  {l} <span className="aa-filter-count">{c}</span>
                </button>
              ))}
            </div>

            {/* قائمة الطلاب */}
            {filtered.length === 0 ? (
              <div className="aa-list-empty">لا توجد نماذج</div>
            ) : filtered.map(f => {
              const st = formStatus(f);
              const pending = f.records.filter(r => !r.approved_at && r.status !== "rejected");
              const isActive = activeKey === f.key;
              return (
                <button key={f.key} className={`aa-list-item ${isActive ? "aa-list-item-active" : ""}`} onClick={() => setActiveKey(isActive ? null : f.key)}>
                  <div className="aa-list-item-top">
                    <span className="aa-list-name">{f.student?.name || "—"}</span>
                    <span className={`aa-st-dot aa-st-${st}`}></span>
                  </div>
                  <div className="aa-list-item-bot">
                    <span className="aa-list-site">{f.site}</span>
                    <span className="aa-list-count">{f.records.length} سجل{pending.length > 0 && ` · ${pending.length} معلق`}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* منطقة عرض النموذج */}
          <div className="aa-content">
            {!activeForm ? (
              <div className="aa-no-selection">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d0dd" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                <p>اختر طالباً من القائمة لعرض نموذج حضوره</p>
              </div>
            ) : (() => {
              const form = activeForm;
              const pending = form.records.filter(r => !r.approved_at && r.status !== "rejected");
              const allApproved = form.records.every(r => !!r.approved_at);
              const hasRejected = form.records.some(r => r.status === "rejected");
              const sorted = [...form.records].sort((a, b) => a.date > b.date ? 1 : -1);
              const totalMin = calcTotalMinutes(form.records);
              const totalH = Math.floor(totalMin / 60), totalM = totalMin % 60;
              const completeDays = form.records.filter(r => r.check_in && r.check_out).length;

              return (
                <div className="aa-form-view">
                  {/* رأسية النموذج */}
                  <div className="aa-letterhead">
                    <div className="aa-lh-logo">
                      <img src={huLogo} alt="شعار جامعة الخليل" width="50" height="50" style={{objectFit:"contain"}} />
                      <div>
                        <div className="aa-lh-title">جامعة الخليل</div>
                        <div className="aa-lh-sub">كلية العلوم التربوية — قسم التدريب الميداني</div>
                      </div>
                    </div>
                    <div className="aa-lh-form-title">نموذج الحضور والغياب</div>
                  </div>

                  {/* معلومات */}
                  <div className="aa-info-grid">
                    <div className="aa-info-item"><span className="aa-info-label">اسم الطالب</span><span className="aa-info-value">{form.student?.name || "—"}</span></div>
                    <div className="aa-info-item"><span className="aa-info-label">الرقم الجامعي</span><span className="aa-info-value">{form.studentId}</span></div>
                    <div className="aa-info-item"><span className="aa-info-label">جهة التدريب</span><span className="aa-info-value">{form.site}</span></div>
                    <div className="aa-info-item"><span className="aa-info-label">الفترة من</span><span className="aa-info-value">{form.startDate}</span></div>
                    <div className="aa-info-item"><span className="aa-info-label">الفترة إلى</span><span className="aa-info-value">{form.endDate}</span></div>
                    <div className="aa-info-item"><span className="aa-info-label">الحالة</span><span className="aa-info-value">
                      {allApproved ? <span className="aa-badge aa-badge-success">معتمد بالكامل ✓</span>
                        : hasRejected ? <span className="aa-badge aa-badge-danger">يحتوي مرفوض</span>
                        : <span className="aa-badge aa-badge-warning">بانتظار الاعتماد</span>}
                    </span></div>
                  </div>

                  {/* ملخص */}
                  <div className="aa-summary-row">
                    <div className="aa-sum-card">
                      <div className="aa-sum-icon aa-icon-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                      <div><div className="aa-sum-num">{form.records.length}</div><div className="aa-sum-lbl">يوم تدريب</div></div>
                    </div>
                    <div className="aa-sum-card">
                      <div className="aa-sum-icon aa-icon-purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                      <div><div className="aa-sum-num">{totalH}<span className="aa-sum-unit">س</span>{totalM > 0 && <>{totalM}<span className="aa-sum-unit">د</span></>}</div><div className="aa-sum-lbl">إجمالي الحضور</div></div>
                    </div>
                    <div className="aa-sum-card">
                      <div className="aa-sum-icon aa-icon-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
                      <div><div className="aa-sum-num">{completeDays}</div><div className="aa-sum-lbl">يوم مكتمل</div></div>
                    </div>
                  </div>

                  {/* الجدول */}
                  <div className="aa-table-wrap">
                    <table className="aa-table">
                      <thead>
                        <tr>
                          <th style={{width:70}}>رقم السجل</th>
                          <th>اليوم والتاريخ</th>
                          <th>ساعة الحضور</th>
                          <th>ساعة المغادرة</th>
                          <th style={{width:70}}>الحصص</th>
                          <th>ملاحظات</th>
                          <th>الحالة</th>
                          <th style={{minWidth:155}}>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r, idx) => (
                          <tr key={r.id} className={r.approved_at ? "aa-row-ok" : r.status === "rejected" ? "aa-row-rej" : ""}>
                            <td className="aa-td-num">{idx + 1}</td>
                            <td>
                              <div className="aa-date-cell">
                                <span>{fmtDate(r.date)}</span>
                                <span className="aa-day-badge">{dayName(fmtDate(r.date))}</span>
                              </div>
                            </td>
                            <td className="aa-td-time">{fmtTime(r.check_in)}</td>
                            <td className="aa-td-time">{fmtTime(r.check_out)}</td>
                            <td>{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
                            <td className="aa-td-notes">{r.notes || "—"}</td>
                            <td>
                              {r.approved_at
                                ? <span className="aa-badge aa-badge-success">معتمد ✓</span>
                                : r.status === "rejected"
                                  ? <div><span className="aa-badge aa-badge-danger">مرفوض ✗</span>{r.rejection_reason && <div className="aa-rej-reason">{r.rejection_reason}</div>}</div>
                                  : <span className="aa-badge aa-badge-warning">بانتظار</span>}
                            </td>
                            <td>
                              {rejectingId === r.id ? (
                                <div className="aa-rej-form">
                                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="سبب الرفض..." className="aa-rej-input" autoFocus />
                                  <div className="aa-rej-btns">
                                    <button className="aa-btn aa-btn-danger aa-btn-sm" disabled={processing} onClick={() => handleReject(r.id)}>{processing ? "..." : "تأكيد"}</button>
                                    <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => { setRejectingId(null); setRejectReason(""); }}>إلغاء</button>
                                  </div>
                                </div>
                              ) : !r.approved_at ? (
                                <div className="aa-action-btns">
                                  <button className="aa-btn aa-btn-success aa-btn-sm" disabled={processing} onClick={() => handleApprove(r.id)}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> موافقة
                                  </button>
                                  <button className="aa-btn aa-btn-danger-outline aa-btn-sm" disabled={processing} onClick={() => { setRejectingId(r.id); setError(""); }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> رفض
                                  </button>
                                </div>
                              ) : <span style={{color:"#94a3b8"}}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* شريط الاعتماد */}
                  {pending.length > 0 && (
                    <div className="aa-form-footer">
                      <span className="aa-footer-info">{pending.length} سجل بانتظار الموافقة</span>
                      <button className="aa-btn aa-btn-success" disabled={processing} onClick={() => handleApproveAll(pending)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        اعتماد الكل ({pending.length})
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        .aa-page { direction: rtl; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 1150px; margin: 0 auto; padding: 0 16px 40px; }
        .aa-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 2px solid #e8e8ef; margin-bottom: 20px; }
        .aa-toolbar-title { display: flex; align-items: center; gap: 9px; color: #1e1e2d; }
        .aa-toolbar-title h1 { font-size: 1.15rem; font-weight: 700; margin: 0; }
        .aa-alert { padding: 10px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; cursor: pointer; display: flex; justify-content: space-between; }
        .aa-error { background: #fff0f0; color: #c0392b; border: 1px solid #fdd; }
        .aa-success { background: #f0fff4; color: #27ae60; border: 1px solid #c6f6d5; }
        .aa-loading { text-align:center; padding:60px; color:#888; }

        /* ─── تخطيط القائمة + المحتوى ─── */
        .aa-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 720px) { .aa-layout { grid-template-columns: 1fr; } }

        /* ─── القائمة الجانبية ─── */
        .aa-sidebar { background: #fff; border: 1.5px solid #e4e2f0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(108,60,225,0.06); position: sticky; top: 16px; }
        .aa-sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(135deg,#f0ecff,#e8e2ff); font-size: 13px; font-weight: 700; color: #5a4a8a; border-bottom: 1px solid #d8d0f0; }
        .aa-total-badge { background: #6C3CE1; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
        .aa-filter-tabs { display: flex; gap: 0; border-bottom: 1px solid #e8e8ef; overflow-x: auto; }
        .aa-filter-tab { flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 600; color: #888; background: transparent; border: none; cursor: pointer; transition: all 0.15s; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .aa-filter-tab:hover { color: #6C3CE1; background: #faf8ff; }
        .aa-filter-active { color: #6C3CE1; border-bottom: 2px solid #6C3CE1; background: #faf8ff; }
        .aa-filter-count { background: #ede9ff; color: #6C3CE1; border-radius: 10px; padding: 0 6px; font-size: 10px; }
        .aa-list-empty { padding: 24px 16px; text-align: center; color: #aaa; font-size: 12px; }
        .aa-list-item { width: 100%; text-align: right; padding: 12px 16px; background: transparent; border: none; border-bottom: 1px solid #f0eef8; cursor: pointer; transition: background 0.12s; display: block; }
        .aa-list-item:last-child { border-bottom: none; }
        .aa-list-item:hover { background: #faf8ff; }
        .aa-list-item-active { background: #f3f0ff !important; border-right: 3px solid #6C3CE1; }
        .aa-list-item-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .aa-list-name { font-size: 13px; font-weight: 700; color: #1e1e2d; }
        .aa-list-item-bot { display: flex; align-items: center; justify-content: space-between; }
        .aa-list-site { font-size: 11px; color: #888; }
        .aa-list-count { font-size: 11px; color: #6C3CE1; font-weight: 600; }
        .aa-st-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .aa-st-pending { background: #f59e0b; }
        .aa-st-approved { background: #16a34a; }
        .aa-st-rejected { background: #dc3545; }

        /* ─── منطقة المحتوى ─── */
        .aa-content { min-height: 400px; }
        .aa-no-selection { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 80px 20px; color: #bbb; font-size: 14px; background: #fafaff; border-radius: 12px; border: 1.5px dashed #e0ddf0; }
        .aa-form-view { background: #fff; border: 1.5px solid #e4e2f0; border-radius: 14px; box-shadow: 0 4px 16px rgba(108,60,225,0.07); overflow: hidden; }

        /* ─── رأسية النموذج ─── */
        .aa-letterhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 2px solid #6C3CE1; background: linear-gradient(135deg,#f8f5ff,#f0ecff); }
        .aa-lh-logo { display: flex; align-items: center; gap: 11px; }
        .aa-lh-title { font-size: 1rem; font-weight: 800; color: #1e1e2d; }
        .aa-lh-sub { font-size: 10.5px; color: #888; margin-top: 2px; }
        .aa-lh-form-title { font-size: 0.9rem; font-weight: 700; color: #6C3CE1; background: #ede9ff; padding: 5px 16px; border-radius: 20px; }

        /* ─── معلومات ─── */
        .aa-info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 16px 20px; border-bottom: 1px solid #f0eef8; }
        .aa-info-item { background: #fafaff; border: 1px solid #eeecf8; border-radius: 8px; padding: 9px 12px; }
        .aa-info-label { display: block; font-size: 10px; color: #aaa; font-weight: 600; margin-bottom: 3px; letter-spacing: 0.3px; }
        .aa-info-value { display: block; font-size: 13px; font-weight: 700; color: #1e1e2d; }

        /* ─── ملخص ─── */
        .aa-summary-row { display: flex; gap: 10px; padding: 14px 20px; border-bottom: 1px solid #f0eef8; background: #fdfdff; }
        .aa-sum-card { flex: 1; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #eee; border-radius: 9px; padding: 10px 12px; }
        .aa-sum-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aa-icon-blue { background: #eef2ff; color: #4f6ef7; }
        .aa-icon-purple { background: #f3f0ff; color: #6C3CE1; }
        .aa-icon-green { background: #e6fcf0; color: #1a9d5c; }
        .aa-sum-num { font-size: 1.2rem; font-weight: 800; color: #1e1e2d; line-height: 1.2; }
        .aa-sum-unit { font-size: 0.68rem; font-weight: 600; color: #888; margin-right: 1px; }
        .aa-sum-lbl { font-size: 10.5px; color: #999; font-weight: 500; margin-top: 2px; }

        /* ─── الجدول ─── */
        .aa-table-wrap { overflow-x: auto; }
        .aa-table { width: 100%; min-width: 650px; border-collapse: collapse; font-size: 12.5px; }
        .aa-table th { background: linear-gradient(135deg,#f0ecff,#e8e2ff); color: #5a4a8a; font-weight: 700; font-size: 11px; padding: 10px 11px; text-align: center; border-bottom: 2px solid #d8d0f0; white-space: nowrap; }
        .aa-table td { padding: 10px 11px; text-align: center; border-bottom: 1px solid #f0eef8; vertical-align: middle; color: #2d2d3a; }
        .aa-table tbody tr:last-child td { border-bottom: none; }
        .aa-table tbody tr:hover td { background: #faf8ff; }
        .aa-row-ok td { background: #f0fdf4 !important; }
        .aa-row-rej td { background: #fff5f5 !important; }
        .aa-td-num { color: #b0a8c8; font-weight: 700; font-size: 11px; }
        .aa-td-time { font-weight: 600; font-variant-numeric: tabular-nums; }
        .aa-td-notes { color: #666; max-width: 120px; }
        .aa-date-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .aa-day-badge { font-size: 9.5px; font-weight: 700; color: #6C3CE1; background: #ede9ff; padding: 1px 7px; border-radius: 20px; }
        .aa-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 10.5px; font-weight: 700; }
        .aa-badge-success { background: #dcfce7; color: #15803d; }
        .aa-badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fde68a; }
        .aa-badge-danger { background: #fee2e2; color: #b91c1c; }
        .aa-rej-reason { font-size: 9.5px; color: #b91c1c; margin-top: 3px; }
        .aa-form-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #f8f5ff; border-top: 1px solid #e4e2f0; }
        .aa-footer-info { font-size: 12.5px; color: #6C3CE1; font-weight: 600; }

        /* ─── الأزرار ─── */
        .aa-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 15px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; font-family: inherit; }
        .aa-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .aa-btn-sm { padding: 4px 10px; font-size: 11px; }
        .aa-btn-success { background: #16a34a; color: #fff; }
        .aa-btn-success:hover:not(:disabled) { background: #15803d; }
        .aa-btn-danger { background: #dc3545; color: #fff; }
        .aa-btn-danger-outline { background: transparent; color: #dc3545; border: 1.5px solid #dc3545; }
        .aa-btn-danger-outline:hover:not(:disabled) { background: #fff0f0; }
        .aa-btn-ghost { background: #f3f0ff; color: #6C3CE1; }
        .aa-action-btns { display: flex; gap: 4px; justify-content: center; }
        .aa-rej-form { display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
        .aa-rej-input { padding: 4px 7px; border: 1.5px solid #d0d0dd; border-radius: 6px; font-size: 11.5px; font-family: inherit; width: 100%; box-sizing: border-box; }
        .aa-rej-input:focus { outline: none; border-color: #dc3545; }
        .aa-rej-btns { display: flex; gap: 3px; }
      `}</style>
    </div>
  );
}
