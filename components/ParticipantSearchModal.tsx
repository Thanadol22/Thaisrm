'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  User,
  Building2,
  Briefcase,
  CalendarCheck2,
  IdCard,
  AlertCircle,
  AlertTriangle,
  Database,
  Mail,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface FieldData {
  text: string | null;
  status: 'HAS_DATA' | 'EMPTY' | 'ERROR';
  errorDetail?: string;
}

export interface MemberRecord {
  id: string;
  memberId: string; // เลขสมาชิก 4 หลัก เช่น 0001
  nameTh: FieldData | string;
  nameEn: FieldData | string;
  email: FieldData | string;
  workplace: FieldData | string;
  position: FieldData | string;
  lastAttendedMeeting: FieldData | string;
  memberType: FieldData | string;
  membershipStatus?: FieldData | string;
  memberStatus?: FieldData | string;
}

/**
 * แปลงข้อมูลฟิลด์ให้อยู่ในรูป FieldData เสมอ
 */
function normalizeField(raw: FieldData | string | null | undefined): FieldData {
  if (!raw) {
    return { text: null, status: 'EMPTY' };
  }
  if (typeof raw === 'object' && 'status' in raw) {
    return raw;
  }
  const str = String(raw).trim();
  if (str === '' || str === '-' || str.toLowerCase() === 'null') {
    return { text: null, status: 'EMPTY' };
  }
  return { text: str, status: 'HAS_DATA' };
}

interface ParticipantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_DISPLAY_COUNT = 2;

