'use client';

import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  Filter, 
  Check, 
  X, 
  Calendar, 
  CreditCard, 
  User, 
  FileText, 
  Sparkles, 
  ChevronDown,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface SlipRecord {
  id: string;
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
}

const INITIAL_SLIPS: SlipRecord[] = [
  {
    id: 'SLIP-2026-001',
    nameTh: 'นพ. วรวัฒน์ เกียรติอนันต์',
    nameEn: 'Dr. Worawat Kiat-anan',
    email: 'worawat.k@chula.md.ac.th',
    phone: '089-123-4567',
    workplace: 'โรงพยาบาลจุฬาลงกรณ์',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0012',
    amount: 3500,
    bank: 'KBANK (กสิกรไทย)',
    transferDate: '03 ก.ย. 2569',
    transferTime: '13:45 น.',
    refNo: 'TXN88920194021',
    slipUrl: '/bornivf-logo.png', // Fallback display
    status: 'pending',
  },
  {
    id: 'SLIP-2026-002',
    nameTh: 'พญ. นภัสสร สุวรรณเวช',
    nameEn: 'Dr. Napassorn Suwanwech',
    email: 'napassorn.s@med.tu.ac.th',
    phone: '081-456-7890',
    workplace: 'โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0034',
    amount: 3500,
    bank: 'SCB (ไทยพาณิชย์)',
    transferDate: '03 ก.ย. 2569',
    transferTime: '11:20 น.',
    refNo: 'TXN77102948123',
    slipUrl: '/bornivf-logo.png',
    status: 'pending',
  },
  {
    id: 'SLIP-2026-003',
    nameTh: 'นว. ปรียานุช รัตนศิลป์',
    nameEn: 'Ms. Preeyanuch Rattanasilp',
    email: 'preeyanuch.r@ivfcenter.co.th',
    phone: '086-789-0123',
    workplace: 'BORN IVF Fertility Clinic',
    ticketType: 'Embryology Workshop Only',
    ticketCode: 'TSRM-2026-0089',
    amount: 2500,
    bank: 'BBL (กรุงเทพ)',
    transferDate: '03 ก.ย. 2569',
    transferTime: '09:15 น.',
    refNo: 'TXN55410928374',
    slipUrl: '/bornivf-logo.png',
    status: 'pending',
  },
  {
    id: 'SLIP-2026-004',
    nameTh: 'นพ. ธนกฤต วิเศษไพบูลย์',
    nameEn: 'Dr. Thanakrit Wisetpaiboon',
    email: 'thanakrit.w@siriraj.ac.th',
    phone: '084-332-1100',
    workplace: 'โรงพยาบาลศิริราช',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0005',
    amount: 3500,
    bank: 'KTB (กรุงไทย)',
    transferDate: '02 ก.ย. 2569',
    transferTime: '16:30 น.',
    refNo: 'TXN44810293845',
    slipUrl: '/bornivf-logo.png',
    status: 'approved',
  },
  {
    id: 'SLIP-2026-005',
    nameTh: 'ภญ. พัชราภา วงศ์มณี',
    nameEn: 'Ms. Patcharapa Wongmanee',
    email: 'patcharapa.w@pharma.com',
    phone: '082-998-7766',
    workplace: 'บริษัท เวชภัณฑ์การเจริญพันธุ์ จำกัด',
    ticketType: 'Day Pass (Day 2 Only)',
    ticketCode: 'TSRM-2026-0104',
    amount: 1500,
    bank: 'TTB (ทีทีบี)',
    transferDate: '02 ก.ย. 2569',
    transferTime: '14:10 น.',
    refNo: 'TXN33910283741',
    slipUrl: '/bornivf-logo.png',
    status: 'approved',
  },
  {
    id: 'SLIP-2026-006',
    nameTh: 'นาย กิตติศักดิ์ เจริญกิจ',
    nameEn: 'Mr. Kittisak Charoenkit',
    email: 'kittisak.c@invalidmail.com',
    phone: '080-000-0000',
    workplace: 'สถาบันวิจัยการแพทย์',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0155',
    amount: 1000, // Invalid amount
    bank: 'KBANK (กสิกรไทย)',
    transferDate: '01 ก.ย. 2569',
    transferTime: '18:00 น.',
    refNo: 'TXN11209384756',
    slipUrl: '/bornivf-logo.png',
    status: 'rejected',
    notes: 'ยอดเงินไม่ตรงกับค่าลงทะเบียน Full Pass (3,500 บาท)',
  },
];

