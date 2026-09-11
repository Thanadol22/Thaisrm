'use client';

import React, { useState, useEffect, useRef } from 'react';
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

export function ParticipantSearchModal({ isOpen, onClose }: ParticipantSearchModalProps) {
  const { lang } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and lock scroll on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSearchTerm('');
      setDebouncedQuery('');
      setMembers([]);
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

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search results from API (จำกัดสูงสุด 3 รายการจาก API)
  useEffect(() => {
    if (!debouncedQuery) {
      setMembers([]);
      setIsLoading(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const fetchMembers = async () => {
      setIsLoading(true);
      setSearchError(null);

      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          setMembers(json.data || []);
          setHasSearched(true);
        } else {
          setSearchError(json?.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์' : 'Failed to fetch member data'));
          setMembers([]);
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
          <span>{lang === 'th' ? 'ปกติ (Active)' : 'Active'}</span>
        </span>
      );
    }

    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/90 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>{lang === 'th' ? 'รอตรวจสอบ (Pending)' : 'Pending'}</span>
        </span>
      );
    }

    if (isInactive) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/90 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{lang === 'th' ? 'หมดอายุ (Expired)' : 'Expired'}</span>
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
        className="bg-white hover:bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
      >
        {/* Header Row: Name TH/EN & Member ID 4 digits */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Thai Name */}
            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
              {renderField(member.nameTh, (text) => text, {
                fallbackText: lang === 'th' ? 'ไม่มีข้อมูลชื่อ' : 'No name data',
              })}
            </h3>
            {/* English Name */}
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {renderField(member.nameEn, (text) => text, {
                fallbackText: lang === 'th' ? 'ไม่มีข้อมูล' : 'No data',
              })}
            </p>
          </div>

          {/* Member ID Badge (4 digits e.g. 0001) - Accent Color */}
          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1.5 bg-[#4ade80]/15 border border-[#4ade80]/60 text-emerald-950 px-2.5 py-1 rounded-xl shadow-2xs">
              <IdCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="text-left leading-none">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 block">
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
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
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
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                {lang === 'th' ? 'สถานะสมาชิก:' : 'Member Status:'}
              </span>
              {renderStatusBadge(member.membershipStatus || member.memberStatus)}
            </div>
          </div>

          {/* Last Attended Meeting (การเข้าประชุมล่าสุด) */}
          <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60 mt-1">
            <CalendarCheck2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                {lang === 'th' ? 'การเข้าประชุมล่าสุด:' : 'Last Meeting:'}
              </span>
              {renderField(member.lastAttendedMeeting, (text) => (
                <span className="text-xs font-bold text-emerald-800 truncate">
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#002099] to-[#001c8c] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner">
              <Search className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {lang === 'th' ? 'ค้นหาข้อมูลสมาชิก TSRM' : 'Search TSRM Members'}
              </h2>
              <p className="text-xs text-blue-200/90 font-medium">
                {lang === 'th'
                  ? 'ค้นหาด้วยชื่อ-นามสกุล'
                  : 'Search by full name'}
              </p>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                lang === 'th'
                  ? 'พิมพ์ชื่อ-นามสกุล เช่น กรกนก, สมชาย'
                  : 'Type full name e.g. Kornkanok, Somchai'
              }
              className="w-full pl-10 pr-10 py-3 bg-white text-slate-900 rounded-2xl border-0 shadow-inner text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-[#4ade80] focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedQuery('');
                  setMembers([]);
                  setHasSearched(false);
                  setSearchError(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Counter Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
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

        {/* Members Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* 1. Loading State */}
          {isLoading && (
            <div className="text-center py-12 px-4 space-y-3">
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
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0026b3] flex items-center justify-center mx-auto border border-blue-100">
                <Search className="w-7 h-7 text-[#0026b3]" />
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                {lang === 'th' ? 'พิมพ์ชื่อหรือนามสกุลเพื่อค้นหาสมาชิก' : 'Type name or surname to search'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {lang === 'th'
                  ? 'ระบบจะค้นหาและแสดงรายการผลลัพธ์สูงสุด 3 รายการ'
                  : 'Automatically searches and displays up to 3 results'}
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

          {/* 4. Results List: แสดงรายการที่ค้นพบ (สูงสุด 3 รายการ) */}
          {!isLoading && hasSearched && members.length > 0 && (
            <div className="space-y-2.5">
              {members.map((member) => renderMemberCard(member))}
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

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Database className="w-3.5 h-3.5 text-[#0026b3]" />
            <span className="font-semibold">
              {lang === 'th' ? 'ฐานข้อมูลสมาชิก TSRM' : 'TSRM Member Database'}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition text-xs cursor-pointer active:scale-95"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
