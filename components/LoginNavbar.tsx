'use client';

import React, { useEffect, useState } from 'react';
import { Globe, Search, UserCheck } from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { ParticipantSearchModal } from '@/components/ParticipantSearchModal';
import { ProfileAndSponsorUpdateModal } from '@/components/ProfileAndSponsorUpdateModal';
import { useLanguage } from '@/context/LanguageContext';

/**
 * แถบนำทางด้านบนของหน้า login: โปร่งใสเมื่ออยู่บน hero
 * แล้วเปลี่ยนเป็นแถบสีทึบเมื่อเลื่อนจอลง
 * ปุ่มทุกปุ่มแสดงพร้อมข้อความตลอด ไม่ซ่อนในเมนู เพื่อให้ผู้ใช้สูงอายุเห็นและเข้าใจได้ทันที
 */
export function LoginNavbar() {
  const { lang, toggleLang, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const actionButtonClass =
    'flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-3 xl:px-4 min-h-[48px] lg:min-h-[44px] bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-base lg:text-[15px] xl:text-base font-bold transition border border-white/25 cursor-pointer active:scale-95';

  const actionButtons = (
    <>
      <button type="button" onClick={() => setIsUpdateOpen(true)} className={actionButtonClass}>
        <UserCheck className="w-5 h-5 text-blue-100 shrink-0" />
        <span className="leading-tight min-[380px]:whitespace-nowrap">{lang === 'th' ? 'อัปเดตข้อมูล' : 'Update Info'}</span>
      </button>
      <button type="button" onClick={() => setIsSearchOpen(true)} className={actionButtonClass}>
        <Search className="w-5 h-5 text-[#4ade80] shrink-0" />
        <span className="leading-tight min-[380px]:whitespace-nowrap">{lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}</span>
      </button>
    </>
  );

  const langSwitch = (
    <button
      type="button"
      onClick={toggleLang}
      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl font-extrabold transition border border-white/25 cursor-pointer active:scale-95 px-3 sm:px-3.5 min-h-[48px] text-base shrink-0"
      title={lang === 'th' ? 'เปลี่ยนภาษา' : 'Change language'}
      aria-label={lang === 'th' ? 'เปลี่ยนเป็นภาษาอังกฤษ' : 'Switch to Thai'}
    >
      <Globe className="hidden sm:block w-4 h-4 text-blue-100 shrink-0" />
      <span className={lang === 'th' ? 'text-white' : 'text-blue-100/60 font-semibold'}>TH</span>
      <span className="text-white/40 font-normal">|</span>
      <span className={lang === 'en' ? 'text-white' : 'text-blue-100/60 font-semibold'}>EN</span>
    </button>
  );

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          scrolled ? '' : 'bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-transparent'
        }`}
      >
        {/* เมื่อเลื่อนลง แถบจะกว้างเท่าฟอร์มและโค้งขอบล่าง ให้รับกับ footer */}
        <nav
          className={`max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 space-y-2 lg:space-y-0 transition-[padding,box-shadow,border-radius] duration-300 ${
            scrolled
              ? 'bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] rounded-b-[24px] sm:rounded-b-[36px] shadow-xl shadow-blue-950/30 pt-2 pb-3'
              : 'py-3 sm:py-4'
          }`}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left cursor-pointer group"
              aria-label={lang === 'th' ? 'กลับไปด้านบนสุด' : 'Back to top'}
            >
              <TsrmLogo
                className={`shrink-0 transition-all duration-300 group-hover:scale-105 ${
                  scrolled ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-11 h-11 sm:w-14 sm:h-14'
                }`}
              />
              <span className="min-w-0">
                <span className="block text-lg sm:text-xl font-black text-white leading-tight">{t.brandName}</span>
                <span className="block text-[13px] sm:text-[15px] font-semibold text-blue-100 leading-tight min-[380px]:whitespace-nowrap">
                  {t.associationName}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {/* จอกว้างตั้งแต่ 1024px: ปุ่มอยู่แถวเดียวกับโลโก้ (จอเล็กกว่านั้นขึ้นแถวที่สอง ไม่ทับชื่อสมาคม) */}
              <div className="hidden lg:flex items-center gap-2">{actionButtons}</div>
              {langSwitch}
            </div>
          </div>

          {/* มือถือ: ปุ่มพร้อมข้อความ 2 ช่องเต็มความกว้าง */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">{actionButtons}</div>
        </nav>
      </header>

      <ParticipantSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ProfileAndSponsorUpdateModal isOpen={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} lang={lang} />
    </>
  );
}
