'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  Mail,
  Phone,
  Calendar,
  Building,
  Building2,
  Award,
  GraduationCap,
  QrCode,
  Camera,
  Plus,
  Trash2,
  Hash,
  FileText,
  Globe,
  ChevronDown,
  RotateCcw,
  Info,
  ShieldCheck,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  Copy,
  Layers,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import { PositionSelect, isScientistPosition } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import { SponsorAuthModal, SponsorSessionData } from '@/components/SponsorAuthModal';
import { useLanguage } from '@/context/LanguageContext';
import { uploadImageToStorage } from '@/lib/blobUpload';
import { CreateMemberInput } from '@/types/member';

interface SignupViewProps {
  onNavigateToLogin: () => void;
  onSubmitSignup?: (memberData: any) => void;
  onGoogleSignUp?: () => void;
  onClearForm?: () => void;
  initialUserData?: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  } | null;
  isEmbedded?: boolean;
}

export interface EducationRow {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface ApplicantFormData {
  id: string;
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  mobile: string;
  email: string;
  workplace: string;
  startDate: string;
  position: string;
  positionOther: string;
  scientistNo: string;
  referees: string;
  educations: EducationRow[];
  photoPreview: string | null;
  selectedPhotoFile: File | null;
  degreeCertPreview: string | null;
  selectedDegreeCertFile: File | null;
  workCertPreview: string | null;
  selectedWorkCertFile: File | null;
}

const createInitialApplicant = (id: string, workplace = ''): ApplicantFormData => ({
  id,
  nameTh: '',
  nameEn: '',
  id4Digits: '',
  mobile: '',
  email: '',
  workplace,
  startDate: '',
  position: '',
  positionOther: '',
  scientistNo: '',
  referees: '',
  educations: [{ id: '1', degree: '', institution: '', year: '' }],
  photoPreview: null,
  selectedPhotoFile: null,
  degreeCertPreview: null,
  selectedDegreeCertFile: null,
  workCertPreview: null,
  selectedWorkCertFile: null,
});

export function SignupView({
  onNavigateToLogin,
  onSubmitSignup,
  onGoogleSignUp,
  onClearForm,
  initialUserData,
  isEmbedded = false
}: SignupViewProps) {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const { lang, toggleLang, t } = useLanguage();

  // Mode: Individual vs Group / Corporate
  const [regMode, setRegMode] = useState<'individual' | 'group'>('individual');
  const [activeApplicantIdx, setActiveApplicantIdx] = useState(0);
  const [sponsorAuthModalOpen, setSponsorAuthModalOpen] = useState(false);
  const [sponsorSession, setSponsorSession] = useState<SponsorSessionData | null>(null);
  const [sponsorSecondsRemaining, setSponsorSecondsRemaining] = useState<number>(300);
  const lastSponsorActivityRef = useRef<number>(Date.now());

  // Fast person switch animation state
  const [isSwitchingPerson, setIsSwitchingPerson] = useState(false);
  const [switchingLabel, setSwitchingLabel] = useState('');

  // Multi-applicant state
  const [applicants, setApplicants] = useState<ApplicantFormData[]>([
    createInitialApplicant('1'),
  ]);

  const handleSponsorLogout = () => {
    setSponsorSession(null);
    setRegMode('individual');
    setApplicants([createInitialApplicant('1')]);
    setActiveApplicantIdx(0);
  };

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentApplicant = applicants[activeApplicantIdx] || applicants[0];

  const triggerPersonSwitch = (newIdx: number) => {
    setSwitchingLabel(lang === 'th' ? `ผู้สมัครคนที่ ${newIdx + 1}` : `Applicant #${newIdx + 1}`);
    setIsSwitchingPerson(true);
    setActiveApplicantIdx(newIdx);
    setTimeout(() => {
      setIsSwitchingPerson(false);
    }, 200);
  };

  const updateCurrentApplicant = (field: keyof ApplicantFormData, value: any) => {
    setApplicants(prev => prev.map((app, idx) => {
      if (idx !== activeApplicantIdx) return app;
      let sanitized = value;
      if (field === 'nameTh') {
        sanitized = value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, '');
      } else if (field === 'nameEn') {
        sanitized = value.replace(/[^a-zA-Z\s\.\-']/g, '');
      } else if (field === 'id4Digits') {
        sanitized = value.replace(/\D/g, '').slice(0, 4);
      } else if (field === 'mobile') {
        sanitized = value.replace(/\D/g, '').slice(0, 10);
      }
      return { ...app, [field]: sanitized };
    }));
  };

  const handleAddApplicant = () => {
    const defaultWorkplace = applicants[0]?.workplace || '';
    const newId = Date.now().toString();
    const newIdx = applicants.length;
    setApplicants(prev => [...prev, createInitialApplicant(newId, defaultWorkplace)]);
    triggerPersonSwitch(newIdx);
  };

  const handleRemoveApplicant = (idxToRemove: number) => {
    if (applicants.length <= 1) return;
    setApplicants(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (activeApplicantIdx >= idxToRemove) {
      const nextIdx = Math.max(0, activeApplicantIdx - 1);
      triggerPersonSwitch(nextIdx);
    }
  };

  const handleCopyWorkplaceToAll = () => {
    const wp = currentApplicant?.workplace?.trim() || '';
    if (!wp) {
      alert(lang === 'th' ? 'กรุณาระบุสถานที่ทำงานก่อนคัดลอก' : 'Please enter workplace first');
      return;
    }
    setApplicants(prev => prev.map(app => ({ ...app, workplace: wp })));
    alert(lang === 'th' ? `คัดลอก "${wp}" ไปยังผู้สมัครทุกคนแล้ว` : `Copied "${wp}" to all applicants`);
  };

  const handleEducationChange = (eduId: string, field: keyof EducationRow, value: string) => {
    let sanitizedValue = value;
    if (field === 'year') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    setApplicants(prev => prev.map((app, idx) => {
      if (idx !== activeApplicantIdx) return app;
      return {
        ...app,
        educations: app.educations.map(edu => edu.id === eduId ? { ...edu, [field]: sanitizedValue } : edu),
      };
    }));
  };

  const addEducationRow = () => {
    const newEduId = Date.now().toString();
    setApplicants(prev => prev.map((app, idx) => {
      if (idx !== activeApplicantIdx) return app;
      return {
        ...app,
        educations: [...app.educations, { id: newEduId, degree: '', institution: '', year: '' }],
      };
    }));
  };

  const removeEducationRow = (eduId: string) => {
    setApplicants(prev => prev.map((app, idx) => {
      if (idx !== activeApplicantIdx) return app;
      if (app.educations.length <= 1) return app;
      return {
        ...app,
        educations: app.educations.filter(edu => edu.id !== eduId),
      };
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดรูปถ่ายเกิน 5MB กรุณาเลือกไฟล์ใหม่' : 'Photo size exceeds 5MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    updateCurrentApplicant('photoPreview', objectUrl);
    updateCurrentApplicant('selectedPhotoFile', file);
  };

  const handleDegreeCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ใหม่' : 'File size exceeds 10MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    updateCurrentApplicant('degreeCertPreview', objectUrl);
    updateCurrentApplicant('selectedDegreeCertFile', file);
  };

  const handleWorkCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ใหม่' : 'File size exceeds 10MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    updateCurrentApplicant('workCertPreview', objectUrl);
    updateCurrentApplicant('selectedWorkCertFile', file);
  };

  const handleClearForm = () => {
    setApplicants([createInitialApplicant('1')]);
    setActiveApplicantIdx(0);
    setConsentChecked(false);
    setSubmitError(null);
    setRegMode('individual');

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('membership_registration');
        localStorage.removeItem('tsrm_user');
        localStorage.removeItem('thaisrm_user');
        document.cookie = 'tsrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'tsrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'thaisrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'thaisrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to clean storage in clearForm:', e);
      }
    }

    if (onClearForm) {
      onClearForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const applicantsToSubmit = regMode === 'individual' ? [applicants[0]] : applicants;

    const THAI_NAME_REGEX = /[\u0E00-\u0E7F]/;
    const ENG_NAME_REGEX = /[a-zA-Z]/;
    const ID_LAST4_REGEX = /^\d{4}$/;
    const THAI_MOBILE_REGEX = /^(0[2-9][0-9]{7,8}|\+66[2-9][0-9]{7,8})$/;
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // ── 1. Strict Validation for each applicant ───────────────────────────────────
    for (let i = 0; i < applicantsToSubmit.length; i++) {
      const app = applicantsToSubmit[i];
      const personLabel = regMode === 'group' ? (lang === 'th' ? `(ผู้สมัครคนที่ ${i + 1})` : `(Applicant #${i + 1})`) : '';

      // 1.1 Thai Name
      const cleanNameTh = (app.nameTh || '').trim();
      if (!cleanNameTh) {
        setSubmitError(lang === 'th' ? `กรุณากรอกชื่อ-นามสกุล (ภาษาไทย) ${personLabel}` : `Please enter full name in Thai ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }
      if (!THAI_NAME_REGEX.test(cleanNameTh) || cleanNameTh.length < 2) {
        setSubmitError(lang === 'th' ? `ชื่อ-นามสกุลภาษาไทยต้องประกอบด้วยตัวอักษรภาษาไทย ${personLabel}` : `Thai full name must contain Thai characters ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.2 English Name
      const cleanNameEn = (app.nameEn || '').trim();
      if (!cleanNameEn) {
        setSubmitError(lang === 'th' ? `กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษ) ${personLabel}` : `Please enter full name in English ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }
      if (!ENG_NAME_REGEX.test(cleanNameEn) || cleanNameEn.length < 2) {
        setSubmitError(lang === 'th' ? `ชื่อ-นามสกุลภาษาอังกฤษต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ${personLabel}` : `English full name must contain English letters ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.3 ID Last 4 Digits
      const cleanId4 = (app.id4Digits || '').trim();
      if (!cleanId4 || !ID_LAST4_REGEX.test(cleanId4)) {
        setSubmitError(lang === 'th' ? `กรุณากรอกเลข 4 หลักท้ายบัตรประชาชนให้ครบถ้วน 4 หลักตัวเลข ${personLabel}` : `Please enter 4 numeric digits of ID card ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.4 Mobile Phone
      const cleanMobile = (app.mobile || '').replace(/[\s\-]/g, '');
      if (!cleanMobile || !THAI_MOBILE_REGEX.test(cleanMobile)) {
        setSubmitError(lang === 'th' ? `กรุณากรอกเบอร์โทรศัพท์มือถือที่ถูกต้อง (เช่น 0812345678) ${personLabel}` : `Please enter a valid mobile number (e.g., 0812345678) ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.5 Email
      const cleanEmail = (app.email || '').trim().toLowerCase();
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        setSubmitError(lang === 'th' ? `กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบ (เช่น name@example.com) ${personLabel}` : `Please enter a valid email address ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.6 Workplace
      if (!app.workplace || !app.workplace.trim()) {
        setSubmitError(lang === 'th' ? `กรุณากรอกสถานที่ทำงาน/หน่วยงาน ${personLabel}` : `Please enter workplace ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.7 Position
      if (!app.position || !app.position.trim()) {
        setSubmitError(lang === 'th' ? `กรุณาเลือกตำแหน่งการทำงาน ${personLabel}` : `Please select work position ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }
      if ((app.position === '0 อื่นๆ' || app.position === '0 Other') && (!app.positionOther || !app.positionOther.trim())) {
        setSubmitError(lang === 'th' ? `กรุณาระบุรายละเอียดตำแหน่งงานเพิ่มเติม ${personLabel}` : `Please specify position details ${personLabel}`);
        triggerPersonSwitch(i);
        return;
      }

      // 1.8 Educations Validation
      if (app.educations && Array.isArray(app.educations)) {
        for (let eduIdx = 0; eduIdx < app.educations.length; eduIdx++) {
          const edu = app.educations[eduIdx];
          if (edu.year && edu.year.trim()) {
            const yearNum = Number(edu.year.trim());
            if (isNaN(yearNum) || !/^\d{4}$/.test(edu.year.trim()) || (yearNum < 1900 || (yearNum > 2100 && yearNum < 2450) || yearNum > 2650)) {
              setSubmitError(lang === 'th' ? `ปีที่จบการศึกษาในประวัติการศึกษาแถวที่ ${eduIdx + 1} ไม่ถูกต้อง (ระบุเป็น พ.ศ. หรือ ค.ศ. 4 หลัก) ${personLabel}` : `Graduation year in education row #${eduIdx + 1} is invalid ${personLabel}`);
              triggerPersonSwitch(i);
              return;
            }
          }
        }
      }
    }

    // 1.9 Check in-form duplicate emails in group mode
    if (regMode === 'group' && applicantsToSubmit.length > 1) {
      const emailSet = new Set<string>();
      for (let i = 0; i < applicantsToSubmit.length; i++) {
        const email = applicantsToSubmit[i].email?.trim()?.toLowerCase();
        if (email) {
          if (emailSet.has(email)) {
            setSubmitError(lang === 'th' ? `พบอีเมล ${email} ซ้ำกันในรายการผู้สมัครกลุ่ม (ผู้สมัครคนที่ ${i + 1})` : `Duplicate email ${email} in applicant roster (#${i + 1})`);
            triggerPersonSwitch(i);
            return;
          }
          emailSet.add(email);
        }
      }
    }

    // Validate Consent (Required)
    if (!consentChecked) {
      setSubmitError(lang === 'th' ? 'กรุณายอมรับข้อกำหนดและข้อบังคับสมาคมฯ ก่อนดำเนินการต่อ' : 'Please agree to the association terms and regulations');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // ── 2. Pre-check Database Duplicates (Real-time DB query) ──────────────────────
    try {
      const allEmails = applicantsToSubmit.map(a => a.email.trim().toLowerCase()).filter(Boolean);
      const dupCheckRes = await fetch('/api/members/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: allEmails }),
      });
      if (dupCheckRes.ok) {
        const dupData = await dupCheckRes.json();
        if (dupData.isDuplicate) {
          setSubmitError(dupData.message || (lang === 'th' ? 'มีอีเมลนี้อยู่ในระบบสมาชิกแล้ว' : 'Email is already registered'));
          setSubmitting(false);
          return;
        }
      }
    } catch (dupErr) {
      console.warn('Pre-duplicate check warning:', dupErr);
    }

    try {
      // ── 2. Upload files for each applicant ───────────────────────────────────────
      const processedApplicants: CreateMemberInput[] = [];

      for (let i = 0; i < applicantsToSubmit.length; i++) {
        const app = applicantsToSubmit[i];

        // Photo Upload
        let finalPhotoUrl: string | null = app.photoPreview && !app.photoPreview.startsWith('blob:') ? app.photoPreview : null;
        if (app.selectedPhotoFile) {
          try {
            const uploadRes = await uploadImageToStorage(app.selectedPhotoFile, 'avatars');
            if (uploadRes?.url) finalPhotoUrl = uploadRes.url;
          } catch (uploadErr) {
            console.warn('Photo upload failed for applicant', i, uploadErr);
          }
        }

        // Degree Cert Upload
        let finalDegreeCertUrl: string | null = app.degreeCertPreview && !app.degreeCertPreview.startsWith('blob:') ? app.degreeCertPreview : null;
        if (app.selectedDegreeCertFile) {
          try {
            const uploadRes = await uploadImageToStorage(app.selectedDegreeCertFile, 'documents');
            if (uploadRes?.url) finalDegreeCertUrl = uploadRes.url;
          } catch (uploadErr) {
            console.warn('Degree cert upload failed for applicant', i, uploadErr);
          }
        }

        // Work Cert Upload
        let finalWorkCertUrl: string | null = app.workCertPreview && !app.workCertPreview.startsWith('blob:') ? app.workCertPreview : null;
        if (app.selectedWorkCertFile) {
          try {
            const uploadRes = await uploadImageToStorage(app.selectedWorkCertFile, 'documents');
            if (uploadRes?.url) finalWorkCertUrl = uploadRes.url;
          } catch (uploadErr) {
            console.warn('Work cert upload failed for applicant', i, uploadErr);
          }
        }

        const memberPayload: CreateMemberInput = {
          full_name_th: app.nameTh.trim(),
          full_name_en: app.nameEn.trim() || null,
          id_last4: app.id4Digits.trim() || null,
          mobile: app.mobile.trim() || null,
          email: app.email.trim() || null,
          line_id: null,
          workplace: app.workplace.trim() || null,
          start_date: app.startDate || null,
          position: (app.position === '0 อื่นๆ' || app.position === '0 Other')
            ? (app.positionOther.trim() || 'อื่นๆ')
            : app.position,
          job_category: app.position,
          member_type_other: (app.position === '0 อื่นๆ' || app.position === '0 Other')
            ? (app.positionOther.trim() || null)
            : null,
          scientist_reg_no: app.scientistNo.trim() || null,
          referees: app.referees.trim() || null,
          photo_path: finalPhotoUrl,
          degree_cert_doc: finalDegreeCertUrl,
          work_cert_doc: finalWorkCertUrl,
          membership_type: 'Regular',
          membership_status: 'Active',
          educations: app.educations
            .filter(edu => edu.degree.trim() !== '' || edu.institution.trim() !== '')
            .map((edu, idx) => ({
              degree: edu.degree.trim(),
              institution: edu.institution.trim(),
              graduation_year: edu.year.trim() ? parseInt(edu.year.trim(), 10) : null,
              display_order: idx + 1,
            })),
        };

        processedApplicants.push(memberPayload);
      }

      if (regMode === 'individual' && processedApplicants.length === 1) {
        const singlePayload = processedApplicants[0];
        if (typeof window !== 'undefined') {
          localStorage.setItem('membership_registration', JSON.stringify(singlePayload));
        }
        if (onSubmitSignup) {
          await onSubmitSignup(singlePayload);
        }
      } else {
        // Group Membership Application
        const groupPayload = {
          isGroup: true,
          companyName: processedApplicants[0]?.workplace || 'Corporate Membership',
          applicants: processedApplicants,
          totalAmount: 1000 * processedApplicants.length,
          submittedAt: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('membership_registration', JSON.stringify(groupPayload));
        }
        if (onSubmitSignup) {
          await onSubmitSignup(groupPayload);
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setSubmitError(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการลงทะเบียน' : 'Application submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isEmbedded ? "w-full animate-fade-in space-y-3" : "flex-1 flex flex-col justify-between animate-fade-in min-h-[640px] pb-8 pt-2 max-w-5xl xl:max-w-6xl mx-auto w-full"}>
      <div className={isEmbedded ? "px-0 py-1 flex-1 flex flex-col space-y-3 sm:space-y-4" : "px-3 xs:px-4 sm:px-8 lg:px-12 py-2 sm:py-4 flex-1 flex flex-col space-y-3 sm:space-y-4"}>

        {/* Mode Selector: Individual vs Group */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setRegMode('individual');
                triggerPersonSwitch(0);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${regMode === 'individual'
                ? 'bg-[#0026b3] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <User className="w-4 h-4" />
              <span>{lang === 'th' ? 'สมัครสมาชิกรายบุคคล' : 'Individual'}</span>
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                regMode === 'group'
                  ? 'bg-[#0026b3] text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>
                {sponsorSession
                  ? `${sponsorSession.sponsorName} (${sponsorSession.tier})`
                  : lang === 'th'
                  ? 'สมัครแบบกลุ่มสำหรับบริษัท (OTP)'
                  : 'Corporate Sponsor (OTP)'}
              </span>
            </button>
          </div>

          {regMode === 'group' && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyWorkplaceToAll}
                className="text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="คัดลอกสถานที่ทำงานไปยังทุกคน"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'คัดลอกที่ทำงานให้ทุกคน' : 'Copy Workplace to All'}</span>
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
                <p className="text-xs font-bold text-slate-800">
                  {lang === 'th' ? 'สมัครสมาชิกในนาม:' : 'Registering as:'}{' '}
                  <span className="text-[#0026b3]">{sponsorSession.sponsorName}</span>
                  <span className="ml-1 text-[11px] font-normal text-slate-500">({sponsorSession.tier} Sponsor)</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'th' ? 'ผู้ประสานงาน:' : 'Contact:'} {sponsorSession.contactEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSponsorLogout}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs shrink-0"
            >
              {lang === 'th' ? 'ออกจากระบบบริษัท' : 'Exit Sponsor Mode'}
            </button>
          </div>
        )}

        {/* Multi-Applicant Pagination Header Tabs (When in Group Mode) */}
        {regMode === 'group' && (
          <div className="space-y-2 pt-1 border-b border-slate-200/80 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>{lang === 'th' ? 'รายชื่อผู้สมัครสมาชิก (คลิกเพื่อสลับฟอร์ม):' : 'Applicant Roster (Click to switch):'}</span>
              </span>

              {applicants.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveApplicant(activeApplicantIdx)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? `ลบผู้สมัครคนที่ ${activeApplicantIdx + 1}` : `Remove #${activeApplicantIdx + 1}`}</span>
                </button>
              )}
            </div>

            {/* Pagination Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {applicants.map((app, idx) => {
                const isActive = idx === activeApplicantIdx;
                const isComplete = Boolean(app.nameTh.trim());
                const displayName = app.nameTh.trim() ? (app.nameTh.length > 12 ? app.nameTh.slice(0, 12) + '...' : app.nameTh) : `${lang === 'th' ? 'ผู้สมัครคนที่' : 'Applicant'} ${idx + 1}`;

                return (
                  <button
                    key={app.id}
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

              <button
                type="button"
                onClick={handleAddApplicant}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 border-dashed transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เพิ่มผู้สมัคร' : 'Add Applicant'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Single Page Form Container with Person Switching Flash Overlay */}
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

          <form onSubmit={handleSubmit} key={`signup-form-${currentApplicant.id}`} className="space-y-4 sm:space-y-5 animate-fade-in">

            {regMode === 'group' && (
              <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-2xl px-4 py-2.5 text-xs text-blue-900 font-bold shadow-2xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0026b3] animate-pulse" />
                  {lang === 'th' ? `ข้อมูลผู้สมัครคนที่ ${activeApplicantIdx + 1} จากทั้งหมด ${applicants.length} ท่าน` : `Applicant #${activeApplicantIdx + 1} of ${applicants.length}`}
                </span>
                <span className="text-[11px] text-blue-700 font-medium">({currentApplicant.nameTh || (lang === 'th' ? 'ยังไม่ได้ระบุชื่อ' : 'No name specified')})</span>
              </div>
            )}

            {/* 1. ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก (Personal Info & Photo) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="w-4 h-4 text-[#0026b3] shrink-0" />
                <span>{lang === 'th' ? 'ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก' : 'Personal Information & Profile Photo'}</span>
              </h3>

              {/* Profile Photo Upload Row */}
              <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-white rounded-2xl p-3.5 sm:p-4 border border-blue-100 flex flex-col sm:flex-row items-center gap-3.5 sm:gap-5">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-blue-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-2xs group-hover:border-[#0026b3] transition-all relative">
                    {currentApplicant.photoPreview ? (
                      <img
                        src={currentApplicant.photoPreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-[#0026b3] transition-colors">
                        <User className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5] mb-0.5" />
                        <span className="text-[9px] font-bold text-slate-500">{lang === 'th' ? 'รูปถ่าย' : 'Photo'}</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      title="เลือกรูปโปรไฟล์"
                    />
                  </div>

                  <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0026b3] text-white flex items-center justify-center shadow-md border-2 border-white pointer-events-none group-hover:scale-110 transition-transform">
                    <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                      {lang === 'th' ? 'รูปถ่ายหน้าตรงติดบัตรสมาชิก' : 'Member ID Profile Photo'}
                    </h4>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {lang === 'th' ? 'รูปหน้าตรงสุภาพ' : 'Formal Photo'}
                    </span>
                  </div>
                  <p className="text-[10.5px] sm:text-xs text-slate-500 leading-tight">
                    {lang === 'th' ? 'อัปโหลดรูปถ่ายหน้าตรงสุภาพ (ไฟล์ JPG/PNG ขนาดไม่เกิน 5MB)' : 'Upload formal portrait photo (JPG/PNG, max 5MB)'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs hover:border-[#0026b3] transition active:scale-95">
                      <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                      <span>{currentApplicant.photoPreview ? (lang === 'th' ? 'เปลี่ยนรูปถ่าย' : 'Change Photo') : (lang === 'th' ? 'เลือกรูปถ่าย' : 'Choose Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>

                    {currentApplicant.photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentApplicant('photoPreview', null);
                          updateCurrentApplicant('selectedPhotoFile', null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'th' ? 'ลบรูป' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* ชื่อ-นามสกุล (Thai) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.signup.nameThLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nameTh"
                    autoComplete="name"
                    placeholder={t.signup.nameThPlaceholder}
                    value={currentApplicant.nameTh}
                    onChange={(e) => updateCurrentApplicant('nameTh', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                  />
                </div>

                {/* Name (English) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.signup.nameEnLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nameEn"
                    autoComplete="name"
                    placeholder={t.signup.nameEnPlaceholder}
                    value={currentApplicant.nameEn}
                    onChange={(e) => updateCurrentApplicant('nameEn', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                  />
                </div>
              </div>

              {/* ID 4 Digits & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 leading-tight">
                    {t.signup.id4DigitsLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="id4Digits"
                    autoComplete="off"
                    maxLength={4}
                    placeholder={t.signup.id4DigitsPlaceholder}
                    value={currentApplicant.id4Digits}
                    onChange={(e) => updateCurrentApplicant('id4Digits', e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 leading-tight">
                    {t.signup.mobileLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                    <input
                      type="tel"
                      name="mobile"
                      autoComplete="tel"
                      placeholder={t.signup.mobilePlaceholder}
                      value={currentApplicant.mobile}
                      onChange={(e) => updateCurrentApplicant('mobile', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <SmartEmailInput
                  value={currentApplicant.email}
                  onChange={(val) => updateCurrentApplicant('email', val)}
                  label={t.signup.emailLabel}
                  placeholder={t.signup.emailPlaceholder}
                  required
                />
              </div>
            </div>

            {/* 2. สถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน (Workplace & Position) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Building className="w-4 h-4 text-[#0026b3] shrink-0" />
                <span>{lang === 'th' ? 'ข้อมูลสถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน' : 'Workplace, Position & Work Proof'}</span>
              </h3>

              {/* Workplace & Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.signup.workplaceLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                    <input
                      type="text"
                      name="workplace"
                      autoComplete="organization"
                      placeholder={t.signup.workplacePlaceholder}
                      value={currentApplicant.workplace}
                      onChange={(e) => updateCurrentApplicant('workplace', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.signup.startDateLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                    <input
                      type="date"
                      name="startDate"
                      autoComplete="bday"
                      value={currentApplicant.startDate}
                      onChange={(e) => updateCurrentApplicant('startDate', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Position Select */}
              <PositionSelect
                value={currentApplicant.position}
                onChange={(val) => updateCurrentApplicant('position', val)}
                otherValue={currentApplicant.positionOther}
                onOtherChange={(val) => updateCurrentApplicant('positionOther', val)}
                showIcon={false}
                showLabel={true}
                label={t.signup.positionTitle}
                otherLabel={t.signup.positionOtherLabel}
                otherPlaceholder={t.signup.positionOtherPlaceholder}
                selectClassName="px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-2xs"
              />

              {/* Scientist License No. (Optional) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{t.signup.scientistNoTitle}</span>
                  <span className="text-[11px] font-medium text-slate-400">({lang === 'th' ? 'ถ้ามี' : 'Optional'})</span>
                </label>
                <input
                  type="text"
                  name="scientistNo"
                  autoComplete="off"
                  placeholder={lang === 'th' ? 'กรอกเลขทะเบียนนักวิทย์ (ถ้ามี)...' : 'Enter scientist registration number (optional)...'}
                  value={currentApplicant.scientistNo}
                  onChange={(e) => updateCurrentApplicant('scientistNo', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0026b3] font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Embedded Work Certificate Upload Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#0026b3]" />
                    <span>{lang === 'th' ? 'รูปหลักฐานใบรับรองการทำงาน' : 'Work Certificate Document'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {lang === 'th' ? 'เอกสารรับรองงาน' : 'Work Cert'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                  {currentApplicant.workCertPreview ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-2xs">
                      <img
                        src={currentApplicant.workCertPreview}
                        alt="Work Cert"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 flex items-center justify-center text-indigo-500 shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-[11px] text-slate-600 leading-tight font-medium">
                      {currentApplicant.workCertPreview
                        ? (lang === 'th' ? 'แนบรูปหลักฐานใบรับรองการทำงานแล้ว' : 'Work certificate attached')
                        : (lang === 'th' ? 'อัปโหลดใบรับรองการทำงาน (JPG, PNG หรือ PDF ไม่เกิน 10MB)' : 'Upload work certificate (JPG, PNG, PDF max 10MB)')}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200 shadow-2xs transition active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                        <span>{currentApplicant.workCertPreview ? (lang === 'th' ? 'เปลี่ยนไฟล์' : 'Change') : (lang === 'th' ? 'อัปโหลดใบรับรองงาน' : 'Upload Work Cert')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleWorkCertUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>

                      {currentApplicant.workCertPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentApplicant('workCertPreview', null);
                            updateCurrentApplicant('selectedWorkCertFile', null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'th' ? 'ลบเอกสาร' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ประวัติการศึกษาและหลักฐานปริญญาบัตร (Education Background & Degree Certificate) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-1.5 min-w-0">
                  <GraduationCap className="w-4 h-4 text-[#0026b3] shrink-0" />
                  <span className="leading-snug">{lang === 'th' ? 'ประวัติการศึกษาและหลักฐานปริญญาบัตร' : 'Education Background & Degree Certificate'}</span>
                </h3>
                <button
                  type="button"
                  onClick={addEducationRow}
                  className="text-[11px] sm:text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer border border-[#0026b3]/20 shrink-0 whitespace-nowrap shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t.signup.educationAddRow}</span>
                </button>
              </div>

              {/* Table Rows */}
              <div className="space-y-2.5 sm:space-y-3">
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-xs font-bold text-[#0026b3]">
                  <div className="col-span-4">{t.signup.degreeHeader}</div>
                  <div className="col-span-5">{t.signup.institutionHeader}</div>
                  <div className="col-span-2">{t.signup.yearHeader}</div>
                  <div className="col-span-1 text-center">{t.signup.actionHeader}</div>
                </div>

                {currentApplicant.educations.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 bg-slate-50/80 p-2.5 sm:p-2 rounded-xl border border-slate-200 items-center"
                  >
                    <div className="sm:col-span-4">
                      <span className="sm:hidden block text-[9.5px] font-bold text-slate-500 mb-1">{t.signup.degreeHeader}</span>
                      <input
                        type="text"
                        name={`degree_${idx}`}
                        autoComplete="off"
                        placeholder={t.signup.degreePlaceholder}
                        value={row.degree}
                        onChange={(e) => handleEducationChange(row.id, 'degree', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0026b3] font-medium"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <span className="sm:hidden block text-[9.5px] font-bold text-slate-500 mb-1">{t.signup.institutionHeader}</span>
                      <input
                        type="text"
                        name={`institution_${idx}`}
                        autoComplete="organization"
                        placeholder={t.signup.institutionPlaceholder}
                        value={row.institution}
                        onChange={(e) => handleEducationChange(row.id, 'institution', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0026b3] font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <span className="sm:hidden block text-[9.5px] font-bold text-slate-500 mb-1">{t.signup.yearHeader}</span>
                      <input
                        type="text"
                        name={`year_${idx}`}
                        autoComplete="off"
                        placeholder={t.signup.yearPlaceholder}
                        value={row.year}
                        onChange={(e) => handleEducationChange(row.id, 'year', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0026b3] font-medium"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end sm:justify-center pt-0.5 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => removeEducationRow(row.id)}
                        disabled={currentApplicant.educations.length <= 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                        title={t.signup.deleteRowTitle}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Embedded Degree Certificate Upload Box */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-2 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#0026b3]" />
                    <span>{lang === 'th' ? 'รูปหลักฐานปริญญาบัตร' : 'Degree Certificate Document'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    {lang === 'th' ? 'ปริญญาบัตร' : 'Degree'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                  {currentApplicant.degreeCertPreview ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-2xs">
                      <img
                        src={currentApplicant.degreeCertPreview}
                        alt="Degree Cert"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center text-blue-500 shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-[11px] text-slate-600 leading-tight font-medium">
                      {currentApplicant.degreeCertPreview
                        ? (lang === 'th' ? 'แนบรูปหลักฐานปริญญาบัตรแล้ว' : 'Degree certificate attached')
                        : (lang === 'th' ? 'อัปโหลดรูปหลักฐานปริญญาบัตร (JPG, PNG หรือ PDF ไม่เกิน 10MB)' : 'Upload degree certificate (JPG, PNG, PDF max 10MB)')}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 shadow-2xs transition active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                        <span>{currentApplicant.degreeCertPreview ? (lang === 'th' ? 'เปลี่ยนไฟล์' : 'Change') : (lang === 'th' ? 'อัปโหลดปริญญาบัตร' : 'Upload Degree')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleDegreeCertUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>

                      {currentApplicant.degreeCertPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentApplicant('degreeCertPreview', null);
                            updateCurrentApplicant('selectedDegreeCertFile', null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'th' ? 'ลบเอกสาร' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Clause 10.5 Notice Banner & Terms Consent */}
            <div className="space-y-3">
              <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] sm:text-xs leading-relaxed text-amber-950">
                    <span className="font-extrabold text-amber-900 block mb-0.5">ข้อบังคับสมาคมฯ ข้อ ๑๐.๕:</span>
                    {t.signup.clause105Notice}
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
                <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="w-4 h-4 text-[#0026b3] focus:ring-[#0026b3] rounded border-slate-300 mt-0.5 shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed group-hover:text-slate-900 transition">
                    {t.signup.consentCheckboxLabel} <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Error Banner if any */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs text-red-600 font-bold flex items-start gap-2.5 animate-fade-in shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 6. Form Submission Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-gradient-to-r from-[#4ade80] via-[#38d172] to-[#22c55e] hover:brightness-105 text-[#061d08] font-black text-xs xs:text-sm sm:text-base py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 sm:gap-3 border border-emerald-300/80 relative overflow-hidden group ${
                  submitting ? 'opacity-75 cursor-wait' : 'cursor-pointer'
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/70 opacity-90" />
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#061d08]" />
                    <span className="tracking-wide whitespace-nowrap">
                      {lang === 'th' ? 'กำลังบันทึกข้อมูลสมาชิก...' : 'Submitting Application...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide whitespace-nowrap">
                      {regMode === 'group'
                        ? (lang === 'th' ? `ส่งใบสมัครสมาชิก (${applicants.length} ท่าน - รวม ${(1000 * applicants.length).toLocaleString()} บาท)` : `Submit Applications (${applicants.length} Applicants - ${(1000 * applicants.length).toLocaleString()} THB)`)
                        : t.signup.submitButton}
                    </span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-950/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <Check className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[3] text-[#061d08]" />
                    </div>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                className="w-full py-2.5 sm:py-3 px-4 bg-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 font-bold text-xs sm:text-sm rounded-xl border border-slate-200/90 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs group"
                title={t.signup.clearFormButton}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-red-500 group-hover:-rotate-45 transition-transform" />
                <span>{t.signup.clearFormButton}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Switch to Login */}
        {!isEmbedded && (
          <div className="text-center pt-2 pb-2">
            <p className="text-xs text-slate-500">
              {t.signup.alreadyHaveAccount}{' '}
              <button
                onClick={onNavigateToLogin}
                className="text-[#0026b3] font-bold hover:underline cursor-pointer ml-1"
              >
                {t.signup.loginLink}
              </button>
            </p>
          </div>
        )}
      </div>

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
    </div>
  );
}