export function ParticipantSearchModal({ isOpen, onClose }: ParticipantSearchModalProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, MemberRecord[]>>(new Map());

  // Focus input and lock scroll on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
    } else {
      document.body.style.overflow = 'unset';
      setSearchTerm('');
      setDebouncedQuery('');
      setMembers([]);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      setHasSearched(false);
      setSearchError(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounce search input (150ms delay for ultra-fast response, with instant cache check)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      setMembers([]);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      setIsLoading(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    // If query is already in client cache, show immediately without waiting
    const cached = searchCacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      setMembers(cached);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      setIsLoading(false);
      setHasSearched(true);
      setSearchError(null);
      setDebouncedQuery(trimmed);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search results from API
  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    const cacheKey = debouncedQuery.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      setMembers(searchCacheRef.current.get(cacheKey) || []);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      setIsLoading(false);
      setHasSearched(true);
      return;
    }

    const controller = new AbortController();
    const fetchMembers = async () => {
      setIsLoading(true);
      setSearchError(null);
      setDisplayLimit(INITIAL_DISPLAY_COUNT);

      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          const list = json.data || [];
          searchCacheRef.current.set(cacheKey, list);
          setMembers(list);
          setDisplayLimit(INITIAL_DISPLAY_COUNT);
          setHasSearched(true);
        } else {
          setSearchError(json?.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์' : 'Failed to fetch member data'));
          setMembers([]);
          setDisplayLimit(INITIAL_DISPLAY_COUNT);
          setHasSearched(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Member search fetch error:', err);
        setSearchError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' : 'Connection error');
        setMembers([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, lang]);

  if (!isOpen) return null;

  /**
   * เรนเดอร์ฟิลด์ข้อมูลตามเงื่อนไข:
   * 1. ในช่องเป็นค่าว่าง -> แสดง "ไม่มีข้อมูล"
   * 2. ในช่องมีข้อมูลแต่ไม่สามารถแสดงได้ หรือเกิด error -> แจ้ง error
   * 3. ในช่องมีข้อมูลปกติ -> แสดงข้อมูลตามที่ออกแบบไว้
   */
  const renderField = (
    rawField: FieldData | string | null | undefined,
    renderValue: (text: string) => React.ReactNode,
    options?: { fallbackText?: string }
  ) => {
    const field = normalizeField(rawField);
    const fallback = options?.fallbackText ?? (lang === 'th' ? 'ไม่มีข้อมูล' : 'No data');

    // กรณีเกิดข้อผิดพลาดในการอ่าน/แปลงข้อมูล
    if (field.status === 'ERROR') {
      return (
        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-xs font-bold">
          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
          <span>{lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error'}</span>
        </span>
      );
    }

    // กรณีในช่องเป็นค่าว่าง
    if (field.status === 'EMPTY' || !field.text) {
      return (
        <span className="text-slate-400 italic text-xs font-normal">
          {fallback}
        </span>
      );
    }

    // กรณีในช่องมีข้อมูล: พยายามแสดงผล หากเรนเดอร์ไม่สำเร็จให้แจ้ง error
    try {
      return renderValue(field.text);
    } catch (err) {
      console.error('Render field error:', err);
      return (
        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-xs font-bold">
          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
          <span>{lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error'}</span>
        </span>
      );
    }
  };

  /**
   * เรนเดอร์ Badge สถานะสมาชิก (Active / Inactive / Pending)
   */
  const renderStatusBadge = (rawStatus: FieldData | string | null | undefined) => {
    const field = normalizeField(rawStatus);
    const statusText = (field.text || 'Active').trim();
    const isLower = statusText.toLowerCase();

    const isActive =
      isLower === 'active' ||
      isLower === 'ปกติ' ||
      isLower === 'สมบูรณ์' ||
      isLower === 'valid' ||
      isLower === 'current';

    const isPending =
      isLower === 'pending' ||
      isLower === 'รออนุมัติ' ||
      isLower === 'รอตรวจสอบ';

    const isInactive =
      isLower === 'inactive' ||
      isLower === 'expired' ||
      isLower === 'หมดอายุ' ||
      isLower === 'suspended';

    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
          <span>{lang === 'th' ? 'ปกติ' : 'Active'}</span>
        </span>
      );
    }

    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/90 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>{lang === 'th' ? 'รอตรวจสอบ' : 'Pending'}</span>
        </span>
      );
    }

    if (isInactive) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/90 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{lang === 'th' ? 'หมดอายุ' : 'Expired'}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
        <ShieldCheck className="w-3 h-3 text-[#0026b3] shrink-0" />
        <span>{statusText}</span>
      </span>
    );
  };

  /**
   * เรนเดอร์การ์ดข้อมูลสมาชิก
   */
  const renderMemberCard = (member: MemberRecord) => {
    return (
      <div
        key={member.id}
        className="bg-white hover:bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
      >
        {/* Header Row: Name TH/EN & Member ID 4 digits */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            {/* Thai Name */}
            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words">
              {renderField(member.nameTh, (text) => text, {
                fallbackText: lang === 'th' ? 'ไม่มีข้อมูลชื่อ' : 'No name data',
              })}
            </h3>
            {/* English Name */}
            <p className="text-xs font-semibold text-slate-500 mt-0.5 break-words">
              {renderField(member.nameEn, (text) => text, {
                fallbackText: lang === 'th' ? 'ไม่มีข้อมูล' : 'No data',
              })}
            </p>
          </div>

          {/* Member ID Badge (4 digits e.g. 0001) - Accent Color */}
          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1.5 bg-[#4ade80]/15 border border-[#4ade80]/60 text-emerald-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl shadow-2xs">
              <IdCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="text-left leading-none">
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 block">
                  {lang === 'th' ? 'เลขสมาชิก' : 'Member ID'}
                </span>
                <span className="text-xs sm:text-sm font-black tracking-wider font-mono text-emerald-950">
                  {member.memberId || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] sm:text-xs">
          {/* Workplace (ที่ทำงาน) */}
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            {renderField(member.workplace, (text) => (
              <span className="font-semibold text-slate-900 truncate">
                {text}
              </span>
            ))}
          </div>

          {/* Email (อีเมล) */}
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            {renderField(member.email, (text) => (
              <a
                href={`mailto:${text}`}
                className="font-medium text-[#0026b3] hover:underline truncate"
              >
                {text}
              </a>
            ))}
          </div>

          {/* Position (ตำแหน่ง) */}
          <div className="flex items-center gap-2 text-slate-700">
            <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {renderField(member.position, (text) => (
              <span className="font-medium text-slate-800 truncate">
                {text}
              </span>
            ))}
          </div>

          {/* Membership Status (สถานะสมาชิก) */}
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 shrink-0">
                {lang === 'th' ? 'สถานะสมาชิก:' : 'Member Status:'}
              </span>
              {renderStatusBadge(member.membershipStatus || member.memberStatus)}
            </div>
          </div>

          {/* Last Attended Meeting (การเข้าประชุมล่าสุด) */}
          <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60 mt-1">
            <CalendarCheck2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 shrink-0">
                {lang === 'th' ? 'การเข้าประชุมล่าสุด:' : 'Last Meeting:'}
              </span>
              {renderField(member.lastAttendedMeeting, (text) => (
                <span className="text-[11px] sm:text-xs font-bold text-emerald-800 truncate">
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-start sm:justify-center items-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="bg-white w-full max-w-xl h-full sm:h-auto sm:max-h-[88vh] flex flex-col rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 overflow-hidden transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Fixed at top, never covered by keyboard) */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#002099] to-[#001c8c] text-white p-4 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5 pr-10">
            <div className="p-2 sm:p-2.5 bg-white/15 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-inner shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black tracking-tight truncate">
                {lang === 'th' ? 'ค้นหาข้อมูลสมาชิก TSRM' : 'Search TSRM Members'}
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium truncate">
                {lang === 'th'
                  ? 'ค้นหาด้วยชื่อ-นามสกุล'
                  : 'Search by full name'}
              </p>
            </div>
          </div>

          {/* Search Input Box (Font size 16px on mobile prevents iOS Safari auto-zoom) */}
          <div className="mt-3 sm:mt-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                lang === 'th'
                  ? 'พิมพ์ชื่อ หรือ นามสกุล'
                  : 'Type first name or last name'
              }
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white text-slate-900 rounded-xl sm:rounded-2xl border-0 shadow-inner text-base sm:text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#4ade80] focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedQuery('');
                  setMembers([]);
                  setDisplayLimit(INITIAL_DISPLAY_COUNT);
                  setHasSearched(false);
                  setSearchError(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Counter Bar (Fixed under header) */}
        <div className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#0026b3]" />
            {lang === 'th' ? 'รายชื่อสมาชิกในระบบ' : 'Member Directory'}
          </span>

          {isLoading ? (
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              {lang === 'th' ? 'กำลังค้นหา...' : 'Searching...'}
            </span>
          ) : hasSearched ? (
            <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {lang === 'th'
                ? `พบ ${members.length} รายการ`
                : `${members.length} results`}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">
              {lang === 'th' ? 'พร้อมค้นหา' : 'Ready'}
            </span>
          )}
        </div>

        {/* Members Results List (Scrollable Area) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3">
          {/* 1. Loading State */}
          {isLoading && (
            <div className="text-center py-10 sm:py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0026b3] flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-[#0026b3]" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {lang === 'th' ? 'กำลังค้นหาข้อมูลจากฐานข้อมูล...' : 'Searching member directory...'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'th' ? 'กรุณารอสักครู่' : 'Please wait a moment'}
              </p>
            </div>
          )}

          {/* 2. Initial State */}
          {!isLoading && !hasSearched && (
            <div className="text-center py-10 sm:py-12 px-4 space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#0026b3] flex items-center justify-center mx-auto border border-blue-100">
                <Search className="w-6 h-6 sm:w-7 sm:h-7 text-[#0026b3]" />
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                {lang === 'th' ? 'พิมพ์ชื่อหรือนามสกุลเพื่อค้นหาสมาชิก' : 'Type name or surname to search'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {lang === 'th'
                  ? 'ระบบจะค้นหาและแสดงรายการผลลัพธ์ที่ตรงกับคำค้นหา'
                  : 'Automatically searches and displays results matching your query'}
              </p>
            </div>
          )}

          {/* 3. Search Error State */}
          {!isLoading && searchError && (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 border border-rose-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-rose-800">{searchError}</h4>
            </div>
          )}

          {/* 4. Results List: แสดงรายการที่ค้นพบ (เริ่มต้น 2 รายการ และสามารถกดแสดงเพิ่มเติมได้) */}
          {!isLoading && hasSearched && members.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                {members.slice(0, displayLimit).map((member) => renderMemberCard(member))}
              </div>

              {/* ปุ่มแสดงเพิ่มเติม / แสดงน้อยลง */}
              {members.length > displayLimit ? (
                <button
                  type="button"
                  onClick={() => setDisplayLimit(members.length)}
                  className="w-full py-2.5 px-4 bg-blue-50/80 hover:bg-blue-100 text-[#0026b3] border border-blue-200/80 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-2xs hover:shadow-xs group cursor-pointer"
                >
                  <span>
                    {lang === 'th'
                      ? `แสดงเพิ่มเติม (อีก ${members.length - displayLimit} รายการ)`
                      : `Show More (${members.length - displayLimit} more)`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-blue-600 group-hover:translate-y-0.5 transition-transform" />
                </button>
              ) : members.length > INITIAL_DISPLAY_COUNT ? (
                <button
                  type="button"
                  onClick={() => setDisplayLimit(INITIAL_DISPLAY_COUNT)}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>{lang === 'th' ? 'แสดงน้อยลง' : 'Show Less'}</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ) : null}
            </div>
          )}

          {/* 5. No Results Found */}
          {!isLoading && hasSearched && members.length === 0 && !searchError && (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                {lang === 'th' ? 'ไม่พบข้อมูลสมาชิกที่ค้นหา' : 'No Members Found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {lang === 'th'
                  ? `ไม่พบข้อมูลสมาชิกสำหรับ "${debouncedQuery}" กรุณาตรวจสอบการสะกดชื่อ-นามสกุล`
                  : `No members found matching "${debouncedQuery}". Please check spelling.`}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer (Pinned at bottom with safe-area padding for mobile) */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-500 text-[11px] min-w-0">
            <Database className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
            <span className="font-semibold truncate">
              {lang === 'th' ? 'ฐานข้อมูลสมาชิก TSRM' : 'TSRM Member Database'}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition text-xs cursor-pointer active:scale-95 shrink-0"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
