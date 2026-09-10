'use client';

import React, { useState, useMemo } from 'react';
import { AdminNavbar, AdminTab } from '@/components/AdminNavbar';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Receipt,
  UserCheck,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  Upload,
  Eye,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  QrCode,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BarChart3,
  PieChart,
  SlidersHorizontal,
  Calendar,
  Layers,
  Award,
  CircleDot,
  RotateCcw,
  KeyRound,
  Dices,
  Printer,
  FileText
} from 'lucide-react';
import { ThaiDateRangePicker } from '@/components/ThaiDateRangePicker';
import { ThaiTimeRangePicker } from '@/components/ThaiTimeRangePicker';
import { ReceiptData, SAMPLE_ORGANON_RECEIPT } from '@/types/receipt';
import { ReceiptManagementPanel } from '@/components/ReceiptManagementPanel';
import { ReceiptModal } from '@/components/ReceiptModal';

/* ─── Mock Data ─────────────────────────────────────────────────────────── */

interface MeetingItem {
  id: string;
  titleTh: string;
  titleEn: string;
  date: string;
  time: string;
  location: string;
  type: 'hybrid' | 'onsite' | 'online';
  staffCode?: string;
  maxSeats: number;
  basePrice?: number;
  registered: number;
  attended: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const INITIAL_MEETINGS: MeetingItem[] = [
  {
    id: 'MTG-2026-001',
    titleTh: 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
    titleEn: 'THAISRM Annual Scientific Congress 2026',
    date: '15-17 ต.ค. 2569',
    time: '08:30 - 17:00 น.',
    location: 'โรงแรม Grand Hyatt Erawan Bangkok & Live Streaming',
    type: 'hybrid',
    maxSeats: 600,
    registered: 500,
    attended: 389,
    revenue: 1750000,
    status: 'ongoing',
  },
  {
    id: 'MTG-2026-002',
    titleTh: 'อบรมเชิงปฏิบัติการทางคลินิกตัวอ่อนขั้นสูง (Hands-on Workshop)',
    titleEn: 'Advanced Clinical Embryology Hands-on Workshop',
    date: '28-29 พ.ย. 2569',
    time: '09:00 - 16:30 น.',
    location: 'ศูนย์ปฏิบัติการเพาะเลี้ยงตัวอ่อน BORN IVF Training Center',
    type: 'onsite',
    maxSeats: 80,
    registered: 80,
    attended: 76,
    revenue: 400000,
    status: 'upcoming',
  },
  {
    id: 'MTG-2026-003',
    titleTh: 'การประชุมใหญ่วิสามัญและสัมมนาทิศทางเวชศาสตร์การเจริญพันธุ์',
    titleEn: 'THAISRM Extraordinary General Meeting & Reproductive Trend',
    date: '12 ก.ค. 2569',
    time: '13:00 - 16:00 น.',
    location: 'ออนไลน์ผ่านระบบ Zoom Webinar',
    type: 'online',
    maxSeats: 1000,
    registered: 690,
    attended: 622,
    revenue: 1300000,
    status: 'completed',
  },
];

interface SlipItem {
  id: string;
  refNo: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  memberCode?: string;
  workplace: string;
  ticketType: string;
  meetingId: string;
  amount: number;
  bank: string;
  transferDate: string;
  transferTime: string;
  slipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const INITIAL_SLIPS: SlipItem[] = [
  {
    id: 'SLIP-001',
    refNo: 'TXN88920194021',
    nameTh: 'นพ. วรวัฒน์ เกียรติอนันต์',
    nameEn: 'Dr. Worawat Kiat-anan',
    email: 'worawat.k@chula.md.ac.th',
    phone: '089-123-4567',
    workplace: 'โรงพยาบาลจุฬาลงกรณ์',
    ticketType: 'THAISRM Congress Full Pass',
    meetingId: 'MTG-2026-001',
    amount: 3500,
    bank: 'KBANK (กสิกรไทย)',
    transferDate: '10 ก.ย. 2569',
    transferTime: '09:12 น.',
    slipUrl: '/bornivf-logo.png',
    status: 'pending',
  },
  {
    id: 'SLIP-002',
    refNo: 'TXN77102948123',
    nameTh: 'พญ. นภัสสร สุวรรณเวช',
    nameEn: 'Dr. Napassorn Suwanwech',
    email: 'napassorn.s@med.tu.ac.th',
    phone: '081-456-7890',
    workplace: 'โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
    ticketType: 'THAISRM Congress Full Pass',
    meetingId: 'MTG-2026-001',
    amount: 3500,
    bank: 'SCB (ไทยพาณิชย์)',
    transferDate: '10 ก.ย. 2569',
    transferTime: '08:45 น.',
    slipUrl: '/bornivf-logo.png',
    status: 'pending',
  },
  {
    id: 'SLIP-003',
    refNo: 'TXN55410928374',
    nameTh: 'นว. ปรียานุช รัตนศิลป์',
    nameEn: 'Ms. Preeyanuch Rattanasilp',
    email: 'preeyanuch.r@ivfcenter.co.th',
    phone: '086-789-0123',
    workplace: 'BORN IVF Fertility Clinic',
    ticketType: 'Embryology Workshop Only',
    meetingId: 'MTG-2026-002',
    amount: 5000,
    bank: 'BBL (กรุงเทพ)',
    transferDate: '09 ก.ย. 2569',
    transferTime: '16:30 น.',
    slipUrl: '/bornivf-logo.png',
    status: 'pending',
  },
  {
    id: 'SLIP-004',
    refNo: 'TXN33219401827',
    nameTh: 'ภญ. พิมพิศา ตั้งสัจจะ',
    nameEn: 'Pharm. Pimpisa Tangsajja',
    email: 'pimpisa.t@pharma.co.th',
    phone: '082-345-6789',
    workplace: 'ศูนย์การแพทย์เฉพาะทางนวบุตร',
    ticketType: 'THAISRM Congress Full Pass',
    meetingId: 'MTG-2026-001',
    amount: 3500,
    bank: 'KTB (กรุงไทย)',
    transferDate: '09 ก.ย. 2569',
    transferTime: '14:00 น.',
    slipUrl: '/bornivf-logo.png',
    status: 'approved',
  },
  {
    id: 'SLIP-005',
    refNo: 'TXN11209384756',
    nameTh: 'นายธีรเดช เจริญสุข',
    nameEn: 'Mr. Teeradej Charoensuk',
    email: 'teeradej.c@biolab.co.th',
    phone: '084-567-8901',
    workplace: 'ฝ่ายปฏิบัติการวิจัยชีววิทยาเจริญพันธุ์',
    ticketType: 'THAISRM Congress Full Pass',
    meetingId: 'MTG-2026-001',
    amount: 3500,
    bank: 'TTB (ทีทีบี)',
    transferDate: '08 ก.ย. 2569',
    transferTime: '11:10 น.',
    slipUrl: '/bornivf-logo.png',
    status: 'rejected',
    rejectionReason: 'ยอดเงินไม่ตรงกับค่าลงทะเบียนที่เลือก',
  },
];

interface AttendeeItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  email: string;
  phone: string;
  workplace: string;
  memberType: string;
  ticketType: string;
  ticketCode: string;
  meetingId: string;
  meetingTitle: string;
  registeredDate: string;
  paymentStatus: 'paid' | 'pending' | 'unpaid';
  checkInStatus: 'checked_in' | 'not_checked_in';
  checkInTime?: string;
}

const INITIAL_ATTENDEES: AttendeeItem[] = [
  {
    id: 'ATT-001',
    code: '000101',
    nameTh: 'นพ. วรวัฒน์ เกียรติอนันต์',
    nameEn: 'Dr. Worawat Kiat-anan',
    id4Digits: '8892',
    email: 'worawat.k@chula.md.ac.th',
    phone: '089-123-4567',
    workplace: 'โรงพยาบาลจุฬาลงกรณ์',
    memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0012',
    meetingId: 'MTG-2026-001',
    meetingTitle: 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
    registeredDate: '01 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '08:45 น.',
  },
  {
    id: 'ATT-002',
    code: '000102',
    nameTh: 'พญ. นภัสสร สุวรรณเวช',
    nameEn: 'Dr. Napassorn Suwanwech',
    id4Digits: '4451',
    email: 'napassorn.s@med.tu.ac.th',
    phone: '081-456-7890',
    workplace: 'โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
    memberType: 'Fellow RM',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0034',
    meetingId: 'MTG-2026-001',
    meetingTitle: 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
    registeredDate: '01 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '09:12 น.',
  },
  {
    id: 'ATT-003',
    code: '000103',
    nameTh: 'นว. ปรียานุช รัตนศิลป์',
    nameEn: 'Ms. Preeyanuch Rattanasilp',
    id4Digits: '9912',
    email: 'preeyanuch.r@ivfcenter.co.th',
    phone: '086-789-0123',
    workplace: 'BORN IVF Fertility Clinic',
    memberType: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)',
    ticketType: 'Embryology Workshop Only',
    ticketCode: 'TSRM-2026-0089',
    meetingId: 'MTG-2026-002',
    meetingTitle: 'อบรมเชิงปฏิบัติการทางคลินิกตัวอ่อนขั้นสูง (Hands-on Workshop)',
    registeredDate: '02 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '08:50 น.',
  },
  {
    id: 'ATT-004',
    code: '000104',
    nameTh: 'พว. กนกพร สิทธิโชค',
    nameEn: 'RN. Kanokporn Sitthichok',
    id4Digits: '3321',
    email: 'kanokporn.s@bangkokhospital.com',
    phone: '085-678-9012',
    workplace: 'โรงพยาบาลกรุงเทพ',
    memberType: 'พยาบาลผู้เชี่ยวชาญ IVF (Nurse)',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0105',
    meetingId: 'MTG-2026-001',
    meetingTitle: 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
    registeredDate: '03 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '09:30 น.',
  },
  {
    id: 'ATT-005',
    code: '000105',
    nameTh: 'ดร. กิตติศักดิ์ พงษ์ศิริ',
    nameEn: 'Dr. Kittisak Pongsiri',
    id4Digits: '7721',
    email: 'kittisak.p@genelab.co.th',
    phone: '087-890-1234',
    workplace: 'ศูนย์พันธุศาสตร์ระดับโมเลกุล GeneLab',
    memberType: 'นักพันธุศาสตร์โมเลกุล (Molecular Geneticist)',
    ticketType: 'THAISRM Congress Full Pass',
    ticketCode: 'TSRM-2026-0142',
    meetingId: 'MTG-2026-001',
    meetingTitle: 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
    registeredDate: '04 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'not_checked_in',
  },
  {
    id: 'ATT-006',
    code: '000106',
    nameTh: 'ทพญ. อารียา วงศ์สว่าง',
    nameEn: 'Dr. Areeya Wongsawang',
    id4Digits: '5562',
    email: 'areeya.w@bumrungrad.com',
    phone: '083-999-1122',
    workplace: 'โรงพยาบาลบำรุงราษฎร์',
    memberType: 'Fellow RM',
    ticketType: 'Embryology Workshop Only',
    ticketCode: 'TSRM-2026-0188',
    meetingId: 'MTG-2026-002',
    meetingTitle: 'อบรมเชิงปฏิบัติการทางคลินิกตัวอ่อนขั้นสูง (Hands-on Workshop)',
    registeredDate: '05 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'not_checked_in',
  },
  {
    id: 'ATT-007',
    code: '000107',
    nameTh: 'นพ. ธนกฤต มงคลกุล',
    nameEn: 'Dr. Thanakrit Mongkolkul',
    id4Digits: '1144',
    email: 'thanakrit.m@ramahospital.ac.th',
    phone: '081-223-9988',
    workplace: 'โรงพยาบาลรามาธิบดี',
    memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
    ticketType: 'Online Webinar Pass',
    ticketCode: 'TSRM-2026-0210',
    meetingId: 'MTG-2026-003',
    meetingTitle: 'การประชุมใหญ่วิสามัญและสัมมนาทิศทางเวชศาสตร์การเจริญพันธุ์',
    registeredDate: '06 ก.ย. 2569',
    paymentStatus: 'paid',
    checkInStatus: 'checked_in',
    checkInTime: '13:05 น.',
  },
  {
    id: 'ATT-008',
    code: '000108',
    nameTh: 'นว. ชัชวาล เลิศรัตนชัย',
    nameEn: 'Mr. Chatchawal Lertrattanachai',
    id4Digits: '6681',
    email: 'chatchawal.l@safereproduction.com',
    phone: '089-778-5544',
    workplace: 'Safe Fertility Center',
    memberType: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)',
    ticketType: 'Online Webinar Pass',
    ticketCode: 'TSRM-2026-0245',
    meetingId: 'MTG-2026-003',
    meetingTitle: 'การประชุมใหญ่วิสามัญและสัมมนาทิศทางเวชศาสตร์การเจริญพันธุ์',
    registeredDate: '07 ก.ย. 2569',
    paymentStatus: 'pending',
    checkInStatus: 'not_checked_in',
  },
];

