'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Check, 
  Copy, 
  Shield, 
  Upload, 
  Globe, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  RotateCw,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { useLanguage } from '@/context/LanguageContext';

export interface ItemizedActivity {
  id: string;
  name: string;
  type: string;
  date?: string;
  format?: string;
  originalPrice?: number;
  discount?: number;
  netPrice?: number;
  price: number;
  rateBadgeTh?: string;
  rateBadgeEn?: string;
}

export interface GroupAttendeeActivity {
  id: string;
  name: string;
  type: string;
  format?: string;
  originalPrice: number;
  discount: number;
  netPrice: number;
  isDiscounted?: boolean;
}

export interface GroupAttendeeSummary {
  name: string;
  email?: string;
  position?: string;
  workplace?: string;
  memberNo?: string;
  price: number;
  originalTotal?: number;
  discountTotal?: number;
  discountAppliedNotice?: string;
  isMember?: boolean;
  attendanceType?: string;
  details?: string;
  activities?: GroupAttendeeActivity[];
}

interface PaymentViewProps {
  paymentType?: 'registration' | 'membership';
  customAmount?: number;
  isGroup?: boolean;
  companyName?: string;
  groupAttendees?: GroupAttendeeSummary[];
  isMember?: boolean;
  isExpiredMember?: boolean;
  expireDate?: string | null;
  meetingName?: string;
  attendeeName?: string;
  attendeePosition?: string;
  attendeeWorkplace?: string;
  attendeeMemberNo?: string;
  attendanceType?: 'onsite' | 'online';
  itemizedActivities?: ItemizedActivity[];
  selectedActivities?: Array<{ id: string; name: string; price: number; type?: string }>;
  isCouponSponsored?: boolean;
  sponsorCompanyName?: string;
  couponCode?: string;
  discountAmount?: number;
  submitting?: boolean;
  onNavigateBack?: () => void;
  onOpenUploadModal: () => void;
  onCopyBank: () => void;
  copiedBank: boolean;
  bankAccount: string;
  uploadedSlipData?: { fileName: string; fileUrl: string } | null;
  onRemoveSlip?: () => void;
  onConfirmPayment: () => void;
}

