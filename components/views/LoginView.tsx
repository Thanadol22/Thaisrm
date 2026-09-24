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
  Users,
  Mail,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  Monitor,
  CheckCircle2,
  Building2,
  Hash,
  Award,
  ChevronDown,
  Calendar,
  CalendarX,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Layers,
  UserCheck,
} from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { ParticipantSearchModal } from '@/components/ParticipantSearchModal';
import { ExpiredMemberModal } from '@/components/ExpiredMemberModal';
import { ChangeFormatModal } from '@/components/ChangeFormatModal';
import { SignupView } from '@/components/views/SignupView';
import { SponsorAuthModal, SponsorSessionData } from '@/components/SponsorAuthModal';
import { ProfileAndSponsorUpdateModal } from '@/components/ProfileAndSponsorUpdateModal';
import { PositionSelect } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import { useLanguage } from '@/context/LanguageContext';
import { parseGoogleName } from '@/lib/utils';

export interface MeetingActivity {
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

export interface ConferenceAttendee {
  id: string;
  nameTh: string;
  nameEn: string;
  email: string;
  workplace: string;
  position: string;
  positionOther: string;
  memberNo: string;
  selectedPrograms: string[];
  attendanceType: 'onsite' | 'online';
  memberCheckStatus?: 'idle' | 'checking' | 'valid' | 'invalid' | 'mismatch' | 'expired';
  memberCheckMessage?: string;
  verifiedMember?: any;
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
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Registration Mode: Individual vs Group
  const [regMode, setRegMode] = useState<'individual' | 'group'>('individual');
  const [activeAttendeeIdx, setActiveAttendeeIdx] = useState(0);

  // Corporate Sponsor Auth Modal state & Inactivity Tracker (5 Mins)
  const [sponsorAuthModalOpen, setSponsorAuthModalOpen] = useState(false);
  const [sponsorSession, setSponsorSession] = useState<SponsorSessionData | null>(null);
  const [sponsorSecondsRemaining, setSponsorSecondsRemaining] = useState<number>(300);
  const lastSponsorActivityRef = useRef<number>(Date.now());

  // Fast attendee switch animation state
  const [isSwitchingPerson, setIsSwitchingPerson] = useState(false);
  const [switchingLabel, setSwitchingLabel] = useState('');

