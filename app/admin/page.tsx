'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AdminNavbar, AdminTab } from '@/components/AdminNavbar';
import { ReceiptData } from '@/types/receipt';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '@/lib/receiptNumber';
import { ReceiptManagementPanel } from '@/components/ReceiptManagementPanel';
import { ReceiptModal } from '@/components/ReceiptModal';
import { MemberManagementPanel } from '@/components/MemberManagementPanel';
import { ToastNotification } from '@/components/ToastNotification';
import { MeetingEditModal } from '@/components/MeetingEditModal';
import { AdminSlipsView } from '@/components/views/AdminSlipsView';
import { AdminLoginView } from '@/components/views/AdminLoginView';
import { AdminCouponsPanel } from '@/components/AdminCouponsPanel';
import { AdminSettingsPanel } from '@/components/AdminSettingsPanel';
import { AdminEmailCenterPanel } from '@/components/AdminEmailCenterPanel';
import AdminSponsorsPanel from '@/components/AdminSponsorsPanel';
import { TsrmLogo } from '@/components/TsrmLogo';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/services/settingsService';

// Extracted Sub-Panels & Types
import {
  MeetingItem,
  SlipItem,
  AttendeeItem,
  MeetingPricingTiers,
  DEFAULT_PRICING_TIERS,
} from '@/components/admin/types';
import { DashboardOverviewPanel } from '@/components/admin/DashboardOverviewPanel';
import { RevenueReportPanel } from '@/components/admin/RevenueReportPanel';
import { AddMeetingPanel } from '@/components/admin/AddMeetingPanel';
import { MeetingHistoryPanel } from '@/components/admin/MeetingHistoryPanel';
import { VerifyAttendeesPanel } from '@/components/admin/VerifyAttendeesPanel';

export type { MeetingItem, SlipItem, AttendeeItem, MeetingPricingTiers };
export { DEFAULT_PRICING_TIERS };

const INITIAL_MEETINGS: MeetingItem[] = [];
const INITIAL_SLIPS: SlipItem[] = [];
const INITIAL_ATTENDEES: AttendeeItem[] = [];
const INITIAL_RECEIPTS: ReceiptData[] = [];

/* ─── MAIN ADMIN ROOT COMPONENT ───────────────────────────────────────────── */

