'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock } from 'lucide-react';

export interface ThaiDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  disabled?: boolean;
  prefix?: string; // e.g. 'After ' or 'หลังจากวันที่ ' or ''
  format?: 'thai' | 'english' | 'iso'; // '10 ตุลาคม 2569' | '10 October 2026' | '2026-10-10'
  outputFormat?: 'thai' | 'english' | 'iso';
  displayFormat?: 'thai' | 'english' | 'iso';
  dropdownAlign?: 'left' | 'right';
  showTime?: boolean; // When true, includes hour & minute picker
  theme?: 'light' | 'dark'; // Dark theme for dark cards
}

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
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

export function parseThaiSingleDate(dateStr: string): { date: Date | null; timeStr: string } {
  if (!dateStr || typeof dateStr !== 'string') return { date: null, timeStr: '07:00' };
  const trimmed = dateStr.replace(/^(After|after|หลังจากวันที่|หลังวันที่|วันที่)\s*/i, '').trim();

  let extractedTime = '07:00';
  const timeMatch = trimmed.match(/(?:T|\s+|เวลา\s*)(\d{1,2}):(\d{2})/i);
  if (timeMatch) {
    const hh = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
    const mm = String(parseInt(timeMatch[2], 10)).padStart(2, '0');
    extractedTime = `${hh}:${mm}`;
  }

  // Try ISO format (e.g. 2026-10-10 or 2026-10-10T07:00)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const datePart = trimmed.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return { date: parsed, timeStr: extractedTime };
    }
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
      return { date: new Date(year, mIdx, day), timeStr: extractedTime };
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
      mIdx = THAI_MONTH_SHORT.indexOf(mName);
    }
    if (mIdx < 0) {
      const clean = mName.replace(/\./g, '');
      mIdx = THAI_MONTH_SHORT.map(s => s.replace(/\./g, '')).indexOf(clean);
    }
    if (mIdx >= 0) {
      return { date: new Date(year, mIdx, day), timeStr: extractedTime };
    }
  }

  // Fallback native date parsing
  const d = new Date(trimmed);
  return { date: !isNaN(d.getTime()) ? d : null, timeStr: extractedTime };
}

export function formatThaiDate(
  d: Date | null,
  formatType: 'thai' | 'english' | 'iso' = 'thai',
  timeStr?: string
): string {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const thaiY = y + 543;
  const day = d.getDate();
  const m = d.getMonth();

  if (formatType === 'english') {
    const base = `${day} ${ENG_MONTH_FULL[m]} ${y}`;
    return timeStr ? `${base} ${timeStr}` : base;
  } else if (formatType === 'iso') {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return timeStr ? `${y}-${mm}-${dd}T${timeStr}` : `${y}-${mm}-${dd}`;
  } else {
    const base = `${day} ${THAI_MONTH_FULL[m]} ${thaiY}`;
    return timeStr ? `${base} เวลา ${timeStr} น.` : base;
  }
}

