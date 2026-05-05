import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import useFieldStaffRole from "../../hooks/useFieldStaffRole";
import {
  getEvaluations,
  getTrainingAssignments,
  getAttendances,
  itemsFromPagedResponse,
} from "../../services/api";

export default function FieldStaffFinalEvaluation() {
  const { isFieldSupervisor } = useFieldStaffRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [assignRes, evalRes, attRes] = await Promise.all([
        getTrainingAssignments({ per_page: 200 }),
        getEvaluations({ per_page: 200 }),
        getAttendances({ per_page: 200 }),
      ]);
      setAssignments(itemsFromPagedResponse(assignRes));
      setEvaluations(itemsFromPagedResponse(evalRes));
      setAttendances(itemsFromPagedResponse(attRes));
    } catch (e) {
      setError(e?.response?.data?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function getStudentEvals(assignmentId) {
    return evaluations.filter((ev) => String(ev.training_assignment_id) === String(assignmentId));
  }

  function getStudentAttendance(assignmentId) {
    const att = attendances.filter((a) => String(a.training_assignment_id) === String(assignmentId));
    const total = att.length;
    const present = att.filter((a) => a.status === "present").length;
    const absent = att.filter((a) => a.status === "absent").length;
    const late = att.filter((a) => a.status === "late").length;
    return { total, present, absent, late, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  }

  function getAvgScore(assignmentId) {
    const evals = getStudentEvals(assignmentId);
    if (!evals.length) return "—";
    const total = evals.reduce((sum, ev) => sum + (Number(ev.total_score) || 0), 0);
    return (total / evals.length).toFixed(1);
  }

  function closeModal() {
    setSelectedStudent(null);
  }

  if (isFieldSupervisor) {
    return <Navigate to="/field-staff/dashboard" replace />;
  }

  return (
    <>
      <PageHeader
        title="التقييم النهائي"
        subtitle="ملخص شامل لأداء كل طالب: التقييمات، الحضور، والمهام المسلّمة."
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
                <th>جهة التدريب</th>
                <th>متوسط التقييم</th>
                <th>نسبة الحضور</th>
                <th>عدد التقييمات</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const stu = a.enrollment?.user;
                const att = getStudentAttendance(a.id);
                const evals = getStudentEvals(a.id);
                return (
                  <tr key={a.id}>
                    <td>{stu?.name || "—"}</td>
                    <td>{a.training_site?.name || "—"}</td>
                    <td>
                      <span className={`badge-custom ${Number(getAvgScore(a.id)) >= 7 ? "badge-success" : Number(getAvgScore(a.id)) >= 5 ? "badge-warning" : "badge-danger"}`}>
                        {getAvgScore(a.id)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-custom ${att.percentage >= 80 ? "badge-success" : att.percentage >= 60 ? "badge-warning" : "badge-danger"}`}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td>{evals.length}</td>
                    <td>
                      <button className="btn-outline-custom btn-sm-custom" onClick={() => setSelectedStudent(a)}>
                        عرض التفاصيل
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
      {selectedStudent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>تفاصيل أداء الطالب</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const stu = selectedStudent.enrollment?.user;
                const att = getStudentAttendance(selectedStudent.id);
                const evals = getStudentEvals(selectedStudent.id);
                return (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <h5>{stu?.name || "طالب"}</h5>
                      <p className="text-soft">
                        جهة التدريب: {selectedStudent.training_site?.name || "—"} | من {selectedStudent.start_date || "—"} إلى {selectedStudent.end_date || "—"}
                      </p>
                    </div>

                    {/* Attendance Summary */}
                    <div className="section-card" style={{ padding: 16, marginBottom: 16 }}>
                      <h6>ملخص الحضور</h6>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                        <div><strong>إجمالي الأيام:</strong> {att.total}</div>
                        <div><strong>حاضر:</strong> {att.present}</div>
                        <div><strong>غائب:</strong> {att.absent}</div>
                        <div><strong>متأخر:</strong> {att.late}</div>
                        <div><strong>النسبة:</strong> {att.percentage}%</div>
                      </div>
                    </div>

                    {/* Evaluations */}
                    <div className="section-card" style={{ padding: 16 }}>
                      <h6>التقييمات ({evals.length})</h6>
                      {evals.length === 0 ? (
                        <p className="text-soft">لا توجد تقييمات بعد.</p>
                      ) : (
                        <table className="data-table" style={{ marginTop: 8 }}>
                          <thead>
                            <tr>
                              <th>القالب</th>
                              <th>نوع النموذج</th>
                              <th>المجموع</th>
                              <th>الملاحظات</th>
                              <th>التاريخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evals.map((ev) => (
                              <tr key={ev.id}>
                                <td>{ev.template?.name || "—"}</td>
                                <td>
                                  {ev.template?.target_role_label ? (
                                    <span className="badge-custom badge-info">{ev.template.target_role_label}</span>
                                  ) : (
                                    <span className="badge-custom badge-secondary">عام</span>
                                  )}
                                </td>
                                <td>{ev.total_score ?? "—"}</td>
                                <td>{ev.notes || "—"}</td>
                                <td>{ev.created_at || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
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
