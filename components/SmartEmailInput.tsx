'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mail, Sparkles, Check, AlertCircle, Info } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface SmartEmailInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  showLabel?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  onBlur?: () => void;
  helperText?: React.ReactNode;
  showHelperText?: boolean;
}

// โดเมนยอดนิยมมาตรฐาน
const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
];

// ตารางคำผิดยอดนิยมที่ระบุไว้ชัดเจน
const EXPLICIT_DOMAIN_TYPOS: Record<string, string> = {
  'gmali.com': 'gmail.com',
  'gmali': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gamil': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmial': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmailcom': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmial': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmailcom': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlock.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlookcom': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co.th': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoocom': 'yahoo.com',
  'iclould.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
};

/**
 * คำนวณ Levenshtein distance (ความต่างของตัวอักษร)
 */
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * ฟังก์ชันค้นหาโดเมนที่ใกล้เคียงที่สุดแบบ Fuzzy Matching
 */
function findClosestDomain(inputDomain: string): string | null {
  if (!inputDomain || inputDomain.length < 3) return null;
  const clean = inputDomain.trim().toLowerCase();

  // 1. ถ้าตรงกับโดเมนมาตรฐานเป๊ะอยู่แล้ว ไม่ใช่ typo
  if (COMMON_DOMAINS.includes(clean)) return null;

  // 2. ตรวจจากตาราง Explicit Typos
  if (EXPLICIT_DOMAIN_TYPOS[clean]) {
    return EXPLICIT_DOMAIN_TYPOS[clean];
  }

  // 3. ตรวจกรณีลืมใส่จุด เช่น gmailcom, hotmailcom
  for (const domain of COMMON_DOMAINS) {
    const withoutDot = domain.replace(/\./g, '');
    if (clean === withoutDot) {
      return domain;
    }
  }

  // 4. ตรวจด้วย Levenshtein Distance (อนุญาตให้ต่างได้ไม่เกิน 2 ตัวอักษร)
  let bestMatch: string | null = null;
  let minDistance = 999;

  for (const domain of COMMON_DOMAINS) {
    const dist = getLevenshteinDistance(clean, domain);
    const lengthDiff = Math.abs(clean.length - domain.length);
    if (dist <= 2 && lengthDiff <= 2 && dist < minDistance) {
      minDistance = dist;
      bestMatch = domain;
    }
  }

  return bestMatch;
}

