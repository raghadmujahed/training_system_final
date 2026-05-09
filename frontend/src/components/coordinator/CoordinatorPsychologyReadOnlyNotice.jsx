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
      className="bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] border border-info/20 rounded-xl p-3.5 mb-3 border-r-4 border-r-info leading-relaxed"
    >
      <strong className="block mb-1.5 text-[#0369a1]">
        قسم علم النفس — وضع الاطلاع
      </strong>
      <span className="text-[0.92rem] text-[#0c4a6e]">
        طلبات التدريب والدفعات الرسمية لمسار علم النفس تُدار من قبل المشرف الأكاديمي للقسم. يمكنك متابعة القوائم
        هنا عند الحاجة؛ مسار أصول التربية يبقى تحت مسؤولية المنسق كما هو دون تغيير.
      </span>
    </div>
  );
}
