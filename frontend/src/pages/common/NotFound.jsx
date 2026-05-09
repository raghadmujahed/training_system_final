import { useNavigate } from "react-router-dom";
import { Home, ArrowRight, Search } from "lucide-react";
import { AppButton, AppCard } from "../../components/common";

export default function NotFound() {
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
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#142a42] to-[#1e3a5f] flex items-center justify-center">
            <Search size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#142a42] mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            الصفحة غير موجودة
          </h2>
          <p className="text-gray-500 leading-relaxed">
            عذراً، الصفحة التي تحاول الوصول إليها غير متوفرة أو تم نقلها.
            يرجى التحقق من الرابط أو العودة للصفحة الرئيسية.
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

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني
          </p>
        </div>
      </AppCard>
    </div>
  );
}
