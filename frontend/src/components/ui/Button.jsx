import React from 'react';

export function Button({ children, onClick, type = 'button', variant = 'default', size = 'md', disabled = false, className = '', ...props }) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-bold rounded-[14px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[46px] px-[18px] border border-transparent whitespace-nowrap';

  const variants = {
    default: 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_10px_20px_rgba(23,50,75,0.14)] hover:-translate-y-px hover:shadow-[0_14px_24px_rgba(23,50,75,0.18)] focus:ring-primary/50',
    secondary: 'bg-gradient-to-br from-accent to-[#9a7748] text-white hover:-translate-y-px focus:ring-accent/50',
    outline: 'bg-white border-border text-secondary hover:bg-[#f7fafc] hover:border-border-strong focus:ring-primary/50',
    ghost: 'text-text-soft hover:bg-bg hover:text-text focus:ring-primary/50',
    destructive: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger/50',
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success/50',
    warning: 'bg-warning text-white hover:bg-warning/90 focus:ring-warning/50',
    light: 'bg-[#f7f9fc] text-secondary border-border hover:bg-[#eef1f6] focus:ring-primary/50',
  };

  const sizes = {
    sm: 'min-h-[38px] px-[14px] rounded-[12px] text-[0.9rem]',
    md: 'min-h-[46px] px-[18px] text-[0.98rem]',
    lg: 'min-h-[54px] px-6 text-base',
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
