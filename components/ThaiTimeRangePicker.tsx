'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronRight, X, Check } from 'lucide-react';

export interface ThaiTimeRangePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const COMMON_START_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '11:00',
  '13:00', '13:30', '14:00', '17:00', '18:00', '18:30'
];

const COMMON_END_TIMES = [
  '12:00', '15:00', '16:00', '16:30', '17:00', '17:30',
  '18:00', '19:00', '20:00', '20:30', '21:00', '21:30'
];

const PRESET_RANGES = [
  { label: 'เต็มวัน', time: '08:30 - 17:00 น.', start: '08:30', end: '17:00' },
  { label: 'Workshop', time: '09:00 - 16:30 น.', start: '09:00', end: '16:30' },
  { label: 'ช่วงบ่าย', time: '13:00 - 16:30 น.', start: '13:00', end: '16:30' },
  { label: 'สัมมนาค่ำ', time: '18:00 - 20:30 น.', start: '18:00', end: '20:30' },
];

export function ThaiTimeRangePicker({
  value,
  onChange,
  placeholder = 'เลือกช่วงเวลา (เริ่มต้น - สิ้นสุด)',
  className = '',
}: ThaiTimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing value or fallback
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.replace('น.', '').trim().split('-');
      if (parts[0]) setStartTime(parts[0].trim());
      if (parts[1]) setEndTime(parts[1].trim());
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

  const handleApply = (s: string, e: string) => {
    setStartTime(s);
    setEndTime(e);
    onChange(`${s} - ${e} น.`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Trigger Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white border border-slate-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-4 py-3 text-sm text-slate-900 cursor-pointer shadow-2xs transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={value ? 'font-semibold text-slate-900 truncate' : 'text-slate-400 truncate'}>
            {value || placeholder}
          </span>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Time Range Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto right-auto top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-3.5 sm:p-4 w-[calc(100vw-2.5rem)] max-w-[340px] sm:w-[350px] animate-slide-down space-y-4">
          {/* Header Preview */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                เริ่ม {startTime}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                สิ้นสุด {endTime} น.
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {startTime} - {endTime} น.
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500">ช่วงเวลายอดนิยม:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApply(preset.start, preset.end)}
                  className={`text-xs font-bold p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    value === preset.time
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className={`text-[10px] font-normal ${value === preset.time ? 'text-slate-300' : 'text-slate-500'}`}>
                    {preset.start}-{preset.end}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dual Time Selector Columns */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {/* Start Time Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">เวลาเริ่มต้น</label>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {COMMON_START_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStartTime(t)}
                    className={`w-full text-xs font-bold py-1.5 px-2 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                      startTime === t
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{t} น.</span>
                    {startTime === t && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* End Time Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">เวลาสิ้นสุด</label>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {COMMON_END_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEndTime(t)}
                    className={`w-full text-xs font-bold py-1.5 px-2 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                      endTime === t
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{t} น.</span>
                    {endTime === t && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-bold px-2 py-1"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleApply(startTime, endTime)}
              className="px-4 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer"
            >
              บันทึกเวลา
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThaiTimeRangePicker;
