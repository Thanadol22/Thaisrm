'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Users,
  Ticket,
  Plus,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  History,
  Copy,
  Check,
  Mail,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Eye,
  X,
  Award,
  Crown,
  Medal,
  Pencil,
  Trash2,
  MoreVertical,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  Tag,
  Power,
  TrendingUp,
  UserCheck,
  FileCheck2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { CouponModal, CouponItem } from '@/components/CouponModal';
import { CouponUsagesModal } from '@/components/CouponUsagesModal';
import { SponsorCouponHistoryModal } from '@/components/SponsorCouponHistoryModal';
import { PaginationControls } from '@/components/PaginationControls';

interface SponsorQuota {
  id?: string;
  sponsor_id?: string;
  meeting_id: string;
  quota_seats: number;
  used_seats?: number;
  meeting?: {
    meeting_id: string;
    meeting_name: string;
    meeting_date?: string;
  };
}

interface SponsorItem {
  id: string;
  name: string;
  tier: 'Platinum' | 'Gold' | 'Silver';
  contact_name?: string | null;
  contact_email: string;
  is_active: boolean;
  total_allocated_quota: number;
  total_used_seats: number;
  total_registered_members: number;
  quotas?: SponsorQuota[];
}

interface MeetingOption {
  id?: string;
  meeting_id?: string;
  titleTh?: string;
  meeting_name?: string;
  meeting_date?: string;
  date?: string;
  status?: string;
  activities?: any[];
}

interface AdminSponsorsPanelProps {
  meetings?: MeetingOption[];
  initialTab?: 'sponsors' | 'coupons' | 'history';
  onNotification?: (msg: string) => void;
}

