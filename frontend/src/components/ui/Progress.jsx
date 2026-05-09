import React from 'react';

export function Progress({ value = 0, className = '', ...props }) {
  return (
    <div
      className={`relative h-2.5 w-full overflow-hidden rounded-full bg-[#edf2f7] ${className}`}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-[#c8a36f] transition-all"
        style={{ width: `${value || 0}%` }}
      />
    </div>
  );
}

export default Progress;
