import React, { useState, createContext, useContext } from 'react';
import { X } from 'lucide-react';

const DialogContext = createContext(null);

export function Dialog({ children, open, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild, ...props }) {
  const { setOpen } = useContext(DialogContext);

  if (asChild) {
    return React.cloneElement(children, {
      onClick: () => setOpen(true),
      ...props,
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  );
}

export function DialogContent({ children, className = '', ...props }) {
  const { open, setOpen } = useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-bg-paper to-white rounded-[24px] border border-border shadow-lg p-6 ${className}`}
        {...props}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute left-4 top-4 rounded-full w-8 h-8 flex items-center justify-center text-text-soft hover:text-text hover:bg-bg transition-colors"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = '', ...props }) {
  return (
    <div
      className={`flex flex-col gap-1.5 mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = '', ...props }) {
  return (
    <h2
      className={`text-[1.3rem] font-extrabold text-secondary leading-tight ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}

export default Dialog;