  // Multi-Attendee State
  const [attendees, setAttendees] = useState<ConferenceAttendee[]>([
    {
      id: '1',
      nameTh: '',
      nameEn: '',
      email: '',
      workplace: '',
      position: '',
      positionOther: '',
      memberNo: '',
      selectedPrograms: ['main'],
      attendanceType: 'onsite',
    },
  ]);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponState, setCouponState] = useState<{
    code: string;
    companyName: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    netPrice: number;
    description: string;
    remainingUses?: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // Handle coupon validation
  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError(lang === 'th' ? 'กรุณาระบุรหัสคูปอง' : 'Please enter coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccessMsg('');

    try {
      const res = await fetch('/api/sponsors/portal/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          meetingId: activeMeeting?.meeting_id,
          basePrice: activeMeeting?.base_price || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || (lang === 'th' ? 'รหัสคูปองไม่ถูกต้องหรือหมดอายุแล้ว' : 'Invalid or expired coupon code'));
        setCouponState(null);
        return;
      }

      setCouponState({
        code: data.coupon.code,
        companyName: data.coupon.company_name,
        discountType: data.coupon.discount_type,
        discountValue: data.coupon.discount_value,
        discountAmount: data.coupon.discount_amount,
        netPrice: data.coupon.net_price,
        description: data.coupon.discount_description,
        remainingUses: data.coupon.remaining_uses,
      });
      setCouponSuccessMsg(
        lang === 'th'
          ? `✓ ใช้งานคูปองสำเร็จ: ${data.coupon.company_name} (${data.coupon.discount_description})`
          : `✓ Coupon applied: ${data.coupon.company_name} (${data.coupon.discount_description})`
      );
    } catch (err) {
      setCouponError(lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบคูปอง' : 'Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCodeInput('');
    setCouponState(null);
    setCouponError('');
    setCouponSuccessMsg('');
  };

  const handleSponsorLogout = () => {
    setSponsorSession(null);
    setRegMode('individual');
    setCouponState(null);
    setCouponCodeInput('');
    setCouponError('');
    setCouponSuccessMsg('');
    const acts = Array.isArray(activeMeeting?.activities) ? activeMeeting.activities : [];
    const defaultProgId = acts.length > 0 ? (acts.find((a: any) => a.type === 'main')?.id || acts[0].id) : 'main';
    setAttendees([{
      id: '1',
      nameTh: '',
      nameEn: '',
      email: '',
      workplace: '',
      position: '',
      positionOther: '',
      memberNo: '',
      selectedPrograms: [defaultProgId],
      attendanceType: 'onsite',
      memberCheckStatus: 'idle',
      memberCheckMessage: '',
    }]);
    setActiveAttendeeIdx(0);
    try {
      localStorage.removeItem('conference_registration');
    } catch (e) { }
  };

  const triggerPersonSwitch = (newIdx: number) => {
    setSwitchingLabel(lang === 'th' ? `ผู้ลงทะเบียนคนที่ ${newIdx + 1}` : `Attendee #${newIdx + 1}`);
    setIsSwitchingPerson(true);
    setActiveAttendeeIdx(newIdx);
    setTimeout(() => {
      setIsSwitchingPerson(false);
    }, 200);
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
            const defaultProgId = acts.length > 0 ? (acts.find((a: any) => a.type === 'main')?.id || acts[0].id) : 'main';

            // Check if returning explicitly from payment page with restore=1 flag
            try {
              const isRestoreRequested = typeof window !== 'undefined' && window.location.search.includes('restore=1');
              const savedDraftStr = typeof window !== 'undefined' ? localStorage.getItem('conference_registration') : null;

              if (isRestoreRequested && savedDraftStr) {
                const savedDraft = JSON.parse(savedDraftStr);
                if (savedDraft && savedDraft.meetingId === data.data.meeting_id) {
                  if (savedDraft.isGroup && Array.isArray(savedDraft.attendees) && savedDraft.attendees.length > 0) {
                    setRegMode('group');
                    setAttendees(savedDraft.attendees.map((att: any, idx: number) => ({
                      id: att.id || String(idx + 1),
                      nameTh: att.nameTh || '',
                      nameEn: att.nameEn || '',
                      email: att.email || '',
                      workplace: att.workplace || '',
                      position: att.positionCode || att.position || '',
                      positionOther: (att.positionCode === 'อื่นๆ' || att.positionCode === '0 อื่นๆ') ? (att.position || '') : '',
                      memberNo: att.memberNo || '',
                      selectedPrograms: att.selectedProgramIds || att.selectedPrograms || [defaultProgId],
                      attendanceType: att.attendanceType || 'onsite',
                      memberCheckStatus: att.memberNo ? 'valid' : 'idle',
                      memberCheckMessage: att.memberNo ? '✓ ข้อมูลที่เคยตรวจสอบแล้ว' : '',
                    })));
                  } else {
                    setRegMode('individual');
                    setAttendees([{
                      id: '1',
                      nameTh: savedDraft.nameTh || '',
                      nameEn: savedDraft.nameEn || '',
                      email: savedDraft.email || '',
                      workplace: savedDraft.workplace || '',
                      position: savedDraft.positionCode || savedDraft.position || '',
                      positionOther: (savedDraft.positionCode === 'อื่นๆ' || savedDraft.positionCode === '0 อื่นๆ') ? (savedDraft.position || '') : '',
                      memberNo: savedDraft.memberNo || '',
                      selectedPrograms: savedDraft.selectedProgramIds || [defaultProgId],
                      attendanceType: savedDraft.attendanceType || 'onsite',
                      memberCheckStatus: savedDraft.memberNo ? 'valid' : 'idle',
                      memberCheckMessage: '',
                    }]);
                  }

                  if (savedDraft.couponData) {
                    setCouponState(savedDraft.couponData);
                    setCouponCodeInput(savedDraft.couponData.code || '');
                  }
                  if (savedDraft.sponsorSession) {
                    lastSponsorActivityRef.current = Date.now();
                    setSponsorSecondsRemaining(300);
                    setSponsorSession(savedDraft.sponsorSession);
                  }

                  // Clean URL query flag
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', window.location.pathname + '?tab=conference');
                  }
                  setLoadingMeeting(false);
                  return;
                }
              } else {
                // Normal refresh / visit: clear old stale storage
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('conference_registration');
                }
              }
            } catch (draftErr) {
              console.error('Error handling draft conference registration:', draftErr);
            }

            setAttendees(prev => prev.map(a => ({
              ...a,
              selectedPrograms: [defaultProgId]
            })));
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

  const currentAttendee = attendees[activeAttendeeIdx] || attendees[0];

  const updateCurrentAttendee = (field: keyof ConferenceAttendee, value: any) => {
    setAttendees(prev => prev.map((att, idx) => {
      if (idx !== activeAttendeeIdx) return att;
      let sanitized = value;
      if (field === 'nameTh') {
        sanitized = value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, '');
      } else if (field === 'nameEn') {
        sanitized = value.replace(/[^a-zA-Z\s\.\-']/g, '');
      } else if (field === 'memberNo') {
        sanitized = value.replace(/\D/g, '').slice(0, 4);
      }
      return { ...att, [field]: sanitized };
    }));
  };

  const handleAddAttendee = () => {
    const defaultWorkplace = sponsorSession?.sponsorName || attendees[0]?.workplace || '';
    const newId = Date.now().toString();
    const defaultProgId = effectiveActivities.length > 0 ? (effectiveActivities.find(a => a.type === 'main')?.id || effectiveActivities[0].id) : 'main';
    const newIdx = attendees.length;
    setAttendees(prev => [
      ...prev,
      {
        id: newId,
        nameTh: '',
        nameEn: '',
        email: '',
        workplace: defaultWorkplace,
        position: '',
        positionOther: '',
        memberNo: '',
        selectedPrograms: [defaultProgId],
        attendanceType: 'onsite',
        memberCheckStatus: 'idle',
      }
    ]);
    triggerPersonSwitch(newIdx);
  };

  const handleRemoveAttendee = (idxToRemove: number) => {
    if (attendees.length <= 1) return;
    setAttendees(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (activeAttendeeIdx >= idxToRemove) {
      const nextIdx = Math.max(0, activeAttendeeIdx - 1);
      triggerPersonSwitch(nextIdx);
    }
  };

  const handleCopyWorkplaceToAll = () => {
    const wp = sponsorSession?.sponsorName || currentAttendee?.workplace?.trim() || '';
    if (!wp) {
      alert(lang === 'th' ? 'กรุณาระบุหน่วยงาน/สถานที่ทำงานของท่านปัจจุบันก่อนคัดลอก' : 'Please enter workplace first');
      return;
    }
    setAttendees(prev => prev.map(att => ({ ...att, workplace: wp })));
    alert(lang === 'th' ? `คัดลอก "${wp}" ไปยังผู้ลงทะเบียนทั้งหมดแล้ว` : `Copied "${wp}" to all attendees`);
  };

  // Debounced Member Verification for current attendee
  useEffect(() => {
    const memNo = currentAttendee?.memberNo?.trim();
    const nameTh = currentAttendee?.nameTh?.trim() || '';
    const nameEn = currentAttendee?.nameEn?.trim() || '';

    if (!memNo) {
      updateCurrentAttendee('memberCheckStatus', 'idle');
      updateCurrentAttendee('memberCheckMessage', '');
      updateCurrentAttendee('verifiedMember', null);
      return;
    }

    if (!nameTh && !nameEn) {
      updateCurrentAttendee('memberCheckStatus', 'checking');
      updateCurrentAttendee(
        'memberCheckMessage',
        lang === 'th' ? 'ℹ️ กรุณากรอกชื่อ-นามสกุลเพื่อตรวจสอบกับเลขสมาชิก' : 'ℹ️ Please enter name to verify with member ID'
      );
      updateCurrentAttendee('verifiedMember', null);
      return;
    }

    updateCurrentAttendee('memberCheckStatus', 'checking');
    updateCurrentAttendee(
      'memberCheckMessage',
      lang === 'th' ? '⏳ กำลังตรวจสอบเลขสมาชิก...' : '⏳ Checking member ID...'
    );

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/sponsors/portal/verify-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberNo: memNo,
            nameTh: nameTh,
            nameEn: nameEn,
            name: nameTh || nameEn,
            meetingId: activeMeeting?.meeting_id,
          }),
        });
        const data = await res.json();
        if (data.valid) {
          updateCurrentAttendee('memberCheckStatus', 'valid');
          updateCurrentAttendee(
            'memberCheckMessage',
            lang === 'th' ? '✅ ชื่อตรงกับเลขสมาชิก' : '✅ Name matches Member ID'
          );
          updateCurrentAttendee('verifiedMember', data.member);
        } else if (data.nameMismatch) {
          updateCurrentAttendee('memberCheckStatus', 'mismatch');
          updateCurrentAttendee(
            'memberCheckMessage',
            lang === 'th' ? '❌ ชื่อไม่ตรงกับเลขสมาชิก' : '❌ Name does not match Member ID'
          );
          updateCurrentAttendee('verifiedMember', null);
        } else if (data.alreadyRegistered) {
          updateCurrentAttendee('memberCheckStatus', 'invalid');
          updateCurrentAttendee(
            'memberCheckMessage',
            lang === 'th'
              ? '⚠️ สมาชิกหมายเลขนี้ได้ลงทะเบียนงานประชุมนี้แล้ว'
              : '⚠️ This member has already registered for this conference'
          );
          updateCurrentAttendee('verifiedMember', null);
        } else if (data.member?.membership_status && data.member.membership_status.toLowerCase() !== 'active') {
          updateCurrentAttendee('memberCheckStatus', 'expired');
          updateCurrentAttendee(
            'memberCheckMessage',
            lang === 'th' ? '⚠️ สถานะสมาชิกภาพหมดอายุ' : '⚠️ Membership expired'
          );
          updateCurrentAttendee('verifiedMember', null);
        } else {
          updateCurrentAttendee('memberCheckStatus', 'invalid');
          updateCurrentAttendee(
            'memberCheckMessage',
            lang === 'th' ? '❌ ไม่พบเลขสมาชิกนี้ในระบบ' : '❌ Member ID not found'
          );
          updateCurrentAttendee('verifiedMember', null);
        }
      } catch (err) {
        updateCurrentAttendee('memberCheckStatus', 'invalid');
        updateCurrentAttendee(
          'memberCheckMessage',
          lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบ' : 'Verification error'
        );
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [currentAttendee?.memberNo, currentAttendee?.nameTh, currentAttendee?.nameEn, activeAttendeeIdx, activeMeeting?.meeting_id]);

