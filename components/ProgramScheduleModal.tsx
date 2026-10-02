'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { CalendarDays, ChevronLeft, ChevronRight, Expand, ExternalLink, Ticket, X } from 'lucide-react';
import HomeSection from '@/components/ui/home-section';
import { formatProgramDate, programKindLabel, type ProgramImage } from '@/lib/programSchedule';
import { useLanguage } from '@/context/LanguageContext';

interface ProgramScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingName?: string | null;
  /** รูปตารางกิจกรรมของการประชุม (เรียงตามวันแล้ว) */
  images: ProgramImage[];
  /** ปิดหน้าต่างแล้วพาไปที่ฟอร์มลงทะเบียน */
  onRegister: () => void;
}

/**
 * หน้าต่างตารางกิจกรรม: แสดงรูปโปรแกรมแต่ละวันเป็นการ์ดซ้อน
 * เลือกได้ทั้งจากปุ่มวันที่ ปุ่มก่อนหน้า/ถัดไป การปัด หรือแตะการ์ด และแตะการ์ดกลางเพื่อดูภาพเต็ม
 */
export function ProgramScheduleModal({ isOpen, onClose, meetingName, images, onRegister }: ProgramScheduleModalProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = images.length;
  const safeIndex = Math.min(activeIndex, Math.max(0, total - 1));
  const active = images[safeIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewerOpen) setViewerOpen(false);
        else onClose();
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((i) => Math.min(total - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, viewerOpen, onClose, total]);

  if (!isOpen || !mounted || !active) return null;

  const cardLabel = (idx: number) => {
    const p = images[idx];
    return `${formatProgramDate(p.date, lang)} ${programKindLabel(p, lang)} ${p.topic}`;
  };

  const handleCardClick = (idx: number) => {
    if (idx === safeIndex) setViewerOpen(true);
    else setActiveIndex(idx);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    setActiveIndex((i) => (delta < 0 ? Math.min(total - 1, i + 1) : Math.max(0, i - 1)));
  };

  const navButtonClass =
    'flex items-center justify-center gap-1.5 min-h-[52px] px-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-base sm:text-lg font-bold transition cursor-pointer active:scale-95 hover:border-[#0026b3] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-stretch sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-schedule-title"
    >
      <div
        className="relative w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[94vh] overflow-y-auto bg-[#f6f8fc] sm:rounded-[32px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* หัวหน้าต่าง */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-4 sm:px-7 py-4 rounded-b-[24px] sm:rounded-b-[28px] shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="program-schedule-title" className="text-xl sm:text-2xl font-black leading-tight">
                {lang === 'th' ? 'ตารางกิจกรรม' : 'Program Schedule'}
              </h2>
              {meetingName && <p className="text-[15px] sm:text-base text-blue-100 mt-0.5 truncate">{meetingName}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3.5 min-h-[48px] rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-base font-bold cursor-pointer active:scale-95 shrink-0"
            >
              <X className="w-5 h-5" />
              <span>{lang === 'th' ? 'ปิด' : 'Close'}</span>
            </button>
          </div>

          {/* เลือกวัน/รายการ */}
          <div className="mt-3 -mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {images.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-pressed={idx === safeIndex}
                className={`shrink-0 text-left px-3.5 py-2 rounded-2xl border-2 transition cursor-pointer active:scale-95 ${
                  idx === safeIndex
                    ? 'bg-[#4ade80] border-[#4ade80] text-slate-950'
                    : 'bg-white/10 border-white/25 text-white hover:bg-white/20'
                }`}
              >
                <span className="block text-[15px] font-black leading-tight">{formatProgramDate(p.date, lang)}</span>
                <span className={`block text-sm font-semibold leading-tight ${idx === safeIndex ? 'text-slate-800' : 'text-blue-100'}`}>
                  {programKindLabel(p, lang)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-7 pt-4 pb-4 space-y-4">
          <p className="text-center text-[15px] sm:text-base text-slate-600">
            {lang === 'th'
              ? 'แตะภาพตรงกลางเพื่อดูขนาดใหญ่ หรือปัดซ้าย-ขวาเพื่อดูวันอื่น'
              : 'Tap the middle image to enlarge, or swipe left and right for other days'}
          </p>

          <div
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={handleTouchEnd}
          >
            <HomeSection
              cards={images.map((p, idx) => ({ src: p.src, alt: cardLabel(idx) }))}
              activeIndex={safeIndex}
              onCardClick={handleCardClick}
              getCardLabel={cardLabel}
            />
          </div>

          {/* รายละเอียดรายการที่เลือก */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center space-y-1" aria-live="polite">
            <p className="flex items-center justify-center gap-2 text-lg sm:text-xl font-black text-slate-900">
              <CalendarDays className="w-5 h-5 text-[#0026b3] shrink-0" />
              {formatProgramDate(active.date, lang)}
            </p>
            <p className="text-base sm:text-lg text-slate-700">
              <span className="font-bold text-[#0026b3]">{programKindLabel(active, lang)}</span>
              {active.kind === 'workshop' && <span> · {active.topic}</span>}
            </p>
            <p className="text-sm text-slate-500">
              {lang === 'th' ? `ภาพที่ ${safeIndex + 1} จาก ${total}` : `Image ${safeIndex + 1} of ${total}`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={safeIndex === 0}
              className={navButtonClass}
            >
              <ChevronLeft className="w-6 h-6 shrink-0" />
              <span>{lang === 'th' ? 'ก่อนหน้า' : 'Previous'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => Math.min(total - 1, i + 1))}
              disabled={safeIndex === total - 1}
              className={navButtonClass}
            >
              <span>{lang === 'th' ? 'ถัดไป' : 'Next'}</span>
              <ChevronRight className="w-6 h-6 shrink-0" />
            </button>
          </div>

        </div>

        {/* ปุ่มหลักติดด้านล่าง มองเห็นตลอดโดยไม่ต้องเลื่อนหา */}
        <div className="sticky bottom-0 z-20 bg-[#f6f8fc]/95 backdrop-blur-sm border-t border-slate-200 px-4 sm:px-7 py-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="flex items-center justify-center gap-2 min-h-[56px] px-3 rounded-2xl bg-[#0026b3] hover:bg-[#001f94] text-white text-lg font-black shadow-md transition cursor-pointer active:scale-95"
            >
              <Expand className="w-5 h-5 shrink-0" />
              <span>{lang === 'th' ? 'ดูภาพเต็ม' : 'Full Size'}</span>
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="flex items-center justify-center gap-2 min-h-[56px] px-3 rounded-2xl bg-[#4ade80] hover:bg-[#3fcf73] text-slate-950 text-lg font-black shadow-md transition cursor-pointer active:scale-95"
            >
              <Ticket className="w-5 h-5 shrink-0" />
              <span>{lang === 'th' ? 'ลงทะเบียนเลย' : 'Register Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ดูภาพขนาดเต็ม เลื่อนอ่านได้ */}
      {viewerOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col bg-slate-950 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setViewerOpen(false);
          }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="text-base sm:text-lg font-bold truncate">
              {formatProgramDate(active.date, lang)} · {programKindLabel(active, lang)}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={active.src}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3.5 min-h-[48px] rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-base font-bold"
              >
                <ExternalLink className="w-5 h-5" />
                <span>{lang === 'th' ? 'เปิดในแท็บใหม่' : 'Open in new tab'}</span>
              </a>
              <button
                type="button"
                onClick={() => setViewerOpen(false)}
                className="flex items-center gap-1 px-3.5 min-h-[48px] rounded-xl bg-white text-slate-900 text-base font-black cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
                <span>{lang === 'th' ? 'ปิดภาพ' : 'Close'}</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-6" onClick={(e) => e.stopPropagation()}>
            <Image
              src={active.src}
              alt={cardLabel(safeIndex)}
              width={1240}
              height={1754}
              sizes="(max-width: 900px) 100vw, 900px"
              className="w-full max-w-[900px] h-auto mx-auto rounded-lg bg-white"
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