export function ThaiDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  className = '',
  inputClassName = '',
  required = false,
  disabled = false,
  prefix = '',
  format = 'thai',
  outputFormat,
  displayFormat = 'thai',
  dropdownAlign = 'left',
  showTime = false,
  theme = 'light',
}: ThaiDatePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const effectiveOutputFormat = outputFormat || (showTime ? 'iso' : (format || 'thai'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('07:00');
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (!value) {
      setSelectedDate(null);
      setSelectedTime('07:00');
      return;
    }
    const { date, timeStr } = parseThaiSingleDate(value);
    if (date) {
      setSelectedDate(date);
      setSelectedTime(timeStr || '07:00');
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Calculate and update position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 340;
      const popoverHeight = showTime ? 440 : 380;

      let top = rect.bottom + 8;
      // If bottom edge exceeds window height and there is room above, flip to top
      if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 10) {
        top = Math.max(10, rect.top - popoverHeight - 8);
      }

      let left = dropdownAlign === 'right' ? rect.right - popoverWidth : rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      setPopupPos({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, showTime, dropdownAlign]);

  // Close when clicking outside both container trigger and portal popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatDateOutput = (d: Date, targetFormat: 'thai' | 'english' | 'iso', tStr?: string): string => {
    const dateText = formatThaiDate(d, targetFormat, showTime ? tStr || selectedTime : undefined);
    return prefix ? `${prefix}${dateText}` : dateText;
  };

  const handleDateClick = (d: Date) => {
    setSelectedDate(d);
    const output = formatDateOutput(d, effectiveOutputFormat, selectedTime);
    onChange(output);
  };

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    if (selectedDate) {
      const output = formatDateOutput(selectedDate, effectiveOutputFormat, newTime);
      onChange(output);
    }
  };

  const handleConfirm = () => {
    if (!selectedDate) {
      const today = new Date();
      setSelectedDate(today);
      const output = formatDateOutput(today, effectiveOutputFormat, selectedTime);
      onChange(output);
    }
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

  // Leading days for next month to complete the grid
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

  // Calculate formatted display label for trigger
  const displayLabel = selectedDate
    ? formatDateOutput(selectedDate, displayFormat, showTime ? selectedTime : undefined)
    : value
    ? value
    : '';

  // Trigger Style Variations (Light vs Dark theme)
  const isDark = theme === 'dark';
  const triggerContainerStyle = isDark
    ? `bg-white/10 hover:bg-white/15 border border-white/20 text-white ${
        isOpen ? 'ring-2 ring-amber-400/50 border-amber-400' : ''
      }`
    : `bg-white border text-slate-900 ${
        disabled
          ? 'opacity-60 cursor-not-allowed bg-slate-100 border-slate-200'
          : isOpen
          ? 'border-slate-900 ring-2 ring-slate-900/10'
          : value
          ? 'border-slate-300 hover:border-slate-400'
          : 'border-slate-200 hover:border-slate-300'
      }`;

  const triggerLabelStyle = isDark
    ? displayLabel
      ? 'text-white font-bold'
      : 'text-blue-200/60 font-medium'
    : displayLabel
    ? 'text-slate-900 font-semibold'
    : 'text-slate-400 font-normal';

  const [hours, minutes] = selectedTime.split(':');

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Trigger Field */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer shadow-2xs transition select-none ${triggerContainerStyle} ${inputClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {showTime ? (
            <Clock className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-slate-500'}`} />
          ) : (
            <CalendarIcon className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-200' : 'text-slate-500'}`} />
          )}
          <span className={`truncate ${triggerLabelStyle}`}>
            {displayLabel || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1 rounded-md transition cursor-pointer ${
                isDark
                  ? 'text-blue-200/80 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
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
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Portal Dropdown Popover (Mounted to document.body to prevent overflow-hidden clipping) */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: `${popupPos.top}px`,
              left: `${popupPos.left}px`,
            }}
            className="fixed z-[99999] bg-white text-slate-900 border border-slate-200/90 rounded-3xl shadow-2xl p-4 w-[calc(100vw-2rem)] max-w-[340px] sm:w-[340px] animate-scale-up select-none"
          >
            {/* Header Month / Year Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-black text-slate-900 tracking-tight">
                {monthName} {thaiYear}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Row */}
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-400">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {calendarCells.map((cell, idx) => {
                const isSelected = isSameDay(selectedDate, cell.date);
                const today = isToday(cell.date);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(cell.date)}
                    className="relative flex items-center justify-center h-9 text-xs sm:text-sm cursor-pointer select-none"
                  >
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition font-bold ${
                        !cell.isCurrentMonth
                          ? 'text-slate-300 hover:bg-slate-50'
                          : isSelected
                          ? 'bg-slate-900 text-white shadow-sm'
                          : today
                          ? 'border border-slate-400 text-slate-900 bg-slate-50 hover:bg-slate-100 font-bold'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {cell.dayNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Time Picker Section */}
            {showTime && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>เวลาที่กำหนด (น.)</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                    <select
                      value={hours || '07'}
                      onChange={(e) => handleTimeChange(`${e.target.value}:${minutes || '00'}`)}
                      className="bg-transparent font-black text-xs text-slate-900 outline-none cursor-pointer"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const val = String(i).padStart(2, '0');
                        return (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                    <span className="text-xs font-bold text-slate-400">:</span>
                    <select
                      value={minutes || '00'}
                      onChange={(e) => handleTimeChange(`${hours || '07'}:${e.target.value}`)}
                      className="bg-transparent font-black text-xs text-slate-900 outline-none cursor-pointer"
                    >
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((mVal) => (
                        <option key={mVal} value={mVal}>
                          {mVal}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Time Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {['07:00', '08:00', '09:00', '12:00', '18:00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleTimeChange(preset)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        selectedTime === preset
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer with Status & Confirm Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium text-[11px] truncate max-w-[170px]">
                {selectedDate
                  ? formatThaiDate(selectedDate, 'thai', showTime ? selectedTime : undefined)
                  : 'คลิกเลือกวันที่'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedDate && (
                  <button
                    type="button"
                    onClick={(e) => handleClear(e)}
                    className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างค่า
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-2xs transition"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default ThaiDatePicker;
