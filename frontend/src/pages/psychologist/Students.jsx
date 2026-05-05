import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getUsers,
  getNotes,
  createNote,
  getTrainingAssignments,
  getAttendances,
  itemsFromPagedResponse,
} from "../../services/api";

export default function PsychologistStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState([]);

  // Detail modal
  const [selected, setSelected] = useState(null);
  const [studentNotes, setStudentNotes] = useState([]);
  const [studentAssignment, setStudentAssignment] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState(null);
  const [quickNote, setQuickNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let m = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getUsers({
          per_page: 100,
          status: "active",
          ...(debounced ? { search: debounced } : {}),
        });
        if (m) setItems(itemsFromPagedResponse(res));
      } catch (e) {
        if (m) setError(e?.response?.data?.message || "فشل تحميل الطلبة");
      } finally {
        if (m) setLoading(false);
      }
    }
    load();
    return () => {
      m = false;
    };
  }, [debounced]);

  async function openStudentDetail(user) {
    setSelected(user);
    setDetailLoading(true);
    setQuickNote("");
    try {
      const [assignRes, noteRes, attRes] = await Promise.all([
        getTrainingAssignments({ per_page: 200 }),
        getNotes({ per_page: 200 }),
        getAttendances({ per_page: 200 }),
      ]);
      const assignments = itemsFromPagedResponse(assignRes);
      const allNotes = itemsFromPagedResponse(noteRes);
      const allAtt = itemsFromPagedResponse(attRes);

      // Find assignment for this student
      const assign = assignments.find(
        (a) => String(a.enrollment?.user_id) === String(user.id)
      );
      setStudentAssignment(assign || null);

      if (assign) {
        setStudentNotes(allNotes.filter((n) => String(n.training_assignment_id) === String(assign.id)));
        const att = allAtt.filter((a) => String(a.training_assignment_id) === String(assign.id));
        const total = att.length;
        const present = att.filter((a) => a.status === "present").length;
        setStudentAttendance({ total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 });
      } else {
        setStudentNotes([]);
        setStudentAttendance(null);
      }
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!studentAssignment || !quickNote.trim()) return;
    setSavingNote(true);
    try {
      await createNote({ training_assignment_id: studentAssignment.id, content: quickNote.trim() });
      setQuickNote("");
      // Reload notes
      const noteRes = await getNotes({ per_page: 200, training_assignment_id: studentAssignment.id });
      setStudentNotes(itemsFromPagedResponse(noteRes));
    } catch {
      // silent
    } finally {
      setSavingNote(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setStudentAssignment(null);
    setStudentNotes([]);
    setStudentAttendance(null);
    setQuickNote("");
  }

  return (
    <>
      <PageHeader
        title="الطلبة"
        subtitle="قائمة الطلبة النشطين — يمكنك عرض ملف الطالب وإضافة ملاحظات إرشادية."
      />

      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <input
          className="form-control-custom search-input"
          placeholder="بحث بالاسم أو البريد أو الرقم الجامعي"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !items.length ? (
        <EmptyState title="لا يوجد طلبة" description="لا يوجد طلبة نشطين حالياً." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الرقم الجامعي</th>
                <th>البريد</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.university_id || "—"}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <span className={`badge-custom ${u.status === "active" ? "badge-success" : "badge-secondary"}`}>
                      {u.status_label || u.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-outline-custom btn-sm-custom"
                      onClick={() => openStudentDetail(u)}
                    >
                      عرض الملف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>ملف الطالب</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <LoadingSpinner size="inline" text="جاري تحميل البيانات..." />
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <h5>{selected.name}</h5>
                    <p className="text-soft">
                      الرقم الجامعي: {selected.university_id || "—"} | البريد: {selected.email} | الهاتف: {selected.phone || "—"}
                    </p>
                  </div>

                  {!studentAssignment ? (
                    <div className="alert-info alert-custom">
                      لا يوجد تعيين تدريب حالي لهذا الطالب.
                    </div>
                  ) : (
                    <>
                      {/* Training Info */}
                      <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                        <h6>معلومات التدريب</h6>
                        <p>جهة التدريب: {studentAssignment.training_site?.name || "—"}</p>
                        <p>من {studentAssignment.start_date || "—"} إلى {studentAssignment.end_date || "—"}</p>
                        <p>الحالة: {studentAssignment.status_label || studentAssignment.status}</p>
                      </div>

                      {/* Attendance */}
                      {studentAttendance && (
                        <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                          <h6>الحضور: {studentAttendance.present}/{studentAttendance.total} ({studentAttendance.percentage}%)</h6>
                          <div style={{ marginTop: 4 }}>
                            <div style={{
                              background: "#e9ecef",
                              borderRadius: 8,
                              height: 12,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${studentAttendance.percentage}%`,
                                background: studentAttendance.percentage >= 80 ? "#198754" : studentAttendance.percentage >= 60 ? "#ffc107" : "#dc3545",
                                height: "100%",
                                borderRadius: 8,
                              }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="section-card" style={{ padding: 12, marginBottom: 12 }}>
                        <h6>الملاحظات الإرشادية ({studentNotes.length})</h6>
                        {studentNotes.length === 0 ? (
                          <p className="text-soft">لا توجد ملاحظات بعد.</p>
                        ) : (
                          <div className="list-clean">
                            {studentNotes.map((n) => (
                              <div key={n.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                                <p style={{ margin: 0 }}>{n.content}</p>
                                <small className="text-soft">{n.created_at || ""}</small>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick Note */}
                      <form onSubmit={handleAddNote} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <textarea
                          className="form-control-custom"
                          rows={2}
                          value={quickNote}
                          onChange={(e) => setQuickNote(e.target.value)}
                          placeholder="أضف ملاحظة إرشادية..."
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
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline-custom" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
