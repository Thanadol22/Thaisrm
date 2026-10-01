'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminPageHeader, HeaderButton } from '@/components/admin/AdminPageHeader';
import { Btn, IconBtn, EmptyState, StatGrid, StatCard, SearchInput, ToolbarGroup, FilterSelect } from '@/components/admin/ui';
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
  ArrowUpDown,
  PlusCircle,
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

import { statusLabelTh } from '@/lib/statusLabels';
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

      <AdminPageHeader
        tab="members"
        title="จัดการข้อมูลสมาชิก"
        description="สืบค้น กรองตามสถานะ เพิ่ม แก้ไข และตรวจสอบข้อมูลสมาชิกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย"
        actions={
          <>
            <HeaderButton variant="primary" icon={PlusCircle} onClick={handleOpenCreate}>
              เพิ่มสมาชิกใหม่
            </HeaderButton>
            <HeaderButton
              icon={CalendarCheck2}
              onClick={handleOpenSyncModal}
              title="ประมวลผลสถานะสมาชิกตามกฎขาดประชุม 4 ครั้งล่าสุด"
            >
              ประมวลผล 4 การประชุม
            </HeaderButton>
            <HeaderButton icon={FileSpreadsheet} onClick={handleExportCSV}>
              ส่งออก CSV
            </HeaderButton>
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="สมาชิกทั้งหมด"
          value={globalStats.total.toLocaleString()}
          unit="คน"
          hint="กดเพื่อล้างตัวกรอง"
          icon={Users}
          tone="blue"
          active={!hasActiveFilters}
          onClick={handleResetFilters}
        />
        <StatCard
          label="สมาชิกสามัญ"
          value={globalStats.regular_count.toLocaleString()}
          unit="คน"
          hint={globalStats.total > 0 ? `${Math.round((globalStats.regular_count / globalStats.total) * 100)}% ของทั้งหมด` : undefined}
          icon={Award}
          tone="blue"
          active={filterMembershipType === 'Regular'}
          onClick={() => {
            setFilterMembershipType(filterMembershipType === 'Regular' ? 'all' : 'Regular');
            setPage(1);
          }}
        />
        <StatCard
          label="สมาชิกตลอดชีพ"
          value={globalStats.lifelong_count.toLocaleString()}
          unit="คน"
          hint={globalStats.total > 0 ? `${Math.round((globalStats.lifelong_count / globalStats.total) * 100)}% ของทั้งหมด` : undefined}
          icon={Crown}
          tone="amber"
          active={filterMembershipType === 'Lifelong'}
          onClick={() => {
            setFilterMembershipType(filterMembershipType === 'Lifelong' ? 'all' : 'Lifelong');
            setPage(1);
          }}
        />
        <StatCard
          label="สถานะปกติ"
          value={globalStats.active_count.toLocaleString()}
          unit="คน"
          hint={globalStats.inactive_count > 0 ? `หมดอายุ ${globalStats.inactive_count} คน` : undefined}
          icon={ShieldCheck}
          tone="green"
          active={filterMembershipStatus === 'Active'}
          onClick={() => {
            setFilterMembershipStatus(filterMembershipStatus === 'Active' ? 'all' : 'Active');
            setPage(1);
          }}
        />
      </StatGrid>

      {/* Main Filter & Search Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ค้นหาชื่อ, รหัสสมาชิก, เบอร์โทร, อีเมล, ที่ทำงาน..."
          />
          <ToolbarGroup>
            <FilterSelect
              label="สถานะสมาชิก"
              icon={ShieldCheck}
              value={filterMembershipStatus}
              onChange={(v) => {
                setFilterMembershipStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'ทุกสถานะ' },
                { value: 'Active', label: 'ปกติ' },
                { value: 'Inactive', label: 'หมดอายุ' },
              ]}
            />
            <FilterSelect
              label="ประเภทสมาชิก"
              icon={Crown}
              value={filterMembershipType}
              onChange={(v) => {
                setFilterMembershipType(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'ทุกประเภท' },
                { value: 'Regular', label: 'สมาชิกสามัญ' },
                { value: 'Lifelong', label: 'สมาชิกตลอดชีพ' },
              ]}
            />
            <div className="flex items-center">
              <FilterSelect
                label="จัดเรียง"
                icon={ArrowUpDown}
                value={sortBy}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(v) => setSortBy(v as any)}
                className="[&_select]:rounded-r-none"
                options={[
                  { value: 'member_no', label: 'เรียงตามรหัสสมาชิก' },
                  { value: 'created_at', label: 'เรียงตามวันที่สมัคร' },
                  { value: 'full_name_th', label: 'เรียงตามชื่อ' },
                ]}
              />
              <button
                type="button"
                onClick={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-10 px-3 -ml-px rounded-r-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                title="สลับลำดับ"
              >
                {order === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}
              </button>
            </div>
            {hasActiveFilters && (
              <Btn variant="ghost" icon={X} onClick={handleResetFilters}>
                ล้างตัวกรอง
              </Btn>
            )}
            <IconBtn
              icon={RefreshCw}
              label="รีเฟรชข้อมูล"
              tone="blue"
              onClick={() => fetchMembers(false)}
              disabled={isRefreshing || isLoading}
              className={`w-10 h-10 rounded-xl ${isRefreshing ? '[&_svg]:animate-spin' : ''}`}
            />
          </ToolbarGroup>
        </div>

        {/* Position Filter Chips (Clean horizontal scroll with smooth responsiveness) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-3 border-t border-slate-100 scrollbar-thin">
          <span className="text-[11px] font-extrabold text-slate-500 whitespace-nowrap mr-1 shrink-0">ตำแหน่ง</span>
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
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
          <EmptyState
            icon={Users}
            title="ไม่พบข้อมูลสมาชิก"
            description={
              hasActiveFilters
                ? 'ไม่พบสมาชิกที่ตรงกับคำค้นหาหรือตัวกรอง ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง'
                : 'ยังไม่มีข้อมูลสมาชิกในระบบ เพิ่มสมาชิกใหม่ได้จากปุ่มด้านล่าง'
            }
            action={
              hasActiveFilters ? (
                <Btn variant="primary" icon={X} onClick={handleResetFilters}>
                  ล้างตัวกรองทั้งหมด
                </Btn>
              ) : (
                <Btn variant="primary" icon={PlusCircle} onClick={handleOpenCreate}>
                  เพิ่มสมาชิกใหม่
                </Btn>
              )
            }
          />
        )}

        {/* Table View (Responsive & Non-overflowing Layout) */}
        {!isLoading && !error && members.length > 0 && (
          <div className="overflow-x-auto w-full rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[180px]">สมาชิก</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[120px]">ตำแหน่งและวิชาชีพ</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[130px]">สถานที่ทำงาน</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap min-w-[130px]">ข้อมูลติดต่อ</th>
                  <th className="py-3 px-2 sm:px-3 whitespace-nowrap min-w-[90px]">ประเภทสมาชิก</th>
                  <th className="py-3 px-2 sm:px-3 text-center whitespace-nowrap min-w-[80px]">สถานะ</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap min-w-[120px]">จัดการ</th>
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
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconBtn icon={Eye} label="ดูข้อมูลละเอียด" tone="blue" onClick={() => handleOpenDetail(member)} />
                          <IconBtn icon={Edit3} label="แก้ไขข้อมูล" tone="amber" onClick={() => handleOpenEdit(member)} />
                          <IconBtn icon={Trash2} label="ลบสมาชิก" tone="rose" onClick={() => handleOpenDelete(member)} />
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
                    ตามข้อบังคับ: สมาชิกสามัญที่ขาดประชุม 4 ครั้งล่าสุดติดต่อกันจะถูกปรับเป็นสถานะหมดอายุ
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
                  <span className="text-xs font-bold">กำลังประมวลผลและจำลองผลลัพธ์...</span>
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
                              <span className="text-[10px] text-slate-400 line-through">{statusLabelTh(d.previous_status)}</span>
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
