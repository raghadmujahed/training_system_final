import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import {
  getAttendanceQueueReason,
  getDailyReportQueueReason,
  getEvaluationQueueReason,
  getMessagesQueueReason,
  getQueuePriority,
} from "../../utils/fieldSupervisorQueues";
import { ListTodo } from "lucide-react";

function queueReason(mode, student) {
  if (mode === "attendance") return getAttendanceQueueReason(student);
  if (mode === "daily-reports") return getDailyReportQueueReason(student);
  if (mode === "evaluation") return getEvaluationQueueReason(student);
  if (mode === "communication") return getMessagesQueueReason(student);
  return "—";
}

/**
 * لوحة مهام ميدانية — مظهر مختلف عن قائمة «كل الطلبة» + عمود سبب الظهور + إجراء مباشر.
 */
export default function FieldSupervisorTaskQueuePanel({
  mode,
  students,
  loading,
  error,
  onRetry,
  workQueueMeta,
  taskBoardTitle,
  panelHint,
  emptyTitle,
  emptyDescription,
  primaryActionLabel,
  primaryTab,
}) {
  if (error) {
    return (
      <div className="section-card fs-panel-error">
        <p className="text-danger mb-0">{error}</p>
        {onRetry && (
          <button type="button" className="btn-outline-custom btn-sm-custom fs-forms-retry" onClick={onRetry}>
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fs-task-queue fs-task-queue--loading section-card" aria-busy="true">
        <div className="fs-panel-loading" style={{ border: "none", background: "transparent" }}>
          جاري تحميل قائمة المهام…
        </div>
      </div>
    );
  }

  if (!students.length) {
    if (workQueueMeta && workQueueMeta.totalAssigned > 0) {
      return (
        <div className="fs-task-queue section-card">
          <div className="fs-task-queue__ribbon">
            <ListTodo size={18} aria-hidden />
            <span>صفحة مهام</span>
          </div>
          <h3 className="fs-task-queue__title">{taskBoardTitle}</h3>
          {panelHint && <p className="fs-task-queue__hint">{panelHint}</p>}
          <EmptyState title={workQueueMeta.queueEmptyTitle} description={workQueueMeta.queueEmptyDescription} />
          <div className="fs-task-queue__footer-actions">
            <Link to="/field-supervisor/students" className="btn-primary-custom btn-sm-custom">
              فتح قائمة كل الطلبة
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="fs-task-queue section-card">
        <div className="fs-task-queue__ribbon">
          <ListTodo size={18} aria-hidden />
          <span>صفحة مهام</span>
        </div>
        <h3 className="fs-task-queue__title">{taskBoardTitle}</h3>
        <EmptyState title={emptyTitle} description={emptyDescription} />
        <div className="fs-task-queue__footer-actions">
          <Link to="/field-supervisor/students" className="btn-outline-custom btn-sm-custom">
            قائمة الطلبة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`fs-task-queue section-card fs-task-queue--mode-${mode}`}>
      <div className="fs-task-queue__ribbon">
        <ListTodo size={18} aria-hidden />
        <span>صفحة مهام — ليست القائمة العامة</span>
      </div>
      <h3 className="fs-task-queue__title">{taskBoardTitle}</h3>
      {panelHint && <p className="fs-task-queue__hint">{panelHint}</p>}

      <div className="fs-task-queue__table-wrap">
        <table className="fs-task-queue__table">
          <thead>
            <tr>
              <th>الطالب</th>
              <th>الجهة والمسار</th>
              <th>سبب الظهور</th>
              <th>الأولوية</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {students.filter((s) => s?.id != null || s?.user_id != null).map((student) => {
              const pri = getQueuePriority(mode, student);
              const reason = queueReason(mode, student);
              const sid = student.id ?? student.user_id;
              const primaryTo = `/field-supervisor/students/${sid}?tab=${encodeURIComponent(primaryTab)}`;
              const fileTo = `/field-supervisor/students/${sid}?tab=overview`;
              return (
                <tr key={String(sid)}>
                  <td data-label="الطالب">
                    <span className="fs-task-queue__name">{student.name}</span>
                    <div className="fs-task-queue__meta">{student.university_id}</div>
                  </td>
                  <td data-label="الجهة">
                    <div className="fs-task-queue__cell-strong">{student.training_site || "—"}</div>
                    <div className="fs-task-queue__meta">{student.training_type || "—"}</div>
                  </td>
                  <td data-label="سبب الظهور" className="fs-task-queue__reason">
                    {reason}
                  </td>
                  <td data-label="الأولوية">
                    <span className={`fs-queue-pill ${pri.className}`}>{pri.label}</span>
                  </td>
                  <td data-label="إجراءات">
                    <div className="fs-task-queue__actions">
                      <Link to={primaryTo} className="btn-primary-custom btn-sm-custom">
                        {primaryActionLabel}
                      </Link>
                      <Link to={fileTo} className="btn-outline-custom btn-sm-custom">
                        فتح الملف
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="fs-task-queue__foot-note">
        للاطلاع على كل الأعمدة (التقرير اليومي، التقييم، الحضور كنسبة…) استخدم{" "}
        <Link to="/field-supervisor/students">قائمة الطلبة الكاملة</Link>.
      </p>
    </div>
  );
}