const VALID_ADMIN_TABS: AdminTab[] = [
  'dashboard',
  'revenue-report',
  'members',
  'add-meeting',
  'meeting-history',
  'sponsors',
  'coupons',
  'verify-slip',
  'verify-attendees',
  'receipts',
  'emails',
  'settings',
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedAttendeeMeetingId, setSelectedAttendeeMeetingId] = useState<string>('default');
  const [selectedRevenueMeetingId, setSelectedRevenueMeetingId] = useState<string>('all');
  const [meetings, setMeetings] = useState<MeetingItem[]>(INITIAL_MEETINGS);
  const [slips, setSlips] = useState<SlipItem[]>(INITIAL_SLIPS);
  const [attendees, setAttendees] = useState<AttendeeItem[]>(INITIAL_ATTENDEES);
  const [receipts, setReceipts] = useState<ReceiptData[]>(INITIAL_RECEIPTS);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  const handleTabChange = useCallback((tab: AdminTab, meetingId?: string, replace = false) => {
    if (!VALID_ADMIN_TABS.includes(tab)) return;
    setActiveTab(tab);
    if (meetingId) {
      if (tab === 'verify-attendees') {
        setSelectedAttendeeMeetingId(meetingId);
      } else if (tab === 'revenue-report') {
        setSelectedRevenueMeetingId(meetingId);
      }
    }

    try {
      localStorage.setItem('admin_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (meetingId) {
        url.searchParams.set('meetingId', meetingId);
      } else {
        url.searchParams.delete('meetingId');
      }

      if (replace) {
        window.history.replaceState(null, '', url.toString());
      } else {
        window.history.pushState(null, '', url.toString());
      }
    } catch (err) {
      console.error('Failed to persist active tab:', err);
    }
  }, []);

  const handleNavigateTab = (tab: AdminTab, meetingId?: string) => {
    handleTabChange(tab, meetingId);
  };

  // Restore tab on mount & handle browser Back/Forward (popstate)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') as AdminTab | null;
      const meetingIdParam = searchParams.get('meetingId');
      const savedTab = localStorage.getItem('admin_active_tab') as AdminTab | null;

      const targetTab = (tabParam && VALID_ADMIN_TABS.includes(tabParam))
        ? tabParam
        : (savedTab && VALID_ADMIN_TABS.includes(savedTab) ? savedTab : 'dashboard');

      setActiveTab(targetTab);
      if (meetingIdParam) {
        if (targetTab === 'verify-attendees') {
          setSelectedAttendeeMeetingId(meetingIdParam);
        } else if (targetTab === 'revenue-report') {
          setSelectedRevenueMeetingId(meetingIdParam);
        }
      }

      // Sync URL & localStorage to match current tab cleanly
      localStorage.setItem('admin_active_tab', targetTab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', targetTab);
      if (meetingIdParam) {
        url.searchParams.set('meetingId', meetingIdParam);
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      console.error('Failed to restore active tab from URL or localStorage:', e);
    }

    const handlePopState = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('tab') as AdminTab | null;
        if (tabParam && VALID_ADMIN_TABS.includes(tabParam)) {
          setActiveTab(tabParam);
          const meetingIdParam = searchParams.get('meetingId');
          if (meetingIdParam) {
            if (tabParam === 'verify-attendees') setSelectedAttendeeMeetingId(meetingIdParam);
            if (tabParam === 'revenue-report') setSelectedRevenueMeetingId(meetingIdParam);
          }
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ─── Admin Authentication State ───
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);

  // Check Admin Session on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.authenticated && isMounted) {
            setIsAuthenticated(true);
            setAdminUser(data.user);
          }
        }
      } catch (e) {
        console.error('Failed to verify admin auth:', e);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Failed to logout admin:', e);
    }
    try {
      localStorage.removeItem('admin_active_tab');
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('meetingId');
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Fetch System Settings on mount
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSystemSettings(json.data);
        }
      })
      .catch((err) => console.error('Failed to load system settings in admin page:', err));
  }, []);

  // ─── 1. Fetch meetings from API on mount ───
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/meetings?limit=100&sort_by=meeting_date&order=desc');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const formatRangeFromDates = (start?: string | null, end?: string | null) => {
          if (!start) return '';
          const dStart = new Date(start);
          if (isNaN(dStart.getTime())) return '';
          const yStart = dStart.getUTCFullYear() + 543;
          const mStart = dStart.getUTCMonth();
          const dayStart = dStart.getUTCDate();

          const THAI_MONTHS_FULL = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
          ];

          if (!end) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          }

          const dEnd = new Date(end);
          if (isNaN(dEnd.getTime()) || dStart.toISOString().slice(0, 10) === dEnd.toISOString().slice(0, 10)) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          }

          const yEnd = dEnd.getUTCFullYear() + 543;
          const mEnd = dEnd.getUTCMonth();
          const dayEnd = dEnd.getUTCDate();

          if (yStart === yEnd && mStart === mEnd) {
            return `${dayStart} - ${dayEnd} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          } else if (yStart === yEnd) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yStart}`;
          } else {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yEnd}`;
          }
        };

        const mapped: MeetingItem[] = json.data.map((m: Record<string, unknown>) => ({
          id: m.meeting_id as string,
          titleTh: m.meeting_name as string,
          titleEn: m.meeting_name as string,
          date: (m.pricing_tiers as any)?.dateRange?.formatted
            || formatRangeFromDates((m.start_date || m.meeting_date) as string, m.end_date as string)
            || (m.meeting_date ? new Date(m.meeting_date as string).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : ''),
          time: (m.meeting_time as string) || '08:30 - 17:00 น.',
          location: (m.location as string) || '',
          type: ((m.meeting_type as string) || 'onsite') as 'hybrid' | 'onsite' | 'online',
          staffCode: (m.staff_code as string) || '',
          maxSeats: (m.max_seats as number) || 0,
          basePrice: (m.base_price as number) || 0,
          pricingTiers: m.pricing_tiers as MeetingPricingTiers | undefined,
          activities: (m.activities as any[]) || undefined,
          description: (m.description as string) || '',
          registered: ((m._count as Record<string, number>)?.meeting_attendances) || 0,
          attended: (m.attended_count as number) || 0,
          revenue: (m.approved_revenue as number) || 0,
          status: ((m.status as string) || 'upcoming') as 'upcoming' | 'ongoing' | 'completed',
        }));
        // Sort by status priority (ongoing -> upcoming -> completed) then newest sequence
        const STATUS_PRIORITY: Record<string, number> = { ongoing: 1, upcoming: 2, completed: 3 };
        mapped.sort((a, b) => {
          const pA = STATUS_PRIORITY[a.status] || 99;
          const pB = STATUS_PRIORITY[b.status] || 99;
          if (pA !== pB) return pA - pB;
          const numA = parseInt((a.id.match(/\d+/) || ['0'])[0], 10);
          const numB = parseInt((b.id.match(/\d+/) || ['0'])[0], 10);
          if (numA !== numB) return numB - numA;
          return b.id.localeCompare(a.id);
        });
        setMeetings(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
  }, []);

  // ─── 2. Fetch slips from API ───
  const fetchSlips = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/slips');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped: SlipItem[] = json.data.map((s: any) => ({
          id: s.id,
          refNo: s.refNo,
          nameTh: s.nameTh,
          nameEn: s.nameEn || '',
          email: s.email,
          phone: s.phone,
          memberCode: s.memberNo || undefined,
          workplace: s.workplace,
          ticketType: s.ticketType,
          meetingId: s.meetingId,
          amount: s.amount,
          bank: s.bank,
          transferDate: s.transferDate,
          transferTime: s.transferTime,
          slipUrl: s.slipUrl,
          status: s.status,
          rejectionReason: s.notes,
          selectedActivities: s.selectedActivities || [],
        }));
        setSlips(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch slips:', err);
    }
  }, []);

  // ─── 3. Fetch attendees from real DB API ───
  const fetchAttendees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/attendees');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttendees(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendees:', err);
    }
  }, []);

  // ─── 4. Fetch total members count from DB ───
  const fetchMembersCount = useCallback(async () => {
    try {
      const res = await fetch('/api/members?limit=1');
      const json = await res.json();
      if (json.success) {
        setMembersCount(json.stats?.total || json.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch members count:', err);
    }
  }, []);

  // ─── 4.5 Fetch Receipts from DB ───
  const fetchReceipts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/receipts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReceipts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch receipts from DB:', err);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetchSlips();
    fetchAttendees();
    fetchMembersCount();
    fetchReceipts();
  }, [fetchMeetings, fetchSlips, fetchAttendees, fetchMembersCount, fetchReceipts]);

  // Sync data when switching tabs (e.g. between slip verification and attendee checkin)
  useEffect(() => {
    if (activeTab === 'verify-attendees' || activeTab === 'dashboard') {
      fetchAttendees();
      fetchMeetings();
    } else if (activeTab === 'verify-slip') {
      fetchSlips();
    } else if (activeTab === 'receipts') {
      fetchReceipts();
    }
  }, [activeTab, fetchAttendees, fetchMeetings, fetchSlips, fetchReceipts]);

  // Auto-refresh Dashboard data every 30 seconds when activeTab === 'dashboard'
  useEffect(() => {
    if (activeTab !== 'dashboard' || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchMeetings();
      fetchSlips();
      fetchAttendees();
      fetchMembersCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, isAuthenticated, fetchMeetings, fetchSlips, fetchAttendees, fetchMembersCount]);

  // Global Receipt Modal for quick print from attendees/slips
  const [globalReceipt, setGlobalReceipt] = useState<ReceiptData | null>(null);
  const [isGlobalReceiptOpen, setIsGlobalReceiptOpen] = useState(false);

  // Find current ongoing meeting for global badges
  const currentOngoingMeeting = useMemo(() => {
    return meetings.find((m) => m.status === 'ongoing') || meetings.find((m) => m.status === 'upcoming') || meetings[0];
  }, [meetings]);

  const ongoingAttendees = useMemo(() => {
    if (!currentOngoingMeeting) return attendees;
    return attendees.filter(
      (a) => a.meetingId === currentOngoingMeeting.id || a.meetingTitle === currentOngoingMeeting.titleTh
    );
  }, [attendees, currentOngoingMeeting]);

  const pendingSlipsCount = slips.filter((s) => s.status === 'pending').length;
  const ongoingCheckedInCount = ongoingAttendees.filter((a) => a.checkInStatus === 'checked_in').length;

  const handleToggleCheckIn = async (attendeeId: string) => {
    const targetAttendee = attendees.find((a) => a.id === attendeeId);
    if (!targetAttendee) return;
    const nextStatus = targetAttendee.checkInStatus === 'checked_in' ? 'not_checked_in' : 'checked_in';

    // Optimistic UI update
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

    // Sync to backend DB
    try {
      const res = await fetch('/api/admin/attendees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: attendeeId,
          action: nextStatus === 'checked_in' ? 'checkin' : 'checkout',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMeetings();
      }
    } catch (err) {
      console.error('Failed to update check-in in DB:', err);
    }
  };

  const handleAddAttendee = async (newAttendee: AttendeeItem) => {
    // Optimistic UI update
    setAttendees((prev) => [newAttendee, ...prev]);

    // Persist to real DB
    try {
      const res = await fetch('/api/admin/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: newAttendee.meetingId,
          nameTh: newAttendee.nameTh,
          nameEn: newAttendee.nameEn,
          phone: newAttendee.phone,
          email: newAttendee.email,
          workplace: newAttendee.workplace,
          memberType: newAttendee.memberType,
          ticketType: newAttendee.ticketType,
          paymentStatus: newAttendee.paymentStatus,
          checkInNow: newAttendee.checkInStatus === 'checked_in',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAttendees();
        fetchMeetings();
        fetchSlips();
        setGlobalToastMessage(`บันทึกผู้เข้าร่วม "${newAttendee.nameTh}" ลงฐานข้อมูลเรียบร้อยแล้ว!`);
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save walk-in attendee to DB:', err);
    }
  };

  const handleUpdatePaymentStatus = async (
    attendeeId: string,
    newPaymentStatus: 'paid' | 'pending' | 'rejected',
    reason?: string
  ) => {
    // Optimistic UI update
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendeeId
          ? {
            ...a,
            paymentStatus: newPaymentStatus,
            rejectionReason: newPaymentStatus === 'rejected' ? (reason || 'สลิปถูกปฏิเสธโดยเจ้าหน้าที่') : undefined,
          }
          : a
      )
    );

    try {
      const res = await fetch('/api/admin/attendees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: attendeeId,
          action: 'update_payment_status',
          paymentStatus: newPaymentStatus,
          rejectionReason: reason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAttendees();
        fetchSlips();
        fetchMeetings();
        setGlobalToastMessage(json.data?.message || 'ปรับปรุงสถานะการชำระเงินเรียบร้อยแล้ว');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      } else {
        setGlobalToastMessage(json.error || 'เกิดข้อผิดพลาดในการปรับปรุงสถานะ');
        setTimeout(() => setGlobalToastMessage(null), 4000);
        fetchAttendees();
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      fetchAttendees();
    }
  };

  const handleUpdateMeetingStatus = async (meetingId: string, status: 'upcoming' | 'ongoing' | 'completed') => {
    // Optimistic update
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, status } : m))
    );
    // Sync to API
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchMeetings();
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    // Optimistic update
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    // Sync to API
    try {
      await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      fetchMeetings();
    } catch (err) {
      console.error('Failed to delete meeting:', err);
    }
  };

  const handleMeetingCreated = (newMeeting: MeetingItem) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    fetchMeetings();
  };

  // Receipt Handlers
  const handleSaveReceipt = async (receipt: ReceiptData) => {
    try {
      const res = await fetch('/api/admin/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt),
      });
      const json = await res.json();
      if (json.success && json.data) {
        await fetchReceipts();
        setGlobalToastMessage('บันทึกใบเสร็จรับเงินลงฐานข้อมูลเรียบร้อยแล้ว');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      } else {
        setGlobalToastMessage(json.error || 'ไม่สามารถบันทึกใบเสร็จรับเงินได้');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error saving receipt:', err);
      setGlobalToastMessage('เกิดข้อผิดพลาดในการบันทึกใบเสร็จรับเงิน');
      setTimeout(() => setGlobalToastMessage(null), 4000);
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/receipts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await fetchReceipts();
        setGlobalToastMessage('ลบใบเสร็จรับเงินออกจากฐานข้อมูลเรียบร้อยแล้ว');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      } else {
        setGlobalToastMessage(json.error || 'ไม่สามารถลบใบเสร็จรับเงินได้');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error deleting receipt:', err);
      setGlobalToastMessage('เกิดข้อผิดพลาดในการลบใบเสร็จรับเงิน');
      setTimeout(() => setGlobalToastMessage(null), 4000);
    }
  };

  const handlePrintAttendeeReceipt = (attendee: AttendeeItem) => {
    const isTestAccount = (name?: string, email?: string, memberNo?: string | null, workplace?: string) => {
      const n = (name || '').toLowerCase();
      const e = (email || '').toLowerCase();
      const m = (memberNo || '').trim();
      const w = (workplace || '').toLowerCase();
      return (
        m === '0000' ||
        n.includes('ทดสอบ') ||
        n.includes('test account') ||
        e.includes('test0000') ||
        e.includes('test@') ||
        w.includes('ทดสอบ') ||
        w.includes('test hospital')
      );
    };

    if (isTestAccount(attendee.nameTh, attendee.email, attendee.code, attendee.workplace)) {
      return;
    }

    const existing = receipts.find((r) => r.attendeeId === attendee.id);
    if (existing) {
      setGlobalReceipt(existing);
      setIsGlobalReceiptOpen(true);
      return;
    }

    const m = meetings.find((mtg) => mtg.id === attendee.meetingId || mtg.titleTh === attendee.meetingTitle);

    let amount = 3500;
    if (attendee.ticketType.includes('Non-Member')) amount = 4500;
    if (attendee.ticketType.includes('Workshop')) amount = 5000;
    if (attendee.ticketType.includes('Day')) amount = 2000;

    let maxSeq = DEFAULT_RECEIPT_START_SEQ - 1;
    let maxId = 0;
    receipts.forEach((r) => {
      const match = r.receiptNo?.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
      const numId = parseInt(r.id, 10);
      if (!isNaN(numId) && numId > maxId) maxId = numId;
    });

    const newReceipt: ReceiptData = {
      id: String(maxId + 1),
      receiptNo: generateReceiptNo(new Date(), maxSeq + 1),
      receiptDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
      purposeText: systemSettings.receipt_tpl1_purpose || 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: attendee.nameTh,
      payerAddressLine1: '',
      payerAddressLine2: '',
      payerPhone: '',
      payerTaxId: '',
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: systemSettings.receipt_tpl1_title || 'ค่าลงทะเบียน',
          subDetails: [
            'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 20-22 ตุลาคม 2569',
            m ? `${m.location}` : 'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
            attendee.nameTh || '',
          ].filter(Boolean),
          amount: amount,
        },
      ],
      totalAmount: amount,
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: systemSettings.receipt_authorized_signer || 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: systemSettings.receipt_authorized_role || 'เหรัญญิก / ผู้รับเงิน',
      preparedByName: systemSettings.receipt_prepared_by || 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: systemSettings.receipt_prepared_role || 'ผู้จัดทำ',
      associationNameTh: systemSettings.association_name_th,
      associationNameEn: systemSettings.association_name_en,
      associationAddress: systemSettings.association_address,
      associationContact: systemSettings.association_contact,
      associationTaxId: systemSettings.association_tax_id,
      meetingId: attendee.meetingId,
      attendeeId: attendee.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };

    setReceipts((prev) => [newReceipt, ...prev.filter((r) => r.id !== newReceipt.id)]);
    setGlobalReceipt(newReceipt);
    setIsGlobalReceiptOpen(true);

    fetch('/api/admin/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReceipt),
    })
      .then(() => fetchReceipts())
      .catch((e) => console.warn('Could not persist attendee receipt to DB:', e));
  };

  // Meeting Edit Modal State
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [globalToastMessage, setGlobalToastMessage] = useState<string | null>(null);

  const handleEditMeeting = (m: MeetingItem) => {
    setEditingMeeting(m);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMeeting = (updatedMeeting: MeetingItem) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
    );
    fetchMeetings();
    setGlobalToastMessage(`บันทึกการแก้ไขการประชุม "${updatedMeeting.titleTh}" สำเร็จเรียบร้อยแล้ว!`);
    setTimeout(() => setGlobalToastMessage(null), 5000);
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverviewPanel
            onNavigateTab={handleNavigateTab}
            meetings={meetings}
            slips={slips}
            attendees={attendees}
            onEditMeeting={handleEditMeeting}
          />
        );
      case 'members':
        return <MemberManagementPanel />;
      case 'revenue-report':
        return (
          <RevenueReportPanel
            meetings={meetings}
            slips={slips}
            attendees={attendees}
            initialMeetingId={selectedRevenueMeetingId}
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
        return <AddMeetingPanel onMeetingCreated={handleMeetingCreated} onNavigateTab={handleNavigateTab} />;
      case 'meeting-history':
        return (
          <MeetingHistoryPanel
            meetings={meetings}
            onNavigateTab={handleNavigateTab}
            onUpdateStatus={handleUpdateMeetingStatus}
            onDeleteMeeting={handleDeleteMeeting}
            onEditMeeting={handleEditMeeting}
          />
        );
      case 'verify-slip':
        return <AdminSlipsView />;
      case 'verify-attendees':
        return (
          <VerifyAttendeesPanel
            attendees={attendees}
            meetings={meetings}
            initialMeetingId={selectedAttendeeMeetingId}
            onToggleCheckIn={handleToggleCheckIn}
            onPrintReceipt={handlePrintAttendeeReceipt}
            onAddAttendee={handleAddAttendee}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
          />
        );
      case 'sponsors':
      case 'coupons':
        return (
          <AdminSponsorsPanel
            meetings={meetings}
            initialTab={activeTab === 'coupons' ? 'coupons' : 'sponsors'}
            onNotification={(msg: string) => {
              setGlobalToastMessage(msg);
              setTimeout(() => setGlobalToastMessage(null), 4000);
            }}
          />
        );
      case 'emails':
        return (
          <AdminEmailCenterPanel
            onShowToast={(msg) => {
              setGlobalToastMessage(msg);
              setTimeout(() => setGlobalToastMessage(null), 4000);
            }}
          />
        );
      case 'settings':
        return (
          <AdminSettingsPanel
            onShowToast={(msg) => {
              setGlobalToastMessage(msg);
              setTimeout(() => setGlobalToastMessage(null), 4000);
            }}
          />
        );
      default:
        return null;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 p-2.5 flex items-center justify-center animate-pulse mb-4">
          <TsrmLogo className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping" />
          <span>กำลังตรวจสอบสิทธิ์การเข้าถึงระบบผู้ดูแล...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLoginView
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setAdminUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#0026b3] selection:text-white">
      {/* Global Toast Notification */}
      <ToastNotification message={globalToastMessage} />

      {/* Navigation Sidebar (desktop) & Top bar (mobile) */}
      <AdminNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingSlipsCount={pendingSlipsCount}
        totalAttendeesCount={ongoingAttendees.length}
        checkedInCount={ongoingCheckedInCount}
        receiptsCount={receipts.length}
        membersCount={membersCount}
        onLogout={handleLogout}
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
        onEdit={() => {
          setIsGlobalReceiptOpen(false);
          handleTabChange('receipts');
        }}
      />

      {/* Meeting Edit Modal */}
      <MeetingEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMeeting(null);
        }}
        meeting={editingMeeting}
        onSave={handleSaveEditedMeeting}
      />
    </div>
  );
}
