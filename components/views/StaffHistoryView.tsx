'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  UserCheck, 
  Building2, 
  Phone, 
  Mail, 
  GraduationCap, 
  QrCode, 
  Sparkles,
  Calendar,
  X,
  CreditCard,
  FileSpreadsheet,
  BadgeCheck,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface RegistrationRecord {
  id: string;
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  email: string;
  phone: string;
  lineId: string;
  workplace: string;
  position: string;
  scientistNo?: string;
  ticketType: string;
  ticketCode: string;
  registrationDate: string;
  paymentStatus: 'paid' | 'pending' | 'unpaid';
  checkInStatus: 'checked_in' | 'not_checked_in';
  checkInTime?: string;
  education?: { degree: string; institution: string; year: string }[];
}

const INITIAL_REGISTRATIONS: RegistrationRecord[] = [
  {
    id: 'REG-2026-0001',
    nameTh: 'นพ. วรวัฒน์ เกียรติอนันต์',
    nameEn: 'Dr. Worawat Kiat-anan',
    id4Digits: '8892',
    email: 'worawat.k@chula.md.ac.th',
    phone: '089-123-4567',
    lineId: 'dr_worawat',
    workplace: 'โรงพยาบาลจุฬาลงกรณ์',
    position: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (Reproductive Specialist)',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0012',
    registrationDate: '01 ก.ย. 2569, 10:30 น.',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '08:45 น.',
    education: [
      { degree: 'แพทยศาสตรบัณฑิต (พ.บ.)', institution: 'จุฬาลงกรณ์มหาวิทยาลัย', year: '2558' },
      { degree: 'วุฒิบัตรสูติศาสตร์-นรีเวชวิทยา', institution: 'แพทยสภา', year: '2562' },
    ],
  },
  {
    id: 'REG-2026-0002',
    nameTh: 'พญ. นภัสสร สุวรรณเวช',
    nameEn: 'Dr. Napassorn Suwanwech',
    id4Digits: '4451',
    email: 'napassorn.s@med.tu.ac.th',
    phone: '081-456-7890',
    lineId: 'napas_dr',
    workplace: 'โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
    position: 'สูตินรีแพทย์',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0034',
    registrationDate: '01 ก.ย. 2569, 11:15 น.',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '09:12 น.',
    education: [
      { degree: 'แพทยศาสตรบัณฑิต', institution: 'มหาวิทยาลัยธรรมศาสตร์', year: '2560' },
    ],
  },
  {
    id: 'REG-2026-0003',
    nameTh: 'นว. ปรียานุช รัตนศิลป์',
    nameEn: 'Ms. Preeyanuch Rattanasilp',
    id4Digits: '9912',
    email: 'preeyanuch.r@ivfcenter.co.th',
    phone: '086-789-0123',
    lineId: 'preeya_embryo',
    workplace: 'BORN IVF Fertility Clinic',
    position: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Senior Clinical Embryologist)',
    scientistNo: 'นว. 2564-0891',
    ticketType: 'Embryology Workshop Only',
    ticketCode: 'TSRM-2026-0089',
    registrationDate: '02 ก.ย. 2569, 14:20 น.',
    paymentStatus: 'paid',
    checkInStatus: 'not_checked_in',
    education: [
      { degree: 'วท.บ. เทคนิคการแพทย์', institution: 'มหาวิทยาลัยมหิดล', year: '2561' },
      { degree: 'วท.ม. วิทยาศาสตร์การสืบพันธุ์', institution: 'จุฬาลงกรณ์มหาวิทยาลัย', year: '2564' },
    ],
  },
  {
    id: 'REG-2026-0004',
    nameTh: 'นพ. ธนกฤต วิเศษไพบูลย์',
    nameEn: 'Dr. Thanakrit Wisetpaiboon',
    id4Digits: '1029',
    email: 'thanakrit.w@siriraj.ac.th',
    phone: '084-332-1100',
    lineId: 'thanakrit_w',
    workplace: 'โรงพยาบาลศิริราช',
    position: 'อาจารย์แพทย์ สูตินรีเวช',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0005',
    registrationDate: '30 ส.ค. 2569, 09:00 น.',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '08:30 น.',
    education: [
      { degree: 'แพทยศาสตรบัณฑิต (เกียรตินิยม)', institution: 'มหาวิทยาลัยมหิดล', year: '2555' },
    ],
  },
  {
    id: 'REG-2026-0005',
    nameTh: 'ภญ. พัชราภา วงศ์มณี',
    nameEn: 'Ms. Patcharapa Wongmanee',
    id4Digits: '7721',
    email: 'patcharapa.w@pharma.com',
    phone: '082-998-7766',
    lineId: 'patcha_rx',
    workplace: 'บริษัท เวชภัณฑ์การเจริญพันธุ์ จำกัด',
    position: 'เภสัชกรคลินิก / ผู้แทนฝ่ายวิชาการ',
    ticketType: 'Day Pass (Day 2 Only)',
    ticketCode: 'TSRM-2026-0104',
    registrationDate: '02 ก.ย. 2569, 16:45 น.',
    paymentStatus: 'paid',
    checkInStatus: 'not_checked_in',
  },
  {
    id: 'REG-2026-0006',
    nameTh: 'พว. กัลยา สุขสำราญ',
    nameEn: 'RN. Kanlaya Suksamran',
    id4Digits: '3349',
    email: 'kanlaya.s@bnh.co.th',
    phone: '085-111-2233',
    lineId: 'kanlaya_rn',
    workplace: 'โรงพยาบาลบีเอ็นเอช (BNH Hospital)',
    position: 'พยาบาลวิชาชีพเฉพาะทาง IVF',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0168',
    registrationDate: '03 ก.ย. 2569, 08:30 น.',
    paymentStatus: 'pending',
    checkInStatus: 'not_checked_in',
  },
];

