import { useEffect, useState, useMemo, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";
import {
  apiClient,
  getTrainingAssignments,
  getNotes,
  createNote,
  getAttendances,
  getEvaluations,
  itemsFromPagedResponse,
} from "../../services/api";

/** دمج صفوف API الميداني عند تكرار نفس الطالب بعدة تعيينات */
function dedupeFieldRows(rows) {
  const rank = (s) => {
    const x = String(s || "").toLowerCase();
    if (x === "ongoing") return 3;
    if (x === "assigned") return 2;
    return 1;
  };
  const byUser = new Map();
  for (const r of rows) {
    const uid = r.id;
    if (uid == null) continue;
    const prev = byUser.get(uid);
    if (!prev) {
      byUser.set(uid, r);
      continue;
    }
    if (rank(r.assignment_status) > rank(prev.assignment_status)) byUser.set(uid, r);
    else if (rank(r.assignment_status) === rank(prev.assignment_status) && r.assignment_id > prev.assignment_id) {
      byUser.set(uid, r);
    }
  }
  return [...byUser.values()];
}

function attendanceFromRecords(records) {
  const total = records.length;
  const present = records.filter((a) => a.status === "present").length;
  return {
    total,
    present,
    percentage: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}

export default function FieldStaffStudents() {
  const { isPsychologist, label } = useFieldStaffRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** @type {'field'|'legacy'} */
  const [dataSource, setDataSource] = useState("field");
  const [fieldRows, setFieldRows] = useState([]);

  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  const [selectedLegacy, setSelectedLegacy] = useState(null);
  const [selectedFieldRow, setSelectedFieldRow] = useState(null);
  const [fieldModalLoading, setFieldModalLoading] = useState(false);
  const [fieldModalNotes, setFieldModalNotes] = useState([]);
  const [fieldModalAtt, setFieldModalAtt] = useState([]);
  const [fieldModalEval, setFieldModalEval] = useState(null);

  const [quickNote, setQuickNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadLegacy = useCallback(async () => {
    const [assignRes, noteRes, attRes, evalRes] = await Promise.all([
      getTrainingAssignments({ per_page: 200 }),
      getNotes({ per_page: 200 }),
      getAttendances({ per_page: 200 }),
      getEvaluations({ per_page: 200 }),
    ]);
    setAssignments(itemsFromPagedResponse(assignRes));
    setNotes(itemsFromPagedResponse(noteRes));
    setAttendances(itemsFromPagedResponse(attRes));
    setEvaluations(itemsFromPagedResponse(evalRes));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      try {
        const res = await apiClient.get("/field-supervisor/students");
        const raw = Array.isArray(res.data) ? res.data : [];
        setDataSource("field");
        setFieldRows(dedupeFieldRows(raw));
        setAssignments([]);
        setNotes([]);
        setAttendances([]);
        setEvaluations([]);
        return;
      } catch (e) {
        const st = e?.response?.status;
        if (st === 403) {
          setError(e?.response?.data?.message || e?.response?.data?.error || "غير مصرح بعرض قائمة الطلاب الميدانية.");
          return;
        }
      }

      setDataSource("legacy");
      await loadLegacy();
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [loadLegacy]);

  useEffect(() => { load(); }, [load]);

  const displayFieldRows = useMemo(() => fieldRows, [fieldRows]);

  const assignmentIdsByUserId = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      const uid = a.enrollment?.user?.id;
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid).push(a.id);
    }
    return map;
  }, [assignments]);

  const displayAssignments = useMemo(() => {
    const byUser = new Map();
    const rank = (x) => {
      const s = String(x.status || "").toLowerCase();
      if (s === "ongoing") return 3;
      if (s === "assigned") return 2;
      return 1;
    };
    for (const a of assignments) {
      const uid = a.enrollment?.user?.id;
      if (!uid) continue;
      const prev = byUser.get(uid);
      if (!prev) {
        byUser.set(uid, a);
        continue;
      }
      if (rank(a) > rank(prev)) byUser.set(uid, a);
      else if (rank(a) === rank(prev) && a.id > prev.id) byUser.set(uid, a);
    }
    return [...byUser.values()];
  }, [assignments]);

  function getStudentNotesForUser(userId) {
    const ids = new Set((assignmentIdsByUserId.get(userId) ?? []).map(String));
    return notes.filter((n) => ids.has(String(n.training_assignment_id)));
  }

  function getStudentAttendanceForUser(userId) {
    const ids = new Set((assignmentIdsByUserId.get(userId) ?? []).map(String));
    const att = attendances.filter((a) => ids.has(String(a.training_assignment_id)));
    const total = att.length;
    const present = att.filter((a) => a.status === "present").length;
    return {
      total,
      present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }

  function getStudentEvalsForUser(userId) {
    const ids = new Set((assignmentIdsByUserId.get(userId) ?? []).map(String));
    return evaluations.filter((ev) => ids.has(String(ev.training_assignment_id)));
  }

  async function openFieldModal(row) {
    setSelectedFieldRow(row);
    setFieldModalLoading(true);
    setFieldModalNotes([]);
    setFieldModalAtt([]);
    setFieldModalEval(null);
    try {
      const aid = row.assignment_id;
      const [noteRes, attRes, evalRes] = await Promise.all([
        getNotes({ per_page: 100, training_assignment_id: aid }),
        getAttendances({ per_page: 200, training_assignment_id: aid }),
        apiClient.get(`/field-supervisor/students/${row.id}/evaluation`),
      ]);
      setFieldModalNotes(itemsFromPagedResponse(noteRes));
      setFieldModalAtt(itemsFromPagedResponse(attRes));
      setFieldModalEval(evalRes.data?.evaluation ?? null);
    } catch {
      setFieldModalNotes([]);
      setFieldModalAtt([]);
      setFieldModalEval(null);
    } finally {
      setFieldModalLoading(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!quickNote.trim()) return;
    const assignmentId = dataSource === "field" ? selectedFieldRow?.assignment_id : selectedLegacy?.id;
    if (!assignmentId) return;
    setSavingNote(true);
    try {
      await createNote({ training_assignment_id: assignmentId, content: quickNote.trim() });
      setQuickNote("");
      await load();
      if (dataSource === "field" && selectedFieldRow) {
        await openFieldModal(selectedFieldRow);
      }
    } catch {
      // silent
    } finally {
      setSavingNote(false);
    }
  }

  function closeModal() {
    setSelectedLegacy(null);
    setSelectedFieldRow(null);
    setFieldModalNotes([]);
    setFieldModalAtt([]);
    setFieldModalEval(null);
    setQuickNote("");
  }

  const notePlaceholder = isPsychologist ? "أضف ملاحظة إرشادية..." : "أضف ملاحظة سريعة...";

  const hasRows = dataSource === "field" ? displayFieldRows.length > 0 : displayAssignments.length > 0;

  return (
    <>
      <PageHeader
        title="ملفات الطلبة"
        subtitle={`عرض شامل لكل طالب: الحضور، التقييمات الميدانية، والملاحظات — حسب دورك كـ${label}.`}
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !hasRows ? (
        <EmptyState title="لا توجد تعيينات" description="لا يوجد طلبة مرتبطون بتعييناتك حالياً." />
      ) : dataSource === "field" ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الرقم الجامعي</th>
                <th>جهة التدريب</th>
                <th>نسبة الحضور</th>
                <th>التقييمات الميدانية</th>
                <th>ملاحظات</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {displayFieldRows.map((row) => {
                const pct = row.attendance_rate != null ? Math.round(Number(row.attendance_rate)) : 0;
                const evalCount = row.field_evaluations_count ?? 0;
                const nCount = row.notes_count ?? 0;
                return (
                  <tr key={row.id}>
                    <td>{row.name || "—"}</td>
                    <td>{row.university_id || "—"}</td>
                    <td>{row.training_site || "—"}</td>
                    <td>
                      <span className={`badge-custom ${pct >= 80 ? "badge-success" : pct >= 60 ? "badge-warning" : "badge-danger"}`}>
                        {pct}%
                      </span>
                    </td>
                    <td>{evalCount}</td>
                    <td>{nCount}</td>
                    <td>
                      <button type="button" className="btn-outline-custom btn-sm-custom" onClick={() => openFieldModal(row)}>
                        عرض الملف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الرقم الجامعي</th>
                <th>جهة التدريب</th>
                <th>نسبة الحضور</th>
                <th>عدد التقييمات</th>
                <th>ملاحظات</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {displayAssignments.map((a) => {
                const stu = a.enrollment?.user;
                const uid = stu?.id;
                const att = uid ? getStudentAttendanceForUser(uid) : { total: 0, present: 0, percentage: 0 };
                const evals = uid ? getStudentEvalsForUser(uid) : [];
                const stuNotes = uid ? getStudentNotesForUser(uid) : [];
                return (
                  <tr key={uid ?? a.id}>
                    <td>{stu?.name || "—"}</td>
                    <td>{stu?.university_id || "—"}</td>
                    <td>{a.training_site?.name || "—"}</td>
                    <td>
                      <span className={`badge-custom ${att.percentage >= 80 ? "badge-success" : att.percentage >= 60 ? "badge-warning" : "badge-danger"}`}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td>{evals.length}</td>
                    <td>{stuNotes.length}</td>
                    <td>
                      <button type="button" className="btn-outline-custom btn-sm-custom" onClick={() => setSelectedLegacy(a)}>
                        عرض الملف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedFieldRow && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>ملف الطالب</h3>
              <button type="button" className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {fieldModalLoading ? (
                <div className="section-card">جاري تحميل التفاصيل...</div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <h5>{selectedFieldRow.name || "طالب"}</h5>
                    <p className="text-soft">
                      الرقم الجامعي: {selectedFieldRow.university_id || "—"} | جهة التدريب: {selectedFieldRow.training_site || "—"}
                    </p>
                  </div>

                  {(() => {
                    const att = attendanceFromRecords(fieldModalAtt);
                    return (
                      <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                        <h6>الحضور: {att.present}/{att.total} ({att.percentage}%)</h6>
                        <div style={{ marginTop: 4 }}>
                          <div style={{ background: "#e9ecef", borderRadius: 8, height: 12, overflow: "hidden" }}>
                            <div style={{
                              width: `${att.percentage}%`,
                              background: att.percentage >= 80 ? "#198754" : att.percentage >= 60 ? "#ffc107" : "#dc3545",
                              height: "100%", borderRadius: 8,
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                    <h6>التقييم الميداني</h6>
                    {!fieldModalEval ? (
                      <p className="text-soft">لا يوجد تقييم ميداني مسجّل بعد لهذا التعيين.</p>
                    ) : (
                      <ul style={{ paddingRight: 18, listStyle: "disc", margin: 0 }}>
                        <li>
                          الحالة: {fieldModalEval.status_label || fieldModalEval.status || "—"}
                          {fieldModalEval.total_score != null && ` — المجموع: ${fieldModalEval.total_score}`}
                          {fieldModalEval.submitted_at && ` — ${fieldModalEval.submitted_at}`}
                        </li>
                      </ul>
                    )}
                  </div>

                  <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                    <h6>الملاحظات ({fieldModalNotes.length})</h6>
                    {fieldModalNotes.length === 0 ? (
                      <p className="text-soft">لا توجد ملاحظات بعد.</p>
                    ) : (
                      <div className="list-clean">
                        {fieldModalNotes.map((n) => (
                          <div key={n.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                            <p style={{ margin: 0 }}>{n.content}</p>
                            <small className="text-soft">{n.created_at || ""}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <textarea
                      className="form-control-custom"
                      rows={2}
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder={notePlaceholder}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="btn-primary-custom btn-sm-custom"
                      disabled={savingNote || !quickNote.trim()}
                    >
                      {savingNote ? "..." : "إضافة"}
                    </button>
                  </form>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline-custom" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {selectedLegacy && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>ملف الطالب</h3>
              <button type="button" className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const stu = selectedLegacy.enrollment?.user;
                const uid = stu?.id;
                const att = uid ? getStudentAttendanceForUser(uid) : { total: 0, present: 0, percentage: 0 };
                const evals = uid ? getStudentEvalsForUser(uid) : [];
                const stuNotes = uid ? getStudentNotesForUser(uid) : [];
                return (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <h5>{stu?.name || "طالب"}</h5>
                      <p className="text-soft">
                        الرقم الجامعي: {stu?.university_id || "—"} | جهة التدريب: {selectedLegacy.training_site?.name || "—"}
                      </p>
                    </div>

                    <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                      <h6>الحضور: {att.present}/{att.total} ({att.percentage}%)</h6>
                      <div style={{ marginTop: 4 }}>
                        <div style={{ background: "#e9ecef", borderRadius: 8, height: 12, overflow: "hidden" }}>
                          <div style={{
                            width: `${att.percentage}%`,
                            background: att.percentage >= 80 ? "#198754" : att.percentage >= 60 ? "#ffc107" : "#dc3545",
                            height: "100%", borderRadius: 8,
                          }} />
                        </div>
                      </div>
                    </div>

                    <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                      <h6>التقييمات الأكاديمية ({evals.length})</h6>
                      {evals.length === 0 ? (
                        <p className="text-soft">لا توجد تقييمات.</p>
                      ) : (
                        <ul style={{ paddingRight: 18, listStyle: "disc" }}>
                          {evals.map((ev) => (
                            <li key={ev.id}>
                              {ev.template?.name || "قالب"} — المجموع: {ev.total_score ?? "—"}
                              {ev.template?.target_role_label && (
                                <span className="badge-custom badge-info" style={{ marginRight: 6 }}>
                                  {ev.template.target_role_label}
                                </span>
                              )}
                              — {ev.created_at || ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                      <h6>الملاحظات ({stuNotes.length})</h6>
                      {stuNotes.length === 0 ? (
                        <p className="text-soft">لا توجد ملاحظات بعد.</p>
                      ) : (
                        <div className="list-clean">
                          {stuNotes.map((n) => (
                            <div key={n.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                              <p style={{ margin: 0 }}>{n.content}</p>
                              <small className="text-soft">{n.created_at || ""}</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddNote} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <textarea
                        className="form-control-custom"
                        rows={2}
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder={notePlaceholder}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="submit"
                        className="btn-primary-custom btn-sm-custom"
                        disabled={savingNote || !quickNote.trim()}
                      >
                        {savingNote ? "..." : "إضافة"}
                      </button>
                    </form>
                  </>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline-custom" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
