import React, { useState, createContext, useContext } from 'react';

const SelectContext = createContext(null);

export function Select({ children, value, onValueChange, ...props }) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = '', ...props }) {
  const { open, setOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex min-h-[48px] w-full items-center justify-between border border-border rounded-[14px] bg-white px-3.5 py-3 text-[0.98rem] text-text outline-none transition-all duration-200 focus:border-accent-soft/60 focus:shadow-[0_0_0_4px_rgba(176,141,87,0.12)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder = 'اختر...' }) {
  const { value } = useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

export function SelectContent({ children, className = '' }) {
  const { open } = useContext(SelectContext);

  if (!open) return null;

  return (
    <div className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-[14px] bg-white border border-border shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ children, value, className = '' }) {
  const { value: selectedValue, onValueChange, setOpen } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-[10px] py-2.5 px-3 text-[0.95rem] outline-none transition-colors hover:bg-bg ${isSelected ? 'bg-accent/12 text-secondary font-bold' : 'text-text'} ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-accent">
          ✓
        </span>
      )}
      {children}
    </div>
  );
}

export default Select;
