'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Member, MEMBER_TYPE_LABELS, MemberType } from '@/types/member';
import { TsrmLogo } from '@/components/TsrmLogo';
import { MemberAvatar } from '@/components/MemberAvatar';
import QRCode from 'qrcode';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  GraduationCap,
  QrCode,
  Download,
  Printer,
  Calendar,
  Sparkles,
  ShieldCheck,
  Edit3,
  Copy,
  Check,
  MessageSquare
} from 'lucide-react';

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void;
}

export function MemberDetailModal({
  member,
  isOpen,
  onClose,
  onEdit,
}: MemberDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const memberNoFormatted = member ? (member.member_no || member.code || member.membership_no || '----') : '----';

  React.useEffect(() => {
    if (!member) {
      setQrCodeDataUrl(null);
      return;
    }

    if (member.qr_code_path && member.qr_code_path.startsWith('data:image/')) {
      setQrCodeDataUrl(member.qr_code_path);
    } else {
      const codePayload = member.member_no || member.code || member.membership_no || member.member_id || 'TSRM-MEMBER';
      QRCode.toDataURL(codePayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: {
          dark: '#001c8c',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error('Error generating QR code:', err);
          if (member.qr_code_path) setQrCodeDataUrl(member.qr_code_path);
        });
    }
  }, [member]);

  if (!isOpen || !member || !mounted) return null;

  const memberTypeLabel =
    member.member_type !== undefined && member.member_type !== null && MEMBER_TYPE_LABELS[member.member_type as MemberType]
      ? MEMBER_TYPE_LABELS[member.member_type as MemberType]
      : member.job_category || 'ไม่ระบุ';

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQr = () => {
    const downloadSrc = qrCodeDataUrl || member.qr_code_path;
    if (!downloadSrc) return;
    const link = document.createElement('a');
    link.href = downloadSrc;
    link.download = `TSRM-QR-${memberNoFormatted}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedAppliedDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  const formattedStartDate = member.start_date
    ? new Date(member.start_date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto print:max-h-none print:shadow-none print:border-none">
        
        {/* Header (TSRM Gradient) */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-[#4ade80]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#4ade80]">
                  บัตรประจำตัวสมาชิกสมาคม
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/15 text-white border border-white/20">
                  ID: #{memberNoFormatted}
                </span>
                {member.membership_status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    member.membership_status.toLowerCase() === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  }`}>
                    {member.membership_status.toLowerCase() === 'active' ? 'ปกติ' : member.membership_status.toLowerCase() === 'inactive' ? 'หมดอายุ' : member.membership_status}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                {member.full_name_th || 'ข้อมูลสมาชิก'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 print:hidden">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(member);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">แก้ไข</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
              title="พิมพ์บัตรสมาชิก"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* Member Virtual Card (Printable) */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#001c8c] to-[#0026b3] p-5 sm:p-6 text-white shadow-xl border border-blue-400/20"
          >
            {/* Background watermarks */}
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <TsrmLogo className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              
              {/* Left Info */}
              <div className="flex items-start gap-4">
                {/* Photo / Avatar */}
                <MemberAvatar
                  photoUrl={member.photo_path}
                  name={member.full_name_th}
                  size="2xl"
                  roundedClassName="rounded-2xl"
                  className="border-2 border-[#4ade80]/50 shadow-lg shrink-0"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#4ade80] text-slate-950 uppercase tracking-wider">
                      {memberTypeLabel}
                    </span>
                    <span className="text-xs text-blue-200 font-mono">
                      No. {memberNoFormatted}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    {member.full_name_th}
                  </h2>
                  {member.full_name_en && (
                    <p className="text-xs sm:text-sm font-medium text-blue-100/80">
                      {member.full_name_en}
                    </p>
                  )}

                  <div className="text-xs text-blue-100/90 pt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                    <span className="truncate max-w-[240px] sm:max-w-sm">
                      {member.workplace || 'ไม่ระบุสถานที่ทำงาน'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right QR Code Section */}
              <div className="flex flex-col items-center bg-white p-2.5 rounded-2xl shadow-lg shrink-0 self-center sm:self-auto border border-blue-100">
                {qrCodeDataUrl || member.qr_code_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl || member.qr_code_path || ''}
                    alt={`QR Code ${memberNoFormatted}`}
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-slate-50 rounded-lg">
                    <QrCode className="w-10 h-10 text-slate-300 animate-pulse" />
                  </div>
                )}
                <span className="text-[11px] font-black font-mono text-[#0026b3] mt-1 tracking-wider">
                  #{memberNoFormatted}
                </span>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="mt-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-[#0026b3] transition cursor-pointer print:hidden shadow-2xs active:scale-95"
                  title="ดาวน์โหลดไฟล์รูป QR Code"
                >
                  <Download className="w-3 h-3" />
                  <span>บันทึก QR</span>
                </button>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-blue-200/80 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)</span>
              </div>
              <div className="flex items-center gap-3">
                {member.membership_type && (
                  <span>ประเภท: {member.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}</span>
                )}
                <span>ขึ้นทะเบียน: {formattedAppliedDate}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. ข้อมูลส่วนตัว & ติดต่อ */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0026b3]" />
                <span>ข้อมูลส่วนตัวและการติดต่อ</span>
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">เลขบัตร ปชช. (4 หลักท้าย):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {member.id_last4 ? `xxxx-xxxx-${member.id_last4}` : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    เบอร์โทรศัพท์:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 font-mono">
                      {member.mobile || '-'}
                    </span>
                    {member.mobile && (
                      <button
                        type="button"
                        onClick={() => handleCopy(member.mobile!, 'mobile')}
                        className="p-1 rounded text-slate-400 hover:text-[#0026b3] transition cursor-pointer"
                        title="คัดลอกเบอร์โทร"
                      >
                        {copiedField === 'mobile' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    อีเมล:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                      {member.email || '-'}
                    </span>
                    {member.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(member.email!, 'email')}
                        className="p-1 rounded text-slate-400 hover:text-[#0026b3] transition cursor-pointer"
                        title="คัดลอกอีเมล"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    LINE ID:
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {member.line_id || '-'}
                  </span>
                </div>

                {member.address && (
                  <div className="py-1">
                    <span className="text-slate-500 text-xs block mb-0.5">ที่อยู่:</span>
                    <span className="text-xs text-slate-700 leading-relaxed block">
                      {member.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ข้อมูลการทำงานและวิชาชีพ */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0026b3]" />
                <span>ข้อมูลการทำงานและวิชาชีพ</span>
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">ตำแหน่ง / สาขาวิชาชีพ:</span>
                  <span className="font-bold text-[#0026b3]">
                    {member.job_category || member.position || memberTypeLabel || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">ประเภทสมาชิก:</span>
                  <span className="font-bold text-slate-800">
                    {member.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">สถานะสมาชิก:</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                    member.membership_status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {member.membership_status === 'Active' ? 'ปกติ' : (member.membership_status || 'ไม่ใช้งาน')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">สถานที่ทำงาน:</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                    {member.workplace || '-'}
                  </span>
                </div>

                {member.work_phone && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">โทรศัพท์ที่ทำงาน:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {member.work_phone}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">เลขทะเบียนนักวิทยาศาสตร์:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {member.scientist_reg_no || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    วันที่เริ่มงาน:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formattedStartDate}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. ประวัติการศึกษา */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#0026b3]" />
              <span>ประวัติการศึกษา ({member.educations?.length || 0} รายการ)</span>
            </h4>

            {member.educations && member.educations.length > 0 ? (
              <div className="space-y-2.5">
                {member.educations.map((edu, idx) => (
                  <div
                    key={edu.education_id || idx}
                    className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-start justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {edu.degree || 'ไม่ระบุชื่อวุฒิ'}
                      </div>
                      <div className="text-slate-600 flex items-center gap-1.5 text-xs">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{edu.institution || 'ไม่ระบุสถาบัน'}</span>
                      </div>
                    </div>

                    {edu.graduation_year && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] font-bold text-xs font-mono shrink-0">
                        ปี {edu.graduation_year}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                ยังไม่มีข้อมูลประวัติการศึกษา
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            รหัสอ้างอิง: <span className="font-mono font-bold text-slate-700">#{member.member_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
