import { Link } from "react-router-dom";
import { FileStack, ExternalLink } from "lucide-react";
import { useFormsWorkboard } from "../../../hooks/useFieldSupervisorApi";
import FieldSupervisorReferenceCard from "../FieldSupervisorReferenceCard";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

/**
 * تبويب «النماذج والتقارير» داخل ملف الطالب — يعتمد على forms-workboard مع تصفية محلية حسب الطالب.
 */
export default function StudentFormsTab({ studentId, studentName }) {
  const { data: board, loading, error, refresh } = useFormsWorkboard();

  const sid = Number(studentId);
  const dailyForStudent = (board?.review?.daily_task_reports || []).filter(
    (r) => Number(r.student_id) === sid
  );

  const eFormsForStudent = (board?.review?.e_form_instances || []).filter((f) => {
    const uid = f.student_id ?? f.subject_user_id;
    if (uid != null && Number(uid) === sid) {
      return true;
    }
    if (studentName && (f.subject_name || f.student_name)) {
      const n = String(studentName).trim();
      return (
        (f.subject_name && String(f.subject_name).trim() === n) ||
        (f.student_name && String(f.student_name).trim() === n)
      );
    }
    return false;
  });

  if (loading) {
    return <LoadingSpinner size="section" text="جاري تحميل عناصر النماذج..." />;
  }

  if (error) {
    return (
      <div className="section-card fs-panel-error">
        <p className="text-danger mb-0">{error}</p>
        <button type="button" className="btn-outline-custom btn-sm-custom fs-forms-retry" onClick={() => refresh()}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="section-card fs-students-panel">
      <h4 className="fs-panel-title">نماذج وتقارير هذا الطالب</h4>
      <p className="fs-panel-hint">
        تقارير المهام اليومية المُرسلة للمراجعة تظهر أدناه عند وجودها. للوحة النماذج الكاملة (التعبئة الذاتية
        وللمراجعة لكل التعيينات) استخدم الرابط الخارجي.
      </p>

      {board?.supervisor_subtype ? (
        <FieldSupervisorReferenceCard supervisorType={board.supervisor_subtype} compact />
      ) : null}

      <div className="fs-forms-action-stack" style={{ marginTop: "0.75rem" }}>
        <Link
          to="/field-supervisor/forms"
          className="fs-forms-action-card fs-forms-action-card--evaluation"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="fs-forms-action-card__text">
            <p className="fs-forms-action-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileStack size={18} aria-hidden />
              لوحة النماذج والتقارير
            </p>
            <p className="fs-forms-action-card__hint">فتح صفحة النماذج العامة: مراجعة الطلبات، التقييم الميداني، الحضور، وقوالب التقارير.</p>
          </div>
          <span className="btn-outline-custom btn-sm-custom fs-forms-action-card__cta">
            <span className="fs-tab-label">
              <ExternalLink size={14} aria-hidden />
              فتح اللوحة
            </span>
          </span>
        </Link>
      </div>

      <h5 className="fs-forms-section-title fs-forms-section-title--spaced">بانتظار مراجعتك (تقارير يومية)</h5>
      {dailyForStudent.length === 0 ? (
        <p className="text-soft">لا توجد تقارير يومية بحاجة لمراجعتك لهذا الطالب حاليًا.</p>
      ) : (
        <ul className="fs-forms-list">
          {dailyForStudent.map((r) => (
            <li key={r.id} className="fs-forms-row">
              <div>
                <strong>{r.template_name}</strong>
                <div className="text-soft fs-forms-meta">
                  {r.report_date} — {r.status_label}
                </div>
              </div>
              <Link to={r.link} className="btn-primary-custom btn-sm-custom">
                مراجعة
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h5 className="fs-forms-section-title">نماذج المحرّك (بانتظار مراجعتك لهذا الطالب)</h5>
      {eFormsForStudent.length === 0 ? (
        <p className="text-soft">
          لا توجد نماذج بحالة «بانتظار المراجعة» موجّهة إليك لهذا الطالب. تظهر هنا عند إرسال الطالب للنموذج ويصبح
          أنت المراجع الحالي.
        </p>
      ) : (
        <ul className="fs-forms-list">
          {eFormsForStudent.map((f) => (
            <li key={f.id} className="fs-forms-row">
              <div>
                <strong>{f.template_title}</strong>
                <div className="text-soft fs-forms-meta">{f.status_label}</div>
              </div>
              <Link to={f.link} className="btn-primary-custom btn-sm-custom">
                مراجعة النموذج
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-soft fs-forms-meta" style={{ marginTop: "1rem" }}>
        يمكنك أيضًا استخدام تبويبات «السجلات اليومية» و«التقييم الميداني» في أعلى الصفحة للعمل المباشر على ملف
        الطالب.
      </p>
    </div>
  );
}