export function SmartEmailInput({
  value = '',
  onChange,
  label,
  showLabel = true,
  required = false,
  placeholder,
  id = 'email',
  name = 'email',
  disabled = false,
  className = '',
  inputClassName = '',
  autoComplete = 'email',
  onBlur,
  helperText,
  showHelperText = true,
}: SmartEmailInputProps) {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultLabel = lang === 'th' ? 'อีเมล' : 'Email Address';
  const defaultPlaceholder = placeholder || (lang === 'th' ? 'เช่น yourname@gmail.com หรือ hotmail' : 'e.g. yourname@gmail.com');

  // ตรวจจับชื่อผู้ใช้และโดเมนปัจจุบัน
  const { prefix, domainQuery, hasAt } = useMemo(() => {
    const val = value || '';
    const atIndex = val.indexOf('@');
    if (atIndex === -1) {
      return { prefix: val, domainQuery: '', hasAt: false };
    }
    return {
      prefix: val.substring(0, atIndex),
      domainQuery: val.substring(atIndex + 1).toLowerCase(),
      hasAt: true,
    };
  }, [value]);

  // ตรวจจับ Typo Suggestion ด้วย Smart Fuzzy Match
  const typoCorrection = useMemo(() => {
    if (!hasAt || !prefix || !domainQuery) return null;
    const closest = findClosestDomain(domainQuery);
    if (closest && closest !== domainQuery) {
      return `${prefix}@${closest}`;
    }
    return null;
  }, [hasAt, prefix, domainQuery]);

  // รายการโดเมนแนะนำตามตัวอักษรที่พิมพ์หลัง @
  const filteredSuggestions = useMemo(() => {
    if (!hasAt || !prefix) return [];
    if (!domainQuery) {
      return COMMON_DOMAINS.map(d => `${prefix}@${d}`);
    }
    const matches = COMMON_DOMAINS
      .filter(d => d.startsWith(domainQuery) && d !== domainQuery)
      .map(d => `${prefix}@${d}`);

    // ถ้าไม่มี prefix match แต่ตรวจพบ typo ให้แสดงโดเมนที่แก้แล้วขึ้นมาเป็นอันดับแรก
    if (matches.length === 0 && typoCorrection) {
      return [typoCorrection];
    }
    return matches;
  }, [hasAt, prefix, domainQuery, typoCorrection]);

  // ซ่อน dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\s+/g, '');
    onChange(rawVal.toLowerCase());
    setSelectedIndex(0);
    setIsOpen(true);
  };

  const handleSelectSuggestion = (suggestedEmail: string) => {
    onChange(suggestedEmail);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleInputBlur = () => {
    if (onBlur) onBlur();
  };

  return (
    <div ref={containerRef} className={`space-y-1 relative ${className}`}>
      {showLabel && (
        <label
          htmlFor={id}
          className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
        >
          <span className="flex items-center gap-1">
            {label || defaultLabel}
            {required && <span className="text-rose-500 font-bold">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            {lang === 'th' ? 'รองรับทุกโดเมน (Gmail, Hotmail, Outlook ฯลฯ)' : 'Supports all email providers'}
          </span>
        </label>
      )}

      <div className="relative">
        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
        <input
          ref={inputRef}
          type="email"
          id={id}
          name={name}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={defaultPlaceholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 focus:outline-none transition ${inputClassName}`}
        />
      </div>

      {/* Suggestion Dropdown เมื่อพิมพ์ @ */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-fade-in divide-y divide-slate-100 max-h-56 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === 'th' ? 'เลือกโดเมนด่วน' : 'Quick Domain Select'}</span>
            <span className="text-[9px] text-slate-400 font-normal">{lang === 'th' ? 'กด Tab หรือ Enter' : 'Tab/Enter to pick'}</span>
          </div>
          {filteredSuggestions.slice(0, 6).map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(item);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs transition flex items-center justify-between cursor-pointer ${
                  isSelected ? 'bg-blue-50 text-[#0026b3] font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-900">{prefix}</span>
                  <span className="text-[#0026b3] font-bold">@{item.split('@')[1]}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Typo Correction Banner (ตรวจจับคำผิด เช่น gmali.com, hotmial.com ฯลฯ) */}
      {typoCorrection && typoCorrection !== value && (
        <div className="mt-1.5 p-2 sm:p-2.5 bg-amber-50 border border-amber-300/90 rounded-xl text-[11px] sm:text-xs text-amber-900 flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              {lang === 'th' ? 'คุณหมายถึง ' : 'Did you mean '}
              <strong className="font-extrabold underline text-amber-950">{typoCorrection}</strong>
              {lang === 'th' ? ' หรือไม่?' : '?'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectSuggestion(typoCorrection)}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10.5px] sm:text-xs font-bold rounded-lg shadow-xs transition shrink-0 cursor-pointer active:scale-95"
          >
            {lang === 'th' ? 'แก้ไขเป็นอันนี้' : 'Apply'}
          </button>
        </div>
      )}

      {/* Guidance Helper Note */}
      {showHelperText && (
        <div className="flex items-start gap-1.5 pt-1 text-[10px] sm:text-[11px] text-slate-500 leading-normal">
          <Info className="w-3.5 h-3.5 text-[#0026b3] shrink-0 mt-0.5" />
          <span>
            {helperText || (lang === 'th'
              ? 'กรุณากรอกอีเมลที่มีอยู่จริง'
              : 'Please provide a valid email address.')}
          </span>
        </div>
      )}
    </div>
  );
}
