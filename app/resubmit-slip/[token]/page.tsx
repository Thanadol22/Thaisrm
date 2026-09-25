'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  FileText,
  Building,
  ShieldCheck,
  Check,
  Trash2,
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Eye,
  Edit3,
} from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { uploadImageToStorage } from '@/lib/blobUpload';

interface ResubmitPageProps {
  params: Promise<{ token: string }>;
}

export default function ResubmitSlipPage({ params }: ResubmitPageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slipData, setSlipData] = useState<{
    slipId: string;
    meetingName: string;
    applicantName: string;
    nameTh?: string;
    nameEn?: string;
    email?: string;
    phone?: string;
    workplace?: string;
    position?: string;
    address?: string;
    jobCategory?: string;
    isMember?: boolean;
    isMembershipRegistration?: boolean;
    isGroup?: boolean;
    isCorporate?: boolean;
    companyName?: string;
    amount: number;
    bank?: string;
    transferDate?: string;
    transferTime?: string;
    refNo?: string;
    rejectionReason: string;
    rejectType?: 'info' | 'slip';
    status: string;
    oldSlipUrl: string;
    ticketCode: string;
  } | null>(null);

  // Form states for editing
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [position, setPosition] = useState('');
  const [address, setAddress] = useState('');

  // Slip upload state
  const [useExistingSlip, setUseExistingSlip] = useState(false);
  const [newSlipFile, setNewSlipFile] = useState<File | null>(null);
  const [newSlipUrl, setNewSlipUrl] = useState<string | null>(null);
  const [newSlipName, setNewSlipName] = useState<string>('');
  const [previewOldSlip, setPreviewOldSlip] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchSlipDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payment/resubmit?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setSlipData(d);
          setNameTh(d.nameTh || d.applicantName || '');
          setNameEn(d.nameEn || '');
          setEmail(d.email || '');
          setPhone(d.phone || '');
          setWorkplace(d.workplace || '');
          setPosition(d.position || '');
          setAddress(d.address || '');

          const isInfo = d.rejectType === 'info' || (d.rejectionReason?.includes('ข้อมูล') && !d.rejectionReason?.includes('สลิป'));
          if (isInfo) {
            setUseExistingSlip(true);
          } else {
            setUseExistingSlip(false);
          }
        } else {
          setError(json.error || 'ไม่พบข้อมูลหรือลิงก์หมดอายุแล้ว');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchSlipDetails();
    }
  }, [token]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewSlipFile(file);
      setNewSlipName(file.name);
      const url = URL.createObjectURL(file);
      setNewSlipUrl(url);
      setUseExistingSlip(false);
    }
  };

  const isInfoMode = slipData?.rejectType === 'info' || (slipData?.rejectionReason?.includes('ข้อมูล') && !slipData?.rejectionReason?.includes('สลิป'));
  const isSlipMode = slipData?.rejectType === 'slip' || (!isInfoMode && slipData?.rejectionReason?.includes('สลิป'));

  const handleConfirmResubmit = async () => {
    if (!slipData) return;

    if (isInfoMode) {
      if (slipData.isCorporate) {
        if (!nameTh.trim()) {
          alert('กรุณากรอกชื่อบริษัท / นิติบุคคล');
          return;
        }
        if (!email.trim()) {
          alert('กรุณากรอกอีเมลประสานงาน');
          return;
        }
      } else {
        if (!nameTh.trim()) {
          alert('กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)');
          return;
        }
        if (!email.trim()) {
          alert('กรุณากรอกอีเมล');
          return;
        }
      }
    } else if (isSlipMode) {
      if (!newSlipUrl && !newSlipFile) {
        alert('กรุณาแนบรูปภาพสลิปหลักฐานการชำระเงินใหม่');
        return;
      }
    } else {
      if (!newSlipUrl && !newSlipFile && !useExistingSlip) {
        alert('กรุณาแนบรูปภาพสลิปใหม่ หรือเลือกใช้สลิปเดิมหากต้องการแก้ไขเฉพาะข้อมูล');
        return;
      }
    }

    try {
      setSubmitting(true);

      let finalSlipUrl = slipData.oldSlipUrl;
      if (newSlipFile) {
        const uploadResult = await uploadImageToStorage(newSlipFile, 'slips');
        finalSlipUrl = uploadResult.url;
      } else if (newSlipUrl) {
        finalSlipUrl = newSlipUrl;
      }

      const res = await fetch('/api/payment/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          slipUrl: finalSlipUrl,
          transferDate: new Date().toLocaleDateString('th-TH'),
          transferTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim(),
          email: email.trim(),
          phone: slipData.isCorporate ? '' : phone.trim(),
          workplace: slipData.isCorporate ? nameTh.trim() : workplace.trim(),
          position: position.trim(),
          address: address.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsSuccess(true);
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#0026b3]/30 border-t-[#0026b3] rounded-full animate-spin" />
        <p className="mt-4 text-sm font-bold text-slate-600">กำลังโหลดข้อมูลการลงทะเบียน...</p>
      </div>
    );
  }

  if (error || !slipData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'ไม่พบรายการที่ต้องแก้ไขข้อมูล หรือรายการนี้ได้รับการอนุมัติเรียบร้อยแล้ว'}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#0026b3] text-white py-3 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">บันทึกข้อมูลเรียบร้อยแล้ว</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              ระบบได้ปรับปรุงข้อมูลที่แก้ไขและส่งเข้าสู่คิวรอตรวจสอบของเจ้าหน้าที่แล้ว ท่านจะได้รับอีเมลยืนยันผลเมื่อเจ้าหน้าที่ตรวจสอบเสร็จสิ้น
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสอ้างอิง:</span>
              <span className="font-bold text-[#0026b3]">{slipData.ticketCode || slipData.slipId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">รายการ:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{slipData.meetingName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                {slipData.isCorporate ? 'บริษัท / นิติบุคคล:' : 'ชื่อผู้สมัคร:'}
              </span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{nameTh}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                {slipData.isCorporate ? 'อีเมลประสานงาน:' : 'อีเมล:'}
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]">{email}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#0026b3] text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition shadow-md cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-5">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <TsrmLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-blue-200 block leading-tight">
                สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)
              </span>
              <h1 className="font-black text-white text-base sm:text-xl tracking-tight leading-tight mt-0.5">
                {isInfoMode
                  ? 'ตรวจสอบและแก้ไขข้อมูลการลงทะเบียน'
                  : isSlipMode
                  ? 'แบบฟอร์มแนบหลักฐานสลิปการโอนเงินใหม่'
                  : 'ตรวจสอบและแก้ไขข้อมูลการลงทะเบียน'}
              </h1>
            </div>
          </div>
        </div>

        {/* Rejection Alert Box */}
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>เหตุผล / รายละเอียดที่เจ้าหน้าที่แจ้งกลับ</span>
          </div>
          <div className="text-xs sm:text-sm text-rose-950 font-bold bg-white/90 p-3.5 rounded-2xl border border-rose-200 leading-relaxed break-words whitespace-pre-wrap">
            {slipData.rejectionReason || (isInfoMode ? 'ข้อมูลไม่ถูกต้อง กรุณาแก้ไขข้อมูล' : 'สลิปไม่ถูกต้อง กรุณาแนบสลิปใหม่')}
          </div>
          <p className="text-[11px] text-rose-700/80 font-medium">
            {isInfoMode
              ? '* กรุณาตรวจสอบและแก้ไขข้อมูลในแบบฟอร์มด้านล่างให้ถูกต้อง จากนั้นกดยืนยันเพื่อส่งให้เจ้าหน้าที่ตรวจสอบใหม่ (ไม่ต้องแนบสลิปใหม่ครับ)'
              : isSlipMode
              ? '* กรุณาแนบรูปภาพหลักฐานการโอนเงิน (สลิป) ใหม่ที่มียอดเงินและรายละเอียดถูกต้องด้านล่าง'
              : '* กรุณาตรวจสอบและแก้ไขข้อมูลในฟอร์มด้านล่างให้ถูกต้อง หรือแนบหลักฐานการโอนเงินใหม่'}
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0026b3]" />
              <span>รายการลงทะเบียน</span>
            </h3>
            {slipData.ticketCode && (
              <span className="bg-blue-50 text-[#0026b3] text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 font-mono">
                {slipData.ticketCode}
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">ชื่องาน / รายการ:</span>
              <span className="font-bold text-slate-900 text-right max-w-[280px] sm:max-w-none">
                {slipData.meetingName}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">
                {slipData.isCorporate ? 'บริษัท / นิติบุคคล:' : 'ชื่อผู้ลงทะเบียน:'}
              </span>
              <span className="font-bold text-slate-900 text-right">
                {slipData.isCorporate ? (slipData.companyName || slipData.applicantName) : slipData.applicantName}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">ยอดเงินที่ต้องชำระ:</span>
              <span className="font-extrabold text-[#0026b3] text-sm">฿ {slipData.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Editable Information Form (แสดงเมื่อเป็น Info Mode หรือโหมดทั่วไป) */}
        {!isSlipMode && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>
                  {slipData.isCorporate
                    ? 'แบบฟอร์มตรวจสอบและแก้ไขข้อมูลบริษัท / นิติบุคคล'
                    : 'แบบฟอร์มแก้ไขข้อมูลผู้ลงทะเบียน'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">แก้ไขข้อมูลที่ผิดพลาดได้ทันที</span>
            </div>

            {slipData.isCorporate ? (
              /* กรณีบริษัท / สปอนเซอร์: แสดงเฉพาะข้อมูลบริษัท ไม่นำเบอร์โทรคนสมัครมาปนเด็ดขาด */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>ชื่อบริษัท / องค์กร / นิติบุคคล <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    placeholder="ระบุชื่อบริษัท / องค์กร"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>อีเมลประสานงานบริษัท / ผู้รับเอกสาร <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company@mail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>
              </div>
            ) : (
              /* กรณีบุคคลทั่วไป / สมาชิกเดี่ยว */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name TH */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>ชื่อ - นามสกุล (ภาษาไทย) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    placeholder="ระบุชื่อ-นามสกุล ภาษาไทย"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Full Name EN */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>ชื่อ - นามสกุล (ภาษาอังกฤษ)</span>
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Full Name (English)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>อีเมล (Email) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Workplace */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>หน่วยงาน / โรงพยาบาล / สถานที่ทำงาน <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="ชื่อโรงพยาบาล หรือหน่วยงานต้นสังกัด"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>ตำแหน่ง / สาขาวิชาชีพ</span>
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="เช่น แพทย์, พยาบาล, นักวิทยาศาสตร์"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>ที่อยู่จัดส่งเอกสาร / ใบเสร็จ</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ที่อยู่สำหรับจัดส่งเอกสาร"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload New Slip Section หรือ กล่องยืนยันสลิปเดิม (กรณี Info Mode) */}
        {isInfoMode ? (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>หลักฐานการโอนเงิน (สลิป)</span>
              </h3>
              {slipData.oldSlipUrl && slipData.oldSlipUrl !== 'PAY_LATER' && (
                <button
                  type="button"
                  onClick={() => setPreviewOldSlip(!previewOldSlip)}
                  className="text-xs font-bold text-[#0026b3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewOldSlip ? 'ซ่อนสลิปเดิม' : 'ดูสลิปเดิม'}</span>
                </button>
              )}
            </div>

            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-black text-xs text-emerald-950">หลักฐานการโอนเงินถูกต้องแล้ว</p>
                  <p className="text-[11px] text-emerald-700/90 font-normal mt-0.5">
                    ระบบจะใช้สลิปการโอนเงินเดิมของท่าน ท่านเพียงแก้ไขข้อมูลในแบบฟอร์มด้านบนให้ถูกต้อง แล้วกดยืนยันได้ทันที
                  </p>
                </div>
              </div>
            </div>

            {/* Preview of Old Slip */}
            {previewOldSlip && slipData.oldSlipUrl && slipData.oldSlipUrl !== 'PAY_LATER' && (
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 space-y-2 animate-fade-in">
                <div className="flex justify-center bg-slate-900 rounded-xl overflow-hidden max-h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipData.oldSlipUrl} alt="Old Slip" className="max-h-56 object-contain" />
                </div>
              </div>
            )}

            {/* Optional change slip */}
            {newSlipUrl ? (
              <div className="space-y-3 pt-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newSlipUrl} alt="New Slip" className="max-h-64 object-contain" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate font-semibold">{newSlipName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSlipUrl(null);
                      setNewSlipName('');
                      setNewSlipFile(null);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยกเลิกรูปใหม่</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <label className="text-[11px] text-slate-500 hover:text-[#0026b3] underline font-semibold cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ต้องการเปลี่ยนรูปสลิปใหม่ด้วย (ไม่บังคับ) คลิกที่นี่</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Confirm Button for Info Mode */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmResubmit}
              className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition mt-4 ${
                !submitting
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกข้อมูลที่แก้ไข...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>💾 ยืนยันบันทึกข้อมูลที่แก้ไข & ส่งตรวจสอบใหม่</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Slip Upload Mode หรือ Default */
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0026b3]" />
                <span>แบบฟอร์มแนบหลักฐานสลิปการโอนเงินใหม่</span>
              </h3>
              {slipData.oldSlipUrl && slipData.oldSlipUrl !== 'PAY_LATER' && (
                <button
                  type="button"
                  onClick={() => setPreviewOldSlip(!previewOldSlip)}
                  className="text-xs font-bold text-[#0026b3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewOldSlip ? 'ซ่อนสลิปเดิม' : 'ดูสลิปเดิม'}</span>
                </button>
              )}
            </div>

            {/* Preview of Old Slip */}
            {previewOldSlip && slipData.oldSlipUrl && slipData.oldSlipUrl !== 'PAY_LATER' && (
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>สลิปเดิมที่เคยแนบไว้:</span>
                </div>
                <div className="flex justify-center bg-slate-900 rounded-xl overflow-hidden max-h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipData.oldSlipUrl} alt="Old Slip" className="max-h-56 object-contain" />
                </div>
              </div>
            )}

            {/* New Slip Uploaded or Selected */}
            {newSlipUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newSlipUrl} alt="New Slip" className="max-h-64 object-contain" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate font-semibold">{newSlipName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSlipUrl(null);
                      setNewSlipName('');
                      setNewSlipFile(null);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>เปลี่ยนรูปสลิป</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-rose-300 hover:border-[#0026b3] rounded-3xl p-7 flex flex-col items-center justify-center cursor-pointer bg-rose-50/30 hover:bg-blue-50/30 transition group">
                  <Upload className="w-8 h-8 text-rose-500 group-hover:text-[#0026b3] group-hover:scale-110 transition mb-2" />
                  <p className="text-xs font-bold text-slate-700 group-hover:text-[#0026b3]">
                    คลิกเพื่อเลือกไฟล์รูปภาพสลิปการโอนเงินใหม่
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">รองรับ JPG, PNG (ขนาดไม่เกิน 10MB)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Confirm Button for Slip Mode */}
            <button
              type="button"
              disabled={submitting || (!newSlipUrl && !newSlipFile)}
              onClick={handleConfirmResubmit}
              className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition mt-4 ${
                (newSlipUrl || newSlipFile) && !submitting
                  ? 'bg-gradient-to-r from-[#0026b3] to-[#0055ff] hover:from-[#001f8f] hover:to-[#0040cc] text-white cursor-pointer active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>กำลังอัปโหลดสลิปใหม่และบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>📤 ยืนยันการแนบสลิปใหม่ & ส่งให้เจ้าหน้าที่ตรวจสอบ</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
