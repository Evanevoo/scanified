import React from 'react';
import { cn } from "@/lib/utils";

const Alert = ({ 
  className = '', 
  variant = 'default',
  children,
  icon,
  ...props 
}) => {
  const variants = {
    default: {
      container: 'bg-blue-50/80 border-blue-200 text-blue-900',
      icon: 'text-blue-600'
    },
    destructive: {
      container: 'bg-red-50/80 border-red-200 text-red-900',
      icon: 'text-red-600'
    },
    warning: {
      container: 'bg-amber-50/80 border-amber-200 text-amber-900',
      icon: 'text-amber-600'
    },
    success: {
      container: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      icon: 'text-emerald-600'
    },
    info: {
      container: 'bg-[#40B5AD]/10 border-[#40B5AD]/30 text-[#2E9B94]',
      icon: 'text-[#40B5AD]'
    }
  };

  const variantStyles = variants[variant] || variants.default;
  
  const defaultIcons = {
    default: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    destructive: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };
  
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border-2 p-4 shadow-sm",
        "flex items-start gap-3",
        variantStyles.container,
        className
      )}
      {...props}
    >
      {(icon !== null) && (
        <div className={cn("flex-shrink-0 mt-0.5", variantStyles.icon)}>
          {icon || defaultIcons[variant] || defaultIcons.default}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

const AlertDescription = ({ className = '', children, ...props }) => {
  return (
    <div
      className={cn("text-sm leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  );
};

const AlertTitle = ({ className = '', children, ...props }) => {
  return (
    <div
      className={cn("font-semibold mb-1.5 text-base", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export { Alert, AlertDescription, AlertTitle }; 