export function PaymentView({
  paymentType = 'membership',
  customAmount,
  isGroup = false,
  companyName,
  groupAttendees = [],
  isMember = true,
  isExpiredMember = false,
  expireDate,
  meetingName,
  attendeeName,
  attendeePosition,
  attendeeWorkplace,
  attendeeMemberNo,
  attendanceType = 'onsite',
  itemizedActivities,
  selectedActivities,
  isCouponSponsored = false,
  sponsorCompanyName,
  couponCode,
  discountAmount = 0,
  submitting = false,
  onNavigateBack,
  onOpenUploadModal,
  onCopyBank,
  copiedBank,
  bankAccount,
  uploadedSlipData,
  onRemoveSlip,
  onConfirmPayment
}: PaymentViewProps) {

  const router = useRouter();
  const { lang, toggleLang, t } = useLanguage();
  const isRegistration = paymentType === 'registration';

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      router.push('/login?tab=conference&restore=1');
    }
  };

  // Determine amount and program label
  const totalAmount = customAmount !== undefined 
    ? customAmount.toLocaleString() 
    : (isRegistration ? (isMember ? '3,500' : '4,500') : '1,000');

  const displayProgramName = meetingName || (isRegistration
    ? ((t.payment as any).regPassName || (lang === 'th' ? 'TSRM Congress Pass' : 'TSRM Congress Pass'))
    : t.payment.passName);

  const displayBadge = isRegistration
    ? (isExpiredMember
        ? (lang === 'th' ? 'สมาชิกหมดอายุ (อัตราบุคคลทั่วไป)' : 'EXPIRED MEMBER (NON-MEMBER RATE)')
        : (isMember ? (lang === 'th' ? 'สมาชิกสมาคม' : 'MEMBER RATE') : (lang === 'th' ? 'บุคคลทั่วไป' : 'NON-MEMBER RATE')))
    : t.payment.passBadge;

  // Activities to render in invoice breakdown
  const displayItems: ItemizedActivity[] = (itemizedActivities && itemizedActivities.length > 0)
    ? itemizedActivities
    : (selectedActivities && selectedActivities.length > 0)
      ? selectedActivities.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type || 'main',
          price: a.price,
          rateBadgeTh: isMember ? 'ราคาสมาชิก' : 'ราคาบุคคลทั่วไป',
          rateBadgeEn: isMember ? 'Member Rate' : 'Standard Rate',
        }))
      : [];

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-8 sm:pb-10 rounded-b-[28px] sm:rounded-b-[36px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-3xl sm:max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition border border-white/15 cursor-pointer active:scale-95 shrink-0"
                title="ย้อนกลับไปหน้าก่อนหน้า / Go Back"
                aria-label="ย้อนกลับไปหน้าก่อนหน้า"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Brand Logo & Name */}
              <div 
                onClick={() => router.push('/login')}
                className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 cursor-pointer group hover:opacity-90 transition"
                title="กลับสู่หน้าหลัก / Back to Home"
              >
                <TsrmLogo className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="min-w-0">
                  <span className="text-[10px] xs:text-xs sm:text-[13px] md:text-sm font-bold text-blue-200 block whitespace-nowrap leading-tight">
                    {t.associationName}
                  </span>
                  <span className="font-extrabold text-white text-xs xs:text-sm sm:text-base tracking-wide block whitespace-nowrap leading-tight">
                    {t.brandName}
                  </span>
                </div>
              </div>
            </div>

            {/* Language Switcher Pill */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-0.5 xs:gap-1 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-1.5 xs:px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              title="Switch Language / สลับภาษา"
            >
              <Globe className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-200 shrink-0" />
              <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
              <span className="text-white/40 font-normal">|</span>
              <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
            </button>
          </div>

          <div className="mt-5 sm:mt-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isRegistration
                ? (lang === 'th' ? 'สรุปยอดและชำระเงินค่าลงทะเบียน' : 'Registration Payment & Summary')
                : t.payment.title}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal max-w-2xl">
              {isRegistration
                ? (lang === 'th' ? 'ตรวจสอบรายละเอียดข้อมูลและรายการค่าใช้จ่ายก่อนทำการโอนเงินและอัปโหลดสลิป' : 'Review your registration details and pricing breakdown before transferring and uploading receipt slip.')
                : t.payment.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="px-4 sm:px-8 lg:px-12 py-5 sm:py-6 flex-1 flex flex-col justify-between space-y-4 max-w-3xl sm:max-w-4xl mx-auto w-full">
        


        {/* Expired Member Notification Banner */}
        {isRegistration && isExpiredMember && !isGroup && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 shadow-2xs animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-900 leading-tight">
                {lang === 'th' ? 'สถานะสมาชิกของคุณหมดอายุแล้ว' : 'Your TSRM Membership Has Expired'}
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-700 leading-relaxed font-normal">
                {lang === 'th'
                  ? 'ระบบได้คำนวณอัตราค่าธรรมเนียมการลงทะเบียนเป็นราคาสำหรับบุคคลทั่วไป ท่านสามารถต่ออายุสมาชิก TSRM ภายหลังเพื่อรับสิทธิ์ประโยชน์สมาชิกอย่างต่อเนื่อง'
                  : 'Your registration fees are calculated at Non-member rates because your membership has expired. You may renew your membership at any time.'}
              </p>
            </div>
          </div>
        )}

        {/* Corporate / Group Registration Summary Banner */}
        {isGroup && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 shadow-2xs animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#0026b3] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#0026b3] text-white px-2 py-0.5 rounded">
                  {lang === 'th' ? 'แบบกลุ่มสำหรับบริษัท' : 'Corporate / Group'}
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                  {companyName || (lang === 'th' ? 'แบบกลุ่มสำหรับบริษัท' : 'Corporate Group')}
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
                {lang === 'th'
                  ? `รวมผู้ลงทะเบียน/สมัครทั้งหมด ${groupAttendees.length} ท่าน (ชำระรวมในใบเสร็จ/สลิปเดียว)`
                  : `Total ${groupAttendees.length} attendees/applicants (Combined single invoice payment)`}
              </p>
            </div>
          </div>
        )}

        {/* Pass Details White Card & Invoice Breakdown */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-[#0026b3] text-base sm:text-lg tracking-tight truncate">
              {displayProgramName}
            </h3>
            <span className="bg-[#eff4ff] text-[#0026b3] text-[9px] sm:text-[10px] font-black tracking-widest px-2.5 sm:px-3 py-1 rounded-full border border-[#d6e4ff] shrink-0 whitespace-nowrap uppercase">
              {isGroup ? (lang === 'th' ? `กลุ่ม ${groupAttendees.length} ท่าน` : `Group (${groupAttendees.length})`) : displayBadge}
            </span>
          </div>

          {/* Itemized Price Breakdown Table */}
          <div className="space-y-2.5 pt-1">
            {/* Group Attendees Roster Breakdown */}
            {isGroup && groupAttendees.length > 0 ? (
              <div className="space-y-2.5 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {lang === 'th' ? 'รายชื่อและค่าธรรมเนียมของผู้สมัคร/ผู้ลงทะเบียนแต่ละท่าน:' : 'Itemized Attendee / Applicant Roster:'}
                  </span>
                  {/* Edit Form Return Button */}
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-[11px] font-bold text-[#0026b3] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ย้อนกลับไปแก้ไขข้อมูล' : 'Edit Attendee Info'}</span>
                  </button>
                </div>

                {/* Chronology Notice Box */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 sm:p-3 flex items-start gap-2">
                  <span className="text-amber-700 text-xs mt-0.5">📌</span>
                  <p className="text-[10px] sm:text-[11px] text-amber-900 leading-relaxed font-semibold">
                    {lang === 'th'
                      ? 'การจัดสรรส่วนลดและการใช้สิทธิ์คูปองจะถูกคำนวณตามลำดับการกรอกข้อมูลผู้ลงทะเบียน (First-Come, First-Served)'
                      : 'Discounts and coupon allocations are calculated chronologically according to attendee registration order (First-Come, First-Served).'}
                  </p>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                  {groupAttendees.map((att, idx) => (
                    <div key={idx} className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/80 transition space-y-2.5">
                      {/* Attendee Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-[#0026b3] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {att.name}
                            </h4>
                            {att.memberNo && (
                              <span className="text-[10px] font-mono font-bold bg-blue-50 text-[#0026b3] border border-blue-200 px-1.5 py-0.5 rounded">
                                #{att.memberNo}
                              </span>
                            )}
                            {att.position && (
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                {att.position}
                              </span>
                            )}
                            {att.isMember !== undefined && (
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                att.isMember ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {att.isMember ? (lang === 'th' ? 'สมาชิก' : 'Member') : (lang === 'th' ? 'บุคคลทั่วไป' : 'Non-Member')}
                              </span>
                            )}
                            {att.attendanceType && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {att.attendanceType === 'online' ? '💻 Online' : '🏢 Onsite'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Attendee Subtotal / Net Price */}
                        <div className="text-right shrink-0 pl-7 sm:pl-0">
                          {att.discountTotal && att.discountTotal > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-400 line-through font-medium">
                                {(att.originalTotal || att.price + att.discountTotal).toLocaleString()} {lang === 'th' ? 'บาท' : 'THB'}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-[#0026b3]">
                                {att.price === 0 ? (
                                  <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                    {lang === 'th' ? 'ฟรี (0 บาท)' : 'FREE (0 THB)'}
                                  </span>
                                ) : (
                                  `${att.price.toLocaleString()} ${lang === 'th' ? 'บาท' : 'THB'}`
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-[#0026b3]">
                              {att.price.toLocaleString()} <span className="text-[11px] font-bold text-slate-600">{lang === 'th' ? 'บาท' : 'THB'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attendee Itemized Activities (if available) */}
                      {att.activities && att.activities.length > 0 ? (
                        <div className="pl-7 space-y-1.5 border-t border-slate-100 pt-2">
                          {att.activities.map((act, actIdx) => (
                            <div key={actIdx} className="flex items-center justify-between text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${act.type === 'main' ? 'bg-[#0026b3]' : 'bg-indigo-500'}`} />
                                <span className="truncate">{act.name}</span>
                                <span className="text-[9px] text-slate-400 font-medium">({act.type === 'main' ? 'Main' : 'Workshop'})</span>
                              </div>
                              <div className="text-right shrink-0">
                                {act.isDiscounted || act.netPrice === 0 ? (
                                  <span className="text-emerald-700 font-bold">
                                    <span className="line-through text-slate-400 mr-1">{act.originalPrice.toLocaleString()}</span>
                                    {act.netPrice === 0 ? (lang === 'th' ? 'ฟรี' : 'Free') : `${act.netPrice.toLocaleString()} ฿`}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-slate-700">{act.originalPrice.toLocaleString()} ฿</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : att.details ? (
                        <p className="text-[11px] text-slate-500 font-medium pl-7">
                          {att.details}
                        </p>
                      ) : null}

                      {/* Attendee Discount Allocation Banner */}
                      {att.discountAppliedNotice && (
                        <div className="ml-7 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[10px] font-bold text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{att.discountAppliedNotice}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : isRegistration ? (
              <>
                {displayItems.length > 0 ? (
                  <div className="space-y-2 pb-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      {lang === 'th' ? 'สรุปรายการและค่าธรรมเนียมตามที่เลือก:' : 'Fee Breakdown by Selection:'}
                    </span>
                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                      {displayItems.map((act, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 gap-2 bg-white hover:bg-slate-50/80 transition">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                act.type === 'main'
                                  ? 'bg-[#0026b3] text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}>
                                {act.type === 'main' ? (lang === 'th' ? 'หลักสูตรหลัก' : 'Main') : (lang === 'th' ? 'เวิร์กช็อป' : 'Workshop')}
                              </span>
                              {act.format && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                  act.format === 'online'
                                    ? 'bg-blue-50 text-[#0026b3] border-blue-200'
                                    : act.format === 'both'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {act.format === 'online' ? '💻 Online' : act.format === 'both' ? '🌐 Hybrid' : '🏢 Onsite'}
                                </span>
                              )}
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {act.name}
                              </h4>
                            </div>
                            {(act.rateBadgeTh || act.rateBadgeEn) && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                {lang === 'th' ? act.rateBadgeTh : act.rateBadgeEn}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            {act.discount && act.discount > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400 line-through font-medium">
                                  {(act.originalPrice || (act.price + act.discount)).toLocaleString()} {lang === 'th' ? 'บาท' : 'THB'}
                                </span>
                                <span className="text-xs sm:text-sm font-black text-[#0026b3]">
                                  {(act.netPrice === 0 || act.price === 0) ? (
                                    <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                      {lang === 'th' ? 'ฟรี (0 บาท)' : 'FREE (0 THB)'}
                                    </span>
                                  ) : (
                                    `${(act.netPrice ?? act.price).toLocaleString()} ${lang === 'th' ? 'บาท' : 'THB'}`
                                  )}
                                </span>
                              </div>
                            ) : act.price === 0 ? (
                              <span className="inline-flex items-center text-xs sm:text-sm font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                {lang === 'th' ? 'ฟรี (0 บาท)' : 'FREE (0 THB)'}
                              </span>
                            ) : (
                              <span className="text-xs sm:text-sm font-black text-[#0026b3]">
                                {act.price.toLocaleString()} <span className="text-[11px] font-bold text-slate-600">{lang === 'th' ? 'บาท' : 'THB'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Individual Partial Coupon Discount Banner */}
                {discountAmount > 0 && !isCouponSponsored && (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 leading-tight space-y-1 min-w-0 flex-1">
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        <span>{lang === 'th' ? 'ได้รับสิทธิ์ฟรีค่าลงทะเบียนหลัก (Main Program) โดย:' : 'Free Main Program Pass Sponsored by:'}</span>
                        <span className="font-black text-[#0026b3]">{sponsorCompanyName || 'Sponsor Partner'}</span>
                        {couponCode && <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">Code: {couponCode}</span>}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-semibold">
                        {lang === 'th'
                          ? `หักส่วนลดค่าลงทะเบียนหลัก -${discountAmount.toLocaleString()} บาท (ชำระเฉพาะค่าลงทะเบียนเวิร์กช็อปเพิ่มเติม ${totalAmount} บาท)`
                          : `Main program fee waived -${discountAmount.toLocaleString()} THB (Remaining balance for workshops: ${totalAmount} THB)`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{(t.payment as any).regFeature1 || 'สิทธิ์เข้าร่วมงานประชุมวิชาการประจำปีและเวิร์กช็อป TSRM'}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{(t.payment as any).regFeature2 || 'รับเอกสารประกอบการประชุม และอาหารว่าง/กลางวัน'}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{(t.payment as any).regFeature3 || 'สะสมหน่วยกิตวิชาชีพการศึกษาต่อเนื่อง (CME / CPD / CNEU)'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{t.payment.feature1}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{t.payment.feature2}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{t.payment.feature3}</span>
                </div>
              </>
            )}
          </div>

          {/* Grand Total Amount Due or Sponsor Pass Notice */}
          {isCouponSponsored ? (
            <div className="border-t border-emerald-200 pt-4 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 rounded-b-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                      {lang === 'th' ? 'สิทธิ์สปอนเซอร์' : 'Sponsor Pass'}
                    </span>
                    {couponCode && (
                      <span className="text-[10px] font-mono font-black text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        Code: {couponCode}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-1 truncate">
                    {lang === 'th' ? 'ได้รับการสนับสนุนค่าลงทะเบียนโดย:' : 'Sponsored by:'}{' '}
                    <span className="text-[#0026b3] font-black">{sponsorCompanyName || 'Sponsor Partner'}</span>
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    {lang === 'th' ? '✓ ได้รับสิทธิ์เข้าร่วมงานประชุมฟรีเต็มจำนวน ไม่ต้องชำระเงิน' : '✓ Full coverage: No payment required'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200/90 pt-4 flex items-baseline justify-between bg-blue-50/40 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 rounded-b-3xl">
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 block">{t.payment.totalDue}</span>
                {isRegistration && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {lang === 'th' ? `คำนวณตามรูปแบบ: ${attendanceType === 'online' ? 'Online' : 'Onsite'}` : `Calculated for: ${attendanceType === 'online' ? 'Online' : 'Onsite'}`}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-[#0026b3] tracking-tight">
                  {totalAmount} <span className="text-base sm:text-lg font-bold text-slate-700">{t.payment.currency}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bank Account Info Card (Only shown if payment is required) */}
        {!isCouponSponsored && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[#0026b3] font-black text-sm sm:text-lg tracking-wider truncate">
                {bankAccount}
              </span>
              {/* Kasikorn K+ Badge */}
              <span className="bg-[#00a950] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap">
                K+
              </span>
            </div>
            <button
              onClick={onCopyBank}
              className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-3 py-1.5 sm:py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap border border-blue-100"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedBank ? t.payment.copiedButton : t.payment.copyButton}</span>
            </button>
          </div>
        )}

        {/* Uploaded Slip Card (When slip is attached and required) */}
        {!isCouponSponsored && uploadedSlipData && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#4ade80]/60 bg-gradient-to-b from-white to-emerald-50/30 shadow-2xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                    {t.payment.uploadedSlipTitle}
                  </h4>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    อัปโหลดหลักฐานแล้ว
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#0026b3]/20 transition flex items-center gap-1 cursor-pointer"
                  title={t.payment.changeSlipButton}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-xs">{t.payment.changeSlipButton}</span>
                </button>

                {onRemoveSlip && (
                  <button
                    type="button"
                    onClick={onRemoveSlip}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-red-200 transition flex items-center gap-1 cursor-pointer"
                    title={t.payment.removeSlipButton}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Preview Thumbnail & File Name display */}
            <div className="flex items-center gap-3 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
              <img
                src={uploadedSlipData.fileUrl}
                alt="Slip Preview"
                className="w-12 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={onOpenUploadModal}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-slate-800">
                  <FileText className="w-4 h-4 text-[#0026b3] shrink-0" />
                  <p className="text-xs font-bold text-slate-800 truncate" title={uploadedSlipData.fileName}>
                    {uploadedSlipData.fileName}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t.payment.readyToConfirmNotice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Security Encrypted Checkout Badge */}
        <div className="w-full bg-[#eff4ff] text-[#0026b3] font-bold text-[10px] sm:text-[11px] uppercase tracking-wider py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 border border-[#d6e4ff] text-center">
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0026b3] shrink-0" />
          <span className="whitespace-normal sm:whitespace-nowrap">{t.payment.securityBadge}</span>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-2.5 pt-2">
          {!isCouponSponsored && !uploadedSlipData ? (
            <button
              onClick={onOpenUploadModal}
              className="w-full bg-white hover:bg-blue-50/50 text-[#0026b3] border-2 border-dashed border-[#0026b3]/40 font-bold text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-2xs transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5 stroke-[2.5]" />
              <span>{t.payment.uploadButton}</span>
            </button>
          ) : null}

          {/* Confirm Payment / Confirm Sponsor Pass Button */}
          <button
            onClick={onConfirmPayment}
            disabled={submitting}
            className={`w-full font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-md transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
              isCouponSponsored
                ? 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] ring-4 ring-[#4ade80]/25 shadow-emerald-950/20'
                : uploadedSlipData
                ? 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] ring-4 ring-[#4ade80]/20'
                : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-blue-900/10'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isCouponSponsored
                ? (lang === 'th' ? 'ยืนยันการลงทะเบียน (ใช้สิทธิ์คูปอง)' : 'Confirm Registration (Use Sponsor Pass)')
                : t.payment.confirmPaymentButton}
            </span>
          </button>
        </div>

        {/* Footer Terms Disclaimer */}
        <p className="text-[10px] sm:text-[11px] text-slate-400 text-center leading-normal px-2 pb-4">
          {t.payment.termsDisclaimer}
        </p>
      </div>
    </div>
  );
}
