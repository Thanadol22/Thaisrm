'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Ticket,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Search,
  Mail,
  Phone,
  Tag,
  ShieldCheck,
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

interface CouponUsagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: CouponItem | null;
  onQuotaRefunded?: () => void;
}

export function CouponUsagesModal({
  isOpen,
  onClose,
  coupon,
  onQuotaRefunded,
}: CouponUsagesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [usages, setUsages] = useState<UsageRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUsages = () => {
    if (coupon?.id) {
      setLoading(true);
      fetch(`/api/coupons/${coupon.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.usages) {
            setUsages(data.data.usages);
          } else {
            setUsages([]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading usages:', err);
          setUsages([]);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    if (isOpen && coupon?.id) {
      loadUsages();
    }
  }, [isOpen, coupon]);

  if (!isOpen || !mounted || !coupon) return null;

  const handleRevokeUsage = async (u: UsageRecord) => {
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
          reason: 'ผู้ดูแลระบบยกเลิกการลงทะเบียนและคืนสิทธิ์คูปอง',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถคืนสิทธิ์ได้');
      }

      alert(data.message || 'คืนสิทธิ์โควตาคูปองสำเร็จแล้ว');
      loadUsages();
      if (onQuotaRefunded) onQuotaRefunded();
    } catch (err: any) {
      console.error('Error revoking quota:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการคืนสิทธิ์');
    } finally {
      setRevokingId(null);
    }
  };

  const filteredUsages = usages.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      u.attendee_name?.toLowerCase().includes(term) ||
      u.attendee_email?.toLowerCase().includes(term) ||
      u.member_no?.toLowerCase().includes(term) ||
      u.ticket_code?.toLowerCase().includes(term) ||
      u.workplace?.toLowerCase().includes(term)
    );
  });

  const exportCSV = () => {
    if (usages.length === 0) return;
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'เลขสมาชิก', 'อีเมล', 'เบอร์โทร', 'หน่วยงาน', 'Ticket Code', 'ส่วนลด (บาท)', 'ยอดชำระจริง (บาท)', 'วันเวลาที่ใช้สิทธิ์'];
    const rows = usages.map((u, i) => [
      i + 1,
      `"${u.attendee_name || ''}"`,
      `"${u.member_no || 'บุคคลทั่วไป'}"`,
      `"${u.attendee_email || ''}"`,
      `"${u.attendee_phone || ''}"`,
      `"${u.workplace || ''}"`,
      `"${u.ticket_code || ''}"`,
      u.discount_applied || 0,
      u.final_amount || 0,
      `"${new Date(u.used_at).toLocaleString('th-TH')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coupon-usages-${coupon.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden my-auto animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                  ประวัติการใช้สิทธิ์คูปอง: <span className="font-black text-amber-300">{coupon.code}</span>
                </h3>
              </div>
              <p className="text-xs text-blue-200/90 truncate flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{coupon.company_name}</span>
                <span>•</span>
                <span>ใช้ไปแล้ว {usages.length} / {coupon.max_uses} สิทธิ์</span>
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

        {/* Action & Filter Bar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, เลขสมาชิก, Ticket Code..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={exportCSV}
            disabled={usages.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#0026b3]" />
            <span>ส่งออก CSV</span>
          </button>
        </div>

        {/* Usages Table / List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-[#0026b3] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">กำลังโหลดประวัติการใช้งาน...</p>
            </div>
          ) : filteredUsages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Ticket className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-600">ยังไม่มีประวัติการใช้สิทธิ์คูปองนี้</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                เมื่อผู้เข้าร่วมนำรหัสคูปองนี้ไปกรอกในหน้าลงทะเบียน รายชื่อจะปรากฏที่นี่ทันที
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {filteredUsages.map((u, idx) => (
                <div
                  key={u.id || idx}
                  className="p-3.5 sm:p-4 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {u.attendee_name}
                      </h4>
                      {u.member_no ? (
                        <span className="bg-blue-50 text-[#0026b3] border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>สมาชิก #{u.member_no}</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          บุคคลทั่วไป
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pl-8">
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
                          <span className="truncate max-w-[200px]">{u.workplace}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center pl-8 sm:pl-0 shrink-0 gap-2">
                    <div className="space-y-0.5 sm:text-right">
                      {u.ticket_code && (
                        <div className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black">
                          {u.ticket_code}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        {new Date(u.used_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>

                    {/* Revoke Quota Button */}
                    <button
                      type="button"
                      disabled={revokingId === u.id}
                      onClick={() => handleRevokeUsage(u)}
                      className="px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="ยกเลิกการลงทะเบียนของคนนี้และคืนสิทธิ์คูปองให้กลับมาใช้ได้ใหม่"
                    >
                      <span>คืนสิทธิ์โควตา</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-600">
            แสดง {filteredUsages.length} จาก {usages.length} รายการ
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
