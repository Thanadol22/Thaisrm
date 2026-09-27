'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  RotateCw,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  Download,
} from 'lucide-react';
import { CouponItem } from '@/components/CouponModal';

interface UsageRecord {
  id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string | null;
  workplace?: string | null;
  member_no?: string | null;
  ticket_code?: string | null;
  discount_applied: number;
  final_amount: number;
  used_at: string;
}

interface SponsorCouponHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsorName: string;
  sponsorTier?: string;
  coupons?: CouponItem[];
  onSelectCouponForUsages?: (coupon: CouponItem) => void;
  onEditCoupon?: (coupon: CouponItem) => void;
  onDeleteCoupon?: (couponId: string, couponCode: string) => void;
  onQuotaRefunded?: () => void;
}

export function SponsorCouponHistoryModal({
  isOpen,
  onClose,
  sponsorName,
  sponsorTier,
  coupons: initialCoupons = [],
  onSelectCouponForUsages,
  onEditCoupon,
  onDeleteCoupon,
  onQuotaRefunded,
}: SponsorCouponHistoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [allCoupons, setAllCoupons] = useState<CouponItem[]>(initialCoupons);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Expandable usage details per coupon
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);
  const [couponUsagesMap, setCouponUsagesMap] = useState<Record<string, UsageRecord[]>>({});
  const [loadingUsagesMap, setLoadingUsagesMap] = useState<Record<string, boolean>>({});
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all coupons for this sponsor across all meetings
  const fetchSponsorCoupons = useCallback(async () => {
    if (!sponsorName.trim()) return;
    setLoadingCoupons(true);
    try {
      const res = await fetch(`/api/coupons?search=${encodeURIComponent(sponsorName.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter strictly by company name match
        const exactMatches = data.data.filter(
          (c: CouponItem) =>
            (c.company_name || '').toLowerCase().trim() === sponsorName.toLowerCase().trim()
        );
        setAllCoupons(exactMatches.length > 0 ? exactMatches : data.data);
      }
    } catch (err) {
      console.error('Error fetching sponsor coupons history:', err);
    } finally {
      setLoadingCoupons(false);
    }
  }, [sponsorName]);

  useEffect(() => {
    if (isOpen && sponsorName) {
      setAllCoupons(initialCoupons);
      fetchSponsorCoupons();
    }
  }, [isOpen, sponsorName, fetchSponsorCoupons, initialCoupons]);

  // Load usages for a specific coupon
  const loadCouponUsages = async (couponId: string) => {
    setLoadingUsagesMap((prev) => ({ ...prev, [couponId]: true }));
    try {
      const res = await fetch(`/api/coupons/${couponId}`);
      const data = await res.json();
      if (data.success && data.data?.usages) {
        setCouponUsagesMap((prev) => ({ ...prev, [couponId]: data.data.usages }));
        // Also update used_count in allCoupons if needed
        setAllCoupons((prev) =>
          prev.map((c) =>
            c.id === couponId
              ? { ...c, used_count: Math.max(c.used_count || 0, data.data.usages.length) }
              : c
          )
        );
      }
    } catch (err) {
      console.error(`Error loading usages for coupon ${couponId}:`, err);
    } finally {
      setLoadingUsagesMap((prev) => ({ ...prev, [couponId]: false }));
    }
  };

  const toggleExpandCoupon = (coupon: CouponItem) => {
    if (expandedCouponId === coupon.id) {
      setExpandedCouponId(null);
    } else {
      setExpandedCouponId(coupon.id);
      if (!couponUsagesMap[coupon.id]) {
        loadCouponUsages(coupon.id);
      }
    }
  };

  const handleRevokeUsage = async (couponId: string, u: UsageRecord) => {
    const confirmMsg = `ยืนยันการยกเลิกและคืนสิทธิ์คูปองของ "${u.attendee_name}" ใช่หรือไม่?\n\n- สิทธิ์คูปองจะกลับมาเพิ่มขึ้น 1 สิทธิ์\n- สถานะการลงทะเบียนจะถูกยกเลิก`;
    if (!confirm(confirmMsg)) return;

    setRevokingId(u.id);
    try {
      const res = await fetch('/api/coupons/usages/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usageId: u.id,
          cancelAttendance: true,
          reason: 'ผู้ดูแลระบบยกเลิกการลงทะเบียนและคืนสิทธิ์คูปองจากหน้าประวัติ',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถคืนสิทธิ์ได้');
      }

      alert(data.message || 'คืนสิทธิ์โควตาคูปองสำเร็จแล้ว');
      await loadCouponUsages(couponId);
      await fetchSponsorCoupons();
      if (onQuotaRefunded) onQuotaRefunded();
    } catch (err: any) {
      console.error('Error revoking quota:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการคืนสิทธิ์');
    } finally {
      setRevokingId(null);
    }
  };

  if (!isOpen || !mounted) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Sort coupons by created_at desc (newest first)
  const sortedCoupons = [...allCoupons].sort((a, b) => {
    const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
    const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  const activeCoupon = sortedCoupons.find((c) => c.is_active) || sortedCoupons[0];
  const totalUsed = activeCoupon?.used_seats !== undefined
    ? activeCoupon.used_seats
    : sortedCoupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
  const totalQuota = activeCoupon?.quota_seats !== undefined && activeCoupon.quota_seats > 0
    ? activeCoupon.quota_seats
    : Math.max(totalUsed, ...sortedCoupons.map((c) => c.max_uses || 0), 0);
  const activeRemaining = Math.max(0, totalQuota - totalUsed);

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
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                      sponsorTier === 'Platinum'
                        ? 'bg-purple-400/20 text-purple-200 border-purple-300/30'
                        : sponsorTier === 'Gold'
                        ? 'bg-amber-400/20 text-amber-200 border-amber-300/30'
                        : 'bg-white/20 text-white border-white/30'
                    }`}
                  >
                    {sponsorTier === 'Platinum' && <Crown className="w-3.5 h-3.5 text-purple-200" />}
                    {sponsorTier === 'Gold' && <Award className="w-3.5 h-3.5 text-amber-200" />}
                    {sponsorTier === 'Silver' && <Medal className="w-3.5 h-3.5 text-white" />}
                    {sponsorTier}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/90 truncate flex items-center gap-2 mt-1 font-medium flex-wrap">
                <span className="flex items-center gap-1 font-bold text-white">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {sponsorName}
                </span>
                <span>•</span>
                <span>สร้างแล้วทั้งหมด {sortedCoupons.length} รหัส</span>
                <span>•</span>
                <span className="text-amber-300 font-bold">
                  ใช้สิทธิ์ไปแล้ว {totalUsed} / {totalQuota} {activeRemaining > 0 ? `(คงเหลือ ${activeRemaining} สิทธิ์)` : '(ใช้สิทธิ์ครบแล้ว)'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              type="button"
              onClick={fetchSponsorCoupons}
              disabled={loadingCoupons}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="โหลดประวัติใหม่"
            >
              <RotateCw className={`w-4 h-4 ${loadingCoupons ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Coupon History List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-3.5">
          {loadingCoupons && sortedCoupons.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-[#0026b3] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">กำลังโหลดประวัติคูปองทั้งหมด...</p>
            </div>
          ) : sortedCoupons.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-dashed border-slate-200">
              <Ticket className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">ยังไม่เคยมีการสร้างรหัสคูปองสำหรับบริษัทนี้</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                เมื่อสร้างคูปองใหม่หรือระบบออกรหัสชั่วคราว ประวัติรหัสคูปองทั้งหมดจะถูกบันทึกและแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {sortedCoupons.map((coupon, idx) => {
                const isLatest = idx === 0;
                const isCopied = copiedCode === coupon.code;
                const isExpired = coupon.expire_date && new Date(coupon.expire_date) < new Date();
                const isFull = (coupon.used_count || 0) >= (coupon.max_uses || 1);
                const isExpanded = expandedCouponId === coupon.id;
                const couponUsages = couponUsagesMap[coupon.id] || [];
                const isUsagesLoading = loadingUsagesMap[coupon.id] || false;

                // Parse program scope & clean up Rule #11 English parentheses
                let progScopeText = 'การประชุมหลัก';
                let noteText = coupon.remarks || '';
                try {
                  if (coupon.remarks && coupon.remarks.startsWith('{')) {
                    const parsed = JSON.parse(coupon.remarks);
                    const rawPrograms = parsed.programs || [];
                    const cleanedPrograms = rawPrograms.map((p: string) =>
                      p.replace(/\s*\(Main Congress\)/gi, '')
                    );
                    progScopeText = parsed.allPrograms
                      ? 'ทุกโปรแกรม'
                      : (cleanedPrograms.join(', ') || 'การประชุมหลัก');
                    noteText = parsed.note || '';
                  } else if (coupon.remarks) {
                    noteText = coupon.remarks.replace(/\s*\(Main Congress\)/gi, '');
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
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isLatest
                        ? 'border-blue-300 shadow-sm ring-2 ring-[#0026b3]/10'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Code & Metadata */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isLatest ? (
                              <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                                🔥 ล่าสุด / รหัสปัจจุบัน
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                📜 รหัสก่อนหน้า
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
                              {coupon.is_active
                                ? (isFull ? 'สิทธิ์เต็ม' : isExpired ? 'หมดอายุ' : 'ใช้งานได้')
                                : (isFull ? 'สิทธิ์เต็ม' : isLatest ? 'ระงับการใช้' : 'หมุนเวียนรหัสแล้ว')}
                            </span>
                          </div>

                          {/* Meeting & Programs details */}
                          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap pt-0.5">
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
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 flex-wrap justify-end">
                          {/* Toggle Expand Attendee Usages Button */}
                          {(() => {
                            const rowUsed = isLatest && coupon.used_seats !== undefined ? coupon.used_seats : (coupon.used_count || 0);
                            const rowMax = isLatest && coupon.quota_seats !== undefined && coupon.quota_seats > 0 ? coupon.quota_seats : coupon.max_uses;

                            return (
                              <button
                                type="button"
                                onClick={() => toggleExpandCoupon(coupon)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : rowUsed > 0
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                                title="ดูรายชื่อสมาชิกและประวัติการใช้สิทธิ์รหัสนี้"
                              >
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                <span>ใช้ไป {rowUsed} / {rowMax}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                )}
                              </button>
                            );
                          })()}

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

                    {/* Expandable Attendee Usage History List */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 border-t border-slate-200 p-4 sm:p-5 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#0026b3]" />
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                              รายชื่อผู้เข้าร่วมที่ใช้สิทธิ์รหัส <span className="font-mono text-[#0026b3]">{coupon.code}</span>
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                              {couponUsages.length} รายการ
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadCouponUsages(coupon.id)}
                              disabled={isUsagesLoading}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs transition cursor-pointer"
                              title="รีเฟรชรายชื่อ"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isUsagesLoading ? 'animate-spin text-blue-600' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {isUsagesLoading ? (
                          <div className="py-8 text-center text-slate-400 space-y-1.5 bg-white rounded-xl border border-slate-200">
                            <div className="w-6 h-6 border-2 border-[#0026b3] border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs font-medium">กำลังโหลดรายชื่อผู้ใช้สิทธิ์...</p>
                          </div>
                        ) : couponUsages.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 space-y-1 bg-white rounded-xl border border-dashed border-slate-200">
                            <Ticket className="w-7 h-7 mx-auto text-slate-300 stroke-[1.5]" />
                            <p className="text-xs font-bold text-slate-600">ยังไม่มีผู้เข้าร่วมใช้สิทธิ์รหัสนี้</p>
                            <p className="text-[11px] text-slate-400">
                              เมื่อผู้เข้าร่วมนำรหัสไปลงทะเบียน รายชื่อจะแสดงที่นี่โดยอัตโนมัติ
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            {couponUsages.map((u, uIdx) => (
                              <div
                                key={u.id || uIdx}
                                className="p-3 sm:p-3.5 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                                      {uIdx + 1}
                                    </span>
                                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                      {u.attendee_name}
                                    </span>
                                    {u.member_no ? (
                                      <span className="bg-blue-50 text-[#0026b3] border border-blue-200 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                        <ShieldCheck className="w-2.5 h-2.5" />
                                        <span>สมาชิก #{u.member_no}</span>
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                        บุคคลทั่วไป
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap pl-7">
                                    {u.attendee_email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span>{u.attendee_email}</span>
                                      </span>
                                    )}
                                    {u.attendee_phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>{u.attendee_phone}</span>
                                      </span>
                                    )}
                                    {u.workplace && (
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-slate-400" />
                                        <span className="truncate max-w-[180px]">{u.workplace}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center pl-7 sm:pl-0 shrink-0 gap-1.5">
                                  <div className="space-y-0.5 sm:text-right">
                                    {u.ticket_code && (
                                      <div className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-mono font-black">
                                        {u.ticket_code}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(u.used_at).toLocaleString('th-TH', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })}
                                    </div>
                                  </div>

                                  {/* Revoke Button */}
                                  <button
                                    type="button"
                                    disabled={revokingId === u.id}
                                    onClick={() => handleRevokeUsage(coupon.id, u)}
                                    className="px-2 py-0.5 rounded-md border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="ยกเลิกการลงทะเบียนของคนนี้และคืนสิทธิ์คูปอง"
                                  >
                                    <span>คืนสิทธิ์โควตา</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
