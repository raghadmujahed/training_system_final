import { useNavigate, Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";

/** فهرس العمود المرتبط بمسار الـ hub (لتمييز بصري خفيف). */
const FOCUS_COLUMN_BY_TAB = {
  attendance: 3,
  "daily-reports": 4,
  evaluation: 5,
  communication: 6,
};

/**
 * قائمة الطلبة المرتبطين بالمشرف الميداني (بدون بحث/فلاتر — غالباً طالب واحد).
 */
export default function FieldSupervisorStudentsPanel({
  students,
  loading,
  error,
  onRetry,
  tabQuery = "",
  panelTitle = "الطلبة المتدربون",
  panelHint,
  emptyTitle = "لا يوجد طلبة",
  emptyDescription = "لا يوجد طلبة مرتبطون بحسابك حالياً.",
  sectionAccent,
  columnHighlight,
  /** عند عرض قائمة مهام: إذا كانت القائمة المصفّاة فارغة لكن هناك طلاب مرتبطون */
  workQueueMeta = null,
  /** إن وُجد، يصبح عنوان اللوحة رابطاً إلى هذه الصفحة (مثلاً من الرئيسية إلى قائمة الطلبة). */
  titleHref = null,
}) {
  const navigate = useNavigate();

  const openStudent = (id) => {
    const q = tabQuery ? `?tab=${encodeURIComponent(tabQuery)}` : "";
    navigate(`/field-supervisor/students/${id}${q}`);
  };

  const focusColIndex = FOCUS_COLUMN_BY_TAB[tabQuery] ?? null;
  const colStyle = (idx) => {
    if (focusColIndex == null || idx !== focusColIndex || !columnHighlight) return undefined;
    return {
      background: columnHighlight,
      boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.06)",
    };
  };

  const cardStyle = sectionAccent ? { borderRight: `4px solid ${sectionAccent}` } : undefined;

  if (error) {
    return (
      <div className="section-card fs-panel-error">
        <p className="text-danger m-0">
          {error}
        </p>
        {onRetry && (
          <button type="button" className="btn-outline-custom btn-sm-custom mt-3" onClick={onRetry}>
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner size="section" text="جاري تحميل قائمة الطلبة..." />
    );
  }

  return (
    <div className="section-card fs-students-panel" style={cardStyle}>
      {titleHref ? (
        <h4 className="fs-panel-title">
          <Link to={titleHref} className="fs-panel-title-link">
            {panelTitle}
          </Link>
        </h4>
      ) : (
        <h4 className="fs-panel-title">{panelTitle}</h4>
      )}
      {panelHint && <p className="fs-panel-hint">{panelHint}</p>}

      {!students.length ? (
        workQueueMeta && workQueueMeta.totalAssigned > 0 ? (
          <>
            <EmptyState title={workQueueMeta.queueEmptyTitle} description={workQueueMeta.queueEmptyDescription} />
            <div className="mt-4">
              <Link to="/field-supervisor/students" className="btn-primary-custom btn-sm-custom">
                فتح قائمة كل الطلبة
              </Link>
            </div>
          </>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )
      ) : (
        <div className="fs-table-shell">
          <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={colStyle(0)}>الطالب</th>
                <th style={colStyle(1)}>التخصص / القسم</th>
                <th style={colStyle(2)}>جهة التدريب</th>
                <th style={colStyle(3)}>الحضور</th>
                <th style={colStyle(4)}>التقرير اليومي</th>
                <th style={colStyle(5)}>التقييم</th>
                <th style={colStyle(6)}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td style={colStyle(0)}>
                    <span className="fs-student-name">{student.name}</span>
                    <div className="fs-student-meta">{student.university_id}</div>
                  </td>
                  <td style={colStyle(1)}>
                    {student.specialization || "—"}
                    <div className="text-soft text-[0.85rem]">
                      {student.department || "—"}
                    </div>
                  </td>
                  <td style={colStyle(2)}>
                    {student.training_site || "—"}
                    <div>
                      <span className="fs-badge-track">{student.training_type}</span>
                    </div>
                  </td>
                  <td style={colStyle(3)}>
                    {student.attendance_rate != null ? (
                      <span
                        className={`badge-custom ${
                          student.attendance_rate >= 90
                            ? "badge-success"
                            : student.attendance_rate >= 75
                              ? "badge-warning"
                              : "badge-danger"
                        }`}
                      >
                        {student.attendance_rate}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={colStyle(4)}>
                    <span
                      className={`badge-custom ${
                        student.today_report_status === "confirmed"
                          ? "badge-success"
                          : student.today_report_status === "returned"
                            ? "badge-danger"
                            : student.today_report_status === "submitted"
                              ? "badge-info"
                              : student.today_report_status === "under_review"
                                ? "badge-warning"
                                : "badge-primary"
                      }`}
                    >
                      {student.today_report_status === "confirmed"
                        ? "معتمد"
                        : student.today_report_status === "returned"
                          ? "معاد"
                          : student.today_report_status === "submitted"
                            ? "مُرسل"
                            : student.today_report_status === "under_review"
                              ? "قيد المراجعة"
                              : "غير مُرسل"}
                    </span>
                  </td>
                  <td style={colStyle(5)}>
                    <span
                      className={`badge-custom ${
                        student.evaluation_status === "completed"
                          ? "badge-success"
                          : student.evaluation_status === "draft"
                            ? "badge-warning"
                            : student.evaluation_status === "not_started"
                              ? "badge-primary"
                              : "badge-primary"
                      }`}
                    >
                      {student.evaluation_status === "completed"
                        ? "مكتمل"
                        : student.evaluation_status === "draft"
                          ? "مسودة"
                          : student.evaluation_status === "not_started"
                            ? "لم يبدأ"
                            : student.evaluation_status || "—"}
                    </span>
                  </td>
                  <td style={colStyle(6)}>
                    <button
                      type="button"
                      className="btn-outline-custom btn-sm-custom fs-open-profile-btn"
                      onClick={() => openStudent(student.id)}
                    >
                      فتح الملف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
