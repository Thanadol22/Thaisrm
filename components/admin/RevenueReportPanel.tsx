'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MeetingItem, SlipItem, AttendeeItem } from './types';
import {
  DollarSign,
  TrendingUp,
  Users,
  CalendarDays,
  Filter,
  ChevronDown,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Layers,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  X,
  Receipt,
  RotateCcw,
  BadgePercent,
  Check,
  Landmark,
  ClipboardList,
} from 'lucide-react';

/* ─── 2. REVENUE REPORT PANEL ────────────────────────────────────────────── */

export interface RevenueReportProps {
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees?: AttendeeItem[];
  initialMeetingId?: string;
}

export function RevenueReportPanel({ meetings, slips, attendees = [], initialMeetingId }: RevenueReportProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId || 'all');

  useEffect(() => {
    if (initialMeetingId) {
      setSelectedMeetingId(initialMeetingId);
    }
  }, [initialMeetingId]);
  const [filterType, setFilterType] = useState<'all' | 'hybrid' | 'onsite' | 'online'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'programs' | 'rounds' | 'comparison' | 'donut'>('programs');
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | 'approved' | 'pending'>('all');

  // Filtered Meetings based on comprehensive filters (sorted newest first)
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const matchType = filterType === 'all' || m.type === filterType;
        const matchStatus = filterStatus === 'all' || m.status === filterStatus;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          m.titleTh.toLowerCase().includes(q) ||
          m.titleEn.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q);
        return matchType && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        const STATUS_PRIORITY: Record<string, number> = { ongoing: 1, upcoming: 2, completed: 3 };
        const pA = STATUS_PRIORITY[a.status] || 99;
        const pB = STATUS_PRIORITY[b.status] || 99;
        if (pA !== pB) return pA - pB;
        const numA = parseInt((a.id.match(/\d+/) || ['0'])[0], 10);
        const numB = parseInt((b.id.match(/\d+/) || ['0'])[0], 10);
        if (numA !== numB) return numB - numA;
        return b.id.localeCompare(a.id);
      });
  }, [meetings, filterType, filterStatus, searchQuery]);

  const hasActiveFilters =
    selectedMeetingId !== 'all' || filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedMeetingId('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  // Helper to compute effective revenue: strictly approved database revenue
  const getMeetingRevenue = useCallback((m: MeetingItem) => {
    return m.revenue || 0;
  }, []);

  const approvedSlips = useMemo(() => slips.filter((s) => s.status === 'approved'), [slips]);

  // Grand total of approved revenue across all filtered courses/rounds
  const grandTotalRevenue = useMemo(() => {
    return filteredMeetings.reduce((sum, m) => sum + getMeetingRevenue(m), 0);
  }, [filteredMeetings, getMeetingRevenue]);

  // Total count of verified paid transactions (from approved slips)
  const totalPaidCount = useMemo(() => {
    return approvedSlips.length;
  }, [approvedSlips]);

  // Selected Meeting / Round data
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Active revenue to display (real data only)
  const displayRevenue = useMemo(() => {
    if (selectedMeetingId === 'all') return grandTotalRevenue;
    const target = filteredMeetings.find((m) => m.id === selectedMeetingId) || currentMeeting;
    return target ? getMeetingRevenue(target) : 0;
  }, [selectedMeetingId, grandTotalRevenue, filteredMeetings, currentMeeting, getMeetingRevenue]);

  // Verified paid attendees count
  const displayPaidCount = useMemo(() => {
    if (selectedMeetingId === 'all') return totalPaidCount;
    return approvedSlips.filter((s) => s.meetingId === selectedMeetingId).length;
  }, [selectedMeetingId, totalPaidCount, approvedSlips]);

  const avgPerPerson = displayPaidCount > 0 ? Math.round(displayRevenue / displayPaidCount) : 0;

  // Pending slips amount and count
  const pendingAmount = useMemo(() => {
    if (selectedMeetingId === 'all') {
      return slips.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);
    }
    return slips
      .filter((s) => s.status === 'pending' && s.meetingId === selectedMeetingId)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [selectedMeetingId, slips]);

  const pendingCount = useMemo(() => {
    if (selectedMeetingId === 'all') {
      return slips.filter((s) => s.status === 'pending').length;
    }
    return slips.filter((s) => s.status === 'pending' && s.meetingId === selectedMeetingId).length;
  }, [selectedMeetingId, slips]);

  // Total Inflow & Collection Rate
  const totalInflow = displayRevenue + pendingAmount;
  const collectionRate =
    totalInflow > 0 ? Math.round((displayRevenue / totalInflow) * 100) : displayRevenue > 0 ? 100 : 0;

  // Dynamic Breakdown tiers computed strictly from approved slips
  const ticketTiers = useMemo(() => {
    const relevantSlips =
      selectedMeetingId === 'all'
        ? approvedSlips
        : approvedSlips.filter((s) => s.meetingId === selectedMeetingId);

    const tierMap = new Map<string, { count: number; total: number }>();
    relevantSlips.forEach((s) => {
      const type = s.ticketType || (s.memberCode ? 'สมาชิกสมาคม' : 'บุคคลทั่วไป');
      const cur = tierMap.get(type) || { count: 0, total: 0 };
      tierMap.set(type, { count: cur.count + 1, total: cur.total + s.amount });
    });

    if (tierMap.size === 0) {
      return [];
    }

    const COLORS = ['#0026b3', '#16a34a', '#0284c7', '#d97706', '#9333ea', '#e11d48'];
    const BG_CLASSES = [
      'bg-[#0026b3]',
      'bg-emerald-600',
      'bg-sky-600',
      'bg-amber-600',
      'bg-purple-600',
      'bg-rose-600',
    ];

    return Array.from(tierMap.entries()).map(([name, data], idx) => ({
      name,
      price: data.count > 0 ? Math.round(data.total / data.count) : 0,
      count: data.count,
      total: data.total,
      color: COLORS[idx % COLORS.length],
      bgClass: BG_CLASSES[idx % BG_CLASSES.length],
      fill: COLORS[idx % COLORS.length],
    }));
  }, [selectedMeetingId, approvedSlips]);

  const totalTierRevenue = ticketTiers.reduce((s, t) => s + t.total, 0);

  // Dynamic Bank Channels Breakdown computed strictly from approved slips
  const bankBreakdown = useMemo(() => {
    const relevantSlips =
      selectedMeetingId === 'all'
        ? approvedSlips
        : approvedSlips.filter((s) => s.meetingId === selectedMeetingId);

    const bankMap = new Map<string, { amount: number; count: number }>();
    let totalAmt = 0;
    relevantSlips.forEach((s) => {
      const b = s.bank || 'ธนาคารไทยพาณิชย์ (SCB)';
      const cur = bankMap.get(b) || { amount: 0, count: 0 };
      bankMap.set(b, { amount: cur.amount + s.amount, count: cur.count + 1 });
      totalAmt += s.amount;
    });

    if (bankMap.size === 0) {
      return [];
    }

    const BANK_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
      SCB: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', hex: '#7e22ce' },
      KBANK: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', hex: '#166534' },
      BBL: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', hex: '#1d4ed8' },
      KTB: { bg: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-700', hex: '#0369a1' },
      BAY: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', hex: '#92400e' },
      TTB: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', hex: '#4338ca' },
    };

    return Array.from(bankMap.entries()).map(([bank, data]) => {
      const percent = totalAmt > 0 ? Math.round((data.amount / totalAmt) * 100) : 0;
      let styling = { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700', hex: '#475569' };
      for (const [k, s] of Object.entries(BANK_COLORS)) {
        if (bank.toUpperCase().includes(k)) {
          styling = s;
          break;
        }
      }
      return { bank, amount: data.amount, count: data.count, percent, styling };
    });
  }, [selectedMeetingId, approvedSlips]);

  // Helper for Donut SVG circumference calculation
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // ─── Bar Chart Data: Broken down by opened course/program in each round ───
  const courseBarChartData = useMemo(() => {
    return filteredMeetings.map((m) => {
      const meetingSlips = slips.filter((s) => s.meetingId === m.id);
      const approvedMeetingSlips = meetingSlips.filter((s) => s.status === 'approved');
      const pendingMeetingSlips = meetingSlips.filter((s) => s.status === 'pending');

      let approvedMainRev = 0;
      let approvedWorkshopRev = 0;

      approvedMeetingSlips.forEach((s) => {
        const acts =
          Array.isArray(s.selectedActivities) && s.selectedActivities.length > 0 ? s.selectedActivities : null;
        if (acts) {
          acts.forEach((a) => {
            const price = Number(a.price) || 0;
            const type = (a.type || '').toLowerCase();
            const name = (a.name || '').toLowerCase();
            if (
              type === 'workshop' ||
              type === 'ws' ||
              name.includes('workshop') ||
              name.includes('ws') ||
              name.includes('nurse')
            ) {
              approvedWorkshopRev += price;
            } else {
              approvedMainRev += price;
            }
          });
        } else {
          approvedMainRev += s.amount || 0;
        }
      });

      let pendingMainRev = 0;
      let pendingWorkshopRev = 0;

      pendingMeetingSlips.forEach((s) => {
        const acts =
          Array.isArray(s.selectedActivities) && s.selectedActivities.length > 0 ? s.selectedActivities : null;
        if (acts) {
          acts.forEach((a) => {
            const price = Number(a.price) || 0;
            const type = (a.type || '').toLowerCase();
            const name = (a.name || '').toLowerCase();
            if (
              type === 'workshop' ||
              type === 'ws' ||
              name.includes('workshop') ||
              name.includes('ws') ||
              name.includes('nurse')
            ) {
              pendingWorkshopRev += price;
            } else {
              pendingMainRev += price;
            }
          });
        } else {
          pendingMainRev += s.amount || 0;
        }
      });

      const calculatedApproved = approvedMainRev + approvedWorkshopRev;
      const approvedRev = calculatedApproved > 0 ? calculatedApproved : getMeetingRevenue(m);
      const pendingRev = pendingMainRev + pendingWorkshopRev;

      return {
        id: m.id,
        titleTh: m.titleTh,
        titleEn: m.titleEn,
        date: m.date,
        type: m.type,
        status: m.status,
        maxSeats: m.maxSeats,
        registered: m.registered,
        attended: m.attended,
        approvedRevenue: approvedRev,
        approvedMainRevenue: approvedMainRev,
        approvedWorkshopRevenue: approvedWorkshopRev,
        pendingRevenue: pendingRev,
        pendingMainRevenue: pendingMainRev,
        pendingWorkshopRevenue: pendingWorkshopRev,
        totalInflow: approvedRev + pendingRev,
        approvedSlipCount: approvedMeetingSlips.length,
        pendingSlipCount: pendingMeetingSlips.length,
      };
    });
  }, [filteredMeetings, getMeetingRevenue, slips]);

  // Benchmark max revenue for scaling bar heights proportionally
  const maxBarRevenue = useMemo(() => {
    const max = Math.max(...courseBarChartData.map((d) => d.totalInflow), 0);
    return max > 0 ? max : 10000;
  }, [courseBarChartData]);

  // ─── Real Individual Course Programs from Database ───
  const allCoursePrograms = useMemo(() => {
    const list: Array<{
      id: string;
      meetingId: string;
      meetingName: string;
      programName: string;
      programType: 'main' | 'workshop';
      dateText: string;
      approvedRevenue: number;
      pendingRevenue: number;
      totalInflow: number;
      approvedSlipCount: number;
      pendingSlipCount: number;
      maxSeats?: number;
    }> = [];

    const targetMeetings =
      selectedMeetingId === 'all'
        ? filteredMeetings
        : filteredMeetings.filter((m) => m.id === selectedMeetingId);

    targetMeetings.forEach((m) => {
      const meetingSlips = slips.filter((s) => s.meetingId === m.id);
      const approvedMeetingSlips = meetingSlips.filter((s) => s.status === 'approved');
      const pendingMeetingSlips = meetingSlips.filter((s) => s.status === 'pending');

      const mActivities = Array.isArray(m.activities) && m.activities.length > 0 ? m.activities : null;

      if (mActivities) {
        mActivities.forEach((act: any, actIdx: number) => {
          const actName = act.name || `หลักสูตร ${actIdx + 1}`;
          const actType = (act.type || '').toLowerCase() === 'workshop' ? 'workshop' : 'main';

          // Match approved slips
          let approvedRev = 0;
          let approvedCount = 0;
          approvedMeetingSlips.forEach((s) => {
            const sActs = Array.isArray(s.selectedActivities) ? s.selectedActivities : [];
            const matched = sActs.find(
              (sa: any) =>
                sa.id === act.id ||
                (sa.name && act.name && sa.name.trim().toLowerCase() === act.name.trim().toLowerCase()) ||
                (sActs.length === 1 && sa.type && act.type && sa.type.toLowerCase() === act.type.toLowerCase())
            );
            if (matched) {
              approvedRev += Number(matched.price) || 0;
              approvedCount += 1;
            }
          });

          // Match pending slips
          let pendingRev = 0;
          let pendingCount = 0;
          pendingMeetingSlips.forEach((s) => {
            const sActs = Array.isArray(s.selectedActivities) ? s.selectedActivities : [];
            const matched = sActs.find(
              (sa: any) =>
                sa.id === act.id ||
                (sa.name && act.name && sa.name.trim().toLowerCase() === act.name.trim().toLowerCase()) ||
                (sActs.length === 1 && sa.type && act.type && sa.type.toLowerCase() === act.type.toLowerCase())
            );
            if (matched) {
              pendingRev += Number(matched.price) || 0;
              pendingCount += 1;
            }
          });

          list.push({
            id: `${m.id}_${act.id || actName}`,
            meetingId: m.id,
            meetingName: m.titleTh,
            programName: actName,
            programType: actType,
            dateText: act.date || m.date,
            approvedRevenue: approvedRev,
            pendingRevenue: pendingRev,
            totalInflow: approvedRev + pendingRev,
            approvedSlipCount: approvedCount,
            pendingSlipCount: pendingCount,
            maxSeats: act.maxSeats || 0,
          });
        });
      } else {
        let approvedRev = getMeetingRevenue(m);
        let pendingRev = pendingMeetingSlips.reduce((sum, s) => sum + s.amount, 0);

        list.push({
          id: `${m.id}_main`,
          meetingId: m.id,
          meetingName: m.titleTh,
          programName: m.titleTh,
          programType: 'main',
          dateText: m.date,
          approvedRevenue: approvedRev,
          pendingRevenue: pendingRev,
          totalInflow: approvedRev + pendingRev,
          approvedSlipCount: approvedMeetingSlips.length,
          pendingSlipCount: pendingMeetingSlips.length,
          maxSeats: m.maxSeats || 0,
        });
      }
    });

    return list;
  }, [filteredMeetings, selectedMeetingId, slips, getMeetingRevenue]);

  // Benchmark max revenue for individual programs
  const maxProgramRevenue = useMemo(() => {
    const max = Math.max(...allCoursePrograms.map((d) => d.totalInflow), 0);
    return max > 0 ? max : 10000;
  }, [allCoursePrograms]);

  const programsWithRevenueCount = useMemo(() => {
    return allCoursePrograms.filter((d) => d.approvedRevenue > 0).length;
  }, [allCoursePrograms]);

  // Slips to display in the recent transaction audit section
  const scopedRecentSlips = useMemo(() => {
    let filtered = slips;
    if (selectedMeetingId !== 'all') {
      filtered = filtered.filter((s) => s.meetingId === selectedMeetingId);
    }
    if (txFilter === 'approved') {
      filtered = filtered.filter((s) => s.status === 'approved');
    } else if (txFilter === 'pending') {
      filtered = filtered.filter((s) => s.status === 'pending');
    }
    return filtered.slice(0, 8);
  }, [slips, selectedMeetingId, txFilter]);

  const handleExportFinancialExcel = () => {
    const headers = [
      'รหัสโครงการ',
      'ชื่อการประชุม (ไทย)',
      'ชื่อการประชุม (อังกฤษ)',
      'รูปแบบ',
      'วันที่จัดงาน',
      'จำนวนที่นั่งสูงสุด',
      'ผู้ลงทะเบียน (คน)',
      'ผู้เข้าร่วมจริง (คน)',
      'รายได้รวม (บาท)',
      'สถานะ',
    ];
    const rows = filteredMeetings.map((m) => [
      m.id,
      `"${m.titleTh}"`,
      `"${m.titleEn}"`,
      m.type,
      `"${m.date}"`,
      m.maxSeats,
      m.registered,
      m.attended,
      getMeetingRevenue(m),
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
      {/* ─── 1. HEADER & ACTIONS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold">
            <DollarSign className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
            <span className="truncate">รายงานการเงินและรายได้ค่าลงทะเบียน</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            รายงานรายได้จากการลงทะเบียน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            วิเคราะห์รายได้ ยอดชำระเงิน และสถิติทางการเงินทุกหลักสูตรและรอบการประชุม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Active Scope Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 max-w-full">
            <Layers className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-[260px]">
              {selectedMeetingId === 'all'
                ? `รวมทุกรอบ (${filteredMeetings.length} โครงการ)`
                : currentMeeting?.titleTh}
            </span>
          </div>

          <button
            onClick={handleExportFinancialExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">ส่งออกข้อมูล Excel</span>
          </button>
        </div>
      </div>

      {/* ─── 2. 5 CORE FINANCIAL KPI SCORECARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Approved Net Revenue (Hero Card) */}
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 border border-[#0026b3]/30 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#0026b3]/5 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                {selectedMeetingId === 'all' ? 'ยอดรายได้สุทธิรวม' : 'ยอดรายได้รอบนี้'}
              </span>
              <div className="p-2 rounded-xl bg-[#0026b3] text-white shadow-2xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold text-[#0026b3]">฿</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {displayRevenue.toLocaleString()}
              </span>
            </div>
          </div>
          {(() => {
            const curBar =
              selectedMeetingId !== 'all'
                ? courseBarChartData.find((c) => c.id === selectedMeetingId)
                : null;
            if (curBar && (curBar.approvedMainRevenue > 0 || curBar.approvedWorkshopRevenue > 0)) {
              return (
                <div className="flex items-center gap-1.5 text-[10px] font-bold mt-2 pt-2 border-t border-slate-100 flex-wrap">
                  {curBar.approvedMainRevenue > 0 && (
                    <span className="text-[#0026b3] bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                      Main: ฿{curBar.approvedMainRevenue.toLocaleString()}
                    </span>
                  )}
                  {curBar.approvedWorkshopRevenue > 0 && (
                    <span className="text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200 truncate">
                      WS: ฿{curBar.approvedWorkshopRevenue.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100/80 truncate mt-2">
                {selectedMeetingId === 'all' ? `จาก ${meetings.length} รอบการประชุม` : currentMeeting?.id}
              </div>
            );
          })()}
        </div>

        {/* Card 2: Verified Slips */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">สลิปที่อนุมัติแล้ว</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {displayPaidCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">รายการ</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-bold pt-2 border-t border-slate-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>สถานะชำระเงินเรียบร้อย 100%</span>
          </div>
        </div>

        {/* Card 3: Avg per Attendee */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">ค่าเฉลี่ยต่อผู้สมัคร</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-extrabold text-[#0026b3]">฿</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {avgPerPerson.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 font-normal">/ รายการ</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium truncate">
            คำนวณจากยอดสลิปจริงในระบบ
          </div>
        </div>

        {/* Card 4: Pending Inflow */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">ยอดเงินรอตรวจสลิป</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-extrabold text-amber-800">฿</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {pendingAmount.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-amber-800 font-bold pt-2 border-t border-amber-200/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>จำนวน {pendingCount} รายการรอตรวจสอบ</span>
          </div>
        </div>

        {/* Card 5: Collection Rate & Total Inflow */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2 bg-emerald-50/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              อัตราการจัดเก็บสำเร็จ
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <BadgePercent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
              {collectionRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">สำเร็จ</span>
          </div>
          <div className="pt-2 border-t border-emerald-200/60 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex justify-between">
              <span>รวมยอดเข้า:</span>
              <span className="font-bold text-slate-700">฿{totalInflow.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. SMART CONTROL & FILTER BAR ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search, Format Pills, Status Dropdown & Reset */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการประชุม, สถานที่, หรือรหัสโครงการ..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Format Filter (Pills) */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  filterType === 'all' ? 'bg-[#0026b3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทุกรูปแบบ
              </button>
              <button
                type="button"
                onClick={() => setFilterType('hybrid')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
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
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
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
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  filterType === 'online'
                    ? 'bg-[#0026b3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Online
              </button>
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer"
              >
                <option value="all">ทุกสถานะโครงการ</option>
                <option value="ongoing">กำลังจัดงาน / เปิดรับ</option>
                <option value="upcoming">รอเริ่มงาน</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Meeting Round Dropdown Selector */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 w-full min-w-0">
            <label
              htmlFor="revenue-meeting-select"
              className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                <span>เลือกรอบการประชุมเจาะจง:</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                แสดง <span className="text-[#0026b3] font-black">{filteredMeetings.length}</span> จาก {meetings.length}{' '}
                โครงการ
              </span>
            </label>

            <div className="relative">
              <CalendarDays className="w-4 h-4 text-[#0026b3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="revenue-meeting-select"
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer shadow-2xs truncate"
              >
                <option value="all">
                  🌐 รวมทุกรอบที่กรอง — ฿
                  {grandTotalRevenue >= 1000000
                    ? `${(grandTotalRevenue / 1000000).toFixed(2)}M`
                    : grandTotalRevenue.toLocaleString()}
                </option>
                {filteredMeetings.map((m) => {
                  const mRev = getMeetingRevenue(m);
                  return (
                    <option key={m.id} value={m.id}>
                      📅 {m.titleTh} ({m.id}) — ฿
                      {mRev >= 1000000 ? `${(mRev / 1000000).toFixed(2)}M` : mRev.toLocaleString()}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Active Meeting Pill */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto md:self-end md:mb-0.5">
            {selectedMeetingId === 'all' ? (
              <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-200 text-xs font-bold shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>รวมรายได้ทั้งหมด:</span>
                </div>
                <span className="font-black text-xs sm:text-sm bg-white px-2 py-0.5 rounded-lg border border-blue-200 text-[#0026b3]">
                  ฿{grandTotalRevenue.toLocaleString()}
                </span>
              </div>
            ) : (
              (() => {
                const sel = filteredMeetings.find((m) => m.id === selectedMeetingId) || currentMeeting;
                const mRev = sel ? getMeetingRevenue(sel) : 0;
                return (
                  <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {sel?.titleTh || selectedMeetingId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-black text-xs sm:text-sm bg-white px-2 py-0.5 rounded-lg border border-emerald-200 text-emerald-700">
                        ฿{mRev.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingId('all')}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                        title="กลับไปดูภาพรวมทุกรอบ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. MAIN VISUAL ANALYTICS SECTION (Interactive Charts Hub) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs space-y-6">
        {/* Chart Header & View Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                <BarChart3 className="w-5 h-5 text-[#0026b3]" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                กราฟวิเคราะห์รายได้และสถิติเชิงลึก
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {activeChartTab === 'programs' && 'กราฟแท่งแสดงรายได้จริงแยกตามรายชื่อหลักสูตรที่เปิดในฐานข้อมูล'}
              {activeChartTab === 'rounds' && 'กราฟแท่งแยกแท่งคู่เปรียบเทียบ Main vs Workshop แยกตามรอบโครงการ'}
              {activeChartTab === 'comparison' &&
                'กราฟแท่งคู่เปรียบเทียบจำนวนผู้ลงทะเบียน vs ผู้เข้าร่วมงานจริงในแต่ละรอบ'}
              {activeChartTab === 'donut' && 'กราฟวงแหวนสัดส่วนรายได้แยกตามประเภทสมาชิกและบัตร'}
            </p>
          </div>

          {/* Chart Type Toggle Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActiveChartTab('programs')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeChartTab === 'programs'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>รายได้ตามหลักสูตรจริง</span>
            </button>
            <button
              onClick={() => setActiveChartTab('rounds')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeChartTab === 'rounds'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>แยกแท่งคู่ตามรอบ</span>
            </button>
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeChartTab === 'comparison'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>เปรียบเทียบผู้ลงทะเบียน</span>
            </button>
            <button
              onClick={() => setActiveChartTab('donut')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeChartTab === 'donut'
                  ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>สัดส่วนบัตร & ธนาคาร</span>
            </button>
          </div>
        </div>

        {/* ── 1. BAR CHART: REAL INDIVIDUAL COURSE PROGRAMS ── */}
        {activeChartTab === 'programs' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Bar Summary & Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>Main Program (หลักสูตรหลัก)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500 shrink-0 shadow-xs" />
                  <span>Workshop / WS (เวิร์กช็อป)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-amber-400 shrink-0 shadow-xs" />
                  <span>ยอดรอตรวจสลิป</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-xs bg-slate-200 border border-slate-300 shrink-0" />
                  <span>ยังไม่มีข้อมูลรายได้ (฿0)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                  มีรายได้จริง {programsWithRevenueCount} จาก {allCoursePrograms.length} หลักสูตร
                </span>
                {selectedMeetingId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMeetingId('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-200 hover:bg-blue-100 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ดูภาพรวมทุกรอบ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bar Chart Canvas Area */}
            <div className="relative pt-8 pb-6 px-4 sm:px-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div style={{ minWidth: `${Math.max(860, allCoursePrograms.length * 125)}px` }} className="relative">
                  {/* Horizontal Gridlines with Currency Values */}
                  <div className="absolute inset-x-0 top-0 h-64 pointer-events-none flex flex-col justify-between opacity-50 z-0">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                      const val = Math.round(maxProgramRevenue * ratio);
                      return (
                        <div
                          key={idx}
                          className="border-b border-dashed border-slate-200 w-full flex justify-between items-center text-[10px] text-slate-400"
                        >
                          <span>฿{val.toLocaleString()}</span>
                          <span className="opacity-40">{Math.round(ratio * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vertical Individual Bars Grid */}
                  <div
                    className="grid gap-3 sm:gap-4 relative z-10"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(allCoursePrograms.length, 3)}, minmax(115px, 1fr))`,
                    }}
                  >
                    {allCoursePrograms.map((p) => {
                      const isSelected = selectedMeetingId === p.meetingId;
                      const hasRevenue = p.approvedRevenue > 0;
                      const hasPending = p.pendingRevenue > 0;

                      const maxBarHeight = 150;
                      const approvedHeight =
                        maxProgramRevenue > 0 && p.approvedRevenue > 0
                          ? Math.max(12, Math.round((p.approvedRevenue / maxProgramRevenue) * maxBarHeight))
                          : 0;
                      const pendingHeight =
                        maxProgramRevenue > 0 && p.pendingRevenue > 0
                          ? Math.max(10, Math.round((p.pendingRevenue / maxProgramRevenue) * maxBarHeight))
                          : 0;

                      const isMain = p.programType === 'main';

                      return (
                        <div
                          key={p.id}
                          onClick={() =>
                            setSelectedMeetingId(isSelected && selectedMeetingId !== 'all' ? 'all' : p.meetingId)
                          }
                          className={`flex flex-col items-center group cursor-pointer transition-all duration-200 p-2 rounded-xl ${
                            isSelected && selectedMeetingId !== 'all'
                              ? 'bg-blue-50/60 ring-2 ring-[#0026b3] shadow-sm'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* 1. Bar Pillar Area */}
                          <div className="h-64 w-full flex flex-col justify-end items-center pb-1">
                            {/* Value Tag Above Bar */}
                            <div className="mb-2 text-center transition-transform group-hover:-translate-y-0.5 flex flex-col items-center gap-0.5">
                              {hasRevenue ? (
                                <div
                                  className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap border ${
                                    isMain
                                      ? 'text-[#0026b3] bg-blue-50 border-blue-200'
                                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  }`}
                                >
                                  ฿{p.approvedRevenue.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
                                  ฿0
                                </div>
                              )}

                              {hasPending && (
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200 shadow-2xs whitespace-nowrap">
                                  +฿{p.pendingRevenue.toLocaleString()} (รอตรวจ)
                                </div>
                              )}
                            </div>

                            {/* The Separate Bar Pillar */}
                            <div className="w-full max-w-[64px] flex flex-col justify-end items-center relative">
                              {hasRevenue || hasPending ? (
                                <div className="w-full flex flex-col justify-end items-center rounded-t-lg overflow-hidden shadow-xs border border-slate-200/60 transition-all duration-300 group-hover:brightness-105">
                                  {pendingHeight > 0 && (
                                    <div
                                      style={{ height: `${pendingHeight}px` }}
                                      className="w-full bg-gradient-to-t from-amber-400 to-amber-300 border-b border-amber-500/30 transition-all duration-500"
                                      title={`ยอดรอตรวจ: ฿${p.pendingRevenue.toLocaleString()}`}
                                    />
                                  )}
                                  {approvedHeight > 0 && (
                                    <div
                                      style={{ height: `${approvedHeight}px` }}
                                      className={`w-full transition-all duration-500 ${
                                        isMain
                                          ? 'bg-gradient-to-t from-[#0026b3] via-[#1d4ed8] to-[#3b82f6]'
                                          : 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400'
                                      }`}
                                      title={`${p.programName}: ฿${p.approvedRevenue.toLocaleString()}`}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="w-full h-2.5 bg-slate-200 rounded-t-sm border border-slate-300 transition-all group-hover:bg-slate-300"
                                  title="ยังไม่มีข้อมูลรายได้ในหลักสูตรนี้"
                                />
                              )}
                            </div>
                          </div>

                          {/* Horizontal Axis Divider */}
                          <div className="w-full border-t border-slate-200 my-1" />

                          {/* 2. X-Axis Labels Below Bar */}
                          <div className="pt-2 text-center space-y-1.5 w-full">
                            <div className="flex items-center justify-center">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  hasRevenue
                                    ? isMain
                                      ? 'bg-[#0026b3] text-white shadow-2xs'
                                      : 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isMain ? 'Main Program' : 'Workshop (WS)'}
                              </span>
                            </div>

                            <div
                              className={`text-xs font-extrabold line-clamp-2 leading-snug px-0.5 transition ${
                                isSelected ? 'text-[#0026b3]' : 'text-slate-900 group-hover:text-[#0026b3]'
                              }`}
                              title={p.programName}
                            >
                              {p.programName}
                            </div>

                            <div className="text-[10px] font-bold text-slate-500 truncate" title={p.meetingName}>
                              {p.meetingName.split('(')[0]} ({p.meetingId})
                            </div>

                            <div className="text-[10px] text-slate-400 font-medium break-words leading-tight px-1">
                              {p.dateText}
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

        {/* ── 2. BAR CHART: SIDE-BY-SIDE DUAL BARS BY ROUND ── */}
        {activeChartTab === 'rounds' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Bar Summary & Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>Main Program</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500 shrink-0 shadow-xs" />
                  <span>Workshop (WS)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-xs bg-slate-200 border border-slate-300 shrink-0" />
                  <span>ยังไม่มีข้อมูลรายได้ (฿0)</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                แยกแท่งคู่เคียงข้างกันตาม {courseBarChartData.length} รอบโครงการ
              </div>
            </div>

            {/* Side-by-Side Bar Chart Canvas */}
            <div className="relative pt-8 pb-6 px-4 sm:px-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="min-w-[700px] relative">
                  <div className="absolute inset-x-0 top-0 h-64 pointer-events-none flex flex-col justify-between opacity-50 z-0">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                      const val = Math.round(maxBarRevenue * ratio);
                      return (
                        <div
                          key={idx}
                          className="border-b border-dashed border-slate-200 w-full flex justify-between items-center text-[10px] text-slate-400"
                        >
                          <span>฿{val.toLocaleString()}</span>
                          <span className="opacity-40">{Math.round(ratio * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="grid gap-3 sm:gap-4 relative z-10"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(courseBarChartData.length, 3)}, minmax(0, 1fr))`,
                    }}
                  >
                    {courseBarChartData.map((course) => {
                      const isSelected = selectedMeetingId === course.id;
                      const maxBarHeight = 150;
                      const mainH =
                        maxBarRevenue > 0 && course.approvedMainRevenue > 0
                          ? Math.max(12, Math.round((course.approvedMainRevenue / maxBarRevenue) * maxBarHeight))
                          : 0;
                      const wsH =
                        maxBarRevenue > 0 && course.approvedWorkshopRevenue > 0
                          ? Math.max(12, Math.round((course.approvedWorkshopRevenue / maxBarRevenue) * maxBarHeight))
                          : 0;

                      return (
                        <div
                          key={course.id}
                          onClick={() => setSelectedMeetingId(isSelected ? 'all' : course.id)}
                          className={`flex flex-col items-center group cursor-pointer transition-all duration-200 p-2 rounded-xl ${
                            isSelected ? 'bg-blue-50/60 ring-2 ring-[#0026b3] shadow-sm' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="h-64 w-full flex flex-col justify-end items-center pb-1">
                            <div className="mb-2 text-center">
                              {course.approvedRevenue > 0 ? (
                                <div className="text-xs sm:text-sm font-black text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs whitespace-nowrap">
                                  ฿{course.approvedRevenue.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
                                  ฿0
                                </div>
                              )}
                            </div>

                            <div className="flex items-end justify-center gap-1.5 w-full max-w-[80px]">
                              {/* Left Bar: Main Program */}
                              <div className="flex-1 flex flex-col items-center">
                                {mainH > 0 && (
                                  <span className="text-[9px] font-black text-[#0026b3] mb-1">
                                    ฿{(course.approvedMainRevenue / 1000).toFixed(1)}k
                                  </span>
                                )}
                                {mainH > 0 ? (
                                  <div
                                    style={{ height: `${mainH}px` }}
                                    className="w-full bg-gradient-to-t from-[#0026b3] via-[#1d4ed8] to-[#3b82f6] rounded-t-md shadow-xs"
                                    title={`Main Program: ฿${course.approvedMainRevenue.toLocaleString()}`}
                                  />
                                ) : (
                                  <div className="w-full h-2 bg-slate-200 rounded-t-sm" />
                                )}
                              </div>

                              {/* Right Bar: Workshop */}
                              <div className="flex-1 flex flex-col items-center">
                                {wsH > 0 && (
                                  <span className="text-[9px] font-black text-emerald-700 mb-1">
                                    ฿{(course.approvedWorkshopRevenue / 1000).toFixed(1)}k
                                  </span>
                                )}
                                {wsH > 0 ? (
                                  <div
                                    style={{ height: `${wsH}px` }}
                                    className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 rounded-t-md shadow-xs"
                                    title={`Workshop: ฿${course.approvedWorkshopRevenue.toLocaleString()}`}
                                  />
                                ) : (
                                  <div className="w-full h-2 bg-slate-200 rounded-t-sm" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="w-full border-t border-slate-200 my-1" />

                          <div className="pt-2 text-center space-y-1 w-full">
                            <span
                              className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${
                                course.approvedRevenue > 0
                                  ? 'bg-[#0026b3] text-white shadow-2xs'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {course.id}
                            </span>
                            <div className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-snug">
                              {course.titleTh}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {course.date}
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

        {/* ── 3. DUAL BAR CHART: ATTENDEES COMPARISON ── */}
        {activeChartTab === 'comparison' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>จำนวนผู้ลงทะเบียนทั้งหมด</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#4ade80] shrink-0 shadow-xs" />
                  <span>จำนวนผู้เช็คอินเข้าร่วมจริง</span>
                </div>
              </div>

              <div className="text-xs font-bold text-[#0026b3] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                เปรียบเทียบ {filteredMeetings.length} รอบการประชุม
              </div>
            </div>

            <div className="relative pt-8 pb-4 px-4 sm:px-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="min-w-[540px] relative">
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

                  <div
                    className="grid gap-3 sm:gap-6 h-72 items-end pt-6 pb-2 relative z-10"
                    style={{ gridTemplateColumns: `repeat(${Math.max(3, filteredMeetings.length)}, minmax(0, 1fr))` }}
                  >
                    {filteredMeetings.map((m) => {
                      const maxVal = Math.max(
                        ...filteredMeetings.map((x) => Math.max(x.registered, x.attended, 100)),
                        100
                      );
                      const h1 = `${Math.max(12, Math.min(100, Math.round((m.registered / maxVal) * 100)))}%`;
                      const h2 = `${Math.max(8, Math.min(100, Math.round((m.attended / maxVal) * 100)))}%`;

                      return (
                        <div
                          key={m.id}
                          className="flex flex-col items-center h-full justify-end group cursor-pointer"
                          onClick={() => setSelectedMeetingId(m.id)}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mb-2 text-center pointer-events-none transform -translate-y-1 z-20">
                            <div className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                              <div className="text-slate-200 font-extrabold">{m.titleTh}</div>
                              <div className="text-blue-300">ลงทะเบียน: {m.registered.toLocaleString()} คน</div>
                              <div className="text-[#4ade80]">
                                เช็คอินเข้างาน: {m.attended.toLocaleString()} คน (
                                {m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0}%)
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-center w-full max-w-[80px] h-[210px] gap-0 sm:gap-0.5">
                            <div
                              className="w-1/2 bg-[#0026b3] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h1 }}
                              title={`ลงทะเบียน: ${m.registered} คน`}
                            />
                            <div
                              className="w-1/2 bg-[#4ade80] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h2 }}
                              title={`เช็คอินจริง: ${m.attended} คน`}
                            />
                          </div>

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

        {/* ── 4. DONUT & BANK CHANNELS ── */}
        {activeChartTab === 'donut' && (
          <div className="space-y-6 animate-fade-in">
            {ticketTiers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl relative">
                  <svg className="w-56 h-56 transform -rotate-90 drop-shadow-xs" viewBox="0 0 180 180">
                    <circle cx="90" cy="90" r={donutRadius} fill="transparent" stroke="#e2e8f0" strokeWidth="24" />

                    {(() => {
                      let accumulatedDonutPercent = 0;
                      return ticketTiers.map((tier) => {
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
                      });
                    })()}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {selectedMeetingId === 'all' ? 'รวมทุกรอบ' : 'ยอดรอบนี้'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      ฿
                      {totalTierRevenue >= 1000000
                        ? `${(totalTierRevenue / 1000000).toFixed(2)}M`
                        : totalTierRevenue.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 mt-1">
                      {ticketTiers.reduce((s, t) => s + t.count, 0)} ที่นั่ง
                    </span>
                  </div>
                </div>

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
                            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
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
            ) : (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <PieChart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-600">ยังไม่มีข้อมูลรายได้ตามประเภทบัตร</p>
                <p className="text-[11px] text-slate-400">ระบบจะแสดงสัดส่วนเมื่อมีรายการสลิปชำระเงินที่ผ่านการอนุมัติ</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 5. DEEP-DIVE COURSE BREAKDOWN TABLE ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                ตารางสรุปรายได้แยกตามหลักสูตรจริงในฐานข้อมูล
              </h3>
              <p className="text-xs text-slate-500">
                แจกแจงรายได้จริง จำนวนที่นั่ง และสลิปที่อนุมัติแล้วของแต่ละหลักสูตร
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            {allCoursePrograms.length} หลักสูตรย่อย
          </div>
        </div>

        {/* Breakdown Table Grid */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 rounded-l-xl">หลักสูตร / โครงการ</th>
                <th className="py-3 px-3">ประเภท</th>
                <th className="py-3 px-3 text-center">สลิปอนุมัติ</th>
                <th className="py-3 px-3 text-right">ยอดรอตรวจ</th>
                <th className="py-3 px-3 text-right">รายได้อนุมัติ (บาท)</th>
                <th className="py-3 px-3 text-center rounded-r-xl">สัดส่วนรายได้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allCoursePrograms.map((p) => {
                const isMain = p.programType === 'main';
                const pct =
                  grandTotalRevenue > 0 ? Number(((p.approvedRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;

                return (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3.5 px-3.5">
                      <div className="font-extrabold text-slate-900">{p.programName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{p.meetingName}</span>
                        <span>•</span>
                        <span className="text-slate-400">{p.dateText}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          isMain ? 'bg-blue-100 text-[#0026b3]' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isMain ? 'Main Program' : 'Workshop'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-extrabold text-slate-900">{p.approvedSlipCount}</span>
                      <span className="text-xs text-slate-500"> รายการ</span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {p.pendingRevenue > 0 ? (
                        <span className="text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          +฿{p.pendingRevenue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm sm:text-base">
                      ฿{p.approvedRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isMain ? 'bg-[#0026b3]' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 font-black border-t-2 border-[#0026b3]/30">
                <td className="py-3.5 px-3.5 rounded-l-xl text-slate-900">
                  รวมรายได้หลักสูตรทั้งหมด ({allCoursePrograms.length} หลักสูตร)
                </td>
                <td className="py-3.5 px-3 text-xs text-slate-600">ทุกประเภท</td>
                <td className="py-3.5 px-3 text-center text-slate-900">{displayPaidCount} รายการ</td>
                <td className="py-3.5 px-3 text-right text-amber-800 text-xs">
                  {pendingAmount > 0 ? `+฿${pendingAmount.toLocaleString()}` : '-'}
                </td>
                <td className="py-3.5 px-3 text-right text-base sm:text-lg text-[#0026b3]">
                  ฿{grandTotalRevenue.toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-center rounded-r-xl">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4ade80] text-slate-950 text-xs font-black">
                    <Check className="w-3.5 h-3.5" />
                    <span>100% สมบูรณ์</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── 6. SIDE-BY-SIDE FINANCIAL DISTRIBUTION (Bank Channels & Ticket Tiers) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Panel 1: Bank Payment Channels */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Landmark className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                ช่องทางการชำระเงิน
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {bankBreakdown.length} ธนาคาร
            </span>
          </div>

          {bankBreakdown.length > 0 ? (
            <div className="space-y-3">
              {bankBreakdown.map((item) => (
                <div
                  key={item.bank}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.styling.hex }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.bank}</div>
                      <div className="text-[11px] text-slate-500">{item.count} รายการสลิปที่โอนเข้า</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      ฿{item.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-bold text-[#0026b3]">{item.percent}% ของยอดรวม</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <Landmark className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">ยังไม่มีข้อมูลช่องทางธนาคาร</p>
              <p className="text-[11px] text-slate-400">ระบบจะประมวลผลเมื่อมีสลิปที่ได้รับการอนุมัติ</p>
            </div>
          )}
        </div>

        {/* Panel 2: Ticket Tiers & Member Categories */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Tag className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                สัดส่วนประเภทบัตรและสมาชิก
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {ticketTiers.length} ประเภทบัตร
            </span>
          </div>

          {ticketTiers.length > 0 ? (
            <div className="space-y-3">
              {ticketTiers.map((tier) => {
                const percent = totalTierRevenue > 0 ? Math.round((tier.total / totalTierRevenue) * 100) : 0;
                return (
                  <div
                    key={tier.name}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{tier.name}</div>
                        <div className="text-[11px] text-slate-500">
                          ฿{tier.price.toLocaleString()} / ที่นั่ง • {tier.count} ที่นั่ง
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900">
                        ฿{tier.total.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700">{percent}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <Tag className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">ยังไม่มีข้อมูลประเภทบัตร</p>
              <p className="text-[11px] text-slate-400">ระบบจะแสดงสถิติเมื่อมีรายการลงทะเบียน</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 7. RECENT REVENUE TRANSACTIONS LOG ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                รายการสลิปและธุรกรรมรายได้ล่าสุด
              </h3>
              <p className="text-xs text-slate-500">
                ตรวจสอบความถูกต้องของรายการโอนเงินและสลิปที่ส่งเข้ามาในรอบที่เลือก
              </p>
            </div>
          </div>

          {/* Quick Filter: All, Approved, Pending */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                txFilter === 'all' ? 'bg-white text-[#0026b3] shadow-xs font-black' : 'text-slate-600'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTxFilter('approved')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                txFilter === 'approved' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-600'
              }`}
            >
              อนุมัติแล้ว
            </button>
            <button
              onClick={() => setTxFilter('pending')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                txFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-slate-600'
              }`}
            >
              รอตรวจสอบ
            </button>
          </div>
        </div>

        {scopedRecentSlips.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[580px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3.5 rounded-l-xl">ผู้ชำระเงิน / สมาชิก</th>
                  <th className="py-3 px-3">รอบการประชุม / หลักสูตร</th>
                  <th className="py-3 px-3">ธนาคาร & วันที่โอน</th>
                  <th className="py-3 px-3 text-right">ยอดเงิน</th>
                  <th className="py-3 px-3 text-center rounded-r-xl">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {scopedRecentSlips.map((s) => {
                  const m = meetings.find((mtg) => mtg.id === s.meetingId);
                  const isApproved = s.status === 'approved';
                  const isPending = s.status === 'pending';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-3.5">
                        <div className="font-extrabold text-slate-900">{s.nameTh}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {s.memberCode && <span className="text-[#0026b3] font-bold">[{s.memberCode}]</span>}
                          <span>{s.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800 line-clamp-1">{m ? m.titleTh : s.meetingId}</div>
                        <div className="text-[11px] text-slate-500">{s.ticketType}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-700">{s.bank || 'ธนาคารพาณิชย์'}</div>
                        <div className="text-[11px] text-slate-400">
                          {s.transferDate} {s.transferTime ? `• ${s.transferTime}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm sm:text-base">
                        ฿{s.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>อนุมัติแล้ว</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>รอตรวจสอบ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Receipt className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">ไม่มีรายการสลิปในตัวกรองนี้</p>
            <p className="text-[11px] text-slate-400">เลือกรอบการประชุมหรือล้างตัวกรองเพื่อดูรายการทั้งหมด</p>
          </div>
        )}
      </div>
    </div>
  );
}
