import React, { useState, createContext, useContext } from 'react';

const TabsContext = createContext(null);

export function Tabs({ children, value, onValueChange, className = '', ...props }) {
  const [activeTab, setActiveTab] = useState(value);

  const handleChange = (newValue) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '', ...props }) {
  return (
    <div
      className={`flex items-center gap-2.5 flex-wrap mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className = '', ...props }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center justify-center min-h-[42px] px-4 rounded-[12px] border font-bold text-[0.95rem] transition-all duration-200 ${isActive ? 'bg-accent/12 text-secondary border-accent/30' : 'bg-white border-border text-text-soft hover:bg-[#f7fafc] hover:border-border-strong'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className = '', ...props }) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return (
    <div
      className={`focus-visible:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Tabs;
