import { readStoredUser } from "../../utils/session";
import { isPsychologyCoordinatorDept } from "../../utils/psychologyWorkflow";

/**
 * يُعرض لمنسقي قسم علم النفس فقط: توضيح أن التوزيع الرئيسي أصبح تحت المشرف الأكاديمي
 * مع الإبقاء على الوصول للقوائم للاطلاع عند الحاجة.
 */
export default function CoordinatorPsychologyReadOnlyNotice() {
  if (!isPsychologyCoordinatorDept(readStoredUser())) {
    return null;
  }

  return (
    <div
      className="alert-custom alert-info mb-3"
      style={{
        borderRadius: 12,
        borderRight: "4px solid #0ea5e9",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        padding: "14px 16px",
        lineHeight: 1.65,
      }}
    >
      <strong style={{ display: "block", marginBottom: 6, color: "#0369a1" }}>
        قسم علم النفس — وضع الاطلاع
      </strong>
      <span style={{ fontSize: "0.92rem", color: "#0c4a6e" }}>
        طلبات التدريب والدفعات الرسمية لمسار علم النفس تُدار من قبل المشرف الأكاديمي للقسم. يمكنك متابعة القوائم
        هنا عند الحاجة؛ مسار أصول التربية يبقى تحت مسؤولية المنسق كما هو دون تغيير.
      </span>
    </div>
  );
}
