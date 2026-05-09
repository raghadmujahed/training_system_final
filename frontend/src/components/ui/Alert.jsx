import React from 'react';

export function Alert({ children, variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'bg-bg-soft text-text border-border',
    info: 'bg-info/8 border-info/18 text-[#205b82]',
    success: 'bg-success/8 border-success/18 text-[#1b6d4d]',
    warning: 'bg-warning/8 border-warning/20 text-[#8a5a15]',
    destructive: 'bg-danger/8 border-danger/20 text-[#8a2d39]',
  };

  return (
    <div
      role="alert"
      className={`w-full rounded-[16px] border p-4 mb-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children, className = '', ...props }) {
  return (
    <h5
      className={`mb-1 font-bold leading-tight ${className}`}
      {...props}
    >
      {children}
    </h5>
  );
}

export function AlertDescription({ children, className = '', ...props }) {
  return (
    <div
      className={`text-[0.9rem] opacity-90 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Alert;
