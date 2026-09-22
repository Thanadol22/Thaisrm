'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Ticket,
  Building2,
  Calendar,
  Sparkles,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface MeetingOption {
  id?: string;
  meeting_id?: string;
  titleTh?: string;
  meeting_name?: string;
  meeting_date?: string;
  date?: string;
  status?: string;
}

export interface CouponItem {
  id: string;
  code: string;
  company_name: string;
  meeting_id: string;
  discount_type: string;
  discount_value: number;
  applicable_type: string;
  max_uses: number;
  used_count: number;
  expire_date: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at?: string;
  meetings?: {
    meeting_id: string;
    meeting_name: string;
    meeting_date?: string;
  };
}

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: CouponItem | null;
  meetings: MeetingOption[];
  onSaveSuccess: () => void;
}

export function CouponModal({
  isOpen,
  onClose,
  couponToEdit,
  meetings,
  onSaveSuccess,
}: CouponModalProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [code, setCode] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [discountType, setDiscountType] = useState<'free' | 'fixed' | 'percent'>('free');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireDate, setExpireDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to generate concise, readable coupon code
  const generateRandomCode = () => {
    const prefixes = ['TSRM', 'VIP', 'PASS', 'SPON'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear().toString().slice(-2);
    setCode(`${randomPrefix}${year}-${suffix}`);
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (couponToEdit) {
        setCompanyName(couponToEdit.company_name || '');
        setCode(couponToEdit.code || '');
        setMeetingId(couponToEdit.meeting_id || (meetings[0]?.meeting_id || meetings[0]?.id || ''));
        setDiscountType((couponToEdit.discount_type as any) || 'free');
        setDiscountValue(couponToEdit.discount_value || 0);
        setMaxUses(couponToEdit.max_uses || 1);
        setExpireDate(
          couponToEdit.expire_date
            ? new Date(couponToEdit.expire_date).toISOString().split('T')[0]
            : ''
        );
        setIsActive(couponToEdit.is_active !== undefined ? couponToEdit.is_active : true);
        setRemarks(couponToEdit.remarks || '');
      } else {
        setCompanyName('');
        setMeetingId(meetings[0]?.meeting_id || meetings[0]?.id || '');
        setDiscountType('free');
        setDiscountValue(0);
        setMaxUses(1);
        setExpireDate('');
        setIsActive(true);
        setRemarks('');
        generateRandomCode();
      }
    }
  }, [isOpen, couponToEdit, meetings]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!companyName.trim()) {
      setErrorMsg('กรุณาระบุชื่อบริษัท / สปอนเซอร์');
      return;
    }

    if (!code.trim()) {
      setErrorMsg('กรุณากรอกรหัสคูปอง');
      return;
    }

    if (!meetingId) {
      setErrorMsg('กรุณาเลือกรอบการประชุม');
      return;
    }

    if (discountType !== 'free' && (!discountValue || discountValue <= 0)) {
      setErrorMsg('กรุณาระบุมูลค่าส่วนลดที่มากกว่า 0');
      return;
    }

    if (!maxUses || maxUses < 1) {
      setErrorMsg('จำนวนสิทธิ์การใช้งานต้องมีอย่างน้อย 1 สิทธิ์');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_name: companyName.trim(),
        code: code.trim().toUpperCase(),
        meeting_id: meetingId,
        discount_type: discountType,
        discount_value: discountType === 'free' ? 0 : Number(discountValue),
        max_uses: Number(maxUses),
        expire_date: expireDate ? expireDate : null,
        is_active: isActive,
        remarks: remarks.trim() || null,
      };

      const url = couponToEdit ? `/api/coupons/${couponToEdit.id}` : '/api/coupons';
      const method = couponToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกข้อมูลคูปองไม่สำเร็จ');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden my-auto animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                {couponToEdit ? 'แก้ไขข้อมูลคูปองสปอนเซอร์' : 'สร้างคูปองสิทธิ์สปอนเซอร์ใหม่'}
              </h3>
              <p className="text-xs text-blue-200/90 truncate">
                {couponToEdit
                  ? `แก้ไขคูปองรหัส: ${couponToEdit.code}`
                  : 'กำหนดสิทธิ์โควตาและรอบการประชุมสำหรับบริษัทพันธมิตร'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0 relative z-10"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#0026b3]" />
              <span>ชื่อบริษัท / ผู้ให้การสนับสนุน <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="เช่น บจก. ดีเคเอสเอช (ประเทศไทย) / บริษัท ไบเออร์ไทย จำกัด"
              className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-slate-800 font-medium text-xs sm:text-sm focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 transition outline-none bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Meeting Selection */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0026b3]" />
              <span>ผูกกับรอบการประชุม <span className="text-red-500">*</span></span>
            </label>
            <select
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              required
              className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 transition outline-none bg-white cursor-pointer"
            >
              {meetings.map((m) => {
                const mId = m.meeting_id || m.id || '';
                const mName = m.meeting_name || m.titleTh || mId;
                return (
                  <option key={mId} value={mId}>
                    {mName} ({mId})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Coupon Code Input + Random Generator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-[#0026b3]" />
                <span>รหัสคูปอง <span className="text-red-500">*</span></span>
              </label>
              {!couponToEdit && (
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-xs font-bold text-[#0026b3] hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>สุ่มรหัสใหม่</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                disabled={Boolean(couponToEdit)}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, ''))}
                placeholder="เช่น TSRM26-BAYER, VIP-FERRING"
                className={`w-full px-4 py-2.5 sm:py-3 rounded-xl border font-black text-sm sm:text-base tracking-wider transition outline-none uppercase ${
                  couponToEdit
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'border-slate-200 text-[#0026b3] focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 bg-blue-50/30 focus:bg-white'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              รหัสภาษาอังกฤษตัวพิมพ์ใหญ่และตัวเลข ไม่ยาวเกินไปเพื่อให้ผู้เข้าร่วมกรอกได้ง่าย
            </p>
          </div>

          {/* Discount Type Selection */}
          <div className="space-y-2 pt-1">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#0026b3]" />
              <span>รูปแบบสิทธิ์และมูลค่าส่วนลด</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('free');
                  setDiscountValue(0);
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  discountType === 'free'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 font-medium'
                }`}
              >
                <span className="text-xs sm:text-sm">ฟรี 100%</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Free Pass
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  discountType === 'fixed'
                    ? 'bg-blue-50 border-[#0026b3] text-[#0026b3] shadow-2xs ring-2 ring-[#0026b3]/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 font-medium'
                }`}
              >
                <span className="text-xs sm:text-sm">ลดตามจำนวนเงิน</span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded-full">
                  ระบุเป็นบาท
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  discountType === 'percent'
                    ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-2xs ring-2 ring-purple-600/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 font-medium'
                }`}
              >
                <span className="text-xs sm:text-sm">ลดเป็นเปอร์เซ็นต์</span>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-100/80 px-2 py-0.5 rounded-full">
                  ระบุเป็น %
                </span>
              </button>
            </div>
          </div>

          {/* Discount Value input (Only if not full free) */}
          {discountType !== 'free' && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 animate-fade-in">
              <label className="text-xs sm:text-sm font-bold text-slate-700 block">
                {discountType === 'fixed' ? 'มูลค่าส่วนลด (บาท)' : 'เปอร์เซ็นต์ส่วนลด (%)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={discountType === 'percent' ? 100 : 999999}
                  required
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder={discountType === 'fixed' ? 'เช่น 1000' : 'เช่น 20, 50'}
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-slate-900 font-black text-base focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                  {discountType === 'fixed' ? 'THB' : '%'}
                </span>
              </div>
            </div>
          )}

          {/* Quota & Expire Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Max Uses / Quota */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0026b3]" />
                <span>จำนวนสิทธิ์ที่ใช้ได้ <span className="text-red-500">*</span></span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={couponToEdit ? couponToEdit.used_count || 1 : 1}
                  max="10000"
                  required
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-black text-sm focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  สิทธิ์ / คน
                </span>
              </div>
              {couponToEdit && (
                <p className="text-[11px] text-slate-500">
                  ใช้ไปแล้ว: <strong className="text-[#0026b3]">{couponToEdit.used_count}</strong> สิทธิ์
                </p>
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0026b3]" />
                <span>วันหมดอายุ (ถ้ามี)</span>
              </label>
              <input
                type="date"
                value={expireDate}
                onChange={(e) => setExpireDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none bg-white cursor-pointer"
              />
            </div>
          </div>

          {/* Active Status & Remarks */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs sm:text-sm font-bold text-slate-700 block">
              หมายเหตุ / บันทึกช่วยจำ
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="เช่น บูธ Diamond Package 5 สิทธิ์, ติดต่อ คุณสมศรี 081-xxx-xxxx"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Toggle Active Status */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#0026b3] rounded border-slate-300 focus:ring-[#0026b3] cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight">
                  เปิดใช้งานคูปองนี้ทันที
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  หากปิดใช้งาน ผู้เข้าร่วมจะไม่สามารถใช้รหัสนี้ในการลงทะเบียนได้
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{couponToEdit ? 'บันทึกการแก้ไข' : 'ยืนยันสร้างคูปอง'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
