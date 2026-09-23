'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MeetingPricingTiers, DEFAULT_PRICING_TIERS, MeetingItem } from './types';
import { AdminTab } from '@/components/AdminNavbar';
import { ThaiDateRangePicker } from '@/components/ThaiDateRangePicker';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { ThaiTimeRangePicker } from '@/components/ThaiTimeRangePicker';
import { ToastNotification } from '@/components/ToastNotification';
import {
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  X,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  Layers,
  ExternalLink,
  Check,
  KeyRound,
  Dices,
  Award,
  CircleDot,
  Trash2,
  Monitor,
  Coins,
  SlidersHorizontal,
  Info,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

// --- Helper to parse event date range into selectable day choices ---
interface EventDayChoice {
  id: string;
  label: string;
  value: string;
  dayNum?: number;
  monthYear?: string;
}

function getEventDayChoices(dateStr: string): EventDayChoice[] {
  if (!dateStr || !dateStr.trim()) return [];
  const trimmed = dateStr.trim();

  // Pattern 1: Same month range e.g. "25-28 ก.ย. 2569" or "25 - 28 กันยายน 2569"
  const sameMonthMatch = trimmed.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.*)$/);
  if (sameMonthMatch) {
    const start = parseInt(sameMonthMatch[1], 10);
    const end = parseInt(sameMonthMatch[2], 10);
    const monthYear = sameMonthMatch[3]?.trim() || '';

    if (start && end && start <= end && end - start <= 30) {
      const choices: EventDayChoice[] = [
        {
          id: 'all',
          label: `ทุกวัน (${start}-${end})`,
          value: trimmed,
        },
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

  // Pattern 2: Cross month range e.g. "28 ก.ย. - 2 ต.ค. 2569" or "28 ก.ย. 2569 - 2 ต.ค. 2569"
  const crossMonthMatch = trimmed.match(
    /^(\d{1,2})\s+([^\d-]+?)(?:\s+(\d{4}))?\s*[-–—]\s*(\d{1,2})\s+([^\d-]+?)\s+(\d{4})$/
  );
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

  // Pattern 3: Single date e.g. "25 ก.ย. 2569"
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

export interface AddMeetingPanelProps {
  onMeetingCreated?: (m: MeetingItem) => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

export function AddMeetingPanel({ onMeetingCreated, onNavigateTab }: AddMeetingPanelProps) {
  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  // --- Activity / Program Item Type ---
  interface ActivityItem {
    id: string;
    type: 'main' | 'workshop';
    name: string;
    date: string;
    selectedDays?: string[];
    format?: 'onsite' | 'online' | 'both';
    maxSeats?: number;
    memberPrice?: number;
    nonMemberPrice?: number;
  }

  const createEmptyActivity = (type: 'main' | 'workshop'): ActivityItem => ({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: '',
    date: '',
    selectedDays: [],
    format: type === 'workshop' ? 'onsite' : 'both',
    maxSeats: type === 'workshop' ? 50 : 0,
    memberPrice: type === 'workshop' ? 0 : undefined,
    nonMemberPrice: type === 'workshop' ? 0 : undefined,
  });

  const [formData, setFormData] = useState({
    meetingId: '',
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'onsite' as 'onsite' | 'online' | 'hybrid',
    staffCode: generateRandomPin(),
    basePrice: 0,
    description: '',
  });

  // Fetch next suggested TSRM ID on mount
  useEffect(() => {
    fetch('/api/meetings?action=next_id')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.nextMeetingId) {
          setFormData((prev) => ({
            ...prev,
            meetingId: prev.meetingId || data.nextMeetingId,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [activities, setActivities] = useState<ActivityItem[]>([createEmptyActivity('main')]);

  const [pricing, setPricing] = useState<MeetingPricingTiers>(DEFAULT_PRICING_TIERS);

  const [isSaved, setIsSaved] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedMeetingDetails, setSavedMeetingDetails] = useState<{
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    type: string;
    staffCode: string;
    maxSeats: number;
    mainCount: number;
    workshopCount: number;
    basePrice: number;
  } | null>(null);

  // Extract day choices dynamically based on the event date range
  const dayChoices = useMemo(() => getEventDayChoices(formData.date), [formData.date]);

  // --- Activity Handlers ---
  const handleAddActivity = (type: 'main' | 'workshop') => {
    setActivities((prev) => [...prev, createEmptyActivity(type)]);
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateActivity = (id: string, field: keyof ActivityItem, value: string | number) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
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

        // Sort by choice order
        nextSelected.sort((a, b) => {
          const idxA = individualChoices.findIndex((c) => c.id === a);
          const idxB = individualChoices.findIndex((c) => c.id === b);
          return idxA - idxB;
        });

        // Compute summary date text
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

  const handleResetForm = () => {
    fetch('/api/meetings?action=next_id')
      .then((r) => r.json())
      .then((data) => {
        setFormData({
          meetingId: data.nextMeetingId || 'TSRM35',
          title: '',
          date: '',
          time: '',
          location: '',
          type: 'onsite',
          staffCode: generateRandomPin(),
          basePrice: 0,
          description: '',
        });
      })
      .catch(() => {
        setFormData({
          meetingId: 'TSRM35',
          title: '',
          date: '',
          time: '',
          location: '',
          type: 'onsite',
          staffCode: generateRandomPin(),
          basePrice: 0,
          description: '',
        });
      });
    setActivities([createEmptyActivity('main')]);
    setPricing(DEFAULT_PRICING_TIERS);
    setIsSaved(false);
    setShowSuccessModal(false);
    setSavedMeetingDetails(null);
  };

  const handleLoadDefaultPricing = () => {
    setPricing(DEFAULT_PRICING_TIERS);
    setActivities((prev) =>
      prev.map((act, idx) => {
        if (act.type === 'workshop') {
          return {
            ...act,
            memberPrice: act.memberPrice || (idx === 0 ? 2500 : 3000),
            nonMemberPrice: act.nonMemberPrice || (idx === 0 ? 3500 : 4000),
          };
        }
        return act;
      })
    );
  };

  const handleClearPricing = () => {
    setPricing({
      programName: '',
      participant: {
        onsiteMember: 0,
        onsiteNonMember: 0,
        onlineMember: 0,
      },
      changeFee: {
        label: '',
        conditionDate: '',
        onsiteMember: 0,
        onsiteNonMember: 0,
        onlineMember: 0,
      },
      remark: '',
    });
    setActivities((prev) =>
      prev.map((act) => (act.type === 'workshop' ? { ...act, memberPrice: 0, nonMemberPrice: 0 } : act))
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      alert('กรุณากรอกชื่อการประชุมและระบุวันที่จัดงาน');
      return;
    }

    if (formData.staffCode && formData.staffCode.trim().length !== 6) {
      alert('รหัส Staff PIN ต้องเป็นตัวเลข 6 หลัก (เช่น 810773) หรือลบให้ว่างหากยังไม่ต้องการตั้ง');
      return;
    }

    setIsSubmitting(true);

    // Format meeting ID: Ensure it follows TSRM<sequence>
    let meetingId = formData.meetingId.trim();
    if (!meetingId) {
      meetingId = 'TSRM35';
    } else if (/^\d+$/.test(meetingId)) {
      meetingId = `TSRM${meetingId}`;
    } else if (/^tsrm\s*(\d+)$/i.test(meetingId)) {
      const mMatch = meetingId.match(/^tsrm\s*(\d+)$/i);
      meetingId = mMatch ? `TSRM${mMatch[1]}` : meetingId.toUpperCase();
    } else {
      meetingId = meetingId.toUpperCase();
    }

    const wsSeats = activities.filter((a) => a.type === 'workshop').reduce((sum, a) => sum + (a.maxSeats || 0), 0);

    try {
      // Call API to save to database
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          meeting_name: formData.title,
          meeting_date: formData.date,
          meeting_time: formData.time || '08:30 - 17:00 น.',
          location: formData.location || '',
          meeting_type: formData.type,
          staff_code: formData.staffCode || '',
          description: formData.description || '',
          base_price: pricing.participant.onsiteMember || formData.basePrice,
          change_format_fee: pricing.changeFee?.onsiteMember ?? 1000,
          change_format_policy: pricing.changeFee?.policyText || null,
          pricing_tiers: pricing,
          activities: activities,
          max_seats: wsSeats || 500,
          status: 'upcoming',
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
        return;
      }

      // Create the MeetingItem for frontend state
      const newMeeting: MeetingItem = {
        id: meetingId,
        titleTh: formData.title,
        titleEn: formData.title,
        date: formData.date,
        time: formData.time || '08:30 - 17:00 น.',
        location: formData.location || 'ศูนย์ประชุมสมาคม',
        type: formData.type,
        staffCode: formData.staffCode || '',
        maxSeats: wsSeats || 500,
        basePrice: pricing.participant.onsiteMember || formData.basePrice,
        pricingTiers: pricing,
        registered: 0,
        attended: 0,
        revenue: 0,
        status: 'upcoming',
      };

      const meetingDetails = {
        id: meetingId,
        title: formData.title,
        date: formData.date,
        time: formData.time || '08:30 - 17:00 น.',
        location: formData.location || 'ศูนย์ประชุมสมาคม',
        type: formData.type,
        staffCode: formData.staffCode || '',
        maxSeats: wsSeats || 500,
        mainCount: activities.filter((a) => a.type === 'main').length,
        workshopCount: activities.filter((a) => a.type === 'workshop').length,
        basePrice: pricing.participant.onsiteMember || formData.basePrice,
      };

      if (onMeetingCreated) {
        onMeetingCreated(newMeeting);
      }
      setLastCreatedId(meetingId);
      setSavedMeetingDetails(meetingDetails);
      setIsSaved(true);
      setShowSuccessModal(true);
      setToastMessage(`บันทึกและสร้างงานประชุม "${formData.title}" (รหัส: ${meetingId}) สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => setToastMessage(null), 5000);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    } catch (err) {
      console.error('Failed to create meeting:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count activities by type
  const mainCount = activities.filter((a) => a.type === 'main').length;
  const workshopCount = activities.filter((a) => a.type === 'workshop').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} />

      {/* ─── SUCCESS MODAL POPUP ─── */}
      {showSuccessModal &&
        savedMeetingDetails &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-center space-y-5 animate-scale-up">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Badge with Glow */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#4ade80]/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0026b3] to-[#0044ff] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4ade80]/40">
                  <CheckCircle2 className="w-9 h-9 text-[#4ade80] stroke-[2.5]" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>บันทึกโครงการสำเร็จ</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  บันทึกการเพิ่มการประชุมเรียบร้อยแล้ว
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  โครงการประชุมวิชาการได้ถูกบันทึกลงสู่ระบบ พร้อมเปิดรับลงทะเบียนและตรวจสอบสิทธิ์สมาชิกอัตโนมัติ
                </p>
              </div>

              {/* Meeting Summary Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-bold text-slate-500">รหัสการประชุม</span>
                  <span className="font-mono font-black text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 text-xs">
                    {savedMeetingDetails.id}
                  </span>
                </div>
                <div className="space-y-1 pt-0.5">
                  <div className="font-black text-sm text-slate-900">{savedMeetingDetails.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px] pt-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0026b3]" /> {savedMeetingDetails.date}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0026b3]" /> {savedMeetingDetails.time}
                    </span>
                  </div>
                  {savedMeetingDetails.location && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{savedMeetingDetails.location}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-medium">รูปแบบ</div>
                    <div className="font-extrabold text-slate-800 uppercase text-[11px] mt-0.5">
                      {savedMeetingDetails.type}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-medium">Staff PIN</div>
                    <div className="font-mono font-bold text-amber-700 text-[11px] mt-0.5">
                      {savedMeetingDetails.staffCode || '-'}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-medium">กิจกรรม/เวิร์กช็อป</div>
                    <div className="font-bold text-violet-700 text-[11px] mt-0.5">
                      {savedMeetingDetails.mainCount} Main / {savedMeetingDetails.workshopCount} WS
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      onNavigateTab('meeting-history');
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-900/20 transition active:scale-95 cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 text-[#4ade80]" />
                    <span>ดูในประวัติการประชุม</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setShowSuccessModal(false);
                  }}
                  className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-600" />
                  <span>+ สร้างรายการอื่นต่อ</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <PlusCircle className="w-4 h-4 text-[#0026b3]" />
            <span>สร้างกำหนดการประชุมและงานอบรมใหม่</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">เพิ่มการประชุม / งานประชุมวิชาการ</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ระบุข้อมูลการประชุม กำหนดการ สถานที่ หลักสูตร Main Program / Workshop พร้อมอัตราค่าลงทะเบียน
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
                ข้อมูลพร้อมตารางค่าลงทะเบียนได้บันทึกเข้าสู่ระบบ และพร้อมเปิดรับลงทะเบียนทันที
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
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-7 shadow-xs"
      >
        {/* ─── SECTION 1: ข้อมูลและกำหนดการประชุม ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0026b3]" />
              1. ข้อมูลและกำหนดการประชุม
            </h3>
            <span className="text-xs text-slate-500">* ข้อมูลจำเป็น</span>
          </div>

          {/* รหัสการประชุม และ ชื่อการประชุม */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* รหัสการประชุม (Meeting ID) */}
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">รหัสการประชุม *</label>
                <span className="text-[10px] text-[#0026b3] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  TSRM + รอบ
                </span>
              </div>
              <input
                type="text"
                required
                value={formData.meetingId}
                onChange={(e) => setFormData({ ...formData, meetingId: e.target.value.toUpperCase() })}
                placeholder="เช่น TSRM34, TSRM35"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0026b3] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs uppercase"
              />
              <p className="text-[11px] text-slate-400">ระบบตั้งค่ารหัส TSRM ตามลำดับให้อัตโนมัติ</p>
            </div>

            {/* ชื่อการประชุม (รวมชื่อไทย/อังกฤษในช่องเดียว) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">ชื่อการประชุม / งานประชุมวิชาการ *</label>
                {formData.title && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, title: '' })}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="เช่น 34th TSRM 2026 หรือ TSRM Annual Congress"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
              />
            </div>
          </div>

          {/* กำหนดการจัดงาน: วันที่จัดงาน & เวลาจัดงาน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">วันที่จัดงานรวม (เลือกช่วงวันที่) *</label>
              <ThaiDateRangePicker
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
                placeholder="คลิกเพื่อเลือกช่วงวันที่"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">เวลาจัดงาน (เลือกช่วงเวลา)</label>
              <ThaiTimeRangePicker
                value={formData.time}
                onChange={(val) => setFormData({ ...formData, time: val })}
                placeholder="คลิกเพื่อเลือกช่วงเวลา"
              />
            </div>
          </div>

          {/* รูปแบบการจัดงาน (Onsite / Online / Hybrid) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span>รูปแบบการจัดงาน</span>
                <span className="text-xs font-normal text-slate-500">(เลือกได้ทั้ง 2 ตัวเลือก)</span>
              </label>
              <div className="text-xs font-semibold">
                {formData.type === 'hybrid' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    รูปแบบผสมผสาน
                  </span>
                ) : formData.type === 'onsite' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Onsite เท่านั้น
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3]">
                    <ExternalLink className="w-3 h-3 text-[#0026b3]" />
                    Online เท่านั้น
                  </span>
                )}
              </div>
            </div>

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
                          if (isOnline) {
                            setFormData({ ...formData, type: 'online' });
                          }
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                            isOnsite ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">Onsite (ที่งาน)</div>
                          <div className="text-[11px] text-slate-500">เข้าร่วม ณ สถานที่จัดงานจริง</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          isOnsite ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isOnsite && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isOnline) {
                          if (isOnsite) {
                            setFormData({ ...formData, type: 'onsite' });
                          }
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                            isOnline ? 'bg-[#0026b3] text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">Online (ออนไลน์)</div>
                          <div className="text-[11px] text-slate-500">รับชมผ่านระบบถ่ายทอดสด Zoom / Live</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          isOnline ? 'bg-[#0026b3] border-[#0026b3] text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isOnline && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  </>
                );
              })()}
            </div>
            {formData.type === 'hybrid' && (
              <div className="text-xs text-indigo-800 bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>การจัดงานแบบผสมผสาน:</strong> ผู้เข้าร่วมสามารถเลือกช่องทางเข้าร่วมได้ทั้งที่หน้างาน
                  หรือรับชมออนไลน์
                </span>
              </div>
            )}
          </div>

          {/* สถานที่จัดงาน (Text Input สะอาดตา ไม่มีตัวเลือกปุ่มลัด) */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">สถานที่จัดงาน / ลิงก์ระบบ Zoom</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="เช่น ห้องแกรนด์บอลรูม โรงแรม Grand Hyatt Erawan Bangkok หรือ Zoom Webinar"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
            />
          </div>

          {/* รหัสเจ้าหน้าที่ (Staff PIN 6 หลัก) พร้อมปุ่มสุ่ม */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>รหัสเจ้าหน้าที่ประจำจุดลงทะเบียน (Staff PIN 6 หลัก) *</span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded-full">
                สำหรับสตาฟใช้สแกน QR หน้างาน
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="relative w-40">
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
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2 text-center text-lg font-mono font-extrabold tracking-[0.35em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/30 focus:border-[#0026b3] transition shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, staffCode: generateRandomPin() })}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-2xs"
                title="กดเพื่อสุ่มรหัสตัวเลข 6 หลักใหม่"
              >
                <Dices className="w-3.5 h-3.5 text-white" />
                <span>สุ่มตัวเลข 6 หลัก</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: หลักสูตร / กิจกรรมที่จะเปิด (Programs & Workshops) ─── */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0026b3]" />
                2. หลักสูตร / กิจกรรมที่จะเปิด
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกวันที่จัดกิจกรรม (เลือกได้มากกว่า 1 วัน) และระบุจำนวนที่นั่งสำหรับ Workshop
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 self-start sm:self-auto">
              {mainCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                  <CircleDot className="w-2.5 h-2.5" />
                  Main {mainCount}
                </span>
              )}
              {workshopCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[11px]">
                  <CircleDot className="w-2.5 h-2.5" />
                  Workshop {workshopCount}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">
                รวม {activities.length} รายการ
              </span>
            </div>
          </div>

          {/* Compact Activity Item List */}
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const isMain = activity.type === 'main';
              const borderColor = isMain
                ? 'border-indigo-200 hover:border-indigo-300'
                : 'border-violet-200 hover:border-violet-300';
              const headerBg = isMain ? 'bg-indigo-50/70' : 'bg-violet-50/70';
              const badgeBg = isMain ? 'bg-indigo-600' : 'bg-violet-600';
              const typeLabel = isMain ? 'Main Program' : 'Workshop';
              const typeIcon = isMain ? '📋' : '🔬';
              const typeIndex = activities.filter((a, i) => a.type === activity.type && i <= index).length;

              const individualChoices = dayChoices.filter((c) => c.id !== 'all');
              const individualIds = individualChoices.map((c) => c.id);
              const selectedList =
                activity.selectedDays && activity.selectedDays.length > 0
                  ? activity.selectedDays
                  : activity.date === formData.date
                    ? individualIds
                    : individualChoices.filter((c) => c.value === activity.date).map((c) => c.id);

              const isAllSelected =
                individualIds.length > 0 && individualIds.every((id) => selectedList.includes(id));

              return (
                <div
                  key={activity.id}
                  className={`border ${borderColor} rounded-xl overflow-hidden bg-white shadow-2xs transition-all`}
                >
                  {/* Compact Header Bar */}
                  <div
                    className={`${headerBg} px-3.5 py-2 flex items-center justify-between gap-2 border-b ${
                      isMain ? 'border-indigo-100' : 'border-violet-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`${badgeBg} text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs shrink-0`}
                      >
                        {typeIcon} {typeLabel} {typeIndex > 1 || !isMain ? typeIndex : ''}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 truncate">รายการที่ {index + 1}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete Button */}
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
                  </div>

                  {/* Compact Body Fields */}
                  <div className="p-3 sm:p-3.5 space-y-2.5">
                    {/* Activity Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ชื่อหัวข้อ / หลักสูตร {isMain ? '(หลักสูตรหลัก)' : '(เวิร์กช็อป)'} *
                      </label>
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) => handleUpdateActivity(activity.id, 'name', e.target.value)}
                        placeholder={
                          isMain ? 'เช่น Main Scientific Program' : 'เช่น ART Nurse Workshop, Embryologist Hands-on'
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                      />
                    </div>

                    {/* Format Selection: Onsite / Online / Both */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>รูปแบบหลักสูตร *</span>
                        <span className="text-[11px] text-slate-400 font-normal">กำหนดช่องทางการเข้าร่วม</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateActivity(activity.id, 'format', 'onsite')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            (activity.format || 'onsite') === 'onsite'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-2xs ring-1 ring-emerald-300 font-extrabold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Onsite เท่านั้น</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateActivity(activity.id, 'format', 'online')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activity.format === 'online'
                              ? 'bg-blue-50 text-[#0026b3] border-[#0026b3] shadow-2xs ring-1 ring-blue-300 font-extrabold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                          <span className="truncate">Online เท่านั้น</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateActivity(activity.id, 'format', 'both')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activity.format === 'both'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-400 shadow-2xs ring-1 ring-indigo-300 font-extrabold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">ทั้งสองแบบ</span>
                        </button>
                      </div>
                    </div>

                    {/* Date day pills & Workshop seats */}
                    {isMain ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            วันที่จัดกิจกรรม *{' '}
                            <span className="text-[11px] font-normal text-slate-500">(เลือกได้มากกว่า 1 วัน)</span>
                          </label>
                          {activity.date ? (
                            <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#0026b3]" />
                              <span>{activity.date}</span>
                              {selectedList.length > 1 && (
                                <span className="bg-[#0026b3] text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                  {selectedList.length} วัน
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">ยังไม่ได้เลือกวัน</span>
                          )}
                        </div>

                        {dayChoices.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {dayChoices.map((choice) => {
                              const isChoiceSelected =
                                choice.id === 'all' ? isAllSelected : selectedList.includes(choice.id);
                              return (
                                <button
                                  key={choice.id}
                                  type="button"
                                  onClick={() => handleToggleActivityDay(activity.id, choice.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border select-none ${
                                    isChoiceSelected
                                      ? 'bg-[#0026b3] text-white border-[#0026b3] shadow-xs ring-1 ring-blue-300'
                                      : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0026b3] border-slate-200 hover:border-blue-200'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{choice.label}</span>
                                  {isChoiceSelected && <Check className="w-3 h-3 ml-0.5 text-[#4ade80]" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>กรุณาเลือกวันที่จัดงานรวมในส่วนที่ 1 ก่อน เพื่อแสดงตัวเลือกวันที่</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                          <div className="sm:col-span-8 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700">
                                วันที่จัดกิจกรรม *{' '}
                                <span className="text-[11px] font-normal text-slate-500">(เลือกได้มากกว่า 1 วัน)</span>
                              </label>
                              {activity.date ? (
                                <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-violet-700" />
                                  <span>{activity.date}</span>
                                  {selectedList.length > 1 && (
                                    <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                      {selectedList.length} วัน
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">ยังไม่ได้เลือกวัน</span>
                              )}
                            </div>

                            {dayChoices.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {dayChoices.map((choice) => {
                                  const isChoiceSelected =
                                    choice.id === 'all' ? isAllSelected : selectedList.includes(choice.id);
                                  return (
                                    <button
                                      key={choice.id}
                                      type="button"
                                      onClick={() => handleToggleActivityDay(activity.id, choice.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border select-none ${
                                        isChoiceSelected
                                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs ring-1 ring-violet-300'
                                          : 'bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border-slate-200 hover:border-violet-200'
                                      }`}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>{choice.label}</span>
                                      {isChoiceSelected && <Check className="w-3 h-3 ml-0.5 text-[#4ade80]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>กรุณาเลือกวันที่จัดงานรวมในส่วนที่ 1 ก่อน</span>
                              </div>
                            )}
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">จำนวนที่นั่ง (คน) *</label>
                            <input
                              type="number"
                              min={1}
                              value={activity.maxSeats || ''}
                              onChange={(e) =>
                                handleUpdateActivity(activity.id, 'maxSeats', parseInt(e.target.value) || 0)
                              }
                              placeholder="เช่น 50"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                            />
                          </div>
                        </div>

                        {/* Workshop Registration Fee (Member* and Non-member) */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-violet-600" />
                              <span>กำหนดค่าลงทะเบียนเวิร์กช็อป</span>
                            </label>
                            <span className="text-[10px] text-slate-400">ระบุ 0 หากไม่มีค่าใช้จ่าย</span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60 shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                                  <th className="py-2 px-3 w-1/2">
                                    Member<span className="text-rose-500 font-bold">*</span>
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">(สมาชิกสมาคม)</span>
                                  </th>
                                  <th className="py-2 px-3 w-1/2 border-l border-slate-200">
                                    Non-member
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">(บุคคลทั่วไป)</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-white">
                                  {/* Member* */}
                                  <td className="p-2">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        ฿
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={
                                          activity.memberPrice !== undefined && activity.memberPrice !== null
                                            ? activity.memberPrice === 0
                                              ? ''
                                              : activity.memberPrice
                                            : ''
                                        }
                                        onChange={(e) =>
                                          handleUpdateActivity(activity.id, 'memberPrice', parseInt(e.target.value) || 0)
                                        }
                                        placeholder="0"
                                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                                      />
                                    </div>
                                  </td>
                                  {/* Non-member */}
                                  <td className="p-2 border-l border-slate-200">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        ฿
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={
                                          activity.nonMemberPrice !== undefined && activity.nonMemberPrice !== null
                                            ? activity.nonMemberPrice === 0
                                              ? ''
                                              : activity.nonMemberPrice
                                            : ''
                                        }
                                        onChange={(e) =>
                                          handleUpdateActivity(
                                            activity.id,
                                            'nonMemberPrice',
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Add Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleAddActivity('main')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs sm:text-sm transition cursor-pointer hover:border-indigo-400 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>+ เพิ่ม Main Program</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddActivity('workshop')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 hover:bg-violet-100/60 text-violet-700 font-bold text-xs sm:text-sm transition cursor-pointer hover:border-violet-400 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-violet-600" />
              <span>+ เพิ่ม Workshop</span>
            </button>
          </div>
        </div>

        {/* ─── SECTION 3: ระบุเงินและกำหนดอัตราค่าลงทะเบียน (Interactive Pricing Matrix Table) ─── */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#0026b3]" />
                3. กำหนดอัตราค่าลงทะเบียน
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กรอกตัวเลขราคา (บาท) ลงในตารางได้โดยตรง ระบบจะนำไปคำนวณและแสดงผลในหน้าลงทะเบียน
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleLoadDefaultPricing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 transition cursor-pointer"
                title="โหลดค่าเริ่มต้นมาตรฐาน"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ใส่ค่ามาตรฐานอัตโนมัติ</span>
              </button>
              <button
                type="button"
                onClick={handleClearPricing}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-medium border border-slate-200 transition cursor-pointer"
              >
                ล้างตาราง
              </button>
            </div>
          </div>

          {/* Compact Directly Editable Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[540px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                {/* Top Group Header */}
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 w-[32%] min-w-[140px] text-slate-800">ประเภทผู้เข้าร่วม</th>
                  <th
                    colSpan={2}
                    className="py-2 px-3 text-center border-l border-slate-200 bg-emerald-50/70 text-emerald-900"
                  >
                    Onsite (เข้าร่วม ณ สถานที่)
                  </th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 bg-blue-50/70 text-[#0026b3]">
                    Online (ออนไลน์)
                  </th>
                </tr>
                {/* Sub Header */}
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs text-slate-600 font-bold">
                  <th className="py-2 px-3">หมวดหมู่ / รายการ</th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[22%]">
                    Member<span className="text-rose-500">*</span>
                  </th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[22%]">Non-member</th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[24%] text-[#0026b3]">
                    Member<span className="text-rose-500">*</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {/* Row 1: Participant */}
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      <span>Participant</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal pl-3">ผู้เข้าร่วมทั่วไป / แพทย์</div>
                  </td>
                  {/* Onsite Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onsiteMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onsiteMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Onsite Non-member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onsiteNonMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onsiteNonMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Online Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200 bg-blue-50/20">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onlineMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onlineMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                </tr>

                {/* Row 2: Format Change Fee */}
                <tr className="hover:bg-slate-50/50 transition bg-amber-50/30">
                  <td className="py-2 px-3 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs">แจ้งเปลี่ยนรูปแบบ (Online ↔ Onsite)</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 pl-3">
                      <input
                        type="text"
                        value={pricing.changeFee.conditionDate}
                        onChange={(e) => {
                          const cDate = e.target.value;
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              conditionDate: cDate,
                            },
                          });
                        }}
                        placeholder="After 10 Oct 2026"
                        className="bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-400 w-32"
                      />
                    </div>
                  </td>
                  {/* Onsite Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onsiteMember}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onsiteMember: val,
                              onsiteNonMember: val,
                              onlineMember: val,
                            },
                          });
                        }}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Onsite Non-member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onsiteNonMember}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onsiteNonMember: val,
                            },
                          });
                        }}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Online Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200 bg-blue-50/20">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onlineMember}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onlineMember: val,
                            },
                          });
                        }}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Format Change Policy Detail Card */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 sm:p-4.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>เงื่อนไขการเปลี่ยนรูปแบบการเข้าร่วม (Online ↔ Onsite Policy)</span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      เงื่อนไขพิเศษ
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ระบุข้อความเงื่อนไขหรือค่าปรับเมื่อผู้ลงทะเบียนขอเปลี่ยนรูปแบบ เช่น จาก Online เป็น Onsite
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>เงื่อนไขวันตัดยอด / Deadline *</span>
                  <span className="text-[10px] text-rose-600 font-bold">เลือกวันที่ตัดรอบ (ปฏิทิน พ.ศ.)</span>
                </label>
                <ThaiDatePicker
                  value={pricing.changeFee.conditionDate}
                  onChange={(val) =>
                    setPricing({
                      ...pricing,
                      changeFee: {
                        ...pricing.changeFee,
                        conditionDate: val,
                      },
                    })
                  }
                  placeholder="คลิกเพื่อเลือกวันตัดยอด (เช่น 10 ตุลาคม 2569)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>ค่าธรรมเนียมการเปลี่ยนรูปแบบ</span>
                  <span className="text-[10px] text-slate-400">บาท</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={pricing.changeFee.onsiteMember}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPricing({
                        ...pricing,
                        changeFee: {
                          ...pricing.changeFee,
                          onsiteMember: val,
                          onsiteNonMember: val,
                          onlineMember: val,
                        },
                      });
                    }}
                    placeholder="1000"
                    className="w-full bg-white border border-amber-300 rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>ข้อความประกาศเงื่อนไขแบบกำหนดเอง</span>
                <span className="text-[10px] text-slate-400">ปล่อยว่างหากต้องการให้ระบบสร้างข้อความอัตโนมัติ</span>
              </label>
              <input
                type="text"
                value={pricing.changeFee.policyText || ''}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    changeFee: {
                      ...pricing.changeFee,
                      policyText: e.target.value,
                    },
                  })
                }
                placeholder="เช่น การเปลี่ยนรูปแบบการเข้าร่วมจาก Online เป็น Onsite หลังวันที่ 10 ตุลาคม 2569 จะมีค่าธรรมเนียม 1,000 บาท"
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Live Preview Box */}
            <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">ตัวอย่างข้อความที่สมาชิกจะเห็นในระบบลงทะเบียน: </span>
                <span className="text-slate-600">
                  {pricing.changeFee.policyText?.trim()
                    ? pricing.changeFee.policyText.trim()
                    : `หมายเหตุ: หากต้องการเปลี่ยนรูปแบบการเข้าร่วมภายหลัง (เช่น จากออนไลน์เป็นออนไซต์) ${
                        pricing.changeFee.conditionDate ? 'หลังจาก ' + pricing.changeFee.conditionDate : ''
                      } จะมีค่าธรรมเนียม ${(pricing.changeFee.onsiteMember || 1000).toLocaleString()} บาท ตามที่ระบุไว้ในเงื่อนไขการประชุม`}
                </span>
              </div>
            </div>
          </div>

          {/* Workshop Registration Rates Table in Section 3 (if workshops added) */}
          {workshopCount > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                  <span>อัตราค่าลงทะเบียน Pre-congress Workshop ({workshopCount} รายการ)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">ซิงค์อัตโนมัติกับรายการ Workshop ด้านบน</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-violet-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-violet-50/90 border-b border-violet-200 text-violet-950 font-bold text-[11px] sm:text-xs">
                      <th className="py-2.5 px-3 w-[40%]">ชื่อหลักสูตร / เวิร์กช็อป</th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[24%] text-[#0026b3]">
                        Member<span className="text-rose-500 font-bold">*</span>
                      </th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[24%] text-slate-800">
                        Non-member
                      </th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[12%] text-slate-600">
                        ที่นั่ง (คน)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {activities
                      .filter((a) => a.type === 'workshop')
                      .map((ws, wsIdx) => (
                        <tr key={ws.id} className="hover:bg-violet-50/40 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded shrink-0">
                                WS {wsIdx + 1}
                              </span>
                              <span className="truncate max-w-[200px] sm:max-w-xs">
                                {ws.name || `Workshop ${wsIdx + 1}`}
                              </span>
                            </div>
                            {ws.date && <div className="text-[10px] text-slate-400 font-normal pl-7">{ws.date}</div>}
                          </td>
                          {/* Member* */}
                          <td className="py-2 px-2.5 border-l border-violet-100">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ฿
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={
                                  ws.memberPrice !== undefined && ws.memberPrice !== null
                                    ? ws.memberPrice === 0
                                      ? ''
                                      : ws.memberPrice
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdateActivity(ws.id, 'memberPrice', parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 text-right"
                              />
                            </div>
                          </td>
                          {/* Non-member */}
                          <td className="py-2 px-2.5 border-l border-violet-100">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ฿
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={
                                  ws.nonMemberPrice !== undefined && ws.nonMemberPrice !== null
                                    ? ws.nonMemberPrice === 0
                                      ? ''
                                      : ws.nonMemberPrice
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdateActivity(ws.id, 'nonMemberPrice', parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 text-right"
                              />
                            </div>
                          </td>
                          {/* Seats */}
                          <td className="py-2 px-2.5 border-l border-violet-100 text-center font-bold text-slate-700">
                            <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-700 font-semibold">
                              {ws.maxSeats || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footnote / Quick Remark */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">* Member:</span>
              <input
                type="text"
                value={pricing.remark}
                onChange={(e) => setPricing({ ...pricing, remark: e.target.value })}
                placeholder="หมายเหตุสถานะสมาชิก..."
                className="bg-transparent border-b border-dashed border-slate-300 text-slate-600 focus:border-[#0026b3] focus:outline-none w-80 max-w-full text-xs"
              />
            </div>
            <span className="text-slate-400">
              💡 กดปุ่ม &quot;ใส่ค่ามาตรฐานอัตโนมัติ&quot; เพื่อเติมข้อมูลตามโครงสร้างมาตรฐานได้ทันที
            </span>
          </div>
        </div>

        {/* ─── SECTION 4: หมายเหตุ / รายละเอียดเพิ่มเติม ─── */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0026b3]" />
              4. หมายเหตุ / รายละเอียดเพิ่มเติม (ถ้ามี)
            </h3>
          </div>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="ระบุรายละเอียดการประชุม วิทยากรรับเชิญ หรือหมายเหตุ..."
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition resize-none shadow-2xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ระบบจะบันทึกข้อมูลและอัตราค่าลงทะเบียน พร้อมเปิดช่องทางลงทะเบียนให้อัตโนมัติ</span>
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
              disabled={isSubmitting}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold text-sm px-8 py-3 rounded-xl shadow-md transition active:scale-95 cursor-pointer ${
                isSubmitting
                  ? 'bg-slate-400 text-white shadow-slate-300/20 cursor-not-allowed'
                  : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-[#0026b3]/20'
              }`}
            >
              <Check className="w-4 h-4 text-[#4ade80]" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเปิดรับลงทะเบียน'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
