'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  UploadCloud,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface SlipRejectionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectionReason: string;
  associationNameTh?: string;
  associationContact?: string;
}

export function SlipRejectionPreviewModal({
  isOpen,
  onClose,
  rejectionReason,
  associationNameTh = 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  associationContact = 'Website: https://tsrm.com/ E-mail: tsrm.info@gmail.com',
}: SlipRejectionPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'resubmit' | 'admin_dialog'>('email');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const displayReason = rejectionReason?.trim() || 'โปรดแนบสลิปที่มียอดเงินและรายละเอียดตรงกับรายการลงทะเบียน';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 p-4 sm:p-6 border-b border-amber-100/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  ตัวอย่างการแสดงผลข้อความปฏิเสธสลิป
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                  PREVIEW
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                จำลองการนำข้อความเริ่มต้นไปแสดงผลในช่องทางต่าง ๆ เมื่อแอดมินปฏิเสธสลิป
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-2 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 border-x border-b-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white text-[#0026b3] border-t-[#0026b3] border-x-slate-200 shadow-2xs font-extrabold -mb-[1px]'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>1. อีเมลแจ้งเตือนผู้สมัคร</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resubmit')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 border-x border-b-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'resubmit'
                ? 'bg-white text-[#0026b3] border-t-[#0026b3] border-x-slate-200 shadow-2xs font-extrabold -mb-[1px]'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. หน้าแนบสลิปใหม่</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin_dialog')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 border-x border-b-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'admin_dialog'
                ? 'bg-white text-[#0026b3] border-t-[#0026b3] border-x-slate-200 shadow-2xs font-extrabold -mb-[1px]'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>3. กล่องแจ้งเตือนของแอดมิน</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {/* TAB 1: EMAIL NOTIFICATION MOCKUP */}
          {activeTab === 'email' && (
            <div className="space-y-4 animate-fade-in">
              {/* Simulated Email Envelope Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex flex-col gap-1 text-[11px] text-slate-600 font-mono">
                  <div className="flex items-center justify-between">
                    <span><strong>จาก:</strong> {associationNameTh} &lt;noreply@tsrm.com&gt;</span>
                    <span className="text-slate-400">วันนี้ 14:30 น.</span>
                  </div>
                  <div><strong>ถึง:</strong> member@example.com (ชื่อผู้รับการแจ้งเตือน)</div>
                  <div><strong>หัวข้อ:</strong> <span className="text-rose-600 font-bold">⚠️ แจ้งแก้ไขการแนบหลักฐานการชำระเงิน - {associationNameTh}</span></div>
                </div>

                {/* Email Body Content */}
                <div className="p-5 sm:p-6 space-y-4 bg-white">
                  {/* Email Header Logo & Title */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/tsrm-logoPNG.png"
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '/logoPNG.png';
                      }}
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {associationNameTh}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        ระบบรับสมัครและลงทะเบียนการประชุมวิชาการ
                      </p>
                    </div>
                  </div>

                  {/* Greeting */}
                  <div className="text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-900">เรียน ท่านสมาชิก / ผู้ลงทะเบียน,</p>
                    <p className="leading-relaxed">
                      ตามที่ท่านได้ลงทะเบียนเข้าร่วม <strong>การประชุมวิชาการประจำปี 2569</strong> ทางเจ้าหน้าที่ฝ่ายตรวจสอบการเงินได้ตรวจหลักฐานการชำระเงินของท่านแล้ว และไม่สามารถอนุมัติได้เนื่องจากสาเหตุดังต่อไปนี้:
                    </p>
                  </div>

                  {/* Highlighted Rejection Reason Box */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 text-amber-950 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>ข้อความแจ้งเหตุผลจากเจ้าหน้าที่:</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 pl-6 bg-white/80 p-3 rounded-xl border border-amber-200/60 leading-relaxed break-words whitespace-pre-wrap">
                      &quot;{displayReason}&quot;
                    </div>
                  </div>

                  {/* Mockup Registration Details */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 text-[11px] uppercase text-slate-500">
                      📋 ข้อมูลแบบฟอร์มรายการที่ลงทะเบียน:
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>งานประชุม:</span>
                      <span className="font-bold text-slate-800">การประชุมวิชาการประจำปี 2569</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ชื่อผู้ลงทะเบียน:</span>
                      <span className="font-bold text-slate-800">นพ. สมชาย ใจดี</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดเงิน:</span>
                      <span className="font-bold text-[#0026b3]">฿ 4,000</span>
                    </div>
                  </div>

                  {/* Next Step & Button */}
                  <div className="text-xs text-slate-600 space-y-3 pt-1">
                    <p>
                      ท่านสามารถกดปุ่มด้านล่างเพื่อเข้าสู่หน้าระบบ เพื่อ<strong>ตรวจสอบ แก้ไขข้อมูลที่ไม่ถูกต้อง และแนบหลักฐานการโอนเงินใหม่</strong>ได้ทันที:
                    </p>
                    <div className="flex justify-center py-2">
                      <div className="px-6 py-3 rounded-xl bg-[#0026b3] text-white text-xs font-bold shadow-md flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                        <span>คลิกเพื่อตรวจสอบ แก้ไขข้อมูล และแนบสลิปใหม่</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">
                      * ลิงก์นี้สามารถใช้งานได้เฉพาะรายการลงทะเบียนของท่าน และมีอายุ 7 วัน
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                    {associationContact}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESUBMIT PAGE MOCKUP */}
          {activeTab === 'resubmit' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Browser Address Bar Mockup */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-white px-3 py-1 rounded-md border border-slate-200 text-[11px] font-mono text-slate-600 truncate">
                    https://tsrm.com/resubmit-slip/token_a7b9x2...
                  </div>
                </div>

                {/* Resubmit Screen Content */}
                <div className="p-6 space-y-4 bg-slate-50">
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-1">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-slate-900">
                      แนบหลักฐานการชำระเงินใหม่
                    </h4>
                    <p className="text-xs text-slate-500">
                      รายการ: การประชุมวิชาการประจำปี 2569 (ยอดชำระ 3,500 บาท)
                    </p>
                  </div>

                  {/* Rejection Notice Banner on the Page */}
                  <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4" />
                      <span>เหตุผลที่ต้องแนบใหม่:</span>
                    </div>
                    <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs sm:text-sm font-semibold text-rose-950 break-words whitespace-pre-wrap leading-relaxed">
                      {displayReason}
                    </div>
                  </div>

                  {/* Mock Dropzone */}
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-white flex flex-col items-center justify-center text-center space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">
                      คลิกเพื่อเลือกไฟล์สลิปใหม่ หรือลากไฟล์มาวางที่นี่
                    </p>
                    <p className="text-[10px] text-slate-400">
                      รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 10MB
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <div className="px-5 py-2.5 rounded-xl bg-[#0026b3] text-white text-xs font-bold">
                      ส่งหลักฐานสลิปใหม่
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN REJECT DIALOG MOCKUP */}
          {activeTab === 'admin_dialog' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      ปฏิเสธสลิปและส่งคำขอให้อัปโหลดใหม่
                    </h4>
                    <p className="text-xs text-slate-500">
                      สลิป #SLIP-69001 (ตัวอย่างการแจ้งเตือน)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    ระบุเหตุผลการปฏิเสธ (ระบบจะดึงค่าเริ่มต้นที่ตั้งไว้มาแสดงอัตโนมัติ):
                  </label>
                  <div className="w-full px-4 py-3 bg-amber-50/50 border-2 border-amber-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                    {displayReason}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * แอดมินสามารถแก้ไขข้อความนี้เฉพาะรายการได้ในหน้าตรวจสอบสลิปก่อนกดยืนยัน
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <span className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">
                    ยกเลิก
                  </span>
                  <span className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 shadow-xs">
                    ยืนยันปฏิเสธสลิป
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>แก้ไขข้อความในฟอร์มข้อ 2. แล้วคลิกปุ่มนี้เพื่อดูตัวอย่างทันที</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
