import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[var(--radius-lg)] shadow-sm p-[22px] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={`flex flex-col gap-1.5 mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={`text-[1.2rem] font-extrabold text-primary-dark leading-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
