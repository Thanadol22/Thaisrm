'use client';

import React from 'react';
import { Award, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { JOB_CATEGORIES } from '@/types/member';

export interface PositionOptionItem {
  value: string;
  labelTh: string;
  labelEn: string;
}

/**
 * รายการตำแหน่ง / กลุ่มวิชาชีพ พร้อมคำอธิบายภาษาไทยและภาษาอังกฤษ
 */
export const POSITION_CATEGORY_OPTIONS: PositionOptionItem[] = [
  {
    value: '1 RM',
    labelTh: '1 RM (แพทย์เวชศาสตร์การเจริญพันธุ์)',
    labelEn: '1 RM (Reproductive Medicine)',
  },
  {
    value: '2 Fellow RM',
    labelTh: '2 Fellow RM (แพทย์ประจำบ้านต่อยอด RM)',
    labelEn: '2 Fellow RM (Fellow in RM)',
  },
  {
    value: '3 Embryologist',
    labelTh: '3 Embryologist (นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน)',
    labelEn: '3 Embryologist (Embryologist)',
  },
  {
    value: '4 Technologist for Andrology',
    labelTh: '4 Technologist for Andrology (นักวิทยาศาสตร์ห้องปฏิบัติการน้ำอสุจิ)',
    labelEn: '4 Technologist for Andrology (Andrology Technologist)',
  },
  {
    value: '5 Molecular Geneticist',
    labelTh: '5 Molecular Geneticist (นักพันธุศาสตร์ระดับโมเลกุล)',
    labelEn: '5 Molecular Geneticist (Molecular Geneticist)',
  },
  {
    value: '6 Nurse',
    labelTh: '6 Nurse (พยาบาล)',
    labelEn: '6 Nurse (Nurse)',
  },
  {
    value: '0 อื่นๆ',
    labelTh: '0 อื่นๆ (โปรดระบุ)...',
    labelEn: '0 Other (Please specify)...',
  },
];

export interface PositionSelectProps {
  /** Selected position/job category value */
  value?: string;
  /** Callback when position changes */
  onChange: (value: string) => void;
  /** Custom text value when 'อื่นๆ' is selected */
  otherValue?: string;
  /** Callback when custom 'อื่นๆ' text changes */
  onOtherChange?: (otherValue: string) => void;
  /** Custom label. Default: 'ตำแหน่ง / กลุ่มวิชาชีพ' */
  label?: React.ReactNode;
  /** Whether to show the top label. Default: true */
  showLabel?: boolean;
  /** Whether the field is required (renders red asterisk). Default: false */
  required?: boolean;
  /** Whether to show left Award icon. Default: true */
  showIcon?: boolean;
  /** Custom left icon element */
  icon?: React.ReactNode;
  /** Name attribute for form submission */
  name?: string;
  /** ID attribute for the select */
  id?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Class name for outer wrapper */
  className?: string;
  /** Class name for select element */
  selectClassName?: string;
  /** Text for the placeholder/default option. Default: '-- เลือกตำแหน่ง --' */
  placeholder?: string;
  /** @deprecated Use placeholder instead */
  unspecifiedLabel?: string;
  /** Whether to automatically show the other text input when 'อื่นๆ' is selected. Default: true */
  showOtherInput?: boolean;
  /** Label for the other text input */
  otherLabel?: string;
  /** Placeholder for the other text input */
  otherPlaceholder?: string;
  /** Class name for the other text input */
  otherInputClassName?: string;
}

/**
 * Checks if a position value represents a Medical ART / Scientist role requiring referee endorsement
 * (ตำแหน่งนักวิทยาศาสตร์: 3 Embryologist, 4 Technologist for Andrology, 5 Molecular Geneticist)
 */
export function isScientistPosition(pos?: string | null): boolean {
  if (!pos) return false;
  const p = pos.trim().toLowerCase();
  return (
    p.startsWith('3') ||
    p.startsWith('4') ||
    p.startsWith('5') ||
    p.includes('embryo') ||
    p.includes('andrology') ||
    p.includes('geneticist') ||
    p.includes('technologist') ||
    p.includes('scientist') ||
    p.includes('นักวิทย์') ||
    p.includes('เพาะเลี้ยงตัวอ่อน') ||
    p.includes('น้ำอสุจิ')
  );
}

/**
 * Normalizes legacy position values into standard values
 */
export function normalizePosition(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed === 'ไม่ระบุ' || trimmed === '-- ไม่ระบุ --' || trimmed === 'Unspecified') return '';
  if (trimmed === '1' || trimmed === '1 RM' || trimmed === 'RM' || trimmed.startsWith('1 RM') || trimmed.startsWith('RM (')) return '1 RM';
  if (trimmed === '2' || trimmed === '2 Fellow RM' || trimmed === 'Fellow RM' || trimmed.startsWith('2 Fellow RM') || trimmed.startsWith('Fellow RM (')) return '2 Fellow RM';
  if (trimmed === '3' || trimmed === '3 Embryologist' || trimmed === 'Embryologist' || trimmed.startsWith('3 Embryologist') || trimmed.startsWith('Embryologist (')) return '3 Embryologist';
  if (trimmed === '4' || trimmed === '4 Technologist for Andrology' || trimmed === 'Technologist for Andrology' || trimmed.startsWith('4 Technologist') || trimmed.startsWith('Technologist for Andrology (')) return '4 Technologist for Andrology';
  if (trimmed === '5' || trimmed === '5 Molecular Geneticist' || trimmed === 'Molecular Geneticist' || trimmed.startsWith('5 Molecular') || trimmed.startsWith('Molecular Geneticist (')) return '5 Molecular Geneticist';
  if (trimmed === '6' || trimmed === '6 Nurse' || trimmed === 'Nurse' || trimmed.startsWith('6 Nurse') || trimmed.startsWith('Nurse (')) return '6 Nurse';
  if (trimmed === '0' || trimmed === '0 อื่นๆ' || trimmed === '0 Other' || trimmed === 'อื่นๆ' || trimmed === 'Other' || trimmed.startsWith('อื่นๆ') || trimmed.startsWith('0 อื่นๆ')) return '0 อื่นๆ';
  return trimmed;
}

