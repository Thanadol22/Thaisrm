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
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
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

  // Track scroll position for hero parallax effect
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer to trigger smooth staggered entrance animations for the registration form
  const formRef = useRef<HTMLDivElement>(null);
  const [isFormInView, setIsFormInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsFormInView(true);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );

    if (formRef.current) {
      observer.observe(formRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToRegistration = (tab?: 'conference' | 'membership') => {
    if (tab) {
      handleTabChange(tab);
    }
    const el = document.getElementById('registration-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  // Dynamically extract all conference details from database (activeMeeting)
  const meetingInfo = useMemo(() => {
    const rawName = activeMeeting?.meeting_name || '34th TSRM 2026';
    const rawId = activeMeeting?.meeting_id || 'TSRM34';
    const loc = activeMeeting?.location || 'Grande Centre Point Lumphini, Bangkok';
    const desc = activeMeeting?.description;

    // Detect edition number like "34" from "TSRM 34" or "34th TSRM 2026"
    const editionMatch = rawName.match(/(\d{1,2})(?:st|nd|rd|th)?/i) || rawId.match(/TSRM\s*(\d+)/i) || ['34', '34'];
    const editionNum = editionMatch[1] || '34';

    // Detect year like "2026" or "2569"
    const yearMatch = rawName.match(/(20\d{2}|25\d{2})/);
    const yearText = yearMatch ? yearMatch[1] : '2026';

    const displayName = rawName || `${editionNum}th TSRM ${yearText}`;

    return {
      editionNum,
      yearText,
      displayName,
      badgeTextTh: `การประชุมวิชาการประจำปี ครั้งที่ ${editionNum} • ${rawId || `TSRM ${yearText}`}`,
      badgeTextEn: `The ${editionNum}th Annual Conference • ${rawId || `TSRM ${yearText}`}`,
      location: loc,
      descriptionTh: desc || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย ขอเชิญร่วมงานประชุมวิชาการประจำปี 2569',
      descriptionEn: desc || 'Thai Society for Reproductive Medicine 34th Annual Scientific Conference',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(loc)}`,
    };
  }, [activeMeeting]);

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
    setFormData(prev => ({ ...prev, [field]: value }));
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
      email: formData.email.trim() || memberDataFound?.email || 'attendee@thaisrm.org',
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
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full min-h-[100dvh] bg-slate-950 text-white overflow-hidden flex flex-col justify-between">
        {/* Parallax Background Image - Positioned at top to show the illuminated hotel rooftop */}
        <div
          className="absolute inset-0 w-full h-[140%] top-0 bg-cover bg-[center_70%] will-change-transform pointer-events-none transition-transform duration-100 ease-out brightness-[1.12] contrast-[1.06] saturate-[1.12]"
          style={{
            backgroundImage: `url('/location.jpg')`,
            transform: `translate3d(0, ${Math.min(scrollY * 0.25, 140)}px, 0) scale(${1.02 + Math.min(scrollY * 0.0002, 0.05)})`,
          }}
        />

        {/* Top Vignette for Navbar Readability */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-radial-[at_center_top] from-transparent via-slate-950/15 to-transparent pointer-events-none" />
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[160px] bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Glassmorphism Navbar */}
        <header className="relative z-20 w-full px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4.5 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-[#4ade80] rounded-full blur-xs opacity-60 group-hover:opacity-100 transition duration-300" />
                <ThaiSrmLogo className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 group-hover:scale-105 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#4ade80] uppercase block truncate">
                  {t.associationName}
                </span>
                <p className="text-xs sm:text-sm font-black text-white tracking-tight">
                  {t.brandName}
                </p>
              </div>
            </div>

            {/* Top Right Action Tools */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Member Search Trigger */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-xl text-xs font-bold transition border border-white/15 cursor-pointer active:scale-95 shadow-md group"
                title={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
                aria-label={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
              >
                <Search className="w-4 h-4 text-[#4ade80] group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline font-semibold">{lang === 'th' ? 'ค้นหาสมาชิก' : 'Search Member'}</span>
              </button>

              {/* Language Switcher */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition border border-white/15 cursor-pointer active:scale-95 shadow-md"
                title="Switch Language / สลับภาษา"
              >
                <Globe className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span className={lang === 'th' ? 'text-[#4ade80] font-black' : 'text-slate-400'}>TH</span>
                <span className="text-white/30 font-normal">|</span>
                <span className={lang === 'en' ? 'text-[#4ade80] font-black' : 'text-slate-400'}>EN</span>
              </button>
            </div>
          </div>
        </header>

        {/* Center Hero Showcase (Fully Dynamic from Database - Centered in Fullscreen) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 w-full">

          {/* Top Shimmering Badge - Dynamic from DB */}
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-900/80 border border-[#4ade80]/50 backdrop-blur-md shadow-lg shadow-[#4ade80]/15 mb-3.5 sm:mb-4 animate-slide-down">
            <Sparkles className="w-3.5 h-3.5 text-[#4ade80] animate-pulse" />
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-[#4ade80] uppercase">
              {lang === 'th' ? meetingInfo.badgeTextTh : meetingInfo.badgeTextEn}
            </span>
          </div>

          {/* Main Dynamic Title: e.g. 34th TSRM 2026 */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12] max-w-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            <span className="bg-gradient-to-r from-white via-blue-100 to-[#4ade80] bg-clip-text text-transparent">
              {meetingInfo.displayName}
            </span>
          </h1>

          {/* Dynamic Description Subtitle */}
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-base lg:text-lg font-medium text-blue-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] max-w-2xl leading-relaxed">
            {lang === 'th' ? meetingInfo.descriptionTh : meetingInfo.descriptionEn}
          </p>

          {/* Luxury Venue Feature Card - Dynamic from DB */}
          <div className="mt-5 sm:mt-6 w-full max-w-2xl bg-slate-900/75 hover:bg-slate-900/85 backdrop-blur-xl border border-white/20 hover:border-[#4ade80]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-2xl transition-all duration-300 group">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">

              {/* Left Column: Venue Icon & Information */}
              <div className="flex items-center sm:items-start gap-3.5 text-left min-w-0 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0026b3] via-blue-700 to-[#001c8c] border border-blue-400/40 flex items-center justify-center shrink-0 shadow-lg text-[#4ade80] group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#4ade80]">
                    <MapPin className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                    <span>{lang === 'th' ? 'สถานที่จัดงาน (Official Venue)' : 'Official Venue'}</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-white tracking-tight mt-0.5 group-hover:text-[#4ade80] transition-colors truncate">
                    {meetingInfo.location}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium truncate">
                    {lang === 'th' ? 'โรงแรม แกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ' : 'Grande Centre Point Lumphini, Bangkok'}
                  </p>
                </div>
              </div>

              {/* Right Column: Date & Google Maps Trigger */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    {lang === 'th' ? 'กำหนดการจัดงาน' : 'Conference Date'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-blue-200">
                    {activeMeeting ? formatMeetingDateDisplay(activeMeeting, lang) : (lang === 'th' ? 'เร็วๆ นี้' : 'Coming Soon')}
                  </span>
                </div>

                <a
                  href={meetingInfo.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition shadow-xs"
                >
                  <span>{lang === 'th' ? 'ดูแผนที่สถานที่' : 'Google Maps'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Floating Scroll-Down Micro Indicator */}
        <div className="relative z-20 pb-5 sm:pb-7 flex flex-col items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={() => scrollToRegistration()}
            className="inline-flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all cursor-pointer group"
            title={lang === 'th' ? 'เลื่อนลงเพื่อลงทะเบียน' : 'Scroll to register'}
          >
            <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-slate-300 group-hover:text-[#4ade80] transition-colors drop-shadow-sm">
              {lang === 'th' ? 'เลื่อนลงเพื่อลงทะเบียน' : 'Scroll to Register'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-hover:translate-y-1 shadow-md animate-bounce">
              <ChevronDown className="w-4 h-4 text-[#4ade80]" />
            </div>
          </button>
        </div>

        {/* Seamless Soft Bottom Fade Overlay with reduced distance */}
        <div className="absolute inset-x-0 -bottom-[1px] h-24 sm:h-32 lg:h-36 bg-gradient-to-t from-[#f6f8fc] from-15% via-[#f6f8fc]/60 to-transparent pointer-events-none z-10" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 📋 REGISTRATION SECTION (Smooth Progressive Scroll Reveal)          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        ref={formRef}
        id="registration-section"
        className={`relative z-20 scroll-mt-6 px-4 sm:px-8 lg:px-12 pt-4 sm:pt-8 pb-12 sm:pb-16 flex-1 flex flex-col justify-between max-w-5xl xl:max-w-6xl mx-auto w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${isFormInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-[0.98]'
          }`}
      >
        <div className="space-y-4 sm:space-y-6">

          {/* Main Action Segmented Buttons (Call to Action Tabs) - Staggered Bounce 1 */}
          <div className={`relative grid grid-cols-2 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 select-none max-w-xl mx-auto w-full transition-all duration-700 delay-100 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
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

          {/* View 1: Conference Registration Form - Staggered Bounce 2 */}
          {activeTab === 'conference' ? (
            <div className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-5 transition-all duration-700 delay-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.99]'
              }`}>
              {loadingMeeting ? (
                /* Loading Skeleton / State */
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 space-y-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs sm:text-sm font-bold text-slate-500">
                    {lang === 'th' ? 'กำลังโหลดข้อมูลการประชุมล่าสุด...' : 'Loading latest conference data...'}
                  </p>
                </div>
              ) : !activeMeeting ? (
                /* No Active Meeting State (Disabled registration) */
                <div className="bg-gradient-to-b from-amber-50/90 to-orange-50/40 border border-amber-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-3.5 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                    <CalendarX className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-sm sm:text-lg font-black text-slate-900">
                      {lang === 'th' ? 'ยังไม่มีการประชุมที่เปิดรับลงทะเบียนในขณะนี้' : 'No Active Conference Open for Registration'}
                    </h3>
                    <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {lang === 'th'
                        ? 'ขณะนี้ยังไม่มีรอบการประชุมวิชาการที่เปิดรับลงทะเบียน กรุณาติดตามข่าวสารจากทางสมาคมฯ หรือเลือกสมัครสมาชิก TSRM เพื่อรับสิทธิประโยชน์ล่วงหน้า'
                        : 'There are currently no active conference registrations available. Please stay tuned for announcements or apply for TSRM membership to receive advance privileges.'}
                    </p>
                  </div>
                  <div className="pt-1 sm:pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleTabChange('membership')}
                      className="inline-flex items-center gap-2 bg-[#0026b3] hover:bg-[#001f94] text-white font-black text-xs sm:text-sm py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl sm:rounded-2xl shadow-md transition active:scale-98 cursor-pointer"
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
                      <div className="flex items-center gap-1.5 sm:gap-2">
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600">
                        {(activeMeeting.start_date || activeMeeting.meeting_date) && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0026b3]" />
                            {formatMeetingDateDisplay(activeMeeting, lang)}
                          </span>
                        )}
                        {activeMeeting.location && (
                          <span className="flex items-center gap-1 font-medium truncate max-w-xs sm:max-w-sm" title={activeMeeting.location}>
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0026b3] shrink-0" />
                            <span className="truncate">{activeMeeting.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Google Autofill Button with Accent Pill */}
                  <div className="space-y-1 max-w-md mx-auto w-full">
                    <button
                      type="button"
                      onClick={handleGoogleAutofill}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <GoogleIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                        <span className="text-xs sm:text-sm font-extrabold">
                          {lang === 'th' ? 'กรอกข้อมูลอัตโนมัติด้วย Google' : 'Autofill with Google'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-emerald-800 bg-[#4ade80]/25 border border-[#4ade80]/40 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-700" />
                        <span>{lang === 'th' ? 'รวดเร็ว' : 'Fast'}</span>
                      </span>
                    </button>

                    {autofillSuccess && (
                      <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold flex items-center gap-1 justify-center animate-fade-in pt-0.5">
                        <Sparkles className="w-3 h-3" />
                        {lang === 'th' ? 'กรอกข้อมูลจากบัญชี Google เรียบร้อยแล้ว' : 'Autofilled from Google successfully'}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-1.5 sm:my-2.5">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-2.5 sm:px-3 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase absolute">
                      {lang === 'th' ? 'หรือ กรอกข้อมูลด้วยตนเอง' : 'Or fill in details'}
                    </span>
                  </div>

                  {/* Registration Form with 7 Specified Fields */}
                  <form onSubmit={handleSubmitRegistration} className="space-y-3 sm:space-y-4">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 transition-all duration-700 delay-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                      }`}>
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
                            placeholder={lang === 'th' ? 'เช่น วรวัฒน์ เกียรติอนันต์ (ไม่ต้องใส่คำนำหน้า)' : 'e.g. Worawat Kiat-anan (Without prefix)'}
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
                            placeholder="e.g. Worawat Kiat-anan (Without prefix)"
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
                            placeholder={lang === 'th' ? 'ชื่อโรงพยาบาล / สถาบัน / บริษัท' : 'e.g. Hospital / University / Clinic'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 5. ตำแหน่ง */}
                      <PositionSelect
                        value={formData.position}
                        onChange={(val) => handleInputChange('position', val)}
                        otherValue={formData.positionOther}
                        onOtherChange={(val) => handleInputChange('positionOther', val)}
                        showIcon={true}
                        showLabel={true}
                      />

                      {/* 6. เลขสมาชิก */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'เลขสมาชิก (Member No.)' : 'Member No.'}
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.memberNo}
                            onChange={(e) => handleInputChange('memberNo', e.target.value)}
                            placeholder={lang === 'th' ? 'เช่น 0123 (ถ้ามี)' : 'e.g. 0123 (Optional)'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                          />
                        </div>
                      </div>

                      {/* 7. โค๊ดพิเศษ */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                          {lang === 'th' ? 'โค๊ดพิเศษ' : 'Special Code'}
                        </label>
                        <div className="relative">
                          <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.specialCode}
                            onChange={(e) => handleInputChange('specialCode', e.target.value)}
                            placeholder={lang === 'th' ? 'กรอกรหัสส่วนลดหรือโค้ดพิเศษ (ถ้ามี)' : 'Enter promo or special code (if any)'}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition uppercase tracking-wider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Multi-select Program Options (Optimized for Mobile) */}
                    <div className={`space-y-1.5 sm:space-y-2 pt-0.5 transition-all duration-700 delay-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                      }`}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>{lang === 'th' ? 'เลือกหลักสูตร / เวิร์กช็อป (เลือกได้หลายรายการ)' : 'Select Programs & Workshops (Multi-select)'}</span>
                        </label>
                        <span className="text-[9px] sm:text-[10px] text-[#0026b3] font-extrabold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                          {selectedPrograms.length} {lang === 'th' ? 'รายการที่เลือก' : 'selected'}
                        </span>
                      </div>

                      <div className={`grid gap-1.5 sm:gap-2.5 ${effectiveActivities.length > 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {effectiveActivities.map((act) => {
                          const isSelected = selectedPrograms.includes(act.id);

                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => toggleProgram(act.id)}
                              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99] relative overflow-hidden ${isSelected
                                ? 'bg-blue-50/90 border-[#0026b3] text-slate-900 shadow-2xs ring-1.5 ring-[#0026b3]/30 font-bold'
                                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                                }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${act.type === 'main'
                                    ? (isSelected ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-700')
                                    : (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700')
                                    }`}>
                                    {act.type === 'main' ? (lang === 'th' ? 'หลักสูตรหลัก' : 'Main') : (lang === 'th' ? 'เวิร์กช็อป' : 'Workshop')}
                                  </span>

                                  {/* Format Badge */}
                                  {(() => {
                                    const fmt = act.format || (act.type === 'workshop' ? 'onsite' : 'both');
                                    return (
                                      <span className={`text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 border ${fmt === 'online'
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
                                    <span className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
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
                        <div className={`space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1 transition-all duration-700 delay-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                          }`}>
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
                              className={`py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl border text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${hasOnlineOnly
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : attendanceType === 'onsite'
                                  ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              title={hasOnlineOnly ? (lang === 'th' ? 'มีหลักสูตรที่เปิดรับเฉพาะ Online เท่านั้น' : 'Includes Online-only courses') : ''}
                            >
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                              <span className="truncate">{lang === 'th' ? 'Onsite (ที่งาน)' : 'Onsite'}</span>
                            </button>

                            {/* Online */}
                            <button
                              type="button"
                              disabled={hasOnsiteOnly}
                              onClick={() => {
                                if (!hasOnsiteOnly) setAttendanceType('online');
                              }}
                              className={`py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl border text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${hasOnsiteOnly
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : attendanceType === 'online'
                                  ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              title={hasOnsiteOnly ? (lang === 'th' ? 'มีหลักสูตรที่เปิดรับเฉพาะ Onsite เท่านั้น' : 'Includes Onsite-only courses') : ''}
                            >
                              <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                              <span className="truncate">{lang === 'th' ? 'Online (ออนไลน์)' : 'Online'}</span>
                            </button>
                          </div>

                          {/* Onsite only notice */}
                          {hasOnsiteOnly && (
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200/70 text-amber-800 text-[11px] leading-relaxed">
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
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-800 text-[11px] leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>
                                {lang === 'th'
                                  ? `หลักสูตร "${onlineOnlyActs.map(a => a.name).join(', ')}" จัดการเรียนผ่านระบบ Online เท่านั้น`
                                  : `Course "${onlineOnlyActs.map(a => a.name).join(', ')}" is Online only.`}
                              </span>
                            </div>
                          )}

                          {/* Format Change Fee Notice (1,000 THB) */}
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 text-[11px] leading-relaxed">
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
                      className={`w-full font-black py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl transition-all duration-700 delay-600 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${isFormInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                        } flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base border border-blue-400/20 relative overflow-hidden mt-2 sm:mt-3 ${selectedPrograms.length === 0 || verifyingMember
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


