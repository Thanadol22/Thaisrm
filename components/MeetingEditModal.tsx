'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Save,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Check,
  PlusCircle,
  Trash2,
  AlertCircle,
  KeyRound,
  Dices,
  Award,
  CircleDot,
  Coins,
  BadgePercent,
  Tag,
  SlidersHorizontal,
  Info,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { ThaiDateRangePicker } from '@/components/ThaiDateRangePicker';
import { ThaiTimeRangePicker } from '@/components/ThaiTimeRangePicker';
import { MeetingPricingTiers, DEFAULT_PRICING_TIERS } from '@/app/admin/page';

export interface MeetingItem {
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
  pricingTiers?: MeetingPricingTiers;
  activities?: ActivityItem[];
  description?: string;
  registered: number;
  attended: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface ActivityItem {
  id: string;
  type: 'main' | 'workshop';
  name: string;
  date: string;
  selectedDays?: string[];
  maxSeats?: number;
  memberPrice?: number;
  nonMemberPrice?: number;
}

interface MeetingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingItem | null;
  onSave: (updatedMeeting: MeetingItem) => void;
}

interface DayChoiceItem {
  id: string;
  label: string;
  value: string;
  dayNum?: number;
  monthYear?: string;
}

// Helper to extract day choices dynamically based on the event date range
function getEventDayChoices(dateRangeStr: string): DayChoiceItem[] {
  if (!dateRangeStr || !dateRangeStr.trim()) return [];
  const trimmed = dateRangeStr.replace(/^วันที่\s*/, '').trim();

  // Pattern 1: Same month range e.g. "15 - 17 กันยายน 2569" or "20 - 23 ตุลาคม พ.ศ. 2569"
  const sameMonthMatch = trimmed.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.+)$/);
  if (sameMonthMatch) {
    const start = parseInt(sameMonthMatch[1], 10);
    const end = parseInt(sameMonthMatch[2], 10);
    const monthYear = sameMonthMatch[3].trim();

    if (start > 0 && end >= start && end - start <= 15) {
      const choices: DayChoiceItem[] = [
        { id: 'all', label: `ทุกวัน (${start}-${end} ${monthYear})`, value: trimmed },
      ];
      for (let d = start; d <= end; d++) {
        choices.push({
          id: `d-${d}`,
          label: `วันที่ ${d}`,
          value: monthYear ? `${d} ${monthYear}` : `วันที่ ${d}`,
          dayNum: d,
          monthYear: monthYear,
        });
      }
      return choices;
    }
  }

  // Pattern 2: Cross month range e.g. "28 ก.ย. - 2 ต.ค. 2569"
  const crossMonthMatch = trimmed.match(/^(\d{1,2})\s+([^\d-]+?)(?:\s+(\d{4}))?\s*[-–—]\s*(\d{1,2})\s+([^\d-]+?)\s+(\d{4})$/);
  if (crossMonthMatch) {
    const d1 = parseInt(crossMonthMatch[1], 10);
    const m1 = crossMonthMatch[2].trim();
    const y1 = crossMonthMatch[3]?.trim() || crossMonthMatch[6].trim();
    const d2 = parseInt(crossMonthMatch[4], 10);
    const m2 = crossMonthMatch[5].trim();
    const y2 = crossMonthMatch[6].trim();

    return [
      { id: 'all', label: `ทุกวัน (${d1} ${m1} - ${d2} ${m2})`, value: trimmed },
      { id: 'd-1', label: `${d1} ${m1}`, value: `${d1} ${m1} ${y1}`, dayNum: d1, monthYear: `${m1} ${y1}` },
      { id: 'd-2', label: `${d2} ${m2}`, value: `${d2} ${m2} ${y2}`, dayNum: d2, monthYear: `${m2} ${y2}` },
    ];
  }

  // Pattern 3: Single date e.g. "15 กันยายน 2569"
  const singleMatch = trimmed.match(/^(\d{1,2})\s*(.*)$/);
  if (singleMatch) {
    const d = parseInt(singleMatch[1], 10);
    const my = singleMatch[2]?.trim() || '';
    return [
      {
        id: `d-${d}`,
        label: `วันที่ ${d}`,
        value: trimmed,
        dayNum: d,
        monthYear: my,
      },
    ];
  }

  return [
    {
      id: 'custom',
      label: trimmed,
      value: trimmed,
    },
  ];
}

