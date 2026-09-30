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
  Loader2,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Layers,
  UserCheck,
  Lock,
  X,
  Receipt,
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
import { isPersonalEmail, personalEmailRequiredMessage } from '@/lib/validators/emailPolicy';
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
  /** ที่นั่งคงเหลือจากระบบ (มีเฉพาะกิจกรรมที่จำกัดที่นั่ง) */
  remainingSeats?: number;
  usedSeats?: number;
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
  /** ฟิลด์ที่ดึงค่ามาจากข้อมูลสมาชิก (มีค่า) → ล็อกไม่ให้แก้ไข ส่วนฟิลด์ที่ว่างยังแก้ไขได้ */
  lockedFields?: MemberLockableField[];
  /** แบบกลุ่ม: สมาชิกที่ลงทะเบียนงานนี้แล้ว — เลือกได้เฉพาะกิจกรรมเพิ่มเติม */
  registeredAddOn?: GroupAddOnInfo | null;
}

/** ข้อมูลการลงทะเบียนเดิมของผู้เข้าร่วมในโหมดกลุ่ม (จากการตรวจสอบเลขสมาชิก) */
interface GroupAddOnInfo {
  memberNo: string;
  originalSlipId: string | null;
  ticketCode: string | null;
  originalStatus?: string | null;
  registeredActivityIds: string[];
  registeredActivities: Array<{ id: string; name: string; type?: string; pending?: boolean }>;
}

const sameMemberNo = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().replace(/^0+/, '') === b.trim().replace(/^0+/, '');

/** ข้อมูลลงทะเบียนเพิ่มเติมของผู้เข้าร่วมคนนี้ ใช้ได้เฉพาะเมื่อเลขสมาชิกยังตรงกับที่ตรวจสอบไว้ */
const groupAddOnOf = (att?: ConferenceAttendee): GroupAddOnInfo | null =>
  att?.registeredAddOn && sameMemberNo(att.registeredAddOn.memberNo, att.memberNo) ? att.registeredAddOn : null;

type MemberLockableField = 'nameTh' | 'nameEn' | 'email' | 'workplace' | 'position';

/** ข้อมูลรายการลงทะเบียนเดิม (อนุมัติแล้ว) สำหรับการลงทะเบียนกิจกรรมเพิ่มเติม */
interface AddOnInfo {
  identityKey: string;
  originalSlipId: string;
  ticketCode: string | null;
  originalStatus?: 'pending' | 'approved';
  attendanceType: 'onsite' | 'online' | null;
  registeredActivityIds: string[];
  /** pending = อยู่ในรายการที่ยังรอเจ้าหน้าที่ตรวจสอบ */
  registeredActivities: Array<{ id: string; name: string; type?: string; pending?: boolean }>;
}

/** ตัวระบุผู้ลงทะเบียน: เลขสมาชิก หรืออีเมลสำหรับบุคคลทั่วไป */
const addOnIdentityKey = (att?: { memberNo?: string; email?: string }) =>
  att?.memberNo?.trim() || att?.email?.trim().toLowerCase() || '';

const lockedFieldsFrom = (values: Partial<Record<MemberLockableField, string>>): MemberLockableField[] =>
  (Object.keys(values) as MemberLockableField[]).filter((k) => !!values[k]?.toString().trim());

