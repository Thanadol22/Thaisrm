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
} from 'lucide-react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
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
    amount: number;
    rejectionReason: string;
    status: string;
    oldSlipUrl: string;
    ticketCode: string;
  } | null>(null);

  const [newSlipFile, setNewSlipFile] = useState<File | null>(null);
  const [newSlipUrl, setNewSlipUrl] = useState<string | null>(null);
  const [newSlipName, setNewSlipName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchSlipDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payment/resubmit?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (json.success) {
          setSlipData(json.data);
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
    }
  };

  const handleConfirmResubmit = async () => {
    if (!newSlipUrl && !newSlipFile) return;

    try {
      setSubmitting(true);

      let finalSlipUrl = newSlipUrl || '';
      if (newSlipFile) {
        const uploadResult = await uploadImageToStorage(newSlipFile, 'slips');
        finalSlipUrl = uploadResult.url;
      }

      const res = await fetch('/api/payment/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          slipUrl: finalSlipUrl,
          transferDate: new Date().toLocaleDateString('th-TH'),
          transferTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsSuccess(true);
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการส่งหลักฐาน');
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
            {error || 'ไม่พบรายการที่ต้องแนบสลิปใหม่ หรือรายการนี้ได้รับการอนุมัติเรียบร้อยแล้ว'}
          </p>
          <button
            onClick={() => router.push('/agenda')}
            className="w-full bg-[#0026b3] text-white py-3 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition"
          >
            กลับสู่หน้ารายละเอียดการประชุม
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">แนบสลิปใหม่เรียบร้อยแล้ว</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              ระบบได้ส่งหลักฐานการชำระเงินใหม่เข้าสู่คิวรอตรวจสอบของเจ้าหน้าที่แล้ว ท่านจะได้รับอีเมลยืนยันผลเมื่อเจ้าหน้าที่ตรวจสอบเสร็จสิ้น
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสอ้างอิง:</span>
              <span className="font-bold text-slate-800">{slipData.ticketCode || slipData.slipId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">งานประชุม:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{slipData.meetingName}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/agenda')}
            className="w-full bg-[#0026b3] text-white py-3 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition shadow-md"
          >
            กลับสู่หน้ารายละเอียดการประชุม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <ThaiSrmLogo className="w-9 h-9" />
            <div>
              <span className="text-[10px] font-bold text-blue-200 uppercase block leading-tight">
                สมาคมเวชศาสตร์การเจริญพันธุ์ไทย
              </span>
              <span className="font-extrabold text-white text-sm tracking-wide block">
                แนบสลิปการโอนเงินใหม่ (Resubmit Slip)
              </span>
            </div>
          </div>
        </div>

        {/* Reason Alert Card */}
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>เหตุผลที่ต้องแนบสลิปใหม่จากเจ้าหน้าที่</span>
          </div>
          <p className="text-xs text-rose-900 font-semibold bg-white/80 p-3 rounded-2xl border border-rose-200">
            {slipData.rejectionReason || 'โปรดแนบสลิปที่มียอดเงินและรายละเอียดที่ถูกต้อง'}
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm">ข้อมูลการลงทะเบียนประชุม</h3>
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">งานประชุม:</span>
              <span className="font-bold text-slate-900 text-right">{slipData.meetingName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">ชื่อผู้ลงทะเบียน:</span>
              <span className="font-bold text-slate-900">{slipData.applicantName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">ยอดเงินที่ต้องชำระ:</span>
              <span className="font-extrabold text-[#0026b3] text-sm">฿ {slipData.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Upload New Slip Section */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm">แนบหลักฐานสลิปการโอนเงินใหม่</h3>

          {newSlipUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
                <img src={newSlipUrl} alt="New Slip" className="max-h-64 object-contain" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate font-semibold">{newSlipName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewSlipUrl(null);
                    setNewSlipName('');
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>เปลี่ยนรูปสลิป</span>
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 hover:border-[#0026b3] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/30 transition group">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#0026b3] group-hover:scale-110 transition mb-2" />
              <p className="text-xs font-bold text-slate-700 group-hover:text-[#0026b3]">
                คลิกเพื่อเลือกไฟล์รูปภาพสลิปใหม่
              </p>
              <p className="text-[11px] text-slate-400 mt-1">รองรับ JPG, PNG (ขนาดไม่เกิน 10MB)</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          <button
            type="button"
            disabled={!newSlipUrl || submitting}
            onClick={handleConfirmResubmit}
            className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition ${
              newSlipUrl && !submitting
                ? 'bg-gradient-to-r from-[#0026b3] to-[#0055ff] hover:from-[#001f8f] hover:to-[#0040cc] text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งหลักฐาน...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ยืนยันการแนบสลิปใหม่</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
