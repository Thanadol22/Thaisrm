'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

export interface ThaiDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  prefix?: string; // e.g. 'After ' or 'หลังจากวันที่ ' or ''
  format?: 'thai' | 'english' | 'iso'; // '10 ตุลาคม 2569' | '10 October 2026' | '2026-10-10'
}

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const ENG_MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENG_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function parseThaiSingleDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.replace(/^(After|after|หลังจากวันที่|หลังวันที่|วันที่)\s*/i, '').trim();

  // Try ISO format (e.g. 2026-10-10)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Check English format e.g. "10 Oct 2026" or "10 October 2026"
  const engMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
  if (engMatch) {
    const day = parseInt(engMatch[1], 10);
    const mStr = engMatch[2].toLowerCase();
    let year = engMatch[3] ? parseInt(engMatch[3], 10) : new Date().getFullYear();
    if (year > 2400) year -= 543;

    let mIdx = ENG_MONTH_FULL.findIndex(m => m.toLowerCase().startsWith(mStr));
    if (mIdx < 0) {
      mIdx = ENG_MONTH_SHORT.findIndex(m => m.toLowerCase() === mStr);
    }
    if (mIdx >= 0) {
      return new Date(year, mIdx, day);
    }
  }

  // Check Thai format e.g. "10 ตุลาคม 2569" or "10 ต.ค. 2569"
  const thaiMatch = trimmed.match(/^(\d{1,2})\s+([^\d\s]+)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10);
    const mName = thaiMatch[2].trim();
    let year = parseInt(thaiMatch[3], 10);
    if (year > 2400) year -= 543;

    let mIdx = THAI_MONTH_FULL.indexOf(mName);
    if (mIdx < 0) {
      const shortIdx = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ].indexOf(mName);
      if (shortIdx >= 0) mIdx = shortIdx;
    }
    if (mIdx >= 0) {
      return new Date(year, mIdx, day);
    }
  }

  // Fallback native date parsing
  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d : null;
}

export function ThaiDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  className = '',
  required = false,
  prefix = '',
  format = 'thai',
}: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  // Sync internal state when value prop changes
  useEffect(() => {
    if (!value) {
      setSelectedDate(null);
      return;
    }
    const parsed = parseThaiSingleDate(value);
    if (parsed) {
      setSelectedDate(parsed);
      setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [value]);

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

  const formatDateOutput = (d: Date): string => {
    const y = d.getFullYear();
    const thaiY = y + 543;
    const day = d.getDate();
    const m = d.getMonth();

    let dateText = '';
    if (format === 'english') {
      dateText = `${day} ${ENG_MONTH_FULL[m]} ${y}`;
    } else if (format === 'iso') {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      dateText = `${y}-${mm}-${dd}`;
    } else {
      dateText = `${day} ${THAI_MONTH_FULL[m]} ${thaiY}`;
    }

    return prefix ? `${prefix}${dateText}` : dateText;
  };

  const handleDateClick = (d: Date) => {
    setSelectedDate(d);
    const output = formatDateOutput(d);
    onChange(output);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
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

  // Trailing days from prev month
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

  // Leading days for next month
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
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return isSameDay(today, d);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Trigger Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border rounded-xl px-3.5 py-2 text-xs sm:text-sm cursor-pointer transition flex items-center justify-between gap-2 shadow-2xs select-none ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-200'
            : value
            ? 'border-amber-300 hover:border-amber-400'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon className="w-4 h-4 text-amber-600 shrink-0" />
          <span className={`truncate font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
            {value || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="ล้างวันที่"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden input for HTML validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Popup Calendar Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 w-72 sm:w-80 animate-scale-up">
          {/* Header Month & Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {monthName} {thaiYear}
              </span>
              <span className="text-[10px] text-slate-400 block font-normal">
                ({ENG_MONTH_FULL[month]} {year})
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[11px] font-bold text-slate-400">
            {WEEKDAYS.map((w, idx) => (
              <div key={w} className={idx === 0 ? 'text-rose-500' : ''}>
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const selected = isSameDay(selectedDate, cell.date);
              const today = isToday(cell.date);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateClick(cell.date)}
                  className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer relative ${
                    !cell.isCurrentMonth
                      ? 'text-slate-300 hover:bg-slate-50'
                      : selected
                      ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                      : today
                      ? 'border border-amber-400 text-amber-900 bg-amber-50/50 hover:bg-amber-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{cell.dayNum}</span>
                  {selected && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Format Selection & Presets */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => handleDateClick(new Date())}
              className="font-bold text-amber-700 hover:text-amber-900 transition hover:underline cursor-pointer"
            >
              วันนี้
            </button>

            {selectedDate && (
              <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {selectedDate.getDate()} {THAI_MONTH_FULL[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