// Receipt request email: prefilled template the registrant completes in their mail app / Gmail
const RECEIPT_EMAIL = 'tsrmcongress@gmail.com';
const RECEIPT_EMAIL_SUBJECT = 'ขอใบเสร็จรับเงิน';
const RECEIPT_EMAIL_BODY = [
  'เรียน เจ้าหน้าที่สมาคมฯ',
  '',
  'ข้าพเจ้าต้องการขอใบเสร็จรับเงินในรูปแบบการพิมพ์ โดยมีรายละเอียดดังนี้',
  '',
  'ชื่อผู้ลงทะเบียน: ',
  'รหัสสมาชิก (ถ้ามี): ',
  'ชื่อ/บริษัทที่ต้องการให้ออกใบเสร็จ: ',
  'ที่อยู่สำหรับออกใบเสร็จ: ',
  'เลขประจำตัวผู้เสียภาษี: ',
  'เบอร์โทรศัพท์: ',
  '',
  'ขอบคุณค่ะ/ครับ',
].join('\r\n');

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
  /** แอดมินทำรายการแทนบริษัท: ล็อกเป็นแบบกลุ่มในนามบริษัทนี้ (ไม่ต้องยืนยัน OTP) */
  adminSponsorSession?: SponsorSessionData | null;
  /** แอดมิน: ส่งข้อมูลกลับแทนการไปหน้าชำระเงิน */
  onAdminSubmit?: (type: 'registration' | 'membership', payload: unknown) => void;
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
  adminSponsorSession = null,
  onAdminSubmit,
}: LoginViewProps) {
  const router = useRouter();
  const isAdminMode = Boolean(adminSponsorSession);
  const { lang, toggleLang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'conference' | 'membership'>(defaultTab);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  // Active Meeting state
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Registration Mode: Individual vs Group
  const [regMode, setRegMode] = useState<'individual' | 'group'>(adminSponsorSession ? 'group' : 'individual');
  const [activeAttendeeIdx, setActiveAttendeeIdx] = useState(0);

  // Corporate Sponsor Auth Modal state & Inactivity Tracker (5 Mins)
  const [sponsorAuthModalOpen, setSponsorAuthModalOpen] = useState(false);
  const [sponsorSession, setSponsorSession] = useState<SponsorSessionData | null>(adminSponsorSession);
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
    remainingSeats?: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // Handle coupon validation
  const handleApplyCoupon = async (codeOverride?: string): Promise<any | null> => {
    const code = (codeOverride || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError(lang === 'th' ? 'กรุณาระบุรหัสคูปอง' : 'Please enter coupon code');
      return null;
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
        const errMsg = data.message || (lang === 'th' ? 'รหัสคูปองไม่ถูกต้องหรือหมดอายุแล้ว' : 'Invalid or expired coupon code');
        setCouponError(errMsg);
        setCouponState(null);
        return null;
      }

      const usesLeft = typeof data.coupon.remaining_uses === 'number' ? data.coupon.remaining_uses : 9999;
      const verified = {
        code: data.coupon.code,
        companyName: data.coupon.company_name,
        discountType: data.coupon.discount_type,
        discountValue: data.coupon.discount_value,
        discountAmount: data.coupon.discount_amount,
        netPrice: data.coupon.net_price,
        description: data.coupon.discount_description,
        remainingUses: usesLeft,
        remainingSeats: usesLeft,
      };
      setCouponState(verified);
      setCouponCodeInput(data.coupon.code);
      setCouponSuccessMsg(
        lang === 'th'
          ? `✓ ใช้งานคูปองสำเร็จ: ${data.coupon.company_name} (${data.coupon.discount_description})`
          : `✓ Coupon applied: ${data.coupon.company_name} (${data.coupon.discount_description})`
      );
      return verified;
    } catch (err) {
      const errTxt = lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบคูปอง' : 'Failed to validate coupon';
      setCouponError(errTxt);
      return null;
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
    setSponsorSession(adminSponsorSession);
    setRegMode(adminSponsorSession ? 'group' : 'individual');
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
    if (isAdminMode) return;
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
                      lockedFields: att.memberNo
                        ? (att.lockedFields || lockedFieldsFrom({ nameTh: att.nameTh, nameEn: att.nameEn, email: att.email, workplace: att.workplace, position: att.positionCode || att.position }))
                        : [],
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
                      lockedFields: savedDraft.memberNo
                        ? (savedDraft.lockedFields || lockedFieldsFrom({ nameTh: savedDraft.nameTh, nameEn: savedDraft.nameEn, email: savedDraft.email, workplace: savedDraft.workplace, position: savedDraft.positionCode || savedDraft.position }))
                        : [],
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
              } else if (!isAdminMode) {
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

  // ลงทะเบียนเพิ่มเติม: ใช้ได้เฉพาะรายบุคคล และต้องตรงกับผู้ลงทะเบียนที่ตรวจสอบไว้
  const [addOnInfo, setAddOnInfo] = useState<AddOnInfo | null>(null);
  const activeAddOn =
    regMode === 'individual' && addOnInfo && addOnInfo.identityKey === addOnIdentityKey(attendees[0])
      ? addOnInfo
      : null;
  // กิจกรรมที่ลงทะเบียนแล้วของผู้ลงทะเบียนที่กำลังแก้ไข (รายบุคคลหรือแต่ละคนในกลุ่ม)
  const currentAddOn: Pick<AddOnInfo, 'ticketCode' | 'originalStatus' | 'registeredActivityIds' | 'registeredActivities'> | null =
    regMode === 'individual'
      ? activeAddOn
      : (() => {
        const g = groupAddOnOf(currentAttendee);
        return g ? { ...g, originalStatus: g.originalStatus === 'pending' ? 'pending' : 'approved' } : null;
      })();

  const isMemberFieldLocked = (field: MemberLockableField) =>
    currentAttendee?.memberCheckStatus === 'valid' && !!currentAttendee.lockedFields?.includes(field);

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
        if (!sanitized) {
          return {
            ...att,
            memberNo: '',
            nameTh: '',
            nameEn: '',
            email: '',
            position: '',
            positionOther: '',
            workplace: '',
            memberCheckStatus: 'idle',
            memberCheckMessage: '',
            verifiedMember: null,
          };
        }
      }
      return { ...att, [field]: sanitized };
    }));
  };

  const handleAddAttendee = () => {
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
        workplace: '',
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
    const wp = currentAttendee?.workplace?.trim() || '';
    if (!wp) {
      alert(lang === 'th' ? 'กรุณาระบุหน่วยงาน/สถานที่ทำงานของท่านปัจจุบันก่อนคัดลอก' : 'Please enter workplace first');
      return;
    }
    setAttendees(prev => prev.map(att => ({ ...att, workplace: wp })));
    alert(lang === 'th' ? `คัดลอก "${wp}" ไปยังผู้ลงทะเบียนทั้งหมดแล้ว` : `Copied "${wp}" to all attendees`);
  };

  // Debounced Member Verification & Profile Autofill for current attendee
  useEffect(() => {
    const memNo = currentAttendee?.memberNo?.trim();
    const nameTh = currentAttendee?.nameTh?.trim() || '';
    const nameEn = currentAttendee?.nameEn?.trim() || '';

    if (!memNo) {
      if (currentAttendee?.verifiedMember || currentAttendee?.memberCheckStatus === 'valid') {
        setAttendees(prev => prev.map((att, idx) => {
          if (idx !== activeAttendeeIdx) return att;
          return {
            ...att,
            nameTh: '',
            nameEn: '',
            email: '',
            position: '',
            positionOther: '',
            workplace: '',
            memberCheckStatus: 'idle',
            memberCheckMessage: '',
            verifiedMember: null,
          };
        }));
      } else {
        updateCurrentAttendee('memberCheckStatus', 'idle');
        updateCurrentAttendee('memberCheckMessage', '');
        updateCurrentAttendee('verifiedMember', null);
      }
      return;
    }

    updateCurrentAttendee('memberCheckStatus', 'checking');
    updateCurrentAttendee(
      'memberCheckMessage',
      lang === 'th' ? '⏳ กำลังตรวจสอบและค้นหาข้อมูลสมาชิก...' : '⏳ Checking & searching member info...'
    );

    const timer = setTimeout(async () => {
      try {
        let data: any;
        if (sponsorSession?.sponsorId && sponsorSession?.contactEmail) {
          const res = await fetch('/api/sponsors/portal/verify-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberNo: memNo,
              meetingId: activeMeeting?.meeting_id,
              // ── ยืนยันตัวตน sponsor (required) ──
              sponsorId: sponsorSession.sponsorId,
              contactEmail: sponsorSession.contactEmail,
              allowAddOn: true,
            }),
          });
          data = await res.json();
        } else {
          // ลงทะเบียนรายบุคคล (ไม่มี sponsor session) → ใช้ endpoint ตรวจสอบสมาชิกสาธารณะ
          const res = await fetch(`/api/members/verify/${encodeURIComponent(memNo)}`);
          const result = await res.json();
          const m = result?.success ? result.data : null;
          if (!m) {
            data = { valid: false };
          } else {
            const status = (m.membership_status || '').toString();
            const member = {
              member_no: m.member_no,
              fullNameTh: m.full_name_th || '',
              fullNameEn: m.full_name_en || '',
              email: m.email || '',
              workplace: m.workplace || '',
              position: m.position || m.job_category || '',
              membership_status: status,
            };
            let alreadyRegistered = false;
            let regData: any = null;
            if (activeMeeting?.meeting_id && m.member_no) {
              const regRes = await fetch(
                `/api/meetings/${encodeURIComponent(activeMeeting.meeting_id)}/check-registration?memberNo=${encodeURIComponent(m.member_no)}`
              );
              regData = await regRes.json().catch(() => null);
              alreadyRegistered = !!regData?.isRegistered;
            }
            const addOn = alreadyRegistered && regData?.canAddOn && regData.addOn ? regData.addOn : null;
            if (addOn) {
              setAddOnInfo({ ...addOn, identityKey: memNo });
            }
            data = alreadyRegistered && !addOn
              ? { valid: false, alreadyRegistered: true, addOnMessage: regData?.addOnMessage || null }
              : !status || status.toLowerCase() === 'active'
                ? { valid: true, member, addOn }
                : { valid: false, member };
          }
        }
        if (data.valid && data.member) {
          const addOnRegisteredIds: string[] = data.addOn?.registeredActivityIds || [];
          setAttendees(prev => prev.map((att, idx) => {
            if (idx !== activeAttendeeIdx) return att;
            // Autofill fields strictly from verified member profile
            const nextNameTh = data.member.fullNameTh || '';
            const nextNameEn = data.member.fullNameEn || '';
            const nextEmail = data.member.email || att.email || '';
            const nextPosition = data.member.position || '';
            const nextWorkplace = data.member.workplace || att.workplace || '';

            return {
              ...att,
              nameTh: nextNameTh,
              nameEn: nextNameEn,
              email: nextEmail,
              position: nextPosition,
              workplace: nextWorkplace,
              memberCheckStatus: 'valid',
              lockedFields: lockedFieldsFrom({
                nameTh: data.member.fullNameTh,
                nameEn: data.member.fullNameEn,
                email: data.member.email,
                workplace: data.member.workplace,
                position: data.member.position,
              }),
              memberCheckMessage: data.addOn
                ? (lang === 'th'
                  ? `✅ ${data.member.fullNameTh || data.member.fullNameEn} #${data.member.member_no} ลงทะเบียนงานประชุมนี้แล้ว สามารถเลือกกิจกรรมเพิ่มเติมได้`
                  : `✅ ${data.member.fullNameEn || data.member.fullNameTh} #${data.member.member_no} is already registered. You can add more activities.`)
                : (lang === 'th'
                  ? `✅ พบข้อมูลสมาชิก: ${data.member.fullNameTh || data.member.fullNameEn} (#${data.member.member_no})`
                  : `✅ Member found: ${data.member.fullNameTh || data.member.fullNameEn} (#${data.member.member_no})`),
              verifiedMember: data.member,
              // ลงทะเบียนเพิ่มเติม: ล้างกิจกรรมที่ลงทะเบียนไว้แล้วออกจากรายการที่เลือก
              registeredAddOn: sponsorSession && data.addOn ? data.addOn : null,
              ...(data.addOn
                ? {
                  selectedPrograms: att.selectedPrograms.filter(id => !addOnRegisteredIds.includes(id)),
                  attendanceType: data.addOn.attendanceType || att.attendanceType,
                }
                : {}),
            };
          }));
        } else if (data.alreadyRegistered) {
          setAttendees(prev => prev.map((att, idx) => {
            if (idx !== activeAttendeeIdx) return att;
            return {
              ...att,
              nameTh: '',
              nameEn: '',
              email: '',
              position: '',
              positionOther: '',
              workplace: '',
              memberCheckStatus: 'invalid',
              memberCheckMessage: lang === 'th'
                ? `⚠️ สมาชิกหมายเลขนี้ได้ลงทะเบียนงานประชุมนี้แล้ว${data.addOnMessage ? ` ${data.addOnMessage}` : ''}`
                : '⚠️ This member has already registered for this conference',
              verifiedMember: null,
            };
          }));
        } else if (data.member?.membership_status && data.member.membership_status.toLowerCase() !== 'active') {
          // สมาชิกหมดอายุ: ลงทะเบียนต่อได้โดยไม่ต้องต่ออายุ (คิดอัตราบุคคลทั่วไป) จึงดึงข้อมูลเดิมมาให้ แต่ไม่ล็อกช่อง
          setAttendees(prev => prev.map((att, idx) => {
            if (idx !== activeAttendeeIdx) return att;
            return {
              ...att,
              nameTh: data.member.fullNameTh || '',
              nameEn: data.member.fullNameEn || '',
              email: data.member.email || '',
              position: data.member.position || '',
              positionOther: '',
              workplace: data.member.workplace || '',
              memberCheckStatus: 'expired',
              memberCheckMessage: lang === 'th'
                ? '⚠️ สถานะสมาชิกภาพหมดอายุ ลงทะเบียนต่อได้ในอัตราบุคคลทั่วไป หรือต่ออายุสมาชิกเพื่อรับราคาสมาชิก'
                : '⚠️ Membership expired. You can continue at the non-member rate, or renew your membership to get member pricing.',
              lockedFields: [],
              verifiedMember: null,
            };
          }));
        } else {
          setAttendees(prev => prev.map((att, idx) => {
            if (idx !== activeAttendeeIdx) return att;
            return {
              ...att,
              nameTh: '',
              nameEn: '',
              email: '',
              position: '',
              positionOther: '',
              workplace: '',
              memberCheckStatus: 'invalid',
              memberCheckMessage: lang === 'th'
                ? `❌ ไม่พบเลขสมาชิก "${memNo}" ในระบบ กรุณาตรวจสอบให้ถูกต้อง หรือลบออกหากไม่ใช่สมาชิก`
                : `❌ Member No. "${memNo}" not found. Please check it, or clear it if you are not a member.`,
              verifiedMember: null,
            };
          }));
        }
      } catch (err) {
        setAttendees(prev => prev.map((att, idx) => {
          if (idx !== activeAttendeeIdx) return att;
          return {
            ...att,
            nameTh: '',
            nameEn: '',
            email: '',
            position: '',
            positionOther: '',
            workplace: '',
            memberCheckStatus: 'invalid',
            memberCheckMessage: lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบ' : 'Verification error',
            verifiedMember: null,
          };
        }));
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [currentAttendee?.memberNo, activeAttendeeIdx, activeMeeting?.meeting_id, sponsorSession?.sponsorId]);

  // แอดมินทำรายการแทนบริษัท: ดึงคูปองปัจจุบันของบริษัทมากรอกและตรวจสอบให้อัตโนมัติ
  // (คูปองใช้ได้ 1 ครั้ง หลังบันทึกระบบจะออกรหัสใหม่ให้ตามสิทธิ์คงเหลือ)
  const [adminCouponQuota, setAdminCouponQuota] = useState<{ remaining: number; total: number } | null>(null);
  useEffect(() => {
    const sponsorId = adminSponsorSession?.sponsorId;
    if (!sponsorId || !activeMeeting?.meeting_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sponsors/${sponsorId}/current-coupon`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled || !data.success) return;
        setAdminCouponQuota({ remaining: data.remainingQuota || 0, total: data.totalQuota || 0 });
        if (data.coupon?.code) {
          setCouponCodeInput(data.coupon.code);
          await handleApplyCoupon(data.coupon.code);
        } else {
          setCouponState(null);
          setCouponCodeInput('');
        }
      } catch (err) {
        console.error('Failed to load sponsor coupon:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSponsorSession?.sponsorId, activeMeeting?.meeting_id]);

  // ที่นั่งคงเหลือสำหรับผู้ลงทะเบียนที่กำลังแก้ไข (หักผู้ลงทะเบียนคนอื่นในฟอร์มกลุ่มที่เลือกกิจกรรมเดียวกันแล้ว)
  // null = ไม่จำกัดที่นั่ง
  const seatsLeftForCurrent = (act: MeetingActivity): number | null => {
    if (typeof act.remainingSeats !== 'number') return null;
    const takenByOthers = attendees.filter(
      (att, idx) => idx !== activeAttendeeIdx && att.selectedPrograms.includes(act.id)
    ).length;
    return Math.max(0, act.remainingSeats - takenByOthers);
  };

  const toggleProgramForCurrentAttendee = (key: string) => {
    if (currentAddOn?.registeredActivityIds.includes(key)) return; // ลงทะเบียนไว้แล้ว
    const currentProgs = currentAttendee?.selectedPrograms || [];
    let nextProgs: string[];
    if (currentProgs.includes(key)) {
      if (currentProgs.length === 1) return; // keep at least 1
      nextProgs = currentProgs.filter(k => k !== key);
    } else {
      const act = effectiveActivities.find(a => a.id === key);
      if (act && seatsLeftForCurrent(act) === 0) return; // ที่นั่งเต็มแล้ว
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
    if (!isAdminMode && typeof window !== 'undefined' && window.location.search) {
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
    // แอดมินทำรายการแทนบริษัท ไม่ใช้การตัดเซสชันอัตโนมัติ 5 นาที
    if (!sponsorSession || isAdminMode) return;

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
  }, [sponsorSession, lang, isAdminMode]);

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

      // ป้องกันการส่งเลขสมาชิกที่ไม่มีอยู่จริง (ทั้งรายบุคคลและกลุ่ม)
      if (att.memberNo && att.memberNo.trim()) {
        if (att.memberCheckStatus === 'checking' || !att.memberCheckStatus || att.memberCheckStatus === 'idle') {
          alert(
            lang === 'th'
              ? `ระบบกำลังตรวจสอบเลขสมาชิก ${personLabel} กรุณารอสักครู่แล้วกดลงทะเบียนอีกครั้ง`
              : `Member No. ${personLabel} is still being verified. Please wait a moment and try again.`
          );
          setActiveAttendeeIdx(i);
          return;
        }
        if (att.memberCheckStatus === 'invalid' && regMode === 'individual') {
          alert(
            lang === 'th'
              ? `เลขสมาชิก "${att.memberNo.trim()}" ไม่สามารถใช้ลงทะเบียนได้: ${(att.memberCheckMessage || '').replace(/^[❌⚠️\s]+/u, '')}`
              : `Member No. "${att.memberNo.trim()}" cannot be used: ${(att.memberCheckMessage || '').replace(/^[❌⚠️\s]+/u, '')}`
          );
          setActiveAttendeeIdx(i);
          return;
        }
      }

      if (regMode === 'group') {
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

      // ห้ามใช้อีเมลองค์กร ยกเว้นอีเมลที่ดึงมาจากฐานข้อมูลสมาชิก
      const emailFromMemberDb = att.memberCheckStatus === 'valid' && !!att.lockedFields?.includes('email');
      if (!emailFromMemberDb && !isPersonalEmail(emailTrimmed)) {
        alert(`${personalEmailRequiredMessage(lang === 'th' ? 'th' : 'en')} ${personLabel}`);
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
      // ── 1.1 Check Coupon in input box: auto-apply if entered but user forgot to click "ใช้คูปอง" ──
      // คูปองใช้ได้เฉพาะการลงทะเบียนแบบกลุ่มสำหรับบริษัท
      const rawCoupon = regMode === 'group' ? couponCodeInput.trim().toUpperCase() : '';
      let effectiveCoupon = couponState;

      if (rawCoupon) {
        if (!effectiveCoupon || effectiveCoupon.code !== rawCoupon) {
          const applied = await handleApplyCoupon(rawCoupon);
          if (!applied) {
            alert(
              lang === 'th'
                ? `รหัสคูปอง "${rawCoupon}" ไม่ถูกต้องหรือหมดอายุการใช้งาน กรุณาตรวจสอบรหัสคูปอง หรือลบออกหากไม่ต้องการใช้งาน`
                : `Coupon code "${rawCoupon}" is invalid or expired. Please check the code or remove it to proceed.`
            );
            setVerifyingMember(false);
            return;
          }
          effectiveCoupon = applied;
        }
      } else {
        effectiveCoupon = null;
      }

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
              // ใช้สถานะล่าสุดในฐานข้อมูล (membership_status) เป็นหลัก ให้ตรงกับหน้าจัดการสมาชิก
              const status = (memberDataFound.membership_status || '').toLowerCase().trim();
              const active = status === 'active' || status === '';

              if (!active) {
                isExpiredMember = true;
                isMemberCalculated = false;
              } else {
                isMemberCalculated = true;
              }
            } else {
              // เลขสมาชิกไม่มีอยู่จริง → ไม่อนุญาตให้ลงทะเบียนต่อ
              const personLabel = regMode === 'group' ? (lang === 'th' ? ` (ผู้ลงทะเบียนคนที่ ${i + 1})` : ` (Attendee #${i + 1})`) : '';
              alert(
                lang === 'th'
                  ? `ไม่พบเลขสมาชิก "${rawMemberNo}" ในระบบ${personLabel} กรุณาตรวจสอบเลขสมาชิกให้ถูกต้อง หรือลบเลขสมาชิกออกหากไม่ใช่สมาชิก`
                  : `Member No. "${rawMemberNo}" was not found${personLabel}. Please check it, or clear it if you are not a member.`
              );
              setActiveAttendeeIdx(i);
              setVerifyingMember(false);
              return;
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

            const chosenFormat = isMain
              ? (att.attendanceType || 'onsite')
              : (a.format === 'both' ? (att.attendanceType || 'onsite') : (a.format || (a.type === 'workshop' ? 'onsite' : (att.attendanceType || 'onsite'))));

            return {
              id: a.id,
              name: a.name,
              type: a.type,
              date: a.date,
              format: chosenFormat,
              price,
              memberPrice: a.memberPrice,
              nonMemberPrice: a.nonMemberPrice,
            };
          });

        // แบบกลุ่ม: ผู้ที่ลงทะเบียนแล้วลงได้เฉพาะกิจกรรมเพิ่มเติม
        const groupAddOn = regMode === 'group' ? groupAddOnOf(att) : null;
        if (groupAddOn) {
          const registeredIds = new Set(groupAddOn.registeredActivityIds.map(String));
          const remaining = selectedActivityObjects.filter(a => !registeredIds.has(String(a.id)));
          if (remaining.length === 0) {
            alert(
              lang === 'th'
                ? `ผู้ลงทะเบียนคนที่ ${i + 1} ลงทะเบียนกิจกรรมที่เลือกไว้แล้ว กรุณาเลือกกิจกรรมที่ต้องการลงเพิ่ม หรือลบผู้ลงทะเบียนท่านนี้ออก`
                : `Attendee #${i + 1} is already registered for the selected activities. Please choose additional activities or remove this attendee.`
            );
            setActiveAttendeeIdx(i);
            setVerifyingMember(false);
            return;
          }
          selectedActivityObjects.splice(0, selectedActivityObjects.length, ...remaining);
        }

        const attendeeSubtotal = selectedActivityObjects.reduce((sum, item) => sum + item.price, 0);
        groupTotalAmount += attendeeSubtotal;

        const finalNameTh = (isMemberCalculated && memberDataFound?.fullNameTh) ? memberDataFound.fullNameTh : att.nameTh.trim();
        const finalNameEn = (isMemberCalculated && memberDataFound?.fullNameEn) ? memberDataFound.fullNameEn : att.nameEn.trim();
        const finalEmail = (isMemberCalculated && memberDataFound?.email) ? memberDataFound.email : att.email.trim();
        const finalWorkplace = att.workplace.trim() || (isMemberCalculated && memberDataFound?.workplace) || '';
        const finalPosition = (isMemberCalculated && memberDataFound?.position)
          ? memberDataFound.position
          : ((att.position === 'อื่นๆ' || att.position === '0 อื่นๆ')
            ? (att.positionOther || (lang === 'th' ? 'อื่นๆ' : 'Other'))
            : (att.position || ''));

        const programLabel = selectedActivityObjects.map(a => a.name).join(' + ');

        processedAttendees.push({
          id: att.id,
          nameTh: finalNameTh,
          nameEn: finalNameEn,
          email: finalEmail,
          workplace: finalWorkplace,
          position: finalPosition,
          positionCode: att.position,
          memberNo: memberDataFound?.member_no || rawMemberNo,
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
          ...(groupAddOn
            ? {
              isAddOn: true,
              addOnOriginalSlipId: groupAddOn.originalSlipId,
              addOnOriginalTicketCode: groupAddOn.ticketCode,
              registeredActivities: groupAddOn.registeredActivities,
            }
            : {}),
        });
      }


      // If single individual registration, keep backward compatible structure
      if (regMode === 'individual' && processedAttendees.length === 1) {
        let single = processedAttendees[0];

        // Check duplicate — ผู้ที่ลงทะเบียนและได้รับอนุมัติแล้วสามารถลงทะเบียนกิจกรรมเพิ่มเติมได้
        let addOnForSubmit: AddOnInfo | null = null;
        try {
          const checkRes = await fetch(
            `/api/meetings/${encodeURIComponent(activeMeeting.meeting_id)}/check-registration?memberNo=${encodeURIComponent(single.memberNo)}&email=${encodeURIComponent(single.email)}`
          );
          const checkData = await checkRes.json();
          if (checkData.success && checkData.isRegistered) {
            if (!checkData.canAddOn || !checkData.addOn) {
              alert(
                [checkData.message, checkData.addOnMessage].filter(Boolean).join('\n') ||
                (lang === 'th'
                  ? 'ท่านได้ลงทะเบียนเข้าร่วมงานประชุมนี้ในระบบเรียบร้อยแล้ว ไม่สามารถลงทะเบียนซ้ำได้'
                  : 'You have already registered for this conference.')
              );
              return;
            }
            addOnForSubmit = { ...checkData.addOn, identityKey: addOnIdentityKey(attendeesToSubmit[0]) };
            setAddOnInfo(addOnForSubmit);
          }
        } catch (checkErr) {
          console.error('Error checking duplicate:', checkErr);
        }

        if (addOnForSubmit) {
          const registeredIds = new Set(addOnForSubmit.registeredActivityIds);
          const remaining = single.selectedActivities.filter((a: any) => !registeredIds.has(String(a.id)));
          const registeredNames = addOnForSubmit.registeredActivities.map(a => a.name).filter(Boolean).join(', ');
          if (remaining.length === 0) {
            alert(
              lang === 'th'
                ? `ท่านได้ลงทะเบียนกิจกรรมที่เลือกไว้แล้ว: ${registeredNames}\nกรุณาเลือกกิจกรรมอื่นที่ต้องการลงทะเบียนเพิ่มเติม`
                : `You have already registered for: ${registeredNames}\nPlease select other activities to add.`
            );
            return;
          }
          const remainingNames = remaining.map((a: any) => a.name).join(', ');
          const proceed = confirm(
            lang === 'th'
              ? `ท่านลงทะเบียนงานประชุมนี้ไว้แล้ว ${addOnForSubmit.ticketCode ? `รหัส ${addOnForSubmit.ticketCode}` : ''}\n\nระบบจะลงทะเบียนเพิ่มเติมเฉพาะ: ${remainingNames}\nยอดชำระคิดเฉพาะกิจกรรมที่เพิ่ม และจะรวมเข้ากับรายการเดิมหลังเจ้าหน้าที่ตรวจสอบการชำระเงิน\n\nต้องการดำเนินการต่อหรือไม่`
              : `You are already registered ${addOnForSubmit.ticketCode ? `(${addOnForSubmit.ticketCode})` : ''}.\n\nOnly these activities will be added: ${remainingNames}\nYou pay only for the added activities; they will be merged into your registration after payment is verified.\n\nContinue?`
          );
          if (!proceed) return;

          const remainingLabel = remaining.map((a: any) => a.name).join(' + ');
          single = {
            ...single,
            selectedActivities: remaining,
            selectedProgramIds: remaining.map((a: any) => a.id),
            programKey: remaining.map((a: any) => a.id).join(','),
            programNameTh: remainingLabel,
            programNameEn: remainingLabel,
            subtotal: remaining.reduce((sum: number, a: any) => sum + a.price, 0),
          };
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
          couponData: effectiveCoupon || undefined,
          registeredAt: new Date().toISOString(),
          ...(addOnForSubmit
            ? {
              addOnToSlipId: addOnForSubmit.originalSlipId,
              addOnTicketCode: addOnForSubmit.ticketCode,
              registeredActivities: addOnForSubmit.registeredActivities,
            }
            : {}),
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

        if (onAdminSubmit) {
          onAdminSubmit('registration', singlePayload);
          return;
        }
        localStorage.setItem('conference_registration', JSON.stringify(singlePayload));
      } else {
        // สมาชิกหมดอายุ: แนะนำให้ต่ออายุ แต่ลงทะเบียนต่อในอัตราบุคคลทั่วไปได้
        // ผู้ที่ไม่ใช่สมาชิก (รวมสมาชิกหมดอายุ) ลงทะเบียนได้ แต่ไม่ได้รับสิทธิ์คูปองบริษัท
        const namesOf = (list: any[]) => list.map((a) => a.nameTh || a.nameEn).filter(Boolean).join(', ');
        const expiredMembers = processedAttendees.filter((a) => a.isExpiredMember && !a.isAddOn);
        const nonMembers = effectiveCoupon ? processedAttendees.filter((a) => !a.isMember && !a.isAddOn) : [];
        const notices: string[] = [];
        if (expiredMembers.length > 0) {
          notices.push(
            lang === 'th'
              ? `สมาชิกสถานะหมดอายุ ${expiredMembers.length} ท่าน: ${namesOf(expiredMembers)}\nระบบจะคิดค่าลงทะเบียนในอัตราบุคคลทั่วไป หากต้องการราคาสมาชิก แนะนำให้ต่ออายุสมาชิกก่อนลงทะเบียน`
              : `${expiredMembers.length} attendee(s) with expired membership: ${namesOf(expiredMembers)}\nThey will be charged the non-member rate. Renew the membership first to get member pricing.`
          );
        }
        if (nonMembers.length > 0) {
          notices.push(
            lang === 'th'
              ? `ผู้ลงทะเบียนที่ไม่ใช่สมาชิกสถานะปกติ ${nonMembers.length} ท่าน: ${namesOf(nonMembers)}\nจะไม่ได้รับสิทธิ์คูปองบริษัท และชำระในอัตราบุคคลทั่วไป`
              : `${nonMembers.length} attendee(s) without active membership: ${namesOf(nonMembers)}\nThey are not eligible for the company coupon and will pay the non-member rate.`
          );
        }
        if (notices.length > 0) {
          const proceed = confirm(
            `${notices.join('\n\n')}\n\n${lang === 'th' ? 'ต้องการดำเนินการต่อหรือไม่' : 'Continue?'}`
          );
          if (!proceed) return;
        }

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
          couponData: effectiveCoupon || undefined,
          sponsorSession: sponsorSession || undefined,
          groupContact: sponsorSession ? {
            coordinatorEmail: sponsorSession.contactEmail,
            coordinatorName: sponsorSession.contactName || sponsorSession.sponsorName,
            coordinatorPhone: '',
          } : undefined,
          registeredAt: new Date().toISOString(),
        };

        if (onAdminSubmit) {
          onAdminSubmit('registration', groupPayload);
          return;
        }
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
    if (onAdminSubmit && pendingRegPayload) {
      setExpiredModalOpen(false);
      onAdminSubmit('registration', pendingRegPayload);
      return;
    }
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
    <div className={`flex-1 flex flex-col justify-between animate-fade-in ${isAdminMode ? '' : 'min-h-[640px]'}`}>
      {/* Header Blue Card Section */}
      {!isAdminMode && (
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-3.5 xs:px-5 sm:px-8 lg:px-12 pt-3.5 sm:pt-7 pb-5 sm:pb-8 rounded-b-[24px] sm:rounded-b-[36px] shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl xl:max-w-6xl mx-auto relative z-10 space-y-3">
          {/* Top Bar: Brand & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 group hover:opacity-95 transition">
                <TsrmLogo className="w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="min-w-0">
                  <span className="text-[10px] xs:text-xs sm:text-[13px] md:text-sm font-bold text-blue-200 block truncate leading-tight">
                    {t.associationName}
                  </span>
                  <p className="text-xs xs:text-sm sm:text-base font-extrabold text-white leading-tight truncate">{t.brandName}</p>
                </div>
              </div>

              {/* Language Switcher on mobile (top right) */}
              <div className="sm:hidden shrink-0">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs min-h-[34px]"
                  title="Switch Language / สลับภาษา"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
                  <span className="text-white/40 font-normal">|</span>
                  <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
                </button>
              </div>
            </div>

            {/* Quick Action Buttons (2 Clear Full Columns on Mobile, Inline on Desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-xs sm:text-xs md:text-sm font-bold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs group min-h-[38px] sm:min-h-[36px]"
                title={lang === 'th' ? 'อัปเดตข้อมูลสมาชิก / บริษัท' : 'Update Member / Sponsor Profile'}
                aria-label={lang === 'th' ? 'อัปเดตข้อมูลสมาชิก / บริษัท' : 'Update Member / Sponsor Profile'}
              >
                <UserCheck className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold whitespace-nowrap">{lang === 'th' ? 'อัปเดตข้อมูล' : 'Update Info'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-xs sm:text-xs md:text-sm font-bold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs group min-h-[38px] sm:min-h-[36px]"
                title={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
                aria-label={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
              >
                <Search className="w-4 h-4 text-[#4ade80] group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold whitespace-nowrap">{lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}</span>
              </button>

              {/* Language Switcher on Desktop */}
              <div className="hidden sm:block shrink-0">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-xs md:text-sm font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs min-h-[36px]"
                  title="Switch Language / สลับภาษา"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
                  <span className="text-white/40 font-normal">|</span>
                  <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="pt-0.5">
            <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'th' ? 'ลงทะเบียนและสมัครสมาชิก TSRM' : 'TSRM Registration & Membership'}
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-blue-100/90 leading-relaxed mt-0.5 font-normal">
              {lang === 'th'
                ? 'เลือกลงทะเบียนเข้าร่วมงานประชุมวิชาการ หรือ สมัครสมาชิกสมาคมฯ'
                : 'Register for Conference Summit or apply for TSRM membership'}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Content Body */}
      <div className={`${isAdminMode ? 'px-0 py-1' : 'px-3 xs:px-4 sm:px-8 lg:px-12 py-4 sm:py-7'} flex-1 flex flex-col justify-between max-w-5xl xl:max-w-6xl mx-auto w-full`}>
        <div className="space-y-3.5 sm:space-y-6">

          {/* Main Action Segmented Buttons (Conference vs Membership) */}
          <div className="relative grid grid-cols-2 p-1 bg-slate-200/80 rounded-2xl border border-slate-200/90 shadow-inner select-none max-w-xl mx-auto w-full">
            <div
              aria-hidden="true"
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] shadow-md shadow-blue-950/25 ring-2 ring-[#4ade80]/50 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none will-change-transform ${
                activeTab === 'membership' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />

            <button
              type="button"
              onClick={() => handleTabChange('conference')}
              className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-colors duration-200 cursor-pointer active:scale-98 min-h-[44px] ${
                activeTab === 'conference'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ticket
                className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                  activeTab === 'conference' ? 'text-[#4ade80]' : 'text-slate-400'
                }`}
              />
              <span className="leading-tight text-center">{lang === 'th' ? 'ลงทะเบียนเข้าร่วมงานประชุม' : 'Register Conference'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('membership')}
              className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-colors duration-200 cursor-pointer active:scale-98 min-h-[44px] ${
                activeTab === 'membership'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus
                className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                  activeTab === 'membership' ? 'text-[#4ade80]' : 'text-slate-400'
                }`}
              />
              <span className="leading-tight text-center">{lang === 'th' ? 'สมัครสมาชิก TSRM' : 'TSRM Membership'}</span>
            </button>
          </div>

          {/* View 1: Conference Registration Form */}
          {activeTab === 'conference' ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 xs:p-4.5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-5 animate-fade-in">
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
                      <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight leading-snug" title={activeMeeting.meeting_name}>
                        {activeMeeting.meeting_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                        {(activeMeeting.start_date || activeMeeting.meeting_date) && (
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                            <span>{formatMeetingDateDisplay(activeMeeting, lang)}</span>
                          </span>
                        )}
                        {activeMeeting.location && (
                          <span className="flex items-center gap-1 font-medium truncate max-w-full sm:max-w-sm" title={activeMeeting.location}>
                            <MapPin className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                            <span className="truncate">{activeMeeting.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mode Selector: Individual vs Group */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                      {!isAdminMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegMode('individual');
                          setActiveAttendeeIdx(0);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[42px] ${
                          regMode === 'individual'
                            ? 'bg-[#0026b3] text-white shadow-sm ring-1 ring-blue-900'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <User className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{lang === 'th' ? 'ลงทะเบียนรายบุคคล' : 'Individual'}</span>
                      </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!sponsorSession) {
                            setSponsorAuthModalOpen(true);
                          } else {
                            setRegMode('group');
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[42px] ${
                          regMode === 'group'
                            ? 'bg-[#0026b3] text-white shadow-sm ring-1 ring-blue-900'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        <Building2 className={`w-4 h-4 shrink-0 ${regMode === 'group' ? 'text-white' : 'text-blue-600'}`} />
                        <span className="truncate">
                          {sponsorSession
                            ? `${sponsorSession.sponsorName} (${sponsorSession.tier})`
                            : lang === 'th'
                              ? 'ลงทะเบียนกลุ่มบริษัท'
                              : 'Corporate Sponsor'}
                        </span>
                      </button>
                    </div>

                    {regMode === 'group' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={handleCopyWorkplaceToAll}
                          className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 w-full sm:w-auto min-h-[38px]"
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
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 animate-fade-in">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          🏢
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {isAdminMode ? 'แอดมินทำรายการในนาม:' : 'เข้าสู่ระบบในนาม:'} <span className="text-blue-700">{sponsorSession.sponsorName}</span> ({sponsorSession.tier} Sponsor)
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            ผู้ประสานงาน: {sponsorSession.contactEmail}
                            {isAdminMode && adminCouponQuota
                              ? ` • สิทธิ์คูปองคงเหลือ ${adminCouponQuota.remaining.toLocaleString()}/${adminCouponQuota.total.toLocaleString()} ที่นั่ง`
                              : ' (โควต้าคูปองฟรี)'}
                          </div>
                        </div>
                      </div>
                      {!isAdminMode && (
                        <button
                          type="button"
                          onClick={handleSponsorLogout}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer self-end xs:self-auto shrink-0"
                        >
                          ออกจากระบบบริษัท
                        </button>
                      )}
                    </div>
                  )}

                  {/* Corporate Coupon Card - Only shown for Corporate / Group Registration */}
                  {regMode === 'group' && (
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
                            className="w-full pl-9 pr-3 py-2.5 bg-white text-slate-900 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition uppercase min-h-[42px]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={couponLoading || !couponCodeInput.trim()}
                          className="py-2.5 px-4 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 min-h-[42px]"
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

                      <p className="text-[10.5px] sm:text-[11px] text-slate-600 leading-relaxed">
                        {lang === 'th'
                          ? 'คูปองบริษัทใช้ได้เฉพาะผู้ลงทะเบียนที่เป็นสมาชิกสถานะปกติ ผู้ที่ไม่ใช่สมาชิกลงทะเบียนได้ แต่ชำระในอัตราบุคคลทั่วไป'
                          : 'Company coupons apply to active members only. Non-members can register but pay the non-member rate.'}
                      </p>

                      {couponError && (
                        <div className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{couponError}</span>
                        </div>
                      )}

                      {couponState && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-3 py-2 rounded-xl flex items-start gap-2 animate-fade-in">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                          <div className="space-y-0.5">
                            <div>
                              <span className="font-bold text-emerald-950">{couponState.companyName}</span>
                              <span className="font-mono font-bold text-blue-800 ml-1.5 bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                                {couponState.code}
                              </span>
                            </div>
                            <div className="text-emerald-700 text-[10.5px]">
                              {couponState.description} • {lang === 'th' ? 'ระบบจะนำส่วนลดไปหักลบในขั้นตอนสรุปยอดชำระเงินอัตโนมัติ' : 'Discounts will be automatically calculated on the payment step.'}
                            </div>
                          </div>
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
                            <span>{lang === 'th' ? `ลบคนที่ ${activeAttendeeIdx + 1}` : `Remove #${activeAttendeeIdx + 1}`}</span>
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                                isActive
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
                        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-2xl px-3.5 py-2.5 text-xs text-blue-900 font-bold shadow-2xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0026b3] animate-pulse" />
                            {lang === 'th' ? `ข้อมูลคนที่ ${activeAttendeeIdx + 1} จากทั้งหมด ${attendees.length} ท่าน` : `Attendee #${activeAttendeeIdx + 1} of ${attendees.length}`}
                          </span>
                          <span className="text-[11px] text-blue-700 font-medium truncate max-w-[140px] xs:max-w-xs">({currentAttendee.nameTh || (lang === 'th' ? 'ยังไม่ได้ระบุชื่อ' : 'No name')})</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                        {/* 1. รหัสสมาชิก - ช่องแรกสุด พร้อมฟังก์ชันออโต้ฟิล */}
                        <div className="sm:col-span-2 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 border border-blue-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                              <Hash className="w-4 h-4 text-[#0026b3]" />
                              <span>
                                {lang === 'th' ? 'รหัสสมาชิก TSRM' : 'TSRM Member No.'}
                              </span>
                            </label>
                            <span className="text-[10px] sm:text-[11px] text-blue-700 font-extrabold bg-blue-100/90 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>{lang === 'th' ? 'กรอกเลขสมาชิกเพื่อดึงข้อมูลอัตโนมัติ' : 'Auto-fills profile from Member ID'}</span>
                            </span>
                          </div>
                          <div className="relative">
                            <span className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none font-mono font-bold text-sm">#</span>
                            <input
                              type="text"
                              value={currentAttendee.memberNo}
                              onChange={(e) => updateCurrentAttendee('memberNo', e.target.value)}
                              placeholder={lang === 'th' ? 'กรอกเลขสมาชิก (เว้นว่างหากไม่ใช่สมาชิก)' : 'Enter Member No. (Leave blank if not a member)'}
                              className={`w-full pl-9 sm:pl-10 ${currentAttendee.memberNo ? 'pr-9' : 'pr-3.5'} py-2.5 bg-white text-slate-900 rounded-xl border text-sm font-mono font-bold tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:outline-none transition min-h-[44px] ${
                                currentAttendee.memberCheckStatus === 'valid'
                                  ? 'border-emerald-500 focus:ring-emerald-500 ring-1 ring-emerald-400/50'
                                  : currentAttendee.memberCheckStatus === 'mismatch' || currentAttendee.memberCheckStatus === 'invalid'
                                    ? 'border-rose-400 focus:ring-rose-500 ring-1 ring-rose-300'
                                    : currentAttendee.memberCheckStatus === 'expired'
                                      ? 'border-amber-400 focus:ring-amber-500 ring-1 ring-amber-300'
                                      : 'border-slate-300 focus:ring-[#0026b3]'
                              }`}
                            />
                            {currentAttendee.memberNo && (
                              <button
                                type="button"
                                onClick={() => updateCurrentAttendee('memberNo', '')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title={lang === 'th' ? 'ล้างเลขสมาชิกและข้อมูล' : 'Clear Member ID and Data'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Debounced Member Check Message below input */}
                          {currentAttendee.memberCheckStatus && currentAttendee.memberCheckStatus !== 'idle' && (
                            <div
                              className={`mt-1.5 text-[11px] font-bold flex items-center gap-1.5 transition-all animate-fade-in ${
                                currentAttendee.memberCheckStatus === 'valid'
                                  ? 'text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1 rounded-lg'
                                  : currentAttendee.memberCheckStatus === 'checking'
                                    ? 'text-blue-800 bg-blue-100/90 border border-blue-300/80 px-2.5 py-1 rounded-lg'
                                    : currentAttendee.memberCheckStatus === 'expired'
                                      ? 'text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-1 rounded-lg'
                                      : 'text-rose-800 bg-rose-100/90 border border-rose-300/80 px-2.5 py-1 rounded-lg'
                              }`}
                            >
                              <span>{currentAttendee.memberCheckMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* Member Data Lock Notice */}
                        {currentAttendee.memberCheckStatus === 'valid' && (
                          <div className="sm:col-span-2 bg-emerald-50/90 border border-emerald-200/90 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-emerald-900 font-semibold animate-fade-in shadow-2xs">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{lang === 'th' ? 'ระบบล็อกข้อมูลที่ดึงจากฐานข้อมูลสมาชิกเพื่อความถูกต้อง ช่องที่ยังว่างสามารถกรอกเพิ่มเติมได้' : 'Fields filled from the member profile are locked. Empty fields can still be edited.'}</span>
                            </div>
                          </div>
                        )}

                        {/* 2. ชื่อ-นามสกุล (ไทย) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] sm:text-xs font-bold text-slate-700">
                              {lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name (Thai)'} <span className="text-rose-500 font-bold">*</span>
                            </label>
                            {isMemberFieldLocked('nameTh') && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Lock className="w-2.5 h-2.5" />
                                {lang === 'th' ? 'ข้อมูลสมาชิก' : 'Member DB'}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={currentAttendee.nameTh}
                              readOnly={isMemberFieldLocked('nameTh')}
                              onChange={(e) => updateCurrentAttendee('nameTh', e.target.value)}
                              placeholder={lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name (Thai)'}
                              className={`w-full pl-9 sm:pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] ${
                                isMemberFieldLocked('nameTh')
                                  ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none font-semibold'
                                  : 'bg-slate-50 text-slate-900 border-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none'
                              }`}
                            />
                          </div>
                        </div>

                        {/* 3. ชื่อ-นามสกุล (อังกฤษ) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] sm:text-xs font-bold text-slate-700">
                              {lang === 'th' ? 'ชื่อ-นามสกุล ภาษาอังกฤษ' : 'Full Name (English)'} <span className="text-rose-500 font-bold">*</span>
                            </label>
                            {isMemberFieldLocked('nameEn') && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Lock className="w-2.5 h-2.5" />
                                {lang === 'th' ? 'ข้อมูลสมาชิก' : 'Member DB'}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={currentAttendee.nameEn}
                              readOnly={isMemberFieldLocked('nameEn')}
                              onChange={(e) => updateCurrentAttendee('nameEn', e.target.value)}
                              placeholder="Full Name (English)"
                              className={`w-full pl-9 sm:pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] ${
                                isMemberFieldLocked('nameEn')
                                  ? 'bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed select-none font-semibold'
                                  : 'bg-slate-50 text-slate-900 border-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none'
                              }`}
                            />
                          </div>
                        </div>

                        {/* 4. อีเมล */}
                        <div>
                          <SmartEmailInput
                            value={currentAttendee.email}
                            onChange={(val) => updateCurrentAttendee('email', val)}
                            label={
                              <span className="flex items-center justify-between w-full">
                                <span>{lang === 'th' ? 'อีเมล' : 'Email Address'}</span>
                                {isMemberFieldLocked('email') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <Lock className="w-2.5 h-2.5" />
                                    {lang === 'th' ? 'ข้อมูลสมาชิก' : 'Member DB'}
                                  </span>
                                )}
                              </span>
                            }
                            placeholder="youremail@example.com"
                            helperText={
                              currentAttendee.memberCheckStatus === 'valid'
                                ? (lang === 'th' ? 'ระบบจะส่ง QR Code เข้าร่วมงานไปยังอีเมลสมาชิกนี้' : 'Event QR Code will be sent to this member email.')
                                : (lang === 'th' ? 'กรุณากรอกอีเมลที่มีอยู่จริง เพื่อรับ QR Code เข้าร่วมงาน' : 'Please provide a valid email to receive your Event QR Code.')
                            }
                            disabled={isMemberFieldLocked('email')}
                            required
                            personalOnly
                          />
                        </div>

                        {/* 5. หน่วยงาน */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] sm:text-xs font-bold text-slate-700">
                              {lang === 'th' ? 'หน่วยงาน / บริษัท' : 'Organization / Workplace'} <span className="text-rose-500 font-bold">*</span>
                            </label>
                          </div>
                          {/* ไม่ล็อคช่องหน่วยงาน: กรอกอัตโนมัติจากข้อมูลเดิมของสมาชิก แต่แก้ไขได้ */}
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={currentAttendee.workplace}
                              onChange={(e) => updateCurrentAttendee('workplace', e.target.value)}
                              placeholder={lang === 'th' ? 'โรงพยาบาล / คลินิก / บริษัท' : 'Hospital / Clinic / Company'}
                              className="w-full pl-9 sm:pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] bg-slate-50 text-slate-900 border-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* 6. ตำแหน่ง (Select + Other input) */}
                        <div className="sm:col-span-2">
                          <PositionSelect
                            value={currentAttendee.position}
                            onChange={(val) => updateCurrentAttendee('position', val)}
                            otherValue={currentAttendee.positionOther}
                            onOtherChange={(val) => updateCurrentAttendee('positionOther', val)}
                            required
                            disabled={isMemberFieldLocked('position')}
                            label={
                              <span className="flex items-center justify-between w-full">
                                <span>{lang === 'th' ? 'ตำแหน่ง' : 'Position'}</span>
                                {isMemberFieldLocked('position') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <Lock className="w-2.5 h-2.5" />
                                    {lang === 'th' ? 'ข้อมูลสมาชิก' : 'Member DB'}
                                  </span>
                                )}
                              </span>
                            }
                          />
                        </div>
                      </div>

                      {/* Program Selection Cards for Active Attendee */}
                      <div className="space-y-2 pt-1 sm:pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#0026b3]" />
                            <span>{lang === 'th' ? 'เลือกหลักสูตรที่ต้องการเข้าร่วม' : 'Select Program / Courses'}</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <span className="text-[10px] xs:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {lang === 'th' ? `เลือกแล้ว ${currentAttendee.selectedPrograms.length} รายการ` : `${currentAttendee.selectedPrograms.length} selected`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {currentAddOn && regMode === 'group' && (
                            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-semibold leading-relaxed">
                              {lang === 'th'
                                ? `ผู้ลงทะเบียนท่านนี้ลงทะเบียนงานประชุมนี้ไว้แล้ว${currentAddOn.ticketCode ? ` รหัส ${currentAddOn.ticketCode}` : ''} เลือกเฉพาะกิจกรรมที่ต้องการลงเพิ่ม คิดค่าใช้จ่ายเฉพาะกิจกรรมที่เพิ่ม และไม่ใช้สิทธิ์คูปองของบริษัท เมื่อเจ้าหน้าที่อนุมัติ ระบบจะรวมกิจกรรมเข้ากับรายการลงทะเบียนเดิมของผู้ลงทะเบียนท่านนี้`
                                : `This attendee is already registered${currentAddOn.ticketCode ? ` (${currentAddOn.ticketCode})` : ''}. Select only the activities to add; only those are charged and the company coupon is not applied. Once approved, they are merged into this attendee's existing registration.`}
                            </div>
                          )}
                          {activeAddOn && (
                            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-semibold leading-relaxed">
                              {lang === 'th'
                                ? `ท่านลงทะเบียนงานประชุมนี้ไว้แล้ว${activeAddOn.ticketCode ? ` รหัส ${activeAddOn.ticketCode}` : ''}${activeAddOn.originalStatus === 'pending' ? ' ซึ่งอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ' : ''} เลือกเฉพาะกิจกรรมที่ต้องการเพิ่ม ยอดชำระคิดเฉพาะกิจกรรมที่เพิ่ม และระบบจะรวมเข้ากับรายการเดิมหลังเจ้าหน้าที่ตรวจสอบการชำระเงิน`
                                : `You are already registered${activeAddOn.ticketCode ? ` (${activeAddOn.ticketCode})` : ''}${activeAddOn.originalStatus === 'pending' ? ', pending staff review' : ''}. Select only the activities you want to add; you pay only for those, and they will be merged into your registration after payment is verified.`}
                            </div>
                          )}
                          {effectiveActivities.map((act) => {
                            const isAlreadyRegistered = Boolean(currentAddOn?.registeredActivityIds.includes(act.id));
                            const isRegistrationPending = Boolean(
                              currentAddOn?.registeredActivities.find(r => String(r.id) === String(act.id))?.pending
                            );
                            const isSelected = !isAlreadyRegistered && currentAttendee.selectedPrograms.includes(act.id);

                            if (isAlreadyRegistered) {
                              return (
                                <div
                                  key={act.id}
                                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-100/80 text-slate-500 flex items-center justify-between gap-3 cursor-not-allowed"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className={`inline-block text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded border mb-1 ${
                                      isRegistrationPending
                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    }`}>
                                      {isRegistrationPending
                                        ? (lang === 'th' ? 'ลงทะเบียนแล้ว รอตรวจสอบ' : 'Registered, pending review')
                                        : (lang === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered')}
                                    </span>
                                    <h4 className="text-xs sm:text-sm font-bold leading-snug" title={act.name}>
                                      {act.name}
                                    </h4>
                                  </div>
                                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                                </div>
                              );
                            }

                            const seatsLeft = seatsLeftForCurrent(act);
                            const isFull = !isSelected && seatsLeft === 0;

                            return (
                              <button
                                key={act.id}
                                type="button"
                                disabled={isFull}
                                onClick={() => toggleProgramForCurrentAttendee(act.id)}
                                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                                  isFull
                                    ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                                    : isSelected
                                      ? 'bg-blue-50/90 border-[#0026b3] text-slate-900 shadow-2xs ring-1.5 ring-[#0026b3]/30 font-bold cursor-pointer active:scale-[0.99]'
                                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-700 font-medium cursor-pointer active:scale-[0.99]'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                                      act.type === 'main'
                                        ? (isSelected ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-700')
                                        : (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700')
                                    }`}>
                                      {act.type === 'main' ? (lang === 'th' ? 'หลักสูตรหลัก' : 'Main') : (lang === 'th' ? 'เวิร์กช็อป' : 'Workshop')}
                                    </span>

                                    {(() => {
                                      const fmt = act.format || (act.type === 'workshop' ? 'onsite' : 'both');
                                      return (
                                        <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 border ${
                                          fmt === 'online'
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

                                    {seatsLeft !== null && (
                                      <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 border ${
                                        isFull
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : seatsLeft <= 10
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}>
                                        {isFull
                                          ? (lang === 'th' ? 'ที่นั่งเต็มแล้ว' : 'Fully booked')
                                          : (lang === 'th' ? `เหลือ ${seatsLeft} ที่นั่ง` : `${seatsLeft} seats left`)}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className={`text-xs sm:text-sm font-extrabold leading-snug ${isFull ? 'text-slate-500' : 'text-slate-900'}`} title={act.name}>
                                    {act.name}
                                  </h4>
                                </div>

                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'bg-[#0026b3] text-white shadow-2xs' : 'border border-slate-300 bg-white'
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
                          <div className="space-y-1.5 pt-1">
                            <label className="text-xs sm:text-sm font-black text-slate-800 block">
                              {lang === 'th' ? 'รูปแบบการเข้าร่วม' : 'Attendance Format'}
                            </label>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <button
                                type="button"
                                disabled={hasOnlineOnly}
                                onClick={() => {
                                  if (!hasOnlineOnly) setAttendanceTypeForCurrent('onsite');
                                }}
                                className={`py-3 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                                  hasOnlineOnly
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                    : currentAttendee.attendanceType === 'onsite'
                                      ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95 font-black'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              >
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="truncate">{lang === 'th' ? 'เข้าร่วมที่งาน' : 'Onsite'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={hasOnsiteOnly}
                                onClick={() => {
                                  if (!hasOnsiteOnly) setAttendanceTypeForCurrent('online');
                                }}
                                className={`py-3 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                                  hasOnsiteOnly
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                    : currentAttendee.attendanceType === 'online'
                                      ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 cursor-pointer active:scale-95 font-black'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium cursor-pointer active:scale-95'
                                }`}
                              >
                                <Monitor className="w-4 h-4 shrink-0" />
                                <span className="truncate">{lang === 'th' ? 'เข้าร่วมออนไลน์' : 'Online'}</span>
                              </button>
                            </div>

                            {hasOnsiteOnly && (
                              <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/70 text-amber-800 text-xs leading-relaxed">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  {lang === 'th'
                                    ? `หลักสูตร "${onsiteOnlyActs.map(a => a.name).join(', ')}" บังคับเข้าร่วม ณ สถานที่จัดงานจริง`
                                    : `Course "${onsiteOnlyActs.map(a => a.name).join(', ')}" requires Onsite attendance.`}
                                </span>
                              </div>
                            )}

                            {hasOnlineOnly && (
                              <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/70 text-blue-800 text-xs leading-relaxed">
                                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span>
                                  {lang === 'th'
                                    ? `หลักสูตร "${onlineOnlyActs.map(a => a.name).join(', ')}" จัดการเรียนผ่านระบบ Online เท่านั้น`
                                    : `Course "${onlineOnlyActs.map(a => a.name).join(', ')}" is Online only.`}
                                </span>
                              </div>
                            )}

                            {/* Format Change Fee Notice */}
                            {(() => {
                              const changeFeeConfig = activeMeeting?.pricing_tiers?.changeFee;
                              const feeAmount = (activeMeeting as any)?.change_format_fee || changeFeeConfig?.onsiteMember || 1000;
                              const conditionDate = changeFeeConfig?.conditionDate || '';
                              const customPolicy = (activeMeeting as any)?.change_format_policy || changeFeeConfig?.policyText;

                              let noticeText = '';
                              if (customPolicy && customPolicy.trim()) {
                                noticeText = customPolicy.trim();
                              } else if (lang === 'th') {
                                noticeText = `หมายเหตุ: เปลี่ยนรูปแบบการเข้าร่วม${
                                  conditionDate ? ' หลัง ' + conditionDate : ''
                                } มีค่าธรรมเนียม ${feeAmount.toLocaleString()} บาท`;
                              } else {
                                noticeText = `Note: Changing attendance format${
                                  conditionDate ? ' after ' + conditionDate : ''
                                } fee is ${feeAmount.toLocaleString()} THB`;
                              }

                              return (
                                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs animate-fade-in shadow-2xs flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 leading-relaxed">
                                    <span className="font-medium">{noticeText}</span>
                                    <button
                                      type="button"
                                      onClick={() => setIsChangeFormatOpen(true)}
                                      className="inline-flex items-center gap-1 font-bold text-[#0026b3] hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg transition-all active:scale-95 shadow-2xs text-[11px] sm:text-xs cursor-pointer shrink-0"
                                    >
                                      <span>{lang === 'th' ? 'แจ้งเปลี่ยนรูปแบบ' : 'Change Format Request'}</span>
                                      <ExternalLink className="w-3 h-3 text-[#0026b3] shrink-0" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}

                      {/* Pagination Navigation Footer (Previous Person / Next Person) */}
                      {regMode === 'group' && attendees.length > 1 && (
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                          <button
                            type="button"
                            disabled={activeAttendeeIdx === 0}
                            onClick={() => setActiveAttendeeIdx(Math.max(0, activeAttendeeIdx - 1))}
                            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer min-h-[40px]"
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
                              className="px-3.5 py-2.5 bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-xs min-h-[40px]"
                            >
                              <span>{lang === 'th' ? 'คนถัดไป' : 'Next Person'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleAddAttendee}
                              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-xs min-h-[40px]"
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
                        className={`w-full font-black py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base border border-blue-400/20 relative overflow-hidden mt-3 sm:mt-4 min-h-[48px] sm:min-h-[52px] ${
                          verifyingMember
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
                            <span className="tracking-wide truncate">
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
                adminSponsorSession={adminSponsorSession}
                onNavigateToLogin={() => handleTabChange('conference')}
                onSubmitSignup={onAdminSubmit ? (payload) => onAdminSubmit('membership', payload) : handleMembershipComplete}
              />
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className={`${isAdminMode ? 'hidden' : ''} text-center pt-4 sm:pt-6 pb-2 space-y-2`}>
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500">
              <Shield className="w-3.5 h-3.5 text-[#0026b3]" />
              {t.login.securityBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Receipt Request Footer */}
      {!isAdminMode && (
      <footer className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-3.5 xs:px-5 sm:px-8 lg:px-12 pt-5 sm:pt-7 pb-5 sm:pb-7 rounded-t-[24px] sm:rounded-t-[36px] shadow-xl relative overflow-hidden mt-2">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -right-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl xl:max-w-6xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Receipt className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#4ade80]" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {lang === 'th' ? 'หากต้องการใบเสร็จรับเงิน' : 'Need an official receipt?'}
              </p>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                {lang === 'th'
                  ? 'ขอเป็นรูปแบบการพิมพ์ ให้ออกใบเสร็จในนามใคร ที่อยู่ เลขประจำตัวผู้เสียภาษี เบอร์โทรศัพท์ กรุณาแจ้งที่'
                  : 'For a printed receipt, please send the name to issue it to, address, tax ID and phone number to'}
              </p>
            </div>
          </div>

          <a
            href={`mailto:${RECEIPT_EMAIL}?subject=${encodeURIComponent(RECEIPT_EMAIL_SUBJECT)}&body=${encodeURIComponent(RECEIPT_EMAIL_BODY)}`}
            onClick={(e) => {
              // Desktop browsers often have no mail client configured, so open Gmail compose instead
              const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
              if (isMobile) return;
              e.preventDefault();
              const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${RECEIPT_EMAIL}&su=${encodeURIComponent(RECEIPT_EMAIL_SUBJECT)}&body=${encodeURIComponent(RECEIPT_EMAIL_BODY)}`;
              window.open(gmailUrl, '_blank', 'noopener,noreferrer');
            }}
            title={lang === 'th' ? 'ส่งอีเมลขอใบเสร็จรับเงิน' : 'Email us to request a receipt'}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-xs sm:text-sm font-bold transition border border-white/20 active:scale-95 shadow-2xs group min-h-[38px] shrink-0"
          >
            <Mail className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-semibold break-all">tsrmcongress@gmail.com</span>
          </a>
        </div>
      </footer>
      )}

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
        statusText={expiredMemberInfo?.statusText}      />

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
        systemType="registration"
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


