'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  AlertCircle,
  RotateCw,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface SlipRecord {
  id: string;
  dbId?: string;
  meetingId?: string;
  meetingName?: string;
  memberNo?: string | null;
  isMember: boolean;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  workplace: string;
  ticketType: string;
  ticketCode: string;
  amount: number;
  bank: string;
  transferTime: string;
  transferDate: string;
  refNo: string;
  slipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  resubmitToken?: string | null;
  createdAt?: string;
}

export function AdminSlipsView() {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [slips, setSlips] = useState<SlipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSlip, setSelectedSlip] = useState<SlipRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reject modal state
  const [rejectingSlipId, setRejectingSlipId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('โปรดแนบสลิปที่มียอดเงินและรายละเอียดตรงกับรายการลงทะเบียน');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/slips');
      const json = await res.json();
      if (json.success) {
        setSlips(json.data || []);
      }
    } catch (err) {
      console.error('Error loading slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId: id, action: 'approve' }),
      });
      const json = await res.json();
      if (json.success) {
        setSlips((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: 'approved', notes: undefined } : s))
        );
        if (selectedSlip && selectedSlip.id === id) {
          setSelectedSlip((prev) => (prev ? { ...prev, status: 'approved', notes: undefined } : null));
        }
        showToast(lang === 'th' ? 'อนุมัติหลักฐานสลิปเรียบร้อยแล้ว' : 'Slip approved successfully');
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (err: any) {
      showToast(err.message || 'Error approving slip');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectingSlipId(id);
  };

  const handleConfirmReject = async () => {
    if (!rejectingSlipId) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: rejectingSlipId,
          action: 'reject',
          notes: rejectReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSlips((prev) =>
          prev.map((s) =>
            s.id === rejectingSlipId
              ? { ...s, status: 'rejected', notes: rejectReason, resubmitToken: json.data?.resubmitToken }
              : s
          )
        );
        if (selectedSlip && selectedSlip.id === rejectingSlipId) {
          setSelectedSlip((prev) =>
            prev ? { ...prev, status: 'rejected', notes: rejectReason, resubmitToken: json.data?.resubmitToken } : null
          );
        }
        showToast(lang === 'th' ? 'ปฏิเสธสลิปและส่งอีเมลแจ้งแนบใหม่แล้ว' : 'Slip rejected and email sent');
        setRejectingSlipId(null);
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการปฏิเสธ');
      }
    } catch (err: any) {
      showToast(err.message || 'Error rejecting slip');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSlips = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return slips.filter((s) => {
      const matchesSearch =
        !q ||
        (s.nameTh && s.nameTh.toLowerCase().includes(q)) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.ticketCode && s.ticketCode.toLowerCase().includes(q)) ||
        (s.refNo && s.refNo.toLowerCase().includes(q)) ||
        (s.workplace && s.workplace.toLowerCase().includes(q)) ||
        (s.memberNo && s.memberNo.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [slips, searchQuery, statusFilter]);

  const totalCount = slips.length;
  const pendingCount = React.useMemo(() => slips.filter((s) => s.status === 'pending').length, [slips]);
  const approvedCount = React.useMemo(() => slips.filter((s) => s.status === 'approved').length, [slips]);
  const rejectedCount = React.useMemo(() => slips.filter((s) => s.status === 'rejected').length, [slips]);

  return (
    <div className="flex-1 flex flex-col justify-start animate-fade-in p-3 sm:p-6 space-y-4 max-w-6xl mx-auto w-full">
      {/* Toast Notification */}
      {mounted &&
        toastMessage &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#4ade80]/40 flex items-center gap-2 animate-slide-up text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-4 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-[#4ade80]">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {lang === 'th' ? 'ตรวจสอบสลิปการโอนเงิน' : 'Slip Verification & Review'}
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 font-normal">
              {lang === 'th'
                ? 'ตรวจสอบหลักฐานการชำระเงินค่าประชุม อนุมัติสิทธิ์เข้างาน หรือแจ้งส่งสลิปใหม่'
                : 'Review payment slips, verify bank transaction details, and approve event access.'}
            </p>
          </div>

          {/* Quick Summary Badges & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchSlips}
              disabled={loading}
              className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20 transition cursor-pointer active:scale-95"
              title="รีเฟรชข้อมูล"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-200 ${loading ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
            </button>
            <span className="bg-white/15 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20">
              <Receipt className="w-3.5 h-3.5 text-blue-200" />
              <span>
                {lang === 'th' ? 'ทั้งหมด' : 'Total'}: {totalCount}
              </span>
            </span>
            <span className="bg-amber-400 text-amber-950 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {lang === 'th' ? 'รอตรวจ' : 'Pending'}: {pendingCount}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50/80 border-[#0026b3] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500">{lang === 'th' ? 'ทั้งหมด' : 'All Slips'}</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{totalCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800">{lang === 'th' ? 'รอตรวจสอบ' : 'Pending Review'}</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-0.5">{pendingCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-emerald-800">{lang === 'th' ? 'อนุมัติแล้ว' : 'Approved'}</p>
          <p className="text-xl font-black text-emerald-900 mt-0.5">{approvedCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-rose-800">{lang === 'th' ? 'ปฏิเสธ / แก้ไข' : 'Rejected'}</p>
          <p className="text-xl font-black text-rose-900 mt-0.5">{rejectedCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'th'
                ? 'ค้นหาตามชื่อ, เลขสมาชิก, เลขอ้างอิง, รหัสตั๋ว, สังกัด...'
                : 'Search by name, member no, ref, ticket code, hospital...'
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {st === 'all' && (lang === 'th' ? 'ทั้งหมด' : 'All')}
              {st === 'pending' && (lang === 'th' ? 'รอตรวจ' : 'Pending')}
              {st === 'approved' && (lang === 'th' ? 'อนุมัติแล้ว' : 'Approved')}
              {st === 'rejected' && (lang === 'th' ? 'ปฏิเสธ' : 'Rejected')}
            </button>
          ))}
        </div>
      </div>

      {/* Slip Cards List */}
      <div className="space-y-3">
        {filteredSlips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {lang === 'th' ? 'ไม่พบข้อมูลสลิปตามเงื่อนไข' : 'No slip records found'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ' : 'Try adjusting your search query or filter'}
            </p>
          </div>
        ) : (
          filteredSlips.map((slip) => (
            <div
              key={slip.id}
              onClick={() => setSelectedSlip(slip)}
              className="bg-white hover:bg-slate-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Slip Thumbnail Preview & Status Overlay */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlip(slip);
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-[#0026b3] transition shadow-2xs relative group"
                  title="คลิกเพื่อดูรูปสลิปขนาดใหญ่"
                >
                  {slip.slipUrl ? (
                    <img
                      src={slip.slipUrl}
                      alt="Slip Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Receipt className="w-5 h-5 text-slate-400" />
                  )}
                  {/* Small corner status badge */}
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl-lg flex items-center justify-center ${
                      slip.status === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : slip.status === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {slip.status === 'approved' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    {slip.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                    {slip.status === 'rejected' && <X className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>

                {/* Main Information */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                      {lang === 'th' ? slip.nameTh : slip.nameEn || slip.nameTh}
                    </h3>

                    {/* Member vs Non-Member Badge */}
                    {slip.isMember ? (
                      <span className="text-[10px] font-black bg-blue-50 text-[#0026b3] px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        <span>Member #{slip.memberNo}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <UserX className="w-3 h-3" />
                        <span>Non-Member</span>
                      </span>
                    )}

                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                      {slip.ticketCode}
                    </span>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        slip.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : slip.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {slip.status === 'approved' && (lang === 'th' ? '✓ อนุมัติแล้ว' : 'Approved')}
                      {slip.status === 'pending' && (lang === 'th' ? '⏳ รอตรวจสอบ' : 'Pending')}
                      {slip.status === 'rejected' && (lang === 'th' ? '✕ ปฏิเสธ' : 'Rejected')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                    {slip.workplace && (
                      <span className="flex items-center gap-1 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {slip.workplace}
                      </span>
                    )}
                    {slip.workplace && <span className="text-slate-300">•</span>}
                    <span className="flex items-center gap-1 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {slip.bank}
                    </span>
                    {slip.meetingName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-blue-700 font-medium">{slip.meetingName}</span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-normal">
                    {lang === 'th' ? 'วันที่โอน' : 'Transfer'}: {slip.transferDate || '-'} {slip.transferTime || ''} |
                    Ref: {slip.refNo}
                  </p>
                </div>
              </div>

              {/* Right Side: Amount & Action Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {lang === 'th' ? 'ยอดเงินที่ชำระ' : 'Amount'}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    ฿{slip.amount.toLocaleString()} <span className="text-xs font-normal text-slate-500">THB</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlip(slip);
                    }}
                    className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title={lang === 'th' ? 'ดูหลักฐานสลิป' : 'View Slip'}
                  >
                    <Eye className="w-4 h-4 text-[#0026b3]" />
                    <span className="hidden sm:inline">{lang === 'th' ? 'ดูสลิป' : 'View'}</span>
                  </button>

                  {slip.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => handleApprove(slip.id, e)}
                        disabled={isProcessing}
                        className="px-3 py-2 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                        title={lang === 'th' ? 'อนุมัติ' : 'Approve'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{lang === 'th' ? 'อนุมัติ' : 'Approve'}</span>
                      </button>

                      <button
                        onClick={(e) => openRejectModal(slip.id, e)}
                        disabled={isProcessing}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        title={lang === 'th' ? 'ปฏิเสธ' : 'Reject'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* High Resolution Slip Preview & Action Modal */}
      {mounted &&
        selectedSlip &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                      {lang === 'th' ? 'รายละเอียดสลิปโอนเงิน' : 'Slip Details'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Ref: {selectedSlip.refNo}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSlip(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Slip Viewport - Compact Display */}
                {selectedSlip.slipUrl ? (
                  <div className="bg-slate-950 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-slate-800/80">
                    <img
                      src={selectedSlip.slipUrl}
                      alt="Bank Slip"
                      className="max-h-56 sm:max-h-64 w-auto object-contain rounded-lg shadow-md"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={selectedSlip.slipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1 backdrop-blur-md cursor-pointer border border-white/15 active:scale-95"
                      >
                        <ExternalLink className="w-3 h-3 text-[#4ade80]" />
                        <span>เปิดดูภาพขนาดเต็ม</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-white space-y-2 relative overflow-hidden border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                      <Receipt className="w-5 h-5 text-[#4ade80]" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#4ade80] tracking-wider block">
                        BANK TRANSFER SLIP PROOF
                      </span>
                      <p className="text-xl font-black text-white mt-0.5">
                        ฿{selectedSlip.amount.toLocaleString()} THB
                      </p>
                      <p className="text-[11px] text-slate-300">{selectedSlip.bank}</p>
                    </div>
                  </div>
                )}

                {/* Participant & Ticket Info */}
                <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 space-y-3 border border-slate-200 text-sm">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'ชื่อผู้เข้าร่วม' : 'Attendee Name'}
                    </span>
                    <span className="font-black text-sm sm:text-base text-slate-900 text-right">
                      {selectedSlip.nameTh}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'สถานะผู้สมัคร' : 'Status'}
                    </span>
                    <span
                      className={`font-black text-xs sm:text-sm text-right ${
                        selectedSlip.isMember ? 'text-[#0026b3]' : 'text-amber-800'
                      }`}
                    >
                      {selectedSlip.isMember ? `สมาชิกสมาคม (#${selectedSlip.memberNo})` : 'บุคคลทั่วไป (Non-Member)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'รหัสตั๋ว' : 'Ticket ID'}
                    </span>
                    <span className="font-black font-mono text-sm sm:text-base text-slate-900 tracking-wide text-right">
                      {selectedSlip.ticketCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'หน่วยงาน' : 'Workplace'}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-slate-800 text-right">
                      {selectedSlip.workplace || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'อีเมล / เบอร์ติดต่อ' : 'Contact'}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-slate-800 text-right break-all">
                      {selectedSlip.email} {selectedSlip.phone ? `(${selectedSlip.phone})` : ''}
                    </span>
                  </div>
                </div>

                {/* Status & Rejection Notes */}
                {selectedSlip.notes && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{lang === 'th' ? 'หมายเหตุการปฏิเสธ: ' : 'Rejection Reason: '}</span>
                      <span>{selectedSlip.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-3.5 sm:p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-3xl flex items-center justify-between gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                  title={lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}</span>
                </button>

                {selectedSlip.status === 'pending' && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => openRejectModal(selectedSlip.id)}
                      disabled={isProcessing}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                      title={lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject Slip'}
                    >
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedSlip.id)}
                      disabled={isProcessing}
                      className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                      title={lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment'}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#061d08] shrink-0" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reject Reason Dialog Modal */}
      {mounted &&
        rejectingSlipId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-50">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">ระบุเหตุผลการปฏิเสธสลิป</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ระบบจะส่งอีเมลแจ้งเหตุผลนี้ไปยังผู้ลงทะเบียน พร้อมแนบลิงก์ให้ผู้ลงทะเบียนเข้ามากดแนบสลิปใหม่
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เหตุผล / คำแนะนำเพิ่มเติม:</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition"
                  placeholder="ระบุเหตุผล เช่น ยอดเงินไม่ตรง, สลิปไม่ชัดเจน..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingSlipId(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmReject}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>ยืนยันปฏิเสธ & ส่งอีเมล</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
