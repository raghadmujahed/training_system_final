import { memo, forwardRef } from "react";

/**
 * مكون Input موحد للنظام
 * 
 * @param {string} label - عنوان الحقل
 * @param {string} name - اسم الحقل
 * @param {string} type - نوع الإدخال
 * @param {string} value - القيمة
 * @param {Function} onChange - معالج التغيير
 * @param {string} placeholder - النص التوضيحي
 * @param {string} error - رسالة الخطأ
 * @param {boolean} required - هل الحقل إلزامي
 * @param {boolean} disabled - هل الحقل معطل
 * @param {string} className - classes إضافية
 * @param {string} labelClassName - classes إضافية للعنوان
 * @param {string} inputClassName - classes إضافية للحقل
 * @param {React.ReactNode} icon - أيقونة على اليمين
 * @param {React.ReactNode} leftIcon - أيقونة على اليسار
 */
const AppInput = memo(forwardRef(function AppInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error,
  required = false,
  disabled = false,
  className = "",
  labelClassName = "",
  inputClassName = "",
  icon,
  leftIcon,
  ...props
}, ref) {
  const inputId = name || Math.random().toString(36).substr(2, 9);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-semibold text-[#142a42] mb-2 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-3 
            bg-white border rounded-lg
            text-[#142a42] placeholder-gray-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#b08d57]/30 focus:border-[#b08d57]
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${icon ? 'pr-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300 hover:border-gray-400'}
            ${inputClassName}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
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

export default AppInput;