export function StaffHistoryView() {
  const { lang, t } = useLanguage();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>(INITIAL_REGISTRATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'unpaid'>('all');
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleCheckIn = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRegistrations(prev =>
      prev.map(r => {
        if (r.id === id) {
          const isNowChecked = r.checkInStatus !== 'checked_in';
          const newTime = isNowChecked 
            ? new Date().toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }) 
            : undefined;
          return {
            ...r,
            checkInStatus: isNowChecked ? 'checked_in' : 'not_checked_in',
            checkInTime: newTime,
          };
        }
        return r;
      })
    );
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(prev => {
        if (!prev) return null;
        const isNowChecked = prev.checkInStatus !== 'checked_in';
        return {
          ...prev,
          checkInStatus: isNowChecked ? 'checked_in' : 'not_checked_in',
          checkInTime: isNowChecked ? 'เช็คอินแล้ว' : undefined,
        };
      });
    }
    showToast(lang === 'th' ? 'อัปเดตสถานะการเช็คอินสำเร็จ' : 'Check-in status updated');
  };

  const handleExportCSV = () => {
    const headers = 'ID,Name Thai,Name English,Citizen ID 4 Digits,Email,Phone,Workplace,Position,Ticket Code,Ticket Type,Payment Status,Check-in Status,Check-in Time\n';
    const rows = registrations.map(r => 
      `"${r.id}","${r.nameTh}","${r.nameEn}","${r.id4Digits}","${r.email}","${r.phone}","${r.workplace}","${r.position}","${r.ticketCode}","${r.ticketType}","${r.paymentStatus}","${r.checkInStatus}","${r.checkInTime || '-'}"`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `thaisrm_registration_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'th' ? 'ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว' : 'CSV exported successfully');
  };

  const filteredRecords = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return registrations.filter(r => {
      const matchesSearch = !q ||
        r.nameTh.toLowerCase().includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.ticketCode.toLowerCase().includes(q) ||
        r.workplace.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.email.toLowerCase().includes(q);

      const matchesCheckIn = checkInFilter === 'all' || r.checkInStatus === checkInFilter;
      const matchesPayment = paymentFilter === 'all' || r.paymentStatus === paymentFilter;

      return matchesSearch && matchesCheckIn && matchesPayment;
    });
  }, [registrations, searchQuery, checkInFilter, paymentFilter]);

  const totalRegistered = registrations.length;
  const checkedInTotal = React.useMemo(() => registrations.filter(r => r.checkInStatus === 'checked_in').length, [registrations]);
  const paidTotal = React.useMemo(() => registrations.filter(r => r.paymentStatus === 'paid').length, [registrations]);
  const pendingPaymentTotal = React.useMemo(() => registrations.filter(r => r.paymentStatus !== 'paid').length, [registrations]);

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
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {lang === 'th' ? 'ข้อมูลการลงทะเบียนเข้าร่วมงาน' : 'Registration Data & Attendees'}
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 font-normal">
              {lang === 'th' 
                ? 'รายชื่อผู้ลงทะเบียน รายละเอียดสมาชิก สถานะการชำระเงิน และการเช็คอินเข้างาน' 
                : 'Attendee database, verified membership credentials, payment status, and on-site check-in logs.'}
            </p>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black px-4 py-2.5 rounded-2xl transition cursor-pointer shadow-md flex items-center gap-2 active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{lang === 'th' ? 'ส่งออกไฟล์ CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500">{lang === 'th' ? 'ผู้ลงทะเบียนทั้งหมด' : 'Total Registered'}</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{totalRegistered}</p>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800">{lang === 'th' ? 'เข้างานแล้ว (Check-in)' : 'Checked-in'}</p>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-950 mt-0.5">{checkedInTotal} <span className="text-xs text-emerald-700 font-semibold">({Math.round((checkedInTotal/totalRegistered)*100)}%)</span></p>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-blue-800">{lang === 'th' ? 'ชำระเงินสมบูรณ์' : 'Paid & Verified'}</p>
            <BadgeCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-950 mt-0.5">{paidTotal}</p>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800">{lang === 'th' ? 'ยังไม่เช็คอิน' : 'Pending Check-in'}</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-950 mt-0.5">{totalRegistered - checkedInTotal}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-2.5 md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาตามชื่อ, เบอร์โทร, อีเมล, รหัสตั๋ว, โรงพยาบาล...' : 'Search by name, phone, email, ticket ID, workplace...'}
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

        {/* Check-in Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setCheckInFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                checkInFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'th' ? 'เช็คอิน: ทั้งหมด' : 'All'}
            </button>
            <button
              onClick={() => setCheckInFilter('checked_in')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                checkInFilter === 'checked_in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'th' ? '✓ เข้างานแล้ว' : 'Checked In'}
            </button>
            <button
              onClick={() => setCheckInFilter('not_checked_in')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                checkInFilter === 'not_checked_in' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'th' ? 'ยังไม่เข้างาน' : 'Not Checked'}
            </button>
          </div>
        </div>
      </div>

      {/* Attendee Registration Cards */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {lang === 'th' ? 'ไม่พบข้อมูลผู้ลงทะเบียน' : 'No registration records found'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'th' ? 'ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelectedRecord(record)}
              className="bg-white hover:bg-slate-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Profile Details */}
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Avatar with status dot */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white font-black text-base flex items-center justify-center shadow-xs">
                    {record.nameEn.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    record.checkInStatus === 'checked_in' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                      {lang === 'th' ? record.nameTh : record.nameEn}
                    </h3>
                    <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      {record.ticketCode}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      record.checkInStatus === 'checked_in'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {record.checkInStatus === 'checked_in'
                        ? (lang === 'th' ? `✓ เช็คอินแล้ว (${record.checkInTime})` : `Checked in (${record.checkInTime})`)
                        : (lang === 'th' ? '⏳ ยังไม่เช็คอิน' : 'Pending')}
                    </span>
                  </div>

                  <p className="text-xs text-[#0026b3] font-bold truncate">{record.position}</p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {record.workplace}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {record.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Details & Manual Action */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">{record.ticketType}</span>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {lang === 'th' ? 'ชำระเงินแล้ว' : 'Paid'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecord(record);
                    }}
                    className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title={lang === 'th' ? 'ดูข้อมูลประวัติ' : 'View Profile'}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">{lang === 'th' ? 'ดูประวัติ' : 'Profile'}</span>
                  </button>

                  <button
                    onClick={(e) => handleToggleCheckIn(record.id, e)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                      record.checkInStatus === 'checked_in'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {record.checkInStatus === 'checked_in'
                        ? (lang === 'th' ? 'ยกเลิกเช็คอิน' : 'Undo')
                        : (lang === 'th' ? 'เช็คอิน' : 'Check-in')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full Registration Profile Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                    {lang === 'th' ? 'ประวัติและข้อมูลสมาชิก' : 'Member Registration Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Code: {selectedRecord.ticketCode}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white font-black text-xl flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
                  {selectedRecord.nameEn.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-black leading-tight truncate">{selectedRecord.nameTh}</h4>
                  <p className="text-xs text-blue-200 font-medium truncate">{selectedRecord.nameEn}</p>
                  <p className="text-[11px] text-[#4ade80] font-bold mt-1">{selectedRecord.position}</p>
                </div>
              </div>

              {/* General Details */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'เลขบัตรประชาชน (4 ตัวท้าย)' : 'Citizen ID (Last 4)'}</span>
                  <span className="font-extrabold font-mono text-slate-900">•••• •••• {selectedRecord.id4Digits}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'สถานที่ทำงาน / โรงพยาบาล' : 'Workplace'}</span>
                  <span className="font-semibold text-slate-900">{selectedRecord.workplace}</span>
                </div>
                {selectedRecord.scientistNo && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">{lang === 'th' ? 'เลขทะเบียนนักวิทย์' : 'Scientist ID'}</span>
                    <span className="font-extrabold text-[#0026b3] font-mono">{selectedRecord.scientistNo}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'อีเมล' : 'Email'}</span>
                  <span className="font-medium text-slate-800">{selectedRecord.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</span>
                  <span className="font-medium text-slate-800">{selectedRecord.phone}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-bold">{lang === 'th' ? 'วันที่ลงทะเบียน' : 'Registered Date'}</span>
                  <span className="font-medium text-slate-800">{selectedRecord.registrationDate}</span>
                </div>
              </div>

              {/* Education Background */}
              {selectedRecord.education && selectedRecord.education.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#0026b3]" />
                    <span>{lang === 'th' ? 'ประวัติการศึกษา' : 'Education Background'}</span>
                  </h5>
                  <div className="space-y-1.5">
                    {selectedRecord.education.map((edu, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{edu.degree}</p>
                          <p className="text-[11px] text-slate-500">{edu.institution}</p>
                        </div>
                        <span className="text-slate-400 font-mono self-center">{edu.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 sm:p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-3xl flex items-center justify-between gap-2 sm:gap-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                title={lang === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{lang === 'th' ? 'ปิด' : 'Close'}</span>
              </button>

              <button
                onClick={() => handleToggleCheckIn(selectedRecord.id)}
                className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                  selectedRecord.checkInStatus === 'checked_in'
                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                    : 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08]'
                }`}
                title={
                  selectedRecord.checkInStatus === 'checked_in'
                    ? (lang === 'th' ? 'ยกเลิกการเช็คอิน' : 'Undo Check-in')
                    : (lang === 'th' ? 'เช็คอินผู้เข้าร่วมงาน' : 'Check-in Attendee')
                }
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {selectedRecord.checkInStatus === 'checked_in'
                    ? (lang === 'th' ? 'ยกเลิกการเช็คอิน' : 'Undo Check-in')
                    : (lang === 'th' ? 'เช็คอินผู้เข้าร่วมงาน' : 'Check-in Attendee')}
                </span>
                <span className="sm:hidden font-extrabold">
                  {selectedRecord.checkInStatus === 'checked_in'
                    ? (lang === 'th' ? 'ยกเลิก' : 'Undo')
                    : (lang === 'th' ? 'เช็คอิน' : 'Check-in')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
