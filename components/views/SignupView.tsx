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
  AlertCircle,
  Upload,
} from 'lucide-react';
import { PositionSelect } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [consentChecked, setConsentChecked] = useState(false);
  const { lang, toggleLang, t } = useLanguage();

  // Form states matching TSRM Member application form
  const [formData, setFormData] = useState({
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

  const [educationList, setEducationList] = useState<EducationRow[]>([
    { id: '1', degree: '', institution: '', year: '' },
  ]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goToStep = (step: 1 | 2) => {
    setSubmitError(null);
    setCurrentStep(step);
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

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    if (field === 'nameTh') {
      sanitizedValue = value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, '');
    } else if (field === 'nameEn') {
      sanitizedValue = value.replace(/[^a-zA-Z\s\.\-']/g, '');
    } else if (field === 'id4Digits') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
    } else if (field === 'mobile') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleEducationChange = (id: string, field: keyof EducationRow, value: string) => {
    let sanitizedValue = value;
    if (field === 'year') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    setEducationList(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: sanitizedValue } : item))
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
      setCurrentStep(1);
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
          .map((edu, idx) => ({
            degree: edu.degree.trim(),
            institution: edu.institution.trim(),
            graduation_year: edu.year.trim() ? parseInt(edu.year.trim(), 10) : null,
            display_order: idx + 1,
          })),
      };

      if (onSubmitSignup) {
        await onSubmitSignup(payload);
      } else {
        const response = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Registration failed'));
        }

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('membership_registered_email', formData.email.trim());
          } catch (e) {}
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
      {/* Form Body */}
      <div className={isEmbedded ? "px-0 py-1 flex-1 flex flex-col space-y-3 sm:space-y-4" : "px-3 xs:px-4 sm:px-8 lg:px-12 py-2 sm:py-4 flex-1 flex flex-col space-y-3 sm:space-y-4"}>

        {/* Roadmap Stepper Bar (2 Steps) */}
        <div className="bg-white rounded-2xl p-2.5 xs:p-3 sm:p-4 border border-slate-200 shadow-2xs mb-1">
          <div className="flex items-center justify-around relative px-4 sm:px-16">
            {/* Connecting Progress Line */}
            <div className="absolute top-3.5 xs:top-4 sm:top-5 left-16 xs:left-24 sm:left-32 right-16 xs:right-24 sm:right-32 h-1 bg-slate-200 -z-0">
              <div
                className="h-full bg-[#0026b3] transition-all duration-300 rounded-full"
                style={{ width: currentStep === 1 ? '0%' : '100%' }}
              />
            </div>

            {[
              { id: 1, title: t.signup.step1Title },
              { id: 2, title: t.signup.step2Title },
            ].map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id as 1 | 2)}
                  className="flex flex-col items-center relative z-10 group cursor-pointer max-w-[140px] sm:max-w-none text-center"
                >
                  <div
                    className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[11px] sm:text-sm transition-all shadow-sm ${
                      isCompleted
                        ? 'bg-[#4ade80] text-[#061d08] ring-3 sm:ring-4 ring-[#4ade80]/20'
                        : isCurrent
                          ? 'bg-[#0026b3] text-white ring-3 sm:ring-4 ring-[#0026b3]/20 scale-105 sm:scale-110'
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[3]" /> : step.id}
                  </div>
                  <span
                    className={`text-[9.5px] xs:text-[10px] sm:text-xs font-bold mt-1 leading-tight line-clamp-1 transition ${
                      isCurrent ? 'text-[#0026b3] font-black' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 flex-1 flex flex-col justify-between">

          {/* STEP 1: Profile Creation & Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
              
              {/* Profile Photo Builder Card */}
              <div className="bg-gradient-to-br from-blue-50/70 via-slate-50 to-white rounded-2xl p-4 sm:p-5 border border-blue-100 shadow-2xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Avatar Preview & Camera Badge */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-2 border-dashed border-blue-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-xs group-hover:border-[#0026b3] transition-all relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><rect width="120" height="140" fill="%23dbeafe"/><circle cx="60" cy="50" r="28" fill="%230026b3"/><path d="M15 130c0-26 20-40 45-40s45 14 45 40" fill="%230026b3"/></svg>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-[#0026b3] transition-colors">
                        <User className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5] mb-1" />
                        <span className="text-[10px] font-bold text-slate-500">{t.signup.photoChoose}</span>
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

                  {/* Camera Badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0026b3] text-white flex items-center justify-center shadow-md border-2 border-white pointer-events-none group-hover:scale-110 transition-transform">
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                {/* Photo Description & Quick Actions */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                      <span>{t.signup.photoSectionTitle}</span>
                      <span className="text-red-500 font-bold">*</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {t.signup.photoSectionSubtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs hover:border-[#0026b3] transition">
                      <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                      <span>{photoPreview ? (lang === 'th' ? 'เปลี่ยนรูปถ่าย' : 'Change Photo') : t.signup.photoChoose}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setSelectedPhotoFile(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.signup.photoDelete}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information & Workplace */}
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
                    <SmartEmailInput
                      value={formData.email}
                      onChange={(val) => handleInputChange('email', val)}
                      label={t.signup.emailLabel}
                      placeholder={t.signup.emailPlaceholder}
                      required
                    />
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

                {/* ที่ทำงาน & วันที่เริ่มงาน */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Submit Error Banner (if any on step 1) */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-bold flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Step 1 Next Button */}
              <button
                type="button"
                onClick={() => {
                  if (!formData.nameTh || !formData.nameTh.trim()) {
                    setSubmitError(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' : 'Please enter your full name in Thai');
                    return;
                  }
                  setSubmitError(null);
                  goToStep(2);
                }}
                className="w-full bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-black text-xs xs:text-sm sm:text-base py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 sm:gap-3 group border border-blue-400/20 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />
                <span className="tracking-wide">{t.signup.nextButton}</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Education Background & Confirmation */}
          {currentStep === 2 && (
            <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
              {/* Educational Background Table */}
              <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-2xs space-y-3 sm:space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-1.5 min-w-0">
                    <GraduationCap className="w-4 h-4 text-[#0026b3] shrink-0" />
                    <span className="leading-snug">{t.signup.educationTitle}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addEducationRow}
                    className="text-[11px] sm:text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer border border-[#0026b3]/20 shrink-0 whitespace-nowrap"
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

                  {educationList.map((row, idx) => (
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
              <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-1">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] sm:text-xs leading-relaxed text-amber-950">
                    <span className="font-extrabold text-amber-900 block mb-0.5">ข้อบังคับสมาคมฯ ข้อ ๑๐.๕:</span>
                    {t.signup.clause105Notice}
                  </div>
                </div>
              </div>

              {/* Terms & Personal Data Consent Checkbox */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs">
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

              {/* Step 2 Form Action Buttons */}
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
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
                  className={`w-full bg-gradient-to-r from-[#4ade80] via-[#38d172] to-[#22c55e] hover:brightness-105 text-[#061d08] font-black text-xs xs:text-sm sm:text-base py-3 sm:py-4 px-4 rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 sm:gap-3 border border-emerald-300/80 relative overflow-hidden group ${
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
                      <span className="tracking-wide whitespace-nowrap">{t.signup.submitButton}</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-950/15 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <Check className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[3] text-[#061d08]" />
                      </div>
                    </>
                  )}
                </button>

                {/* Secondary Action Buttons: Back & Reset */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="py-2.5 sm:py-3 px-2 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200/90 transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shadow-2xs group"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{t.signup.prevButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="py-2.5 sm:py-3 px-2 sm:px-4 bg-slate-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 font-bold text-xs sm:text-sm rounded-xl border border-slate-200/90 transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95 shadow-2xs group"
                    title={t.signup.clearFormButton}
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-400 group-hover:text-red-500 group-hover:-rotate-45 transition-transform" />
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
