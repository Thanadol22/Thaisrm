'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Globe,
  Search,
  Ticket,
  UserPlus,
  User,
  Mail,
  ArrowRight,
  Sparkles,
  MapPin,
  Monitor,
  CheckCircle2,
  Building2,
  Hash,
  Tag,
  Award,
  ChevronDown,
  Calendar,
  CalendarX,
  AlertCircle,
  Loader2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { ParticipantSearchModal } from '@/components/ParticipantSearchModal';
import { ExpiredMemberModal } from '@/components/ExpiredMemberModal';
import { SignupView } from '@/components/views/SignupView';
import { PositionSelect } from '@/components/PositionSelect';
import { useLanguage } from '@/context/LanguageContext';
import { parseGoogleName } from '@/lib/utils';

interface MeetingActivity {
  id: string;
  type: 'main' | 'workshop';
  name: string;
  date?: string;
  selectedDays?: string[];
  format?: 'onsite' | 'online' | 'both';
  maxSeats?: number;
  memberPrice?: number;
  nonMemberPrice?: number;
}

interface LoginViewProps {
  onNavigateToSignup: () => void;
  onGoogleSignIn: () => void;
  onGoogleAutofill?: (tab?: 'conference' | 'membership') => void;
  defaultTab?: 'conference' | 'membership';
  autofillTarget?: 'conference' | 'membership' | null;
  initialGoogleUser?: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  } | null;
}

function formatMeetingDateDisplay(meetingOrDate?: any, lang: 'th' | 'en' = 'th'): string {
  if (!meetingOrDate) return '';
  if (typeof meetingOrDate === 'string' || meetingOrDate instanceof Date) {
    const d = new Date(meetingOrDate);
    if (isNaN(d.getTime())) return String(meetingOrDate);
    const THAI_MONTHS_FULL = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    if (lang === 'th') {
      return `${d.getUTCDate()} ${THAI_MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  // If object has formatted date range in pricing_tiers
  if (lang === 'th' && meetingOrDate.pricing_tiers?.dateRange?.formatted) {
    return meetingOrDate.pricing_tiers.dateRange.formatted;
  }

  const start = meetingOrDate.start_date || meetingOrDate.meeting_date;
  const end = meetingOrDate.end_date;

  if (!start) return '';
  const dStart = new Date(start);
  if (isNaN(dStart.getTime())) return '';

  const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const EN_MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const yStart = dStart.getUTCFullYear();
  const mStart = dStart.getUTCMonth();
  const dayStart = dStart.getUTCDate();

  if (!end) {
    if (lang === 'th') return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart + 543}`;
    return `${dayStart} ${EN_MONTHS_FULL[mStart]} ${yStart}`;
  }

  const dEnd = new Date(end);
  if (isNaN(dEnd.getTime()) || dStart.toISOString().slice(0, 10) === dEnd.toISOString().slice(0, 10)) {
    if (lang === 'th') return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart + 543}`;
    return `${dayStart} ${EN_MONTHS_FULL[mStart]} ${yStart}`;
  }

  const yEnd = dEnd.getUTCFullYear();
  const mEnd = dEnd.getUTCMonth();
  const dayEnd = dEnd.getUTCDate();

  if (lang === 'th') {
    if (yStart === yEnd && mStart === mEnd) {
      return `${dayStart} - ${dayEnd} ${THAI_MONTHS_FULL[mStart]} ${yStart + 543}`;
    } else if (yStart === yEnd) {
      return `${dayStart} ${THAI_MONTHS_FULL[mStart]} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yStart + 543}`;
    } else {
      return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart + 543} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yEnd + 543}`;
    }
  } else {
    if (yStart === yEnd && mStart === mEnd) {
      return `${dayStart} - ${dayEnd} ${EN_MONTHS_FULL[mStart]} ${yStart}`;
    } else if (yStart === yEnd) {
      return `${dayStart} ${EN_MONTHS_FULL[mStart]} - ${dayEnd} ${EN_MONTHS_FULL[mEnd]} ${yStart}`;
    } else {
      return `${dayStart} ${EN_MONTHS_FULL[mStart]} ${yStart} - ${dayEnd} ${EN_MONTHS_FULL[mEnd]} ${yEnd}`;
    }
  }
}