export function MeetingEditModal({
  isOpen,
  onClose,
  meeting,
  onSave,
}: MeetingEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'programs' | 'pricing'>('info');

  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const createEmptyActivity = (type: 'main' | 'workshop'): ActivityItem => ({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: '',
    date: '',
    selectedDays: [],
    maxSeats: type === 'workshop' ? 50 : 0,
    memberPrice: type === 'workshop' ? 0 : undefined,
    nonMemberPrice: type === 'workshop' ? 0 : undefined,
  });

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '08:30 - 17:00 น.',
    location: '',
    type: 'onsite' as 'onsite' | 'online' | 'hybrid',
    staffCode: '',
    basePrice: 0,
    maxSeats: 500,
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed',
    description: '',
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pricing, setPricing] = useState<MeetingPricingTiers>(DEFAULT_PRICING_TIERS);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize form data when meeting changes or modal opens
  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.titleTh || meeting.titleEn || '',
        date: meeting.date || '',
        time: meeting.time || '08:30 - 17:00 น.',
        location: meeting.location || '',
        type: meeting.type || 'onsite',
        staffCode: meeting.staffCode || generateRandomPin(),
        basePrice: meeting.basePrice || 0,
        maxSeats: meeting.maxSeats || 500,
        status: meeting.status || 'upcoming',
        description: meeting.description || '',
      });

      // Parse activities if available
      if (meeting.activities && Array.isArray(meeting.activities) && meeting.activities.length > 0) {
        setActivities(meeting.activities);
      } else {
        setActivities([
          {
            id: `act-main-${Date.now()}`,
            type: 'main',
            name: meeting.titleTh || 'Main Scientific Program',
            date: meeting.date || '',
            selectedDays: [],
            maxSeats: 0,
          },
        ]);
      }

      // Parse pricing tiers
      if (meeting.pricingTiers && typeof meeting.pricingTiers === 'object') {
        setPricing({
          ...DEFAULT_PRICING_TIERS,
          ...meeting.pricingTiers,
          participant: {
            ...DEFAULT_PRICING_TIERS.participant,
            ...(meeting.pricingTiers.participant || {}),
          },
          changeFee: {
            ...DEFAULT_PRICING_TIERS.changeFee,
            ...(meeting.pricingTiers.changeFee || {}),
          },
        });
      } else {
        setPricing({
          ...DEFAULT_PRICING_TIERS,
          participant: {
            onsiteMember: meeting.basePrice || 0,
            onsiteNonMember: (meeting.basePrice || 0) + 1000,
            onlineMember: meeting.basePrice ? Math.max(0, meeting.basePrice - 1000) : 0,
          },
        });
      }
    }
  }, [meeting, isOpen]);

  const dayChoices = useMemo(() => getEventDayChoices(formData.date), [formData.date]);

  // Activity Handlers
  const handleAddActivity = (type: 'main' | 'workshop') => {
    setActivities((prev) => [...prev, createEmptyActivity(type)]);
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateActivity = (id: string, field: keyof ActivityItem, value: string | number) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleToggleActivityDay = (activityId: string, choiceId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;

        const individualChoices = dayChoices.filter((c) => c.id !== 'all');
        const individualIds = individualChoices.map((c) => c.id);

        let currentSelected = act.selectedDays || [];
        if (currentSelected.length === 0 && act.date) {
          const matchSingle = individualChoices.find((c) => c.value === act.date);
          if (matchSingle) {
            currentSelected = [matchSingle.id];
          } else if (act.date === formData.date) {
            currentSelected = [...individualIds];
          }
        }

        let nextSelected: string[] = [];

        if (choiceId === 'all') {
          const isAllSelected = individualIds.length > 0 && individualIds.every((id) => currentSelected.includes(id));
          if (isAllSelected) {
            nextSelected = [];
          } else {
            nextSelected = [...individualIds];
          }
        } else {
          if (currentSelected.includes(choiceId)) {
            nextSelected = currentSelected.filter((id) => id !== choiceId);
          } else {
            nextSelected = [...currentSelected, choiceId];
          }
        }

        nextSelected.sort((a, b) => {
          const idxA = individualChoices.findIndex((c) => c.id === a);
          const idxB = individualChoices.findIndex((c) => c.id === b);
          return idxA - idxB;
        });

        let formattedDate = '';
        if (nextSelected.length === 0) {
          formattedDate = '';
        } else if (individualIds.length > 0 && nextSelected.length === individualIds.length) {
          formattedDate = formData.date;
        } else {
          const selectedChoices = individualChoices.filter((c) => nextSelected.includes(c.id));
          const dayNums = selectedChoices.map((c) => c.dayNum).filter((n): n is number => typeof n === 'number');
          const monthYears = Array.from(new Set(selectedChoices.map((c) => c.monthYear).filter(Boolean)));

          if (dayNums.length === selectedChoices.length && monthYears.length === 1 && monthYears[0]) {
            formattedDate = `วันที่ ${dayNums.join(', ')} ${monthYears[0]}`;
          } else {
            formattedDate = selectedChoices.map((c) => c.value).join(', ');
          }
        }

        return {
          ...act,
          selectedDays: nextSelected,
          date: formattedDate,
        };
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;

    if (!formData.title.trim()) {
      alert('กรุณากรอกชื่อการประชุม');
      return;
    }

    if (!formData.date.trim()) {
      alert('กรุณาเลือกวันที่จัดงาน');
      return;
    }

    setIsSubmitting(true);

    try {
      const wsSeats = activities
        .filter((a) => a.type === 'workshop')
        .reduce((sum, a) => sum + (a.maxSeats || 0), 0);

      const payload = {
        meeting_name: formData.title.trim(),
        meeting_date: formData.date.trim(),
        meeting_time: formData.time.trim() || '08:30 - 17:00 น.',
        location: formData.location.trim() || null,
        meeting_type: formData.type,
        staff_code: formData.staffCode.trim() || null,
        description: formData.description.trim() || null,
        base_price: pricing.participant.onsiteMember || formData.basePrice || 0,
        pricing_tiers: pricing,
        activities: activities,
        max_seats: wsSeats > 0 ? wsSeats : formData.maxSeats || 500,
        status: formData.status,
      };

      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
        return;
      }

      const updatedMeeting: MeetingItem = {
        ...meeting,
        titleTh: formData.title.trim(),
        titleEn: formData.title.trim(),
        date: formData.date.trim(),
        time: formData.time.trim() || '08:30 - 17:00 น.',
        location: formData.location.trim(),
        type: formData.type,
        staffCode: formData.staffCode.trim(),
        basePrice: pricing.participant.onsiteMember || formData.basePrice || 0,
        pricingTiers: pricing,
        activities: activities,
        maxSeats: wsSeats > 0 ? wsSeats : formData.maxSeats || 500,
        status: formData.status,
        description: formData.description.trim(),
      };

      onSave(updatedMeeting);
      onClose();
    } catch (err) {
      console.error('Failed to update meeting:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted || !meeting) return null;

  const mainCount = activities.filter((a) => a.type === 'main').length;
  const workshopCount = activities.filter((a) => a.type === 'workshop').length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up my-auto">
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-slate-50 to-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#0026b3] text-white shadow-md shadow-blue-900/20 shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-[#4ade80]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-[#0026b3] bg-blue-100/70 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {meeting.id}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  แก้ไขข้อมูลการประชุม
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate mt-0.5">
                {formData.title || meeting.titleTh || 'แก้ไขกำหนดการประชุม'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-5 sm:px-7 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>1. ข้อมูลทั่วไป & กำหนดการ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('programs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'programs'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>2. หลักสูตร / เวิร์กช็อป ({activities.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>3. อัตราค่าลงทะเบียน</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ─── TAB 1: ข้อมูลทั่วไป ─── */}
          {activeTab === 'info' && (
            <div className="space-y-5 animate-fade-in">
              {/* Row: Meeting ID & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">รหัสการประชุม (Meeting ID)</label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span>{meeting.id}</span>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto">(Primary Key)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">สถานะการประชุม *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer"
                  >
                    <option value="upcoming">รอเริ่มงาน (Upcoming)</option>
                    <option value="ongoing">กำลังดำเนินการ / จัดงานอยู่ (Ongoing)</option>
                    <option value="completed">เสร็จสิ้นแล้ว (Completed)</option>
                  </select>
                </div>
              </div>

              {/* Meeting Title */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  ชื่อโครงการประชุม (Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="เช่น 34th Annual Meeting of the Thai Society for Reproductive Medicine"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                />
              </div>

              {/* Date and Time Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span>วันที่จัดงาน (ช่วงวันที่) <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] text-slate-400 font-normal">ปฏิทินไทย พ.ศ.</span>
                  </label>
                  <ThaiDateRangePicker
                    value={formData.date}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    placeholder="เลือกช่วงวันที่จัดงาน"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span>เวลาจัดงาน</span>
                    <span className="text-[11px] text-slate-400 font-normal">เช่น 08:30 - 17:00 น.</span>
                  </label>
                  <ThaiTimeRangePicker
                    value={formData.time}
                    onChange={(val) => setFormData({ ...formData, time: val })}
                    placeholder="เลือกช่วงเวลา"
                  />
                </div>
              </div>

              {/* Event Format Selection (Onsite / Online / Hybrid) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700">รูปแบบการจัดงาน</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    const isOnsite = formData.type === 'onsite' || formData.type === 'hybrid';
                    const isOnline = formData.type === 'online' || formData.type === 'hybrid';
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOnsite) {
                              if (isOnline) setFormData({ ...formData, type: 'online' });
                            } else {
                              setFormData({ ...formData, type: isOnline ? 'hybrid' : 'onsite' });
                            }
                          }}
                          className={`relative flex items-center justify-between p-3.5 rounded-xl transition border-2 text-left cursor-pointer ${
                            isOnsite
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOnsite ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-900">Onsite (ที่งาน)</div>
                              <div className="text-[11px] text-slate-500">เข้าร่วม ณ สถานที่จัดงานจริง</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isOnsite ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                            {isOnsite && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOnline) {
                              if (isOnsite) setFormData({ ...formData, type: 'onsite' });
                            } else {
                              setFormData({ ...formData, type: isOnsite ? 'hybrid' : 'online' });
                            }
                          }}
                          className={`relative flex items-center justify-between p-3.5 rounded-xl transition border-2 text-left cursor-pointer ${
                            isOnline
                              ? 'bg-blue-50 text-[#0026b3] border-[#0026b3]/50 ring-2 ring-blue-200 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOnline ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <ExternalLink className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-900">Online (ออนไลน์)</div>
                              <div className="text-[11px] text-slate-500">รับชมผ่าน Zoom / Live</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isOnline ? 'bg-[#0026b3] border-[#0026b3] text-white' : 'border-slate-300 bg-white'}`}>
                            {isOnline && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Location Venue */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">สถานที่จัดงาน / ลิงก์ระบบ Zoom</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="เช่น Grande Centre Point LUMPHINI Bangkok ,THAILAND"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                />
              </div>

              {/* Staff PIN Code */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>รหัสเจ้าหน้าที่ประจำจุดลงทะเบียน (Staff PIN 6 หลัก)</span>
                  </label>
                  <span className="text-[11px] text-amber-800 font-medium">สำหรับสตาฟใช้สแกน QR หน้างาน</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.staffCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, staffCode: val });
                    }}
                    placeholder="000000"
                    className="w-36 bg-white border border-amber-300 rounded-xl px-3 py-2 text-center text-lg font-mono font-extrabold tracking-[0.35em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, staffCode: generateRandomPin() })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Dices className="w-3.5 h-3.5 text-white" />
                    <span>สุ่มรหัสใหม่</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: หลักสูตร / เวิร์กช็อป ─── */}
          {activeTab === 'programs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0026b3]" />
                    หลักสูตรและเวิร์กช็อปที่จะเปิด
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดวันที่จัดกิจกรรมและจำนวนที่นั่งสำหรับแต่ละกิจกรรม
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Main {mainCount}
                  </span>
                  <span className="bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-md">
                    Workshop {workshopCount}
                  </span>
                </div>
              </div>

              {/* Activity List */}
              <div className="space-y-3">
                {activities.map((activity, index) => {
                  const isMain = activity.type === 'main';
                  const individualChoices = dayChoices.filter((c) => c.id !== 'all');
                  const individualIds = individualChoices.map((c) => c.id);
                  const selectedList = activity.selectedDays && activity.selectedDays.length > 0
                    ? activity.selectedDays
                    : (activity.date === formData.date ? individualIds : (individualChoices.filter(c => c.value === activity.date).map(c => c.id)));

                  const isAllSelected = individualIds.length > 0 && individualIds.every((id) => selectedList.includes(id));

                  return (
                    <div
                      key={activity.id}
                      className={`border rounded-xl overflow-hidden bg-white shadow-2xs transition ${
                        isMain ? 'border-indigo-200' : 'border-violet-200'
                      }`}
                    >
                      {/* Card Header */}
                      <div className={`px-3.5 py-2 flex items-center justify-between gap-2 border-b ${
                        isMain ? 'bg-indigo-50/70 border-indigo-100' : 'bg-violet-50/70 border-violet-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                            isMain ? 'bg-indigo-600' : 'bg-violet-600'
                          }`}>
                            {isMain ? '📋 Main Program' : '🔬 Workshop'} #{index + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {activity.name || '(ยังไม่ได้ระบุชื่อ)'}
                          </span>
                        </div>
                        {activities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveActivity(activity.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">ชื่อหัวข้อ / หลักสูตร *</label>
                          <input
                            type="text"
                            value={activity.name}
                            onChange={(e) => handleUpdateActivity(activity.id, 'name', e.target.value)}
                            placeholder={isMain ? 'เช่น Main Scientific Program' : 'เช่น Embryologist Hands-on Workshop'}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
                          />
                        </div>

                        {/* Date selection pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">วันที่จัดกิจกรรม *</label>
                            {activity.date ? (
                              <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                {activity.date}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">ยังไม่ได้เลือกวัน</span>
                            )}
                          </div>

                          {dayChoices.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {dayChoices.map((choice) => {
                                const isChoiceSelected = choice.id === 'all' ? isAllSelected : selectedList.includes(choice.id);
                                return (
                                  <button
                                    key={choice.id}
                                    type="button"
                                    onClick={() => handleToggleActivityDay(activity.id, choice.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                                      isChoiceSelected
                                        ? 'bg-[#0026b3] text-white border-[#0026b3] shadow-xs'
                                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    <span>{choice.label}</span>
                                    {isChoiceSelected && <Check className="w-3 h-3 text-[#4ade80]" />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                              กรุณาระบุวันที่จัดงานในแท็บข้อมูลทั่วไปก่อน
                            </div>
                          )}
                        </div>

                        {/* Workshop specific: Seats & Pricing */}
                        {!isMain && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">จำนวนที่นั่ง (คน)</label>
                              <input
                                type="number"
                                min={1}
                                value={activity.maxSeats || ''}
                                onChange={(e) => handleUpdateActivity(activity.id, 'maxSeats', parseInt(e.target.value) || 0)}
                                placeholder="เช่น 50"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">ราคา Member (บาท)</label>
                              <input
                                type="number"
                                min={0}
                                value={activity.memberPrice !== undefined ? activity.memberPrice : ''}
                                onChange={(e) => handleUpdateActivity(activity.id, 'memberPrice', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 font-bold text-[#0026b3]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">ราคา Non-Member (บาท)</label>
                              <input
                                type="number"
                                min={0}
                                value={activity.nonMemberPrice !== undefined ? activity.nonMemberPrice : ''}
                                onChange={(e) => handleUpdateActivity(activity.id, 'nonMemberPrice', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Activity Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddActivity('main')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <span>+ เพิ่ม Main Program</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddActivity('workshop')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 hover:bg-violet-100/60 text-violet-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-violet-600" />
                  <span>+ เพิ่ม Workshop</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 3: อัตราค่าลงทะเบียน ─── */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#0026b3]" />
                    อัตราค่าลงทะเบียนและการเปลี่ยนประเภท (Pricing Matrix)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดอัตราค่าลงทะเบียนหลักตามสิทธิ์สมาชิก
                  </p>
                </div>
              </div>

              {/* Participant Pricing Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-[#0026b3]">Onsite - สมาชิก (Member)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                    <input
                      type="number"
                      min={0}
                      value={pricing.participant.onsiteMember || ''}
                      onChange={(e) =>
                        setPricing({
                          ...pricing,
                          participant: {
                            ...pricing.participant,
                            onsiteMember: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-white border border-blue-300 rounded-lg pl-7 pr-3 py-2 text-sm font-extrabold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Onsite - บุคคลทั่วไป (Non-Member)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                    <input
                      type="number"
                      min={0}
                      value={pricing.participant.onsiteNonMember || ''}
                      onChange={(e) =>
                        setPricing({
                          ...pricing,
                          participant: {
                            ...pricing.participant,
                            onsiteNonMember: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-indigo-700">Online - สมาชิก (Online Pass)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                    <input
                      type="number"
                      min={0}
                      value={pricing.participant.onlineMember || ''}
                      onChange={(e) =>
                        setPricing({
                          ...pricing,
                          participant: {
                            ...pricing.participant,
                            onlineMember: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-white border border-indigo-300 rounded-lg pl-7 pr-3 py-2 text-sm font-extrabold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700">หมายเหตุ / คำอธิบายเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={pricing.remark || formData.description || ''}
                  onChange={(e) => {
                    setPricing({ ...pricing, remark: e.target.value });
                    setFormData({ ...formData, description: e.target.value });
                  }}
                  placeholder="ระบุหมายเหตุ เช่น รวมค่าอาหารกลางวันและเบรก หรือเงื่อนไขการออกใบเสร็จ"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs sm:text-sm font-black shadow-md shadow-blue-900/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#4ade80]" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#4ade80]" />
                    <span>บันทึกการแก้ไข</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
