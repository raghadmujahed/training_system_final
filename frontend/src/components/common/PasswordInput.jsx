import { memo, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * مكون Password Input مع إمكانية إظهار/إخفاء كلمة المرور
 * 
 * @param {string} label - عنوان الحقل
 * @param {string} name - اسم الحقل
 * @param {string} value - القيمة
 * @param {Function} onChange - معالج التغيير
 * @param {string} placeholder - النص التوضيحي
 * @param {string} error - رسالة الخطأ
 * @param {boolean} required - هل الحقل إلزامي
 * @param {boolean} disabled - هل الحقل معطل
 * @param {string} className - classes إضافية
 * @param {boolean} showToggle - إظهار زر التبديل (افتراضي: true)
 */
const PasswordInput = memo(forwardRef(function PasswordInput({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  error,
  required = false,
  disabled = false,
  className = "",
  showToggle = true,
  ...props
}, ref) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = name || Math.random().toString(36).substr(2, 9);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-semibold text-[#142a42] mb-2"
        >
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-3 pr-12
            bg-white border rounded-lg
            text-[#142a42] placeholder-gray-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#b08d57]/30 focus:border-[#b08d57]
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300 hover:border-gray-400'}
          `}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={20} className="text-[#142a42]" />
            ) : (
              <Eye size={20} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <span>•</span> {error}
        </p>
      )}
    </div>
  );
}));

export default PasswordInput;
