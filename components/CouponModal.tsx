'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Ticket,
  Building2,
  Calendar,
  Sparkles,
  DollarSign,
  Users,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Award,
  Crown,
  Medal,
  CheckSquare,
  Square,
  FileCheck2,
  UserCheck,
} from 'lucide-react';

interface MeetingOption {
  id?: string;
  meeting_id?: string;
  titleTh?: string;
  meeting_name?: string;
  meeting_date?: string;
  date?: string;
  status?: string;
  activities?: Array<{
    id?: string;
    code?: string;
    name?: string;
    titleTh?: string;
    nameTh?: string;
    price?: number;
  }>;
}

export interface CouponItem {
  id: string;
  code: string;
  company_name: string;
  meeting_id: string;
  discount_type: string;
  discount_value: number;
  applicable_type: string;
  max_uses: number;
  used_count: number;
  expire_date: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
  meetings?: {
    meeting_id: string;
    meeting_name: string;
    meeting_date?: string;
    activities?: any[];
  };
}

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: CouponItem | null;
  meetings: MeetingOption[];
  sponsors?: { id: string; name: string; tier?: string; total_allocated_quota?: number }[];
  prefilledCompanyName?: string;
  onSaveSuccess: () => void;
}

export function CouponModal({
  isOpen,
  onClose,
  couponToEdit,
  meetings,
  sponsors = [],
  prefilledCompanyName = '',
  onSaveSuccess,
}: CouponModalProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>('custom');
  const [companyName, setCompanyName] = useState('');
  const [code, setCode] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [discountType, setDiscountType] = useState<'free' | 'fixed' | 'percent'>('free');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireDate, setExpireDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [remarks, setRemarks] = useState('');

  // New fields requested by user:
  // 1. Purpose (สมัครสมาชิก vs ลงทะเบียนงานประชุม vs ทั้งหมด)
  const [applicableType, setApplicableType] = useState<'registration' | 'membership' | 'all'>('registration');
  // 2. Selectable Programs / Activities (Default to Main Program only)
  const [allPrograms, setAllPrograms] = useState<boolean>(false);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(['การประชุมหลัก (Main Congress)']);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort meetings so that the latest upcoming meeting is first
  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const isUpcomingA = a.status === 'upcoming' || (a.meeting_id && a.meeting_id.includes('34'));
      const isUpcomingB = b.status === 'upcoming' || (b.meeting_id && b.meeting_id.includes('34'));
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;
      return 0;
    });
  }, [meetings]);

  // Find currently selected meeting object to get its activities
  const currentMeeting = useMemo(() => {
    return meetings.find((m) => (m.meeting_id || m.id) === meetingId) || sortedMeetings[0];
  }, [meetings, sortedMeetings, meetingId]);

  const availableActivities = useMemo(() => {
    if (!currentMeeting || !currentMeeting.activities) return [];
    return currentMeeting.activities.map((act: any, idx: number) => ({
      id: act.id || act.code || `act-${idx}`,
      name: act.name || act.titleTh || act.nameTh || `โปรแกรม ${idx + 1}`,
      price: act.price || 0,
    }));
  }, [currentMeeting]);

  // Helper to generate secure, hard-to-guess coupon code
  const generateCodeFromCompany = (comp: string, mId: string) => {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const words = (comp || '').toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    let prefix = '';
    if (words.length >= 2) {
      prefix = (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 3).toUpperCase();
    } else {
      prefix = 'SPN';
    }

    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `T34-${prefix}-${token}`;
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      const defaultMeetingId = sortedMeetings[0]?.meeting_id || sortedMeetings[0]?.id || 'TSRM34';

      if (couponToEdit) {
        setCompanyName(couponToEdit.company_name || '');
        // Check if matches an existing sponsor
        const matchedSponsor = sponsors.find(
          (s) => s.name.toLowerCase() === (couponToEdit.company_name || '').toLowerCase()
        );
        setSelectedSponsorId(matchedSponsor ? matchedSponsor.id : 'custom');

        setCode(couponToEdit.code || '');
        setMeetingId(couponToEdit.meeting_id || defaultMeetingId);
        setDiscountType((couponToEdit.discount_type as any) || 'free');
        setDiscountValue(couponToEdit.discount_value || 0);
        setMaxUses(couponToEdit.max_uses || 1);
        setExpireDate(
          couponToEdit.expire_date
            ? new Date(couponToEdit.expire_date).toISOString().split('T')[0]
            : ''
        );
        setIsActive(couponToEdit.is_active !== undefined ? couponToEdit.is_active : true);
        setRemarks(couponToEdit.remarks || '');
        setApplicableType((couponToEdit.applicable_type as any) || 'registration');

        // Find default/main program name for the meeting
        const editMeeting = meetings.find((m) => (m.meeting_id || m.id) === (couponToEdit.meeting_id || defaultMeetingId)) || sortedMeetings[0];
        const editActs = editMeeting?.activities || [];
        const editMainAct = editActs.find((a: any) => 
          (a.id || a.code || '').toLowerCase().includes('main') || 
          (a.name || a.titleTh || a.nameTh || '').toLowerCase().includes('main') ||
          (a.name || a.titleTh || a.nameTh || '').includes('หลัก')
        ) || editActs[0];
        const defaultProgName = editMainAct ? (editMainAct.name || editMainAct.titleTh || editMainAct.nameTh || 'การประชุมหลัก (Main Congress)') : 'การประชุมหลัก (Main Congress)';

        // Parse selected programs if stored in remarks
        try {
          if (couponToEdit.remarks && (couponToEdit.remarks.startsWith('{"programs":') || couponToEdit.remarks.startsWith('{'))) {
            const parsed = JSON.parse(couponToEdit.remarks);
            if (parsed.allPrograms === true) {
              setAllPrograms(true);
              setSelectedPrograms([]);
              setRemarks(parsed.note || '');
            } else if (Array.isArray(parsed.programs) && parsed.programs.length > 0) {
              setAllPrograms(false);
              setSelectedPrograms(parsed.programs);
              setRemarks(parsed.note || '');
            } else {
              setAllPrograms(false);
              setSelectedPrograms([defaultProgName]);
              setRemarks(parsed.note || '');
            }
          } else {
            // Default when not explicitly specified is Main Program only (ฟรีเฉพาะการประชุมหลัก Main)
            setAllPrograms(false);
            setSelectedPrograms([defaultProgName]);
            setRemarks(couponToEdit.remarks || '');
          }
        } catch {
          setAllPrograms(false);
          setSelectedPrograms([defaultProgName]);
          setRemarks(couponToEdit.remarks || '');
        }
      } else {
        // Creating new coupon
        const targetMeetingId = defaultMeetingId;
        setMeetingId(targetMeetingId);
        setDiscountType('free');
        setDiscountValue(0);
        setExpireDate('');
        setIsActive(true);
        setRemarks('');
        setApplicableType('registration');
        
        // Default to Main program
        const targetM = meetings.find((m) => (m.meeting_id || m.id) === targetMeetingId) || sortedMeetings[0];
        const acts = targetM?.activities || [];
        const mainAct = acts.find((a: any) => 
          (a.id || a.code || '').toLowerCase().includes('main') || 
          (a.name || a.titleTh || a.nameTh || '').toLowerCase().includes('main') ||
          (a.name || a.titleTh || a.nameTh || '').includes('หลัก')
        ) || acts[0];
        
        const defaultProgName = mainAct ? (mainAct.name || mainAct.titleTh || mainAct.nameTh || 'การประชุมหลัก (Main Congress)') : 'การประชุมหลัก (Main Congress)';
        setAllPrograms(false);
        setSelectedPrograms([defaultProgName]);

        if (prefilledCompanyName) {
          setCompanyName(prefilledCompanyName);
          const matched = sponsors.find(
            (s) => s.name.toLowerCase() === prefilledCompanyName.toLowerCase()
          );
          if (matched) {
            setSelectedSponsorId(matched.id);
            let quota = 8;
            if (matched.tier === 'Platinum') quota = 20;
            else if (matched.tier === 'Silver') quota = 2;
            setMaxUses(matched.total_allocated_quota || quota);
          } else {
            setSelectedSponsorId('custom');
            setMaxUses(1);
          }
          setCode(generateCodeFromCompany(prefilledCompanyName, targetMeetingId));
        } else if (sponsors.length > 0) {
          // Default to first sponsor (e.g. LG Chem)
          const firstSp = sponsors[0];
          setSelectedSponsorId(firstSp.id);
          setCompanyName(firstSp.name);
          let quota = 8;
          if (firstSp.tier === 'Platinum') quota = 20;
          else if (firstSp.tier === 'Silver') quota = 2;
          setMaxUses(firstSp.total_allocated_quota || quota);
          setCode(generateCodeFromCompany(firstSp.name, targetMeetingId));
        } else {
          setSelectedSponsorId('custom');
          setCompanyName('');
          setMaxUses(1);
          setCode(generateCodeFromCompany('TSRM', targetMeetingId));
        }
      }
    }
  }, [isOpen, couponToEdit, sortedMeetings, sponsors, prefilledCompanyName]);

  if (!isOpen || !mounted) return null;

  // Handle Sponsor Dropdown Change
  const handleSponsorSelectChange = (spId: string) => {
    setSelectedSponsorId(spId);
    if (spId === 'custom') {
      setCompanyName('');
      setMaxUses(1);
      setCode(generateCodeFromCompany('CUSTOM', meetingId));
    } else {
      const found = sponsors.find((s) => s.id === spId);
      if (found) {
        setCompanyName(found.name);
        let quota = 8;
        if (found.tier === 'Platinum') quota = 20;
        else if (found.tier === 'Silver') quota = 2;
        setMaxUses(found.total_allocated_quota || quota);
        setCode(generateCodeFromCompany(found.name, meetingId));
      }
    }
  };

  const handleToggleProgram = (progName: string) => {
    setAllPrograms(false);
    setSelectedPrograms((prev) =>
      prev.includes(progName) ? prev.filter((p) => p !== progName) : [...prev, progName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!companyName.trim()) {
      setErrorMsg('กรุณาระบุหรือเลือกชื่อบริษัท / สปอนเซอร์');
      return;
    }

    if (!code.trim()) {
      setErrorMsg('กรุณากรอกรหัสคูปอง');
      return;
    }

    if (!meetingId) {
      setErrorMsg('กรุณาเลือกรอบการประชุม');
      return;
    }

    if (discountType !== 'free' && (!discountValue || discountValue <= 0)) {
      setErrorMsg('กรุณาระบุมูลค่าส่วนลดที่มากกว่า 0');
      return;
    }

    if (!maxUses || maxUses < 1) {
      setErrorMsg('จำนวนสิทธิ์การใช้งานต้องมีอย่างน้อย 1 สิทธิ์');
      return;
    }

    setSaving(true);
    try {
      // Package selected programs into remarks
      let finalRemarks = remarks.trim();
      if (!allPrograms) {
        finalRemarks = JSON.stringify({
          programs: selectedPrograms.length > 0 ? selectedPrograms : ['การประชุมหลัก (Main Congress)'],
          note: remarks.trim() || undefined,
        });
      } else {
        finalRemarks = JSON.stringify({
          programs: [],
          allPrograms: true,
          note: remarks.trim() || undefined,
        });
      }

      const payload = {
        company_name: companyName.trim(),
        code: code.trim().toUpperCase(),
        meeting_id: meetingId,
        discount_type: discountType,
        discount_value: discountType === 'free' ? 0 : Number(discountValue),
        applicable_type: applicableType,
        max_uses: Number(maxUses),
        expire_date: expireDate ? expireDate : null,
        is_active: isActive,
        remarks: finalRemarks || null,
      };

      const url = couponToEdit ? `/api/coupons/${couponToEdit.id}` : '/api/coupons';
      const method = couponToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกข้อมูลคูปองไม่สำเร็จ');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#002094] to-[#001768] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-sm">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {couponToEdit ? 'แก้ไขข้อมูลคูปองสิทธิ์สปอนเซอร์' : 'สร้างคูปองโควต้าสิทธิ์สปอนเซอร์'}
              </h3>
              <p className="text-xs text-blue-200/90 mt-0.5">
                กำหนดรหัสคูปองฟรี / ส่วนลด ผูกกับบริษัทสปอนเซอร์ และโปรแกรมที่เข้าร่วมได้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0 relative z-10"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-white">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Dropdown Select Sponsor Company */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0026b3]" />
                <span>เลือกบริษัทสปอนเซอร์ (Sponsor Company) <span className="text-red-500">*</span></span>
              </span>
              {selectedSponsorId !== 'custom' && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  เชื่อมกับฐานข้อมูลสปอนเซอร์
                </span>
              )}
            </label>

            <select
              value={selectedSponsorId}
              onChange={(e) => handleSponsorSelectChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 transition outline-none bg-slate-50 focus:bg-white cursor-pointer"
            >
              <optgroup label="🏢 รายชื่อบริษัทสปอนเซอร์ในระบบ">
                {sponsors.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} {sp.tier ? `(💎 ${sp.tier})` : ''} - โควต้า {sp.total_allocated_quota || 0} สิทธิ์
                  </option>
                ))}
              </optgroup>
              <optgroup label="✏️ กำหนดเอง">
                <option value="custom">✍️ ระบุชื่อบริษัท/หน่วยงานอื่นด้วยตนเอง</option>
              </optgroup>
            </select>

            {selectedSponsorId === 'custom' && (
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="พิมพ์ชื่อบริษัท เช่น บจก. ตัวอย่าง (ประเทศไทย)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:border-[#0026b3] focus:bg-white transition outline-none bg-slate-50 mt-1.5"
              />
            )}
          </div>

          {/* 2. Meeting Selection (Defaults to latest upcoming) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0026b3]" />
              <span>เลือกรอบการประชุม (ค่าเริ่มต้น: รอบล่าสุด) <span className="text-red-500">*</span></span>
            </label>
            <select
              value={meetingId}
              onChange={(e) => {
                const newMId = e.target.value;
                setMeetingId(newMId);
                if (companyName) {
                  setCode(generateCodeFromCompany(companyName, newMId));
                }
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 transition outline-none bg-white cursor-pointer"
            >
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

          {/* 3. Purpose: สมัครสมาชิก vs ลงทะเบียนงานประชุม vs ทั้งหมด */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>วัตถุประสงค์การใช้สิทธิ์ (Applicable Scope) <span className="text-red-500">*</span></span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  applicableType === 'registration'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="applicableType"
                  value="registration"
                  checked={applicableType === 'registration'}
                  onChange={() => setApplicableType('registration')}
                  className="accent-[#0026b3]"
                />
                <span>🎟️ ลงทะเบียนงานประชุม</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  applicableType === 'membership'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="applicableType"
                  value="membership"
                  checked={applicableType === 'membership'}
                  onChange={() => setApplicableType('membership')}
                  className="accent-[#0026b3]"
                />
                <span>🪪 สมัคร/ต่ออายุสมาชิก</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  applicableType === 'all'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="applicableType"
                  value="all"
                  checked={applicableType === 'all'}
                  onChange={() => setApplicableType('all')}
                  className="accent-[#0026b3]"
                />
                <span>🌐 ใช้ได้ทุกประเภท</span>
              </label>
            </div>
            {applicableType === 'membership' && (
              <p className="text-[11px] text-blue-700 bg-blue-50/80 p-2 rounded-xl border border-blue-100 font-medium">
                ℹ️ สำหรับการสมัครหรือต่ออายุสมาชิก จะไม่มีการระบุโปรแกรมการประชุม
              </p>
            )}
          </div>

          {/* 4. Selectable Programs / Activities (Hide if membership only) */}
          {applicableType !== 'membership' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-purple-600" />
                  <span>โปรแกรม / กิจกรรมที่ร่วมรายการได้ (เริ่มต้น: การประชุมหลัก Main)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextAll = !allPrograms;
                    setAllPrograms(nextAll);
                    if (nextAll) {
                      setSelectedPrograms([]);
                    } else {
                      const defaultProg = availableActivities[0]?.name || 'การประชุมหลัก (Main Congress)';
                      setSelectedPrograms([defaultProg]);
                    }
                  }}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                    allPrograms
                      ? 'bg-purple-100 text-purple-800 font-black'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {allPrograms ? '✅ ครอบคลุมทุกโปรแกรม (All)' : 'เลือกเฉพาะโปรแกรม'}
                </button>
              </div>

              {allPrograms ? (
                <p className="text-[11px] text-slate-500 font-medium">
                  * คูปองนี้สามารถใช้ได้กับทุกประเภทบัตรและทุกกิจกรรมของการประชุมนี้
                </p>
              ) : availableActivities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {availableActivities.map((act) => {
                    const isChecked = selectedPrograms.includes(act.name);
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleToggleProgram(act.name)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                          isChecked
                            ? 'bg-purple-50 text-purple-900 border-purple-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-left">{act.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {['การประชุมหลัก (Main Congress)', 'Pre-Congress Workshop', 'Dinner Symposium'].map((prog) => {
                    const isChecked = selectedPrograms.includes(prog);
                    return (
                      <button
                        key={prog}
                        type="button"
                        onClick={() => handleToggleProgram(prog)}
                        className={`w-full p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                          isChecked
                            ? 'bg-purple-50 text-purple-900 border-purple-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{prog}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Coupon Code & Generator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-[#0026b3]" />
                <span>รหัสคูปอง (Coupon Code) <span className="text-red-500">*</span></span>
              </label>
              <button
                type="button"
                onClick={() => setCode(generateCodeFromCompany(companyName || 'TSRM', meetingId))}
                className="text-xs font-bold text-[#0026b3] hover:text-blue-800 flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>สุ่มรหัสตามชื่อบริษัท</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="เช่น LGCHEM-TSRM34, MERCK-2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-black text-sm tracking-wider focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/15 transition outline-none bg-slate-50 focus:bg-white uppercase"
            />
          </div>

          {/* 6. Discount Type & Max Uses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ประเภทสิทธิ์ส่วนลด <span className="text-red-500">*</span>
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:border-[#0026b3] focus:outline-none bg-white cursor-pointer"
              >
                <option value="free">🎁 ฟรี 100% (โควต้าสปอนเซอร์ฟรี)</option>
                <option value="fixed">💵 ลดระบุจำนวนเงิน (บาท)</option>
                <option value="percent">📊 ลดเป็นเปอร์เซ็นต์ (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                จำนวนสิทธิ์ใช้งาน (ที่นั่ง/สิทธิ์) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:border-[#0026b3] focus:outline-none bg-white"
              />
            </div>
          </div>

          {discountType !== 'free' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {discountType === 'percent' ? 'ส่วนลด (เปอร์เซ็นต์ %)' : 'ส่วนลด (บาท ฿)'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={discountType === 'percent' ? 100 : 999999}
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === 'percent' ? 'เช่น 50 (ลด 50%)' : 'เช่น 1500 (ลด 1,500 บาท)'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-xs focus:border-[#0026b3] focus:outline-none bg-white"
              />
            </div>
          )}

          {/* 7. Active Status & Remarks (Expiry date omitted as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานะการใช้งาน
              </label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-bold focus:border-[#0026b3] focus:outline-none bg-white cursor-pointer"
              >
                <option value="true">✅ เปิดใช้งาน (Active)</option>
                <option value="false">🚫 ปิดใช้งานชั่วคราว (Inactive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                หมายเหตุเพิ่มเติม (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="เช่น สำหรับตัวแทนฝ่ายขาย / โควต้าสิทธิ์"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:border-[#0026b3] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0026b3] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? 'กำลังบันทึก...' : couponToEdit ? 'บันทึกการแก้ไข' : 'สร้างรหัสคูปอง'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
