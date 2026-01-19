import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

const SelectContext = createContext();

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const selectRef = useRef(null);
  
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
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
      <div className="relative" ref={selectRef} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ className = '', children, disabled, ...props }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);
  
  return (
    <button
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm",
        "transition-all duration-200 ease-out",
        "ring-offset-background placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        isOpen
          ? "border-[#40B5AD] ring-[#40B5AD]/50"
          : "border-gray-300 hover:border-gray-400 focus:border-[#40B5AD] focus:ring-[#40B5AD]/50",
        className
      )}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      {...props}
    >
      {children}
      <svg
        className={cn(
          "h-4 w-4 text-gray-500 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
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
    <span className={cn(
      "block truncate",
      !selectedValue && "text-gray-400",
      className
    )} {...props}>
      {selectedValue || placeholder}
    </span>
  );
};

const SelectContent = ({ className = '', children, ...props }) => {
  const { isOpen } = useContext(SelectContext);
  
  if (!isOpen) return null;
  
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200",
        className
      )}
      {...props}
    >
      <div className="max-h-60 overflow-auto py-1.5">
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
      className={cn(
        "relative cursor-pointer select-none py-2.5 px-4 text-sm",
        "transition-colors duration-150 ease-out",
        isSelected 
          ? 'bg-[#40B5AD]/10 text-[#40B5AD] font-semibold' 
          : 'text-gray-700 hover:bg-gray-50',
        className
      )}
      onClick={() => handleValueChange(value)}
      {...props}
    >
      {children}
      {isSelected && (
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#40B5AD]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }; 