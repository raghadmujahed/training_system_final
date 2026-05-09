import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import {
  getTrainingAssignments,
  getNotes,
  createNote,
  getAttendances,
  getEvaluations,
  itemsFromPagedResponse,
} from "../../services/api";

export default function MentorStudentsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  // Detail modal
  const [selected, setSelected] = useState(null);

  // Quick note
  const [quickNote, setQuickNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
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
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function getStudentNotes(assignmentId) {
    return notes.filter((n) => String(n.training_assignment_id) === String(assignmentId));
  }

  function getStudentAttendance(assignmentId) {
    const att = attendances.filter((a) => String(a.training_assignment_id) === String(assignmentId));
    const total = att.length;
    const present = att.filter((a) => a.status === "present").length;
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  }

  function getStudentEvals(assignmentId) {
    return evaluations.filter((ev) => String(ev.training_assignment_id) === String(assignmentId));
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!selected || !quickNote.trim()) return;
    setSavingNote(true);
    try {
      await createNote({ training_assignment_id: selected.id, content: quickNote.trim() });
      setQuickNote("");
      await load();
    } catch {
      // silent
    } finally {
      setSavingNote(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setQuickNote("");
  }

  return (
    <>
      <PageHeader
        title="ملف الطالب التفصيلي"
        subtitle="عرض شامل لكل طالب: الحضور، التقييمات، والملاحظات مع إمكانية إضافة ملاحظة سريعة."
      />

      {loading ? (
        <div className="section-card">جاري التحميل...</div>
      ) : error ? (
        <div className="section-card">
          <p className="text-danger">{error}</p>
        </div>
      ) : !assignments.length ? (
        <EmptyState title="لا توجد تعيينات" description="لا يوجد طلبة مرتبطون بتعييناتك حالياً." />
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
              {assignments.map((a) => {
                const stu = a.enrollment?.user;
                const att = getStudentAttendance(a.id);
                const evals = getStudentEvals(a.id);
                const stuNotes = getStudentNotes(a.id);
                return (
                  <tr key={a.id}>
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
                      <button className="btn-outline-custom btn-sm-custom" onClick={() => setSelected(a)}>
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

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-[700px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ملف الطالب</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const stu = selected.enrollment?.user;
                const att = getStudentAttendance(selected.id);
                const evals = getStudentEvals(selected.id);
                const stuNotes = getStudentNotes(selected.id);
                return (
                  <>
                    <div className="mb-4">
                      <h5>{stu?.name || "طالب"}</h5>
                      <p className="text-soft">
                        الرقم الجامعي: {stu?.university_id || "—"} | جهة التدريب: {selected.training_site?.name || "—"}
                      </p>
                    </div>

                    {/* Attendance */}
                    <div className="section-card p-3 mb-3">
                      <h6>الحضور: {att.present}/{att.total} ({att.percentage}%)</h6>
                    </div>

                    {/* Evaluations */}
                    <div className="section-card p-3 mb-3">
                      <h6>التقييمات ({evals.length})</h6>
                      {evals.length === 0 ? (
                        <p className="text-soft">لا توجد تقييمات.</p>
                      ) : (
                        <ul className="pr-[18px] list-disc">
                          {evals.map((ev) => (
                            <li key={ev.id}>
                              {ev.template?.name || "قالب"} — المجموع: {ev.total_score ?? "—"} — {ev.created_at || ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="section-card p-3 mb-3">
                      <h6>الملاحظات ({stuNotes.length})</h6>
                      {stuNotes.length === 0 ? (
                        <p className="text-soft">لا توجد ملاحظات بعد.</p>
                      ) : (
                        <div className="list-clean">
                          {stuNotes.map((n) => (
                            <div key={n.id} className="py-[6px] border-b border-[#eee]">
                              <p className="m-0">{n.content}</p>
                              <small className="text-soft">{n.created_at || ""}</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Note */}
                    <form onSubmit={handleAddNote} className="flex gap-2 items-start">
                      <textarea
                        className="form-control-custom flex-1"
                        rows={2}
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="أضف ملاحظة سريعة..."
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
              <button className="btn-outline-custom" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
