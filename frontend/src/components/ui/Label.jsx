import React from 'react';

export function Label({ children, className = '', ...props }) {
  return (
    <label
      className={`inline-block mb-2 text-secondary text-[0.95rem] font-bold peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}

export default Label;
