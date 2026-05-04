import { useState, useEffect, useRef } from "react";
import { useStudentAttendance } from "../../../hooks/useFieldSupervisorApi";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  Save,
} from "lucide-react";

/** Stable fallback so `useEffect(..., [records])` does not see a new `[]` every render. */
const EMPTY_RECORDS = [];

function todayYmdLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeForInput(v) {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  const direct = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/);
  if (direct) {
    const hh = Math.min(23, Math.max(0, parseInt(direct[1], 10)));
    const mm = Math.min(59, Math.max(0, parseInt(direct[2], 10)));
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const fromDateTime = s.match(/[T ]\s*(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?/);
  if (fromDateTime) {
    const hh = Math.min(23, Math.max(0, parseInt(fromDateTime[1], 10)));
    const mm = Math.min(59, Math.max(0, parseInt(fromDateTime[2], 10)));
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  return "";
}

function dayCellStyle(day) {
  let bg = "#fff";
  let border = "1px solid var(--border)";
  if (day.is_weekend) {
    bg = "#f7f9fc";
  }
  if (day.status === "present") bg = "rgba(25, 135, 84, 0.12)";
  if (day.status === "absent") bg = "rgba(220, 53, 69, 0.12)";
  if (day.status === "late") bg = "rgba(255, 193, 7, 0.2)";
  return {
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    fontSize: "0.85rem",
    background: bg,
    border,
    outline: day.is_today ? "2px solid var(--primary)" : "none",
  };
}

export default function AttendanceTab({ studentId }) {
  const { data, loading, error, refresh, recordAttendance, updateAttendance, patchAttendanceSupervisor } =
    useStudentAttendance(studentId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: todayYmdLocal(),
    status: "present",
    check_in: "",
    check_out: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "present",
    check_in: "",
    check_out: "",
    notes: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [supNotesDraft, setSupNotesDraft] = useState({});
  const [supBusy, setSupBusy] = useState(null);
  const editFormRef = useRef(null);

  const records = data?.records ?? EMPTY_RECORDS;
  useEffect(() => {
    const next = {};
    records.forEach((r) => {
      next[r.id] = r.field_supervisor_notes ?? "";
    });
    setSupNotesDraft(next);
  }, [records]);

  if (loading) {
    return <div className="section-card">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="section-card" style={{ borderRight: "4px solid var(--danger)" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} />
          {error}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      await recordAttendance(formData);
      setSuccess(true);
      setShowForm(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // axios يعرض الخطأ من الـ interceptor إن وُجد
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (record) => {
    if (record.is_locked) return;
    const todayYmd = todayYmdLocal();
    if (record.date !== todayYmd) return;
    setEditError("");
    setUpdateSuccess(false);
    setEditingRecord(record);
    setEditForm({
      status: record.status,
      check_in: timeForInput(record.check_in),
      check_out: timeForInput(record.check_out),
      notes: record.notes || "",
    });
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await updateAttendance(editingRecord.id, {
        status: editForm.status,
        check_in: editForm.status === "absent" ? null : editForm.check_in || null,
        check_out: editForm.status === "absent" ? null : editForm.check_out || null,
        notes: editForm.notes || null,
      });
      setUpdateSuccess(true);
      setEditingRecord(null);
      await refresh();
      setTimeout(() => setUpdateSuccess(false), 4000);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "فشل تعديل سجل اليوم، يرجى المحاولة مرة أخرى";
      setEditError(typeof msg === "string" ? msg : "فشل تعديل سجل اليوم، يرجى المحاولة مرة أخرى");
    } finally {
      setEditSubmitting(false);
    }
  };

  const todayStatus = data?.today_status || "not_recorded";
  const canRecordToday = data?.can_record_today !== false;
  const calendar = data?.calendar || [];
  const summary = data?.summary || {};
  const hoursMode = summary.hours_summary_mode === "hours_track";
  const requiredH = summary.required_training_hours ?? 0;
  const todayYmd = todayYmdLocal();
  const todayRecord = records.find((r) => r.date === todayYmd);

  const saveSupervisorNotes = async (recordId) => {
    setSupBusy(recordId);
    try {
      await patchAttendanceSupervisor(recordId, { field_supervisor_notes: supNotesDraft[recordId] ?? "" });
    } catch {
      // —
    } finally {
      setSupBusy(null);
    }
  };

  const signOffSupervisor = async (recordId) => {
    setSupBusy(recordId);
    try {
      await patchAttendanceSupervisor(recordId, {
        field_supervisor_notes: supNotesDraft[recordId] ?? "",
        sign_off: true,
      });
    } catch {
      // —
    } finally {
      setSupBusy(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      present: "badge-success",
      absent: "badge-danger",
      late: "badge-warning",
      excused: "badge-info",
    };
    return map[status] || "badge-primary";
  };

  const statusLabel = (status) =>
    ({ present: "حاضر", absent: "غائب", late: "متأخر", excused: "مُعذر" }[status] || status);

  return (
    <div>
      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={20} />
          حالة حضور اليوم
        </h4>

        {success && (
          <div
            className="section-card"
            style={{ padding: 12, marginBottom: 12, background: "rgba(25, 135, 84, 0.08)", borderColor: "rgba(25, 135, 84, 0.25)" }}
          >
            تم تسجيل الحضور بنجاح
          </div>
        )}

        {updateSuccess && (
          <div
            className="section-card"
            style={{ padding: 12, marginBottom: 12, background: "rgba(25, 135, 84, 0.08)", borderColor: "rgba(25, 135, 84, 0.25)", display: "flex", alignItems: "center", gap: 8 }}
          >
            <CheckCircle size={18} style={{ color: "var(--success)", flexShrink: 0 }} />
            <strong>تم تعديل سجل اليوم بنجاح</strong>
          </div>
        )}

        {todayStatus === "not_recorded" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Info size={40} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
            <p className="text-soft">لم يتم تسجيل حضور اليوم بعد</p>
            {canRecordToday && (
              <button type="button" className="btn-primary-custom btn-sm-custom" style={{ marginTop: 12 }} onClick={() => setShowForm(!showForm)}>
                {showForm ? "إلغاء" : "تسجيل حضور اليوم"}
              </button>
            )}
          </div>
        ) : (
          <div className="section-card" style={{ padding: 16, background: "#f7f9fc" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {todayStatus === "present" && <CheckCircle size={36} color="var(--success)" />}
                {todayStatus === "absent" && <XCircle size={36} color="var(--danger)" />}
                {todayStatus === "late" && <Clock size={36} color="var(--warning)" />}
                {todayStatus === "excused" && <Info size={36} style={{ color: "var(--primary)" }} />}
                <div>
                  <strong>
                    {todayStatus === "present" && "حاضر"}
                    {todayStatus === "absent" && "غائب"}
                    {todayStatus === "late" && "متأخر"}
                    {todayStatus === "excused" && "مُعذر"}
                  </strong>
                  <div className="text-soft" style={{ fontSize: "0.9rem" }}>
                    تم التسجيل لهذا اليوم
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {todayRecord && !todayRecord.is_locked && !editingRecord ? (
                  <button
                    type="button"
                    className="btn-outline-custom btn-sm-custom"
                    onClick={() => openEdit(todayRecord)}
                  >
                    تعديل سجل اليوم
                  </button>
                ) : null}
                <span className="badge-custom badge-primary">تم التسجيل</span>
              </div>
            </div>
          </div>
        )}

        {editingRecord && (
          <form
            ref={editFormRef}
            onSubmit={handleEditSubmit}
            className="section-card"
            style={{ marginTop: 16, padding: 16, border: "1px solid var(--primary)", background: "var(--bg-paper)" }}
          >
            <h5 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Save size={18} />
              تعديل سجل حضور اليوم ({editingRecord.date})
            </h5>
            {editError ? (
              <div
                className="section-card"
                style={{ padding: 10, marginBottom: 12, background: "rgba(220, 53, 69, 0.08)", borderColor: "rgba(220, 53, 69, 0.25)", display: "flex", alignItems: "center", gap: 8 }}
              >
                <AlertTriangle size={18} style={{ color: "var(--danger)", flexShrink: 0 }} />
                <span style={{ color: "var(--danger)" }}>{editError}</span>
              </div>
            ) : null}
            <p className="text-soft" style={{ margin: "0 0 12px", fontSize: "0.85rem" }}>
              يُسمح بتعديل سجل حضور اليوم فقط. لا يمكن تغيير التاريخ.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              <div className="form-field">
                <label className="form-label-custom" htmlFor="edit-attendance-status">
                  الحالة
                </label>
                <select
                  id="edit-attendance-status"
                  className="form-select-custom"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="late">متأخر</option>
                  <option value="excused">مُعذر</option>
                </select>
              </div>
              {editForm.status !== "absent" ? (
                <>
                  <div className="form-field">
                    <label className="form-label-custom" htmlFor="edit-check-in">
                      وقت الدخول
                    </label>
                    <input
                      id="edit-check-in"
                      type="time"
                      className="form-input-custom"
                      value={editForm.check_in}
                      onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label-custom" htmlFor="edit-check-out">
                      وقت الخروج
                    </label>
                    <input
                      id="edit-check-out"
                      type="time"
                      className="form-input-custom"
                      value={editForm.check_out}
                      onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                    />
                  </div>
                </>
              ) : null}
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label-custom" htmlFor="edit-attendance-notes">
                  ملاحظات
                </label>
                <input
                  id="edit-attendance-notes"
                  type="text"
                  className="form-input-custom"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="table-actions" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary-custom btn-sm-custom" disabled={editSubmitting} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Save size={16} />
                {editSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
              <button
                type="button"
                className="btn-outline-custom btn-sm-custom"
                onClick={() => {
                  setEditingRecord(null);
                  setEditError("");
                }}
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {showForm && canRecordToday && (
          <form onSubmit={handleSubmit} style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              <div className="form-field">
                <label className="form-label-custom" htmlFor="attendance-date">
                  التاريخ (اليوم فقط)
                </label>
                <input
                  id="attendance-date"
                  name="date"
                  type="date"
                  className="form-input-custom"
                  value={formData.date}
                  readOnly
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label-custom" htmlFor="attendance-status">
                  الحالة
                </label>
                <select
                  id="attendance-status"
                  name="status"
                  className="form-select-custom"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="late">متأخر</option>
                  <option value="excused">مُعذر</option>
                </select>
              </div>
              {formData.status !== "absent" && (
                <>
                  <div className="form-field">
                    <label className="form-label-custom" htmlFor="check-in">
                      وقت الدخول
                    </label>
                    <input
                      id="check-in"
                      name="check_in"
                      type="time"
                      className="form-input-custom"
                      value={formData.check_in}
                      onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label-custom" htmlFor="check-out">
                      وقت الخروج
                    </label>
                    <input
                      id="check-out"
                      name="check_out"
                      type="time"
                      className="form-input-custom"
                      value={formData.check_out}
                      onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label-custom" htmlFor="attendance-notes">
                  ملاحظات
                </label>
                <input
                  id="attendance-notes"
                  name="notes"
                  className="form-input-custom"
                  placeholder="ملاحظات إضافية..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="table-actions" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary-custom btn-sm-custom" disabled={submitting}>
                <Save size={16} />
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" className="btn-outline-custom btn-sm-custom" onClick={() => setShowForm(false)}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>

      {(hoursMode && requiredH > 0) || summary.total_days > 0 ? (
        <div className="section-card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} />
            ملخص الالتزام
          </h4>
          {hoursMode && requiredH > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: summary.total_days > 0 ? 16 : 0,
              }}
            >
              <div className="section-card" style={{ padding: 12, background: "#f7f9fc" }}>
                <div className="text-soft" style={{ fontSize: "0.85rem" }}>
                  مطلوب
                </div>
                <strong style={{ fontSize: "1.2rem" }}>{requiredH} س</strong>
              </div>
              <div className="section-card" style={{ padding: 12, background: "#f0fdf4" }}>
                <div className="text-soft" style={{ fontSize: "0.85rem" }}>
                  منجز (تقدير)
                </div>
                <strong style={{ fontSize: "1.2rem" }}>{summary.completed_training_hours ?? 0} س</strong>
              </div>
              <div className="section-card" style={{ padding: 12, background: "#fff7ed" }}>
                <div className="text-soft" style={{ fontSize: "0.85rem" }}>
                  متبقي
                </div>
                <strong style={{ fontSize: "1.2rem" }}>
                  {summary.remaining_training_hours != null ? `${summary.remaining_training_hours} س` : "—"}
                </strong>
              </div>
            </div>
          ) : null}
          {summary.total_days > 0 ? (
            <p className="text-soft" style={{ margin: 0, fontSize: "0.9rem" }}>
              أيام مسجّلة: {summary.total_days} — حاضر: {summary.present_days ?? 0} — غائب: {summary.absent_days ?? 0} — متأخر:{" "}
              {summary.late_days ?? 0}
              {typeof summary.attendance_rate === "number" ? ` — نسبة الحضور على الأيام المسجّلة: ${summary.attendance_rate}%` : ""}
            </p>
          ) : (
            <p className="text-soft" style={{ margin: 0, fontSize: "0.9rem" }}>
              لا توجد أيام حضور مسجّلة بعد لهذا التعيين.
            </p>
          )}
          {hoursMode && requiredH > 0 && (
            <p className="text-soft" style={{ margin: "10px 0 0", fontSize: "0.82rem" }}>
              تُحسب الساعات المنجزة من وقت الدخول/الخروج عند توفرهما؛ وإلا تُقدَّر بساعة افتراضية لكل يوم حاضر/متأخر لغرض المتابعة فقط.
            </p>
          )}
          {summary.school_psychology_policy_hint ? (
            <p className="text-soft" style={{ margin: "12px 0 0", fontSize: "0.88rem", lineHeight: 1.5 }}>
              {summary.school_psychology_policy_hint}
            </p>
          ) : null}
          {summary.clinical_hours_policy_hint ? (
            <p className="text-soft" style={{ margin: "12px 0 0", fontSize: "0.88rem", lineHeight: 1.5 }}>
              {summary.clinical_hours_policy_hint}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="section-card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>تقويم الحضور الشهري</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8,
          }}
        >
          {["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((day) => (
            <div key={day} className="text-soft" style={{ textAlign: "center", fontWeight: 700, fontSize: "0.82rem", padding: "6px 0" }}>
              {day}
            </div>
          ))}
          {calendar.map((day) => (
            <div key={day.date} style={dayCellStyle(day)}>
              <span style={{ fontWeight: 800 }}>{day.day}</span>
              {day.status && (
                <span style={{ fontSize: "0.75rem" }}>
                  {day.status === "present" && "✓"}
                  {day.status === "absent" && "✗"}
                  {day.status === "late" && "⌚"}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="table-actions" style={{ marginTop: 16, fontSize: "0.9rem" }}>
          <span>
            <span style={{ display: "inline-block", width: 14, height: 14, background: "rgba(25, 135, 84, 0.25)", borderRadius: 4, marginLeft: 6 }} />
            حاضر
          </span>
          <span>
            <span style={{ display: "inline-block", width: 14, height: 14, background: "rgba(220, 53, 69, 0.25)", borderRadius: 4, marginLeft: 6 }} />
            غائب
          </span>
          <span>
            <span style={{ display: "inline-block", width: 14, height: 14, background: "rgba(255, 193, 7, 0.35)", borderRadius: 4, marginLeft: 6 }} />
            متأخر
          </span>
        </div>
      </div>

      <div className="section-card">
        <h4 style={{ marginTop: 0 }}>سجل الحضور</h4>

        {records.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32 }} className="text-soft">
            <Calendar size={40} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
            لا يوجد سجل حضور مسجل
          </div>
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
                  <th>السجل</th>
                  <th>إجراء</th>
                  <th>ملاحظات المرشد</th>
                  <th>اعتماد المرشد</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>
                      <span className={`badge-custom ${statusBadge(record.status)}`}>{statusLabel(record.status)}</span>
                    </td>
                    <td>{record.check_in || "—"}</td>
                    <td>{record.check_out || "—"}</td>
                    <td className="text-soft">{record.notes || "—"}</td>
                    <td>
                      <span className="badge-custom badge-primary">{record.is_locked ? "مُغلق" : record.date === todayYmd ? "قابل للتعديل" : "مُغلق"}</span>
                    </td>
                    <td>
                      {!record.is_locked && record.date === todayYmd ? (
                        <button type="button" className="btn-outline-custom btn-sm-custom" onClick={() => openEdit(record)}>
                          تعديل
                        </button>
                      ) : (
                        <span className="text-soft">—</span>
                      )}
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <textarea
                        className="form-input-custom"
                        rows={2}
                        style={{ fontSize: "0.85rem", resize: "vertical", minHeight: 48 }}
                        value={supNotesDraft[record.id] ?? ""}
                        onChange={(e) => setSupNotesDraft((prev) => ({ ...prev, [record.id]: e.target.value }))}
                        placeholder="ملاحظات المرشد على السجل..."
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn-outline-custom btn-sm-custom"
                        style={{ display: "block", marginBottom: 6 }}
                        disabled={supBusy === record.id}
                        onClick={() => saveSupervisorNotes(record.id)}
                      >
                        حفظ الملاحظة
                      </button>
                      {record.is_signed_off ? (
                        <span className="badge-custom badge-success">معتمد</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary-custom btn-sm-custom"
                          disabled={supBusy === record.id}
                          onClick={() => signOffSupervisor(record.id)}
                        >
                          اعتماد السجل
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
