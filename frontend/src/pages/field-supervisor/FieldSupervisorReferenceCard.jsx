import { BookMarked } from "lucide-react";
import { getFieldSupervisorReference } from "../../config/fieldSupervisorReference";

/**
 * بطاقة مرجعية: ما يعبئه المشرف الميداني مقابل ما يراجعه فقط — حسب نوع المسار.
 */
export default function FieldSupervisorReferenceCard({ supervisorType, compact = false }) {
  const ref = getFieldSupervisorReference(supervisorType);
  if (!ref) return null;

  const List = ({ title, items, variant }) => (
    <div className={`fs-ref-list fs-ref-list--${variant}`}>
      <h5 className="fs-ref-list__title">{title}</h5>
      <ul>
        {items.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={`section-card fs-ref-card ${compact ? "fs-ref-card--compact" : ""}`}>
      <div className="fs-ref-card__head">
        <BookMarked size={20} aria-hidden />
        <div>
          <div className="fs-ref-card__eyebrow">مرجع المشرف الميداني</div>
          <div className="fs-ref-card__track">{ref.track}</div>
        </div>
      </div>

      <div className="fs-ref-grid">
        <List variant="fill" title="ما تعبئه بنفسك" items={ref.fillBySupervisor} />
        <List variant="review" title="ما تراجعه فقط (من الطالب)" items={ref.reviewOnly} />
      </div>

      {!compact && (
        <>
          <div className="fs-ref-grid fs-ref-grid--triple">
            <List variant="ui" title="ما يجب أن يظهر لك في الواجهة" items={ref.visibleInUi} />
            <List variant="effect" title="ما يترتب على عملك" items={ref.leadsTo} />
            <List variant="where" title="أين تظهر النتيجة" items={ref.whereResults} />
          </div>
          <p className="fs-ref-card__forbidden">{ref.notAllowed}</p>
        </>
      )}
    </div>
  );
}
