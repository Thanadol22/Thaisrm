'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

export interface ThaiDateRangePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function ThaiDateRangePicker({
  value,
  onChange,
  placeholder = 'เลือกช่วงวันที่ (เริ่มต้น - สิ้นสุด)',
  className = '',
  required = false,
}: ThaiDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default to September 2569 (2026) as in mock/design or current
  const [viewDate, setViewDate] = useState<Date>(() => new Date(2026, 8, 1)); // Sep 2026
  const [startDate, setStartDate] = useState<Date | null>(() => new Date(2026, 9, 15)); // Oct 15 2026
  const [endDate, setEndDate] = useState<Date | null>(() => new Date(2026, 9, 17)); // Oct 17 2026
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateRangeString = (start: Date, end: Date | null) => {
    if (!start) return '';
    const startThaiYear = start.getFullYear() + 543;
    const startDay = start.getDate();
    const startMonth = start.getMonth();

    if (!end || start.toDateString() === end.toDateString()) {
      return `${startDay} ${THAI_MONTH_SHORT[startMonth]} ${startThaiYear}`;
    }

    const endThaiYear = end.getFullYear() + 543;
    const endDay = end.getDate();
    const endMonth = end.getMonth();

    if (startThaiYear === endThaiYear && startMonth === endMonth) {
      return `${startDay}-${endDay} ${THAI_MONTH_SHORT[startMonth]} ${startThaiYear}`;
    } else if (startThaiYear === endThaiYear) {
      return `${startDay} ${THAI_MONTH_SHORT[startMonth]} - ${endDay} ${THAI_MONTH_SHORT[endMonth]} ${startThaiYear}`;
    } else {
      return `${startDay} ${THAI_MONTH_SHORT[startMonth]} ${startThaiYear} - ${endDay} ${THAI_MONTH_SHORT[endMonth]} ${endThaiYear}`;
    }
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dayDate: Date) => {
    if (!startDate || (startDate && endDate)) {
      // First click: select start date
      setStartDate(dayDate);
      setEndDate(null);
      const str = formatDateRangeString(dayDate, null);
      onChange(str);
    } else if (startDate && !endDate) {
      // Second click: select end date
      if (dayDate < startDate) {
        setStartDate(dayDate);
        setEndDate(null);
        const str = formatDateRangeString(dayDate, null);
        onChange(str);
      } else {
        setEndDate(dayDate);
        const str = formatDateRangeString(startDate, dayDate);
        onChange(str);
        setIsOpen(false);
      }
    }
  };

  // Generate calendar days
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const thaiYear = year + 543;
  const monthName = THAI_MONTH_FULL[month];

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarCells.push({
      date: new Date(year, month - 1, d),
      isCurrentMonth: false,
      dayNum: d,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
      dayNum: d,
    });
  }

  // Next month leading days to complete 35 or 42 cells
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
      dayNum: d,
    });
  }

  const isSameDay = (d1: Date | null, d2: Date) => {
    if (!d1) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isInRange = (d: Date) => {
    if (startDate && endDate) {
      return d > startDate && d < endDate;
    }
    if (startDate && !endDate && hoverDate && hoverDate > startDate) {
      return d > startDate && d < hoverDate;
    }
    return false;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Trigger Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white border border-slate-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-4 py-3 text-sm text-slate-900 cursor-pointer shadow-2xs transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={value ? 'font-semibold text-slate-900 truncate' : 'text-slate-400 truncate'}>
            {value || placeholder}
          </span>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStartDate(null);
              setEndDate(null);
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          tabIndex={-1}
          required={required}
          value={value}
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {/* Calendar Range Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto right-auto top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-3.5 sm:p-4 w-[calc(100vw-2.5rem)] max-w-[340px] sm:w-[340px] animate-slide-down">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-black text-slate-900 tracking-tight">
              {monthName} {thaiYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-400">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarCells.map((cell, idx) => {
              const isStart = isSameDay(startDate, cell.date);
              const isEnd = isSameDay(endDate, cell.date) || (!endDate && isSameDay(hoverDate, cell.date) && hoverDate && startDate && hoverDate > startDate);
              const inRange = isInRange(cell.date);
              const isSingleSelected = isStart && (isEnd || (!endDate && !hoverDate));

              return (
                <div
                  key={idx}
                  onClick={() => handleDateClick(cell.date)}
                  onMouseEnter={() => {
                    if (startDate && !endDate) {
                      setHoverDate(cell.date);
                    }
                  }}
                  className={`relative flex items-center justify-center h-9 text-xs sm:text-sm font-medium cursor-pointer select-none transition-colors ${
                    !cell.isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-800'
                  } ${
                    inRange ? 'bg-slate-100' : ''
                  } ${
                    isStart && !isSingleSelected ? 'bg-slate-100 rounded-l-xl' : ''
                  } ${
                    isEnd && !isSingleSelected ? 'bg-slate-100 rounded-r-xl' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition font-bold ${
                      isStart || isEnd
                        ? 'bg-slate-900 text-white shadow-xs'
                        : isSameDay(new Date(2026, 8, 10), cell.date)
                        ? 'border border-slate-400 font-bold'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {cell.dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Presets Footer */}
          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">
              {startDate && endDate
                ? `${formatDateRangeString(startDate, endDate)}`
                : startDate
                ? 'เลือกวันสิ้นสุด'
                : 'คลิกเลือกวันเริ่มต้น'}
            </span>
            <div className="flex items-center gap-1.5">
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                    onChange('');
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ล้างค่า
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-2xs"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThaiDateRangePicker;
