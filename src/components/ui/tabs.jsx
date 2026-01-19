import React, { createContext, useContext, useState } from 'react';
import { cn } from "@/lib/utils";

const TabsContext = createContext();

const Tabs = ({ value, onValueChange, children, className = '', ...props }) => {
  const [activeTab, setActiveTab] = useState(value);
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className = '', children, variant = 'default', ...props }) => {
  const variants = {
    default: "bg-gray-100 rounded-xl p-1.5",
    underline: "bg-transparent border-b border-gray-200 rounded-none p-0",
    pills: "bg-transparent gap-2 p-0"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-start",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const TabsTrigger = ({ value, className = '', children, ...props }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap",
        "px-4 py-2 text-sm font-semibold",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40B5AD]/50 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? 'bg-white text-[#40B5AD] shadow-md' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50',
        className
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className = '', children, ...props }) => {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) {
    return null;
  }
  
  return (
    <div
      className={cn(
        "mt-4 animate-in fade-in-0 slide-in-from-top-1 duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent }; 