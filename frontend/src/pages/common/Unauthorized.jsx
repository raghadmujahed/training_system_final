import { useNavigate } from "react-router-dom";
import { Home, ArrowRight, ShieldAlert } from "lucide-react";
import { AppButton, AppCard } from "../../components/common";

export default function Unauthorized() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <AppCard className="max-w-lg w-full text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
          <h1 className="text-4xl font-bold text-[#142a42] mb-2">403</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            غير مصرح
          </h2>
          <p className="text-gray-500 leading-relaxed">
            عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة.
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع المسؤول.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <AppButton
            onClick={handleGoHome}
            variant="primary"
            leftIcon={<Home size={18} />}
          >
            الصفحة الرئيسية
          </AppButton>
          
          <AppButton
            onClick={handleGoBack}
            variant="outline"
            leftIcon={<ArrowRight size={18} />}
          >
            العودة للخلف
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}
