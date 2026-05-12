import { useEffect, useRef, useState } from "react";
import huLogo from "../../assets/HU Logo.webp";
import { getAttendances, getTrainingAssignments, storeAttendance, updateAttendance, deleteAttendance, submitAttendanceToManager, itemsFromPagedResponse } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function dayName(dateStr) {
  if (!dateStr) return "";
  return DAYS[new Date(dateStr).getDay()];
}

function formatTime(val) {
  if (!val) return "—";
  const m = val.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "—";
}

function formatDate(val) {
  if (!val) return "—";
  return val.slice(0, 10);
}

const EMPTY_FORM = { date: "", check_in: "", check_out: "", periods: "", notes: "" };

const HOURS = Array.from({length: 7}, (_, i) => (8 + i).toString().padStart(2, "0"));
const MINUTES = Array.from({length: 60}, (_, i) => i.toString().padStart(2, "0"));

function TimePickerField({ value, onChange, placeholder = "-- : --" }) {
  const [open, setOpen] = useState(false);
  const selH = value ? value.split(":")[0] : "";
  const selM = value ? value.split(":")[1] : "";
  const [pickedH, setPickedH] = useState(selH || "");
  const ref = useRef();
  const mRef = useRef();

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (open && mRef.current && selM) {
      const idx = parseInt(selM, 10);
      mRef.current.scrollTop = idx * 32 - 64;
    }
  }, [open, selM]);

  function pickHour(h) {
    setPickedH(h);
    const m = selM || "00";
    const clamped = h === "14" ? "00" : m;
    onChange(h + ":" + clamped);
  }

  function pickMinute(m) {
    const h = pickedH || selH || "08";
    if (h === "14" && parseInt(m) > 0) return;
    onChange(h + ":" + m);
    setOpen(false);
  }

  const displayH = pickedH || selH;

  return (
    <div ref={ref} className="atp-wrap">
      <button type="button" className={`atp-trigger ${open ? "atp-open" : ""} ${value ? "atp-has-value" : ""}`} onClick={() => { setPickedH(selH || ""); setOpen(o => !o); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>{value || placeholder}</span>
        <svg className="atp-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="atp-dropdown">
          <div className="atp-cols">
            <div className="atp-col">
              <div className="atp-col-label">ساعة</div>
              {HOURS.map(h => (
                <button key={h} type="button"
                  className={`atp-item ${displayH === h ? "atp-item-active" : ""}`}
                  onClick={() => pickHour(h)}>{h}</button>
              ))}
            </div>
            <div className="atp-divider" />
            <div className="atp-col atp-col-min" ref={mRef}>
              <div className="atp-col-label">دقيقة</div>
              {MINUTES.map(m => {
                const disabled = displayH === "14" && parseInt(m) > 0;
                return (
                  <button key={m} type="button" disabled={disabled}
                    className={`atp-item ${selM === m && displayH === (selH||pickedH) ? "atp-item-active" : ""} ${disabled ? "atp-item-disabled" : ""}`}
                    onClick={() => pickMinute(m)}>{m}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MentorAttendance() {
  const printRef = useRef();
  const [loadingAssign, setLoadingAssign] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignId, setSelectedAssignId] = useState("");
  const [selectedAssign, setSelectedAssign] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingAttend, setLoadingAttend] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [submittingToManager, setSubmittingToManager] = useState(false);

  const hasUnsubmitted = records.some(r => !r.submitted_to_manager_at);

  useEffect(() => {
    async function loadAssignments() {
      setLoadingAssign(true);
      try {
        const res = await getTrainingAssignments({ per_page: 100 });
        const items = itemsFromPagedResponse(res);
        setAssignments(items);
        if (items.length === 1) { setSelectedAssignId(String(items[0].id)); setSelectedAssign(items[0]); }
      } catch (e) { setError(e?.response?.data?.message || "فشل تحميل التعيينات"); }
      finally { setLoadingAssign(false); }
    }
    loadAssignments();
  }, []);

  useEffect(() => {
    if (!selectedAssignId) { setRecords([]); return; }
    loadRecords();
  }, [selectedAssignId]);

  async function loadRecords() {
    setLoadingAttend(true); setError("");
    try {
      const res = await getAttendances({ training_assignment_id: selectedAssignId, per_page: 200 });
      setRecords(itemsFromPagedResponse(res));
    } catch (e) { setError(e?.response?.data?.message || "فشل تحميل سجلات الحضور"); }
    finally { setLoadingAttend(false); }
  }

  function handleAssignChange(e) {
    const id = e.target.value;
    setSelectedAssignId(id);
    setSelectedAssign(assignments.find((a) => String(a.id) === id) || null);
    setForm({ ...EMPTY_FORM }); setEditingId(null); setSaveMsg(""); setError("");
  }

  function handleFormChange(field, value) { setForm((p) => ({ ...p, [field]: value })); }
  function resetForm() { setForm({ ...EMPTY_FORM }); setEditingId(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAssignId || !form.date) return;
    if (!editingId && records.some(r => formatDate(r.date) === form.date)) {
      setError("يوجد سجل حضور لهذا اليوم مسبقاً");
      return;
    }
    setSaving(true); setSaveMsg(""); setError("");
    try {
      const payload = {
        training_assignment_id: Number(selectedAssignId), date: form.date,
        check_in: form.check_in || null, check_out: form.check_out || null,
        status: "present", periods: form.periods !== "" ? Number(form.periods) : null, notes: form.notes || null,
      };
      if (editingId) { await updateAttendance(editingId, payload); setSaveMsg("تم تحديث السجل بنجاح ✓"); }
      else { await storeAttendance(payload); setSaveMsg("تم إضافة السجل بنجاح ✓"); }
      resetForm(); await loadRecords();
    } catch (e) { setError(e?.response?.data?.message || "فشل حفظ السجل"); }
    finally { setSaving(false); }
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setForm({ date: record.date || "", check_in: formatTime(record.check_in) !== "—" ? formatTime(record.check_in) : "", check_out: formatTime(record.check_out) !== "—" ? formatTime(record.check_out) : "", periods: record.periods ?? "", notes: record.notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    setSaving(true); setError("");
    try {
      await deleteAttendance(id); setSaveMsg("تم حذف السجل بنجاح");
      if (editingId === id) resetForm();
      await loadRecords();
    } catch (e) { setError(e?.response?.data?.message || "فشل حذف السجل"); }
    finally { setSaving(false); setConfirmDeleteId(null); }
  }

  function handlePrint() { window.print(); }

  async function handleSubmitToManager() {
    if (!selectedAssignId) return;
    if (!hasUnsubmitted) return;
    setSubmittingToManager(true); setError("");
    try {
      const res = await submitAttendanceToManager({ training_assignment_id: Number(selectedAssignId) });
      setSaveMsg(res.message || "تم إرسال النموذج للمدير بنجاح ✓");
      await loadRecords();
    } catch (e) { setError(e?.response?.data?.message || "فشل إرسال النموذج"); }
    finally { setSubmittingToManager(false); }
  }

  const student = selectedAssign?.enrollment?.user || selectedAssign?.student;
  const site = selectedAssign?.training_site;
  const savedCount = records.length;
  const totalMinutes = records.reduce((sum, r) => {
    const ci = formatTime(r.check_in);
    const co = formatTime(r.check_out);
    if (ci !== "—" && co !== "—") {
      const [h1, m1] = ci.split(":").map(Number);
      const [h2, m2] = co.split(":").map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      return sum + (diff > 0 ? diff : 0);
    }
    return sum;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  return (
    <div className="att-page">
      {/* شريط الأدوات */}
      <div className="att-toolbar no-print">
        <div className="att-toolbar-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h1>برنامج الحضور والغياب</h1>
        </div>
        <div className="att-toolbar-actions">
          {selectedAssignId && (
            <>
              <button type="button" className="att-btn att-btn-ghost" onClick={handlePrint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                طباعة
              </button>
              <button type="button" className="att-btn att-btn-submit-mgr" disabled={submittingToManager || !hasUnsubmitted} onClick={handleSubmitToManager}>
                {submittingToManager ? <LoadingSpinner size="button" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                )}
                {submittingToManager ? "جاري الإرسال..." : hasUnsubmitted ? "إرسال للمدير" : "تم الإرسال ✓"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* اختيار الطالب */}
      <div className="att-select-card no-print">
        <div className="att-select-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          اختر الطالب المتدرب
        </div>
        {loadingAssign ? (
          <div className="att-loading-bar"><div className="att-loading-bar-inner" /></div>
        ) : assignments.length === 0 ? (
          <div className="att-empty-msg">لا يوجد طلاب مرتبطون بحسابك حالياً</div>
        ) : (
          <select value={selectedAssignId} onChange={handleAssignChange} className="att-select">
            <option value="">-- اختر طالباً --</option>
            {assignments.map((a) => {
              const u = a.enrollment?.user || a.student;
              return <option key={a.id} value={a.id}>{u?.name || "طالب"} — {u?.university_id || ""}</option>;
            })}
          </select>
        )}
      </div>

      {error && <div className="att-alert att-alert-error no-print">{error}</div>}
      {saveMsg && <div className="att-alert att-alert-success no-print">{saveMsg}</div>}

      {selectedAssignId && (
        <>
          {loadingAttend ? (
            <div className="att-loading-card">جاري تحميل سجلات الحضور...</div>
          ) : (
            <>
              {/* نموذج الإضافة / التعديل */}
              <div className="att-form-card no-print">
                <div className="att-form-header">
                  <h3>{editingId ? "تعديل سجل الحضور" : "إضافة سجل حضور جديد"}</h3>
                  {editingId && (
                    <button type="button" className="att-btn att-btn-ghost att-btn-sm" onClick={resetForm}>إلغاء التعديل</button>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="att-form-grid">
                  <div className="att-form-group">
                    <label>التاريخ</label>
                    <input type="date" value={form.date} onChange={(e) => handleFormChange("date", e.target.value)} className="att-form-input" required />
                  </div>
                  <div className="att-form-group">
                    <label>ساعة الحضور</label>
                    <TimePickerField value={form.check_in} onChange={v => handleFormChange("check_in", v)} placeholder="-- : --" />
                  </div>
                  <div className="att-form-group">
                    <label>ساعة المغادرة</label>
                    <TimePickerField value={form.check_out} onChange={v => handleFormChange("check_out", v)} placeholder="-- : --" />
                  </div>
                  <div className="att-form-group">
                    <label>عدد الحصص</label>
                    <input type="number" min="0" max="10" value={form.periods} onChange={(e) => handleFormChange("periods", e.target.value)} className="att-form-input att-form-input-sm" placeholder="0" />
                  </div>
                  <div className="att-form-group">
                    <label>ملاحظات</label>
                    <input type="text" value={form.notes} onChange={(e) => handleFormChange("notes", e.target.value)} className="att-form-input" placeholder="ملاحظة..." />
                  </div>
                  <div className="att-form-actions">
                    <button type="submit" className="att-btn att-btn-primary" disabled={saving || !form.date}>
                      {saving && <LoadingSpinner size="button" />}
                      {saving ? "جاري الحفظ..." : editingId ? "تحديث السجل" : "إضافة السجل"}
                    </button>
                  </div>
                </form>
              </div>

              {/* النموذج القابل للطباعة */}
              <div ref={printRef} className="att-form">
                <div className="att-form-letterhead">
                  <div className="att-lh-logo">
                    <div className="att-lh-emblem">
                      <img src={huLogo} alt="شعار جامعة الخليل" width="52" height="52" className="object-contain" />
                    </div>
                    <div className="att-lh-text">
                      <div className="att-lh-title">جامعة الخليل</div>
                      <div className="att-lh-sub">كلية العلوم التربوية — قسم التدريب الميداني</div>
                    </div>
                  </div>
                  <div className="att-lh-form-title">نموذج الحضور والغياب</div>
                </div>

                <div className="att-info-grid">
                  <div className="att-info-item"><span className="att-info-label">اسم الطالب</span><span className="att-info-value">{student?.name || "—"}</span></div>
                  <div className="att-info-item"><span className="att-info-label">الرقم الجامعي</span><span className="att-info-value">{student?.university_id || "—"}</span></div>
                  <div className="att-info-item"><span className="att-info-label">جهة التدريب</span><span className="att-info-value">{site?.name || "—"}</span></div>
                  <div className="att-info-item"><span className="att-info-label">الفترة من</span><span className="att-info-value">{selectedAssign?.start_date || "—"}</span></div>
                  <div className="att-info-item"><span className="att-info-label">الفترة إلى</span><span className="att-info-value">{selectedAssign?.end_date || "—"}</span></div>
                  <div className="att-info-item"><span className="att-info-label">الحالة</span><span className="att-info-value"><span className={`att-badge ${selectedAssign?.status === "active" ? "att-badge-success" : "att-badge-default"}`}>{selectedAssign?.status_label || selectedAssign?.status || "—"}</span></span></div>
                </div>

                <div className="att-summary">
                  <div className="att-summary-item">
                    <div className="att-summary-icon att-summary-icon-blue">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                    </div>
                    <div>
                      <div className="att-summary-num">{savedCount}</div>
                      <div className="att-summary-label">يوم تدريب</div>
                    </div>
                  </div>
                  <div className="att-summary-item">
                    <div className="att-summary-icon att-summary-icon-purple">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div>
                      <div className="att-summary-num">{totalHours}<span className="att-summary-unit">س</span>{totalMins > 0 && <>{totalMins}<span className="att-summary-unit">د</span></>}</div>
                      <div className="att-summary-label">إجمالي الحضور</div>
                    </div>
                  </div>
                  <div className="att-summary-item">
                    <div className="att-summary-icon att-summary-icon-green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div className="att-summary-num">{records.filter(r => r.check_in && r.check_out).length}</div>
                      <div className="att-summary-label">يوم مكتمل</div>
                    </div>
                  </div>
                </div>

                {records.length > 0 ? (
                  <div className="att-table-wrap">
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th className="att-col-num">رقم السجل</th>
                        <th className="att-col-date">اليوم والتاريخ</th>
                        <th className="att-col-time">ساعة الحضور</th>
                        <th className="att-col-time">ساعة المغادرة</th>
                        <th className="att-col-periods">عدد الحصص</th>
                        <th className="att-col-notes">ملاحظات</th>
                        <th>الحالة</th>
                        <th className="att-col-actions no-print">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, idx) => (
                        <tr key={r.id} className={r.approved_at ? "att-row-saved" : ""}>
                          <td className="att-col-num">{idx + 1}</td>
                          <td className="att-col-date">
                            <div className="att-date-cell">
                              <span>{formatDate(r.date)}</span>
                              {r.date && <span className="att-day-badge">{dayName(formatDate(r.date))}</span>}
                            </div>
                          </td>
                          <td className="att-col-time">{formatTime(r.check_in)}</td>
                          <td className="att-col-time">{formatTime(r.check_out)}</td>
                          <td className="att-col-periods">{r.periods != null && r.periods !== "" ? r.periods : "—"}</td>
                          <td className="att-col-notes">{r.notes || "—"}</td>
                          <td>
                            {r.approved_at ? (
                              <span className="att-badge att-badge-success">معتمد ✓</span>
                            ) : r.status === "rejected" ? (
                              <div>
                                <span className="att-badge att-badge-danger">مرفوض ✗</span>
                                {r.rejection_reason && <div className="att-reject-reason">{r.rejection_reason}</div>}
                              </div>
                            ) : r.submitted_to_manager_at ? (
                              <span className="att-badge att-badge-info">مُرسل للمدير</span>
                            ) : (
                              <span className="att-badge att-badge-warning">مسودة</span>
                            )}
                          </td>
                          <td className="att-col-actions no-print">
                            {confirmDeleteId === r.id ? (
                              <div className="att-confirm-delete">
                                <span>تأكيد الحذف؟</span>
                                <button type="button" className="att-btn att-btn-danger att-btn-sm" onClick={() => handleDelete(r.id)}>نعم</button>
                                <button type="button" className="att-btn att-btn-ghost att-btn-sm" onClick={() => setConfirmDeleteId(null)}>لا</button>
                              </div>
                            ) : (
                              <>
                                <button type="button" className="att-icon-btn" title="تعديل" onClick={() => handleEdit(r)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C3CE1" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button type="button" className="att-icon-btn att-icon-btn-danger" title="حذف" onClick={() => setConfirmDeleteId(r.id)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <div className="att-empty-records">لا توجد سجلات حضور بعد — أضف سجلاً جديداً من النموذج أعلاه</div>
                )}

              </div>
            </>
          )}
        </>
      )}

      <style>{`
        .att-page { direction: rtl; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 1100px; margin: 0 auto; padding: 0 16px 40px; }

        /* ─── شريط الأدوات ─── */
        .att-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 16px 0; border-bottom: 1px solid #e8e8ef; margin-bottom: 20px; }
        .att-toolbar-title { display: flex; align-items: center; gap: 10px; color: #1e1e2d; }
        .att-toolbar-title h1 { font-size: 1.25rem; font-weight: 700; margin: 0; }
        .att-toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* ─── الأزرار ─── */
        .att-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; }
        .att-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .att-btn-sm { padding: 4px 10px; font-size: 11px; }
        .att-btn-primary { background: linear-gradient(135deg, #6C3CE1, #8B5CF6); color: #fff; box-shadow: 0 2px 8px rgba(108,60,225,0.25); }
        .att-btn-primary:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(108,60,225,0.35); transform: translateY(-1px); }
        .att-btn-ghost { background: #f3f0ff; color: #6C3CE1; border: 1px solid transparent; }
        .att-btn-ghost:hover { background: #ebe5ff; }
        .att-btn-danger { background: #dc3545; color: #fff; }
        .att-btn-submit-mgr { background: linear-gradient(135deg, #0891b2, #06b6d4); color: #fff; box-shadow: 0 2px 8px rgba(8,145,178,0.25); }
        .att-btn-submit-mgr:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(8,145,178,0.35); transform: translateY(-1px); }
        .att-btn-submit-mgr:disabled { background: #94a3b8; box-shadow: none; }

        .att-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: att-spin 0.6s linear infinite; }
        @keyframes att-spin { to { transform: rotate(360deg); } }

        /* ─── اختيار الطالب ─── */
        .att-select-card { background: #fff; border: 1px solid #e8e8ef; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .att-select-label { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: #444; margin-bottom: 10px; }
        .att-select { width: 100%; max-width: 420px; padding: 10px 14px; border: 1.5px solid #d0d0dd; border-radius: 8px; font-size: 14px; font-family: inherit; background: #fafafe; color: #1e1e2d; transition: border-color 0.2s, box-shadow 0.2s; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236C3CE1' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 14px center; }
        .att-select:focus { outline: none; border-color: #6C3CE1; box-shadow: 0 0 0 3px rgba(108,60,225,0.12); }
        .att-loading-bar { height: 6px; background: #ebe5ff; border-radius: 3px; overflow: hidden; }
        .att-loading-bar-inner { height: 100%; width: 40%; background: linear-gradient(90deg, #6C3CE1, #a78bfa); border-radius: 3px; animation: att-bar 1.2s ease-in-out infinite; }
        @keyframes att-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        .att-empty-msg { color: #999; font-size: 14px; }
        .att-loading-card { text-align: center; padding: 40px; color: #888; }

        .att-alert { padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
        .att-alert-error { background: #fff0f0; color: #c0392b; border: 1px solid #fdd; }
        .att-alert-success { background: #f0fff4; color: #27ae60; border: 1px solid #c6f6d5; }

        /* ─── نموذج الإضافة/التعديل ─── */
        .att-form-card { background: #fff; border: 1px solid #e8e8ef; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .att-form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .att-form-header h3 { font-size: 15px; font-weight: 700; color: #1e1e2d; margin: 0; }
        .att-form-grid { display: grid; grid-template-columns: 180px 130px 130px 90px 1fr auto; gap: 12px; align-items: end; }
        @media (max-width: 700px) { .att-form-grid { grid-template-columns: 1fr 1fr; } }
        .att-form-group { display: flex; flex-direction: column; gap: 5px; }
        .att-form-group label { font-size: 11px; font-weight: 600; color: #888; letter-spacing: 0.3px; }
        .att-form-input { padding: 8px 10px; border: 1.5px solid #d0d0dd; border-radius: 8px; font-size: 13px; font-family: inherit; color: #1e1e2d; background: #fafafe; transition: border-color 0.2s, box-shadow 0.2s; width: 100%; box-sizing: border-box; }
        .att-form-input:focus { outline: none; border-color: #6C3CE1; box-shadow: 0 0 0 3px rgba(108,60,225,0.12); }
        .att-form-actions { display: flex; align-items: end; padding-bottom: 0; }

        /* ─── النموذج القابل للطباعة ─── */
        .att-form { background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 32px; border: 1px solid #e8e8ef; }

        .att-form-letterhead { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 2px solid #6C3CE1; }
        .att-lh-logo { display: flex; align-items: center; gap: 12px; }
        .att-lh-emblem { flex-shrink: 0; }
        .att-lh-title { font-size: 1.15rem; font-weight: 800; color: #1e1e2d; }
        .att-lh-sub { font-size: 12px; color: #888; margin-top: 2px; }
        .att-lh-form-title { font-size: 1rem; font-weight: 700; color: #6C3CE1; background: #f3f0ff; padding: 6px 18px; border-radius: 20px; }

        .att-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .att-info-item { background: #fafaff; border: 1px solid #e8e8ef; border-radius: 8px; padding: 10px 14px; }
        .att-info-label { display: block; font-size: 11px; color: #999; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
        .att-info-value { display: block; font-size: 14px; font-weight: 600; color: #1e1e2d; }
        .att-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.2px; }
        .att-badge-success { background: #dcfce7; color: #15803d; }
        .att-badge-default { background: #f0f0f5; color: #666; }
        .att-badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fde68a; }
        .att-badge-danger { background: #fee2e2; color: #b91c1c; }
        .att-badge-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .att-reject-reason { font-size: 10px; color: #b91c1c; margin-top: 4px; line-height: 1.4; max-width: 140px; }

        .att-summary { display: flex; gap: 12px; margin-bottom: 20px; }
        .att-summary-item { flex: 1; display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .att-summary-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .att-summary-icon-blue { background: #eef2ff; color: #4f6ef7; }
        .att-summary-icon-purple { background: #f3f0ff; color: #6C3CE1; }
        .att-summary-icon-green { background: #e6fcf0; color: #1a9d5c; }
        .att-summary-num { font-size: 1.4rem; font-weight: 800; color: #1e1e2d; line-height: 1.2; }
        .att-summary-unit { font-size: 0.75rem; font-weight: 600; color: #888; margin-right: 2px; }
        .att-summary-label { font-size: 11px; color: #999; font-weight: 500; margin-top: 2px; }

        /* ─── الجدول ─── */
        .att-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #e4e2f0; box-shadow: 0 2px 8px rgba(108,60,225,0.06); }
        .att-table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13px; }
        .att-table thead tr { background: linear-gradient(135deg, #f0ecff, #e8e2ff); }
        .att-table th { color: #5a4a8a; font-weight: 700; font-size: 11.5px; padding: 13px 14px; text-align: center; border-bottom: 2px solid #d8d0f0; white-space: nowrap; letter-spacing: 0.2px; }
        .att-table td { padding: 12px 14px; text-align: center; border-bottom: 1px solid #f0eef8; vertical-align: middle; color: #2d2d3a; font-size: 13px; }
        .att-table tbody tr:last-child td { border-bottom: none; }
        .att-table tbody tr:hover td { background: #faf8ff; }
        .att-row-saved td { background: #f4fff8 !important; }
        .att-col-num { width: 80px; color: #b0a8c8; font-weight: 700; font-size: 12px; }
        .att-col-date { min-width: 130px; }
        .att-col-time { min-width: 90px; font-weight: 600; color: #444; font-variant-numeric: tabular-nums; }
        .att-col-periods { width: 70px; }
        .att-col-notes { min-width: 110px; color: #666; }
        .att-col-actions { width: 90px; }

        .att-date-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .att-date-cell span:first-child { font-weight: 600; font-size: 13px; color: #1e1e2d; font-variant-numeric: tabular-nums; }
        .att-day-badge { display: inline-block; font-size: 10px; font-weight: 700; color: #6C3CE1; background: #ede9ff; padding: 2px 10px; border-radius: 20px; }
        .att-date-picker-wrap { position: relative; }
        .att-date-hidden { position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer; z-index: 1; }
        .att-date-display { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1.5px solid #d0d0dd; border-radius: 8px; font-size: 13px; font-family: inherit; color: #1e1e2d; background: #fafafe; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; white-space: nowrap; }
        .att-date-picker-wrap:focus-within .att-date-display { border-color: #6C3CE1; box-shadow: 0 0 0 3px rgba(108,60,225,0.12); }
        .att-date-placeholder { color: #aaa; }
        .atp-wrap { position: relative; }
        .atp-trigger { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 1.5px solid #d0d0dd; border-radius: 8px; font-size: 13px; font-family: inherit; color: #aaa; background: #fafafe; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; text-align: right; white-space: nowrap; overflow: hidden; height: 38px; box-sizing: border-box; }
        .atp-trigger.atp-has-value { color: #1e1e2d; }
        .atp-trigger.atp-open, .atp-trigger:focus { outline: none; border-color: #6C3CE1; box-shadow: 0 0 0 3px rgba(108,60,225,0.12); color: #1e1e2d; }
        .atp-trigger svg:first-child { color: #6C3CE1; flex-shrink: 0; }
        .atp-trigger span { flex: 1; }
        .atp-chevron { color: #aaa; flex-shrink: 0; transition: transform 0.2s; }
        .atp-open .atp-chevron { transform: rotate(180deg); }
        .atp-dropdown { position: absolute; top: calc(100% + 6px); right: 0; left: 0; background: #fff; border: 1.5px solid #e0daf7; border-radius: 12px; box-shadow: 0 8px 28px rgba(108,60,225,0.15); z-index: 200; min-width: 200px; overflow: hidden; }
        .atp-cols { display: flex; }
        .atp-col { flex: 1; display: flex; flex-direction: column; max-height: 220px; overflow-y: auto; padding: 4px; scrollbar-width: thin; scrollbar-color: #d0d0dd transparent; }
        .atp-col::-webkit-scrollbar { width: 4px; }
        .atp-col::-webkit-scrollbar-thumb { background: #d0d0dd; border-radius: 2px; }
        .atp-col-min { border-right: 1px solid #f0eeff; }
        .atp-col-label { font-size: 10px; font-weight: 700; color: #6C3CE1; text-align: center; padding: 6px 4px 4px; letter-spacing: 0.5px; position: sticky; top: 0; background: #fff; z-index: 1; border-bottom: 1px solid #f0eeff; margin-bottom: 2px; }
        .atp-divider { width: 1px; background: #f0eeff; }
        .atp-item { display: block; width: 100%; padding: 7px 6px; border-radius: 6px; border: none; background: transparent; font-size: 13px; font-family: inherit; color: #333; cursor: pointer; text-align: center; font-weight: 500; transition: background 0.12s, color 0.12s; }
        .atp-item:hover:not(:disabled) { background: #f3f0ff; color: #6C3CE1; }
        .atp-item-active { background: #6C3CE1 !important; color: #fff !important; font-weight: 700; border-radius: 6px; }
        .atp-item-disabled { opacity: 0.3; cursor: not-allowed; }

        /* ─── أزرار الأيقونات ─── */
        .att-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid transparent; background: transparent; cursor: pointer; transition: all 0.15s; }
        .att-icon-btn:hover { background: #f3f0ff; border-color: #e0d8ff; }
        .att-icon-btn-danger:hover { background: #fff0f0; border-color: #ffd0d0; }

        /* ─── تأكيد الحذف ─── */
        .att-confirm-delete { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #dc3545; white-space: nowrap; }
        .att-confirm-delete span { font-weight: 600; }

        /* ─── سجلات فارغة ─── */
        .att-empty-records { text-align: center; padding: 32px 16px; color: #aaa; font-size: 14px; background: #fafaff; border-radius: 10px; border: 1px dashed #d0d0dd; }

        /* ─── التوقيعات ─── */
        .att-signatures { display: flex; gap: 24px; margin-top: 32px; }
        .att-sig-box { flex: 1; border: 1.5px dashed #c8c8d8; border-radius: 10px; padding: 14px 18px; background: #fafaff; }
        .att-sig-title { font-size: 13px; font-weight: 700; color: #444; margin-bottom: 28px; }
        .att-sig-line { border-bottom: 1.5px solid #bbb; margin-bottom: 10px; }
        .att-sig-stamp { font-size: 11px; color: #999; }

        /* ─── الطباعة ─── */
        @media print {
          .no-print { display: none !important; }
          .att-page { padding: 0; }
          .att-form { box-shadow: none; border: none; padding: 16px; border-radius: 0; }
          .att-table th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .att-info-item { border: 1px solid #ccc; }
          .att-sig-box { border: 1px solid #999; background: none; }
          .att-lh-form-title { background: none; border: 1px solid #999; }
          body { direction: rtl; }
        }
      `}</style>
    </div>
  );
}