export function PositionSelect({
  value = '',
  onChange,
  otherValue = '',
  onOtherChange,
  label,
  showLabel = true,
  required = false,
  showIcon = true,
  icon,
  name = 'position',
  id,
  disabled = false,
  className = '',
  selectClassName = '',
  placeholder,
  unspecifiedLabel,
  showOtherInput = true,
  otherLabel,
  otherPlaceholder,
  otherInputClassName = '',
}: PositionSelectProps) {
  const { lang } = useLanguage();

  const normalizedVal = normalizePosition(value);
  const isOther = normalizedVal === 'อื่นๆ';

  const defaultLabel = lang === 'th' ? 'ตำแหน่ง / กลุ่มวิชาชีพ' : 'Position / Professional Category';
  const defaultPlaceholder = placeholder || unspecifiedLabel || (lang === 'th' ? '-- เลือกตำแหน่ง --' : '-- Select Position --');
  const defaultOtherPlaceholder = otherPlaceholder || (lang === 'th' ? 'โปรดระบุตำแหน่งอื่นๆ...' : 'Please specify other position...');

  // Check if current normalized value is a custom value not in known options
  const isCustomOption = normalizedVal !== '' && !POSITION_CATEGORY_OPTIONS.some(o => o.value === normalizedVal);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <label
          htmlFor={id}
          className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"
        >
          <span>{label || defaultLabel}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        {showIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            {icon || <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </div>
        )}

        <select
          id={id}
          name={name}
          value={normalizedVal}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent transition appearance-none cursor-pointer bg-slate-50 text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed ${
            showIcon ? 'pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5' : 'px-3.5 pr-9 py-2 sm:py-2.5'
          } ${selectClassName}`}
        >
          <option value="">{defaultPlaceholder}</option>
          {POSITION_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {lang === 'th' ? opt.labelTh : opt.labelEn}
            </option>
          ))}
          {/* If the current value is a custom string already stored in DB, retain it as an option */}
          {isCustomOption && (
            <option value={normalizedVal}>
              {normalizedVal}
            </option>
          )}
        </select>

        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* When 'อื่นๆ' is selected, render input for custom specification */}
      {showOtherInput && isOther && onOtherChange && (
        <div className="pt-1.5 animate-fade-in space-y-1">
          {otherLabel && (
            <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
              {otherLabel}
            </label>
          )}
          <input
            type="text"
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder={defaultOtherPlaceholder}
            disabled={disabled}
            className={`w-full px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition ${otherInputClassName}`}
          />
        </div>
      )}
    </div>
  );
}
