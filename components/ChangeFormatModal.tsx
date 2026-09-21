'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  FileText,
  Loader2,
  Building2,
  User,
  Ticket,
  CreditCard,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadImageToStorage } from '@/lib/blobUpload';

interface ChangeFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId?: string;
  meetingName?: string;
  defaultMemberNo?: string;
}

export function ChangeFormatModal({
  isOpen,
  onClose,
  meetingId = 'TSRM34',
  meetingName = 'TSRM Annual Conference',
  defaultMemberNo = '',
}: ChangeFormatModalProps) {
  const { lang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(defaultMemberNo);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [regData, setRegData] = useState<any | null>(null);

  // Form state
  const [targetFormat, setTargetFormat] = useState<'onsite' | 'online'>('onsite');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [transferTime, setTransferTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [bank, setBank] = useState<string>('Kasikorn (KBANK)');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSubmitSuccess(false);
      setSuccessResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSearchError(null);
      if (defaultMemberNo && defaultMemberNo.trim() && !regData) {
        setSearchQuery(defaultMemberNo.trim());
        handleSearch(defaultMemberNo.trim());
      }
    }
  }, [isOpen, defaultMemberNo]);

  if (!isOpen || !mounted) return null;

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (!q) {
      setSearchError(lang === 'th' ? 'กรุณากรอกเลขสมาชิก หรือ Ticket Code' : 'Please enter Member No. or Ticket Code');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setRegData(null);

    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/change-format?query=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSearchError(data.error || (lang === 'th' ? 'ไม่พบข้อมูลการลงทะเบียน' : 'Registration not found'));
        setIsSearching(false);
        return;
      }

      setRegData(data.data);
      // Default target format to the opposite of current format
      const opposite = data.data.currentFormat === 'onsite' ? 'online' : 'onsite';
      setTargetFormat(opposite);
    } catch (err: any) {
      console.error('Search registration error:', err);
      setSearchError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' : 'Server connection error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regData) {
      alert(lang === 'th' ? 'กรุณาค้นหาและเลือกข้อมูลผู้ลงทะเบียนก่อน' : 'Please search for your registration first');
      return;
    }

    if (regData.hasPendingChangeRequest) {
      alert(lang === 'th' ? 'ท่านมีคำขอเปลี่ยนรูปแบบที่รอตรวจสอบอยู่แล้ว' : 'You already have a pending change request');
      return;
    }

    if (targetFormat === regData.currentFormat) {
      alert(lang === 'th' ? 'กรุณาเลือกรูปแบบที่แตกต่างจากรูปแบบเดิม' : 'Please select a format different from your current format');
      return;
    }

    if (!selectedFile && !previewUrl) {
      alert(lang === 'th' ? 'กรุณาแนบภาพสลิปโอนเงินค่าธรรมเนียม' : 'Please attach your payment slip');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload slip image to Blob / Local storage
      let uploadedSlipUrl = previewUrl || '';
      if (selectedFile) {
        const uploadRes = await uploadImageToStorage(selectedFile, 'slips');
        uploadedSlipUrl = uploadRes.url;
      }

      // 2. Submit change request
      const submitRes = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/change-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSlipId: regData.slipId,
          memberNo: regData.memberNo,
          ticketCode: regData.ticketCode,
          attendeeName: regData.attendeeName,
          attendeeEmail: regData.attendeeEmail,
          attendeePhone: regData.attendeePhone,
          attendeeWorkplace: regData.attendeeWorkplace,
          isMember: regData.isMember,
          originalFormat: regData.currentFormat,
          targetFormat,
          changeFee: regData.changeFee || 1000,
          slipUrl: uploadedSlipUrl,
          bank,
          transferDate,
          transferTime,
          refNo: `CHG:${regData.currentFormat}->${targetFormat}`,
        }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok || !submitData.success) {
        alert(submitData.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการส่งคำขอ' : 'Failed to submit request'));
        setIsSubmitting(false);
        return;
      }

      setSuccessResult(submitData.data);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('Submit format change error:', err);
      alert(lang === 'th' ? 'เกิดข้อผิดพลาดในการส่งข้อมูล' : 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const feeAmount = regData?.changeFee || 1000;
  const bankInfo = regData?.bankInfo || {
    bankName: 'Kasikorn (KBANK)',
    accountNo: '040-8-55259-2',
    accountName: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#001f8f] to-[#00176a] p-4 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-tight">
                {lang === 'th' ? 'แจ้งขอเปลี่ยนรูปแบบการเข้าร่วม' : 'Request Attendance Format Change'}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 line-clamp-1 mt-0.5">
                {regData?.meetingName || meetingName}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-slate-800 text-sm">
          {submitSuccess ? (
            /* Success View */
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-lg">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  {lang === 'th' ? 'ส่งคำขอเปลี่ยนรูปแบบสำเร็จ' : 'Request Submitted Successfully'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {lang === 'th'
                    ? `ระบบได้รับคำขอเปลี่ยนรูปแบบเป็น "${targetFormat === 'onsite' ? 'Onsite (ที่งาน)' : 'Online'}" และสลิปค่าธรรมเนียม ${feeAmount.toLocaleString()} บาท เรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและอัปเดตสถานะให้ท่านโดยเร็ว`
                    : `Your request to change format to "${targetFormat === 'onsite' ? 'Onsite' : 'Online'}" with ${feeAmount.toLocaleString()} THB fee has been received and is pending admin review.`}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'th' ? 'รหัสคำขอ:' : 'Request ID:'}</span>
                  <span className="font-mono font-bold text-blue-900">{successResult?.slipId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'th' ? 'ผู้ลงทะเบียน:' : 'Attendee:'}</span>
                  <span className="font-bold text-slate-800">{regData?.attendeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'th' ? 'รูปแบบใหม่:' : 'New Format:'}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase">
                    {targetFormat}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#0026b3] to-[#001c8c] text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all cursor-pointer"
                >
                  {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Step 1: Search Registration */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === 'th' ? '1. ระบุเลขสมาชิกสมาคมฯ (4 หลัก) หรืออีเมลสมาชิก' : '1. Enter Member No. (4 digits) or Member Email'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder={lang === 'th' ? 'เช่น 0336, 1217 หรืออีเมลสมาชิก' : 'e.g. 0336, 1217 or member email'}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{lang === 'th' ? 'ค้นหา' : 'Search'}</span>
                  </button>
                </div>

                {searchError && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs mt-1.5 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Display Participant Data & Select Format */}
              {regData && (
                <div className="space-y-4 animate-fade-in pt-1 border-t border-slate-100">
                  {/* Attendee Info Card */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-100 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-500">{lang === 'th' ? 'ผู้ลงทะเบียน:' : 'Attendee:'}</span>
                          <span className="font-black text-slate-900 text-sm">{regData.attendeeName}</span>
                          {regData.memberNo && (
                            <span className="text-[11px] font-mono bg-blue-100 text-blue-900 font-bold px-1.5 py-0.2 rounded">
                              #{regData.memberNo}
                            </span>
                          )}
                        </div>
                        {regData.attendeeWorkplace && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{regData.attendeeWorkplace}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] block text-slate-500 font-medium">{lang === 'th' ? 'Ticket Code' : 'Ticket'}</span>
                        <span className="font-mono text-xs font-bold text-[#0026b3]">{regData.ticketCode || '-'}</span>
                      </div>
                    </div>

                    {/* Pending Request Alert */}
                    {regData.hasPendingChangeRequest && (
                      <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>{lang === 'th' ? 'อยู่ระหว่างรอการตรวจสอบ:' : 'Pending Review:'}</strong>{' '}
                          {lang === 'th'
                            ? 'ท่านได้ส่งคำขอเปลี่ยนรูปแบบไว้แล้ว เจ้าหน้าที่กำลังดำเนินการตรวจสอบสลิป'
                            : 'You already submitted a format change request. Admin is reviewing your slip.'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Format Switcher */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {lang === 'th' ? '2. เลือกรูปแบบใหม่ที่ต้องการเปลี่ยน' : '2. Select New Attendance Format'}
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Option 1: Onsite */}
                      <button
                        type="button"
                        onClick={() => setTargetFormat('onsite')}
                        className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          targetFormat === 'onsite'
                            ? 'bg-blue-50/90 border-[#0026b3] text-blue-950 shadow-sm ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                            🏢 Onsite (ที่งาน)
                          </span>
                          {targetFormat === 'onsite' && (
                            <div className="w-5 h-5 rounded-full bg-[#0026b3] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          {regData.currentFormat === 'onsite' ? (
                            <span className="text-amber-600 font-bold">● {lang === 'th' ? 'รูปแบบเดิมปัจจุบัน' : 'Current Format'}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> {lang === 'th' ? 'เปลี่ยนเป็น Onsite' : 'Switch to Onsite'}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Option 2: Online */}
                      <button
                        type="button"
                        disabled={!regData.isMember}
                        onClick={() => {
                          if (!regData.isMember) {
                            alert(lang === 'th' ? 'การเข้าร่วมแบบ Online สงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ เท่านั้น' : 'Online attendance is reserved for TSRM members only.');
                            return;
                          }
                          setTargetFormat('online');
                        }}
                        className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                          !regData.isMember
                            ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed opacity-80'
                            : targetFormat === 'online'
                            ? 'bg-blue-50/90 border-[#0026b3] text-blue-950 shadow-sm ring-1 ring-blue-600 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                            💻 Online (ออนไลน์)
                          </span>
                          {!regData.isMember ? (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              🔒 เฉพาะสมาชิก
                            </span>
                          ) : targetFormat === 'online' ? (
                            <div className="w-5 h-5 rounded-full bg-[#0026b3] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[11px]">
                          {!regData.isMember ? (
                            <span className="text-slate-500 font-medium">
                              {lang === 'th' ? '🔒 สงวนสิทธิ์เฉพาะสมาชิก' : 'Members Only'}
                            </span>
                          ) : regData.currentFormat === 'online' ? (
                            <span className="text-amber-600 font-bold">● {lang === 'th' ? 'รูปแบบเดิมปัจจุบัน' : 'Current Format'}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> {lang === 'th' ? 'เปลี่ยนเป็น Online' : 'Switch to Online'}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {!regData.isMember && (
                      <p className="text-[11px] text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                        ℹ️ {lang === 'th'
                          ? 'การเข้าร่วมแบบ Online สงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ เท่านั้น (บุคคลทั่วไปสามารถเข้าร่วมในรูปแบบ Onsite)'
                          : 'Online attendance is strictly reserved for TSRM members only.'}
                      </p>
                    )}

                    {regData.isMember && targetFormat === regData.currentFormat && (
                      <p className="text-[11px] text-amber-600 font-medium">
                        ⚠️ {lang === 'th' ? 'กรุณาเลือกรูปแบบที่ต่างจากรูปแบบเดิมปัจจุบันของท่าน' : 'Please select a different format from your current one'}
                      </p>
                    )}
                  </div>

                  {/* Step 3: Fee Amount & Bank Transfer Box */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                      <span className="text-xs font-bold text-amber-900">
                        {lang === 'th' ? 'ค่าธรรมเนียมการเปลี่ยนรูปแบบ:' : 'Format Change Fee:'}
                      </span>
                      <div className="text-right">
                        <span className="text-lg sm:text-xl font-black text-amber-900">
                          {feeAmount.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-800 ml-1">{lang === 'th' ? 'บาท' : 'THB'}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      💡 {lang === 'th'
                        ? 'ชำระเฉพาะค่าธรรมเนียมเปลี่ยนรูปแบบ 1,000 บาทนี้เท่านั้น ไม่ต้องชำระค่าลงทะเบียนใหม่ทั้งหมด'
                        : 'Only pay the 1,000 THB format change fee. No need to pay full ticket fee again.'}
                    </p>

                    {/* Bank Info */}
                    <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{lang === 'th' ? 'ธนาคาร:' : 'Bank:'}</span>
                        <span className="font-bold text-[#00a950]">{bankInfo.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{lang === 'th' ? 'เลขที่บัญชี:' : 'Account No:'}</span>
                        <span className="font-mono font-bold text-[#0026b3]">{bankInfo.accountNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{lang === 'th' ? 'ชื่อบัญชี:' : 'Account Name:'}</span>
                        <span className="font-medium text-slate-800">{bankInfo.accountName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Upload Slip */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {lang === 'th' ? '3. แนบสลิปการโอนเงิน (ยอด 1,000 บาท)' : '3. Attach Transfer Slip (1,000 THB)'}
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {previewUrl ? (
                      <div className="relative rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={previewUrl}
                            alt="Slip Preview"
                            className="w-12 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {selectedFile?.name || 'slip-image.jpg'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              ✓ {lang === 'th' ? 'เลือกไฟล์แล้ว' : 'File selected'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-sm"
                        >
                          {lang === 'th' ? 'เปลี่ยนไฟล์' : 'Change'}
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-4 text-center cursor-pointer transition-all"
                      >
                        <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">
                          {lang === 'th' ? 'คลิกเพื่อเลือกไฟล์สลิปโอนเงิน' : 'Click to select slip file'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {lang === 'th' ? 'รองรับรูปภาพ JPG, PNG (สลิปโอนเงินค่าธรรมเนียม)' : 'Supports JPG, PNG'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || targetFormat === regData.currentFormat || (!selectedFile && !previewUrl) || regData.hasPendingChangeRequest}
                      className="w-full py-3 px-4 bg-gradient-to-r from-[#0026b3] via-[#002099] to-[#001878] hover:brightness-110 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-blue-900/20 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{lang === 'th' ? 'กำลังส่งคำขอ...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>
                            {lang === 'th'
                              ? `ยืนยันส่งคำขอเปลี่ยนเป็น ${targetFormat === 'onsite' ? 'Onsite' : 'Online'}`
                              : `Confirm Change to ${targetFormat.toUpperCase()}`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