export default function AdminSponsorsPanel({
  meetings: propsMeetings = [],
  initialTab = 'coupons',
  onNotification,
}: AdminSponsorsPanelProps) {
  // ─── Sub-Tab State: 'coupons' | 'sponsors' | 'history' ───
  const [activeSubTab, setActiveSubTab] = useState<'coupons' | 'sponsors' | 'history'>(initialTab);

  // ─── Shared States ───
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingOption[]>(propsMeetings);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ─── Coupon Tab States ───
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [selectedCouponMeeting, setSelectedCouponMeeting] = useState<string>('TSRM34');
  const [couponSearchQuery, setCouponSearchQuery] = useState<string>('');
  const [couponPage, setCouponPage] = useState(1);
  const [couponPageSize, setCouponPageSize] = useState(10);

  // Coupon Modals
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<CouponItem | null>(null);
  const [couponPrefilledCompany, setCouponPrefilledCompany] = useState<string>('');
  const [couponUsagesModalOpen, setCouponUsagesModalOpen] = useState(false);
  const [selectedCouponForUsages, setSelectedCouponForUsages] = useState<CouponItem | null>(null);

  // ─── Sponsor Modals (History, Add, Edit, Delete) ───
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedSponsorForHistory, setSelectedSponsorForHistory] = useState<SponsorItem | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [addSponsorOpen, setAddSponsorOpen] = useState(false);
  const [newSponsorForm, setNewSponsorForm] = useState({
    name: '',
    tier: 'Silver' as 'Platinum' | 'Gold' | 'Silver',
    contactEmail: '',
    contactName: '',
    meetingId: 'TSRM34',
    initialQuota: '0',
  });
  const [addingSponsor, setAddingSponsor] = useState(false);
  const [addSponsorError, setAddSponsorError] = useState('');

  const [editSponsorOpen, setEditSponsorOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorItem | null>(null);
  const [editSponsorForm, setEditSponsorForm] = useState({
    id: '',
    name: '',
    tier: 'Silver' as 'Platinum' | 'Gold' | 'Silver',
    contactEmail: '',
    contactName: '',
    isActive: true,
    meetingId: 'TSRM34',
    quotaSeats: '0',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSponsorError, setEditSponsorError] = useState('');

  const [deleteSponsorOpen, setDeleteSponsorOpen] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<SponsorItem | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState(false);

  // ─── Sponsor Coupon History Modal ───
  const [sponsorCouponHistoryOpen, setSponsorCouponHistoryOpen] = useState(false);
  const [selectedSponsorForCoupons, setSelectedSponsorForCoupons] = useState<{
    name: string;
    tier?: string;
    coupons: CouponItem[];
  } | null>(null);

  // ─── Global Usage History ───
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [globalHistoryLoading, setGlobalHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // SSR Mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    if (onNotification) onNotification(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sort meetings (Latest upcoming meeting first, e.g. TSRM34)
  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const isUpcomingA = a.status === 'upcoming' || (a.meeting_id && a.meeting_id.includes('34'));
      const isUpcomingB = b.status === 'upcoming' || (b.meeting_id && b.meeting_id.includes('34'));
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;
      return 0;
    });
  }, [meetings]);

  // ─── Fetch Meetings List ───
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/meetings?limit=50');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map((m: any) => ({
          id: m.meeting_id || m.id,
          meeting_id: m.meeting_id || m.id,
          meeting_name: m.meeting_name || m.titleTh,
          titleTh: m.titleTh || m.meeting_name,
          meeting_date: m.meeting_date || m.date,
          date: m.date || m.meeting_date,
          status: m.status,
          activities: m.activities,
        }));
        setMeetings(mapped);
        const latestMId = mapped[0]?.meeting_id || 'TSRM34';
        setSelectedCouponMeeting(latestMId);
        setNewSponsorForm((prev) => ({ ...prev, meetingId: latestMId }));
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    }
  }, []);

  // ─── Fetch Sponsors List ───
  const fetchSponsors = async () => {
    setSponsorsLoading(true);
    try {
      const res = await fetch('/api/sponsors');
      const data = await res.json();
      if (res.ok && data.success) {
        setSponsors(data.sponsors || []);
      }
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    } finally {
      setSponsorsLoading(false);
    }
  };

  // ─── Fetch Coupons List ───
  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      let url = '/api/coupons';
      const params = new URLSearchParams();
      if (selectedCouponMeeting && selectedCouponMeeting !== 'all') {
        params.append('meetingId', selectedCouponMeeting);
      }
      if (couponSearchQuery.trim()) {
        params.append('search', couponSearchQuery.trim());
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
      console.error('Failed to load coupons:', err);
      showToast('ไม่สามารถดึงข้อมูลคูปองได้', 'error');
    } finally {
      setCouponsLoading(false);
    }
  };

  // ─── Fetch Global Usage History ───
  const fetchGlobalHistory = async () => {
    setGlobalHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/attendees');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const filtered = json.data.filter(
          (a: any) => a.sponsor_id || a.coupon_code || a.sponsor_company_name
        );
        setGlobalHistory(filtered);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setGlobalHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
    fetchMeetings();
    fetchCoupons();
  }, [fetchMeetings]);

  useEffect(() => {
    if (activeSubTab === 'coupons') {
      fetchCoupons();
    } else if (activeSubTab === 'sponsors') {
      fetchSponsors();
    } else if (activeSubTab === 'history') {
      fetchGlobalHistory();
    }
  }, [activeSubTab, selectedCouponMeeting]);

  // Sponsors Map for fast coupon lookup (sorted newest first)
  const couponsByCompany = useMemo(() => {
    const map = new Map<string, CouponItem[]>();
    const sorted = [...coupons].sort((a, b) => {
      const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    for (const c of sorted) {
      const key = (c.company_name || '').toLowerCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [coupons]);

  // Group coupons to show ONLY the latest coupon per company and meeting
  const latestCoupons = useMemo(() => {
    const latestMap = new Map<string, CouponItem>();
    
    // Sort all coupons by created_at / updated_at desc first
    const sortedByDate = [...coupons].sort((a, b) => {
      const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    for (const c of sortedByDate) {
      const key = `${(c.company_name || '').toLowerCase().trim()}_${c.meeting_id || ''}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, c);
      }
    }

    return Array.from(latestMap.values());
  }, [coupons]);

  // Filtered Sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter((sp) => {
      const matchesTier = selectedTier === 'all' || sp.tier === selectedTier;
      const matchesSearch =
        !sponsorSearch ||
        sp.name.toLowerCase().includes(sponsorSearch.toLowerCase()) ||
        sp.contact_email.toLowerCase().includes(sponsorSearch.toLowerCase()) ||
        (sp.contact_name && sp.contact_name.toLowerCase().includes(sponsorSearch.toLowerCase()));
      return matchesTier && matchesSearch;
    });
  }, [sponsors, selectedTier, sponsorSearch]);

  // Sponsor & Quota Stats
  const sponsorStats = useMemo(() => {
    const total = sponsors.length;
    const platinum = sponsors.filter((s) => s.tier === 'Platinum').length;
    const gold = sponsors.filter((s) => s.tier === 'Gold').length;
    const silver = sponsors.filter((s) => s.tier === 'Silver').length;
    const totalQuota = sponsors.reduce((sum, s) => sum + (s.total_allocated_quota || 0), 0);
    const totalUsed = sponsors.reduce((sum, s) => sum + (s.total_used_seats || 0), 0);
    return { total, platinum, gold, silver, totalQuota, totalUsed };
  }, [sponsors]);

  // Coupon Stats (based on latest coupons)
  const couponStats = useMemo(() => {
    const total = latestCoupons.length;
    const active = latestCoupons.filter((c) => c.is_active).length;
    const totalUses = latestCoupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
    const maxUses = latestCoupons.reduce((sum, c) => sum + (c.max_uses || 0), 0);
    return { total, active, totalUses, maxUses };
  }, [latestCoupons]);

  // Sort latest coupons by sponsor tier and company order to match the sponsor page exactly
  const sortedCoupons = useMemo(() => {
    const sponsorMap = new Map<string, { tier: string; index: number }>();
    sponsors.forEach((sp, idx) => {
      sponsorMap.set(sp.name.toLowerCase().trim(), { tier: sp.tier, index: idx });
    });

    const getTierWeight = (tier?: string) => {
      if (tier === 'Platinum') return 1;
      if (tier === 'Gold') return 2;
      if (tier === 'Silver') return 3;
      return 4;
    };

    return [...latestCoupons].sort((a, b) => {
      const nameA = (a.company_name || '').toLowerCase().trim();
      const nameB = (b.company_name || '').toLowerCase().trim();

      const spA = sponsorMap.get(nameA);
      const spB = sponsorMap.get(nameB);

      const tierA = getTierWeight(spA?.tier);
      const tierB = getTierWeight(spB?.tier);

      if (tierA !== tierB) return tierA - tierB;

      const idxA = spA?.index ?? 999;
      const idxB = spB?.index ?? 999;
      if (idxA !== idxB) return idxA - idxB;

      return (a.company_name || '').localeCompare(b.company_name || '', 'th');
    });
  }, [latestCoupons, sponsors]);

  // Paginated Coupons
  const paginatedCoupons = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(sortedCoupons.length / couponPageSize));
    const validPage = Math.min(Math.max(1, couponPage), totalPages);
    const start = (validPage - 1) * couponPageSize;
    return sortedCoupons.slice(start, start + couponPageSize);
  }, [sortedCoupons, couponPage, couponPageSize]);

  // Filtered Global History
  const filteredGlobalHistory = useMemo(() => {
    if (!historySearch.trim()) return globalHistory;
    const s = historySearch.toLowerCase();
    return globalHistory.filter(
      (h) =>
        (h.nameTh && h.nameTh.toLowerCase().includes(s)) ||
        (h.nameEn && h.nameEn.toLowerCase().includes(s)) ||
        (h.email && h.email.toLowerCase().includes(s)) ||
        (h.memberNo && h.memberNo.toLowerCase().includes(s)) ||
        (h.ticketCode && h.ticketCode.toLowerCase().includes(s)) ||
        (h.sponsor_company_name && h.sponsor_company_name.toLowerCase().includes(s)) ||
        (h.coupon_code && h.coupon_code.toLowerCase().includes(s))
    );
  }, [globalHistory, historySearch]);

  // Copy Coupon Code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    showToast(`คัดลอกรหัสคูปอง "${code}" แล้ว`);
    setTimeout(() => setCopiedCouponCode(null), 2500);
  };

  // Toggle Coupon Active
  const handleToggleCouponActive = async (coupon: CouponItem) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`คูปอง ${coupon.code} ${!coupon.is_active ? 'เปิดใช้งานแล้ว' : 'ปิดการใช้งานแล้ว'}`);
        fetchCoupons();
      }
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะคูปองได้', 'error');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรหัสคูปอง "${code}"?`)) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ลบคูปอง "${code}" สำเร็จ`);
        fetchCoupons();
      } else {
        showToast(data.error || 'ลบคูปองไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบคูปอง', 'error');
    }
  };

  // ─── Sponsor CRUD Handlers ───
  const handleOpenHistory = async (sponsor: SponsorItem) => {
    setSelectedSponsorForHistory(sponsor);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenEditSponsor = (sponsor: SponsorItem) => {
    setEditingSponsor(sponsor);
    const firstQuota = sponsor.quotas && sponsor.quotas.length > 0 ? sponsor.quotas[0] : null;
    const defaultMId = firstQuota?.meeting_id || sortedMeetings[0]?.meeting_id || 'TSRM34';
    const defaultQuota = firstQuota ? String(firstQuota.quota_seats) : String(sponsor.total_allocated_quota || 0);

    setEditSponsorForm({
      id: sponsor.id,
      name: sponsor.name,
      tier: sponsor.tier,
      contactEmail: sponsor.contact_email,
      contactName: sponsor.contact_name || '',
      isActive: sponsor.is_active,
      meetingId: defaultMId,
      quotaSeats: defaultQuota,
    });
    setEditSponsorError('');
    setEditSponsorOpen(true);
  };

  const handleSubmitEditSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSponsorForm.name.trim() || !editSponsorForm.contactEmail.trim()) {
      setEditSponsorError('กรุณาระบุชื่อบริษัทและอีเมลตัวแทน');
      return;
    }
    setSavingEdit(true);
    setEditSponsorError('');
    try {
      const res = await fetch(`/api/sponsors/${editSponsorForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSponsorForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditSponsorError(data.message || 'ไม่สามารถบันทึกการแก้ไขได้');
        return;
      }
      setEditSponsorOpen(false);
      showToast('บันทึกการแก้ไขข้อมูลบริษัทเรียบร้อยแล้ว');
      fetchSponsors();
      fetchCoupons();
    } catch (err) {
      setEditSponsorError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteSponsor = async () => {
    if (!sponsorToDelete) return;
    setDeletingSponsor(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsorToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'ไม่สามารถลบข้อมูลบริษัทได้', 'error');
        return;
      }
      setDeleteSponsorOpen(false);
      setSponsorToDelete(null);
      showToast(`ลบข้อมูล ${sponsorToDelete.name} เรียบร้อยแล้ว`);
      fetchSponsors();
      fetchCoupons();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeletingSponsor(false);
    }
  };

  const handleAddSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorForm.name.trim() || !newSponsorForm.contactEmail.trim()) {
      setAddSponsorError('กรุณาระบุชื่อบริษัทและอีเมลตัวแทน');
      return;
    }
    setAddingSponsor(true);
    setAddSponsorError('');
    try {
      const res = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSponsorForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddSponsorError(data.message || 'ไม่สามารถเพิ่มบริษัทได้');
        return;
      }
      setAddSponsorOpen(false);
      const quotaNum = parseInt(newSponsorForm.initialQuota || '0', 10);
      showToast(
        quotaNum > 0
          ? `เพิ่มบริษัท ${newSponsorForm.name} และสร้างรหัสคูปองฟรี Main Program (${quotaNum} สิทธิ์) สำเร็จ`
          : `เพิ่มบริษัท ${newSponsorForm.name} เรียบร้อยแล้ว`
      );
      setNewSponsorForm({
        name: '',
        tier: 'Silver',
        contactEmail: '',
        contactName: '',
        meetingId: sortedMeetings[0]?.meeting_id || 'TSRM34',
        initialQuota: '0',
      });
      fetchSponsors();
      fetchCoupons();
    } catch (err) {
      setAddSponsorError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setAddingSponsor(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification (Rule 9 compliant) */}
      {mounted &&
        toastMessage &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[10000] animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border bg-slate-900 text-white text-xs font-semibold backdrop-blur-md">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>,
          document.body
        )}

      {/* Top Header & Sub-Tab Switcher */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0026b3] to-[#001773] text-white flex items-center justify-center shadow-md shadow-blue-900/20">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  ระบบจัดการคูปอง & โควต้าสปอนเซอร์ (Coupons & Quotas)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  สิทธิ์ฟรี & โควต้า
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                โควต้าสิทธิ์ฟรีคือรหัสคูปองสำหรับนำไปกรอกลงทะเบียน โดยเชื่อมโยงกับบริษัทสปอนเซอร์และรอบการประชุม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setCouponToEdit(null);
                setCouponPrefilledCompany('');
                setCouponModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-900/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างรหัสคูปองใหม่</span>
            </button>
            <button
              onClick={() => {
                setAddSponsorError('');
                setAddSponsorOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>เพิ่มบริษัท</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('coupons')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'coupons'
                ? 'bg-[#0026b3] text-white shadow-sm shadow-blue-900/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>🎟️ รายการรหัสคูปอง ({couponStats.total})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sponsors')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'sponsors'
                ? 'bg-[#0026b3] text-white shadow-sm shadow-blue-900/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏢 บริษัทสปอนเซอร์ ({sponsorStats.total})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-[#0026b3] text-white shadow-sm shadow-blue-900/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📋 ประวัติการใช้สิทธิ์ลงทะเบียน</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRIMARY TAB: COUPONS & FREE QUOTAS LIST */}
      {/* ========================================================================= */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-6">
          {/* Coupon Statistics KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">คูปองทั้งหมด</span>
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{couponStats.total}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-2">เปิดใช้งานอยู่ {couponStats.active} รายการ</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">สิทธิ์ที่ใช้ไปแล้ว</span>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-900 mt-2">{couponStats.totalUses}</div>
              <div className="text-[11px] text-slate-500 mt-2">จากทั้งหมด {couponStats.maxUses} สิทธิ์</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">สิทธิ์คงเหลือ</span>
                <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-purple-900 mt-2">
                {Math.max(0, couponStats.maxUses - couponStats.totalUses)}
              </div>
              <div className="text-[11px] text-purple-700/80 mt-2">พร้อมสำหรับการลงทะเบียน</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-blue-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">บริษัทที่ผูกคูปอง</span>
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-blue-900 mt-2">{sponsorStats.total}</div>
              <div className="text-[11px] text-blue-700 mt-2">บริษัทสปอนเซอร์ในระบบ</div>
            </div>
          </div>

          {/* Filter Toolbar (Meeting Dropdown defaults to latest upcoming) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
              {/* Meeting Dropdown Selector */}
              <div className="relative w-full sm:w-72">
                <select
                  value={selectedCouponMeeting}
                  onChange={(e) => {
                    setSelectedCouponMeeting(e.target.value);
                    setCouponPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">🌐 ทุกงานประชุม ({meetings.length})</option>
                  {sortedMeetings.map((m) => {
                    const mId = m.meeting_id || m.id || '';
                    const mName = m.meeting_name || m.titleTh || mId;
                    const isUpcoming = m.status === 'upcoming' || mId.includes('34');
                    return (
                      <option key={mId} value={mId}>
                        {isUpcoming ? '🔥 [รอบล่าสุด] ' : ''}{mName} ({mId})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Coupon Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponSearchQuery}
                  onChange={(e) => {
                    setCouponSearchQuery(e.target.value);
                    setCouponPage(1);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCoupons()}
                  placeholder="ค้นหารหัสคูปอง หรือชื่อบริษัท..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchCoupons}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RotateCw className={`w-4 h-4 ${couponsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            {couponsLoading ? (
              <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2.5">
                <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>กำลังโหลดข้อมูลคูปอง...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">ไม่พบคูปองตามรอบการประชุมที่เลือก</p>
                <p className="text-slate-400 mt-0.5">กดปุ่ม "สร้างรหัสคูปองใหม่" เพื่อเพิ่มรหัสคูปองสำหรับบริษัทสปอนเซอร์</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[980px]">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">รหัสคูปอง</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">บริษัท / สปอนเซอร์</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">วัตถุประสงค์</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">งานประชุม</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">ประเภทสิทธิ์</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">สิทธิ์การใช้</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[90px]">สถานะ</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[90px]">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedCoupons.map((coupon) => {
                        const isCopied = copiedCouponCode === coupon.code;
                        const isExpired = coupon.expire_date && new Date(coupon.expire_date) < new Date();
                        const isFull = coupon.used_count >= coupon.max_uses;
                        const matchingSponsor = sponsors.find(
                          (s) => s.name.toLowerCase().trim() === (coupon.company_name || '').toLowerCase().trim()
                        );

                        return (
                          <tr key={coupon.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Code */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-mono font-black text-xs sm:text-sm text-[#0026b3] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80 tracking-wider whitespace-nowrap">
                                  {coupon.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(coupon.code)}
                                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
                                  title="คัดลอกรหัสคูปอง"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            {/* Company Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{coupon.company_name}</span>
                                {matchingSponsor && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${
                                      matchingSponsor.tier === 'Platinum'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : matchingSponsor.tier === 'Gold'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {matchingSponsor.tier === 'Platinum' && <Crown className="w-2.5 h-2.5 text-purple-600" />}
                                    {matchingSponsor.tier === 'Gold' && <Award className="w-2.5 h-2.5 text-amber-600" />}
                                    {matchingSponsor.tier}
                                  </span>
                                )}
                              </div>
                              {coupon.remarks && (
                                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {(() => {
                                    try {
                                      if (coupon.remarks.startsWith('{')) {
                                        const parsed = JSON.parse(coupon.remarks);
                                        const progText = parsed.allPrograms ? '🌐 ทุกโปรแกรม (All)' : (parsed.programs?.join(', ') || '🎯 การประชุมหลัก (Main)');
                                        return `${progText}${parsed.note ? ` • ${parsed.note}` : ''}`;
                                      }
                                    } catch (e) {}
                                    return coupon.remarks;
                                  })()}
                                </div>
                              )}
                            </td>

                            {/* Scope / Purpose */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {coupon.applicable_type === 'membership' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 whitespace-nowrap">
                                  🪪 สมัคร/ต่ออายุสมาชิก
                                </span>
                              ) : coupon.applicable_type === 'all' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200 whitespace-nowrap">
                                  🌐 ทุกประเภท
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 whitespace-nowrap">
                                  🎟️ ลงทะเบียนงานประชุม
                                </span>
                              )}
                            </td>

                            {/* Meeting */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-800 whitespace-nowrap">
                                {coupon.meetings?.meeting_name || coupon.meeting_id}
                              </span>
                            </td>

                            {/* Discount Type */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {coupon.discount_type === 'free' ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  🎁 ฟรี 100%
                                </span>
                              ) : coupon.discount_type === 'percent' ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                                  ลด {coupon.discount_value}%
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                  ลด ฿{coupon.discount_value.toLocaleString()}
                                </span>
                              )}
                            </td>

                            {/* Usages */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCouponForUsages(coupon);
                                  setCouponUsagesModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                title="ดูรายชื่อสมาชิกที่ใช้คูปองนี้"
                              >
                                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>{coupon.used_count} / {coupon.max_uses}</span>
                              </button>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleCouponActive(coupon)}
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                                  coupon.is_active && !isExpired && !isFull
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {isFull ? 'สิทธิ์เต็ม' : isExpired ? 'หมดอายุ' : coupon.is_active ? 'ใช้งาน' : 'ระงับ'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {/* History Button (Opens Coupon Generation History Modal) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const compCoupons = couponsByCompany.get((coupon.company_name || '').toLowerCase().trim()) || [coupon];
                                    setSelectedSponsorForCoupons({
                                      name: coupon.company_name,
                                      tier: matchingSponsor?.tier,
                                      coupons: compCoupons,
                                    });
                                    setSponsorCouponHistoryOpen(true);
                                  }}
                                  className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200/80 transition-colors cursor-pointer shadow-2xs"
                                  title="ดูประวัติรหัสคูปองที่เคยสร้างของบริษัทนี้"
                                >
                                  <History className="w-4 h-4 text-[#0026b3]" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCouponToEdit(coupon);
                                    setCouponModalOpen(true);
                                  }}
                                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-colors cursor-pointer shadow-2xs"
                                  title="แก้ไขคูปอง"
                                >
                                  <Pencil className="w-4 h-4 text-amber-600" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 transition-colors cursor-pointer shadow-2xs"
                                  title="ลบคูปอง"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {coupons.length > couponPageSize && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                    <PaginationControls
                      currentPage={couponPage}
                      pageSize={couponPageSize}
                      totalItems={coupons.length}
                      onPageChange={setCouponPage}
                      onPageSizeChange={setCouponPageSize}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: CORPORATE SPONSORS (TIER & QUOTA OVERVIEW) */}
      {/* ========================================================================= */}
      {activeSubTab === 'sponsors' && (
        <div className="space-y-6">
          {/* Sponsors KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">บริษัททั้งหมด</span>
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{sponsorStats.total}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2 font-medium">
                <span className="text-purple-700 font-semibold">💎 {sponsorStats.platinum}</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-semibold">🥇 {sponsorStats.gold}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-semibold">🥈 {sponsorStats.silver}</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-purple-600" /> Platinum
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">20 ที่นั่ง/งาน</span>
              </div>
              <div className="text-3xl font-black text-purple-900 mt-2">{sponsorStats.platinum}</div>
              <div className="text-[11px] text-purple-700/80 mt-2 font-medium">สิทธิ์ Platinum (โควต้า 20 สิทธิ์)</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-amber-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-600" /> Gold
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">8 ที่นั่ง/งาน</span>
              </div>
              <div className="text-3xl font-black text-amber-900 mt-2">{sponsorStats.gold}</div>
              <div className="text-[11px] text-amber-700/80 mt-2 font-medium">สิทธิ์ Gold (โควต้า 8 สิทธิ์)</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-blue-200/90 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-blue-600" /> โควต้าที่ใช้ / ทั้งหมด
                </span>
                <span className="text-[11px] font-bold text-blue-600">
                  {sponsorStats.totalQuota > 0 ? `${Math.round((sponsorStats.totalUsed / sponsorStats.totalQuota) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="text-3xl font-black text-blue-900 mt-2">
                {sponsorStats.totalUsed} <span className="text-sm font-semibold text-slate-400">/ {sponsorStats.totalQuota}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                คงเหลือ {Math.max(0, sponsorStats.totalQuota - sponsorStats.totalUsed)} สิทธิ์
              </div>
            </div>
          </div>

          {/* Search & Tier Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sponsorSearch}
                  onChange={(e) => setSponsorSearch(e.target.value)}
                  placeholder="ค้นหาชื่อบริษัท, ผู้ประสานงาน, หรืออีเมล..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto justify-start sm:justify-end">
              {[
                { id: 'all', label: `ทั้งหมด (${sponsorStats.total})` },
                { id: 'Platinum', label: `💎 Platinum (${sponsorStats.platinum})` },
                { id: 'Gold', label: `🥇 Gold (${sponsorStats.gold})` },
                { id: 'Silver', label: `🥈 Silver (${sponsorStats.silver})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTier(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedTier === tab.id
                      ? 'bg-[#0026b3] text-white shadow-sm shadow-blue-900/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={fetchSponsors}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 ml-1 cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RotateCw className={`w-4 h-4 ${sponsorsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Sponsors Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            {sponsorsLoading ? (
              <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2.5">
                <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>กำลังโหลดรายชื่อบริษัทสปอนเซอร์...</span>
              </div>
            ) : filteredSponsors.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">ไม่พบข้อมูลบริษัทสปอนเซอร์ตามเงื่อนไขที่ค้นหา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                  <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">ระดับ Tier</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">ชื่อบริษัท</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">รหัสคูปองฟรีที่ผูกอยู่</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">โควต้าสิทธิ์</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">ใช้ไปแล้ว</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">ประวัติสมาชิก</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[90px]">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSponsors.map((sp) => {
                      const tierBadgeStyle =
                        sp.tier === 'Platinum'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : sp.tier === 'Gold'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      const matchingCoupons = couponsByCompany.get(sp.name.toLowerCase().trim()) || [];

                      return (
                        <tr key={sp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border whitespace-nowrap ${tierBadgeStyle}`}
                            >
                              {sp.tier === 'Platinum' && <Crown className="w-3 h-3 text-purple-600" />}
                              {sp.tier === 'Gold' && <Award className="w-3 h-3 text-amber-600" />}
                              {sp.tier === 'Silver' && <Medal className="w-3 h-3 text-slate-500" />}
                              {sp.tier}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm whitespace-nowrap">{sp.name}</div>
                            {sp.contact_name && (
                              <div className="text-[11px] text-slate-500 font-normal">ผู้ติดต่อ: {sp.contact_name}</div>
                            )}
                          </td>

                          {/* Matching Latest Coupon Code */}
                          <td className="py-3.5 px-4">
                            {matchingCoupons.length > 0 ? (
                              <button
                                key={matchingCoupons[0].id}
                                type="button"
                                onClick={() => handleCopyCode(matchingCoupons[0].code)}
                                className="font-mono font-bold text-xs bg-blue-50 hover:bg-blue-100 text-[#0026b3] px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                                title="คลิกเพื่อคัดลอกรหัสคูปองล่าสุดนี้"
                              >
                                <span>{matchingCoupons[0].code}</span>
                                <Copy className="w-3 h-3 text-blue-500" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCouponToEdit(null);
                                  setCouponPrefilledCompany(sp.name);
                                  setCouponModalOpen(true);
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer whitespace-nowrap"
                              >
                                + สร้างคูปองให้บริษัทนี้
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-bold text-sm text-slate-900">
                              {sp.total_allocated_quota || 0}
                            </span>
                            <span className="text-slate-400 ml-1 text-[11px]">สิทธิ์</span>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="font-bold text-sm text-blue-600">
                              {sp.total_used_seats || 0}
                            </span>
                            <span className="text-slate-400 ml-1 text-[11px]">คน</span>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenHistory(sp)}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                              title="ดูรายชื่อสมาชิกที่บริษัทนี้เคยส่งลงทะเบียน"
                            >
                              <History className="w-3.5 h-3.5 text-blue-600" />
                              <span>{sp.total_registered_members || 0} คน</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* History Button (Opens Coupon Generation History Modal) */}
                              <button
                                onClick={() => {
                                  setSelectedSponsorForCoupons({
                                    name: sp.name,
                                    tier: sp.tier,
                                    coupons: matchingCoupons,
                                  });
                                  setSponsorCouponHistoryOpen(true);
                                }}
                                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200/80 transition-colors cursor-pointer shadow-2xs"
                                title="ดูประวัติรหัสคูปองที่เคยสร้างทั้งหมดของบริษัทนี้"
                              >
                                <History className="w-4 h-4 text-[#0026b3]" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditSponsor(sp)}
                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-colors cursor-pointer shadow-2xs"
                                title="แก้ไขข้อมูลบริษัทและโควต้า"
                              >
                                <Pencil className="w-4 h-4 text-amber-600" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => {
                                  setSponsorToDelete(sp);
                                  setDeleteSponsorOpen(true);
                                }}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 transition-colors cursor-pointer shadow-2xs"
                                title="ลบข้อมูลบริษัทสปอนเซอร์"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: REGISTRATION & USAGE HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="ค้นหาชื่อสมาชิก, เลขสมาชิก, รหัสตั๋ว หรือชื่อบริษัท..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={fetchGlobalHistory}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RotateCw className={`w-4 h-4 ${globalHistoryLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            {globalHistoryLoading ? (
              <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2.5">
                <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>กำลังโหลดประวัติการใช้สิทธิ์และลงทะเบียน...</span>
              </div>
            ) : filteredGlobalHistory.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">ไม่พบประวัติการใช้สิทธิ์ตามเงื่อนไขที่ค้นหา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[920px]">
                  <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">เลขสมาชิก</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">ชื่อ-นามสกุล / อีเมล</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">บริษัทสปอนเซอร์</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">รหัสคูปอง</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">งานประชุม</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">รหัส Ticket</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">สถานะเช็คอิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredGlobalHistory.map((row: any) => (
                      <tr key={row.id || row.attendance_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {row.memberNo || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{row.nameTh || row.nameEn || row.attendee_name}</div>
                          <div className="text-[11px] text-slate-500">{row.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {row.sponsor_company_name || row.sponsored_by_company || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {row.coupon_code ? (
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {row.coupon_code}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {row.meetingName || row.meetingId}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-600">
                          {row.ticketCode || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              row.status === 'Checked-in' || row.attendance_status === 'Attended'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {row.status || row.attendance_status || 'Registered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: MEMBER HISTORY OF SPONSOR */}
      {/* ======================================================= */}
      {mounted &&
        historyModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      รายชื่อสมาชิกที่ {selectedSponsorForHistory?.name} ส่งลงทะเบียน
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      อีเมลตัวแทน: <span className="font-mono font-medium text-slate-700">{selectedSponsorForHistory?.contact_email}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {historyLoading ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span>กำลังโหลดประวัติสมาชิก...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">ยังไม่มีประวัติสมาชิกที่บริษัทนี้เคยส่งลงทะเบียน</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3.5">เลขสมาชิก</th>
                          <th className="py-3 px-3.5">ชื่อ-นามสกุล / อีเมล</th>
                          <th className="py-3 px-3.5">งานประชุม</th>
                          <th className="py-3 px-3.5">รหัส Ticket</th>
                          <th className="py-3 px-3.5">วันที่ทำรายการ</th>
                          <th className="py-3 px-3.5 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {historyList.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3.5 font-mono font-bold text-blue-600">{row.memberNo}</td>
                            <td className="py-3 px-3.5">
                              <div className="font-bold text-slate-900">{row.attendeeName}</div>
                              <div className="text-[11px] text-slate-500">{row.attendeeEmail}</div>
                            </td>
                            <td className="py-3 px-3.5 text-slate-700">{row.meetingName || row.meetingId}</td>
                            <td className="py-3 px-3.5 font-mono text-amber-600 font-bold">{row.ticketCode || '-'}</td>
                            <td className="py-3 px-3.5 text-slate-500">
                              {new Date(row.registeredAt).toLocaleDateString('th-TH')}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {row.attendanceStatus || 'Registered'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer shadow-sm transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================= */}
      {/* MODAL: ADD NEW SPONSOR */}
      {/* ======================================================= */}
      {mounted &&
        addSponsorOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900">เพิ่มข้อมูลบริษัทสปอนเซอร์ใหม่</h3>
                </div>
                <button
                  onClick={() => setAddSponsorOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSponsorSubmit} className="p-6 space-y-4 bg-white">
                {addSponsorError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{addSponsorError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อบริษัทสปอนเซอร์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSponsorForm.name}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, name: e.target.value })}
                    placeholder="ระบุชื่อบริษัทสปอนเซอร์"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ระดับ Tier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newSponsorForm.tier}
                      onChange={(e) => {
                        const t = e.target.value as any;
                        let q = '0';
                        if (t === 'Platinum') q = '20';
                        else if (t === 'Gold') q = '8';
                        setNewSponsorForm({ ...newSponsorForm, tier: t, initialQuota: q });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="Platinum">💎 Platinum (20 ที่นั่ง)</option>
                      <option value="Gold">🥇 Gold (8 ที่นั่ง)</option>
                      <option value="Silver">🥈 Silver (บูธ/งาน)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      จำนวนโควต้าสิทธิ์ฟรี (ที่นั่ง)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newSponsorForm.initialQuota}
                      onChange={(e) => setNewSponsorForm({ ...newSponsorForm, initialQuota: e.target.value })}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {meetings.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ผูกโควต้ากับงานประชุม
                    </label>
                    <select
                      value={newSponsorForm.meetingId}
                      onChange={(e) => setNewSponsorForm({ ...newSponsorForm, meetingId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      {sortedMeetings.map((m) => {
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
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    อีเมลตัวแทนผู้ประสานงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newSponsorForm.contactEmail}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, contactEmail: e.target.value })}
                    placeholder="youremail@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อผู้ประสานงาน (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSponsorForm.contactName}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, contactName: e.target.value })}
                    placeholder="ชื่อผู้ประสานงาน"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddSponsorOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={addingSponsor}
                    className="px-5 py-2 rounded-xl bg-[#0026b3] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {addingSponsor ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบริษัท'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================= */}
      {/* MODAL: EDIT SPONSOR */}
      {/* ======================================================= */}
      {mounted &&
        editSponsorOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">แก้ไขข้อมูลบริษัทสปอนเซอร์</h3>
                    <p className="text-xs text-slate-500">ID: {editSponsorForm.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditSponsorOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitEditSponsor} className="p-6 space-y-4 bg-white">
                {editSponsorError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{editSponsorError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อบริษัทสปอนเซอร์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editSponsorForm.name}
                    onChange={(e) => setEditSponsorForm({ ...editSponsorForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ระดับ Tier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editSponsorForm.tier}
                      onChange={(e) => setEditSponsorForm({ ...editSponsorForm, tier: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="Platinum">💎 Platinum</option>
                      <option value="Gold">🥇 Gold</option>
                      <option value="Silver">🥈 Silver</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      สถานะการใช้งาน
                    </label>
                    <select
                      value={editSponsorForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setEditSponsorForm({ ...editSponsorForm, isActive: e.target.value === 'true' })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="true">✅ เปิดใช้งาน (Active)</option>
                      <option value="false">🚫 ระงับการใช้งาน (Inactive)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Ticket className="w-4 h-4 text-blue-600" />
                    <span>จัดการโควต้าที่นั่ง (Quota per Meeting)</span>
                  </div>

                  {meetings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          เลือกงานประชุม
                        </label>
                        <select
                          value={editSponsorForm.meetingId}
                          onChange={(e) => {
                            const mId = e.target.value;
                            const found = (editingSponsor?.quotas || []).find((q) => q.meeting_id === mId);
                            setEditSponsorForm((prev) => ({
                              ...prev,
                              meetingId: mId,
                              quotaSeats: found ? String(found.quota_seats) : '0',
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {sortedMeetings.map((m) => {
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

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          จำนวนโควต้าสิทธิ์ฟรี (ที่นั่ง)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editSponsorForm.quotaSeats}
                          onChange={(e) => setEditSponsorForm({ ...editSponsorForm, quotaSeats: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    อีเมลตัวแทนผู้ประสานงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editSponsorForm.contactEmail}
                    onChange={(e) => setEditSponsorForm({ ...editSponsorForm, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อผู้ประสานงาน
                  </label>
                  <input
                    type="text"
                    value={editSponsorForm.contactName}
                    onChange={(e) => setEditSponsorForm({ ...editSponsorForm, contactName: e.target.value })}
                    placeholder="ชื่อผู้ประสานงาน"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditSponsorOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-xl bg-[#0026b3] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================= */}
      {/* MODAL: DELETE SPONSOR CONFIRMATION */}
      {/* ======================================================= */}
      {mounted &&
        deleteSponsorOpen &&
        sponsorToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    ยืนยันการลบข้อมูลบริษัทสปอนเซอร์?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5">
                    คุณกำลังจะลบข้อมูลบริษัท <span className="font-bold text-slate-900">{sponsorToDelete.name}</span> ({sponsorToDelete.contact_email})
                  </p>
                </div>

                {sponsorToDelete.total_registered_members > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left">
                    <span className="font-bold">⚠️ หมายเหตุ:</span> บริษัทนี้มีประวัติการส่งสมาชิกลงทะเบียนแล้วจำนวน{' '}
                    <span className="font-bold text-amber-900">{sponsorToDelete.total_registered_members} คน</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteSponsorOpen(false)}
                    disabled={deletingSponsor}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSponsor}
                    disabled={deletingSponsor}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {deletingSponsor ? 'กำลังลบ...' : 'ยืนยันลบข้อมูล'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================= */}
      {/* MODAL: CREATE / EDIT COUPON */}
      {/* ======================================================= */}
      <CouponModal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        couponToEdit={couponToEdit}
        meetings={sortedMeetings}
        sponsors={sponsors}
        prefilledCompanyName={couponPrefilledCompany}
        onSaveSuccess={() => {
          showToast(couponToEdit ? 'แก้ไขข้อมูลคูปองเรียบร้อยแล้ว' : 'สร้างคูปองใหม่สำเร็จ');
          fetchCoupons();
        }}
      />

      {/* ======================================================= */}
      {/* MODAL: SPONSOR COUPON GENERATION HISTORY */}
      {/* ======================================================= */}
      <SponsorCouponHistoryModal
        isOpen={sponsorCouponHistoryOpen}
        onClose={() => setSponsorCouponHistoryOpen(false)}
        sponsorName={selectedSponsorForCoupons?.name || ''}
        sponsorTier={selectedSponsorForCoupons?.tier}
        coupons={selectedSponsorForCoupons?.coupons || []}
        onSelectCouponForUsages={(coupon) => {
          setSelectedCouponForUsages(coupon);
          setCouponUsagesModalOpen(true);
        }}
        onEditCoupon={(coupon) => {
          setSponsorCouponHistoryOpen(false);
          setCouponToEdit(coupon);
          setCouponModalOpen(true);
        }}
        onDeleteCoupon={(couponId, couponCode) => {
          handleDeleteCoupon(couponId, couponCode);
          setSponsorCouponHistoryOpen(false);
        }}
      />
    </div>
  );
}
