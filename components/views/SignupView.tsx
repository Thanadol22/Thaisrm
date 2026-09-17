'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Award,
  GraduationCap,
  QrCode,
  Camera,
  Plus,
  Trash2,
  Hash,
  FileText,
  MessageSquare,
  Globe,
  ChevronDown,
  RotateCcw,
  Info,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { GoogleIcon } from '@/components/GoogleIcon';
import { PositionSelect } from '@/components/PositionSelect';
import { useLanguage } from '@/context/LanguageContext';
import { parseGoogleName } from '@/lib/utils';
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

interface EducationRow {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export function SignupView({
  onNavigateToLogin,
  onSubmitSignup,
  onGoogleSignUp,
  onClearForm,
  initialUserData,
  isEmbedded = false
}: SignupViewProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [consentChecked, setConsentChecked] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState(false);
  const { lang, toggleLang, t } = useLanguage();

  const initialNames = parseGoogleName(
    initialUserData?.name,
    initialUserData?.given_name,
    initialUserData?.family_name
  );

  // Form states matching TSRM Member application form
  const [formData, setFormData] = useState({
    nameTh: initialNames.nameTh,
    nameEn: initialNames.nameEn,
    id4Digits: '',
    mobile: '',
    email: initialUserData?.email || '',
    lineId: '',
    workplace: '',
    startDate: '',
    position: '',
    positionOther: '',
    scientistNo: '',
  });

  const [educationList, setEducationList] = useState<EducationRow[]>([
    { id: '1', degree: '', institution: '', year: '' },
  ]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(initialUserData?.picture || null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goToStep = (step: 1 | 2 | 3) => {
    setSubmitError(null);
    setCurrentStep(step);
  };

  // Synchronize initialUserData prop changes when Google profile is provided
  useEffect(() => {
    if (initialUserData && (initialUserData.name || initialUserData.email || initialUserData.picture)) {
      const { nameTh, nameEn } = parseGoogleName(
        initialUserData.name,
        initialUserData.given_name,
        initialUserData.family_name
      );
      setFormData(prev => ({
        ...prev,
        nameTh: nameTh || prev.nameTh,
        nameEn: nameEn || prev.nameEn,
        email: initialUserData.email || prev.email,
      }));
      if (initialUserData.picture) {
        setPhotoPreview(initialUserData.picture);
      }
      setAutofillSuccess(true);
      const timer = setTimeout(() => setAutofillSuccess(false), 4000);
      return () => clearTimeout(timer);
    } else if (initialUserData === null) {
      setFormData({
        nameTh: '',
        nameEn: '',
        id4Digits: '',
        mobile: '',
        email: '',
        lineId: '',
        workplace: '',
        startDate: '',
        position: '',
        positionOther: '',
        scientistNo: '',
      });
      setPhotoPreview(null);
      setSelectedPhotoFile(null);
      setAutofillSuccess(false);
    }
  }, [initialUserData]);

  // Handle Google button: triggers Google OAuth account picker
  const handleGoogleAutoFill = () => {
    if (onGoogleSignUp) {
      onGoogleSignUp();
    }
  };

  const handleClearForm = () => {
    setFormData({
      nameTh: '',
      nameEn: '',
      id4Digits: '',
      mobile: '',
      email: '',
      lineId: '',
      workplace: '',
      startDate: '',
      position: '',
      positionOther: '',
      scientistNo: '',
    });
    setEducationList([
      { id: '1', degree: '', institution: '', year: '' },
    ]);
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
    setConsentChecked(false);
    setSubmitError(null);
    setCurrentStep(1);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('membership_registration');
        localStorage.removeItem('thaisrm_user');
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEducationChange = (id: string, field: keyof EducationRow, value: string) => {
    setEducationList(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addEducationRow = () => {
    setEducationList(prev => [
      ...prev,
      { id: Date.now().toString(), degree: '', institution: '', year: '' }
    ]);
  };

  const removeEducationRow = (id: string) => {
    if (educationList.length <= 1) return;
    setEducationList(prev => prev.filter(item => item.id !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate Thai Name (Required)
    if (!formData.nameTh || !formData.nameTh.trim()) {
      setSubmitError(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' : 'Please enter your full name in Thai');
      setCurrentStep(2);
      return;
    }

    // Validate Consent (Required)
    if (!consentChecked) {
      setSubmitError(lang === 'th' ? 'กรุณายอมรับข้อกำหนดและข้อบังคับสมาคมฯ' : 'Please agree to the association terms and conditions');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload photo to storage if user picked a new file
      let finalPhotoUrl: string | null = photoPreview && !photoPreview.startsWith('blob:') ? photoPreview : null;
      if (selectedPhotoFile) {
        try {
          const uploadRes = await uploadImageToStorage(selectedPhotoFile, 'avatars');
          if (uploadRes?.url) {
            finalPhotoUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Photo upload failed, continuing registration without photo:', uploadErr);
        }
      }

      // 2. Prepare payload - directly matching existing database fields
      // Unfilled fields are sent as null / empty without creating new fields
      const payload: CreateMemberInput = {
        full_name_th: formData.nameTh.trim(),
        full_name_en: formData.nameEn.trim() || null,
        id_last4: formData.id4Digits.trim() || null,
        mobile: formData.mobile.trim() || null,
        email: formData.email.trim() || null,
        line_id: formData.lineId.trim() || null,
        workplace: formData.workplace.trim() || null,
        start_date: formData.startDate || null,
        position: (formData.position === '0 อื่นๆ' || formData.position === '0 Other')
          ? (formData.positionOther.trim() || 'อื่นๆ')
          : formData.position,
        job_category: formData.position,
        member_type_other: (formData.position === '0 อื่นๆ' || formData.position === '0 Other')
          ? (formData.positionOther.trim() || null)
          : null,
        scientist_reg_no: formData.scientistNo.trim() || null,
        photo_path: finalPhotoUrl,
        membership_type: 'Regular',
        membership_status: 'Active',
        educations: educationList
          .filter(edu => edu.degree.trim() !== '' || edu.institution.trim() !== '')
          .map(edu => ({
            degree: edu.degree.trim() || null,
            institution: edu.institution.trim() || null,
            graduation_year: edu.year.trim() ? parseInt(edu.year.trim(), 10) : null,
            display_order: 1,
          })),
      };

      // 3. Directly POST to /api/members (No summary view shown)
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิก' : 'Failed to register member'));
      }

      const createdMember = resData.data;

      // Clean up any legacy localStorage data
      try {
        localStorage.removeItem('membership_registration');
        localStorage.removeItem('thaisrm_user');
      } catch (e) {}

      // Trigger callback with created member data from database
      if (onSubmitSignup) {
        onSubmitSignup(createdMember);
      }
    } catch (err: any) {
      console.error('Signup submit error:', err);
      setSubmitError(err.message || (lang === 'th' ? 'ไม่สามารถส่งใบสมัครได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง' : 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isEmbedded ? "w-full animate-fade-in space-y-3" : "flex-1 flex flex-col justify-between animate-fade-in min-h-[640px] pb-8 pt-2 max-w-5xl xl:max-w-6xl mx-auto w-full"}>
      {/* Form Body */}
      <div className={isEmbedded ? "px-0 py-1 flex-1 flex flex-col space-y-4" : "px-3.5 sm:px-8 lg:px-12 py-2 sm:py-4 flex-1 flex flex-col space-y-4"}>

        {/* Roadmap Stepper Bar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs mb-1">
          <div className="flex items-center justify-between relative px-2 sm:px-6">
            {/* Connecting Progress Line */}
            <div className="absolute top-4 sm:top-5 left-10 right-10 h-1 bg-slate-200 -z-0">
              <div
                className="h-full bg-[#0026b3] transition-all duration-300 rounded-full"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              />
            </div>

            {[
              { id: 1, title: t.signup.step1Title },
              { id: 2, title: t.signup.step2Title },
              { id: 3, title: t.signup.step3Title },
            ].map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id as 1 | 2 | 3)}
                  className="flex flex-col items-center relative z-10 group cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm transition-all shadow-sm ${isCompleted
                        ? 'bg-[#4ade80] text-[#061d08] ring-4 ring-[#4ade80]/20'
                        : isCurrent
                          ? 'bg-[#0026b3] text-white ring-4 ring-[#0026b3]/20 scale-110'
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : step.id}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold mt-1.5 whitespace-nowrap transition ${isCurrent ? 'text-[#0026b3] font-black' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                      }`}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">

          {/* STEP 1: Account Creation, Google Sign-Up & Photo Upload */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Google Sign-Up Prompt in Step 1 */}
              <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#0026b3]">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold">สมัครสมาชิกแบบรวดเร็วด้วยบัญชี Google</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  กดเลือกสมัครด้วย Google เพื่อดึงข้อมูลโปรไฟล์ ชื่อ-นามสกุล, อีเมล และรูปถ่ายเข้าสู่ระบบอัตโนมัติ
                </p>
                <button
                  type="button"
                  onClick={handleGoogleAutoFill}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-xl border border-slate-300 shadow-2xs hover:shadow transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">{t.signup.googleSignUpButton}</span>
                </button>

                {autofillSuccess && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 justify-center animate-fade-in pt-0.5">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>{t.signup.googleAutofillSuccessToast}</span>
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-[#f6f8fc] px-3 text-xs font-semibold text-slate-400 uppercase absolute">
                  {t.signup.orDivider} กรอกข้อมูลด้วยตนเอง
                </span>
              </div>

              {/* Digital Photo Upload Section */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-[#0026b3] flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">
                      {t.signup.photoSectionTitle} <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-normal">
                      {t.signup.photoSectionSubtitle}
                    </p>
                  </div>
                </div>

                {/* Photo Preview Container */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#0026b3] transition cursor-pointer shadow-2xs">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Digital Photo Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><rect width="120" height="140" fill="%23dbeafe"/><circle cx="60" cy="50" r="28" fill="%230026b3"/><path d="M15 130c0-26 20-40 45-40s45 14 45 40" fill="%230026b3"/></svg>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center px-2 text-center">
                        <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400 mb-1 group-hover:text-[#0026b3] transition" />
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-[#0026b3]">{t.signup.photoChoose}</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setSelectedPhotoFile(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition shrink-0 whitespace-nowrap"
                    >
                      {t.signup.photoDelete}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 1 Next Button (Primary Blue & Accent Green CTA) */}
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="w-full bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 group border border-blue-400/20 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />
                <span className="tracking-wide">{t.signup.nextButton}</span>
                <div className="w-7 h-7 rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Personal Information & Workplace */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-[#0026b3] shrink-0" />
                  <span>{t.signup.personalInfoTitle}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      value={formData.nameTh}
                      onChange={(e) => handleInputChange('nameTh', e.target.value)}
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
                      value={formData.nameEn}
                      onChange={(e) => handleInputChange('nameEn', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    />
                  </div>
                </div>

                {/* ID4หลักท้าย & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      value={formData.id4Digits}
                      onChange={(e) => handleInputChange('id4Digits', e.target.value.replace(/\D/g, ''))}
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
                        value={formData.mobile}
                        onChange={(e) => handleInputChange('mobile', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* email & Line */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.signup.emailLabel} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder={t.signup.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.signup.lineIdLabel}
                    </label>
                    <div className="relative flex items-center">
                      <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="text"
                        name="lineId"
                        autoComplete="username"
                        placeholder={t.signup.lineIdPlaceholder}
                        value={formData.lineId}
                        onChange={(e) => handleInputChange('lineId', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* ที่ทำงาน** & วันที่เริ่มงาน */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.signup.workplaceLabel} <span className="text-red-500">*</span>
                    </label>
                    {/* Workplace Input */}
                    <div className="relative flex items-center">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="text"
                        name="workplace"
                        autoComplete="organization"
                        placeholder={t.signup.workplacePlaceholder}
                        value={formData.workplace}
                        onChange={(e) => handleInputChange('workplace', e.target.value)}
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
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Selection */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                <PositionSelect
                  value={formData.position}
                  onChange={(val) => handleInputChange('position', val)}
                  otherValue={formData.positionOther}
                  onOtherChange={(val) => handleInputChange('positionOther', val)}
                  showIcon={false}
                  showLabel={true}
                  label={
                    <span className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 w-full">
                      <Award className="w-4 h-4 text-[#0026b3] shrink-0" />
                      <span>{t.signup.positionTitle}</span>
                    </span>
                  }
                  otherLabel={t.signup.positionOtherLabel}
                  otherPlaceholder={t.signup.positionOtherPlaceholder}
                  selectClassName="px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-2xs"
                />
              </div>

              {/* Scientist License No. (Optional) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{t.signup.scientistNoTitle}</span>
                  <span className="text-[11px] font-medium text-slate-400">({lang === 'th' ? 'ถ้ามี' : 'Optional'})</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="scientistNo"
                    autoComplete="off"
                    placeholder={lang === 'th' ? 'กรอกเลขทะเบียนนักวิทย์ (ถ้ามี)...' : 'Enter scientist registration number (optional)...'}
                    value={formData.scientistNo}
                    onChange={(e) => handleInputChange('scientistNo', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Step 2 Nav Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>{t.signup.prevButton}</span>
                </button>

                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="flex-1 bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-black text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3 group border border-blue-400/20 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />
                  <span className="tracking-wide">{t.signup.nextButton}</span>
                  <div className="w-7 h-7 rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Education Background & Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Educational Background Table */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-1.5 min-w-0">
                    <GraduationCap className="w-4 h-4 text-[#0026b3] shrink-0" />
                    <span className="leading-snug">{t.signup.educationTitle}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addEducationRow}
                    className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer border border-[#0026b3]/20 shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{t.signup.educationAddRow}</span>
                  </button>
                </div>

                {/* Table Rows */}
                <div className="space-y-3">
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-xs font-bold text-[#0026b3]">
                    <div className="col-span-4">{t.signup.degreeHeader}</div>
                    <div className="col-span-5">{t.signup.institutionHeader}</div>
                    <div className="col-span-2">{t.signup.yearHeader}</div>
                    <div className="col-span-1 text-center">{t.signup.actionHeader}</div>
                  </div>

                  {educationList.map((row, idx) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 bg-slate-50/80 p-3 sm:p-2 rounded-xl border border-slate-200 items-center"
                    >
                      <div className="sm:col-span-4">
                        <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">{t.signup.degreeHeader}</span>
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
                        <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">{t.signup.institutionHeader}</span>
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
                        <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">{t.signup.yearHeader}</span>
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

                      <div className="sm:col-span-1 flex justify-end sm:justify-center pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => removeEducationRow(row.id)}
                          disabled={educationList.length <= 1}
                          className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 p-1.5 rounded-lg transition shrink-0"
                          title={t.signup.deleteRowTitle}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clause 10.5 Regulation Notice Banner */}
              <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-amber-950">
                    <span className="font-extrabold text-amber-900 block mb-0.5">ข้อบังคับสมาคมฯ ข้อ ๑๐.๕:</span>
                    {t.signup.clause105Notice}
                  </div>
                </div>
              </div>

              {/* Terms & Personal Data Consent Checkbox */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="w-4 h-4 text-[#0026b3] focus:ring-[#0026b3] rounded border-slate-300 mt-0.5 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-medium leading-relaxed group-hover:text-slate-900 transition">
                    {t.signup.consentCheckboxLabel} <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* Step 3 Form Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* Submit Error Banner */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-bold flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full bg-gradient-to-r from-[#4ade80] via-[#38d172] to-[#22c55e] hover:brightness-105 text-[#061d08] font-black text-sm sm:text-base py-3.5 sm:py-4 px-4 rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all active:scale-[0.99] flex items-center justify-center gap-3 border border-emerald-300/80 relative overflow-hidden group ${
                    submitting ? 'opacity-75 cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/70 opacity-90" />
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#061d08]" />
                      <span className="tracking-wide whitespace-nowrap">
                        {lang === 'th' ? 'กำลังบันทึกข้อมูลสมาชิก...' : 'Submitting Application...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide whitespace-nowrap">{t.signup.submitButton}</span>
                      <div className="w-7 h-7 rounded-xl bg-emerald-950/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <Check className="w-4.5 h-4.5 stroke-[3] text-[#061d08]" />
                      </div>
                    </>
                  )}
                </button>

                {/* Secondary Action Buttons: Back & Reset */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="py-3 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200/90 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs group"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{t.signup.prevButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="py-3 px-3 sm:px-4 bg-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 font-bold text-xs sm:text-sm rounded-xl border border-slate-200/90 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-2xs group"
                    title={t.signup.clearFormButton}
                  >
                    <RotateCcw className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-red-500 group-hover:-rotate-45 transition-transform" />
                    <span>{t.signup.clearFormButton}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </form>

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
    </div>
  );
}
