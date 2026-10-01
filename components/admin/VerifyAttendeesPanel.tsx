'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdminPageHeader, HeaderButton } from './AdminPageHeader';
import { Btn, IconBtn, EmptyState, ContextBar, StatGrid, StatCard, Toolbar, ToolbarGroup, SearchInput, Segmented, FilterSelect } from './ui';
import { createPortal } from 'react-dom';
import { AttendeeItem, MeetingItem } from './types';
import { PaginationControls } from '@/components/PaginationControls';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import { PositionSelect, POSITION_CATEGORY_OPTIONS } from '@/components/PositionSelect';
import { uploadImageToStorage } from '@/lib/blobUpload';
import {
  UserCheck,
  PlusCircle,
  FileSpreadsheet,
  Filter,
  CalendarDays,
  ChevronDown,
  MapPin,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Pencil,
  Eye,
  RefreshCw,
  Check,
  Users,
  TrendingUp,
  Upload,
  ImageIcon,
  Trash2,
} from 'lucide-react';

/* ─── 5. VERIFY ATTENDEES PANEL (Light Theme with Round Filter) ───────────── */

// ประเภทสมาชิกเดียวกับที่ระบบใช้แสดงผลผู้เข้าร่วม (สามัญ / ตลอดชีพ / บุคคลทั่วไป)
const WALK_IN_MEMBER_TYPES = ['บุคคลทั่วไป', 'สมาชิกสามัญ', 'สมาชิกตลอดชีพ'];

export interface VerifyAttendeesPanelProps {
  attendees: AttendeeItem[];
  meetings: MeetingItem[];
  initialMeetingId?: string;
  onToggleCheckIn: (id: string) => void;
  onAddAttendee?: (newAttendee: AttendeeItem) => void;
  onPrintReceipt?: (attendee: AttendeeItem) => void;
  onUpdatePaymentStatus?: (
    attendeeId: string,
    paymentStatus: 'paid' | 'pending' | 'rejected',
    rejectionReason?: string
  ) => Promise<void>;
}

