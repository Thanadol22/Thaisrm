'use client';

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { CalendarDays, ChevronDown, Clock, ListChecks, MapPin } from 'lucide-react';
import SmoothScrollHero from '@/components/ui/smooth-scroll-hero';
import { useLanguage } from '@/context/LanguageContext';

// ลิงก์แผนที่สถานที่จัดงาน (ตารางการประชุมยังไม่มีคอลัมน์เก็บลิงก์แผนที่)
const VENUE_MAP_URL = 'https://maps.app.goo.gl/YJ9rfN7ofhx2NKDP6';

interface LoginHeroProps {
  meetingName?: string | null;
  description?: string | null;
  location?: string | null;
  dateText?: string | null;
  timeText?: string | null;
  onViewActivities: () => void;
  onScrollToForm: () => void;
}

/**
 * แยกชื่อการประชุมเพื่อแสดงผล เช่น "34th TSRM2026 V.2"
 * → ลำดับ "34" + ตัวยก "th", ชื่อ "TSRM 2026" และรุ่น "V.2"
 */
function parseMeetingTitle(name: string) {
  const ordinalMatch = /^(\d+)(st|nd|rd|th)\s*(.*)$/i.exec(name.trim());
  const number = ordinalMatch?.[1] ?? null;
  const suffix = ordinalMatch?.[2] ?? null;
  let rest = (ordinalMatch ? ordinalMatch[3] : name).replace(/([A-Za-z])(\d{4})/g, '$1 $2').replace(/\s+/g, ' ').trim();
  let version: string | null = null;
  const versionMatch = /\s+(v\.?\s?\d+(?:\.\d+)?)$/i.exec(rest);
  if (versionMatch) {
    version = versionMatch[1].replace(/^v/, 'V');
    rest = rest.slice(0, versionMatch.index);
  }
  return { number, suffix, rest, version };
}

export function LoginHero({ meetingName, description, location, dateText, timeText, onViewActivities, onScrollToForm }: LoginHeroProps) {
  const { lang } = useLanguage();
  const reduceMotion = useReducedMotion();
  const title = meetingName ? parseMeetingTitle(meetingName) : null;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <SmoothScrollHero
      imageSrc="/location.jpg"
      imageAlt={lang === 'th' ? 'สถานที่จัดงานประชุม' : 'Conference venue'}
      scrollHeight={700}
      maxZoom={1.35}
    >
      <div className="h-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-40 lg:pt-28 pb-28 sm:pb-32 flex flex-col justify-end">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
          {title && (
            <motion.h1
              variants={item}
              initial="hidden"
              animate="show"
              className="font-black text-white tracking-tight leading-[0.95] text-[2.6rem] sm:text-7xl lg:text-8xl [text-shadow:0_4px_24px_rgba(0,0,0,0.55)]"
            >
              {title.number && (
                <>
                  <span className="relative inline-block pr-[0.4em]">
                    {title.number}
                    <motion.span
                      aria-hidden="true"
                      className="absolute right-0 top-[0.08em] text-[0.36em] font-extrabold text-[#4ade80]"
                      animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {title.suffix}
                    </motion.span>
                    <span className="sr-only">{title.suffix}</span>
                  </span>{' '}
                </>
              )}
              {title.rest}
              {title.version && (
                <>
                  {' '}
                  <span className="text-blue-200/90">{title.version}</span>
                </>
              )}
            </motion.h1>
          )}

          <motion.p
            variants={item}
            className="text-lg sm:text-2xl font-semibold text-white max-w-2xl leading-snug line-clamp-3 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]"
          >
            {description ? (
              description
            ) : lang === 'th' ? (
              <>
                <span className="block sm:inline">งานประชุมวิชาการ </span>
                <span className="block sm:inline">สมาคมเวชศาสตร์การเจริญพันธุ์ไทย</span>
              </>
            ) : (
              'Scientific Meeting of the Thai Society for Reproductive Medicine'
            )}
          </motion.p>

          {(dateText || timeText || location) && (
            <motion.ul
              variants={item}
              initial="hidden"
              animate="show"
              className="space-y-1.5 text-base sm:text-lg text-blue-50 font-medium max-w-2xl [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
            >
              {dateText && (
                <li className="flex items-start gap-2">
                  <CalendarDays className="w-5 h-5 mt-0.5 text-[#4ade80] shrink-0" />
                  <span>
                    <span className="sr-only">{lang === 'th' ? 'วันที่จัดงาน ' : 'Date '}</span>
                    {dateText}
                  </span>
                </li>
              )}
              {timeText && (
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 mt-0.5 text-[#4ade80] shrink-0" />
                  <span>
                    <span className="sr-only">{lang === 'th' ? 'เวลา ' : 'Time '}</span>
                    {timeText}
                  </span>
                </li>
              )}
              {location && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 mt-0.5 text-[#4ade80] shrink-0" />
                  <span>
                    <span className="sr-only">{lang === 'th' ? 'สถานที่จัดงาน ' : 'Venue '}</span>
                    {location}
                  </span>
                </li>
              )}
            </motion.ul>
          )}

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
            <button
              type="button"
              onClick={onViewActivities}
              className="inline-flex items-center justify-center gap-2 bg-[#4ade80] hover:bg-[#3fcf73] text-slate-950 font-black text-lg w-full sm:w-auto px-6 sm:px-7 py-3 rounded-2xl shadow-lg shadow-emerald-950/30 transition active:scale-95 cursor-pointer min-h-[54px]"
            >
              <ListChecks className="w-5 h-5 shrink-0" />
              <span>{lang === 'th' ? 'ดูรายการกิจกรรม' : 'View Activities'}</span>
            </button>
            <a
              href={VENUE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-lg w-full sm:w-auto px-6 sm:px-7 py-3 rounded-2xl border border-white/30 backdrop-blur-md transition active:scale-95 min-h-[54px]"
            >
              <MapPin className="w-5 h-5 shrink-0 text-[#4ade80]" />
              <span>{lang === 'th' ? 'เปิดแผนที่' : 'Open Map'}</span>
            </a>
          </motion.div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={onScrollToForm}
        className="absolute bottom-5 sm:bottom-7 inset-x-0 mx-auto w-fit flex flex-col items-center gap-0.5 text-white/90 hover:text-white cursor-pointer px-4 py-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        <span className="text-base sm:text-lg font-bold [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
          {lang === 'th' ? 'เลื่อนลงเพื่อลงทะเบียน' : 'Scroll down to register'}
        </span>
        <motion.span
          aria-hidden="true"
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-7 h-7" />
        </motion.span>
      </motion.button>
    </SmoothScrollHero>
  );
}
