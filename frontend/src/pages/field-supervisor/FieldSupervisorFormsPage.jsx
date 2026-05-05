import { useState } from "react";
import { Link } from "react-router-dom";
import { useFormsWorkboard, useReportTemplates } from "../../hooks/useFieldSupervisorApi";
import PageHeader from "../../components/common/PageHeader";
import FieldSupervisorReferenceCard from "./FieldSupervisorReferenceCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { FileStack, ClipboardList, Eye, PenLine } from "lucide-react";

export default function FieldSupervisorFormsPage() {
  /** الافتراضي: «أعبئها أنا» حتى لا تبدو الصفحة فارغة عند عدم وجود عناصر مراجعة بعد. */
  const [tab, setTab] = useState("fill");
  const { data: board, loading: wbLoading, error: wbError, refresh: wbRefresh } = useFormsWorkboard();
  const { templates, loading: tplLoading, error: tplError, refresh: tplRefresh } = useReportTemplates();

  const loading = wbLoading || tplLoading;
  const subtype = board?.supervisor_subtype;

  return (
    <>
      <PageHeader
        icon={FileStack}
        title="النماذج والتقارير"
        subtitle={
          board?.supervisor_subtype_label
            ? `${board.supervisor_subtype_label} — تبويبان: «من الطالب للمراجعة» مقابل «ما أعبئه أنا» (تقييم وحضور واعتماد).`
            : "نماذج المشرف الميداني: مراجعة مقابل تعبئة — وفق نوع مسارك في النظام."
        }
      />

      {!loading && subtype ? <FieldSupervisorReferenceCard supervisorType={subtype} compact /> : null}

      <div className="tabs">
        <button type="button" className={tab === "review" ? "tab-active" : "tab"} onClick={() => setTab("review")}>
          <span className="fs-tab-label">
            <Eye size={16} aria-hidden />
            للمراجعة (من الطالب)
          </span>
        </button>
        <button type="button" className={tab === "fill" ? "tab-active" : "tab"} onClick={() => setTab("fill")}>
          <span className="fs-tab-label">
            <PenLine size={16} aria-hidden />
            أعبئها أنا (تقييم · حضور · اعتماد)
          </span>
        </button>
      </div>

      {loading && (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      )}

      {wbError && (
        <div className="section-card fs-panel-error fs-forms-page-alert">
          <p className="text-danger mb-0">
            <strong>لوحة المراجعة:</strong> {wbError}
          </p>
          <button type="button" className="btn-outline-custom btn-sm-custom fs-forms-retry" onClick={() => wbRefresh()}>
            إعادة تحميل لوحة النماذج
          </button>
        </div>
      )}

      {tplError && (
        <div className="fs-dash-alert fs-dash-alert--warning fs-forms-page-alert">
          <p className="fs-dash-alert__text">
            <strong>قوالب التقارير اليومية:</strong> {tplError} — يمكنك متابعة التقييم والحضور أدناه.
          </p>
          <button type="button" className="btn-outline-custom btn-sm-custom fs-forms-retry" onClick={() => tplRefresh()}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && tab === "review" && (
        <div className="section-card fs-students-panel">
          <h4 className="fs-forms-card-title">
            <ClipboardList size={20} aria-hidden />
            عناصر بانتظار مراجعتك
          </h4>
          <p className="fs-panel-hint">لا تشمل هذه القائمة التقييم الأكاديمي أو نماذج المدير — فقط ما يخص تعييناتك كمشرف ميداني.</p>

          <h5 className="fs-forms-section-title fs-forms-section-title--first">تقارير المهام والأعمال اليومية (من الطالب)</h5>
          {wbError ? (
            <p className="text-soft">تعذر جلب قائمة التقارير بسبب الخطأ أعلاه.</p>
          ) : (board?.review?.daily_task_reports || []).length === 0 ? (
            <p className="text-soft">
              لا توجد تقارير بحالة «مُرسل» أو «قيد المراجعة» حاليًا. عندما يرسل الطالب تقرير المهام اليومية يظهر هنا
              للتأكيد أو الإعادة من ملف الطالب.
            </p>
          ) : (
            <ul className="fs-forms-list">
              {board.review.daily_task_reports.map((r) => (
                <li key={r.id} className="fs-forms-row">
                  <div>
                    <strong>{r.student_name}</strong>
                    <span className="text-soft fs-forms-inline-meta">{r.report_date}</span>
                    <div className="text-soft fs-forms-meta">
                      {r.template_name} — {r.status_label}
                    </div>
                  </div>
                  <Link to={r.link} className="btn-primary-custom btn-sm-custom">
                    فتح المراجعة
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h5 className="fs-forms-section-title">نماذج المحرّك (E-Forms) — بانتظار دورك</h5>
          {wbError ? (
            <p className="text-soft">تعذر جلب نماذج المحرّك بسبب الخطأ أعلاه.</p>
          ) : (board?.review?.e_form_instances || []).length === 0 ? (
            <p className="text-soft">
              لا توجد نماذج بحالة «بانتظار المراجعة» مُوجّهة إليك حاليًا. تظهر هنا بعد إرسال الطالب لنموذج من محرك
              النماذج ويصبح أنت المراجع الحالي في سير العمل.
            </p>
          ) : (
            <ul className="fs-forms-list">
              {board.review.e_form_instances.map((f) => (
                <li key={f.id} className="fs-forms-row">
                  <div>
                    <strong>{f.template_title}</strong>
                    {f.student_name || f.subject_name ? (
                      <span className="text-soft fs-forms-inline-meta">— {f.student_name || f.subject_name}</span>
                    ) : f.student_id ? (
                      <span className="text-soft fs-forms-inline-meta">— طالب #{f.student_id}</span>
                    ) : null}
                    <div className="text-soft fs-forms-meta">{f.status_label}</div>
                  </div>
                  <Link to={f.link} className="btn-primary-custom btn-sm-custom">
                    مراجعة النموذج
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && tab === "fill" && (
        <div className="section-card fs-students-panel">
          <h4 className="fs-panel-title">ما تعبئه أنت مباشرة</h4>
          <p className="fs-panel-hint">
            التقييم الميداني (المحاور والدرجات) وسجل الحضور مع اعتمادك وملاحظاتك على السجل من ملف كل طالب.
          </p>

          <div className="fs-forms-action-stack">
            <div className="fs-forms-action-card fs-forms-action-card--evaluation">
              <div className="fs-forms-action-card__text">
                <p className="fs-forms-action-card__title">{board?.fill?.field_evaluation?.title || "التقييم الميداني"}</p>
                <p className="fs-forms-action-card__hint">{board?.fill?.field_evaluation?.hint}</p>
              </div>
              <div className="fs-forms-action-card__cta">
                <Link to={board?.fill?.field_evaluation?.hub_link || "/field-supervisor/evaluation"} className="btn-primary-custom btn-sm-custom">
                  فتح التقييم
                </Link>
              </div>
            </div>
            <div className="fs-forms-action-card fs-forms-action-card--attendance">
              <div className="fs-forms-action-card__text">
                <p className="fs-forms-action-card__title">{board?.fill?.attendance?.title || "سجل الحضور والاعتماد"}</p>
                <p className="fs-forms-action-card__hint">{board?.fill?.attendance?.hint}</p>
              </div>
              <div className="fs-forms-action-card__cta">
                <Link to={board?.fill?.attendance?.hub_link || "/field-supervisor/attendance"} className="btn-outline-custom btn-sm-custom">
                  الطلبة والحضور
                </Link>
              </div>
            </div>
          </div>

          <h5 className="fs-forms-section-title fs-forms-section-title--spaced">قوالب التقارير اليومية (مرجع — التعبئة من الطالب)</h5>
          {templates.length === 0 ? (
            <p className="text-soft">لا توجد قوالب تقرير مفعّلة لنوعك.</p>
          ) : (
            <div className="fs-forms-ref-block">
              <ul className="fs-forms-list">
                {templates.map((t) => (
                  <li key={t.id} className="fs-forms-ref-item">
                    <p className="fs-forms-ref-item__name">{t.name}</p>
                    {t.description ? <p className="fs-forms-ref-item__desc">{t.description}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
