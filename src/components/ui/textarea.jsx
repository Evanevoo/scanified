import React from 'react';
import { cn } from "@/lib/utils";

const Textarea = ({ 
  className = '', 
  disabled = false,
  error = false,
  ...props 
}) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border bg-white px-4 py-3 text-sm",
        "transition-all duration-200 ease-out resize-y",
        "placeholder:text-gray-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        error 
          ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/50"
          : "border-gray-300 focus-visible:border-[#40B5AD] focus-visible:ring-[#40B5AD]/50 hover:border-gray-400",
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
};

export { Textarea }; 