  // Sponsor session auto-fills workplace
  useEffect(() => {
    if (sponsorSession?.sponsorName) {
      setAttendees(prev =>
        prev.map(att => ({
          ...att,
          workplace: att.workplace || sponsorSession.sponsorName,
        }))
      );
    }
  }, [sponsorSession]);

  const toggleProgramForCurrentAttendee = (key: string) => {
    const currentProgs = currentAttendee?.selectedPrograms || [];
    let nextProgs: string[];
    if (currentProgs.includes(key)) {
      if (currentProgs.length === 1) return; // keep at least 1
      nextProgs = currentProgs.filter(k => k !== key);
    } else {
      nextProgs = [...currentProgs, key];
    }

    const selectedActs = effectiveActivities.filter(a => nextProgs.includes(a.id));
    const hasOnsiteOnly = selectedActs.some(a => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
    const hasOnlineOnly = selectedActs.some(a => a.format === 'online');
    let nextAttendType = currentAttendee.attendanceType;
    if (hasOnsiteOnly) {
      nextAttendType = 'onsite';
    } else if (hasOnlineOnly) {
      nextAttendType = 'online';
    }

    setAttendees(prev => prev.map((att, idx) => {
      if (idx !== activeAttendeeIdx) return att;
      return { ...att, selectedPrograms: nextProgs, attendanceType: nextAttendType };
    }));
  };

  const setAttendanceTypeForCurrent = (type: 'onsite' | 'online') => {
    setAttendees(prev => prev.map((att, idx) => {
      if (idx !== activeAttendeeIdx) return att;
      return { ...att, attendanceType: type };
    }));
  };

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Autofill only when explicitly targeted for conference registration
  useEffect(() => {
    if (autofillTarget === 'conference' && (initialGoogleUser?.name || initialGoogleUser?.email)) {
      const { nameTh, nameEn } = parseGoogleName(
        initialGoogleUser.name,
        initialGoogleUser.given_name,
        initialGoogleUser.family_name
      );
      updateCurrentAttendee('nameTh', nameTh || '');
      updateCurrentAttendee('nameEn', nameEn || '');
      updateCurrentAttendee('email', initialGoogleUser.email || '');
      setAutofillSuccess(true);
      const timer = setTimeout(() => setAutofillSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [initialGoogleUser, autofillTarget]);

  // Tab switching clears form fields across tabs
  const handleTabChange = (tab: 'conference' | 'membership') => {
    setActiveTab(tab);
    handleSponsorLogout();
    setAutofillSuccess(false);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  // Change Format Modal state
  const [isChangeFormatOpen, setIsChangeFormatOpen] = useState(false);


  // Inactivity tracking when sponsor session is active (5 minutes timeout)
  useEffect(() => {
    if (!sponsorSession) return;

    // Reset last activity timestamp immediately on session start / restore
    lastSponsorActivityRef.current = Date.now();
    setSponsorSecondsRemaining(300);

    let isTerminated = false;

    const checkAndSyncTime = () => {
      if (isTerminated) return;
      const elapsed = Math.floor((Date.now() - lastSponsorActivityRef.current) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setSponsorSecondsRemaining(remaining);

      if (remaining <= 0) {
        isTerminated = true;
        handleSponsorLogout();
        alert(
          lang === 'th'
            ? 'เซสชันของบริษัทหมดอายุเนื่องจากไม่มีการเคลื่อนไหวนานเกิน 5 นาที กรุณาขอรหัสชั่วคราวใหม่อีกครั้ง'
            : 'Corporate sponsor session has expired due to 5 minutes of inactivity. Please request a new OTP.'
        );
      }
    };

    let lastResetCall = 0;
    const resetActivity = () => {
      if (isTerminated) return;
      const now = Date.now();
      lastSponsorActivityRef.current = now;
      // Throttle updating state to avoid continuous re-rendering on mousemove
      if (now - lastResetCall > 1000) {
        lastResetCall = now;
        setSponsorSecondsRemaining(300);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));
    window.addEventListener('focus', checkAndSyncTime);
    document.addEventListener('visibilitychange', checkAndSyncTime);

    const interval = setInterval(checkAndSyncTime, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      window.removeEventListener('focus', checkAndSyncTime);
      document.removeEventListener('visibilitychange', checkAndSyncTime);
      clearInterval(interval);
    };
  }, [sponsorSession, lang]);

  // Submit conference registration (Individual or Group)
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeMeeting) {
      alert(lang === 'th' ? 'ไม่มีรอบการประชุมที่เปิดรับลงทะเบียน' : 'No active conference available for registration');
      return;
    }

    const attendeesToSubmit = regMode === 'individual' ? [attendees[0]] : attendees;

    // ── 1. Validation across all attendees ──────────────────────────────────────
    for (let i = 0; i < attendeesToSubmit.length; i++) {
      const att = attendeesToSubmit[i];
      const personLabel = regMode === 'group' ? (lang === 'th' ? `(ผู้ลงทะเบียนคนที่ ${i + 1})` : `(Attendee #${i + 1})`) : '';

      if (regMode === 'group') {
        if (!att.memberNo || !att.memberNo.trim()) {
          alert(lang === 'th' ? `กรุณาระบุรหัสสมาชิก TSRM สำหรับ ${personLabel}` : `Please enter TSRM Member No. for ${personLabel}`);
          setActiveAttendeeIdx(i);
          return;
        }
        if (att.memberCheckStatus === 'mismatch' || att.memberCheckStatus === 'invalid') {
          alert(
            lang === 'th'
              ? `เลขสมาชิกและชื่อของผู้ลงทะเบียนคนที่ ${i + 1} ไม่ตรงกับในฐานข้อมูล (${att.memberCheckMessage || ''}) กรุณาตรวจสอบให้ถูกต้อง`
              : `Member ID and Name for Attendee #${i + 1} do not match database. Please verify.`
          );
          setActiveAttendeeIdx(i);
          return;
        }
      }

      if (!att.nameTh.trim()) {
        alert(lang === 'th' ? `กรุณากรอกชื่อ-นามสกุล (ภาษาไทย) ${personLabel}` : `Please enter Full Name (Thai) ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      if (!att.nameEn.trim()) {
        alert(lang === 'th' ? `กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษ) ${personLabel}` : `Please enter Full Name (English) ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      const emailTrimmed = att.email.trim();
      if (!emailTrimmed) {
        alert(lang === 'th' ? `กรุณากรอกอีเมล ${personLabel}` : `Please enter Email ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        alert(lang === 'th' ? `รูปแบบอีเมลไม่ถูกต้อง ${personLabel}` : `Please enter a valid email address ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      if (!att.workplace.trim()) {
        alert(lang === 'th' ? `กรุณากรอกหน่วยงาน/สถานที่ทำงาน ${personLabel}` : `Please enter Workplace / Organization ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      if (!att.position.trim()) {
        alert(lang === 'th' ? `กรุณาเลือกตำแหน่ง ${personLabel}` : `Please select Position ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      if ((att.position === 'อื่นๆ' || att.position === '0 อื่นๆ') && !att.positionOther.trim()) {
        alert(lang === 'th' ? `กรุณาระบุตำแหน่งอื่นๆ ${personLabel}` : `Please specify other position ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }

      if (!att.selectedPrograms || att.selectedPrograms.length === 0) {
        alert(lang === 'th' ? `กรุณาเลือกอย่างน้อย 1 หลักสูตร ${personLabel}` : `Please select at least 1 program ${personLabel}`);
        setActiveAttendeeIdx(i);
        return;
      }
    }

    setVerifyingMember(true);

    try {
      // ── 2. Process each attendee (Verify memberNo & Calculate item pricing) ───
      const processedAttendees: any[] = [];
      let groupTotalAmount = 0;

      for (let i = 0; i < attendeesToSubmit.length; i++) {
        const att = attendeesToSubmit[i];
        const rawMemberNo = att.memberNo.trim();
        let isMemberCalculated = false;
        let isExpiredMember = false;
        let memberDataFound: any = null;

        if (rawMemberNo) {
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

              if (result.attendanceEvaluation?.calculated_status === 'Inactive') {
                active = false;
                memberDataFound.membership_status = result.attendanceEvaluation.reason || 'หมดอายุ (ขาดประชุม 4 ครั้ง)';
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
              isMemberCalculated = false;
            }
          } catch (err) {
            console.error('Member verification error for attendee', i, err);
          }
        }

        // Selected activities calculation
        const selectedActivityObjects = effectiveActivities
          .filter(a => att.selectedPrograms.includes(a.id))
          .map(a => {
            const isMain = a.type === 'main';
            let price = 0;
            const isMemberUser = isMemberCalculated && !isExpiredMember;
            const pricingTiers = activeMeeting.pricing_tiers;
            const basePrice = activeMeeting.base_price ?? 0;

            if (isMain) {
              if (att.attendanceType === 'online') {
                price = isMemberUser
                  ? (pricingTiers?.participant?.onlineMember ?? basePrice ?? 3500)
                  : (pricingTiers?.participant?.onlineNonMember ?? (basePrice ? basePrice + 1000 : 4500));
              } else {
                price = isMemberUser
                  ? (pricingTiers?.participant?.onsiteMember ?? basePrice ?? 3500)
                  : (pricingTiers?.participant?.onsiteNonMember ?? (basePrice ? basePrice + 1000 : 4500));
              }
            } else {
              const mPrice = typeof a.memberPrice === 'number' ? a.memberPrice : 0;
              const nonMPrice = typeof a.nonMemberPrice === 'number' ? a.nonMemberPrice : mPrice;
              price = isMemberUser ? mPrice : nonMPrice;
            }

            return {
              id: a.id,
              name: a.name,
              type: a.type,
              date: a.date,
              format: a.format || (a.type === 'workshop' ? 'onsite' : 'both'),
              price,
              memberPrice: a.memberPrice,
              nonMemberPrice: a.nonMemberPrice,
            };
          });

        const attendeeSubtotal = selectedActivityObjects.reduce((sum, item) => sum + item.price, 0);
        groupTotalAmount += attendeeSubtotal;

        const finalPosition = (att.position === 'อื่นๆ' || att.position === '0 อื่นๆ')
          ? (att.positionOther || (lang === 'th' ? 'อื่นๆ' : 'Other'))
          : (att.position || '');

        const programLabel = selectedActivityObjects.map(a => a.name).join(' + ');

        processedAttendees.push({
          id: att.id,
          nameTh: att.nameTh.trim(),
          nameEn: att.nameEn.trim(),
          email: att.email.trim(),
          workplace: att.workplace.trim(),
          position: finalPosition,
          positionCode: att.position,
          memberNo: rawMemberNo,
          isMember: isMemberCalculated,
          isExpiredMember: isExpiredMember,
          memberStatus: isExpiredMember ? 'expired' : (isMemberCalculated ? 'active' : 'non_member'),
          attendanceType: att.attendanceType,
          selectedProgramIds: att.selectedPrograms,
          selectedActivities: selectedActivityObjects,
          programKey: att.selectedPrograms.join(','),
          programNameTh: programLabel || activeMeeting.meeting_name,
          programNameEn: programLabel || activeMeeting.meeting_name,
          subtotal: attendeeSubtotal,
        });
      }

      // If single individual registration, keep backward compatible structure
      if (regMode === 'individual' && processedAttendees.length === 1) {
        const single = processedAttendees[0];

        // Check duplicate
        try {
          const checkRes = await fetch(
            `/api/meetings/${encodeURIComponent(activeMeeting.meeting_id)}/check-registration?memberNo=${encodeURIComponent(single.memberNo)}&email=${encodeURIComponent(single.email)}`
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
          console.error('Error checking duplicate:', checkErr);
        }

        const singlePayload = {
          category: 'conference',
          meetingId: activeMeeting.meeting_id,
          meetingName: activeMeeting.meeting_name,
          meetingDate: activeMeeting.meeting_date,
          meetingLocation: activeMeeting.location,
          pricingTiers: activeMeeting.pricing_tiers,
          basePrice: activeMeeting.base_price,
          selectedProgramIds: single.selectedProgramIds,
          selectedActivities: single.selectedActivities,
          programKey: single.programKey,
          programNameTh: single.programNameTh,
          programNameEn: single.programNameEn,
          attendanceType: single.attendanceType,
          memberNo: single.memberNo,
          isMember: single.isMember,
          isExpiredMember: single.isExpiredMember,
          memberStatus: single.memberStatus,
          nameTh: single.nameTh,
          nameEn: single.nameEn,
          workplace: single.workplace,
          position: single.position,
          positionCode: single.positionCode,
          email: single.email,
          totalAmount: single.subtotal,
          couponData: couponState || undefined,
          registeredAt: new Date().toISOString(),
        };

        if (single.isExpiredMember) {
          setExpiredMemberInfo({
            memberName: single.nameTh,
            memberNo: single.memberNo,
            statusText: lang === 'th' ? 'หมดอายุ' : 'Expired',
          });
          setPendingRegPayload(singlePayload);
          setExpiredModalOpen(true);
          return;
        }

        localStorage.setItem('conference_registration', JSON.stringify(singlePayload));
      } else {
        // Corporate / Group Registration Payload
        const groupPayload = {
          category: 'conference',
          isGroup: true,
          meetingId: activeMeeting.meeting_id,
          meetingName: activeMeeting.meeting_name,
          meetingDate: activeMeeting.meeting_date,
          meetingLocation: activeMeeting.location,
          pricingTiers: activeMeeting.pricing_tiers,
          basePrice: activeMeeting.base_price,
          companyName: sponsorSession?.sponsorName || processedAttendees[0]?.workplace || 'Corporate Registration',
          attendees: processedAttendees,
          totalAmount: groupTotalAmount,
          couponData: couponState || undefined,
          sponsorSession: sponsorSession || undefined,
          registeredAt: new Date().toISOString(),
        };

        localStorage.setItem('conference_registration', JSON.stringify(groupPayload));
      }

      router.push('/payment?type=registration');
    } catch (err) {
      console.error('Submit conference error:', err);
      alert(lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง' : 'Registration error. Please try again.');
    } finally {
      setVerifyingMember(false);
    }
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

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs group shrink-0"
                title={lang === 'th' ? 'อัปเดตข้อมูลสมาชิก / บริษัท' : 'Update Member / Sponsor Profile'}
                aria-label={lang === 'th' ? 'อัปเดตข้อมูลสมาชิก / บริษัท' : 'Update Member / Sponsor Profile'}
              >
                <UserCheck className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-blue-200 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold whitespace-nowrap">{lang === 'th' ? 'อัปเดตข้อมูล' : 'Update Info'}</span>
              </button>

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

          <div className="mt-3.5 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-amber-500/20 border border-amber-400/40 rounded-xl sm:rounded-2xl backdrop-blur-md flex items-center gap-2.5 sm:gap-3 shadow-sm">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-400/25 flex items-center justify-center shrink-0 border border-amber-300/40 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-amber-200 tracking-tight leading-snug">
                {lang === 'th' ? 'ระบบกำลังทดสอบและพัฒนา ยังไม่เปิดให้ใช้บริการ' : 'The system is currently under testing and development (Not yet open for service)'}
              </p>
              <p className="text-[10px] sm:text-xs text-amber-200/80 font-medium leading-tight mt-0.5">
                {lang === 'th'
                  ? 'ข้อมูลและการทำรายการทั้งหมดในช่วงนี้ใช้เพื่อการทดสอบระบบเท่านั้น'
                  : 'All data and operations during this period are for testing and development purposes only.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-4 sm:px-8 lg:px-12 py-5 sm:py-8 flex-1 flex flex-col justify-between max-w-5xl xl:max-w-6xl mx-auto w-full">
        <div className="space-y-4 sm:space-y-6">

          {/* Main Action Segmented Buttons (Conference vs Membership) */}
          <div className="relative grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-200/90 shadow-inner select-none max-w-xl mx-auto w-full">
            <div
              aria-hidden="true"
              className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] shadow-md shadow-blue-950/25 ring-2 ring-[#4ade80]/50 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none will-change-transform ${activeTab === 'membership' ? 'translate-x-full' : 'translate-x-0'
                }`}
            />

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
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 space-y-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs sm:text-sm font-bold text-slate-500">
                    {lang === 'th' ? 'กำลังโหลดข้อมูลการประชุมล่าสุด...' : 'Loading latest conference data...'}
                  </p>
                </div>
              ) : !activeMeeting ? (
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

                  {/* Mode Selector: Individual vs Group */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setRegMode('individual');
                          setActiveAttendeeIdx(0);
                        }}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${regMode === 'individual'
                          ? 'bg-[#0026b3] text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                      >
                        <User className="w-4 h-4" />
                        <span>{lang === 'th' ? 'ลงทะเบียนรายบุคคล' : 'Individual'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!sponsorSession) {
                            setSponsorAuthModalOpen(true);
                          } else {
                            setRegMode('group');
                          }
                        }}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${regMode === 'group'
                          ? 'bg-[#0026b3] text-white shadow-sm'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                      >
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>
                          {sponsorSession
                            ? `${sponsorSession.sponsorName} (${sponsorSession.tier})`
                            : lang === 'th'
                              ? 'ลงทะเบียนแบบกลุ่มสำหรับบริษัท (OTP)'
                              : 'Corporate Sponsor (OTP)'}
                        </span>
                      </button>
                    </div>

                    {regMode === 'group' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={handleCopyWorkplaceToAll}
                          className="text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="คัดลอกสถานที่ทำงานไปยังทุกคน"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'คัดลอกหน่วยงานให้ทุกคน' : 'Copy Workplace to All'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Corporate Sponsor Active Banner */}
                  {regMode === 'group' && sponsorSession && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          🏢
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            เข้าสู่ระบบในนาม: <span className="text-blue-700">{sponsorSession.sponsorName}</span> ({sponsorSession.tier} Sponsor)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            ผู้ประสานงาน: {sponsorSession.contactEmail} (โควต้าคูปองฟรี)
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSponsorLogout}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                      >
                        ออกจากระบบบริษัท
                      </button>
                    </div>
                  )}

                  {/* Corporate Coupon Card - Only shown for Corporate / Group Registration */}
                  {(regMode === 'group' || sponsorSession) && (
                    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 border border-blue-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0026b3] text-white flex items-center justify-center text-xs font-black">
                            🎟️
                          </span>
                          <label className="text-xs sm:text-sm font-extrabold text-slate-800">
                            {lang === 'th' ? 'คูปองบริษัท' : 'Company Coupon'}
                          </label>
                        </div>
                        {couponState && (
                          <button
                            type="button"
                            onClick={handleClearCoupon}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                          >
                            {lang === 'th' ? 'ยกเลิกคูปอง' : 'Remove Coupon'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Ticket className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={couponCodeInput}
                            onChange={(e) => {
                              setCouponCodeInput(e.target.value.toUpperCase());
                              setCouponError('');
                              setCouponSuccessMsg('');
                            }}
                            placeholder={lang === 'th' ? 'กรอกคูปองบริษัท' : 'Enter company coupon'}
                            className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold tracking-wider placeholder:text-slate-400 focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition uppercase"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={couponLoading || !couponCodeInput.trim()}
                          className="py-2 px-4 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                        >
                          {couponLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{lang === 'th' ? 'กำลังตรวจ...' : 'Checking...'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'ใช้คูปอง' : 'Apply'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {couponError && (
                        <div className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{couponError}</span>
                        </div>
                      )}

                      {couponSuccessMsg && (
                        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span>{couponSuccessMsg}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Attendee Pagination Header Tabs (When in Group Mode) */}
                  {regMode === 'group' && (
                    <div className="space-y-2 pt-1 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#0026b3]" />
                          <span>{lang === 'th' ? 'รายชื่อผู้ลงทะเบียน (แบ่งหน้าละฟอร์ม):' : 'Attendee Forms (Paginated):'}</span>
                        </span>

                        {attendees.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(activeAttendeeIdx)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? `ลบผู้ลงทะเบียนคนที่ ${activeAttendeeIdx + 1}` : `Remove Attendee #${activeAttendeeIdx + 1}`}</span>
                          </button>
                        )}
                      </div>

                      {/* Pagination Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                        {attendees.map((att, idx) => {
                          const isActive = idx === activeAttendeeIdx;
                          const isComplete = Boolean(att.nameTh.trim() && att.nameEn.trim() && att.email.trim() && att.workplace.trim() && att.position.trim());
                          const displayName = att.nameTh.trim() ? (att.nameTh.length > 12 ? att.nameTh.slice(0, 12) + '...' : att.nameTh) : `${lang === 'th' ? 'คนที่' : 'Person'} ${idx + 1}`;

                          return (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => triggerPersonSwitch(idx)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${isActive
                                ? 'bg-gradient-to-r from-[#0026b3] to-[#001c8c] text-white border-blue-900 shadow-md ring-2 ring-blue-400/40 scale-105'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-white text-[#0026b3]' : 'bg-slate-300 text-slate-700'}`}>
                                {idx + 1}
                              </span>
                              <span className="truncate">{displayName}</span>
                              {isComplete && (
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#4ade80]' : 'text-emerald-600'}`} />
                              )}
                            </button>
                          );
                        })}

                        {/* + Add Attendee Tab Button */}
                        <button
                          type="button"
                          onClick={handleAddAttendee}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 border-dashed transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'เพิ่มผู้ลงทะเบียน' : 'Add Person'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Attendee Form Container with Fast Flash Overlay */}
                  <div className="relative">
                    {/* Fast Switch Pulse & Flash Overlay */}
                    {isSwitchingPerson && (
                      <div className="absolute inset-0 z-40 bg-white/75 backdrop-blur-[2px] rounded-3xl flex items-center justify-center animate-fade-in pointer-events-none transition-all">
                        <div className="bg-[#0026b3] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-black ring-4 ring-blue-300/50 scale-105 transition-transform animate-pulse">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#4ade80] animate-spin" />
                          <span>{lang === 'th' ? `สลับข้อมูลไปยัง ${switchingLabel}...` : `Switching to ${switchingLabel}...`}</span>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSubmitRegistration} key={`attendee-form-${currentAttendee.id}`} className="space-y-3 sm:space-y-4 animate-fade-in">
                      {regMode === 'group' && (
                        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-2xl px-4 py-2.5 text-xs text-blue-900 font-bold shadow-2xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0026b3] animate-pulse" />
                            {lang === 'th' ? `ข้อมูลผู้ลงทะเบียนคนที่ ${activeAttendeeIdx + 1} จากทั้งหมด ${attendees.length} ท่าน` : `Form for Attendee #${activeAttendeeIdx + 1} of ${attendees.length}`}
                          </span>
                          <span className="text-[11px] text-blue-700 font-medium">({currentAttendee.nameTh || (lang === 'th' ? 'ยังไม่ได้ระบุชื่อ' : 'No name specified')})</span>
                        </div>
                      )}

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
                              value={currentAttendee.nameTh}
                              onChange={(e) => updateCurrentAttendee('nameTh', e.target.value)}
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
                              value={currentAttendee.nameEn}
                              onChange={(e) => updateCurrentAttendee('nameEn', e.target.value)}
                              placeholder="Full Name (Without prefix)"
                              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                            />
                          </div>
                        </div>

                        {/* 3. อีเมล */}
                        <div>
                          <SmartEmailInput
                            value={currentAttendee.email}
                            onChange={(val) => updateCurrentAttendee('email', val)}
                            label={lang === 'th' ? 'อีเมล' : 'Email Address'}
                            placeholder="youremail@example.com"
                            helperText={lang === 'th' ? 'กรุณากรอกอีเมลที่มีอยู่จริง เพื่อรับ QR Code เข้าร่วมงาน' : 'Please provide a valid email to receive your Event QR Code.'}
                            required
                          />
                        </div>

                        {/* 4. หน่วยงาน */}
                        <div>
                          <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                            {lang === 'th' ? 'หน่วยงาน / บริษัท' : 'Organization / Workplace'} <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={currentAttendee.workplace}
                              onChange={(e) => updateCurrentAttendee('workplace', e.target.value)}
                              placeholder={lang === 'th' ? 'โรงพยาบาล / คลินิก / บริษัท' : 'Hospital / Clinic / Company'}
                              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                            />
                          </div>
                        </div>

                        {/* 5. ตำแหน่ง (Select + Other input) */}
                        <div>
                          <PositionSelect
                            value={currentAttendee.position}
                            onChange={(val) => updateCurrentAttendee('position', val)}
                            otherValue={currentAttendee.positionOther}
                            onOtherChange={(val) => updateCurrentAttendee('positionOther', val)}
                            required
                            label={lang === 'th' ? 'ตำแหน่ง' : 'Position'}
                          />
                        </div>

                        {/* 6. รหัสสมาชิก (Member ID) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
                              {lang === 'th'
                                ? `รหัสสมาชิก TSRM ${regMode === 'group' ? '(บังคับสำหรับกลุ่ม)' : ''}`
                                : `TSRM Member No. ${regMode === 'group' ? '(Required)' : ''}`}
                              {regMode === 'group' && <span className="text-rose-500 font-bold ml-1">*</span>}
                            </label>
                            <span className="text-[9.5px] xs:text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              {lang === 'th' ? 'รับสิทธิ์ราคาพิเศษ' : 'For Special Rate'}
                            </span>
                          </div>
                          <div className="relative">
                            <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={currentAttendee.memberNo}
                              onChange={(e) => updateCurrentAttendee('memberNo', e.target.value)}
                              placeholder={lang === 'th' ? (regMode === 'group' ? 'กรอกเลขสมาชิก 4 หลัก' : '(เว้นว่างได้ถ้าไม่ใช่สมาชิก)') : ''}
                              className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2 sm:py-2.5 bg-slate-50 text-slate-900 rounded-xl border text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:outline-none transition ${currentAttendee.memberCheckStatus === 'valid'
                                ? 'border-emerald-400 focus:ring-emerald-500'
                                : currentAttendee.memberCheckStatus === 'mismatch' || currentAttendee.memberCheckStatus === 'invalid'
                                  ? 'border-rose-400 focus:ring-rose-500'
                                  : currentAttendee.memberCheckStatus === 'expired'
                                    ? 'border-amber-400 focus:ring-amber-500'
                                    : 'border-slate-200 focus:ring-[#0026b3]'
                                }`}
                            />
                          </div>

                          {/* Debounced Member Check Message below input */}
                          {currentAttendee.memberCheckStatus && currentAttendee.memberCheckStatus !== 'idle' && (
                            <div
                              className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1.5 transition-all animate-fade-in ${currentAttendee.memberCheckStatus === 'valid'
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg'
                                : currentAttendee.memberCheckStatus === 'checking'
                                  ? 'text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg'
                                  : currentAttendee.memberCheckStatus === 'expired'
                                    ? 'text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg'
                                    : 'text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg'
                                }`}
                            >
                              <span>{currentAttendee.memberCheckMessage}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Program Selection Cards for Active Attendee */}
                      <div className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#0026b3]" />
                            <span>{lang === 'th' ? 'เลือกหลักสูตรที่ต้องการเข้าร่วม' : 'Select Program / Courses'}</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <span className="text-[10px] xs:text-[11px] font-semibold text-slate-500">
                            {lang === 'th' ? `เลือกแล้ว ${currentAttendee.selectedPrograms.length} รายการ` : `${currentAttendee.selectedPrograms.length} selected`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {effectiveActivities.map((act) => {
                            const isSelected = currentAttendee.selectedPrograms.includes(act.id);

                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => toggleProgramForCurrentAttendee(act.id)}
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
                        const selectedActs = effectiveActivities.filter(a => currentAttendee.selectedPrograms.includes(a.id));
                        const onsiteOnlyActs = selectedActs.filter(a => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
                        const onlineOnlyActs = selectedActs.filter(a => a.format === 'online');
                        const hasOnsiteOnly = onsiteOnlyActs.length > 0;
                        const hasOnlineOnly = onlineOnlyActs.length > 0;

                        return (
                          <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                            <label className="text-[11px] sm:text-xs font-bold text-slate-700 block">
                              {lang === 'th' ? 'รูปแบบการเข้าร่วม' : 'Attendance Format'}
                            </label>

                            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                              <button
                                type="button"
                                disabled={hasOnlineOnly}
                                onClick={() => {
                                  if (!hasOnlineOnly) setAttendanceTypeForCurrent('onsite');
                                }}
                                className={`py-2.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${hasOnlineOnly
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                  : currentAttendee.attendanceType === 'onsite'
                                    ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                  }`}
                              >
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="truncate">{lang === 'th' ? 'Onsite (ที่งาน)' : 'Onsite'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={hasOnsiteOnly}
                                onClick={() => {
                                  if (!hasOnsiteOnly) setAttendanceTypeForCurrent('online');
                                }}
                                className={`py-2.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${hasOnsiteOnly
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                  : currentAttendee.attendanceType === 'online'
                                    ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                  }`}
                              >
                                <Monitor className="w-4 h-4 shrink-0" />
                                <span className="truncate">{lang === 'th' ? 'Online (ออนไลน์)' : 'Online'}</span>
                              </button>
                            </div>

                            {hasOnsiteOnly && (
                              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200/70 text-amber-800 text-[10.5px] xs:text-[11px] leading-relaxed">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  {lang === 'th'
                                    ? `หลักสูตร "${onsiteOnlyActs.map(a => a.name).join(', ')}" บังคับเข้าร่วม ณ สถานที่จัดงานจริง`
                                    : `Course "${onsiteOnlyActs.map(a => a.name).join(', ')}" requires Onsite attendance.`}
                                </span>
                              </div>
                            )}

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
                          </div>
                        );
                      })()}

                      {/* Pagination Navigation Footer (Previous Person / Next Person) */}
                      {regMode === 'group' && attendees.length > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                          <button
                            type="button"
                            disabled={activeAttendeeIdx === 0}
                            onClick={() => setActiveAttendeeIdx(Math.max(0, activeAttendeeIdx - 1))}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'คนก่อนหน้า' : 'Previous Person'}</span>
                          </button>

                          <span className="text-xs font-bold text-slate-500">
                            {activeAttendeeIdx + 1} / {attendees.length}
                          </span>

                          {activeAttendeeIdx < attendees.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setActiveAttendeeIdx(activeAttendeeIdx + 1)}
                              className="px-3 py-2 bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <span>{lang === 'th' ? 'คนถัดไป' : 'Next Person'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleAddAttendee}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'เพิ่มคนถัดไป' : 'Add Next'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* High-Impact Call to Action Button to Payment Page */}
                      <button
                        type="submit"
                        disabled={verifyingMember}
                        className={`w-full font-black py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base border border-blue-400/20 relative overflow-hidden mt-2 sm:mt-3 ${verifyingMember
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white shadow-blue-900/30 hover:shadow-blue-900/40 cursor-pointer active:scale-[0.99] group'
                          }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />

                        {verifyingMember ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                            <span className="tracking-wide">
                              {lang === 'th' ? 'กำลังตรวจสอบข้อมูลผู้ลงทะเบียน...' : 'Verifying registration data...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="tracking-wide">
                              {regMode === 'group'
                                ? (lang === 'th' ? `ดำเนินการชำระเงินสำหรับ ${attendees.length} ท่าน` : `Proceed to Payment (${attendees.length} Attendees)`)
                                : (lang === 'th' ? 'ดำเนินการต่อไปยังขั้นตอนชำระเงิน' : 'Proceed to Payment')}
                            </span>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                            </div>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
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

      {/* Change Attendance Format Modal */}
      <ChangeFormatModal
        isOpen={isChangeFormatOpen}
        onClose={() => setIsChangeFormatOpen(false)}
        meetingId={activeMeeting?.meeting_id}
        meetingName={activeMeeting?.meeting_name}
        defaultMemberNo={currentAttendee?.memberNo || ''}
      />

      {/* Corporate Sponsor Auth Modal */}
      <SponsorAuthModal
        isOpen={sponsorAuthModalOpen}
        onClose={() => setSponsorAuthModalOpen(false)}
        onSuccess={(sessionData) => {
          lastSponsorActivityRef.current = Date.now();
          setSponsorSecondsRemaining(300);
          setSponsorSession(sessionData);
          setRegMode('group');
        }}
      />

      {/* Profile & Sponsor Update Modal */}
      <ProfileAndSponsorUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}


