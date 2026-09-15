'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRight, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ExpiredMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedNonMember: () => void;
  onRenewMembership: () => void;
  memberName?: string;
  memberNo?: string;
  expireDate?: string | null;
  statusText?: string;
}

export function ExpiredMemberModal({
  isOpen,
  onClose,
  onProceedNonMember,
  onRenewMembership,
  memberName,
  memberNo,
  expireDate,
  statusText = 'หมดอายุ (Expired)',
}: ExpiredMemberModalProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const formattedDate = expireDate
    ? new Date(expireDate).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 relative overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Warning Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />

        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          title="ปิด / Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs border border-amber-200">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1 min-w-0 pr-6">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
              {lang === 'th' ? 'แจ้งเตือนสถานะสมาชิก' : 'Membership Status Alert'}
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {lang === 'th' ? 'สถานะสมาชิก TSRM ของคุณหมดอายุแล้ว' : 'Your TSRM Membership Has Expired'}
            </h3>
          </div>
        </div>

        {/* Member Details Card */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 space-y-2 text-xs text-slate-700">
          <div className="flex justify-between items-center pb-2 border-b border-amber-200/60">
            <span className="font-bold text-slate-500">{lang === 'th' ? 'เลขสมาชิก:' : 'Member No:'}</span>
            <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-amber-200">
              {memberNo || '-'}
            </span>
          </div>
          {memberName && (
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/60">
              <span className="font-bold text-slate-500">{lang === 'th' ? 'ชื่อสมาชิก:' : 'Member Name:'}</span>
              <span className="font-bold text-slate-900 truncate max-w-[240px]">{memberName}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-500">{lang === 'th' ? 'สถานะปัจจุบัน:' : 'Current Status:'}</span>
            <span className="font-extrabold text-amber-700">
              {statusText} {formattedDate ? `(หมดอายุเมื่อ ${formattedDate})` : ''}
            </span>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <p className="font-bold text-slate-800">
            {lang === 'th' 
              ? 'ระบบจะทำการคำนวณค่าลงทะเบียนในอัตราบุคคลทั่วไป (Non-member Rate)'
              : 'Registration fees will be calculated at Non-member Rates.'}
          </p>
          <p className="text-slate-500 text-xs">
            {lang === 'th'
              ? 'ท่านสามารถดำเนินการต่อไปยังขั้นตอนชำระเงิน หรือเลือกต่ออายุสมาชิก TSRM เพื่อรับสิทธิ์ราคาสมาชิก'
              : 'You can proceed to payment at the standard rate, or renew your TSRM membership to receive member pricing.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {/* Proceed to Payment as Non-member (Primary) */}
          <button
            type="button"
            onClick={onProceedNonMember}
            className="flex-1 bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 group"
          >
            <span>{lang === 'th' ? 'ดำเนินการต่อ (อัตราบุคคลทั่วไป)' : 'Proceed as Non-Member'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Renew Membership Button (Secondary) */}
          <button
            type="button"
            onClick={onRenewMembership}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm border border-amber-300 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ต่ออายุสมาชิก' : 'Renew Membership'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