const INITIAL_RECEIPTS: ReceiptData[] = [
  SAMPLE_ORGANON_RECEIPT,
  {
    id: 'REC-2569-002',
    receiptNo: '2569/02-095',
    receiptDate: '10 มีนาคม 2569',
    purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
    payerType: 'individual',
    payerName: 'นพ. วรวัฒน์ เกียรติอนันต์',
    payerAddressLine1: 'โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย แขวงปทุมวัน เขตปทุมวัน',
    payerAddressLine2: 'กรุงเทพมหานคร 10330',
    payerPhone: '089-123-4567',
    items: [
      {
        id: 'item-1',
        itemNumber: 1,
        title: 'ค่าลงทะเบียน THAISRM Congress Full Pass',
        subDetails: [
          'การประชุมวิชาการประจำปี THAISRM Congress 2026',
          'จัดขึ้นวันที่ 15-17 ต.ค. 2569',
          'โรงแรม Grand Hyatt Erawan Bangkok',
        ],
        amount: 3500,
      },
    ],
    totalAmount: 3500,
    payerSignerRole: 'ผู้จ่ายเงิน',
    authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
    authorizedSignerRole: '',
    preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
    preparedByRole: 'ผู้จัดทำ',
    meetingId: 'MTG-2026-001',
    attendeeId: 'ATT-001',
    createdAt: '2026-03-10',
    status: 'issued',
  },
  {
    id: 'REC-2569-003',
    receiptNo: '2569/02-096',
    receiptDate: '11 มีนาคม 2569',
    purposeText: 'ได้รับเงินสนับสนุน ประจำปี 2569',
    payerType: 'company',
    payerName: 'บริษัท เมอร์ค (ประเทศไทย) จำกัด',
    branchName: 'สำนักงานใหญ่',
    payerAddressLine1: 'เลขที่ 191 อาคารสีลมคอมเพล็กซ์ ชั้น 19 ถนนสีลม แขวงสีลม เขตบางรัก',
    payerAddressLine2: 'กรุงเทพมหานคร 10500',
    payerPhone: '02-667-8000',
    payerTaxId: '0105534063211',
    items: [
      {
        id: 'item-1',
        itemNumber: 1,
        title: 'ค่าลงทะเบียนและสนับสนุนพื้นที่บูธนิทรรศการ',
        subDetails: [
          'การประชุมวิชาการประจำปี THAISRM Congress 2026',
          'จัดขึ้นวันที่ 15-17 ต.ค. 2569',
          'โรงแรม Grand Hyatt Erawan Bangkok',
        ],
        amount: 120000,
      },
    ],
    totalAmount: 120000,
    payerSignerRole: 'ผู้จ่ายเงิน',
    authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
    authorizedSignerRole: '',
    preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
    preparedByRole: 'ผู้จัดทำ',
    meetingId: 'MTG-2026-001',
    createdAt: '2026-03-11',
    status: 'issued',
  },
];

/* ─── 1. OVERVIEW DASHBOARD PANEL (Light Theme) ──────────────────────────── */

interface DashboardOverviewProps {
  onNavigateTab: (tab: AdminTab) => void;
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees: AttendeeItem[];
}

