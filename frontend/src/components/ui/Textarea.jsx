import React from 'react';

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => {
  return (
    <textarea
      className={`w-full min-h-[120px] border border-border rounded-[14px] bg-white px-3.5 py-3 text-[0.98rem] text-text outline-none transition-all duration-200 resize-vertical placeholder:text-text-faint focus:border-accent-soft/60 focus:shadow-[0_0_0_4px_rgba(176,141,87,0.12)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