export function VerifyAttendeesPanel({
  attendees,
  meetings,
  initialMeetingId,
  onToggleCheckIn,
  onAddAttendee,
  onPrintReceipt,
  onUpdatePaymentStatus,
}: VerifyAttendeesPanelProps) {
  // Find current ongoing meeting (or first upcoming, or fallback to first meeting)
  const currentOngoingMeeting = useMemo(() => {
    return (
      meetings.find((m) => m.status === 'ongoing') ||
      meetings.find((m) => m.status === 'upcoming') ||
      meetings[0]
    );
  }, [meetings]);

  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId || 'default');

  useEffect(() => {
    if (initialMeetingId) {
      setSelectedMeetingId(initialMeetingId);
    }
  }, [initialMeetingId]);

  const activeMeetingId =
    selectedMeetingId === 'default'
      ? currentOngoingMeeting
        ? currentOngoingMeeting.id
        : 'all'
      : selectedMeetingId;

  const currentMeeting = meetings.find((m) => m.id === activeMeetingId);

  const [search, setSearch] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterAttendanceType, setFilterAttendanceType] = useState<'all' | 'onsite' | 'online'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);

  // Status Edit Modal State
  const [editingStatusAttendee, setEditingStatusAttendee] = useState<AttendeeItem | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<'paid' | 'pending' | 'rejected'>('paid');
  const [editRejectionReason, setEditRejectionReason] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);

  // Pagination state (default: 5 items per page to reduce heavy DOM loads)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Registration modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    memberNo: '',
    isFellow: false,
    nameTh: '',
    nameEn: '',
    id4Digits: '',
    phone: '',
    email: '',
    workplace: '',
    meetingId: meetings[0]?.id || '',
    memberType: WALK_IN_MEMBER_TYPES[0],
    position: '',
    positionOther: '',
    selectedPrograms: [] as string[],
    paymentStatus: 'pending' as 'paid' | 'pending',
    checkInNow: false,
  });

  // Slip upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);

  const walkInMeeting = meetings.find((m) => m.id === walkInData.meetingId) || meetings[0];

  // ค้นหาสมาชิกจากเลขสมาชิกแล้วเติมข้อมูลอัตโนมัติ
  const [linkedMember, setLinkedMember] = useState<{ memberNo: string; nameTh: string; status: string; isActive: boolean } | null>(null);
  const [memberLookup, setMemberLookup] = useState<{ state: 'idle' | 'loading' | 'error'; message?: string }>({ state: 'idle' });
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const checkWalkInRegistration = async (meetingId: string, memberNo: string) => {
    if (!meetingId || !memberNo) return setAlreadyRegistered(false);
    try {
      const res = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}/check-registration?memberNo=${encodeURIComponent(memberNo)}`
      );
      const data = await res.json().catch(() => null);
      setAlreadyRegistered(Boolean(data?.isRegistered));
    } catch {
      setAlreadyRegistered(false);
    }
  };

  const unlinkWalkInMember = () => {
    setLinkedMember(null);
    setAlreadyRegistered(false);
    setMemberLookup({ state: 'idle' });
  };

  const handleLookupWalkInMember = async () => {
    const raw = walkInData.memberNo.trim();
    if (!raw) return;
    setMemberLookup({ state: 'loading' });
    setAlreadyRegistered(false);
    try {
      const res = await fetch(`/api/members/verify/${encodeURIComponent(raw)}`);
      const result = await res.json().catch(() => null);
      const m = result?.success ? result.data : null;
      if (!m) {
        setLinkedMember(null);
        setMemberLookup({ state: 'error', message: `ไม่พบเลขสมาชิก ${raw} ในระบบ` });
        return;
      }
      const status = String(m.membership_status || '').trim();
      const isActive = status === '' || status.toLowerCase() === 'active';
      const memberNo = String(m.member_no || raw);
      const jobText = String(m.job_category || m.position || '').trim();
      const posOption = POSITION_CATEGORY_OPTIONS.find(
        (o) =>
          o.value === jobText ||
          o.value.slice(2).toLowerCase() === jobText.toLowerCase() ||
          o.labelTh === jobText
      );
      setWalkInData((prev) => ({
        ...prev,
        memberNo,
        nameTh: m.full_name_th || prev.nameTh,
        nameEn: m.full_name_en || prev.nameEn,
        phone: String(m.mobile || prev.phone).replace(/\D/g, '').slice(0, 10),
        id4Digits: m.id_last4 || prev.id4Digits,
        email: m.email || prev.email,
        workplace: m.workplace || prev.workplace,
        // สมาชิกหมดอายุคิดราคาบุคคลทั่วไป
        memberType: !isActive
          ? 'บุคคลทั่วไป'
          : String(m.membership_type || '').toLowerCase() === 'lifelong'
            ? 'สมาชิกตลอดชีพ'
            : 'สมาชิกสามัญ',
        position: posOption ? posOption.value : jobText ? '0 อื่นๆ' : prev.position,
        isFellow: posOption?.value === '2 Fellow RM' ? true : prev.isFellow,
        positionOther: posOption ? '' : jobText || prev.positionOther,
      }));
      setLinkedMember({ memberNo, nameTh: m.full_name_th || '', status, isActive });
      setMemberLookup({ state: 'idle' });
      checkWalkInRegistration(walkInData.meetingId, memberNo);
    } catch {
      setMemberLookup({ state: 'error', message: 'ค้นหาสมาชิกไม่สำเร็จ กรุณาลองใหม่' });
    }
  };
  const walkInActivities = useMemo<any[]>(
    () => (Array.isArray(walkInMeeting?.activities) ? walkInMeeting.activities.filter((a: any) => a && a.id) : []),
    [walkInMeeting]
  );
  const walkInIsMember = walkInData.memberType !== 'บุคคลทั่วไป';
  // ราคา fellow ของการประชุมหลัก (0 ทั้งหมด = ยังไม่ได้ตั้ง ใช้ราคาปกติ)
  const walkInTiers = (walkInMeeting?.pricingTiers || {}) as any;
  const walkInFellowTier =
    walkInTiers.fellow &&
    Number(walkInTiers.fellow.onsiteMember || 0) + Number(walkInTiers.fellow.onsiteNonMember || 0) + Number(walkInTiers.fellow.onlineMember || 0) > 0
      ? walkInTiers.fellow
      : null;
  const getWalkInPrice = (act: any) => {
    const isMainAct = act?.type === 'main' || act?.id === 'main';
    if (isMainAct) {
      // ลงทะเบียนแบบออนไซต์
      const tier = walkInData.isFellow && walkInFellowTier ? walkInFellowTier : walkInTiers.participant;
      if (tier) return Number(walkInIsMember ? tier.onsiteMember : tier.onsiteNonMember) || 0;
    }
    const mPrice = typeof act.memberPrice === 'number' ? act.memberPrice : 0;
    const nonMPrice = typeof act.nonMemberPrice === 'number' ? act.nonMemberPrice : mPrice;
    return walkInIsMember ? mPrice : nonMPrice;
  };
  const walkInSelectedActs = walkInActivities.filter((a) => walkInData.selectedPrograms.includes(String(a.id)));
  const walkInTotal = walkInSelectedActs.reduce((sum, a) => sum + getWalkInPrice(a), 0);

  // เปลี่ยนรอบการประชุม: เลือกหลักสูตรหลักของรอบนั้นไว้ให้ก่อน
  const walkInMainId = walkInActivities.find((a) => a.type === 'main' || a.id === 'main')?.id;
  useEffect(() => {
    setWalkInData((prev) => ({ ...prev, selectedPrograms: walkInMainId ? [String(walkInMainId)] : [] }));
  }, [walkInMeeting?.id, walkInMainId]);

  const toggleWalkInProgram = (id: string) => {
    setWalkInData((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.includes(id)
        ? prev.selectedPrograms.filter((p) => p !== id)
        : [...prev.selectedPrograms, id],
    }));
  };

  const handleSlipFileChange = (file: File | null) => {
    if (!file) {
      setSlipFile(null);
      setSlipPreview(null);
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      alert('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) หรือ PDF เท่านั้น');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์ต้องมีขนาดไม่เกิน 10 MB');
      return;
    }
    setSlipFile(file);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setSlipPreview(null);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (walkInData.memberNo.trim() && !linkedMember) {
      alert('กรุณากดค้นหาเลขสมาชิกก่อน หรือลบเลขสมาชิกออกหากไม่ใช่สมาชิก');
      return;
    }
    if (linkedMember && alreadyRegistered) {
      alert(`สมาชิกเลขที่ ${linkedMember.memberNo} ลงทะเบียนการประชุมรอบนี้แล้ว`);
      return;
    }
    if (!walkInData.nameTh || !walkInData.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }
    if (!walkInData.position) {
      alert('กรุณาเลือกตำแหน่ง');
      return;
    }
    const isOtherPosition = walkInData.position === '0 อื่นๆ';
    if (isOtherPosition && !walkInData.positionOther.trim()) {
      alert('กรุณาระบุตำแหน่งอื่นๆ');
      return;
    }
    if (walkInActivities.length > 0 && walkInSelectedActs.length === 0) {
      alert('กรุณาเลือกโปรแกรมที่ต้องการเข้าร่วมอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);

    // Upload slip file if provided
    let uploadedSlipUrl = '';
    if (slipFile) {
      try {
        setIsUploading(true);
        const result = await uploadImageToStorage(slipFile, 'slips');
        uploadedSlipUrl = result.url;
      } catch (err: any) {
        alert(`อัพโหลดสลิปไม่สำเร็จ: ${err?.message || 'เกิดข้อผิดพลาด'}`);
        setIsUploading(false);
        setIsSubmitting(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const meeting = walkInMeeting;
    const programs = walkInSelectedActs.map((a) => ({ id: String(a.id), name: String(a.name || a.id) }));
    const position = isOtherPosition
      ? walkInData.positionOther.trim()
      : POSITION_CATEGORY_OPTIONS.find((o) => o.value === walkInData.position)?.labelTh || walkInData.position;
    const newAttendee: AttendeeItem = {
      id: `ATT-${Date.now()}`,
      code: linkedMember?.memberNo || Math.floor(100100 + Math.random() * 9000).toString(),
      memberNo: linkedMember?.memberNo,
      isFellow: walkInData.isFellow,
      nameTh: walkInData.nameTh,
      nameEn: walkInData.nameEn || walkInData.nameTh,
      id4Digits: walkInData.id4Digits || walkInData.phone.slice(-4),
      email: walkInData.email || 'attendee@tsrm.org',
      phone: walkInData.phone,
      workplace: walkInData.workplace || 'โรงพยาบาล/คลินิก',
      memberType: walkInData.memberType,
      ticketType: programs.map((p) => p.name).join(', ') || walkInData.memberType,
      position,
      programs,
      amount: walkInTotal,
      ticketCode: `TSRM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      meetingId: meeting?.id || '',
      meetingTitle: meeting?.titleTh || 'การประชุมวิชาการประจำปี TSRM Congress 2026',
      registeredDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
      paymentStatus: walkInData.paymentStatus,
      checkInStatus: walkInData.checkInNow ? 'checked_in' : 'not_checked_in',
      checkInTime: walkInData.checkInNow ? new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : undefined,
      slipUrl: uploadedSlipUrl || undefined,
    };

    onAddAttendee?.(newAttendee);
    setIsAddModalOpen(false);
    unlinkWalkInMember();
    setSlipFile(null);
    setSlipPreview(null);
    setIsSubmitting(false);
    setWalkInData((prev) => ({
      ...prev,
      memberNo: '',
      isFellow: false,
      nameTh: '',
      nameEn: '',
      id4Digits: '',
      phone: '',
      email: '',
      workplace: '',
      memberType: WALK_IN_MEMBER_TYPES[0],
      position: '',
      positionOther: '',
      selectedPrograms: walkInMainId ? [String(walkInMainId)] : [],
      paymentStatus: 'pending',
      checkInNow: false,
    }));
  };

  const handleSaveStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatusAttendee || !onUpdatePaymentStatus) return;
    setIsSavingStatus(true);
    try {
      await onUpdatePaymentStatus(editingStatusAttendee.id, editStatusValue, editRejectionReason);
      setEditingStatusAttendee(null);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Filter attendees by selected round first
  const roundAttendees = useMemo(() => {
    if (activeMeetingId === 'all') return attendees;
    return attendees.filter(
      (a) =>
        a.meetingId === activeMeetingId ||
        (currentMeeting && a.meetingTitle === currentMeeting.titleTh)
    );
  }, [attendees, activeMeetingId, currentMeeting]);

  // Programs (activities) of the selected round
  const meetingPrograms = useMemo<Array<{ id: string; name: string; type?: string }>>(() => {
    if (!currentMeeting || !Array.isArray(currentMeeting.activities)) return [];
    return currentMeeting.activities
      .filter((act: any) => act && act.id)
      .map((act: any) => ({ id: String(act.id), name: String(act.name || act.id), type: act.type }));
  }, [currentMeeting]);

  useEffect(() => {
    setFilterProgram('all');
  }, [activeMeetingId]);

  // ผู้ที่ไม่มีข้อมูลโปรแกรมในสลิป ถือว่าลงทะเบียนเฉพาะการประชุมหลัก
  const attendeeHasProgram = (a: AttendeeItem, prog: { id: string; name: string; type?: string }) => {
    if (!a.programs || a.programs.length === 0) return prog.type === 'main' || prog.id === 'main';
    return a.programs.some((p) => p.id === prog.id || (!!p.name && p.name === prog.name));
  };

  const getAttendeeProgramNames = (a: AttendeeItem): string[] => {
    if (meetingPrograms.length > 0) {
      return meetingPrograms.filter((prog) => attendeeHasProgram(a, prog)).map((prog) => prog.name);
    }
    return (a.programs || []).map((p) => p.name || p.id).filter(Boolean);
  };

  const selectedProgram = meetingPrograms.find((p) => p.id === filterProgram);

  // Narrow round attendees by the selected program
  const programAttendees = useMemo(() => {
    if (!selectedProgram) return roundAttendees;
    return roundAttendees.filter((a) => attendeeHasProgram(a, selectedProgram));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundAttendees, selectedProgram]);

  // Secondary filtering (search, check-in status, payment status)
  const filteredAttendees = useMemo(() => {
    return programAttendees.filter((a) => {
      const matchStatus = filterCheckIn === 'all' || a.checkInStatus === filterCheckIn;
      const matchAttendanceType =
        filterAttendanceType === 'all' || (a.attendanceType || 'onsite') === filterAttendanceType;
      const matchPayment =
        filterPayment === 'all' ||
        (filterPayment === 'pending'
          ? a.paymentStatus === 'pending' || a.paymentStatus === 'unpaid'
          : a.paymentStatus === filterPayment);
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
      return matchStatus && matchAttendanceType && matchPayment && matchSearch;
    });
  }, [programAttendees, filterCheckIn, filterAttendanceType, filterPayment, search]);

  // Total pages and Paginated Slice (5 items per page default)
  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));

  // Reset current page when filters change or if current page exceeds total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMeetingId, filterCheckIn, filterAttendanceType, filterPayment, filterProgram, search, pageSize]);

  const paginatedAttendees = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    return filteredAttendees.slice(startIndex, startIndex + pageSize);
  }, [filteredAttendees, currentPage, pageSize, totalPages]);

  // Statistics for the selected round
  const totalInRound = roundAttendees.length;
  const checkedInInRound = roundAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
  const notCheckedInInRound = totalInRound - checkedInInRound;
  const paidInRound = programAttendees.filter((a) => a.paymentStatus === 'paid').length;
  const pendingInRound = programAttendees.filter(
    (a) => a.paymentStatus === 'pending' || a.paymentStatus === 'unpaid'
  ).length;
  const rejectedInRound = programAttendees.filter((a) => a.paymentStatus === 'rejected').length;
  const checkedInInProgram = programAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
  const onlineInProgram = programAttendees.filter((a) => a.attendanceType === 'online').length;
  const rateInRound = totalInRound > 0 ? Math.round((checkedInInRound / totalInRound) * 100) : 0;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'รหัสสมาชิก',
      'เลขท้าย 4 หลัก',
      'ชื่อ-นามสกุล (ไทย)',
      'ชื่อ-นามสกุล (อังกฤษ)',
      'อีเมล',
      'โทรศัพท์',
      'สถานที่ทำงาน',
      'ประเภทสมาชิก',
      'ประเภทบัตร',
      'รหัสตั๋ว',
      'รอบการประชุม',
      'โปรแกรมที่ลงทะเบียน',
      'สถานะชำระเงิน',
      'สถานะเช็คอิน',
      'เวลาเช็คอิน',
    ];
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
      `"${getAttendeeProgramNames(a).join(', ')}"`,
      a.paymentStatus === 'paid' ? 'ชำระแล้ว' : a.paymentStatus === 'rejected' ? 'สลิปถูกปฏิเสธ' : 'รอชำระ',
      a.checkInStatus === 'checked_in' ? 'เช็คอินแล้ว' : 'ยังไม่เข้าร่วม',
      a.checkInTime || '-',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const roundSlug =
      (selectedMeetingId === 'all' ? 'all-rounds' : selectedMeetingId.toLowerCase()) +
      (selectedProgram ? `_${selectedProgram.id.toLowerCase()}` : '');
    link.setAttribute('download', `attendees_${roundSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <AdminPageHeader
        tab="verify-attendees"
        title="ตรวจสอบผู้เข้าร่วมประชุม"
        description="ค้นหาข้อมูลสมาชิก ตรวจสอบการลงทะเบียน และบันทึกการเช็คอินแยกตามรอบการประชุม"
        actions={
          <>
            <HeaderButton variant="primary" icon={PlusCircle} onClick={() => setIsAddModalOpen(true)}>
              ลงทะเบียนผู้เข้าร่วม
            </HeaderButton>
            <HeaderButton icon={FileSpreadsheet} onClick={handleExportCSV}>
              Export รายชื่อ ({filteredAttendees.length})
            </HeaderButton>
          </>
        }
      />

      <ContextBar
        icon={Filter}
        label={
          <>
            <span>{currentMeeting ? currentMeeting.titleTh : 'รวมทุกรอบการประชุม'}</span>
            {currentMeeting && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  currentMeeting.status === 'ongoing'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : currentMeeting.status === 'upcoming'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentMeeting.status === 'ongoing' ? 'กำลังดำเนินการ' : currentMeeting.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น'}
              </span>
            )}
          </>
        }
        description={
          currentMeeting ? (
            <span className="inline-flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-[#0026b3]" /> {currentMeeting.date} ({currentMeeting.time})
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0026b3]" /> {currentMeeting.location}
              </span>
            </span>
          ) : (
            `${meetings.length} รอบการประชุม`
          )
        }
      >
        <div className="relative">
              <select
                value={activeMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-xl pl-10 pr-10 py-2.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer shadow-xs"
              >
                {meetings.map((m) => {
                  const isOngoing = m.status === 'ongoing';
                  const isUpcoming = m.status === 'upcoming';
                  const mAttendees = attendees.filter((a) => a.meetingId === m.id || a.meetingTitle === m.titleTh);
                  const mChecked = mAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
                  return (
                    <option key={m.id} value={m.id}>
                      {isOngoing ? '🟢 [รอบปัจจุบัน] ' : isUpcoming ? '🟡 [เร็วๆ นี้] ' : '📅 '}
                      [{m.id}] {m.titleTh} ({m.date}) — เช็คอิน {mChecked}/{mAttendees.length || m.registered} คน
                    </option>
                  );
                })}
                <option value="all">🌐 รวมทุกรอบการประชุม — รวมทั้งหมด {attendees.length} คน</option>
              </select>
          <CalendarDays className="w-4 h-4 text-[#0026b3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </ContextBar>

      <StatGrid>
        <StatCard
          label="ผู้ลงทะเบียน"
          value={totalInRound}
          unit={currentMeeting ? `/ ${currentMeeting.maxSeats} ที่นั่ง` : 'คน'}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="เช็คอินแล้ว"
          value={checkedInInRound}
          unit="คน"
          icon={UserCheck}
          tone="green"
          active={filterCheckIn === 'checked_in'}
          onClick={() => setFilterCheckIn(filterCheckIn === 'checked_in' ? 'all' : 'checked_in')}
        />
        <StatCard
          label="ยังไม่เช็คอิน"
          value={notCheckedInInRound}
          unit="คน"
          icon={Clock}
          tone="amber"
          active={filterCheckIn === 'not_checked_in'}
          onClick={() => setFilterCheckIn(filterCheckIn === 'not_checked_in' ? 'all' : 'not_checked_in')}
        />
        <StatCard label="อัตราเช็คอิน" value={`${rateInRound}%`} icon={TrendingUp} tone="violet">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-2.5">
            <div
              className="h-full bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-full transition-all duration-500"
              style={{ width: `${rateInRound}%` }}
            />
          </div>
        </StatCard>
      </StatGrid>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ, เลขสมาชิก, เลข 4 ตัวท้าย, สังกัด, รหัสตั๋ว..."
        />
        <ToolbarGroup>
          <Segmented
            value={filterCheckIn}
            onChange={setFilterCheckIn}
            options={[
              { id: 'all', label: 'ทั้งหมด', count: programAttendees.length },
              { id: 'checked_in', label: 'เช็คอินแล้ว', count: checkedInInProgram },
              { id: 'not_checked_in', label: 'ยังไม่เข้าร่วม', count: programAttendees.length - checkedInInProgram },
            ]}
          />
          {meetingPrograms.length > 0 && (
            <FilterSelect
              label="โปรแกรม"
              value={filterProgram}
              onChange={setFilterProgram}
              className="max-w-[240px]"
              options={[
                { value: 'all', label: 'ทุกโปรแกรม' },
                ...meetingPrograms.map((prog) => ({
                  value: prog.id,
                  label: `${prog.name} (${roundAttendees.filter((a) => attendeeHasProgram(a, prog)).length})`,
                })),
              ]}
            />
          )}
          <FilterSelect
            label="รูปแบบการเข้าร่วม"
            value={filterAttendanceType}
            onChange={(v) => setFilterAttendanceType(v as typeof filterAttendanceType)}
            options={[
              { value: 'all', label: 'ทุกรูปแบบ' },
              { value: 'onsite', label: `ออนไซต์ (${programAttendees.length - onlineInProgram})` },
              { value: 'online', label: `ออนไลน์ (${onlineInProgram})` },
            ]}
          />
          <FilterSelect
            label="การชำระเงิน"
            value={filterPayment}
            onChange={(v) => setFilterPayment(v as typeof filterPayment)}
            options={[
              { value: 'all', label: 'ทุกสถานะชำระเงิน' },
              { value: 'paid', label: `ชำระแล้ว (${paidInRound})` },
              { value: 'pending', label: `รอชำระ (${pendingInRound})` },
              { value: 'rejected', label: `สลิปถูกปฏิเสธ (${rejectedInRound})` },
            ]}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* ─── Attendees Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
        <table className="w-full min-w-[1080px] text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold">
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[110px]">รหัสสมาชิก</th>
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">ชื่อและสังกัด</th>
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[200px]">รอบการประชุม</th>
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[170px]">ประเภทและบัตร</th>
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">การชำระเงิน</th>
              <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">สถานะเช็คอิน</th>
              <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[180px]">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={UserCheck}
                    title="ไม่พบผู้เข้าร่วมตามเงื่อนไขที่เลือก"
                    description="ลองเปลี่ยนคำค้นหา ตัวกรอง หรือรอบการประชุม"
                  />
                </td>
              </tr>
            ) : (
              paginatedAttendees.map((a) => {
                const meeting = meetings.find((m) => m.id === a.meetingId || m.titleTh === a.meetingTitle);

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-5 py-4 font-mono text-slate-700 font-bold whitespace-nowrap">
                      {a.code}
                      <div className="text-xs text-slate-400 font-normal whitespace-nowrap">ID4: {a.id4Digits}</div>
                    </td>
                    <td className="px-5 py-4 min-w-[220px]">
                      <div className="font-bold text-slate-900 group-hover:text-[#0026b3] transition whitespace-nowrap">{a.nameTh}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[240px]" title={a.workplace}>{a.workplace}</div>
                    </td>
                    <td className="px-5 py-4 min-w-[200px]">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-200 whitespace-nowrap max-w-full">
                        <CalendarDays className="w-3 h-3 shrink-0 text-[#0026b3]" />
                        <span className="truncate">{meeting ? meeting.titleTh : a.meetingTitle}</span>
                      </span>
                      {getAttendeeProgramNames(a).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[220px]">
                          {getAttendeeProgramNames(a).map((name) => (
                            <span
                              key={name}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border truncate max-w-full ${
                                selectedProgram?.name === name
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                              title={name}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap min-w-[170px]">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <span className="text-slate-700 font-semibold whitespace-nowrap">{a.memberType}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                            a.attendanceType === 'online'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {a.attendanceType === 'online' ? 'ออนไลน์' : 'ออนไซต์'}
                        </span>
                      </div>
                      <div className="text-xs text-[#0026b3] font-mono font-medium whitespace-nowrap tracking-wide mt-0.5">{a.ticketCode}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            a.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.paymentStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {a.paymentStatus === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> ชำระแล้ว
                            </>
                          ) : a.paymentStatus === 'rejected' ? (
                            <>
                              <XCircle className="w-3 h-3" /> สลิปถูกปฏิเสธ
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> รอชำระ
                            </>
                          )}
                        </span>
                      </div>
                      {a.paymentStatus === 'rejected' && a.rejectionReason && (
                        <div
                          className="text-[11px] text-rose-500 mt-0.5 truncate max-w-[170px]"
                          title={a.rejectionReason}
                        >
                          {a.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap min-w-[130px]">
                      {a.checkInStatus === 'checked_in' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> เช็คอินแล้ว
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">{a.checkInTime}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> ยังไม่เข้าร่วม
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[180px]">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Btn
                          size="sm"
                          variant={a.checkInStatus === 'checked_in' ? 'secondary' : 'primary'}
                          icon={a.checkInStatus === 'checked_in' ? XCircle : Check}
                          onClick={() => onToggleCheckIn(a.id)}
                          className="min-w-[96px] whitespace-nowrap"
                        >
                          {a.checkInStatus === 'checked_in' ? 'ยกเลิก' : 'เช็คอิน'}
                        </Btn>
                        <IconBtn icon={Eye} label="ดูรายละเอียด" tone="blue" onClick={() => setSelectedAttendee(a)} />
                        {onUpdatePaymentStatus && (
                          <IconBtn
                            icon={Pencil}
                            label="แก้ไขสถานะการชำระเงิน"
                            tone="amber"
                            onClick={() => {
                              setEditingStatusAttendee(a);
                              setEditStatusValue(
                                a.paymentStatus === 'paid'
                                  ? 'paid'
                                  : a.paymentStatus === 'rejected'
                                    ? 'rejected'
                                    : 'pending'
                              );
                              setEditRejectionReason(a.rejectionReason || '');
                            }}
                          />
                        )}
                        {a.paymentStatus === 'paid' && onPrintReceipt && (
                          <IconBtn icon={Printer} label="พิมพ์ใบเสร็จรับเงิน" tone="green" onClick={() => onPrintReceipt(a)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination Controls Bar (Default 5 items) ───────────────────── */}
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredAttendees.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        itemLabel="รายชื่อ"
      />

      {/* ─── Edit Payment Status Modal ────────────────────────────────────── */}
      {editingStatusAttendee &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#0026b3]" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">แก้ไขสถานะการชำระเงิน</h3>
                </div>
                <button
                  onClick={() => setEditingStatusAttendee(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="font-bold text-sm text-slate-900">{editingStatusAttendee.nameTh}</div>
                <div className="text-slate-500">
                  รหัสสมาชิก: <span className="font-bold text-[#0026b3]">{editingStatusAttendee.code}</span> |
                  รหัสตั๋ว: <span className="font-mono">{editingStatusAttendee.ticketCode}</span>
                </div>
                <div className="text-slate-500 truncate">รอบ: {editingStatusAttendee.meetingTitle}</div>
              </div>

              <form onSubmit={handleSaveStatusChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">เลือกสถานะใหม่:</label>

                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'paid'
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="paid"
                        checked={editStatusValue === 'paid'}
                        onChange={() => setEditStatusValue('paid')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> ชำระเงินแล้ว
                        </div>
                        <div className="text-[11px] text-slate-500">
                          อนุมัติสิทธิ์การเข้าร่วมงานและสามารถออกใบเสร็จได้
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'pending'
                          ? 'bg-amber-50/70 border-amber-500 text-amber-900 ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="pending"
                        checked={editStatusValue === 'pending'}
                        onChange={() => setEditStatusValue('pending')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-amber-700">
                          <Clock className="w-4 h-4" /> รอชำระเงิน
                        </div>
                        <div className="text-[11px] text-slate-500">
                          อยู่ระหว่างรอแนบสลิปหรือรอเจ้าหน้าที่ตรวจสอบ
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'rejected'
                          ? 'bg-rose-50/70 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="rejected"
                        checked={editStatusValue === 'rejected'}
                        onChange={() => setEditStatusValue('rejected')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-rose-700">
                          <XCircle className="w-4 h-4" /> สลิปถูกปฏิเสธ
                        </div>
                        <div className="text-[11px] text-slate-500">
                          หลักฐานไม่ถูกต้อง หรือยอดเงินไม่ตรง แจ้งให้แนบใหม่
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {editStatusValue === 'rejected' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-bold text-slate-700">
                      ระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):
                    </label>
                    <textarea
                      value={editRejectionReason}
                      onChange={(e) => setEditRejectionReason(e.target.value)}
                      placeholder="เช่น ยอดเงินไม่ถูกต้อง, สลิปไม่ชัดเจน, วันที่โอนไม่ตรง..."
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0026b3] resize-none h-20"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStatusAttendee(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStatus}
                    className="px-4 py-2 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกสถานะ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ─── Attendee Details Modal ──────────────────────────────────────── */}
      {selectedAttendee &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
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
                    <span className="text-[#0026b3] font-bold text-right max-w-[260px]">
                      {selectedAttendee.meetingTitle}
                    </span>
                  </div>
                  {getAttendeeProgramNames(selectedAttendee).length > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 shrink-0">โปรแกรมที่ลงทะเบียน:</span>
                      <span className="text-slate-800 font-bold text-right max-w-[260px]">
                        {getAttendeeProgramNames(selectedAttendee).join(', ')}
                      </span>
                    </div>
                  )}
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
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">สถานะการชำระเงิน:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${
                          selectedAttendee.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedAttendee.paymentStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {selectedAttendee.paymentStatus === 'paid'
                          ? '✓ ชำระแล้ว'
                          : selectedAttendee.paymentStatus === 'rejected'
                            ? '✕ สลิปถูกปฏิเสธ'
                            : '⏳ รอชำระ'}
                      </span>
                      {onUpdatePaymentStatus && (
                        <button
                          onClick={() => {
                            const target = selectedAttendee;
                            setSelectedAttendee(null);
                            setEditingStatusAttendee(target);
                            setEditStatusValue(
                              target.paymentStatus === 'paid'
                                ? 'paid'
                                : target.paymentStatus === 'rejected'
                                  ? 'rejected'
                                  : 'pending'
                            );
                            setEditRejectionReason(target.rejectionReason || '');
                          }}
                          className="text-xs text-[#0026b3] hover:underline font-bold"
                        >
                          แก้ไขสถานะ
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedAttendee.paymentStatus === 'rejected' && selectedAttendee.rejectionReason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                      <span className="font-bold">สาเหตุที่ปฏิเสธ:</span> {selectedAttendee.rejectionReason}
                    </div>
                  )}
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
          </div>,
          document.body
        )}

      {/* Registration Modal */}
      {isAddModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0026b3]">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">ลงทะเบียนผู้เข้าร่วม</h3>
                </div>
                <button
                  onClick={() => { setIsAddModalOpen(false); setSlipFile(null); setSlipPreview(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รอบการประชุมที่ลงทะเบียน *</label>
                  <select
                    value={walkInData.meetingId}
                    onChange={(e) => {
                      setWalkInData({ ...walkInData, meetingId: e.target.value });
                      if (linkedMember) checkWalkInRegistration(e.target.value, linkedMember.memberNo);
                    }}
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

                {/* เลขสมาชิก: ค้นหาแล้วเติมข้อมูลอัตโนมัติ */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    เลขสมาชิก <span className="font-normal text-slate-500">ถ้าเป็นสมาชิก กรอกแล้วกดค้นหาเพื่อเติมข้อมูลอัตโนมัติ</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={walkInData.memberNo}
                      disabled={!!linkedMember}
                      onChange={(e) => {
                        setWalkInData({ ...walkInData, memberNo: e.target.value.replace(/\s/g, '').slice(0, 20) });
                        if (memberLookup.state === 'error') setMemberLookup({ state: 'idle' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookupWalkInMember();
                        }
                      }}
                      placeholder="เช่น 0123"
                      className="flex-1 min-w-0 bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0026b3] disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    {linkedMember ? (
                      <Btn variant="secondary" icon={X} onClick={unlinkWalkInMember}>
                        ยกเลิกการผูก
                      </Btn>
                    ) : (
                      <Btn
                        variant="primary"
                        icon={Search}
                        loading={memberLookup.state === 'loading'}
                        disabled={!walkInData.memberNo.trim()}
                        onClick={handleLookupWalkInMember}
                      >
                        ค้นหา
                      </Btn>
                    )}
                  </div>
                  {memberLookup.state === 'error' && (
                    <p className="text-[11px] font-semibold text-rose-600">{memberLookup.message}</p>
                  )}
                  {linkedMember && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ผูกกับสมาชิกเลขที่ {linkedMember.memberNo} {linkedMember.nameTh} เติมข้อมูลจากฐานข้อมูลแล้ว
                      </p>
                      {!linkedMember.isActive && (
                        <p className="text-[11px] font-semibold text-amber-700">
                          สมาชิกภาพหมดอายุ คิดราคาบุคคลทั่วไป
                        </p>
                      )}
                      {alreadyRegistered && (
                        <p className="text-[11px] font-semibold text-rose-600">
                          สมาชิกคนนี้ลงทะเบียนการประชุมรอบนี้แล้ว บันทึกซ้ำไม่ได้
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล (ภาษาไทย) *</label>
                    <input
                      type="text"
                      required
                      readOnly={!!linkedMember}
                      title={linkedMember ? 'ชื่อตามข้อมูลสมาชิก ยกเลิกการผูกเพื่อแก้ไข' : undefined}
                      value={walkInData.nameTh}
                      onChange={(e) =>
                        setWalkInData({
                          ...walkInData,
                          nameTh: e.target.value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, ''),
                        })
                      }
                      placeholder="ชื่อ-นามสกุล (ไม่ต้องมีคำนำหน้า)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล (ภาษาอังกฤษ)</label>
                    <input
                      type="text"
                      value={walkInData.nameEn}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, nameEn: e.target.value.replace(/[^a-zA-Z\s\.\-']/g, '') })
                      }
                      placeholder="Full Name (Without prefix)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={walkInData.phone}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      placeholder="081-234-5678"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เลขท้าย 4 หลักบัตรประชาชน</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={walkInData.id4Digits}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, id4Digits: e.target.value.replace(/\D/g, '').slice(0, 4) })
                      }
                      placeholder="1234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <SmartEmailInput
                      value={walkInData.email}
                      onChange={(val) => setWalkInData({ ...walkInData, email: val })}
                      label="อีเมล"
                      placeholder="doctor@hospital.com"
                      helperText="กรุณากรอกอีเมลที่มีอยู่จริง"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยงาน / สถานที่ทำงาน</label>
                    <input
                      type="text"
                      value={walkInData.workplace}
                      onChange={(e) => setWalkInData({ ...walkInData, workplace: e.target.value })}
                      placeholder="เช่น รพ.รามาธิบดี"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทสมาชิก</label>
                  <div className="grid grid-cols-3 gap-2">
                    {WALK_IN_MEMBER_TYPES.map((type) => {
                      const isActive = walkInData.memberType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWalkInData({ ...walkInData, memberType: type })}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 border-[#0026b3] text-[#0026b3] ring-1 ring-[#0026b3]/30'
                              : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    walkInData.isFellow ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={walkInData.isFellow}
                    onChange={(e) => setWalkInData({ ...walkInData, isFellow: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-violet-600 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800">ลงทะเบียนเป็น Fellow</span>
                    <span className="block text-[11px] text-slate-500">
                      {walkInFellowTier
                        ? `ใช้ราคา Fellow ของการประชุมหลัก สมาชิก ${Number(walkInFellowTier.onsiteMember || 0).toLocaleString()} บาท บุคคลทั่วไป ${Number(walkInFellowTier.onsiteNonMember || 0).toLocaleString()} บาท`
                        : 'การประชุมนี้ยังไม่ได้ตั้งราคา Fellow จะบันทึกว่าเป็น Fellow แต่คิดราคาปกติ'}
                    </span>
                  </span>
                </label>

                <PositionSelect
                  value={walkInData.position}
                  onChange={(val) => setWalkInData({ ...walkInData, position: val })}
                  label="ตำแหน่ง"
                  required
                  showOtherInput={false}
                />
                {walkInData.position === '0 อื่นๆ' && (
                  <input
                    type="text"
                    value={walkInData.positionOther}
                    onChange={(e) => setWalkInData({ ...walkInData, positionOther: e.target.value })}
                    placeholder="โปรดระบุตำแหน่งอื่นๆ..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      โปรแกรมที่เข้าร่วม {walkInActivities.length > 0 && <span className="text-rose-500">*</span>}
                    </label>
                    {walkInActivities.length > 0 && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        เลือกแล้ว {walkInSelectedActs.length} รายการ
                      </span>
                    )}
                  </div>

                  {walkInActivities.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      รอบการประชุมนี้ยังไม่มีรายการโปรแกรม
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {walkInActivities.map((act) => {
                        const id = String(act.id);
                        const isSelected = walkInData.selectedPrograms.includes(id);
                        const price = getWalkInPrice(act);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleWalkInProgram(id)}
                            className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/90 border-[#0026b3] ring-1 ring-[#0026b3]/30'
                                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${
                                    isSelected
                                      ? act.type === 'main'
                                        ? 'bg-[#0026b3] text-white'
                                        : 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {act.type === 'main' ? 'หลักสูตรหลัก' : 'เวิร์กช็อป'}
                                </span>
                                {act.date && <span className="text-[11px] text-slate-500 truncate">{act.date}</span>}
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{act.name || id}</p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-xs font-extrabold text-slate-700">
                                {price > 0 ? `${price.toLocaleString()} บาท` : 'ฟรี'}
                              </span>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-[#0026b3] text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-600">ยอดชำระรวม</span>
                        <span className="text-sm font-extrabold text-[#0026b3]">{walkInTotal.toLocaleString()} บาท</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* อัพโหลดสลิปการชำระเงิน */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">สลิปหลักฐานการชำระเงิน</label>
                  <div
                    className={`relative rounded-xl border-2 border-dashed transition p-4 ${
                      slipFile
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-300 bg-slate-50/60 hover:border-[#0026b3]/40 hover:bg-blue-50/30'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleSlipFileChange(file);
                    }}
                  >
                    {slipFile ? (
                      <div className="flex items-center gap-3">
                        {slipPreview ? (
                          <img
                            src={slipPreview}
                            alt="ตัวอย่างสลิป"
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{slipFile.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {(slipFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSlipFile(null); setSlipPreview(null); if (slipInputRef.current) slipInputRef.current.value = ''; }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                          title="ลบสลิป"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => slipInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-1.5 cursor-pointer text-center"
                      >
                        <Upload className="w-7 h-7 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</span>
                        <span className="text-[11px] text-slate-400">รองรับ JPG, PNG, WEBP, PDF ขนาดไม่เกิน 10 MB</span>
                      </button>
                    )}
                    <input
                      ref={slipInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleSlipFileChange(e.target.files?.[0] || null)}
                    />
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-xs text-[#0026b3] font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังอัพโหลดสลิป...</span>
                    </div>
                  )}
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
                      <span className="text-xs font-bold text-emerald-700">ชำระเงินแล้ว</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={walkInData.paymentStatus === 'pending'}
                        onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'pending' })}
                        className="accent-[#0026b3]"
                      />
                      <span className="text-xs font-bold text-amber-700">รอชำระ</span>
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
                    onClick={() => { setIsAddModalOpen(false); setSlipFile(null); setSlipPreview(null); }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0026b3]/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-[#4ade80]" />
                        <span>บันทึกการลงทะเบียน</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