function DashboardOverviewPanel({ onNavigateTab, meetings, slips, attendees }: DashboardOverviewProps) {
  const pendingSlips = slips.filter((s) => s.status === 'pending');
  const checkedInAttendees = attendees.filter((a) => a.checkInStatus === 'checked_in');
  const ongoingMeetingsCount = meetings.filter((m) => m.status === 'ongoing').length;
  const totalRegistered = meetings.reduce((sum, m) => sum + m.registered, 0);
  const totalAttended = meetings.reduce((sum, m) => sum + m.attended, 0);
  const totalRevenue = meetings.reduce((sum, m) => sum + m.revenue, 0);
  const checkInRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner (ThaiSRM Brand Primary & Accent Green) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-8 shadow-xl">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[#4ade80] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>ระบบบริหารจัดการประชุมสมาคม TSRM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              ภาพรวมแดชบอร์ดผู้ดูแลระบบ
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-blue-100 leading-relaxed font-medium">
              สรุปผลการจัดงาน สถิติผู้เข้าร่วมงาน ยอดชำระเงิน และการตรวจสอบสลิปแบบเรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('add-meeting')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ecb72] text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-[#4ade80]/20 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>สร้างการประชุมใหม่</span>
            </button>
            <button
              onClick={() => onNavigateTab('verify-slip')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-bold backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-[#4ade80]" />
              <span>ตรวจสลิป ({pendingSlips.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards (Brand Primary & Accent High Contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Meetings */}
        <div 
          onClick={() => onNavigateTab('meeting-history')}
          className="group cursor-pointer bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#0026b3]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">การประชุมทั้งหมด</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{meetings.length}</span>
            <span className="text-sm font-medium text-slate-500">โครงการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
              {ongoingMeetingsCount > 0 ? `กำลังจัดงาน ${ongoingMeetingsCount} โครงการ` : 'ไม่มีงานกำลังจัด'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Registered */}
        <div 
          onClick={() => onNavigateTab('verify-attendees')}
          className="group cursor-pointer bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#0026b3]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">ผู้ลงทะเบียนทั้งหมด</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRegistered.toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-500">ที่นั่ง</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-[#0026b3] font-bold flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> รวม {meetings.length} รอบการประชุม
            </span>
          </div>
        </div>

        {/* Card 3: Live Checked-in */}
        <div 
          onClick={() => onNavigateTab('verify-attendees')}
          className="group cursor-pointer bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">เช็คอินเข้างานแล้ว</span>
            <div className="p-2.5 rounded-xl bg-[#4ade80]/20 text-emerald-800 border border-[#4ade80]/40">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalAttended.toLocaleString()}</span>
            <span className="text-sm font-bold text-emerald-700">({checkInRate}%)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-full bg-[#4ade80] rounded-full transition-all duration-700"
                style={{ width: `${checkInRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 4: Revenue & Slips */}
        <div 
          onClick={() => onNavigateTab('verify-slip')}
          className="group cursor-pointer bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">ยอดชำระเงินรวม</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-amber-700">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{(totalRevenue / 1000000).toFixed(2)}M</span>
            <span className="text-xs sm:text-sm font-normal text-slate-500">({totalRevenue.toLocaleString()} ฿)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-amber-800 font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              รอตรวจสลิป {pendingSlips.length} รายการ
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Analytics Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Check-in Time distribution & Recent Meetings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Peak Hours Check-in Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#0026b3]" />
                  สถิติการเช็คอินตามช่วงเวลา (Peak Hours Check-in)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">แสดงความหนาแน่นของผู้เข้าร่วมงานที่สแกนเช็คอินในแต่ละช่วงเวลา</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-lg bg-[#0026b3] text-white shadow-xs">วันนี้ (10 ก.ย.)</span>
                <span className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">7 วันที่ผ่านมา</span>
              </div>
            </div>

            {/* Custom Bar Visualization */}
            <div className="pt-3 pb-1 space-y-3.5">
              {[
                { time: '07:30 - 08:00 น.', count: 45, max: 180, percent: '25%' },
                { time: '08:00 - 08:30 น.', count: 142, max: 180, percent: '78%' },
                { time: '08:30 - 09:00 น.', count: 178, max: 180, percent: '98%', highlight: true },
                { time: '09:00 - 09:30 น.', count: 86, max: 180, percent: '48%' },
                { time: '09:30 - 10:00 น.', count: 24, max: 180, percent: '13%' },
              ].map((slot) => (
                <div key={slot.time} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700">{slot.time}</span>
                    <span className={slot.highlight ? 'text-emerald-700 font-extrabold' : 'text-slate-600'}>
                      {slot.count} คน {slot.highlight && '(ช่วงคนหนาแน่นสูงสุด)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        slot.highlight
                          ? 'bg-gradient-to-r from-[#0026b3] via-emerald-500 to-[#4ade80]'
                          : 'bg-[#0026b3]'
                      }`}
                      style={{ width: slot.percent }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0026b3]" />
                จุดสแกน QR Code หน้างาน 4 จุด ทำงานปกติ
              </span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
                อัตราความสำเร็จ 99.4%
              </span>
            </div>
          </div>

          {/* Active / Current Meetings Summary */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0026b3]" />
                สถานะการประชุมสำคัญ
              </h3>
              <button
                onClick={() => onNavigateTab('meeting-history')}
                className="text-xs sm:text-sm font-bold text-[#0026b3] hover:text-[#001f94] flex items-center gap-1 cursor-pointer"
              >
                ดูทั้งหมด <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        m.status === 'ongoing'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : m.status === 'upcoming'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {m.status === 'ongoing' ? '● กำลังจัดประชุม' : m.status === 'upcoming' ? 'เร็วๆ นี้' : 'เสร็จสิ้น'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0026b3]" /> {m.date}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{m.titleTh}</h4>
                    <p className="text-xs sm:text-sm text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-slate-200 sm:pl-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">เช็คอิน/ที่นั่ง</div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">{m.attended}/{m.registered} <span className="text-xs font-medium text-slate-500">({Math.round((m.attended / m.registered) * 100)}%)</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">ยอดเงินรวม</div>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-700">฿{m.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Membership Distribution & Recent Activity */}
        <div className="space-y-6">
          {/* Member Type Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0026b3]" />
              สัดส่วนประเภทสมาชิก
            </h3>

            <div className="space-y-3 pt-1">
              {[
                { label: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)', count: 590, percent: '47%', color: 'bg-[#0026b3]' },
                { label: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน', count: 480, percent: '38%', color: 'bg-[#4ade80]' },
                { label: 'Fellow RM / สูตินรีแพทย์', count: 80, percent: '6%', color: 'bg-[#0284c7]' },
                { label: 'พยาบาลผู้เชี่ยวชาญ IVF', count: 40, percent: '3%', color: 'bg-amber-500' },
                { label: 'บุคคลทั่วไป / องค์กรเอกชน', count: 80, percent: '6%', color: 'bg-rose-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700 truncate">{item.label}</span>
                    <span className="text-slate-900 shrink-0 ml-2">{item.count} คน ({item.percent})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: item.percent }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts / Recent Activity */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0026b3]" />
              รายการดำเนินการด่วน
            </h3>

            <div className="space-y-3">
              <div 
                onClick={() => onNavigateTab('verify-slip')}
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200/70 rounded-lg text-amber-900">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-amber-950">สลิปใหม่รอตรวจสอบ</div>
                    <div className="text-xs text-amber-700">มีสลิปโอนเงินรออนุมัติ {pendingSlips.length} รายการ</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-800" />
              </div>

              <div 
                onClick={() => onNavigateTab('verify-attendees')}
                className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 hover:bg-blue-100/70 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-200/70 rounded-lg text-[#0026b3]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-blue-950">ตรวจสอบรายชื่อผู้เข้าร่วม</div>
                    <div className="text-xs text-[#0026b3]">เช็คอินแล้ว {totalAttended} จาก {totalRegistered} คน</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#0026b3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 2. REVENUE REPORT PANEL ────────────────────────────────────────────── */

interface RevenueReportProps {
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees?: AttendeeItem[];
}

function RevenueReportPanel({ meetings, slips, attendees }: RevenueReportProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'hybrid' | 'onsite' | 'online'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'layered' | 'comparison' | 'donut'>('layered');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  // Filtered Meetings based on comprehensive filters
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchRound = selectedMeetingId === 'all' || m.id === selectedMeetingId;
      const matchType = filterType === 'all' || m.type === filterType;
      const matchStatus = filterStatus === 'all' || m.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.titleTh.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      return matchRound && matchType && matchStatus && matchSearch;
    });
  }, [meetings, selectedMeetingId, filterType, filterStatus, searchQuery]);

  const hasActiveFilters = selectedMeetingId !== 'all' || filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedMeetingId('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  // Total Calculations based on filtered meetings
  const grandTotalRevenue = filteredMeetings.reduce((sum, m) => sum + m.revenue, 0);
  const totalPaidCount = filteredMeetings.reduce((sum, m) => sum + m.registered, 0);
  const totalAttendedCount = filteredMeetings.reduce((sum, m) => sum + m.attended, 0);
  const pendingAmount = slips
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);
  const pendingCount = slips.filter((s) => s.status === 'pending').length;

  // Selected Meeting / Round data
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Active revenue to display
  const displayRevenue = selectedMeetingId === 'all' ? grandTotalRevenue : (filteredMeetings.find((m) => m.id === selectedMeetingId)?.revenue || 0);
  const displayPaidCount = selectedMeetingId === 'all' ? totalPaidCount : (filteredMeetings.find((m) => m.id === selectedMeetingId)?.registered || 0);
  const avgPerPerson = displayPaidCount > 0 ? Math.round(displayRevenue / displayPaidCount) : 0;

  // Breakdown tiers for demonstration
  const ticketTiers = useMemo(() => {
    if (selectedMeetingId === 'MTG-2026-002') {
      // Hands-on Workshop
      return [
        { name: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Hands-on Pass)', price: 5000, count: 65, total: 325000, color: '#059669', bgClass: 'bg-emerald-600', fill: 'rgb(5, 150, 105)' },
        { name: 'Fellow RM / แพทย์ประจำบ้านต่อยอด', price: 5000, count: 15, total: 75000, color: '#2563eb', bgClass: 'bg-blue-600', fill: 'rgb(37, 99, 235)' },
      ];
    } else if (selectedMeetingId === 'MTG-2026-003') {
      // General Meeting Webinar
      return [
        { name: 'สมาชิกสามัญ (แพทย์ RM)', price: 2000, count: 350, total: 700000, color: '#2563eb', bgClass: 'bg-blue-600', fill: 'rgb(37, 99, 235)' },
        { name: 'สมาชิกสมทบ (นักวิทย์/พยาบาล)', price: 1500, count: 280, total: 420000, color: '#059669', bgClass: 'bg-emerald-600', fill: 'rgb(5, 150, 105)' },
        { name: 'ผู้สนใจทั่วไป (Online Pass)', price: 3000, count: 60, total: 180000, color: '#d97706', bgClass: 'bg-amber-600', fill: 'rgb(217, 119, 6)' },
      ];
    } else if (selectedMeetingId === 'MTG-2026-001') {
      // THAISRM Congress 2026
      return [
        { name: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM Full Pass)', price: 3500, count: 240, total: 840000, color: '#2563eb', bgClass: 'bg-blue-600', fill: 'rgb(37, 99, 235)' },
        { name: 'นักวิทยาศาสตร์ตัวอ่อน (Embryologist Pass)', price: 2500, count: 135, total: 337500, color: '#059669', bgClass: 'bg-emerald-600', fill: 'rgb(5, 150, 105)' },
        { name: 'Fellow RM / สูตินรีแพทย์', price: 3000, count: 65, total: 195000, color: '#9333ea', bgClass: 'bg-purple-600', fill: 'rgb(147, 51, 234)' },
        { name: 'พยาบาลผู้เชี่ยวชาญ IVF (Nurse Pass)', price: 2000, count: 40, total: 80000, color: '#d97706', bgClass: 'bg-amber-600', fill: 'rgb(217, 119, 6)' },
        { name: 'บุคคลทั่วไป / องค์กรเอกชน', price: 4500, count: 20, total: 90000, color: '#e11d48', bgClass: 'bg-rose-600', fill: 'rgb(225, 29, 72)' },
      ];
    } else {
      // Grand Total (All Rounds)
      return [
        { name: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)', price: 3500, count: 590, total: 1540000, color: '#2563eb', bgClass: 'bg-blue-600', fill: 'rgb(37, 99, 235)' },
        { name: 'นักวิทยาศาสตร์ตัวอ่อน (Embryologist)', price: 2500, count: 480, total: 1082500, color: '#059669', bgClass: 'bg-emerald-600', fill: 'rgb(5, 150, 105)' },
        { name: 'Fellow RM / สูตินรีแพทย์', price: 3000, count: 80, total: 270000, color: '#9333ea', bgClass: 'bg-purple-600', fill: 'rgb(147, 51, 234)' },
        { name: 'พยาบาลผู้เชี่ยวชาญ IVF (Nurse)', price: 2000, count: 40, total: 80000, color: '#d97706', bgClass: 'bg-amber-600', fill: 'rgb(217, 119, 6)' },
        { name: 'บุคคลทั่วไป / องค์กรเอกชน', price: 4500, count: 80, total: 477500, color: '#e11d48', bgClass: 'bg-rose-600', fill: 'rgb(225, 29, 72)' },
      ];
    }
  }, [selectedMeetingId]);

  const totalTierRevenue = ticketTiers.reduce((s, t) => s + t.total, 0);

  // Bank Channels Breakdown
  const bankBreakdown = [
    { bank: 'SCB (ไทยพาณิชย์)', amount: 1580000, percent: 45, color: 'bg-purple-600' },
    { bank: 'KBANK (กสิกรไทย)', amount: 1140000, percent: 33, color: 'bg-emerald-600' },
    { bank: 'BBL (กรุงเทพ)', amount: 480000, percent: 14, color: 'bg-blue-600' },
    { bank: 'KTB (กรุงไทย)', amount: 250000, percent: 8, color: 'bg-sky-500' },
  ];

  // Helper for Donut SVG circumference calculation
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedDonutPercent = 0;

  // ─── Multi-Round Layered Curve Chart Data (Design Match) ────────────────
  const timeLabels = ['9/4', '9/5', '9/5', '9/6', '9/6', '9/7', '9/7', '9/8', '9/8', '9/9', '9/9', '9/10'];
  const svgWidth = 840;
  const svgHeight = 260;
  const baselineY = 220;
  const topPadding = 25;
  const stepX = svgWidth / (timeLabels.length - 1);

  // Smooth spline path generator using Catmull-Rom to Cubic Bezier conversion
  const generateSpline = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 >= pts.length ? i + 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p3.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // 3 Distinct Series matching the layered purple wave in the user's design
  // Series 1: Top Wave - THAISRM Congress 2026 (Deep Purple)
  const series1Values = [185, 120, 135, 145, 125, 45, 75, 105, 80, 22, 28, 48];
  const series1Points = series1Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [280, 560, 690, 850, 990, 1350, 1220, 1100, 1280, 1750, 1680, 1590][idx],
  }));

  // Series 2: Middle Wave - Clinical Embryology Workshop (Medium Violet)
  const series2Values = [200, 190, 180, 165, 160, 185, 180, 145, 130, 128, 135, 160];
  const series2Points = series2Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [60, 90, 130, 180, 220, 190, 200, 290, 340, 400, 390, 360][idx],
  }));

  // Series 3: Bottom Wave - Extraordinary Meeting & Webinar (Light Lilac)
  const series3Values = [212, 205, 200, 195, 205, 190, 198, 195, 180, 168, 172, 178];
  const series3Points = series3Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [90, 140, 180, 240, 210, 280, 260, 270, 450, 1300, 1250, 1180][idx],
  }));

  const path1 = generateSpline(series1Points);
  const path2 = generateSpline(series2Points);
  const path3 = generateSpline(series3Points);

  const area1 = `${path1} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;
  const area2 = `${path2} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;
  const area3 = `${path3} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;

  const handleExportFinancialExcel = () => {
    const headers = ['รหัสโครงการ', 'ชื่อการประชุม (ไทย)', 'ชื่อการประชุม (อังกฤษ)', 'รูปแบบ', 'วันที่จัดงาน', 'จำนวนที่นั่งสูงสุด', 'ผู้ลงทะเบียน (คน)', 'ผู้เข้าร่วมจริง (คน)', 'รายได้รวม (บาท)', 'สถานะ'];
    const rows = filteredMeetings.map((m) => [
      m.id,
      `"${m.titleTh}"`,
      `"${m.titleEn}"`,
      m.type,
      `"${m.date}"`,
      m.maxSeats,
      m.registered,
      m.attended,
      m.revenue,
      m.status === 'ongoing' ? 'กำลังจัดงาน' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_revenue_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <DollarSign className="w-4 h-4 text-[#0026b3]" />
            <span>รายงานการเงินและรายได้ค่าลงทะเบียน (Financial Analytics)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            รายงานรายได้จากการลงทะเบียน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            สรุปยอดรับชำระเงินค่าลงทะเบียน แสดงเป็นกราฟสถิติ Layered Spline Area แยกตามแต่ละรอบการประชุม
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportFinancialExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export ข้อมูล (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* ─── Comprehensive & Intuitive Filter Bar ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Search, Format Pills, Status Dropdown & Reset */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการประชุม, สถานที่, หรือรหัสโครงการ..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Format Filter (Pills) */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'all'
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทุกรูปแบบ
              </button>
              <button
                type="button"
                onClick={() => setFilterType('hybrid')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'hybrid'
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setFilterType('onsite')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'onsite'
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Onsite
              </button>
              <button
                type="button"
                onClick={() => setFilterType('online')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'online'
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Online
              </button>
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl pl-3.5 pr-8 py-2.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer"
              >
                <option value="all">ทุกสถานะโครงการ</option>
                <option value="ongoing">กำลังจัดงาน / เปิดรับ</option>
                <option value="upcoming">เร็วๆ นี้ (Upcoming)</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Meeting Round Selector Tabs with revenue badges */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0026b3]" />
              <span>เลือกรอบการประชุมเจาะจง:</span>
            </div>
            <div className="text-xs font-bold text-slate-500">
              แสดง <span className="text-[#0026b3] font-black">{filteredMeetings.length}</span> จาก {meetings.length} โครงการ
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All Meetings Pill */}
            <button
              type="button"
              onClick={() => setSelectedMeetingId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                selectedMeetingId === 'all'
                  ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50/70 hover:text-[#0026b3]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>รวมทุกรอบที่กรอง (Grand Total)</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                selectedMeetingId === 'all'
                  ? 'bg-[#4ade80] text-slate-950 font-black'
                  : 'bg-blue-50 text-[#0026b3] font-bold'
              }`}>
                ฿{(grandTotalRevenue / 1000000).toFixed(2)}M
              </span>
            </button>

            {/* Individual Meeting Pills */}
            {filteredMeetings.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMeetingId(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                  selectedMeetingId === m.id
                    ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50/70 hover:text-[#0026b3]'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="truncate max-w-[220px]">{m.titleTh}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  selectedMeetingId === m.id
                    ? 'bg-[#4ade80] text-slate-950 font-black'
                    : 'bg-slate-200 text-slate-700 font-bold'
                }`}>
                  ฿{(m.revenue / 1000).toFixed(0)}k
                </span>
              </button>
            ))}

            {filteredMeetings.length === 0 && (
              <div className="text-xs text-slate-500 py-1.5 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ไม่มีรอบการประชุมที่ตรงกับตัวกรองนี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">
              {selectedMeetingId === 'all' ? 'ยอดรายได้รวมทุกรอบ' : 'ยอดรายได้รอบนี้'}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-[#0026b3]">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{displayRevenue.toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium truncate">
            {selectedMeetingId === 'all' ? `จากทั้งหมด ${meetings.length} รอบการประชุม` : currentMeeting?.titleTh}
          </div>
        </div>

        {/* Card 2: Paid Registrations */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ผู้ชำระเงินแล้ว</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{displayPaidCount.toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-500">ที่นั่ง/คน</span>
          </div>
          <div className="text-xs text-emerald-700 font-bold pt-2 border-t border-slate-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สถานะชำระเงินเรียบร้อย 100%
          </div>
        </div>

        {/* Card 3: Average per Attendee */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ค่าเฉลี่ยต่อผู้สมัคร</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-[#0026b3]">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{avgPerPerson.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-normal">/ คน</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
            คำนวณจากยอดรวมหารจำนวนที่นั่ง
          </div>
        </div>

        {/* Card 4: Pending Verification Inflow */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ยอดเงินรอตรวจสลิป</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-amber-700">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{pendingAmount.toLocaleString()}</span>
          </div>
          <div className="text-xs text-amber-800 font-bold pt-2 border-t border-slate-100">
            จำนวน {pendingCount} รายการสลิปที่รอตรวจ
          </div>
        </div>
      </div>

      {/* ─── MAIN GRAPH SECTION (Interactive Spline Area Chart) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        {/* Chart Header & Toggle Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                <Sparkles className="w-5 h-5 text-[#0026b3]" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                กราฟวิเคราะห์รายได้และแนวโน้มการเติบโต
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {activeChartTab === 'layered' && 'กราฟเส้นโค้งพื้นที่ซ้อนทับแยกตามแต่ละรอบการประชุม (Layered Spline Area Chart)'}
              {activeChartTab === 'comparison' && 'กราฟแท่งคู่เปรียบเทียบจำนวนผู้ลงทะเบียน vs ผู้เข้าร่วมงานจริงในแต่ละรอบ (Attendee Comparison)'}
              {activeChartTab === 'donut' && 'กราฟวงแหวนสัดส่วนรายได้แยกตามประเภทสมาชิกและบัตร (Donut Ring Chart)'}
            </p>
          </div>

          {/* Chart Type Toggle Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveChartTab('layered')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'layered'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#0026b3]" />
              <span>กราฟแยกตามแต่ละรอบ</span>
            </button>
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'comparison'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-[#0026b3]" />
              <span>เปรียบเทียบจำนวนคน</span>
            </button>
            <button
              onClick={() => setActiveChartTab('donut')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'donut'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4 text-[#0026b3]" />
              <span>สัดส่วนบัตร</span>
            </button>
          </div>
        </div>

        {/* ── 1. LAYERED SPLINE AREA CHART (Brand Primary & Accent Styling) ── */}
        {activeChartTab === 'layered' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Swatch Legend */}
            <div className="flex items-center gap-6 flex-wrap px-2">
              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-001' ? 'all' : 'MTG-2026-001')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${
                  selectedMeetingId === 'MTG-2026-001' || selectedMeetingId === 'all'
                    ? 'text-slate-800'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#0026b3] shrink-0 shadow-xs" />
                <span>THAISRM Congress 2026 (สีหลัก Primary)</span>
              </div>

              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-002' ? 'all' : 'MTG-2026-002')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${
                  selectedMeetingId === 'MTG-2026-002' || selectedMeetingId === 'all'
                    ? 'text-slate-800'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#16a34a] shrink-0 shadow-xs" />
                <span>Hands-on Workshop (สี Accent Green)</span>
              </div>

              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-003' ? 'all' : 'MTG-2026-003')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${
                  selectedMeetingId === 'MTG-2026-003' || selectedMeetingId === 'all'
                    ? 'text-slate-800'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#0284c7] shrink-0 shadow-xs" />
                <span>Extraordinary Meeting (Sky Blue)</span>
              </div>
            </div>

            {/* SVG Wave Chart Container */}
            <div className="relative pt-2 pb-2 bg-white rounded-2xl overflow-hidden">
              <div className="relative w-full aspect-[840/270] min-h-[220px]">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradient 1: Primary Brand Blue #0026b3 */}
                    <linearGradient id="brandBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0026b3" stopOpacity="0.48" />
                      <stop offset="50%" stopColor="#001f94" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#001a80" stopOpacity="0.02" />
                    </linearGradient>

                    {/* Gradient 2: Accent Mint Green #4ade80 / #16a34a */}
                    <linearGradient id="brandAccentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#16a34a" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.02" />
                    </linearGradient>

                    {/* Gradient 3: Light Sky Blue */}
                    <linearGradient id="brandSkyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                      <stop offset="70%" stopColor="#0284c7" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* ── Grid: Horizontal Dotted Lines ── */}
                  {[35, 75, 115, 155, 195].map((yVal) => (
                    <line
                      key={yVal}
                      x1="0"
                      y1={yVal}
                      x2={svgWidth}
                      y2={yVal}
                      stroke="#cbd5e1"
                      strokeDasharray="3 4"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                  ))}

                  {/* ── Grid: Vertical Dotted Lines corresponding to date steps ── */}
                  {timeLabels.map((_, idx) => (
                    <line
                      key={idx}
                      x1={idx * stepX}
                      y1={topPadding}
                      x2={idx * stepX}
                      y2={baselineY}
                      stroke="#cbd5e1"
                      strokeDasharray="3 4"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                  ))}

                  {/* ── Series 3 Layer (Bottom Curve - Sky Blue) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-003') && (
                    <g className="transition-opacity duration-300">
                      <path d={area3} fill="url(#brandSkyGradient)" />
                      <path
                        d={path3}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Series 2 Layer (Middle Curve - Accent Mint Green) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-002') && (
                    <g className="transition-opacity duration-300">
                      <path d={area2} fill="url(#brandAccentGradient)" />
                      <path
                        d={path2}
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Series 1 Layer (Top Curve - Deep Primary Blue) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-001') && (
                    <g className="transition-opacity duration-300">
                      <path d={area1} fill="url(#brandBlueGradient)" />
                      <path
                        d={path1}
                        fill="none"
                        stroke="#0026b3"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Bottom Baseline Axis with Ticks ── */}
                  <line
                    x1="0"
                    y1={baselineY}
                    x2={svgWidth}
                    y2={baselineY}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  {timeLabels.map((_, idx) => (
                    <line
                      key={`tick-${idx}`}
                      x1={idx * stepX}
                      y1={baselineY}
                      x2={idx * stepX}
                      y2={baselineY + 6}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                  ))}

                  {/* ── Interactive Hover Vertical Bar & Points ── */}
                  {hoveredPointIdx !== null && (
                    <g>
                      <line
                        x1={hoveredPointIdx * stepX}
                        y1={topPadding}
                        x2={hoveredPointIdx * stepX}
                        y2={baselineY}
                        stroke="#0026b3"
                        strokeWidth="1.8"
                        strokeDasharray="2 2"
                      />
                      {/* Dots on the 3 curves */}
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series1Points[hoveredPointIdx].y}
                        r="5.5"
                        fill="#0026b3"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series2Points[hoveredPointIdx].y}
                        r="5"
                        fill="#16a34a"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series3Points[hoveredPointIdx].y}
                        r="4.5"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Invisible Overlay Hover Catchers */}
                  {timeLabels.map((_, idx) => (
                    <rect
                      key={`hover-${idx}`}
                      x={idx * stepX - stepX / 2}
                      y={0}
                      width={stepX}
                      height={baselineY + 10}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredPointIdx(idx)}
                      onMouseLeave={() => setHoveredPointIdx(null)}
                    />
                  ))}
                </svg>

                {/* X-Axis Date Labels underneath */}
                <div className="flex justify-between text-xs font-bold text-slate-500 pt-2 px-1">
                  {timeLabels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className={`text-center transition ${
                        hoveredPointIdx === idx ? 'text-[#0026b3] font-extrabold scale-110' : ''
                      }`}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating Tooltip info on hover */}
              {hoveredPointIdx !== null && (
                <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
                  <div className="font-bold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <span>วันที่ {timeLabels[hoveredPointIdx]} (สถิติรายรอบ):</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0026b3]" />
                      Congress: <strong>฿{series1Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                      Workshop: <strong>฿{series2Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                      Webinar: <strong>฿{series3Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── METRIC LIST ROWS (Revenue by Event) ─── */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สรุปรายได้แยกตามโครงการประชุม (Revenue Breakdown)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  สัดส่วนรายได้
                </span>
              </div>

              {/* Empty State */}
              {filteredMeetings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <Search className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">ไม่พบข้อมูลโครงการประชุมตามตัวกรองที่เลือก</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    กรุณาลองปรับคำค้นหา เปลี่ยนรูปแบบการจัดงาน หรือคลิกล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                </div>
              ) : (
                <>
                  {filteredMeetings.map((m, idx) => {
                    const pct = grandTotalRevenue > 0 ? ((m.revenue / grandTotalRevenue) * 100).toFixed(1) : '0';
                    const isHybrid = m.type === 'hybrid';
                    const isOnsite = m.type === 'onsite';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 rounded-xl transition border gap-3 ${
                          selectedMeetingId === m.id
                            ? 'bg-blue-50/70 border-[#0026b3]/40 ring-1 ring-[#0026b3]/20'
                            : 'bg-slate-50/70 hover:bg-blue-50/40 border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isHybrid
                              ? 'bg-blue-100/80 text-[#0026b3]'
                              : isOnsite
                              ? 'bg-emerald-100/80 text-[#16a34a]'
                              : 'bg-sky-100/80 text-[#0284c7]'
                          }`}>
                            {isHybrid ? <Sparkles className="w-4.5 h-4.5" /> : isOnsite ? <Award className="w-4.5 h-4.5" /> : <CalendarDays className="w-4.5 h-4.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {m.titleTh}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                isHybrid
                                  ? 'bg-blue-100 text-[#0026b3]'
                                  : isOnsite
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}>
                                {isHybrid ? 'Hybrid' : isOnsite ? 'Onsite Workshop' : 'Online Webinar'}
                              </span>
                              <span>ลงทะเบียน {m.registered.toLocaleString()} ที่นั่ง {m.maxSeats ? `(${Math.round((m.registered / m.maxSeats) * 100)}%)` : ''}</span>
                              <span className="hidden md:inline text-slate-300">•</span>
                              <span className="hidden md:inline text-slate-400">{m.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-bold text-slate-900">
                              ฿{m.revenue.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500">{pct}% ของยอดรวม</div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{(12 + idx * 2.5).toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Summary Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-emerald-50/60 rounded-xl transition border border-blue-200/80 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#0026b3] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4.5 h-4.5 text-[#4ade80]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          รวมรายได้โครงการที่เลือก ({filteredMeetings.length} โครงการ)
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          ผู้ลงทะเบียนรวม {totalPaidCount.toLocaleString()} ที่นั่ง • ตรวจสอบสลิปตรงตามยอดทั้งหมด
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-200/60">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-xl font-black text-[#0026b3]">฿{grandTotalRevenue.toLocaleString()}</div>
                        <div className="text-[11px] text-emerald-700 font-bold">100.0% สมบูรณ์</div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4ade80] text-slate-950 text-xs font-black shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>สำเร็จ</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 2. COLUMN BAR CHART (Dual Clustered Bar Chart: Attendees Comparison) ── */}
        {activeChartTab === 'comparison' && (
          <div className="space-y-6 animate-fade-in">
            {/* Legend & Summary Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-2">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>จำนวนผู้ลงทะเบียนทั้งหมด (Total Registered)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#4ade80] shrink-0 shadow-xs" />
                  <span>จำนวนผู้เช็คอินเข้าร่วมจริง (Checked-in Attendees)</span>
                </div>
              </div>

              <div className="text-xs font-bold text-[#0026b3] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                เปรียบเทียบ 6 รอบการประชุมและหลักสูตร
              </div>
            </div>

            {/* Visual Dual Column Bar Chart */}
            <div className="relative pt-8 pb-4 px-4 sm:px-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="min-w-[540px] relative">
                  {/* Y-Axis Reference Gridlines (Dotted) */}
                  <div className="space-y-8 absolute inset-x-0 top-0 bottom-20 pointer-events-none flex flex-col justify-between opacity-50">
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>100% ความจุ</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>75%</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>50%</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>25%</span>
                    </div>
                    <div className="border-b border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>0 คน</span>
                    </div>
                  </div>

                  {/* Clustered Bar Pairs dynamically mapped from meetings */}
                  <div className="grid gap-3 sm:gap-6 h-72 items-end pt-6 pb-2 relative z-10" style={{ gridTemplateColumns: `repeat(${Math.max(3, meetings.length)}, minmax(0, 1fr))` }}>
                    {meetings.map((m) => {
                      const maxVal = Math.max(...meetings.map((x) => Math.max(x.registered, x.attended, 100)), 100);
                      const h1 = `${Math.max(12, Math.min(100, Math.round((m.registered / maxVal) * 100)))}%`;
                      const h2 = `${Math.max(8, Math.min(100, Math.round((m.attended / maxVal) * 100)))}%`;

                      return (
                        <div
                          key={m.id}
                          className="flex flex-col items-center h-full justify-end group cursor-pointer"
                          onClick={() => setSelectedMeetingId(m.id)}
                        >
                          {/* Floating Info Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mb-2 text-center pointer-events-none transform -translate-y-1 z-20">
                            <div className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                              <div className="text-slate-200 font-extrabold">{m.titleTh}</div>
                              <div className="text-blue-300">ลงทะเบียน: {m.registered.toLocaleString()} คน</div>
                              <div className="text-[#4ade80]">เช็คอินเข้างาน: {m.attended.toLocaleString()} คน ({m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0}%)</div>
                            </div>
                          </div>

                          {/* Dual Bar Container: Primary Blue & Accent Green */}
                          <div className="flex items-end justify-center w-full max-w-[80px] h-[210px] gap-0 sm:gap-0.5">
                            {/* Left Bar: Primary Blue #0026b3 */}
                            <div
                              className="w-1/2 bg-[#0026b3] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h1 }}
                              title={`ลงทะเบียน: ${m.registered} คน`}
                            />
                            {/* Right Bar: Accent Green #4ade80 */}
                            <div
                              className="w-1/2 bg-[#4ade80] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h2 }}
                              title={`เช็คอินจริง: ${m.attended} คน`}
                            />
                          </div>

                          {/* X-Axis Label */}
                          <div className="mt-3 text-center space-y-0.5 w-full">
                            <div className="text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-1 group-hover:text-[#0026b3] transition">
                              {m.titleTh.split('(')[0]}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 hidden sm:block">
                              {m.registered.toLocaleString()} / {m.attended.toLocaleString()} คน
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. SVG DONUT / RING CHART (By Member / Ticket Category) ── */}
        {activeChartTab === 'donut' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut SVG Illustration */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl relative">
                <svg className="w-56 h-56 transform -rotate-90 drop-shadow-xs" viewBox="0 0 180 180">
                  {/* Background Circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="24"
                  />

                  {/* Dynamic Donut Segments */}
                  {ticketTiers.map((tier) => {
                    const tierPercent = totalTierRevenue > 0 ? (tier.total / totalTierRevenue) * 100 : 0;
                    const strokeLength = (tierPercent / 100) * donutCircumference;
                    const strokeOffset = -(accumulatedDonutPercent / 100) * donutCircumference;
                    accumulatedDonutPercent += tierPercent;

                    const isHovered = hoveredTier === tier.name;

                    return (
                      <circle
                        key={tier.name}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        fill="transparent"
                        stroke={tier.color}
                        strokeWidth={isHovered ? 28 : 24}
                        strokeDasharray={`${strokeLength} ${donutCircumference}`}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredTier(tier.name)}
                        onMouseLeave={() => setHoveredTier(null)}
                      />
                    );
                  })}
                </svg>

                {/* Central Inner Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedMeetingId === 'all' ? 'รวมทุกรอบ' : 'ยอดรอบนี้'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    ฿{(totalTierRevenue / 1000000).toFixed(2)}M
                  </span>
                  <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 mt-1">
                    {ticketTiers.reduce((s, t) => s + t.count, 0)} ที่นั่ง
                  </span>
                </div>
              </div>

              {/* Donut Legend & Proportions Table */}
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  จำแนกตามประเภทบัตรลงทะเบียน:
                </div>
                <div className="space-y-2.5">
                  {ticketTiers.map((tier) => {
                    const percent = totalTierRevenue > 0 ? Math.round((tier.total / totalTierRevenue) * 100) : 0;
                    const isHovered = hoveredTier === tier.name;

                    return (
                      <div
                        key={tier.name}
                        onMouseEnter={() => setHoveredTier(tier.name)}
                        onMouseLeave={() => setHoveredTier(null)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isHovered
                            ? 'bg-blue-50/50 border-[#0026b3]/30 ring-1 ring-[#0026b3]/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: tier.color }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">{tier.name}</div>
                            <div className="text-xs text-slate-500">
                              ฿{tier.price.toLocaleString()} / ที่นั่ง • {tier.count} ที่นั่ง
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm sm:text-base font-extrabold text-slate-900">
                            ฿{tier.total.toLocaleString()}
                          </div>
                          <div className="text-xs font-bold text-[#0026b3]">{percent}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function AddMeetingPanel({
  onMeetingCreated,
  onNavigateTab,
}: {
  onMeetingCreated?: (m: MeetingItem) => void;
  onNavigateTab?: (tab: AdminTab) => void;
}) {
  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const [formData, setFormData] = useState({
    titleTh: '',
    titleEn: '',
    date: '20-22 ม.ค. 2570',
    time: '18:00 - 20:30 น.',
    location: '',
    type: 'hybrid' as 'hybrid' | 'onsite' | 'online',
    staffCode: generateRandomPin(),
    maxSeats: 500,
    basePrice: 3500,
    description: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string>('');

  const handleResetForm = () => {
    setFormData({
      titleTh: '',
      titleEn: '',
      date: '',
      time: '08:30 - 17:00 น.',
      location: '',
      type: 'hybrid',
      staffCode: generateRandomPin(),
      maxSeats: 500,
      basePrice: 3500,
      description: '',
    });
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titleTh || !formData.date) {
      alert('กรุณากรอกชื่อการประชุมและระบุวันที่จัดงาน');
      return;
    }

    const meetingId = `MTG-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newMeeting: MeetingItem = {
      id: meetingId,
      titleTh: formData.titleTh,
      titleEn: formData.titleEn || formData.titleTh,
      date: formData.date,
      time: formData.time || '08:30 - 17:00 น.',
      location: formData.location || 'ศูนย์ประชุมสมาคม',
      type: formData.type,
      staffCode: formData.staffCode || generateRandomPin(),
      maxSeats: Number(formData.maxSeats) || 500,
      registered: 0,
      attended: 0,
      revenue: 0,
      status: 'upcoming',
    };

    if (onMeetingCreated) {
      onMeetingCreated(newMeeting);
    }
    setLastCreatedId(meetingId);
    setIsSaved(true);
  };

  // Quick Location Suggestions
  const POPULAR_LOCATIONS = [
    'โรงแรม Grand Hyatt Erawan Bangkok',
    'ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC)',
    'ศูนย์นิทรรศการและการประชุม BITEC บางนา',
    'BORN IVF Training Center & Laboratory',
    'ห้องประชุม อาคารภูมิสิริมังคลานุสรณ์ รพ.จุฬาลงกรณ์',
    'Zoom Webinar Platform (ระบบออนไลน์)',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <PlusCircle className="w-4 h-4 text-[#0026b3]" />
            <span>สร้างกำหนดการประชุมและงานอบรมใหม่</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">เพิ่มการประชุม / งานประชุมวิชาการ</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ระบุข้อมูลการประชุม วันเวลา สถานที่จัดงาน พร้อมรหัสผ่าน 6 หลักสำหรับเจ้าหน้าที่
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>ล้างฟอร์ม / เริ่มใหม่</span>
        </button>
      </div>

      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-900 shadow-sm animate-scale-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-950">
                บันทึกและสร้างงานประชุมใหม่เรียบร้อยแล้ว! (รหัส: {lastCreatedId})
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                ข้อมูลได้บันทึกเข้าสู่ระบบ และพร้อมเปิดรับลงทะเบียนทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('meeting-history')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold hover:bg-[#001f94] transition cursor-pointer shadow-xs"
              >
                <span>ดูในประวัติการประชุม</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
            >
              + สร้างรายการอื่นต่อ
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN INPUT FORM ─── */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
        {/* Section 1: ข้อมูลหลักของการประชุม */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0026b3]" />
              1. ข้อมูลและหัวข้อการประชุม
            </h3>
            <span className="text-xs text-slate-500">* ข้อมูลจำเป็น</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">ชื่อการประชุม (ภาษาไทย) *</label>
              {formData.titleTh && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, titleTh: '' })}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ล้างข้อความ
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={formData.titleTh}
              onChange={(e) => setFormData({ ...formData, titleTh: e.target.value })}
              placeholder="เช่น การประชุมวิชาการประจำปี THAISRM Congress 2026"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">ชื่อการประชุม (English)</label>
              {formData.titleTh && !formData.titleEn && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, titleEn: formData.titleTh })}
                  className="text-xs font-bold text-[#0026b3] hover:text-[#001f94] cursor-pointer"
                >
                  + ใช้ชื่อเดียวกับภาษาไทย
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="e.g. THAISRM Annual Scientific Congress 2026"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
            />
          </div>

          {/* รูปแบบการจัดงาน (Interactive Selector) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">รูปแบบการจัดงาน</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { id: 'hybrid', label: 'Hybrid (Onsite + Online)', desc: 'เข้างานจริง & ถ่ายทอดสด' },
                { id: 'onsite', label: 'Onsite เท่านั้น', desc: 'เข้าร่วม ณ สถานที่จัดงาน' },
                { id: 'online', label: 'Online Webinar', desc: 'รับชมผ่าน Zoom Live' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setFormData({ ...formData, type: t.id as any })}
                  className={`p-3 rounded-xl text-left transition border cursor-pointer ${
                    formData.type === t.id
                      ? 'bg-blue-50 text-[#0026b3] border-[#0026b3]/50 ring-2 ring-[#0026b3]/20 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">{t.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* จำนวนที่นั่งและอัตราค่าลงทะเบียน */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">จำนวนที่นั่งรองรับสูงสุด (คน) *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.maxSeats}
                onChange={(e) => setFormData({ ...formData, maxSeats: parseInt(e.target.value) || 0 })}
                placeholder="เช่น 500"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">ค่าลงทะเบียนเริ่มต้น (บาท) *</label>
              <input
                type="number"
                required
                min={0}
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value) || 0 })}
                placeholder="เช่น 3500"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
              />
            </div>
          </div>

          {/* รหัสเจ้าหน้าที่ (Staff Passcode 6 หลัก) พร้อมปุ่มสุ่ม */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>รหัสเจ้าหน้าที่ประจำจุดลงทะเบียน (Staff PIN 6 หลัก) *</span>
              </label>
              <span className="text-xs text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded-full">
                สำหรับสตาฟใช้เข้าสู่ระบบสแกน QR หน้างาน
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="relative w-44">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.staffCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, staffCode: val });
                  }}
                  placeholder="000000"
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-center text-xl font-mono font-extrabold tracking-[0.35em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/30 focus:border-[#0026b3] transition shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, staffCode: generateRandomPin() })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer active:scale-95 shadow-2xs"
                title="กดเพื่อสุ่มรหัสตัวเลข 6 หลักใหม่"
              >
                <Dices className="w-4 h-4 text-white" />
                <span>สุ่มตัวเลข 6 หลัก</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              💡 เจ้าหน้าที่ (Staff) หน้างานสามารถใช้รหัส 6 หลักนี้เพื่อยืนยันตัวตนก่อนเปิดกล้องสแกน QR Code เช็คชื่อผู้เข้าร่วมงาน
            </p>
          </div>
        </div>

        {/* Section 2: กำหนดการและสถานที่จัดงาน */}
        <div className="space-y-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0026b3]" />
              2. กำหนดการและสถานที่จัดงาน
            </h3>
            {formData.date && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0026b3] border border-blue-200 text-xs font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formData.date}</span>
                {formData.time && (
                  <>
                    <span className="text-slate-400">•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formData.time}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* วันที่จัดงาน (Calendar Range Picker) * */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                วันที่จัดงาน (เลือกช่วงวันที่จากปฏิทิน) *
              </label>
              <ThaiDateRangePicker
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
                placeholder="คลิกเพื่อเลือกช่วงวันที่"
                required
              />
            </div>

            {/* เวลาจัดงาน (Time Range Picker) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                เวลาจัดงาน (เลือกช่วงเวลา)
              </label>
              <ThaiTimeRangePicker
                value={formData.time}
                onChange={(val) => setFormData({ ...formData, time: val })}
                placeholder="คลิกเพื่อเลือกช่วงเวลา"
              />
            </div>
          </div>

          {/* สถานที่จัดงาน พร้อมปุ่มลัดสถานที่ยอดนิยม */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">สถานที่จัดงาน / ลิงก์ระบบ Zoom</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="เช่น ห้องแกรนด์บอลรูม โรงแรม Grand Hyatt Erawan Bangkok"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
            />
            {/* Quick Location Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>คลิกเพื่อเลือกสถานที่ยอดนิยม (ไม่ต้องพิมพ์):</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setFormData({ ...formData, location: loc })}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      formData.location === loc
                        ? 'bg-blue-100 text-[#0026b3] border-blue-300'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0026b3] border-slate-200'
                    }`}
                  >
                    {loc.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: ระเบียบวาระและหัวข้อบรรยาย */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0026b3]" />
              3. ระเบียบวาระและหัวข้อบรรยาย (ถ้ามี)
            </h3>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, description: 'การประชุมวิชาการประจำปีสมาคมเวชศาสตร์การเจริญพันธุ์ไทย นำเสนอผลงานวิจัยล่าสุด นวัตกรรมด้าน IVF และเทคโนโลยีเพาะเลี้ยงตัวอ่อน พร้อมมอบหน่วยกิต CME สำหรับแพทย์' })}
              className="text-xs text-[#0026b3] hover:underline cursor-pointer font-bold"
            >
              + ใส่ข้อความแนะนำ
            </button>
          </div>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="ระบุรายละเอียดวาระการประชุม วิทยากรรับเชิญ หรือหมายเหตุ..."
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition resize-none shadow-2xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ระบบจะสร้างรหัสการประชุม (Meeting ID) และเปิดช่องทางลงทะเบียนให้อัตโนมัติ</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm px-8 py-3 rounded-xl shadow-md shadow-[#0026b3]/20 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#4ade80]" />
              <span>บันทึกและเปิดรับลงทะเบียน</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─── 3. MEETING HISTORY & MANAGEMENT PANEL (Light Theme) ─────────────────── */

function MeetingHistoryPanel({
  meetings,
  onNavigateTab,
  onUpdateStatus,
  onDeleteMeeting,
}: {
  meetings: MeetingItem[];
  onNavigateTab?: (tab: AdminTab) => void;
  onUpdateStatus?: (id: string, status: 'upcoming' | 'ongoing' | 'completed') => void;
  onDeleteMeeting?: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchText =
        m.titleTh.toLowerCase().includes(search.toLowerCase()) ||
        m.location.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchText && matchStatus;
    });
  }, [meetings, search, filterStatus]);

  const handleExportMeetingsExcel = () => {
    const headers = ['รหัสโครงการ', 'ชื่อการประชุม (ไทย)', 'ชื่อการประชุม (อังกฤษ)', 'รูปแบบ', 'วันที่', 'เวลา', 'สถานที่', 'ที่นั่งสูงสุด', 'ลงทะเบียน (คน)', 'เช็คอิน (คน)', 'รายได้ (บาท)', 'สถานะ'];
    const rows = filteredMeetings.map((m) => [
      m.id,
      `"${m.titleTh}"`,
      `"${m.titleEn}"`,
      m.type,
      `"${m.date}"`,
      `"${m.time}"`,
      `"${m.location}"`,
      m.maxSeats,
      m.registered,
      m.attended,
      m.revenue,
      m.status === 'ongoing' ? 'กำลังจัดงาน' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meetings_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <ClipboardList className="w-4 h-4 text-[#0026b3]" />
            <span>ระบบติดตามและประวัติการประชุมทั้งหมด</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ประวัติและการจัดการประชุม</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ดูสถิติผู้เข้าร่วม อัตราการเช็คอิน และรายได้ของการประชุมแต่ละรอบ ({filteredMeetings.length} โครงการ)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMeetingsExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel ({filteredMeetings.length})</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อการประชุม หรือสถานที่..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 p-0.5">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `ทั้งหมด (${meetings.length})` },
            { id: 'ongoing', label: `กำลังจัด (${meetings.filter((m) => m.status === 'ongoing').length})` },
            { id: 'upcoming', label: `รอเริ่มงาน (${meetings.filter((m) => m.status === 'upcoming').length})` },
            { id: 'completed', label: `เสร็จสิ้น (${meetings.filter((m) => m.status === 'completed').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-800">ไม่พบโครงการการประชุมตามเงื่อนไข</div>
            <p className="text-xs text-slate-500">กรุณาลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น</p>
          </div>
        ) : (
          filteredMeetings.map((m) => {
            const attendancePercent = m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0;
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{m.id}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                        m.status === 'ongoing'
                          ? 'bg-[#4ade80]/15 text-emerald-800 border-[#4ade80]/40'
                          : m.status === 'upcoming'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {m.status === 'ongoing' ? '● กำลังดำเนินการ' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0026b3] border border-blue-200 uppercase">
                        {m.type}
                      </span>
                      {m.staffCode && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Staff PIN: {m.staffCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{m.titleTh}</h3>
                    <div className="text-xs text-slate-500 font-medium">{m.titleEn}</div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#0026b3]" /> {m.date} ({m.time})</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#0026b3]" /> {m.location}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 shrink-0 text-center">
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ลงทะเบียน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">{m.registered}/{m.maxSeats}</div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">เช็คอินเข้างาน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-emerald-700">{m.attended} <span className="text-[11px] font-normal">({attendancePercent}%)</span></div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ยอดเงินรวม</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">฿{(m.revenue / 1000).toFixed(0)}k</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-medium">
                    <span>ความคืบหน้าการเช็คอินเข้างาน ({m.attended}/{m.registered} ที่นั่ง)</span>
                    <span className="font-bold text-emerald-700">{attendancePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-[#4ade80] rounded-full transition-all duration-500"
                      style={{ width: `${attendancePercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Management Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">เปลี่ยนสถานะ:</span>
                    <select
                      value={m.status}
                      onChange={(e) => onUpdateStatus?.(m.id, e.target.value as any)}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 cursor-pointer focus:outline-none focus:border-[#0026b3]"
                    >
                      <option value="upcoming">รอเริ่มงาน (Upcoming)</option>
                      <option value="ongoing">กำลังดำเนินการ (Ongoing)</option>
                      <option value="completed">เสร็จสิ้นแล้ว (Completed)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onNavigateTab && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('verify-attendees')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>ดูผู้เข้าร่วม</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('revenue-report')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>รายงานรายได้</span>
                        </button>
                      </>
                    )}
                    {onDeleteMeeting && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`ยืนยันการลบโครงการประชุม "${m.titleTh}"?`)) {
                            onDeleteMeeting(m.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition cursor-pointer"
                        title="ลบโครงการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── 4. VERIFY SLIPS PANEL (Light Theme) ─────────────────────────────────── */

function VerifySlipsPanel({
  slips,
  onApprove,
  onReject,
  onResetToPending,
  onPrintReceipt,
}: {
  slips: SlipItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onResetToPending?: (id: string) => void;
  onPrintReceipt?: (slip: SlipItem) => void;
}) {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<SlipItem | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      const matchStatus = filterTab === 'all' || s.status === filterTab;
      const matchSearch =
        s.nameTh.toLowerCase().includes(search.toLowerCase()) ||
        s.refNo.toLowerCase().includes(search.toLowerCase()) ||
        s.workplace.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [slips, filterTab, search]);

  const handleOpenReject = (slip: SlipItem) => {
    setSelectedSlip(slip);
    setRejectReasonInput('ยอดเงินไม่ตรงกับค่าลงทะเบียน');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedSlip) {
      onReject(selectedSlip.id, rejectReasonInput || 'ไม่ผ่านการตรวจสอบ');
      setIsRejectModalOpen(false);
      setSelectedSlip(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <Receipt className="w-4 h-4 text-[#0026b3]" />
            <span>ศูนย์ตรวจสอบสลิปและหลักฐานการโอนเงิน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ตรวจสอบสลิปการโอนเงิน</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ตรวจสอบความถูกต้องของยอดเงิน บัญชีปลายทาง และอนุมัติสิทธิ์การเข้างานอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, เลขที่ธุรกรรม..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'pending', label: `รอตรวจสอบ (${slips.filter((s) => s.status === 'pending').length})` },
            { id: 'approved', label: `อนุมัติแล้ว (${slips.filter((s) => s.status === 'approved').length})` },
            { id: 'rejected', label: `ปฏิเสธ (${slips.filter((s) => s.status === 'rejected').length})` },
            { id: 'all', label: `ทั้งหมด (${slips.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                filterTab === tab.id
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slips Cards */}
      <div className="space-y-3.5">
        {filteredSlips.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-base font-bold text-slate-900">ไม่มีรายการสลิปในหมวดนี้</div>
            <p className="text-xs sm:text-sm">ทุกรายการได้รับการตรวจสอบเรียบร้อยแล้ว</p>
          </div>
        ) : (
          filteredSlips.map((slip) => (
            <div
              key={slip.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Side: Attendee Info */}
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                {/* Thumbnail */}
                <div
                  onClick={() => setSelectedSlip(slip)}
                  className="w-14 sm:w-16 h-16 sm:h-18 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-[#0026b3]/40 hover:bg-blue-50/50 transition group p-1.5"
                >
                  <Receipt className="w-5 sm:w-6 h-5 sm:h-6 text-[#0026b3] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1">ดูสลิป</span>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">{slip.nameTh}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      slip.status === 'approved'
                        ? 'bg-[#4ade80]/20 text-emerald-800 border-[#4ade80]/40 font-bold'
                        : slip.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {slip.status === 'approved' ? 'อนุมัติแล้ว' : slip.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Ref: {slip.refNo}</span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-600 truncate">{slip.ticketType} • {slip.workplace}</div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 flex-wrap">
                    <span className="font-extrabold text-emerald-700">฿{slip.amount.toLocaleString()}</span>
                    <span>{slip.bank}</span>
                    <span>{slip.transferDate} {slip.transferTime}</span>
                  </div>

                  {slip.rejectionReason && (
                    <div className="text-xs sm:text-sm text-rose-600 font-semibold mt-1">
                      เหตุผลที่ปฏิเสธ: {slip.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                <button
                  onClick={() => setSelectedSlip(slip)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#0026b3]" />
                  <span>ตรวจสลิป</span>
                </button>

                {slip.status === 'approved' && onPrintReceipt && (
                  <button
                    onClick={() => onPrintReceipt(slip)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                    title="พิมพ์ใบเสร็จรับเงิน"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ใบเสร็จ</span>
                  </button>
                )}

                {slip.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApprove(slip.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติ</span>
                    </button>
                    <button
                      onClick={() => handleOpenReject(slip)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>ปฏิเสธ</span>
                    </button>
                  </>
                )}

                {(slip.status === 'approved' || slip.status === 'rejected') && onResetToPending && (
                  <button
                    onClick={() => onResetToPending(slip.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border border-slate-200 transition cursor-pointer"
                    title="รีเซ็ตกลับเป็นรอตรวจสอบ"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>ตรวจใหม่</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slip Preview Modal (Light Theme) */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0026b3]" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">ตรวจสอบหลักฐานการโอนเงิน</h3>
              </div>
              <button onClick={() => setSelectedSlip(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Slip Preview Image */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-xs sm:text-sm text-slate-600">สลิปโอนเงินสำเร็จจาก {selectedSlip.bank}</div>
              <div className="text-3xl font-extrabold text-slate-900">฿{selectedSlip.amount.toLocaleString()}</div>
              <div className="text-xs font-mono text-slate-500">Ref: {selectedSlip.refNo}</div>
              <div className="text-xs sm:text-sm text-slate-500">{selectedSlip.transferDate} {selectedSlip.transferTime}</div>
            </div>

            {/* Slip Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ผู้โอน:</span><span className="font-bold text-slate-900">{selectedSlip.nameTh}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">บัตรลงทะเบียน:</span><span className="font-bold text-[#0026b3]">{selectedSlip.ticketType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">สถานที่ทำงาน:</span><span className="text-slate-700 font-medium">{selectedSlip.workplace}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">เบอร์โทร:</span><span className="text-slate-700 font-medium">{selectedSlip.phone}</span></div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {selectedSlip.status === 'approved' && onPrintReceipt && (
                <button
                  onClick={() => {
                    onPrintReceipt(selectedSlip);
                    setSelectedSlip(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบเสร็จรับเงิน</span>
                </button>
              )}
              {selectedSlip.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      onApprove(selectedSlip.id);
                      setSelectedSlip(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition cursor-pointer"
                  >
                    อนุมัติการชำระเงิน
                  </button>
                  <button
                    onClick={() => {
                      handleOpenReject(selectedSlip);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-sm transition cursor-pointer"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {isRejectModalOpen && selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลในการปฏิเสธสลิป
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">ระบบจะส่งข้อความแจ้งเตือนไปยังผู้ลงทะเบียนเพื่อให้ดำเนินการแนบสลิปใหม่</p>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700">เหตุผล</label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer shadow-xs"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 5. VERIFY ATTENDEES PANEL (Light Theme with Round Filter) ───────────── */

function VerifyAttendeesPanel({
  attendees,
  meetings,
  onToggleCheckIn,
  onAddAttendee,
  onPrintReceipt,
}: {
  attendees: AttendeeItem[];
  meetings: MeetingItem[];
  onToggleCheckIn: (id: string) => void;
  onAddAttendee?: (newAttendee: AttendeeItem) => void;
  onPrintReceipt?: (attendee: AttendeeItem) => void;
}) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);

  // Walk-in modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    nameTh: '',
    nameEn: '',
    id4Digits: '',
    phone: '',
    email: '',
    workplace: '',
    meetingId: meetings[0]?.id || '',
    memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
    ticketType: 'THAISRM Congress Full Pass',
    paymentStatus: 'paid' as 'paid' | 'pending',
    checkInNow: true,
  });

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInData.nameTh || !walkInData.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    const meeting = meetings.find((m) => m.id === walkInData.meetingId) || meetings[0];
    const newAttendee: AttendeeItem = {
      id: `ATT-${Date.now()}`,
      code: Math.floor(100100 + Math.random() * 9000).toString(),
      nameTh: walkInData.nameTh,
      nameEn: walkInData.nameEn || walkInData.nameTh,
      id4Digits: walkInData.id4Digits || walkInData.phone.slice(-4),
      email: walkInData.email || 'attendee@thaisrm.org',
      phone: walkInData.phone,
      workplace: walkInData.workplace || 'โรงพยาบาล/คลินิก',
      memberType: walkInData.memberType,
      ticketType: walkInData.ticketType,
      ticketCode: `TSRM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      meetingId: meeting?.id || '',
      meetingTitle: meeting?.titleTh || 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
      registeredDate: '10 ก.ย. 2569',
      paymentStatus: walkInData.paymentStatus,
      checkInStatus: walkInData.checkInNow ? 'checked_in' : 'not_checked_in',
      checkInTime: walkInData.checkInNow ? '10:30 น.' : undefined,
    };

    onAddAttendee?.(newAttendee);
    setIsAddModalOpen(false);
    setWalkInData({
      nameTh: '',
      nameEn: '',
      id4Digits: '',
      phone: '',
      email: '',
      workplace: '',
      meetingId: meetings[0]?.id || '',
      memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
      ticketType: 'THAISRM Congress Full Pass',
      paymentStatus: 'paid',
      checkInNow: true,
    });
  };

  // Selected meeting object
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Filter attendees by selected round first
  const roundAttendees = useMemo(() => {
    if (selectedMeetingId === 'all') return attendees;
    return attendees.filter(
      (a) =>
        a.meetingId === selectedMeetingId ||
        (currentMeeting && a.meetingTitle === currentMeeting.titleTh)
    );
  }, [attendees, selectedMeetingId, currentMeeting]);

  // Secondary filtering (search, check-in status, payment status)
  const filteredAttendees = useMemo(() => {
    return roundAttendees.filter((a) => {
      const matchStatus = filterCheckIn === 'all' || a.checkInStatus === filterCheckIn;
      const matchPayment = filterPayment === 'all' || a.paymentStatus === filterPayment;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.nameTh.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        a.id4Digits.includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.workplace.toLowerCase().includes(q) ||
        a.ticketCode.toLowerCase().includes(q);
      return matchStatus && matchPayment && matchSearch;
    });
  }, [roundAttendees, filterCheckIn, filterPayment, search]);

  // Statistics for the selected round
  const totalInRound = roundAttendees.length;
  const checkedInInRound = roundAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
  const notCheckedInInRound = totalInRound - checkedInInRound;
  const paidInRound = roundAttendees.filter((a) => a.paymentStatus === 'paid').length;
  const rateInRound = totalInRound > 0 ? Math.round((checkedInInRound / totalInRound) * 100) : 0;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['รหัสสมาชิก', 'เลขท้าย 4 หลัก', 'ชื่อ-นามสกุล (ไทย)', 'ชื่อ-นามสกุล (อังกฤษ)', 'อีเมล', 'โทรศัพท์', 'สถานที่ทำงาน', 'ประเภทสมาชิก', 'ประเภทบัตร', 'รหัสตั๋ว', 'รอบการประชุม', 'สถานะชำระเงิน', 'สถานะเช็คอิน', 'เวลาเช็คอิน'];
    const rows = filteredAttendees.map((a) => [
      a.code,
      a.id4Digits,
      `"${a.nameTh}"`,
      `"${a.nameEn}"`,
      a.email,
      a.phone,
      `"${a.workplace}"`,
      `"${a.memberType}"`,
      `"${a.ticketType}"`,
      a.ticketCode,
      `"${a.meetingTitle}"`,
      a.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ',
      a.checkInStatus === 'checked_in' ? 'เช็คอินแล้ว' : 'ยังไม่เข้าร่วม',
      a.checkInTime || '-',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const roundSlug = selectedMeetingId === 'all' ? 'all-rounds' : selectedMeetingId.toLowerCase();
    link.setAttribute('download', `attendees_${roundSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <UserCheck className="w-4 h-4 text-[#0026b3]" />
            <span>ระบบตรวจสอบรายชื่อและเช็คอินผู้เข้าร่วมประชุม</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ตรวจสอบผู้เข้าร่วมประชุม</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ค้นหาข้อมูลสมาชิก ตรวจสอบการลงทะเบียน และบันทึกการเช็คอินแยกตามรอบการประชุม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#4ade80]" />
            <span>+ ลงทะเบียน Walk-in</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export รายชื่อ ({filteredAttendees.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Meeting Round Filter Selector ───────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#0026b3]" />
            <span>เลือกรอบการประชุม (Select Meeting Round):</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            กำลังแสดง: <strong className="text-slate-800">{selectedMeetingId === 'all' ? 'ทุกรอบการประชุม' : currentMeeting?.titleTh}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* All Rounds Pill */}
          <button
            onClick={() => setSelectedMeetingId('all')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2.5 shrink-0 ${
              selectedMeetingId === 'all'
                ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ทุกรอบการประชุม (All Rounds)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                selectedMeetingId === 'all'
                  ? 'bg-[#4ade80] text-slate-950 font-black'
                  : 'bg-blue-100 text-[#0026b3]'
              }`}
            >
              {attendees.length} คน
            </span>
          </button>

          {/* Individual Meeting Pills */}
          {meetings.map((m) => {
            const mAttendees = attendees.filter(
              (a) => a.meetingId === m.id || a.meetingTitle === m.titleTh
            );
            const mChecked = mAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
            const isSelected = selectedMeetingId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMeetingId(m.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="max-w-[200px] truncate">{m.titleTh}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-[#4ade80] text-slate-950 font-black'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {mChecked}/{mAttendees.length || m.registered}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Selected Round Info & Key Stats ─────────────────────────────── */}
      {currentMeeting ? (
        <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#0026b3] bg-blue-100 px-2.5 py-0.5 rounded-md">
                  {currentMeeting.id}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    currentMeeting.status === 'ongoing'
                      ? 'bg-[#4ade80]/15 text-emerald-800 border-[#4ade80]/40'
                      : currentMeeting.status === 'upcoming'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {currentMeeting.status === 'ongoing'
                    ? '● กำลังดำเนินการ'
                    : currentMeeting.status === 'upcoming'
                    ? 'รอเริ่มงาน'
                    : 'เสร็จสิ้น'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0026b3] border border-blue-200 uppercase">
                  {currentMeeting.type}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {currentMeeting.titleTh}
              </h2>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentMeeting.titleEn}
              </div>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#0026b3]" /> {currentMeeting.date} ({currentMeeting.time})
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0026b3]" /> {currentMeeting.location}
                </span>
              </div>
            </div>

            {/* Quick Metrics in Current Round */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-blue-200/60 shrink-0 text-center shadow-xs">
              <div className="px-2">
                <div className="text-[11px] text-slate-500 font-bold">ผู้ลงทะเบียน</div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900">
                  {totalInRound} <span className="text-xs text-slate-400 font-normal">/ {currentMeeting.maxSeats}</span>
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">เช็คอินแล้ว</div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-600">
                  {checkedInInRound}
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">ยังไม่เช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-amber-600">
                  {notCheckedInInRound}
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">อัตราเช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-[#0026b3]">
                  {rateInRound}%
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>ความคืบหน้าการเช็คอินเข้างานรอบนี้</span>
              <span className="font-extrabold text-[#0026b3]">{rateInRound}% ({checkedInInRound}/{totalInRound} คน)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-full transition-all duration-500"
                style={{ width: `${rateInRound}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        /* Overall Progress & Quick Stats Card (When All Rounds selected) */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">อัตราการเช็คอินเข้างานรวมทุกรอบการประชุม</span>
              <span className="text-sm font-extrabold text-[#0026b3]">
                ({checkedInInRound}/{totalInRound} คน)
              </span>
            </div>
            <span className="text-base font-extrabold text-emerald-700">{rateInRound}% สำเร็จ</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-full transition-all duration-700"
              style={{ width: `${rateInRound}%` }}
            ></div>
          </div>

          {/* 4 Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs sm:text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 font-medium text-xs">จำนวนรอบประชุม</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{meetings.length} รอบ</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 font-medium text-xs">ผู้ลงทะเบียนทั้งหมด</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{totalInRound} คน</div>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="text-emerald-700 font-medium text-xs">เช็คอินเข้างานแล้ว</div>
              <div className="text-base font-extrabold text-emerald-800 mt-0.5">{checkedInInRound} คน</div>
            </div>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <div className="text-amber-700 font-medium text-xs">ยังไม่เข้างาน</div>
              <div className="text-base font-extrabold text-amber-800 mt-0.5">{notCheckedInInRound} คน</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Secondary Filter Bar ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 flex-1 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ-นามสกุล, เลขสมาชิก, เลข 4 ตัวท้าย, สังกัด, รหัสตั๋ว..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Check-In Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            {[
              { id: 'all', label: `ทั้งหมด (${roundAttendees.length})` },
              { id: 'checked_in', label: `เช็คอินแล้ว (${checkedInInRound})` },
              { id: 'not_checked_in', label: `ยังไม่เข้าร่วม (${notCheckedInInRound})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCheckIn(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCheckIn === tab.id
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none shadow-xs cursor-pointer focus:border-[#0026b3]"
          >
            <option value="all">การชำระเงิน: ทั้งหมด</option>
            <option value="paid">ชำระแล้ว ({roundAttendees.filter((a) => a.paymentStatus === 'paid').length})</option>
            <option value="pending">รอชำระ ({roundAttendees.filter((a) => a.paymentStatus === 'pending').length})</option>
          </select>
        </div>
      </div>

      {/* ─── Attendees Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
              <th className="px-5 py-3.5">รหัสสมาชิก</th>
              <th className="px-5 py-3.5">ชื่อ-นามสกุล / สังกัด</th>
              <th className="px-5 py-3.5">รอบการประชุม</th>
              <th className="px-5 py-3.5">ประเภทสมาชิก / ตั๋ว</th>
              <th className="px-5 py-3.5">การชำระเงิน</th>
              <th className="px-5 py-3.5">สถานะเช็คอิน</th>
              <th className="px-5 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-bold text-slate-700">ไม่พบข้อมูลผู้เข้าร่วมตามเงื่อนไขที่เลือก</div>
                  <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกตัวกรองรอบการประชุมใหม่</p>
                </td>
              </tr>
            ) : (
              filteredAttendees.map((a) => {
                const meeting = meetings.find((m) => m.id === a.meetingId || m.titleTh === a.meetingTitle);

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-5 py-4 font-mono text-slate-700 font-bold">
                      {a.code}
                      <div className="text-xs text-slate-400 font-normal">ID4: {a.id4Digits}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#0026b3] transition">
                        {a.nameTh}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">{a.workplace}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-200 max-w-[200px] truncate">
                        <CalendarDays className="w-3 h-3 shrink-0 text-[#0026b3]" />
                        <span className="truncate">{meeting ? meeting.titleTh : a.meetingTitle}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-700 font-semibold">{a.memberType}</div>
                      <div className="text-xs text-[#0026b3] font-mono font-medium">{a.ticketCode}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          a.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {a.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {a.checkInStatus === 'checked_in' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> เช็คอินแล้ว
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">{a.checkInTime}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> ยังไม่เข้าร่วม
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.paymentStatus === 'paid' && onPrintReceipt && (
                          <button
                            onClick={() => onPrintReceipt(a)}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200 transition cursor-pointer"
                            title="พิมพ์ใบเสร็จรับเงิน"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onToggleCheckIn(a.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                            a.checkInStatus === 'checked_in'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-xs'
                          }`}
                        >
                          {a.checkInStatus === 'checked_in' ? 'ยกเลิก' : 'เช็คอิน'}
                        </button>
                        <button
                          onClick={() => setSelectedAttendee(a)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Attendee Details Modal ──────────────────────────────────────── */}
      {selectedAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0026b3]" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">รายละเอียดข้อมูลผู้เข้าร่วม</h3>
              </div>
              <button
                onClick={() => setSelectedAttendee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-lg font-extrabold text-slate-900">{selectedAttendee.nameTh}</div>
                <div className="text-xs text-slate-500">{selectedAttendee.nameEn}</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500">รหัสสมาชิก:</span>{' '}
                    <span className="font-bold text-[#0026b3]">{selectedAttendee.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ID 4 ตัวท้าย:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedAttendee.id4Digits}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">โทรศัพท์:</span>{' '}
                    <span className="text-slate-800 font-medium">{selectedAttendee.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">อีเมล:</span>{' '}
                    <span className="text-slate-800 truncate font-medium">{selectedAttendee.email}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">รอบการประชุม:</span>
                  <span className="text-[#0026b3] font-bold text-right max-w-[260px]">{selectedAttendee.meetingTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานที่ทำงาน:</span>
                  <span className="text-slate-800 font-bold">{selectedAttendee.workplace}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทสมาชิก:</span>
                  <span className="text-slate-800 font-bold">{selectedAttendee.memberType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทบัตร:</span>
                  <span className="text-emerald-700 font-bold">{selectedAttendee.ticketType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสตั๋ว:</span>
                  <span className="font-mono font-bold text-[#0026b3]">{selectedAttendee.ticketCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานะการชำระเงิน:</span>
                  <span className={`font-bold ${selectedAttendee.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedAttendee.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
              {selectedAttendee.paymentStatus === 'paid' && onPrintReceipt && (
                <button
                  onClick={() => {
                    onPrintReceipt(selectedAttendee);
                    setSelectedAttendee(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบเสร็จ</span>
                </button>
              )}
              <button
                onClick={() => {
                  onToggleCheckIn(selectedAttendee.id);
                  setSelectedAttendee(null);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-xs transition ${
                  selectedAttendee.checkInStatus === 'checked_in'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-[#0026b3] hover:bg-[#001f94] text-white'
                }`}
              >
                {selectedAttendee.checkInStatus === 'checked_in' ? 'ยกเลิกการเช็คอิน' : 'เช็คอินผู้เข้าร่วมทันที'}
              </button>
              <button
                onClick={() => setSelectedAttendee(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Registration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0026b3]">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  ลงทะเบียนผู้เข้าร่วมหน้างาน (Walk-in)
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รอบการประชุมที่ลงทะเบียน *
                </label>
                <select
                  value={walkInData.meetingId}
                  onChange={(e) => setWalkInData({ ...walkInData, meetingId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  required
                >
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titleTh} ({m.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุล (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInData.nameTh}
                    onChange={(e) => setWalkInData({ ...walkInData, nameTh: e.target.value })}
                    placeholder="เช่น นพ.สมศักดิ์ สุขใจ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุล (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={walkInData.nameEn}
                    onChange={(e) => setWalkInData({ ...walkInData, nameEn: e.target.value })}
                    placeholder="e.g. Dr. Somsak Sookjai"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={walkInData.phone}
                    onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                    placeholder="081-234-5678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขท้าย 4 หลักบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={walkInData.id4Digits}
                    onChange={(e) => setWalkInData({ ...walkInData, id4Digits: e.target.value })}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    value={walkInData.email}
                    onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยงาน / สถานที่ทำงาน
                  </label>
                  <input
                    type="text"
                    value={walkInData.workplace}
                    onChange={(e) => setWalkInData({ ...walkInData, workplace: e.target.value })}
                    placeholder="เช่น รพ.รามาธิบดี"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทสมาชิก
                  </label>
                  <select
                    value={walkInData.memberType}
                    onChange={(e) => setWalkInData({ ...walkInData, memberType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  >
                    <option value="แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)">แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)</option>
                    <option value="สูตินรีแพทย์ทั่วไป (OB-GYN)">สูตินรีแพทย์ทั่วไป (OB-GYN)</option>
                    <option value="นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)">นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)</option>
                    <option value="พยาบาลและบุคลากรทางการแพทย์">พยาบาลและบุคลากรทางการแพทย์</option>
                    <option value="สมาชิกทั่วไป">สมาชิกทั่วไป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทบัตร
                  </label>
                  <select
                    value={walkInData.ticketType}
                    onChange={(e) => setWalkInData({ ...walkInData, ticketType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  >
                    <option value="THAISRM Congress Full Pass">THAISRM Congress Full Pass (3,500 บาท)</option>
                    <option value="Special Workshop: Hands-on Embryo">Special Workshop (5,000 บาท)</option>
                    <option value="Single Day Pass: Day 1">Single Day Pass: Day 1 (2,000 บาท)</option>
                    <option value="Single Day Pass: Day 2">Single Day Pass: Day 2 (2,000 บาท)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={walkInData.paymentStatus === 'paid'}
                      onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'paid' })}
                      className="accent-[#0026b3]"
                    />
                    <span className="text-xs font-bold text-emerald-700">ชำระเงินแล้ว (Paid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={walkInData.paymentStatus === 'pending'}
                      onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'pending' })}
                      className="accent-[#0026b3]"
                    />
                    <span className="text-xs font-bold text-amber-700">รอชำระ (Pending)</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200/60">
                  <input
                    type="checkbox"
                    checked={walkInData.checkInNow}
                    onChange={(e) => setWalkInData({ ...walkInData, checkInNow: e.target.checked })}
                    className="rounded accent-[#0026b3] w-4 h-4"
                  />
                  <span className="text-xs font-bold text-[#0026b3]">เช็คอินเข้างานทันที</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0026b3]/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#4ade80]" />
                  <span>บันทึกผู้เข้าร่วม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN ADMIN ROOT COMPONENT ───────────────────────────────────────────── */

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [meetings, setMeetings] = useState<MeetingItem[]>(INITIAL_MEETINGS);
  const [slips, setSlips] = useState<SlipItem[]>(INITIAL_SLIPS);
  const [attendees, setAttendees] = useState<AttendeeItem[]>(INITIAL_ATTENDEES);
  const [receipts, setReceipts] = useState<ReceiptData[]>(INITIAL_RECEIPTS);

  // Global Receipt Modal for quick print from attendees/slips
  const [globalReceipt, setGlobalReceipt] = useState<ReceiptData | null>(null);
  const [isGlobalReceiptOpen, setIsGlobalReceiptOpen] = useState(false);

  const pendingSlipsCount = slips.filter((s) => s.status === 'pending').length;
  const checkedInCount = attendees.filter((a) => a.checkInStatus === 'checked_in').length;

  const handleApproveSlip = (slipId: string) => {
    const targetSlip = slips.find((s) => s.id === slipId);
    if (!targetSlip) return;

    setSlips((prev) =>
      prev.map((s) => (s.id === slipId ? { ...s, status: 'approved' } : s))
    );

    // Update meeting revenue & registered count
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id === targetSlip.meetingId) {
          return {
            ...m,
            revenue: m.revenue + targetSlip.amount,
            registered: m.registered + 1,
          };
        }
        return m;
      })
    );

    // Update attendee payment status or create attendee if not present
    setAttendees((prev) => {
      const existingIndex = prev.findIndex(
        (a) => a.phone === targetSlip.phone || a.code === targetSlip.memberCode
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          paymentStatus: 'paid',
          meetingId: targetSlip.meetingId,
          ticketType: targetSlip.ticketType,
        };
        return updated;
      } else {
        const targetMeeting = meetings.find((m) => m.id === targetSlip.meetingId);
        const newAtt: AttendeeItem = {
          id: `ATT-${Date.now()}`,
          code: targetSlip.memberCode || Math.floor(100100 + Math.random() * 9000).toString(),
          nameTh: targetSlip.nameTh,
          nameEn: targetSlip.nameTh,
          id4Digits: targetSlip.phone.slice(-4),
          email: 'attendee@thaisrm.org',
          phone: targetSlip.phone,
          workplace: targetSlip.workplace,
          memberType: 'สมาชิกทั่วไป',
          ticketType: targetSlip.ticketType,
          ticketCode: `TSRM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          meetingId: targetSlip.meetingId,
          meetingTitle: targetMeeting?.titleTh || 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
          registeredDate: targetSlip.transferDate || '10 ก.ย. 2569',
          paymentStatus: 'paid',
          checkInStatus: 'not_checked_in',
        };
        return [newAtt, ...prev];
      }
    });
  };

  const handleRejectSlip = (slipId: string, reason: string) => {
    const targetSlip = slips.find((s) => s.id === slipId);
    setSlips((prev) =>
      prev.map((s) => (s.id === slipId ? { ...s, status: 'rejected', rejectionReason: reason } : s))
    );

    // If slip was previously approved, reduce meeting revenue & registered count
    if (targetSlip && targetSlip.status === 'approved') {
      setMeetings((prev) =>
        prev.map((m) => {
          if (m.id === targetSlip.meetingId) {
            return {
              ...m,
              revenue: Math.max(0, m.revenue - targetSlip.amount),
              registered: Math.max(0, m.registered - 1),
            };
          }
          return m;
        })
      );
    }

    // Update matching attendee if present to pending
    if (targetSlip) {
      setAttendees((prev) =>
        prev.map((a) => {
          if (a.phone === targetSlip.phone || a.code === targetSlip.memberCode) {
            return { ...a, paymentStatus: 'pending' };
          }
          return a;
        })
      );
    }
  };

  const handleResetSlip = (slipId: string) => {
    const targetSlip = slips.find((s) => s.id === slipId);
    if (!targetSlip) return;

    if (targetSlip.status === 'approved') {
      setMeetings((prev) =>
        prev.map((m) => {
          if (m.id === targetSlip.meetingId) {
            return {
              ...m,
              revenue: Math.max(0, m.revenue - targetSlip.amount),
              registered: Math.max(0, m.registered - 1),
            };
          }
          return m;
        })
      );
    }

    setSlips((prev) =>
      prev.map((s) => (s.id === slipId ? { ...s, status: 'pending', rejectionReason: undefined } : s))
    );
  };

  const handleToggleCheckIn = (attendeeId: string) => {
    const targetAttendee = attendees.find((a) => a.id === attendeeId);
    if (!targetAttendee) return;
    const nextStatus = targetAttendee.checkInStatus === 'checked_in' ? 'not_checked_in' : 'checked_in';

    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id === attendeeId) {
          return {
            ...a,
            checkInStatus: nextStatus,
            checkInTime:
              nextStatus === 'checked_in'
                ? new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                : undefined,
          };
        }
        return a;
      })
    );

    // Sync meeting attended count
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id === targetAttendee.meetingId || m.titleTh === targetAttendee.meetingTitle) {
          const delta = nextStatus === 'checked_in' ? 1 : -1;
          return {
            ...m,
            attended: Math.max(0, m.attended + delta),
          };
        }
        return m;
      })
    );
  };

  const handleAddAttendee = (newAttendee: AttendeeItem) => {
    setAttendees((prev) => [newAttendee, ...prev]);

    // Update meeting registered, attended, and revenue counts
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id === newAttendee.meetingId || m.titleTh === newAttendee.meetingTitle) {
          let ticketPrice = m.basePrice || 3500;
          if (newAttendee.ticketType.includes('Workshop')) ticketPrice = 5000;
          if (newAttendee.ticketType.includes('Day')) ticketPrice = 2000;

          return {
            ...m,
            registered: m.registered + 1,
            attended: newAttendee.checkInStatus === 'checked_in' ? m.attended + 1 : m.attended,
            revenue: newAttendee.paymentStatus === 'paid' ? m.revenue + ticketPrice : m.revenue,
          };
        }
        return m;
      })
    );
  };

  const handleUpdateMeetingStatus = (meetingId: string, status: 'upcoming' | 'ongoing' | 'completed') => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, status } : m))
    );
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  const handleMeetingCreated = (newMeeting: MeetingItem) => {
    setMeetings((prev) => [newMeeting, ...prev]);
  };

  // Receipt Handlers
  const handleSaveReceipt = (receipt: ReceiptData) => {
    setReceipts((prev) => {
      const idx = prev.findIndex((r) => r.id === receipt.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = receipt;
        return next;
      }
      return [receipt, ...prev];
    });
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePrintAttendeeReceipt = (attendee: AttendeeItem) => {
    const existing = receipts.find((r) => r.attendeeId === attendee.id);
    if (existing) {
      setGlobalReceipt(existing);
      setIsGlobalReceiptOpen(true);
      return;
    }

    const m = meetings.find((mtg) => mtg.id === attendee.meetingId || mtg.titleTh === attendee.meetingTitle);

    let amount = 3500;
    if (attendee.ticketType.includes('Workshop')) amount = 5000;
    if (attendee.ticketType.includes('Day')) amount = 2000;

    const newReceipt: ReceiptData = {
      id: `REC-${Date.now()}`,
      receiptNo: `2569/03-${Math.floor(Math.random() * 900 + 100)}`,
      receiptDate: '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: attendee.nameTh,
      payerAddressLine1: attendee.workplace || 'กรุงเทพมหานคร',
      payerAddressLine2: 'กรุงเทพมหานคร 10330',
      payerPhone: attendee.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: `ค่าลงทะเบียน ${attendee.ticketType}`,
          subDetails: [
            attendee.meetingTitle || 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
            m ? m.location : 'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
          ],
          amount: amount,
        },
      ],
      totalAmount: amount,
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: '',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      meetingId: attendee.meetingId,
      attendeeId: attendee.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    setGlobalReceipt(newReceipt);
    setIsGlobalReceiptOpen(true);
  };

  const handlePrintSlipReceipt = (slip: SlipItem) => {
    const existing = receipts.find((r) => r.slipId === slip.id);
    if (existing) {
      setGlobalReceipt(existing);
      setIsGlobalReceiptOpen(true);
      return;
    }

    const m = meetings.find((mtg) => mtg.id === slip.meetingId);

    const newReceipt: ReceiptData = {
      id: `REC-${Date.now()}`,
      receiptNo: `2569/03-${Math.floor(Math.random() * 900 + 100)}`,
      receiptDate: slip.transferDate || '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: slip.nameTh,
      payerAddressLine1: slip.workplace || 'กรุงเทพมหานคร',
      payerAddressLine2: 'กรุงเทพมหานคร 10330',
      payerPhone: slip.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: `ค่าลงทะเบียน ${slip.ticketType}`,
          subDetails: [
            m ? m.titleTh : 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
            m ? m.location : 'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
          ],
          amount: slip.amount,
        },
      ],
      totalAmount: slip.amount,
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: '',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      meetingId: slip.meetingId,
      slipId: slip.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    setGlobalReceipt(newReceipt);
    setIsGlobalReceiptOpen(true);
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverviewPanel
            onNavigateTab={setActiveTab}
            meetings={meetings}
            slips={slips}
            attendees={attendees}
          />
        );
      case 'revenue-report':
        return (
          <RevenueReportPanel
            meetings={meetings}
            slips={slips}
            attendees={attendees}
          />
        );
      case 'receipts':
        return (
          <ReceiptManagementPanel
            receipts={receipts}
            meetings={meetings}
            onSaveReceipt={handleSaveReceipt}
            onDeleteReceipt={handleDeleteReceipt}
          />
        );
      case 'add-meeting':
        return <AddMeetingPanel onMeetingCreated={handleMeetingCreated} onNavigateTab={setActiveTab} />;
      case 'meeting-history':
        return (
          <MeetingHistoryPanel
            meetings={meetings}
            onNavigateTab={setActiveTab}
            onUpdateStatus={handleUpdateMeetingStatus}
            onDeleteMeeting={handleDeleteMeeting}
          />
        );
      case 'verify-slip':
        return (
          <VerifySlipsPanel
            slips={slips}
            onApprove={handleApproveSlip}
            onReject={handleRejectSlip}
            onResetToPending={handleResetSlip}
            onPrintReceipt={handlePrintSlipReceipt}
          />
        );
      case 'verify-attendees':
        return (
          <VerifyAttendeesPanel
            attendees={attendees}
            meetings={meetings}
            onToggleCheckIn={handleToggleCheckIn}
            onPrintReceipt={handlePrintAttendeeReceipt}
            onAddAttendee={handleAddAttendee}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#0026b3] selection:text-white">
      {/* Navigation Sidebar (desktop) & Top bar (mobile) */}
      <AdminNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingSlipsCount={pendingSlipsCount}
        totalAttendeesCount={attendees.length}
        checkedInCount={checkedInCount}
        receiptsCount={receipts.length}
        onLogout={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }}
      />

      {/* Main Content Area */}
      <main className="lg:pl-72 min-h-screen transition-all duration-300">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
          {renderActivePanel()}
        </div>
      </main>

      {/* Quick Print Receipt Modal */}
      <ReceiptModal
        receipt={globalReceipt}
        isOpen={isGlobalReceiptOpen}
        onClose={() => setIsGlobalReceiptOpen(false)}
        onEdit={(r) => {
          setIsGlobalReceiptOpen(false);
          setActiveTab('receipts');
        }}
      />
    </div>
  );
}


