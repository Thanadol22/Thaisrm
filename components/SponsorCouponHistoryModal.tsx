'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Ticket,
  Building2,
  Calendar,
  Copy,
  Check,
  Users,
  Sparkles,
  Award,
  Crown,
  Medal,
  Clock,
  History,
  Pencil,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { CouponItem } from '@/components/CouponModal';

interface SponsorCouponHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsorName: string;
  sponsorTier?: string;
  coupons: CouponItem[];
  onSelectCouponForUsages?: (coupon: CouponItem) => void;
  onEditCoupon?: (coupon: CouponItem) => void;
  onDeleteCoupon?: (couponId: string, couponCode: string) => void;
}

export function SponsorCouponHistoryModal({
  isOpen,
  onClose,
  sponsorName,
  sponsorTier,
  coupons = [],
  onSelectCouponForUsages,
  onEditCoupon,
  onDeleteCoupon,
}: SponsorCouponHistoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Sort coupons by created_at desc (newest first)
  const sortedCoupons = [...coupons].sort((a, b) => {
    const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
    const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  const totalQuota = sortedCoupons.reduce((sum, c) => sum + (c.max_uses || 0), 0);
  const totalUsed = sortedCoupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden my-auto animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 min-w-0 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-sm">
              <History className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                  ประวัติรหัสคูปองที่เคยสร้าง
                </h3>
                {sponsorTier && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      sponsorTier === 'Platinum'
                        ? 'bg-purple-400/20 text-purple-200 border-purple-300/30'
                        : sponsorTier === 'Gold'
                        ? 'bg-amber-400/20 text-amber-200 border-amber-300/30'
                        : 'bg-white/20 text-white border-white/30'
                    }`}
                  >
                    {sponsorTier === 'Platinum' && <Crown className="w-3 h-3 text-purple-200" />}
                    {sponsorTier === 'Gold' && <Award className="w-3 h-3 text-amber-200" />}
                    {sponsorTier === 'Silver' && <Medal className="w-3 h-3 text-white" />}
                    {sponsorTier}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/90 truncate flex items-center gap-2 mt-0.5 font-medium">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold text-white">{sponsorName}</span>
                <span>•</span>
                <span>สร้างแล้วทั้งหมด {sortedCoupons.length} รหัส</span>
                <span>•</span>
                <span>ใช้สิทธิ์ไปแล้ว {totalUsed} / {totalQuota}</span>
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

        {/* Coupon History List / Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-3">
          {sortedCoupons.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-dashed border-slate-200">
              <Ticket className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">ยังไม่เคยมีการสร้างรหัสคูปองสำหรับบริษัทนี้</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                เมื่อสร้างคูปองใหม่หรือระบบออกรหัสชั่วคราว ประวัติรหัสคูปองทั้งหมดจะถูกบันทึกและแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCoupons.map((coupon, idx) => {
                const isLatest = idx === 0;
                const isCopied = copiedCode === coupon.code;
                const isExpired = coupon.expire_date && new Date(coupon.expire_date) < new Date();
                const isFull = coupon.used_count >= coupon.max_uses;

                // Parse program scope
                let progScopeText = '🎯 การประชุมหลัก (Main Congress)';
                let noteText = coupon.remarks || '';
                try {
                  if (coupon.remarks && coupon.remarks.startsWith('{')) {
                    const parsed = JSON.parse(coupon.remarks);
                    progScopeText = parsed.allPrograms
                      ? '🌐 ทุกโปรแกรม (All Programs)'
                      : (parsed.programs?.join(', ') || '🎯 การประชุมหลัก (Main Congress)');
                    noteText = parsed.note || '';
                  }
                } catch (e) {}

                const createdDateStr = coupon.created_at
                  ? new Date(coupon.created_at).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'ไม่ระบุวันเวลา';

                return (
                  <div
                    key={coupon.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                      isLatest
                        ? 'border-blue-300/90 shadow-sm ring-2 ring-[#0026b3]/10'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Code & Metadata */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isLatest && (
                            <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                              🔥 ล่าสุด (Active)
                            </span>
                          )}

                          {/* Code Pill with Copy */}
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-black text-sm sm:text-base text-[#0026b3] bg-blue-50 px-3 py-1 rounded-xl border border-blue-200/90 tracking-wider">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(coupon.code)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition cursor-pointer"
                              title="คัดลอกรหัสคูปอง"
                            >
                              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Discount Type Badge */}
                          {coupon.discount_type === 'free' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🎁 ฟรี 100%
                            </span>
                          ) : coupon.discount_type === 'percent' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                              ส่วนลด {coupon.discount_value}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              ส่วนลด ฿{coupon.discount_value.toLocaleString()}
                            </span>
                          )}

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              coupon.is_active && !isExpired && !isFull
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isFull ? 'สิทธิ์เต็ม' : isExpired ? 'หมดอายุ' : coupon.is_active ? 'ใช้งานได้' : 'ระงับการใช้'}
                          </span>
                        </div>

                        {/* Meeting & Programs details */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            {coupon.meetings?.meeting_name || coupon.meeting_id}
                          </span>
                          <span>•</span>
                          <span className="text-slate-600 flex items-center gap-1 font-medium">
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                            {progScopeText}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            สร้างเมื่อ: {createdDateStr}
                          </span>
                        </div>

                        {noteText && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 line-clamp-2">
                            💬 {noteText}
                          </p>
                        )}
                      </div>

                      {/* Right: Usages Stats & Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                        {/* Usages Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCouponForUsages) {
                              onSelectCouponForUsages(coupon);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                          title="ดูรายชื่อสมาชิกที่ใช้รหัสนี้"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>ใช้ไป {coupon.used_count} / {coupon.max_uses}</span>
                        </button>

                        {/* Edit Button */}
                        {onEditCoupon && (
                          <button
                            type="button"
                            onClick={() => onEditCoupon(coupon)}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                            title="แก้ไขข้อมูลคูปองนี้"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {onDeleteCoupon && (
                          <button
                            type="button"
                            onClick={() => onDeleteCoupon(coupon.id, coupon.code)}
                            className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition cursor-pointer"
                            title="ลบคูปองนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            รวมทั้งหมด <span className="font-bold text-slate-900">{sortedCoupons.length}</span> รายการคูปอง
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
