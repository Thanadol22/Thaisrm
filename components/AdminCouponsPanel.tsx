'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  PlusCircle,
  Search,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  Power,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { CouponModal, CouponItem } from '@/components/CouponModal';
import { CouponUsagesModal } from '@/components/CouponUsagesModal';
import { PaginationControls } from '@/components/PaginationControls';

interface AdminCouponsPanelProps {
  meetings: Array<{
    id?: string;
    meeting_id?: string;
    titleTh?: string;
    meeting_name?: string;
    meeting_date?: string;
    date?: string;
    status?: string;
  }>;
  onNotification?: (msg: string) => void;
}

export function AdminCouponsPanel({
  meetings,
  onNotification,
}: AdminCouponsPanelProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination state (Default 5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<CouponItem | null>(null);
  const [usagesModalOpen, setUsagesModalOpen] = useState(false);
  const [selectedCouponForUsages, setSelectedCouponForUsages] = useState<CouponItem | null>(null);

  // Reset to page 1 on meeting/search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMeeting, searchQuery]);

  // Paginated coupons (5 items per page)
  const paginatedCoupons = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(coupons.length / pageSize));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (validPage - 1) * pageSize;
    return coupons.slice(start, start + pageSize);
  }, [coupons, currentPage, pageSize]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      let url = '/api/coupons';
      const params = new URLSearchParams();
      if (selectedMeeting && selectedMeeting !== 'all') {
        params.append('meetingId', selectedMeeting);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCoupons(json.data);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      if (onNotification) onNotification('ไม่สามารถโหลดข้อมูลคูปองได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [selectedMeeting]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onNotification) onNotification(`คัดลอกรหัส "${code}" แล้ว`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleToggleStatus = async (coupon: CouponItem) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        if (onNotification) onNotification(data.message || 'อัปเดตสถานะเรียบร้อยแล้ว');
        fetchCoupons();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteCoupon = async (coupon: CouponItem) => {
    if (coupon.used_count > 0) {
      alert(`คูปองนี้มีการใช้งานไปแล้ว ${coupon.used_count} สิทธิ์ ไม่สามารถลบได้ กรุณาเปลี่ยนสถานะเป็น "ระงับการใช้งาน" แทน`);
      return;
    }

    if (!confirm(`คุณต้องการลบคูปอง "${coupon.code}" (${coupon.company_name}) ใช่หรือไม่?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (onNotification) onNotification('ลบคูปองเรียบร้อยแล้ว');
        fetchCoupons();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบคูปอง');
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalCoupons = coupons.length;
    const totalQuota = coupons.reduce((sum, c) => sum + (c.max_uses || 0), 0);
    const totalUsed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
    const remainingQuota = Math.max(0, totalQuota - totalUsed);
    const activeCoupons = coupons.filter((c) => c.is_active).length;

    return {
      totalCoupons,
      totalQuota,
      totalUsed,
      remainingQuota,
      activeCoupons,
    };
  }, [coupons]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-bold border border-white/20 backdrop-blur-sm">
              <Ticket className="w-3.5 h-3.5 text-amber-300" />
              <span>Sponsor & Corporate Pass Management</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ระบบจัดการคูปองและสิทธิ์สปอนเซอร์
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 font-normal max-w-2xl leading-relaxed">
              สร้างรหัสคูปอง กำหนดโควตาสิทธิ์ให้แก่บริษัทพันธมิตร ตรวจสอบสถิติการใช้งาน และดูรายชื่อผู้รับทุนลงทะเบียน
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCouponToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-3.5 rounded-2xl bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-black text-sm shadow-lg shadow-emerald-950/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-emerald-300/30"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>สร้างคูปองสปอนเซอร์ใหม่</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Coupons */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">จำนวนคูปองทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0026b3] flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.totalCoupons.toLocaleString()} <span className="text-xs font-bold text-slate-400">รายการ</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold">
            เปิดใช้งานอยู่ {stats.activeCoupons} รายการ
          </p>
        </div>

        {/* Total Quota */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">โควตาสิทธิ์ทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            {stats.totalQuota.toLocaleString()} <span className="text-xs font-bold text-slate-400">สิทธิ์</span>
          </div>
          <p className="text-[11px] text-slate-500">
            โควตารวมทุกบริษัท
          </p>
        </div>

        {/* Used Count */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ใช้งานไปแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
            {stats.totalUsed.toLocaleString()} <span className="text-xs font-bold text-slate-400">สิทธิ์</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.totalQuota > 0 ? `${Math.round((stats.totalUsed / stats.totalQuota) * 100)}% ของโควตาทั้งหมด` : '0%'}
          </p>
        </div>

        {/* Remaining Quota */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">สิทธิ์คงเหลือ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {stats.remainingQuota.toLocaleString()} <span className="text-xs font-bold text-slate-400">สิทธิ์</span>
          </div>
          <p className="text-[11px] text-slate-500">
            พร้อมให้ลงทะเบียน
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อบริษัท, รหัสคูปอง, หมายเหตุ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm transition cursor-pointer shrink-0"
          >
            ค้นหา
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm bg-white outline-none cursor-pointer focus:border-[#0026b3]"
          >
            <option value="all">ทุกรอบการประชุม (All Meetings)</option>
            {meetings.map((m) => {
              const mId = m.meeting_id || m.id || '';
              const mName = m.meeting_name || m.titleTh || mId;
              return (
                <option key={mId} value={mId}>
                  {mName}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={fetchCoupons}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0026b3]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Coupons Table / Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <div className="w-9 h-9 border-3 border-[#0026b3] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">กำลังโหลดรายการคูปอง...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Ticket className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบคูปองในระบบ</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ยังไม่มีการสร้างคูปองในรอบการประชุมนี้ กดปุ่ม &quot;สร้างคูปองสปอนเซอร์ใหม่&quot; เพื่อเริ่มต้นมอบสิทธิ์
            </p>
            <button
              type="button"
              onClick={() => {
                setCouponToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างคูปองแรก</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-6">รหัสคูปอง / บริษัท</th>
                  <th className="py-3.5 px-4">รอบการประชุม</th>
                  <th className="py-3.5 px-4">รูปแบบส่วนลด</th>
                  <th className="py-3.5 px-4">สิทธิ์การใช้งาน (Quota)</th>
                  <th className="py-3.5 px-4">วันหมดอายุ / สถานะ</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {paginatedCoupons.map((coupon) => {
                  const percentUsed = coupon.max_uses > 0 ? Math.round((coupon.used_count / coupon.max_uses) * 100) : 0;
                  const isQuotaFull = coupon.used_count >= coupon.max_uses;
                  const isExpired = coupon.expire_date ? new Date() > new Date(coupon.expire_date) : false;

                  return (
                    <tr key={coupon.id} className="hover:bg-blue-50/20 transition group">
                      {/* Code & Company */}
                      <td className="py-4 px-4 sm:px-6 min-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-[#0026b3] font-mono tracking-wider text-sm sm:text-base">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(coupon.code)}
                              className="p-1 rounded-md text-slate-400 hover:text-[#0026b3] hover:bg-blue-50 transition cursor-pointer"
                              title="คัดลอกรหัสคูปอง"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={coupon.company_name}>
                              {coupon.company_name}
                            </span>
                          </div>
                          {coupon.remarks && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={coupon.remarks}>
                              {coupon.remarks}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Meeting */}
                      <td className="py-4 px-4 min-w-[180px]">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 truncate max-w-[180px]" title={coupon.meetings?.meeting_name}>
                            {coupon.meetings?.meeting_name || coupon.meeting_id}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {coupon.meeting_id}
                          </span>
                        </div>
                      </td>

                      {/* Discount Type */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {coupon.discount_type === 'free' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-black text-xs">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>ฟรี 100% (Free Pass)</span>
                          </span>
                        ) : coupon.discount_type === 'fixed' ? (
                          <span className="inline-flex items-center bg-blue-50 text-[#0026b3] border border-blue-200 px-2.5 py-1 rounded-lg font-black text-xs">
                            ลด {coupon.discount_value?.toLocaleString()} บาท
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg font-black text-xs">
                            ลด {coupon.discount_value}%
                          </span>
                        )}
                      </td>

                      {/* Quota Progress */}
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                              {coupon.used_count} / {coupon.max_uses} สิทธิ์
                            </span>
                            <span className="font-extrabold text-slate-500 text-[11px]">
                              {percentUsed}%
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isQuotaFull
                                  ? 'bg-red-500'
                                  : percentUsed > 70
                                  ? 'bg-amber-500'
                                  : 'bg-[#0026b3]'
                              }`}
                              style={{ width: `${Math.min(100, percentUsed)}%` }}
                            />
                          </div>
                          <span className="text-[10.5px] text-slate-400 block">
                            เหลืออีก {Math.max(0, coupon.max_uses - coupon.used_count)} สิทธิ์
                          </span>
                        </div>
                      </td>

                      {/* Expiration & Active Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                !coupon.is_active
                                  ? 'bg-slate-400'
                                  : isExpired
                                  ? 'bg-red-500'
                                  : isQuotaFull
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500 animate-pulse'
                              }`}
                            />
                            <span
                              className={`text-xs font-black ${
                                !coupon.is_active
                                  ? 'text-slate-500'
                                  : isExpired
                                  ? 'text-red-600'
                                  : isQuotaFull
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {!coupon.is_active
                                ? 'ระงับการใช้งาน'
                                : isExpired
                                ? 'หมดอายุแล้ว'
                                : isQuotaFull
                                ? 'เต็มโควตา'
                                : 'เปิดใช้งาน (Active)'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>
                              {coupon.expire_date
                                ? `หมดอายุ: ${new Date(coupon.expire_date).toLocaleDateString('th-TH')}`
                                : 'ไม่มีวันหมดอายุ'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Usages */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCouponForUsages(coupon);
                              setUsagesModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="ดูรายชื่อผู้ใช้สิทธิ์คูปองนี้"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-xs hidden xl:inline">รายชื่อ ({coupon.used_count})</span>
                          </button>

                          {/* Edit Coupon */}
                          <button
                            type="button"
                            onClick={() => {
                              setCouponToEdit(coupon);
                              setIsModalOpen(true);
                            }}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="แก้ไขข้อมูลคูปอง"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(coupon)}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                              coupon.is_active
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={coupon.is_active ? 'กดเพื่อระงับการใช้งาน' : 'กดเพื่อเปิดใช้งาน'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete Coupon */}
                          {coupon.used_count === 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="p-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                              title="ลบคูปอง"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalItems={coupons.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        itemLabel="คูปอง"
      />

      {/* Modal 1: Create / Edit Coupon */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        couponToEdit={couponToEdit}
        meetings={meetings}
        onSaveSuccess={() => {
          fetchCoupons();
          if (onNotification) onNotification(couponToEdit ? 'อัปเดตข้อมูลคูปองเรียบร้อย' : 'สร้างคูปองใหม่สำเร็จ');
        }}
      />

      {/* Modal 2: View Usages */}
      <CouponUsagesModal
        isOpen={usagesModalOpen}
        onClose={() => setUsagesModalOpen(false)}
        coupon={selectedCouponForUsages}
        onQuotaRefunded={() => {
          fetchCoupons();
          if (onNotification) onNotification('คืนสิทธิ์โควตาคูปองสำเร็จแล้ว');
        }}
      />
    </div>
  );
}
