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
  MessageSquare,
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
} from 'lucide-react';

interface MemberDetailModalProps {
  member: Member | any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (member: Member) => void;
  isApplicant?: boolean;
  zIndexClass?: string;
}

export function MemberDetailModal({
  member,
  isOpen,
  onClose,
  onEdit,
  isApplicant = false,
  zIndexClass = 'z-[9999]',
}: MemberDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attendanceInfo, setAttendanceInfo] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isApplicantMode = Boolean(isApplicant || (!member?.member_no && !member?.code && !member?.membership_no));
  const memberNoFormatted = member ? (member.member_no || member.code || member.membership_no || '----') : '----';

  // Normalized fields for both Member and Applicant payloads
  const fullNameTh = member?.full_name_th || member?.fullNameTh || '';
  const fullNameEn = member?.full_name_en || member?.fullNameEn || '';
  const photoUrl = member?.photo_path || member?.photo_url || member?.photoUrl || null;
  const email = member?.email || '';
  const mobile = member?.mobile || member?.phone || '';
  const lineId = member?.line_id || member?.lineId || '';
  const idLast4 = member?.id_last4 || member?.idLast4 || '';
  const address = member?.address || '';
  const workplace = member?.workplace || '';
  const workPhone = member?.work_phone || member?.workPhone || '';
  const position = member?.position || '';
  const jobCategory = member?.job_category || member?.jobCategory || '';
  const jobCategoryOther = member?.job_category_other || member?.jobCategoryOther || '';
  const scientistRegNo = member?.scientist_reg_no || member?.scientist_license_no || member?.scientistLicenseNo || '';
  const startDate = member?.work_start_date || member?.workStartDate || member?.start_date;
  const workCertDoc = member?.work_cert_doc || member?.workCertDoc || null;
  const degreeCertDoc = member?.degree_cert_doc || member?.degreeCertDoc || null;
  const idCardDoc = member?.id_card_doc || member?.idCardDoc || null;
  const educations = member?.educations || [];
  const referees = member?.referees || '';

  React.useEffect(() => {
    if (!member) {
      setQrCodeDataUrl(null);
      setAttendanceInfo(null);
      return;
    }

    if (isApplicantMode) {
      setAttendanceInfo(null);
      return;
    }

    // Fetch attendance evaluation for 4 qualifying meetings
    const memberCode = member.member_no || member.code || member.membership_no;
    if (memberCode) {
      setLoadingAttendance(true);
      fetch(`/api/members/verify/${encodeURIComponent(memberCode)}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.attendanceEvaluation) {
            setAttendanceInfo(res.attendanceEvaluation);
          }
        })
        .catch((err) => console.warn('Failed to load member attendance evaluation:', err))
        .finally(() => setLoadingAttendance(false));
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
  }, [member, isApplicantMode]);

  if (!isOpen || !member || !mounted) return null;

  const memberTypeLabel =
    member.member_type !== undefined && member.member_type !== null && MEMBER_TYPE_LABELS[member.member_type as MemberType]
      ? MEMBER_TYPE_LABELS[member.member_type as MemberType]
      : (jobCategory || position || 'ไม่ระบุ');

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

  // Format Thai Timestamp with full date and time
  const formatTimestamp = (dateInput: any) => {
    if (!dateInput) return '-';
    try {
      if (typeof dateInput === 'string' && !dateInput.includes('-') && !dateInput.includes('/') && !dateInput.includes('T')) {
        return dateInput;
      }
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) {
        return String(dateInput);
      }
      const datePart = d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const hasTime =
        (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes(':'))) ||
        d.getHours() !== 0 ||
        d.getMinutes() !== 0 ||
        d.getSeconds() !== 0;

      if (!hasTime) {
        return datePart;
      }

      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      return `${datePart} ${hours}:${minutes}:${seconds} น.`;
    } catch {
      return '-';
    }
  };

  const rawApplied =
    member?.submittedAt ||
    member?.submitted_at ||
    member?.createdAt ||
    member?.created_at ||
    member?.applied_at ||
    member?.appliedAt ||
    (member?.transferDate ? `${member.transferDate}T${member.transferTime || '00:00:00'}` : null) ||
    null;

  const formattedTimestamp = formatTimestamp(rawApplied);

  const formattedAppliedDate = rawApplied
    ? new Date(rawApplied).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white`}>
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto print:max-h-none print:shadow-none print:border-none">
        
        {/* Header (TSRM Gradient) */}
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-[#4ade80] shrink-0">
              {isApplicantMode ? <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#4ade80]">
                  {isApplicantMode ? 'ข้อมูลคำขอสมัครสมาชิกสมาคม' : 'บัตรประจำตัวสมาชิกสมาคม'}
                </span>
                {!isApplicantMode ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/15 text-white border border-white/20">
                    ID: #{memberNoFormatted}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-200 border border-amber-300/30">
                    คำขอสมัครใหม่
                  </span>
                )}
                {isApplicantMode ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-200 border border-purple-400/30">
                    รอตรวจสอบและอนุมัติ
                  </span>
                ) : member.membership_status ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    member.membership_status.toLowerCase() === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  }`}>
                    {member.membership_status.toLowerCase() === 'active' ? 'ปกติ' : member.membership_status.toLowerCase() === 'inactive' ? 'หมดอายุ' : member.membership_status}
                  </span>
                ) : null}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5 truncate">
                {fullNameTh || 'ข้อมูลผู้สมัครสมาชิก'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 print:hidden shrink-0 ml-2">
            {!isApplicantMode && onEdit && (
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
            {!isApplicantMode && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
                title="พิมพ์บัตรสมาชิก"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">พิมพ์</span>
              </button>
            )}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-6">
          
          {/* Member Virtual Card (Printable) */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#001c8c] to-[#0026b3] p-4 sm:p-6 text-white shadow-xl border border-blue-400/20"
          >
            {/* Background watermarks */}
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <TsrmLogo className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5">
              
              {/* Left Info */}
              <div className="flex items-start gap-3.5 sm:gap-4 w-full md:w-auto min-w-0">
                {/* Photo / Avatar */}
                <MemberAvatar
                  photoUrl={photoUrl}
                  name={fullNameTh || 'TSRM'}
                  size="xl"
                  roundedClassName="rounded-2xl"
                  className="border-2 border-[#4ade80]/50 shadow-lg shrink-0"
                />

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#4ade80] text-slate-950 uppercase tracking-wider">
                      {isApplicantMode ? 'ผู้สมัครสมาชิกใหม่' : memberTypeLabel}
                    </span>
                    <span className="text-xs text-blue-200 font-mono">
                      {isApplicantMode ? 'APPLICANT' : `No. ${memberNoFormatted}`}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    {fullNameTh || 'ไม่ระบุชื่อ'}
                  </h2>
                  {fullNameEn && (
                    <p className="text-xs sm:text-sm font-medium text-blue-100/80">
                      {fullNameEn}
                    </p>
                  )}

                  <div className="text-xs text-blue-100/90 pt-1 flex items-start gap-1.5 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />
                    <span className="break-words line-clamp-2 leading-relaxed">
                      {workplace || 'ไม่ระบุสถานที่ทำงาน'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Section: QR Code (Registered) or Application Info (Applicant) */}
              {!isApplicantMode ? (
                <div className="flex flex-col items-center bg-white p-2.5 rounded-2xl shadow-lg shrink-0 self-center md:self-auto border border-blue-100">
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
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 text-xs space-y-2 w-full md:w-auto shrink-0 min-w-0 md:min-w-[210px]">
                  <div className="flex items-center gap-2 text-blue-100 flex-wrap sm:flex-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                    <span className="font-medium shrink-0">ส่งคำขอ:</span>
                    <span className="font-bold text-white break-words">{formattedTimestamp}</span>
                  </div>
                  {mobile && (
                    <div className="flex items-center gap-2 text-blue-100">
                      <Phone className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                      <span className="font-mono">{mobile}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2 text-blue-100 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                      <span className="font-mono break-all text-xs text-blue-50">{email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card Footer */}
            <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-blue-200/80 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span>ประเภท: {member.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}</span>
                <span>{isApplicantMode ? `วันที่ส่งข้อมูล: ${formattedTimestamp}` : `ขึ้นทะเบียน: ${formattedAppliedDate}`}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. ข้อมูลส่วนตัว & ติดต่อ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0026b3]" />
                <span>ข้อมูลส่วนตัวและการติดต่อ</span>
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs shrink-0">เลขบัตร ปชช. (4 หลักท้าย):</span>
                  <span className="font-mono font-bold text-slate-800 text-right">
                    {idLast4 ? `xxxx-xxxx-${idLast4}` : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs flex items-center gap-1 shrink-0">
                    <Phone className="w-3 h-3 text-slate-400" />
                    เบอร์โทรศัพท์:
                  </span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-semibold text-slate-800 font-mono text-right">
                      {mobile || '-'}
                    </span>
                    {mobile && (
                      <button
                        type="button"
                        onClick={() => handleCopy(mobile, 'mobile')}
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

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs flex items-center gap-1 shrink-0">
                    <Mail className="w-3 h-3 text-slate-400" />
                    อีเมล:
                  </span>
                  <div className="flex items-center gap-1.5 justify-end min-w-0">
                    <span className="font-semibold text-slate-800 break-all text-right text-xs sm:text-sm">
                      {email || '-'}
                    </span>
                    {email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(email, 'email')}
                        className="p-1 rounded text-slate-400 hover:text-[#0026b3] transition cursor-pointer shrink-0"
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

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs flex items-center gap-1 shrink-0">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    LINE ID:
                  </span>
                  <span className="font-semibold text-slate-800 font-mono text-right">
                    {lineId || '-'}
                  </span>
                </div>

                {address && (
                  <div className="py-1.5">
                    <span className="text-slate-500 text-xs block mb-0.5">ที่อยู่:</span>
                    <span className="text-xs text-slate-700 leading-relaxed block break-words">
                      {address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ข้อมูลการทำงานและวิชาชีพ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0026b3]" />
                <span>ข้อมูลการทำงานและวิชาชีพ</span>
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between py-1.5 border-b border-slate-200/60 gap-3">
                  <span className="text-slate-500 text-xs shrink-0 pt-0.5">ตำแหน่ง / สาขาวิชาชีพ:</span>
                  <span className="font-bold text-[#0026b3] text-right text-xs sm:text-sm break-words max-w-[65%] sm:max-w-[70%]">
                    {jobCategory || position || jobCategoryOther || memberTypeLabel || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs shrink-0">ประเภทสมาชิก:</span>
                  <span className="font-bold text-slate-800 text-right text-xs sm:text-sm">
                    {member.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs shrink-0">สถานะ:</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-md text-right ${
                    isApplicantMode
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : member.membership_status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isApplicantMode ? 'รอตรวจสอบและอนุมัติ' : (member.membership_status === 'Active' ? 'ปกติ' : (member.membership_status || 'ไม่ใช้งาน'))}
                  </span>
                </div>

                <div className="flex items-start justify-between py-1.5 border-b border-slate-200/60 gap-3">
                  <span className="text-slate-500 text-xs shrink-0 pt-0.5">สถานที่ทำงาน:</span>
                  <span className="font-semibold text-slate-800 text-right text-xs sm:text-sm break-words max-w-[65%] sm:max-w-[70%]">
                    {workplace || '-'}
                  </span>
                </div>

                {workPhone && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                    <span className="text-slate-500 text-xs shrink-0">โทรศัพท์ที่ทำงาน:</span>
                    <span className="font-mono font-semibold text-slate-800 text-right">
                      {workPhone}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 gap-2">
                  <span className="text-slate-500 text-xs shrink-0">เลขทะเบียนนักวิทยาศาสตร์:</span>
                  <span className="font-mono font-semibold text-slate-800 text-right">
                    {scientistRegNo || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-500 text-xs flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    วันที่เริ่มงาน:
                  </span>
                  <span className="font-semibold text-slate-800 text-right text-xs sm:text-sm">
                    {formattedStartDate}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. สถานะการเข้าร่วมประชุม 4 ครั้งล่าสุด (4 Consecutive Meetings Rule) - แสดงเฉพาะสมาชิกที่ขึ้นทะเบียนแล้ว */}
          {!isApplicantMode && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CalendarCheck2 className="w-4 h-4 text-[#0026b3]" />
                  <span>การคงสถานะสมาชิกตามรอบการประชุมล่าสุด</span>
                </h4>
                {attendanceInfo && (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    attendanceInfo.calculated_status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}>
                    {attendanceInfo.calculated_status === 'Active' ? '✓ สถานะปกติ' : '✕ หมดอายุ (ขาดประชุม 4 ครั้ง)'}
                  </span>
                )}
              </div>

              {loadingAttendance ? (
                <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                  กำลังตรวจสอบประวัติ 4 การประชุมล่าสุด...
                </div>
              ) : attendanceInfo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70 text-xs">
                    <span className="text-slate-600 font-medium">ผลการประเมิน:</span>
                    <span className="font-bold text-slate-800">{attendanceInfo.reason}</span>
                  </div>

                  {attendanceInfo.qualifying_meetings && attendanceInfo.qualifying_meetings.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        รอบการประชุมที่นำมาประเมิน:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attendanceInfo.qualifying_meetings.map((qm: any) => {
                          const isAttended = attendanceInfo.attended_meeting_ids?.includes(qm.meeting_id);
                          const mDate = qm.meeting_date
                            ? new Date(qm.meeting_date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '';

                          return (
                            <div
                              key={qm.meeting_id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                                isAttended
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                  : 'bg-slate-50 border-slate-200/80 text-slate-600'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold truncate">{qm.meeting_name}</div>
                                <div className="text-[10px] opacity-75">{mDate}</div>
                              </div>
                              <div className="shrink-0">
                                {isAttended ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 text-emerald-600" />
                                    เข้าร่วม
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-600">
                                    <XCircle className="w-3 text-slate-400" />
                                    ไม่เข้าร่วม
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  ไม่พบข้อมูลรอบการประชุมที่ต้องประเมิน
                </p>
              )}
            </div>
          )}

          {/* 4. ประวัติการศึกษา */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#0026b3]" />
              <span>ประวัติการศึกษา ({educations?.length || 0} รายการ)</span>
            </h4>

            {educations && educations.length > 0 ? (
              <div className="space-y-2.5">
                {educations.map((edu: any, idx: number) => (
                  <div
                    key={edu.education_id || edu.edu_id || idx}
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

                    {(edu.graduation_year || edu.graduationYear) && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] font-bold text-xs font-mono shrink-0">
                        ปี {edu.graduation_year || edu.graduationYear}
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

          {/* 5. เอกสารหลักฐานประกอบการสมัคร (Attached Application Documents) */}
          {(workCertDoc || degreeCertDoc || idCardDoc) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0026b3]" />
                <span>เอกสารหลักฐานประกอบการสมัคร</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workCertDoc && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        workCertDoc.toLowerCase().includes('.pdf') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">ใบรับรองการทำงาน</div>
                        <div className="text-[10px] text-slate-500">
                          {workCertDoc.toLowerCase().includes('.pdf') ? 'เอกสาร PDF' : 'ไฟล์รูปภาพ'}
                        </div>
                      </div>
                    </div>
                    <a
                      href={workCertDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] font-bold text-xs flex items-center gap-1 transition shrink-0 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เปิดดู</span>
                    </a>
                  </div>
                )}

                {degreeCertDoc && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        degreeCertDoc.toLowerCase().includes('.pdf') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">ปริญญาบัตร</div>
                        <div className="text-[10px] text-slate-500">
                          {degreeCertDoc.toLowerCase().includes('.pdf') ? 'เอกสาร PDF' : 'ไฟล์รูปภาพ'}
                        </div>
                      </div>
                    </div>
                    <a
                      href={degreeCertDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] font-bold text-xs flex items-center gap-1 transition shrink-0 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เปิดดู</span>
                    </a>
                  </div>
                )}

                {idCardDoc && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        idCardDoc.toLowerCase().includes('.pdf') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">สำเนาบัตรประชาชน</div>
                        <div className="text-[10px] text-slate-500">
                          {idCardDoc.toLowerCase().includes('.pdf') ? 'เอกสาร PDF' : 'ไฟล์รูปภาพ'}
                        </div>
                      </div>
                    </div>
                    <a
                      href={idCardDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] font-bold text-xs flex items-center gap-1 transition shrink-0 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เปิดดู</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            {isApplicantMode ? (
              <span>สถานะ: <strong className="text-purple-700">คำขอสมัครสมาชิกใหม่</strong></span>
            ) : (
              <span>รหัสอ้างอิง: <strong className="font-mono text-slate-700">#{member.member_id || memberNoFormatted}</strong></span>
            )}
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
