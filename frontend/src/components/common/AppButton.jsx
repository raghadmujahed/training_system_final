import { memo } from "react";
import { Loader2 } from "lucide-react";

/**
 * مكون Button موحد للنظام
 * 
 * @param {string} variant - نوع الزر: 'primary' | 'secondary' | 'outline' | 'danger'
 * @param {string} size - الحجم: 'sm' | 'md' | 'lg'
 * @param {boolean} loading - حالة التحميل
 * @param {boolean} disabled - تعطيل الزر
 * @param {React.ReactNode} children - محتوى الزر
 * @param {string} className - classes إضافية
 * @param {Function} onClick - معالج النقر
 * @param {string} type - نوع الزر: 'button' | 'submit' | 'reset'
 */
const AppButton = memo(function AppButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-[#142a42] to-[#1e3a5f] text-white hover:from-[#1e3a5f] hover:to-[#2a4a6f] focus:ring-[#142a42] shadow-lg shadow-[#142a42]/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600",
    outline: "border-2 border-[#142a42] text-[#142a42] hover:bg-[#142a42]/5 focus:ring-[#142a42] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-300 disabled:text-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-red-500 disabled:shadow-md",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const loadingSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isDisabled ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5"} ${className}`}
      {...props}
    >
      {loading && (
        <Loader2 
          size={loadingSizes[size]} 
          className="animate-spin ml-2" 
        />
      )}
      {children}
    </button>
  );
});

export default AppButton;