export function LoginView({
  onNavigateToSignup,
  onGoogleSignIn,
  onGoogleAutofill,
  defaultTab = 'conference',
  autofillTarget = null,
  initialGoogleUser,
}: LoginViewProps) {
  const router = useRouter();
  const { lang, toggleLang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'conference' | 'membership'>(defaultTab);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Conference Program Selection & Attendance Type
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [attendanceType, setAttendanceType] = useState<'onsite' | 'online'>('onsite');

  // Fetch Latest Active Meeting on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingMeeting(true);
    fetch('/api/meetings?action=latest')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data.success && data.data) {
            setActiveMeeting(data.data);
            const acts = Array.isArray(data.data.activities) ? data.data.activities : [];
            if (acts.length > 0) {
              const mainAct = acts.find((a: any) => a.type === 'main') || acts[0];
              setSelectedPrograms([mainAct.id]);
            } else {
              setSelectedPrograms(['main']);
            }
          } else {
            setActiveMeeting(null);
          }
          setLoadingMeeting(false);
        }
      })
      .catch(err => {
        console.error('Error fetching latest active meeting:', err);
        if (isMounted) {
          setActiveMeeting(null);
          setLoadingMeeting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute effective activities list
  const effectiveActivities: MeetingActivity[] = useMemo(() => {
    if (!activeMeeting) return [];
    if (Array.isArray(activeMeeting.activities) && activeMeeting.activities.length > 0) {
      return activeMeeting.activities;
    }
    return [
      {
        id: 'main',
        type: 'main',
        name: activeMeeting.meeting_name || 'Main Program',
        date: activeMeeting ? formatMeetingDateDisplay(activeMeeting, lang) : undefined,
        memberPrice: activeMeeting.base_price || 3500,
        nonMemberPrice: activeMeeting.base_price ? activeMeeting.base_price + 1000 : 4500,
      }
    ];
  }, [activeMeeting, lang]);

  // Check if any selected program is a workshop
  const hasWorkshopSelected = useMemo(() => {
    return effectiveActivities.some(a => selectedPrograms.includes(a.id) && a.type === 'workshop');
  }, [effectiveActivities, selectedPrograms]);

  const toggleProgram = (key: string) => {
    setSelectedPrograms(prev => {
      let next: string[];
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        next = prev.filter(k => k !== key);
      } else {
        next = [...prev, key];
      }

      // Check if newly selected programs contain format restrictions
      const selectedActs = effectiveActivities.filter(a => next.includes(a.id));
      const hasOnsiteOnly = selectedActs.some(a => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
      const hasOnlineOnly = selectedActs.some(a => a.format === 'online');
      if (hasOnsiteOnly) {
        setAttendanceType('onsite');
      } else if (hasOnlineOnly) {
        setAttendanceType('online');
      }

      return next;
    });
  };

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Form State for Conference Registration
  const [formData, setFormData] = useState({
    memberNo: '',
    nameTh: '',
    nameEn: '',
    workplace: '',
    position: 'ไม่ระบุ',
    positionOther: '',
    specialCode: '',
    email: '',
  });

  // Autofill only when explicitly targeted for conference registration
  useEffect(() => {
    if (autofillTarget === 'conference' && (initialGoogleUser?.name || initialGoogleUser?.email)) {
      const { nameTh, nameEn } = parseGoogleName(
        initialGoogleUser.name,
        initialGoogleUser.given_name,
        initialGoogleUser.family_name
      );
      setFormData(prev => ({
        ...prev,
        nameTh: nameTh || '',
        nameEn: nameEn || '',
        email: initialGoogleUser.email || '',
      }));
      setAutofillSuccess(true);
      const timer = setTimeout(() => setAutofillSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [initialGoogleUser, autofillTarget]);

  // Tab switching clears fetched data & form fields across tabs
  const handleTabChange = (tab: 'conference' | 'membership') => {
    setActiveTab(tab);
    setFormData({
      memberNo: '',
      nameTh: '',
      nameEn: '',
      workplace: '',
      position: 'ไม่ระบุ',
      positionOther: '',
      specialCode: '',
      email: '',
    });
    setAutofillSuccess(false);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Handle Google Autofill Button - triggers Google OAuth with account picker
  const handleGoogleAutofill = () => {
    if (onGoogleAutofill) {
      onGoogleAutofill(activeTab);
    } else {
      onGoogleSignIn();
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    let sanitizedValue = value;
    if (field === 'nameTh') {
      sanitizedValue = value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, '');
    } else if (field === 'nameEn') {
      sanitizedValue = value.replace(/[^a-zA-Z\s\.\-']/g, '');
    } else if (field === 'memberNo') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  // Expired Member Modal state
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);
  const [expiredMemberInfo, setExpiredMemberInfo] = useState<{
    memberName?: string;
    memberNo?: string;
    expireDate?: string | null;
    statusText?: string;
  } | null>(null);
  const [pendingRegPayload, setPendingRegPayload] = useState<any | null>(null);
  const [verifyingMember, setVerifyingMember] = useState(false);

  // Submit conference registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeMeeting) {
      alert(lang === 'th' ? 'ไม่มีรอบการประชุมที่เปิดรับลงทะเบียน' : 'No active conference available for registration');
      return;
    }

    const selectedActivityObjects = effectiveActivities
      .filter(a => selectedPrograms.includes(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        date: a.date,
        format: a.format || (a.type === 'workshop' ? 'onsite' : 'both'),
        memberPrice: a.memberPrice,
        nonMemberPrice: a.nonMemberPrice,
      }));

    const onsiteOnlyActs = selectedActivityObjects.filter(a => a.format === 'onsite');
    const hasOnsiteOnlySelected = onsiteOnlyActs.length > 0;

    const programLabel = selectedActivityObjects.map(a => a.name).join(' + ');
    const finalPosition = (formData.position === 'อื่นๆ' || formData.position === '0 อื่นๆ')
      ? (formData.positionOther || (lang === 'th' ? 'อื่นๆ' : 'Other'))
      : (formData.position || (lang === 'th' ? 'ไม่ระบุ' : 'Unspecified'));

    const rawMemberNo = formData.memberNo.trim();

    // ── Form Validation ──────────────────────────────────────────────────────────
    // บังคับกรอก: ชื่อ-นามสกุล (ภาษาไทย), ชื่อ-นามสกุล (ภาษาอังกฤษ), อีเมล, และ หน่วยงาน
    if (!formData.nameTh.trim()) {
      alert(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' : 'Please enter your Full Name (Thai)');
      return;
    }

    if (!formData.nameEn.trim()) {
      alert(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษ)' : 'Please enter your Full Name (English)');
      return;
    }

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      alert(lang === 'th' ? 'กรุณากรอกอีเมล' : 'Please enter your Email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      alert(lang === 'th' ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'Please enter a valid email address');
      return;
    }

    if (!formData.workplace.trim()) {
      alert(lang === 'th' ? 'กรุณากรอกสถานที่ทำงาน/หน่วยงาน' : 'Please enter your Workplace / Organization');
      return;
    }

    let isMemberCalculated = false;
    let isExpiredMember = false;
    let memberDataFound: any = null;

    if (rawMemberNo) {
      setVerifyingMember(true);
      try {
        const res = await fetch(`/api/members/verify/${encodeURIComponent(rawMemberNo)}`);
        const result = await res.json();

        if (result.success && result.data) {
          memberDataFound = result.data;
          const status = (memberDataFound.membership_status || '').toLowerCase().trim();
          let active = status === 'active' || status === '';

          if (status === 'inactive' || status === 'expired' || status === 'cancelled') {
            active = false;
          }

          if (memberDataFound.expire_date) {
            const expDate = new Date(memberDataFound.expire_date);
            if (!isNaN(expDate.getTime())) {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              if (expDate.getTime() < now.getTime()) {
                active = false;
              }
            }
          }

          if (!active) {
            isExpiredMember = true;
            isMemberCalculated = false;
          } else {
            isMemberCalculated = true;
          }
        } else {
          // Member not found in database -> Treat as non-member
          isMemberCalculated = false;
        }
      } catch (err) {
        console.error('Member verification error:', err);
      } finally {
        setVerifyingMember(false);
      }
    }

    // Validation: Main program online attendance is strictly reserved for active members
    if (attendanceType === 'online') {
      if (hasOnsiteOnlySelected) {
        alert(
          lang === 'th'
            ? `หลักสูตร "${onsiteOnlyActs.map(a => a.name).join(', ')}" กำหนดให้เข้าร่วมแบบ Onsite (ที่งาน) เท่านั้น`
            : `Course "${onsiteOnlyActs.map(a => a.name).join(', ')}" requires Onsite attendance only.`
        );
        return;
      }

      if (!rawMemberNo) {
        alert(lang === 'th' ? 'การเข้าร่วมแบบ Online สงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ เท่านั้น กรุณากรอกเลขสมาชิก หรือเลือกรูปแบบ Onsite' : 'Online attendance is reserved for TSRM members only. Please enter your Member No. or select Onsite.');
        return;
      }

      if (!isMemberCalculated && !isExpiredMember) {
        alert(lang === 'th' ? 'ไม่พบข้อมูลสมาชิกในระบบ TSRM การเข้าร่วมแบบ Online สงวนสิทธิ์เฉพาะสมาชิกเท่านั้น' : 'Member record not found. Online attendance is reserved for TSRM members only.');
        return;
      }
    }

    const regPayload = {
      category: 'conference',
      meetingId: activeMeeting.meeting_id,
      meetingName: activeMeeting.meeting_name,
      meetingDate: activeMeeting.meeting_date,
      meetingLocation: activeMeeting.location,
      pricingTiers: activeMeeting.pricing_tiers,
      basePrice: activeMeeting.base_price,
      selectedProgramIds: selectedPrograms,
      selectedActivities: selectedActivityObjects,
      programKey: selectedPrograms.join(','),
      programNameTh: programLabel || activeMeeting.meeting_name,
      programNameEn: programLabel || activeMeeting.meeting_name,
      attendanceType: attendanceType,
      memberNo: rawMemberNo,
      isMember: isMemberCalculated,
      isExpiredMember: isExpiredMember,
      memberStatus: isExpiredMember ? 'expired' : (isMemberCalculated ? 'active' : 'non_member'),
      expireDate: memberDataFound?.expire_date || null,
      nameTh: formData.nameTh.trim() || memberDataFound?.full_name_th || (lang === 'th' ? 'ผู้เข้าร่วมงานประชุม' : 'Conference Attendee'),
      nameEn: formData.nameEn.trim() || memberDataFound?.full_name_en || 'Conference Attendee',
      workplace: formData.workplace.trim() || memberDataFound?.workplace || '',
      position: finalPosition,
      positionCode: formData.position,
      specialCode: formData.specialCode.trim(),
      email: formData.email.trim() || memberDataFound?.email || 'attendee@tsrm.org',
      registeredAt: new Date().toISOString(),
    };

    // Check for duplicate registration for this meeting
    try {
      const emailToCheck = formData.email.trim() || memberDataFound?.email || '';
      const checkRes = await fetch(
        `/api/meetings/${encodeURIComponent(activeMeeting.meeting_id)}/check-registration?memberNo=${encodeURIComponent(rawMemberNo)}&email=${encodeURIComponent(emailToCheck)}`
      );
      const checkData = await checkRes.json();
      if (checkData.success && checkData.isRegistered) {
        alert(
          checkData.message ||
          (lang === 'th'
            ? 'ท่านได้ลงทะเบียนเข้าร่วมงานประชุมนี้ในระบบเรียบร้อยแล้ว ไม่สามารถลงทะเบียนซ้ำได้'
            : 'You have already registered for this conference.')
        );
        return;
      }
    } catch (checkErr) {
      console.error('Error checking duplicate registration:', checkErr);
    }

    // If member status is expired, prompt with ExpiredMemberModal before proceeding to payment
    if (isExpiredMember) {
      setExpiredMemberInfo({
        memberName: memberDataFound?.full_name_th || formData.nameTh || 'สมาชิก TSRM',
        memberNo: memberDataFound?.member_no || rawMemberNo,
        expireDate: memberDataFound?.expire_date,
        statusText: memberDataFound?.membership_status || (lang === 'th' ? 'หมดอายุ (Expired)' : 'Expired'),
      });
      setPendingRegPayload(regPayload);
      setExpiredModalOpen(true);
      return;
    }

    try {
      localStorage.setItem('conference_registration', JSON.stringify(regPayload));
    } catch (e) {
      console.error('Failed to save registration to localStorage', e);
    }

    // Directly navigate to payment page with registration type
    router.push('/payment?type=registration');
  };

  const handleProceedExpiredNonMember = () => {
    if (pendingRegPayload) {
      try {
        localStorage.setItem('conference_registration', JSON.stringify(pendingRegPayload));
      } catch (e) {
        console.error('Failed to save registration to localStorage', e);
      }
    }
    setExpiredModalOpen(false);
    router.push('/payment?type=registration');
  };

  const handleRenewMembershipFromModal = () => {
    setExpiredModalOpen(false);
    handleTabChange('membership');
  };

  const handleMembershipComplete = () => {
    router.push('/payment?type=membership');
  };


  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-3.5 xs:px-4 sm:px-8 lg:px-12 pt-4 sm:pt-8 pb-6 sm:pb-9 rounded-b-[24px] sm:rounded-b-[36px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl xl:max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0 group hover:opacity-95 transition">
              <TsrmLogo className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 group-hover:scale-105 transition-transform" />
              <div className="min-w-0">
                <span className="text-[10px] xs:text-xs sm:text-[13px] md:text-sm font-bold text-blue-200 block whitespace-nowrap leading-tight">
                  {t.associationName}
                </span>
                <p className="text-xs xs:text-sm sm:text-base font-extrabold text-white leading-tight">{t.brandName}</p>
              </div>
            </div>

            {/* Top Right Actions: Search Member + Language Switcher */}
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
              {/* Member Search Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs group shrink-0"
                title={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
                aria-label={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
              >
                <Search className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-[#4ade80] group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold whitespace-nowrap">{lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}</span>
              </button>

              {/* Language Switcher Pill */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-0.5 xs:gap-1 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-1.5 xs:px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                title="Switch Language / สลับภาษา"
              >
                <Globe className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-200 shrink-0" />
                <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
                <span className="text-white/40 font-normal">|</span>
                <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
              </button>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-1">
            {lang === 'th' ? 'ลงทะเบียนและสมัครสมาชิก TSRM' : 'TSRM Registration & Membership'}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-blue-100/90 leading-relaxed mt-1 font-normal">
            {lang === 'th'
              ? 'เลือกลงทะเบียนเข้าร่วมงานประชุมวิชาการ หรือ สมัครสมาชิกสมาคมฯ'
              : 'Register for Conference Summit or apply for TSRM membership'}
          </p>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-4 sm:px-8 lg:px-12 py-5 sm:py-8 flex-1 flex flex-col justify-between max-w-5xl xl:max-w-6xl mx-auto w-full">
        <div className="space-y-4 sm:space-y-6">

          {/* Main Action Segmented Buttons (Call to Action Tabs) */}
          <div className="relative grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-200/90 shadow-inner select-none max-w-xl mx-auto w-full">
            {/* Sliding Active Indicator Pill */}
            <div
              aria-hidden="true"
              className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] shadow-md shadow-blue-950/25 ring-2 ring-[#4ade80]/50 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none will-change-transform ${activeTab === 'membership' ? 'translate-x-full' : 'translate-x-0'
                }`}
            />

            {/* Tab 1: ลงทะเบียนเข้าร่วมงานประชุม (Left) */}
            <button
              type="button"
              onClick={() => handleTabChange('conference')}
              className={`relative z-10 flex items-center justify-center gap-2 py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-colors duration-200 cursor-pointer active:scale-98 ${activeTab === 'conference'
                ? 'text-white'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Ticket
                className={`w-4 h-4 shrink-0 transition-colors duration-200 ${activeTab === 'conference' ? 'text-[#4ade80]' : 'text-slate-400'
                  }`}
              />
              <span className="truncate">{lang === 'th' ? 'ลงทะเบียนเข้าร่วมงานประชุม' : 'Register Conference'}</span>
            </button>

            {/* Tab 2: สมัครสมาชิก TSRM (Right) */}
            <button
              type="button"
              onClick={() => handleTabChange('membership')}
              className={`relative z-10 flex items-center justify-center gap-2 py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-colors duration-200 cursor-pointer active:scale-98 ${activeTab === 'membership'
                ? 'text-white'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <UserPlus
                className={`w-4 h-4 shrink-0 transition-colors duration-200 ${activeTab === 'membership' ? 'text-[#4ade80]' : 'text-slate-400'
                  }`}
              />
              <span className="truncate">{lang === 'th' ? 'สมัครสมาชิก TSRM' : 'TSRM Membership'}</span>
            </button>
          </div>

          {/* View 1: Conference Registration Form */}
          {activeTab === 'conference' ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm space-y-4 sm:space-y-5 animate-fade-in">
              {loadingMeeting ? (
                /* Loading Skeleton / State */
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 space-y-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs sm:text-sm font-bold text-slate-500">
                    {lang === 'th' ? 'กำลังโหลดข้อมูลการประชุมล่าสุด...' : 'Loading latest conference data...'}
                  </p>
                </div>
              ) : !activeMeeting ? (
                /* No Active Meeting State (Disabled registration) */
                <div className="bg-gradient-to-b from-amber-50/90 to-orange-50/40 border border-amber-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                    <CalendarX className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-xs xs:text-sm sm:text-lg font-black text-slate-900">
                      {lang === 'th' ? 'ยังไม่มีการประชุมที่เปิดรับลงทะเบียนในขณะนี้' : 'No Active Conference Open for Registration'}
                    </h3>
                    <p className="text-[10px] xs:text-[11px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {lang === 'th'
                        ? 'ขณะนี้ยังไม่มีรอบการประชุมวิชาการที่เปิดรับลงทะเบียน กรุณาติดตามข่าวสารจากทางสมาคมฯ หรือเลือกสมัครสมาชิก TSRM เพื่อรับสิทธิประโยชน์ล่วงหน้า'
                        : 'There are currently no active conference registrations available. Please stay tuned for announcements or apply for TSRM membership to receive advance privileges.'}
                    </p>
                  </div>
                  <div className="pt-1 sm:pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleTabChange('membership')}
                      className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#0026b3] hover:bg-[#001f94] text-white font-black text-xs sm:text-sm py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-md transition active:scale-98 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ไปยังหน้าสมัครสมาชิก TSRM' : 'Go to TSRM Membership'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Meeting Found: Dynamic Registration Form */
                <>
                  {/* Latest Meeting Banner */}
                  <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-100/90 rounded-xl sm:rounded-2xl p-3 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="bg-[#0026b3] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {lang === 'th' ? 'การประชุมล่าสุด' : 'LATEST CONFERENCE'}
                        </span>
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {lang === 'th' ? 'เปิดรับลงทะเบียน' : 'Open for Registration'}
                        </span>
                      </div>
                      <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight truncate" title={activeMeeting.meeting_name}>
                        {activeMeeting.meeting_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {(activeMeeting.start_date || activeMeeting.meeting_date) && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                            <span>{formatMeetingDateDisplay(activeMeeting, lang)}</span>
                          </span>
                        )}
                        {activeMeeting.location && (
                          <span className="flex items-center gap-1 font-medium truncate max-w-xs sm:max-w-sm" title={activeMeeting.location}>
                            <MapPin className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                            <span className="truncate">{activeMeeting.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Google Autofill Button with Accent Pill */}
                  <div className="space-y-1.5 max-w-md mx-auto w-full">
                    <button
                      type="button"
                      onClick={handleGoogleAutofill}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="text-[11px] xs:text-xs sm:text-sm font-black text-slate-800 tracking-tight truncate">
                            {lang === 'th' ? 'กรอกข้อมูลอัตโนมัติด้วย Google' : 'Autofill with Google'}
                          </p>
                          <span className="text-[9px] xs:text-[10px] text-slate-500 font-medium block truncate">
                            {lang === 'th' ? 'ดึงชื่อและอีเมลจากบัญชีของคุณอัตโนมัติ' : 'Automatically fill name and email'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] xs:text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 sm:px-2 py-0.5 rounded-md">
                          {lang === 'th' ? 'แนะนำ' : 'Recommended'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    </button>
                    {autofillSuccess && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'th' ? 'กรอกข้อมูลจาก Google สำเร็จ!' : 'Autofilled from Google successfully!'}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-1.5 sm:my-2">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-2.5 sm:px-3 text-[9.5px] xs:text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase absolute">
                      {lang === 'th' ? 'หรือ กรอกข้อมูลด้วยตนเอง' : 'Or fill in details'}
                    </span>
                  </div>

                  {/* Registration Form with 7 Specified Fields */}
                  <form onSubmit={handleSubmitRegistration} className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                      {/* 1. ชื่อ-นามสกุล(ไทย) */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาไทย)' : 'Full Name (Thai)'} <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.nameTh}
                            onChange={(e) => handleInputChange('nameTh', e.target.value)}
                            placeholder={lang === 'th' ? 'ชื่อ-นามสกุล (ไม่ต้องมีคำนำหน้า)' : 'Full Name (Without prefix)'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 2. ชื่อ-นามสกุล(อังกฤษ) */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาอังกฤษ)' : 'Full Name (English)'} <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.nameEn}
                            onChange={(e) => handleInputChange('nameEn', e.target.value)}
                            placeholder="Full Name (Without prefix)"
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 3. อีเมล (Email) */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'อีเมล (Email)' : 'Email Address'} <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder={lang === 'th' ? 'เช่น yourname@gmail.com' : 'e.g. yourname@gmail.com'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 4. หน่วยงาน */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'หน่วยงาน' : 'Organization / Workplace'} <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.workplace}
                            onChange={(e) => handleInputChange('workplace', e.target.value)}
                            placeholder={lang === 'th' ? 'เช่น โรงพยาบาล / คลินิก / บริษัท' : 'e.g. Hospital / Clinic / Company'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 5. ตำแหน่ง (Select + Other input) */}
                      <div>
                        <PositionSelect
                          value={formData.position}
                          onChange={(val) => handleInputChange('position', val)}
                          otherValue={formData.positionOther}
                          onOtherChange={(val) => handleInputChange('positionOther', val)}
                          required
                          label={lang === 'th' ? 'ตำแหน่ง' : 'Position'}
                        />
                      </div>

                      {/* 6. รหัสสมาชิก (Member ID) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
                            {lang === 'th' ? 'รหัสสมาชิก TSRM' : 'TSRM Member No.'}
                          </label>
                          <span className="text-[9.5px] xs:text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            {lang === 'th' ? 'รับสิทธิ์ราคาพิเศษ' : 'For Special Rate'}
                          </span>
                        </div>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.memberNo}
                            onChange={(e) => handleInputChange('memberNo', e.target.value)}
                            placeholder={lang === 'th' ? 'เช่น 0001 (เว้นว่างได้ถ้าไม่ใช่สมาชิก)' : 'e.g. 0001 (Leave blank if non-member)'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 7. รหัสพิเศษ (Special Code) */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
                            {lang === 'th' ? 'รหัสพิเศษ (ถ้ามี)' : 'Special Code (Optional)'}
                          </label>
                          <span className="text-[9.5px] xs:text-[10px] text-slate-500 font-medium">
                            {lang === 'th' ? 'สำหรับผู้ได้รับสิทธิ์พิเศษหรือส่วนลด' : 'For sponsor / discount codes'}
                          </span>
                        </div>
                        <div className="relative">
                          <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.specialCode}
                            onChange={(e) => handleInputChange('specialCode', e.target.value)}
                            placeholder={lang === 'th' ? 'กรอกรหัสโปรโมชั่น / Sponsor Code' : 'Enter Special / Promo Code'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition uppercase tracking-wider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Program Selection Cards (Activities dynamically from DB) */}
                    <div className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#0026b3]" />
                          <span>{lang === 'th' ? 'เลือกหลักสูตรที่ต้องการเข้าร่วม' : 'Select Program / Courses'}</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <span className="text-[10px] xs:text-[11px] font-semibold text-slate-500">
                          {lang === 'th' ? `เลือกแล้ว ${selectedPrograms.length} รายการ` : `${selectedPrograms.length} selected`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {effectiveActivities.map((act) => {
                          const isSelected = selectedPrograms.includes(act.id);

                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => toggleProgram(act.id)}
                              className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] relative overflow-hidden ${isSelected
                                ? 'bg-blue-50/90 border-[#0026b3] text-slate-900 shadow-2xs ring-1.5 ring-[#0026b3]/30 font-bold'
                                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                                }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${act.type === 'main'
                                    ? (isSelected ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-700')
                                    : (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700')
                                    }`}>
                                    {act.type === 'main' ? (lang === 'th' ? 'หลักสูตรหลัก' : 'Main') : (lang === 'th' ? 'เวิร์กช็อป' : 'Workshop')}
                                  </span>

                                  {/* Format Badge */}
                                  {(() => {
                                    const fmt = act.format || (act.type === 'workshop' ? 'onsite' : 'both');
                                    return (
                                      <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 border ${fmt === 'online'
                                        ? (isSelected ? 'bg-blue-100 text-[#0026b3] border-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200')
                                        : fmt === 'both'
                                          ? (isSelected ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-50 text-purple-700 border-purple-200')
                                          : (isSelected ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                        }`}>
                                        {fmt === 'online' ? '💻 Online' : fmt === 'both' ? '🌐 Hybrid' : '🏢 Onsite'}
                                      </span>
                                    );
                                  })()}

                                  {act.date && (
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{act.date}</span>
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug truncate" title={act.name}>
                                  {act.name}
                                </h4>
                              </div>

                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#0026b3] text-white shadow-2xs' : 'border border-slate-300 bg-white'
                                }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Attendance Format: Onsite vs Online */}
                    {(() => {
                      const selectedActs = effectiveActivities.filter(a => selectedPrograms.includes(a.id));
                      const onsiteOnlyActs = selectedActs.filter(a => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
                      const onlineOnlyActs = selectedActs.filter(a => a.format === 'online');
                      const hasOnsiteOnly = onsiteOnlyActs.length > 0;
                      const hasOnlineOnly = onlineOnlyActs.length > 0;

                      return (
                        <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                          <label className="text-[11px] sm:text-xs font-bold text-slate-700 block">
                            {lang === 'th' ? 'รูปแบบการเข้าร่วม (Attendance Format)' : 'Attendance Format'}
                          </label>

                          <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                            {/* Onsite */}
                            <button
                              type="button"
                              disabled={hasOnlineOnly}
                              onClick={() => {
                                if (!hasOnlineOnly) setAttendanceType('onsite');
                              }}
                              className={`py-2.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${hasOnlineOnly
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : attendanceType === 'onsite'
                                  ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              title={hasOnlineOnly ? (lang === 'th' ? 'มีหลักสูตรที่เปิดรับเฉพาะ Online เท่านั้น' : 'Includes Online-only courses') : ''}
                            >
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{lang === 'th' ? 'Onsite (ที่งาน)' : 'Onsite'}</span>
                            </button>

                            {/* Online */}
                            <button
                              type="button"
                              disabled={hasOnsiteOnly}
                              onClick={() => {
                                if (!hasOnsiteOnly) setAttendanceType('online');
                              }}
                              className={`py-2.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${hasOnsiteOnly
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : attendanceType === 'online'
                                  ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              title={hasOnsiteOnly ? (lang === 'th' ? 'มีหลักสูตรที่เปิดรับเฉพาะ Onsite เท่านั้น' : 'Includes Onsite-only courses') : ''}
                            >
                              <Monitor className="w-4 h-4 shrink-0" />
                              <span className="truncate">{lang === 'th' ? 'Online (ออนไลน์)' : 'Online'}</span>
                            </button>
                          </div>

                          {/* Onsite only notice */}
                          {hasOnsiteOnly && (
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200/70 text-amber-800 text-[10.5px] xs:text-[11px] leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                {lang === 'th'
                                  ? `หลักสูตร "${onsiteOnlyActs.map(a => a.name).join(', ')}" บังคับเข้าร่วม ณ สถานที่จัดงานจริง (Onsite)`
                                  : `Course "${onsiteOnlyActs.map(a => a.name).join(', ')}" requires Onsite attendance.`}
                              </span>
                            </div>
                          )}

                          {/* Online only notice */}
                          {hasOnlineOnly && (
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-800 text-[10.5px] xs:text-[11px] leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>
                                {lang === 'th'
                                  ? `หลักสูตร "${onlineOnlyActs.map(a => a.name).join(', ')}" จัดการเรียนผ่านระบบ Online เท่านั้น`
                                  : `Course "${onlineOnlyActs.map(a => a.name).join(', ')}" is Online only.`}
                              </span>
                            </div>
                          )}

                          {/* Format Change Fee Notice (1,000 THB) */}
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 text-[10.5px] xs:text-[11px] leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            <span>
                              {lang === 'th'
                                ? `หมายเหตุ: หากต้องการเปลี่ยนรูปแบบการเข้าร่วมภายหลัง จะมีค่าธรรมเนียมการเปลี่ยนรูปแบบ ${((activeMeeting?.pricing_tiers?.changeFee?.onsiteMember || 1000)).toLocaleString()} บาท ตามที่ระบุไว้ในเงื่อนไขการประชุม`
                                : `Note: If you request to change attendance format later, a ${((activeMeeting?.pricing_tiers?.changeFee?.onsiteMember || 1000)).toLocaleString()} THB fee will apply as specified in event policy.`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* High-Impact Call to Action Button to Payment Page */}
                    <button
                      type="submit"
                      disabled={selectedPrograms.length === 0 || verifyingMember}
                      className={`w-full font-black py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base border border-blue-400/20 relative overflow-hidden mt-2 sm:mt-3 ${selectedPrograms.length === 0 || verifyingMember
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white shadow-blue-900/30 hover:shadow-blue-900/40 cursor-pointer active:scale-[0.99] group'
                        }`}
                    >
                      {/* Top glowing accent green line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />

                      {verifyingMember ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                          <span className="tracking-wide">
                            {lang === 'th' ? 'กำลังตรวจสอบสถานะสมาชิก...' : 'Verifying membership...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="tracking-wide">
                            {lang === 'th' ? 'ดำเนินการต่อไปยังขั้นตอนชำระเงิน' : 'Proceed to Payment'}
                          </span>
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                          </div>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (

            /* View 2: TSRM Membership Application Form (Embedded cleanly) */
            <div className="w-full animate-fade-in">
              <SignupView
                isEmbedded={true}
                onNavigateToLogin={() => handleTabChange('conference')}
                onSubmitSignup={handleMembershipComplete}
                onGoogleSignUp={() => {
                  if (onGoogleAutofill) {
                    onGoogleAutofill('membership');
                  } else {
                    onGoogleSignIn();
                  }
                }}
                initialUserData={
                  autofillTarget === 'membership' && initialGoogleUser
                    ? {
                      name: initialGoogleUser.name || undefined,
                      email: initialGoogleUser.email || undefined,
                      picture: initialGoogleUser.picture || undefined,
                      given_name: initialGoogleUser.given_name || undefined,
                      family_name: initialGoogleUser.family_name || undefined,
                    }
                    : null
                }
              />
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="text-center pt-5 pb-2 space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <Shield className="w-3.5 h-3.5 text-[#0026b3]" />
              {t.login.securityBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Participant Search Modal */}
      <ParticipantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Expired Member Status Feedback Modal */}
      <ExpiredMemberModal
        isOpen={expiredModalOpen}
        onClose={() => setExpiredModalOpen(false)}
        onProceedNonMember={handleProceedExpiredNonMember}
        onRenewMembership={handleRenewMembershipFromModal}
        memberName={expiredMemberInfo?.memberName}
        memberNo={expiredMemberInfo?.memberNo}
        expireDate={expiredMemberInfo?.expireDate}
        statusText={expiredMemberInfo?.statusText}
      />
    </div>
  );
}


