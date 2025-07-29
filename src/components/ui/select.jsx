import React, { createContext, useContext, useState } from 'react';

const SelectContext = createContext();

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  
  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    setIsOpen(false);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <SelectContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      selectedValue, 
      handleValueChange 
    }}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ className = '', children, ...props }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);
  
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
};

const SelectValue = ({ placeholder, className = '', ...props }) => {
  const { selectedValue } = useContext(SelectContext);
  
  return (
    <span className={`block truncate ${className}`} {...props}>
      {selectedValue || placeholder}
    </span>
  );
};

const SelectContent = ({ className = '', children, ...props }) => {
  const { isOpen } = useContext(SelectContext);
  
  if (!isOpen) return null;
  
  return (
    <div
      className={`absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg ${className}`}
      {...props}
    >
      <div className="max-h-60 overflow-auto py-1">
        {children}
      </div>
    </div>
  );
};

const SelectItem = ({ value, className = '', children, ...props }) => {
  const { handleValueChange, selectedValue } = useContext(SelectContext);
  const isSelected = selectedValue === value;
  
  return (
    <div
      className={`relative cursor-pointer select-none py-2 px-3 text-sm hover:bg-gray-100 ${
        isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
      } ${className}`}
      onClick={() => handleValueChange(value)}
      {...props}
    >
      {children}
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }; 