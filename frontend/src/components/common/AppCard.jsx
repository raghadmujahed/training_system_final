import { memo } from "react";

/**
 * مكون Card موحد للنظام
 * 
 * @param {React.ReactNode} children - محتوى البطاقة
 * @param {string} title - عنوان البطاقة
 * @param {React.ReactNode} headerAction - عنصر إجراء في الهيدر (زر، رابط...)
 * @param {string} className - classes إضافية
 * @param {boolean} shadow - إضافة ظل (افتراضي: true)
 * @param {boolean} bordered - إضافة حدود (افتراضي: false)
 * @param {string} padding - padding: 'none' | 'sm' | 'md' | 'lg'
 */
const AppCard = memo(function AppCard({
  children,
  title,
  headerAction,
  className = "",
  shadow = true,
  bordered = false,
  padding = "md",
  ...props
}) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div 
      className={`
        bg-white rounded-xl
        ${shadow ? 'shadow-lg shadow-gray-200/50' : ''}
        ${bordered ? 'border border-gray-200' : ''}
        overflow-hidden
        ${className}
      `}
      {...props}
    >
      {(title || headerAction) && (
        <div className={`flex items-center justify-between border-b border-gray-100 ${paddings[padding]}`}>
          {title && (
            <h3 className="text-lg font-bold text-[#142a42]">{title}</h3>
          )}
          {headerAction && (
            <div className={title ? "" : "ml-auto"}>
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className={!title && !headerAction ? paddings[padding] : title || headerAction ? `border-t-0 ${paddings[padding]}` : paddings[padding]}>
        {children}
      </div>
    </div>
  );
});

export default AppCard;
