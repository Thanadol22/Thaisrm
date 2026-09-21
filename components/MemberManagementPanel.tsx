'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Member,
  MemberType,
  MEMBER_TYPE_LABELS,
  MEMBERSHIP_TYPE_LABELS,
  JOB_CATEGORIES,
  ApiResponse,
  MemberStats,
} from '@/types/member';
import { MemberDetailModal } from '@/components/MemberDetailModal';
import { MemberFormModal } from '@/components/MemberFormModal';
import { MemberAvatar } from '@/components/MemberAvatar';
import { PaginationControls } from '@/components/PaginationControls';
import {
  Users,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Building2,
  Mail,
  Phone,
  QrCode,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Award,
  ShieldCheck,
  ShieldAlert,
  Crown,
  CheckCircle,
  XCircle,
  Calendar,
  CalendarCheck2,
} from 'lucide-react';

export function MemberManagementPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Data list & state
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterJobCategory, setFilterJobCategory] = useState<string>('all');
  const [filterMembershipType, setFilterMembershipType] = useState<string>('all');
  const [filterMembershipStatus, setFilterMembershipStatus] = useState<string>('all');

  // Default sorting: รหัสสมาชิก ล่าสุด (มากไปน้อย) (member_no desc)
  const [sortBy, setSortBy] = useState<'member_no' | 'created_at' | 'full_name_th'>('member_no');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 5,
    total_pages: 1,
  });

  // Modals state
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [formMember, setFormMember] = useState<Member | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync Status Modal State (4 Consecutive Meetings Rule)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncPreview, setSyncPreview] = useState<any>(null);
  const [isLoadingSyncPreview, setIsLoadingSyncPreview] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Global Database Statistics (Total, Regular, Lifelong, Active, Inactive)
  const [globalStats, setGlobalStats] = useState<MemberStats>({
    total: 0,
    regular_count: 0,
    lifelong_count: 0,
    active_count: 0,
    inactive_count: 0,
  });

  // Fetch members from database API
  const fetchMembers = useCallback(async (showFullLoader = true) => {
    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (filterJobCategory !== 'all') params.set('job_category', filterJobCategory);
      if (filterMembershipType !== 'all') params.set('membership_type', filterMembershipType);
      if (filterMembershipStatus !== 'all') params.set('membership_status', filterMembershipStatus);
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sort_by', sortBy);
      params.set('order', order);

      const res = await fetch(`/api/members?${params.toString()}`, {
        cache: 'no-store',
      });
      const json: ApiResponse<Member[]> = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถดึงข้อมูลสมาชิกได้');
      }

      setMembers(json.data || []);
      if (json.pagination) {
        setPagination(json.pagination);
      }
      if (json.stats) {
        setGlobalStats(json.stats);
      }
    } catch (err: unknown) {
      console.error('Fetch members error:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, filterJobCategory, filterMembershipType, filterMembershipStatus, page, limit, sortBy, order]);

  // Trigger fetch on query param changes
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormMember(null);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member: Member) => {
    setFormMember(member);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  // Open View Detail Modal
  const handleOpenDetail = (member: Member) => {
    setDetailMember(member);
    setIsDetailOpen(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (member: Member) => {
    setDeletingMember(member);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);

    try {
      const targetId = deletingMember.member_no || deletingMember.member_id;
      const res = await fetch(`/api/members/${targetId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถลบข้อมูลสมาชิกได้');
      }

      showToast(`ลบข้อมูลสมาชิก "${deletingMember.full_name_th}" เรียบร้อยแล้ว`, 'success');
      setIsDeleteOpen(false);
      setDeletingMember(null);
      fetchMembers(false);
    } catch (err: unknown) {
      console.error('Delete error:', err);
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสมาชิก', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Form Success Callback
  const handleFormSuccess = (savedMember: Member, isNew: boolean) => {
    showToast(
      isNew
        ? `เพิ่มสมาชิกใหม่ "${savedMember.full_name_th}" (รหัส: ${savedMember.member_no || savedMember.code}) สำเร็จ`
        : `อัปเดตข้อมูลสมาชิก "${savedMember.full_name_th}" เรียบร้อยแล้ว`,
      'success'
    );
    fetchMembers(false);
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (members.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
      return;
    }

    const headers = [
      'รหัสสมาชิก',
      'ชื่อ-นามสกุล (ไทย)',
      'ชื่อ-นามสกุล (อังกฤษ)',
      'ตำแหน่ง / สาขาวิชาชีพ',
      'ประเภทสมาชิก',
      'สถานะสมาชิก',
      'สถานที่ทำงาน',
      'เบอร์โทรศัพท์',
      'อีเมล',
      'LINE ID',
      'ที่อยู่',
      'วันที่สมัคร',
    ];

    const rows = members.map((m) => [
      `"${m.member_no || m.code || ''}"`,
      `"${(m.full_name_th || '').replace(/"/g, '""')}"`,
      `"${(m.full_name_en || '').replace(/"/g, '""')}"`,
      `"${m.job_category || m.position || ''}"`,
      `"${m.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}"`,
      `"${m.membership_status === 'Active' ? 'ปกติ' : m.membership_status === 'Inactive' ? 'หมดอายุ' : m.membership_status || 'ปกติ'}"`,
      `"${(m.workplace || '').replace(/"/g, '""')}"`,
      `"${m.mobile || ''}"`,
      `"${m.email || ''}"`,
      `"${m.line_id || ''}"`,
      `"${(m.address || '').replace(/"/g, '""')}"`,
      `"${m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH') : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TSRM_Members_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  };

  // Open Sync Status Modal (4 Consecutive Meetings Rule)
  const handleOpenSyncModal = async () => {
    setIsSyncModalOpen(true);
    setIsLoadingSyncPreview(true);
    try {
      const res = await fetch('/api/admin/members/sync-status');
      const data = await res.json();
      if (data.success) {
        setSyncPreview(data);
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาดในการคำนวณตัวอย่างสถานะ', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลตัวอย่างสถานะได้', 'error');
    } finally {
      setIsLoadingSyncPreview(false);
    }
  };

  // Confirm Batch Sync
  const handleConfirmSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/members/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'ประมวลผลสถานะสมาชิกสำเร็จ', 'success');
        setIsSyncModalOpen(false);
        fetchMembers(true);
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper for Position/Job Category styling
  const getJobCategoryBadge = (cat?: string | null) => {
    if (!cat) return 'bg-slate-100 text-slate-700 border-slate-200';
    const lower = cat.toLowerCase();
    if (lower === 'rm' || lower.includes('ob-gyn')) return 'bg-blue-50 text-[#0026b3] border-blue-200 font-bold';
    if (lower.includes('fellow')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
    if (lower.includes('embryo')) return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    if (lower.includes('andrology') || lower.includes('sa')) return 'bg-teal-50 text-teal-800 border-teal-200 font-bold';
    if (lower.includes('pgt') || lower.includes('genetic')) return 'bg-purple-50 text-purple-800 border-purple-200 font-bold';
    if (lower.includes('nurse')) return 'bg-sky-50 text-sky-800 border-sky-200 font-bold';
    return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  };

  // Helper for Membership Status Semantic Styling (Pure Thai)
  const renderStatusBadge = (status?: string | null) => {
    const s = status || 'Active';
    if (s.toLowerCase() === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span>ปกติ</span>
        </span>
      );
    } else if (s.toLowerCase() === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>หมดอายุ</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>{s}</span>
        </span>
      );
    }
  };

  // Helper for Membership Type Semantic Styling (Pure Thai)
  const renderMembershipTypeBadge = (type?: string | null) => {
    if (type === 'Lifelong') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-50 to-amber-100/70 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>ตลอดชีพ</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0026b3] border border-blue-200 shadow-2xs whitespace-nowrap">
        <Award className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
        <span>สามัญ</span>
      </span>
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterJobCategory('all');
    setFilterMembershipType('all');
    setFilterMembershipStatus('all');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    filterJobCategory !== 'all' ||
    filterMembershipType !== 'all' ||
    filterMembershipStatus !== 'all';

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-12 w-full max-w-full overflow-hidden">
      
      {/* Toast Notification Popup */}
      {toast && mounted && createPortal(
        <div className="fixed top-5 right-5 z-[10000] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 animate-slide-down max-w-[90vw]">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold truncate">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>,
        document.body
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-7 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 h-48 rounded-full bg-[#4ade80]/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 backdrop-blur-md text-[#4ade80] border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>ระบบฐานข้อมูลสมาชิกสมาคม TSRM</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              จัดการข้อมูลสมาชิก
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
              สืบค้น ค้นหากรองตามสถานะ เพิ่ม แก้ไข และตรวจสอบข้อมูลสมาชิกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenSyncModal}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition cursor-pointer border border-white/20 backdrop-blur-md shadow-xs active:scale-95"
              title="ประมวลผลสถานะสมาชิกตามกฎขาดประชุม 4 ครั้งล่าสุด"
            >
              <CalendarCheck2 className="w-4 h-4 text-[#4ade80]" />
              <span>ประมวลผล 4 การประชุม</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition cursor-pointer border border-white/20 backdrop-blur-md shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#4ade80]" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ecb72] text-slate-950 text-xs sm:text-sm font-black transition cursor-pointer shadow-lg shadow-[#4ade80]/25 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>เพิ่มสมาชิกใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Members */}
        <div
          onClick={handleResetFilters}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            !hasActiveFilters
              ? 'border-[#0026b3] ring-2 ring-[#0026b3]/15'
              : 'border-slate-200/90 hover:border-[#0026b3]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">สมาชิกทั้งหมด</span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-2">
            {globalStats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            คลิกเพื่อดูทั้งหมด
          </div>
        </div>

        {/* Card 2: Regular Members */}
        <div
          onClick={() => {
            setFilterMembershipType('Regular');
            setPage(1);
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            filterMembershipType === 'Regular'
              ? 'border-[#0026b3] ring-2 ring-[#0026b3]/15'
              : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">สมาชิกสามัญ</span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#0026b3] mt-2">
            {globalStats.regular_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            {globalStats.total > 0
              ? `${Math.round((globalStats.regular_count / globalStats.total) * 100)}% ของทั้งหมด`
              : 'สมาชิกรายปี'}
          </div>
        </div>

        {/* Card 3: Lifelong Members */}
        <div
          onClick={() => {
            setFilterMembershipType('Lifelong');
            setPage(1);
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            filterMembershipType === 'Lifelong'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">สมาชิกตลอดชีพ</span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-700 mt-2">
            {globalStats.lifelong_count.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-1">
            {globalStats.total > 0
              ? `${Math.round((globalStats.lifelong_count / globalStats.total) * 100)}% สมาชิกถาวร`
              : 'สมาชิกตลอดชีพ'}
          </div>
        </div>

        {/* Card 4: Active / Inactive Status */}
        <div
          onClick={() => {
            setFilterMembershipStatus(filterMembershipStatus === 'Active' ? 'Inactive' : 'Active');
            setPage(1);
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
            filterMembershipStatus !== 'all'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">สถานะปกติ</span>
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 mt-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-800">
              {globalStats.active_count.toLocaleString()}
            </span>
            {globalStats.inactive_count > 0 && (
              <span className="text-[11px] sm:text-xs font-bold text-rose-700">
                (หมดอายุ {globalStats.inactive_count})
              </span>
            )}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>สลับฟิลเตอร์สถานะ</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar (Responsive Optimized) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3 sm:space-y-4">
        
        {/* Top Filter Controls: Clean responsive flex layout */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อ-นามสกุล, รหัสสมาชิก, เบอร์โทร, อีเมล, ที่ทำงาน..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Unified Sort Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            
            {/* 1. สถานะสมาชิก Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 h-10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={filterMembershipStatus}
                onChange={(e) => {
                  setFilterMembershipStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-bold text-slate-700 bg-transparent pr-1 focus:outline-none cursor-pointer"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="Active">ปกติ</option>
                <option value="Inactive">หมดอายุ</option>
              </select>
            </div>

            {/* 2. ประเภทสมาชิก Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 h-10">
              <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <select
                value={filterMembershipType}
                onChange={(e) => {
                  setFilterMembershipType(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-bold text-slate-700 bg-transparent pr-1 focus:outline-none cursor-pointer"
              >
                <option value="all">ประเภท: ทั้งหมด</option>
                <option value="Regular">สมาชิกสามัญ</option>
                <option value="Lifelong">สมาชิกตลอดชีพ</option>
              </select>
            </div>

            {/* 3. จัดเรียงลำดับ + สลับลำดับ (Unified Group) */}
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden h-10 shadow-2xs">
              <select
                value={sortBy}
                onChange={(e) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setSortBy(e.target.value as any);
                }}
                className="text-xs font-bold text-slate-700 bg-transparent px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="member_no">เรียง: รหัสสมาชิก</option>
                <option value="created_at">เรียง: วันที่สมัคร</option>
                <option value="full_name_th">เรียง: ชื่อ (ก-ฮ)</option>
              </select>
              <button
                type="button"
                onClick={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-2.5 h-full border-l border-slate-200 hover:bg-slate-200/70 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1"
                title={`ลำดับ: ${order === 'asc' ? 'น้อยไปมาก (คลิกเพื่อสลับ)' : 'มากไปน้อย (คลิกเพื่อสลับ)'}`}
              >
                <span>{order === 'asc' ? '⬆️ น้อย' : '⬇️ มาก'}</span>
              </button>
            </div>

            {/* 4. Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="ล้างตัวกรองทั้งหมด"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ล้างตัวกรอง</span>
              </button>
            )}

            {/* 5. Refresh Button */}
            <button
              type="button"
              onClick={() => fetchMembers(false)}
              disabled={isRefreshing || isLoading}
              className="px-3 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0026b3]' : ''}`} />
            </button>
          </div>

        </div>

        {/* Position Filter Chips (Clean horizontal scroll with smooth responsiveness) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100 scrollbar-thin">
          <span className="text-[11px] font-extrabold text-slate-500 whitespace-nowrap mr-1 shrink-0">ตำแหน่ง:</span>
          <button
            type="button"
            onClick={() => {
              setFilterJobCategory('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
              filterJobCategory === 'all'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทุกตำแหน่ง
          </button>
          {JOB_CATEGORIES.map((cat) => {
            const isSelected = filterJobCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFilterJobCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Member Table Content (Responsive Table with Fixed Widths & No Wrapping) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Error State */}
        {error && (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchMembers(true)}
              className="px-4 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold transition cursor-pointer"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#0026b3] animate-spin mx-auto" />
            <div className="text-xs font-bold text-slate-600">กำลังโหลดรายชื่อสมาชิกจากฐานข้อมูล (เรียงตามรหัสสมาชิก)...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && members.length === 0 && (
          <div className="p-16 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลสมาชิก</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'ไม่พบสมาชิกที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง ลองเปลี่ยนคำค้นหาหรือกดปุ่มล้างตัวกรอง'
                : 'ยังไม่มีข้อมูลสมาชิกในระบบ สามารถเพิ่มสมาชิกใหม่ได้โดยกดปุ่มด้านล่าง'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4ade80] text-slate-950 text-xs font-black shadow-sm hover:bg-[#3ecb72] transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>เพิ่มสมาชิกใหม่</span>
              </button>
            )}
          </div>
        )}

        {/* Table View (Responsive & Non-overflowing Layout) */}
        {!isLoading && !error && members.length > 0 && (
          <div className="overflow-x-auto w-full rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[180px]">รหัสสมาชิก & ชื่อ-นามสกุล</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[120px]">ตำแหน่ง / วิชาชีพ</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[130px]">สถานที่ทำงาน</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[130px]">ข้อมูลติดต่อ</th>
                  <th className="py-3 px-2 sm:px-3 whitespace-nowrap min-w-[90px]">ประเภทสมาชิก</th>
                  <th className="py-3 px-2 sm:px-3 text-center whitespace-nowrap min-w-[80px]">สถานะ</th>
                  <th className="py-3 px-3 sm:px-4 text-left whitespace-nowrap min-w-[90px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {members.map((member) => {
                  const memberNo = member.member_no || member.code || '----';
                  const jobCat = member.job_category || member.position || 'ไม่ระบุ';

                  return (
                    <tr
                      key={member.member_no || member.member_id}
                      className="hover:bg-blue-50/40 transition group"
                    >
                      {/* Name & ID & Avatar */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar
                            photoUrl={member.photo_path}
                            name={member.full_name_th}
                            size="md"
                          />

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-[#0026b3] px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200">
                                #{memberNo}
                              </span>
                              {member.id_last4 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({member.id_last4})
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900 group-hover:text-[#0026b3] transition truncate max-w-[160px] sm:max-w-[190px]">
                              {member.full_name_th}
                            </div>
                            {member.full_name_en && (
                              <div className="text-xs text-slate-400 truncate max-w-[160px] sm:max-w-[190px]">
                                {member.full_name_en}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ตำแหน่ง / สาขาวิชาชีพ */}
                      <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${getJobCategoryBadge(
                            member.job_category || member.position
                          )}`}
                        >
                          {jobCat}
                        </span>
                        {member.position && member.position !== member.job_category && (
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate max-w-[130px]">
                            {member.position}
                          </div>
                        )}
                      </td>

                      {/* Workplace */}
                      <td className="py-3 px-2.5 sm:px-3 text-xs text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 max-w-[140px] lg:max-w-[170px] truncate font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.workplace || '-'}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-2.5 sm:px-3 text-xs text-slate-600 space-y-0.5 whitespace-nowrap">
                        {member.mobile ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{member.mobile}</span>
                          </div>
                        ) : null}
                        {member.email ? (
                          <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        ) : null}
                        {!member.mobile && !member.email && (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>

                      {/* ประเภทสมาชิก */}
                      <td className="py-3 px-2 sm:px-3 whitespace-nowrap">
                        {renderMembershipTypeBadge(member.membership_type)}
                      </td>

                      {/* สถานะสมาชิก */}
                      <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                        {renderStatusBadge(member.membership_status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 sm:px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(member)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0026b3] hover:bg-blue-50 transition cursor-pointer"
                            title="ดูข้อมูลละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="ลบสมาชิก"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {!isLoading && !error && members.length > 0 && (
          <div className="border-t border-slate-100">
            <PaginationControls
              currentPage={page}
              totalItems={pagination.total}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemLabel="รายชื่อ"
              className="rounded-none border-0 shadow-none bg-slate-50/70 px-4 sm:px-6 py-4"
            />
          </div>
        )}

      </div>

      {/* Member Detail & QR Modal */}
      <MemberDetailModal
        member={detailMember}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleOpenEdit}
      />

      {/* Member Form Modal (Create / Edit) */}
      <MemberFormModal
        member={formMember}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deletingMember && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  ยืนยันการลบข้อมูลสมาชิก?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก{' '}
                  <span className="font-bold text-slate-800">
                    &quot;{deletingMember.full_name_th}&quot; (รหัส: #{deletingMember.member_no || deletingMember.code})
                  </span>{' '}
                  ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeletingMember(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sync Status Modal (4 Consecutive Meetings Rule) */}
      {isSyncModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0026b3] via-[#001f94] to-[#001c8c] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 text-[#4ade80] border border-white/15">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    ประมวลผลสถานะสมาชิกตาม 4 การประชุมล่าสุด
                  </h3>
                  <p className="text-xs text-blue-100/80 mt-0.5">
                    ตามข้อบังคับ: สมาชิกสามัญที่ขาดประชุม 4 ครั้งล่าสุดติดต่อกันจะถูกปรับเป็นสถานะหมดอายุ (Inactive)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={isSyncing}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingSyncPreview ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 text-[#0026b3] animate-spin" />
                  <span className="text-xs font-bold">กำลังประมวลผลและจำลองผลลัพธ์ (Dry Run)...</span>
                </div>
              ) : syncPreview ? (
                <>
                  {/* Qualifying Meetings List */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0026b3]" />
                      4 รอบการประชุมที่นำมาประเมิน (นับสิทธิ์คงสถานะ):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {syncPreview.qualifyingMeetings?.map((qm: any, idx: number) => (
                        <div key={qm.meeting_id} className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                          <div className="font-bold text-slate-800 truncate pr-2">
                            {idx + 1}. {qm.meeting_name}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {qm.meeting_date ? new Date(qm.meeting_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-blue-700">สมาชิกที่ประเมิน</div>
                      <div className="text-lg font-black text-[#0026b3]">
                        {syncPreview.summary?.total_members_evaluated?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-rose-700">จะเปลี่ยนเป็น หมดอายุ</div>
                      <div className="text-lg font-black text-rose-700">
                        {syncPreview.summary?.updated_to_inactive?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-emerald-700">จะเปลี่ยนเป็น ปกติ</div>
                      <div className="text-lg font-black text-emerald-700">
                        {syncPreview.summary?.updated_to_active?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-600">สถานะไม่เปลี่ยนแปลง</div>
                      <div className="text-lg font-black text-slate-800">
                        {syncPreview.summary?.unchanged_count?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>

                  {/* Changes Details Preview */}
                  {syncPreview.summary?.details && syncPreview.summary.details.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        รายชื่อสมาชิกที่จะมีการปรับเปลี่ยนสถานะ ({syncPreview.summary.details.length} ราย):
                      </span>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                        {syncPreview.summary.details.map((d: any) => (
                          <div key={d.member_no} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <span className="font-bold text-slate-900 font-mono mr-2">#{d.member_no}</span>
                              <span className="font-medium text-slate-800">{d.full_name_th}</span>
                              <div className="text-[10px] text-slate-500">{d.reason}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 line-through">{d.previous_status}</span>
                              <span>→</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                d.new_status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {d.new_status === 'Active' ? 'ปกติ' : 'หมดอายุ'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-800">
                      ✓ สถานะสมาชิกทุกคนในระบบตรงตามกฎ 4 ครั้งล่าสุดเรียบร้อยแล้ว ไม่มีการเปลี่ยนแปลง
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={isSyncing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSync}
                disabled={isSyncing || isLoadingSyncPreview}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-md shadow-[#0026b3]/25 active:scale-95"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึกสถานะ...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>ยืนยันการประมวลผลสถานะ</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
