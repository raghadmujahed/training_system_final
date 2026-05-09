import React from 'react';

export function Badge({ children, variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'bg-primary/10 text-secondary',
    secondary: 'bg-[#f3f6fa] text-text-soft border border-border',
    outline: 'border border-border text-text-soft bg-transparent',
    destructive: 'bg-danger/12 text-danger',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/12 text-warning',
    info: 'bg-info/12 text-info',
  };

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 min-h-[30px] px-3 rounded-full text-[0.84rem] font-extrabold border border-transparent transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