export function StaffSlipsView() {
  const { lang, t } = useLanguage();
  const [slips, setSlips] = useState<SlipRecord[]>(INITIAL_SLIPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSlip, setSelectedSlip] = useState<SlipRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSlips(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'approved' } : s))
    );
    if (selectedSlip && selectedSlip.id === id) {
      setSelectedSlip(prev => prev ? { ...prev, status: 'approved' } : null);
    }
    showToast(lang === 'th' ? 'อนุมัติหลักฐานสลิปเรียบร้อยแล้ว' : 'Slip approved successfully');
  };

  const handleReject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSlips(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'rejected', notes: 'โปรดแนบสลิปที่มียอดเงินถูกต้อง' } : s))
    );
    if (selectedSlip && selectedSlip.id === id) {
      setSelectedSlip(prev => prev ? { ...prev, status: 'rejected', notes: 'โปรดแนบสลิปที่มียอดเงินถูกต้อง' } : null);
    }
    showToast(lang === 'th' ? 'ปฏิเสธสลิปและส่งการแจ้งเตือนแล้ว' : 'Slip rejected');
  };

  const filteredSlips = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return slips.filter(s => {
      const matchesSearch = !q ||
        s.nameTh.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.ticketCode.toLowerCase().includes(q) ||
        s.refNo.toLowerCase().includes(q) ||
        s.workplace.toLowerCase().includes(q);
      
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [slips, searchQuery, statusFilter]);

  const totalCount = slips.length;
  const pendingCount = React.useMemo(() => slips.filter(s => s.status === 'pending').length, [slips]);
  const approvedCount = React.useMemo(() => slips.filter(s => s.status === 'approved').length, [slips]);
  const rejectedCount = React.useMemo(() => slips.filter(s => s.status === 'rejected').length, [slips]);

  return (
    <div className="flex-1 flex flex-col justify-start animate-fade-in p-3 sm:p-6 space-y-4 max-w-6xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#4ade80]/40 flex items-center gap-2 animate-slide-up text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-4 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                ? 'ตรวจสอบหลักฐานการชำระเงินของสมาชิกและอนุมัติการลงทะเบียนเข้าร่วมงาน' 
                : 'Review payment slips, verify bank transaction details, and approve event access.'}
            </p>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/15 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20">
              <Receipt className="w-3.5 h-3.5 text-blue-200" />
              <span>{lang === 'th' ? 'สลิปทั้งหมด' : 'Total'}: {totalCount}</span>
            </span>
            <span className="bg-amber-400 text-amber-950 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'รอตรวจ' : 'Pending'}: {pendingCount}</span>
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
            placeholder={lang === 'th' ? 'ค้นหาตามชื่อ, เลขอ้างอิง, รหัสตั๋ว, สังกัด...' : 'Search by name, ref, ticket code, hospital...'}
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
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
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
                {/* Status Indicator Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  slip.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : slip.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {slip.status === 'approved' && <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                  {slip.status === 'pending' && <Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
                  {slip.status === 'rejected' && <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>

                {/* Main Information */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                      {lang === 'th' ? slip.nameTh : slip.nameEn}
                    </h3>
                    <span className="text-[10px] font-black bg-blue-50 text-[#0026b3] px-2 py-0.5 rounded-md border border-blue-200">
                      {slip.ticketCode}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      slip.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : slip.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {slip.status === 'approved' && (lang === 'th' ? '✓ อนุมัติแล้ว' : 'Approved')}
                      {slip.status === 'pending' && (lang === 'th' ? '⏳ รอตรวจสอบ' : 'Pending')}
                      {slip.status === 'rejected' && (lang === 'th' ? '✕ ปฏิเสธ' : 'Rejected')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {slip.workplace}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {slip.bank}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-normal">
                    {lang === 'th' ? 'วันที่โอน' : 'Transfer'}: {slip.transferDate} {slip.transferTime} | Ref: {slip.refNo}
                  </p>
                </div>
              </div>

              {/* Right Side: Amount & Action Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'th' ? 'ยอดเงินที่ชำระ' : 'Amount'}</p>
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
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">{lang === 'th' ? 'ดูรูป' : 'View'}</span>
                  </button>

                  {slip.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => handleApprove(slip.id, e)}
                        className="px-3 py-2 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                        title={lang === 'th' ? 'อนุมัติ' : 'Approve'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{lang === 'th' ? 'อนุมัติ' : 'Approve'}</span>
                      </button>

                      <button
                        onClick={(e) => handleReject(slip.id, e)}
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
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
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
            <div className="p-4 sm:p-6 space-y-4">
              {/* Slip Mockup Viewport */}
              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-white space-y-3 relative overflow-hidden border border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Receipt className="w-8 h-8 text-[#4ade80]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#4ade80] tracking-wider block">
                    BANK TRANSFER SLIP PROOF
                  </span>
                  <p className="text-2xl font-black text-white mt-1">
                    ฿{selectedSlip.amount.toLocaleString()} THB
                  </p>
                  <p className="text-xs text-slate-300 mt-1">{selectedSlip.bank}</p>
                </div>

                <div className="w-full bg-white/5 rounded-xl p-3 text-left text-xs space-y-1 font-mono text-slate-300 border border-white/10">
                  <p><span className="text-slate-400">จาก:</span> {selectedSlip.nameTh} ({selectedSlip.nameEn})</p>
                  <p><span className="text-slate-400">ไปยัง:</span> สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)</p>
                  <p><span className="text-slate-400">เวลาโอน:</span> {selectedSlip.transferDate} {selectedSlip.transferTime}</p>
                  <p><span className="text-slate-400">Ref Code:</span> {selectedSlip.refNo}</p>
                </div>
              </div>

              {/* Participant & Ticket Info */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'ชื่อผู้เข้าร่วม' : 'Attendee Name'}</span>
                  <span className="font-extrabold text-slate-900">{selectedSlip.nameTh}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'ประเภทบัตร' : 'Ticket Tier'}</span>
                  <span className="font-extrabold text-blue-700">{selectedSlip.ticketType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'รหัสตั๋ว' : 'Ticket ID'}</span>
                  <span className="font-extrabold font-mono text-slate-900">{selectedSlip.ticketCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'หน่วยงาน' : 'Workplace'}</span>
                  <span className="font-medium text-slate-800">{selectedSlip.workplace}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'เบอร์ติดต่อ' : 'Phone'}</span>
                  <span className="font-medium text-slate-800">{selectedSlip.phone}</span>
                </div>
              </div>

              {/* Status & Rejection Notes */}
              {selectedSlip.notes && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{lang === 'th' ? 'หมายเหตุ' : 'Note'}: </span>
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

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => handleReject(selectedSlip.id)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                  title={lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject Slip'}
                >
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject Slip'}</span>
                </button>

                <button
                  onClick={() => handleApprove(selectedSlip.id)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                  title={lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment'}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#061d08] shrink-0" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
