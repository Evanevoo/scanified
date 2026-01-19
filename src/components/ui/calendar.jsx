import React, { useState } from 'react';
import { cn } from "@/lib/utils";

const Calendar = ({ 
  events = [], 
  className = '',
  onDateSelect,
  selectedDate,
  ...props 
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  const getEventsForDay = (day) => {
    if (!day) return [];
    const dayDate = new Date(currentYear, currentMonth, day);
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === dayDate.toDateString();
    });
  };

  const isToday = (day) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    const selected = new Date(selectedDate);
    return day === selected.getDate() &&
           currentMonth === selected.getMonth() &&
           currentYear === selected.getFullYear();
  };

  const handleDateClick = (day) => {
    if (day && onDateSelect) {
      const date = new Date(currentYear, currentMonth, day);
      onDateSelect(date);
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden",
      className
    )} {...props}>
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#40B5AD]/5 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Previous month"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Next month"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const todayFlag = isToday(day);
            const selectedFlag = isSelected(day);
            
            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                disabled={!day}
                className={cn(
                  "min-h-[70px] p-2 rounded-lg border transition-all duration-200 ease-out",
                  "flex flex-col items-start",
                  day 
                    ? 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 cursor-pointer' 
                    : 'bg-transparent border-transparent cursor-default',
                  todayFlag && 'border-[#40B5AD] bg-[#40B5AD]/5',
                  selectedFlag && 'bg-[#40B5AD] text-white border-[#40B5AD] hover:bg-[#2E9B94]',
                  !selectedFlag && day && 'text-gray-900'
                )}
              >
                {day && (
                  <>
                    <div className={cn(
                      "text-sm font-semibold mb-1",
                      selectedFlag ? 'text-white' : todayFlag ? 'text-[#40B5AD]' : 'text-gray-700'
                    )}>
                      {day}
                    </div>
                    <div className="flex-1 w-full space-y-0.5">
                      {dayEvents.slice(0, 2).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded truncate w-full",
                            selectedFlag
                              ? 'bg-white/20 text-white'
                              : 'bg-[#40B5AD]/10 text-[#40B5AD]'
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className={cn(
                          "text-[10px] px-1",
                          selectedFlag ? 'text-white/80' : 'text-gray-500'
                        )}>
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { Calendar }; 