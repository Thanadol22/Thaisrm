'use client';

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
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
  Globe
} from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { useLanguage } from '@/context/LanguageContext';

interface SignupViewProps {
  onNavigateToLogin: () => void;
  onSubmitSignup: () => void;
  onGoogleSignUp: () => void;
}

interface EducationRow {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export function SignupView({ onNavigateToLogin, onSubmitSignup, onGoogleSignUp }: SignupViewProps) {
  const [showPassword, setShowPassword] = useState(false);
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
    position: '1 RM',
    positionOther: '',
    scientistNo: '',
    password: '',
  });

  const [educationList, setEducationList] = useState<EducationRow[]>([
    { id: '1', degree: '', institution: '', year: '' },
  ]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const positionOptions = [
    { value: '1 RM', label: '1 RM' },
    { value: '2 Fellow RM', label: '2 Fellow RM' },
    { value: '3 Embryologist', label: '3 Embryologist' },
    { value: '4 Technologist for Andrology', label: '4 Technologist for Andrology' },
    { value: '5 Molecular Geneticist', label: '5 Molecular Geneticist' },
    { value: '6 Nurse', label: '6 Nurse' },
    { value: '0 อื่นๆ', label: lang === 'th' ? '0 อื่นๆ' : '0 Other' },
  ];

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
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitSignup();
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px] pb-8">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-7 sm:pb-10 rounded-b-[28px] sm:rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <BornIvfLogo className="w-9 h-9 sm:w-12 sm:h-12 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider sm:tracking-widest text-blue-200 uppercase block truncate">
                  {t.associationName}
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-white">{t.brandName}</p>
              </div>
            </div>

            {/* Language Switcher Pill */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              title="Switch Language / สลับภาษา"
            >
              <Globe className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
              <span className="text-white/40 font-normal">|</span>
              <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
            </button>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {t.signup.title}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mt-1 font-normal">
            {t.signup.subtitle}
          </p>
        </div>
      </div>

      {/* Form Body */}
      <div className="px-3.5 sm:px-7 py-4 sm:py-6 flex-1 flex flex-col space-y-5 sm:space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

          {/* Section 0: Digital PHOTO Upload Section at the Top */}
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
                  <img src={photoPreview} alt="Digital Photo Preview" className="w-full h-full object-cover" />
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
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition shrink-0 whitespace-nowrap"
                >
                  {t.signup.photoDelete}
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Main Personal & Contact Info Fields */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>{t.signup.personalInfoTitle}</span>
            </h3>

            {/* ชื่อ-นามสกุล (Thai) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.signup.nameThLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t.signup.nameThPlaceholder}
                value={formData.nameTh}
                onChange={(e) => handleInputChange('nameTh', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                required
              />
            </div>

            {/* Name (English) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.signup.nameEnLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t.signup.nameEnPlaceholder}
                value={formData.nameEn}
                onChange={(e) => handleInputChange('nameEn', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                required
              />
            </div>

            {/* ID4หลักท้าย & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 leading-tight">
                  {t.signup.id4DigitsLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder={t.signup.id4DigitsPlaceholder}
                  value={formData.id4Digits}
                  onChange={(e) => handleInputChange('id4Digits', e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-mono"
                  required
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
                    placeholder={t.signup.mobilePlaceholder}
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    required
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
                    placeholder={t.signup.emailPlaceholder}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    required
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
                <div className="relative flex items-center">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    placeholder={t.signup.workplacePlaceholder}
                    value={formData.workplace}
                    onChange={(e) => handleInputChange('workplace', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                    required
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
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 transition outline-none font-medium"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: ตำแหน่ง (Position) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Award className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>{t.signup.positionTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
              {positionOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm font-medium ${
                    formData.position === opt.value
                      ? 'bg-[#eff4ff] border-[#0026b3] text-[#0026b3] font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="position"
                    value={opt.value}
                    checked={formData.position === opt.value}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-4 h-4 text-[#0026b3] focus:ring-[#0026b3] shrink-0"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {/* If 0 อื่นๆ is selected */}
            {(formData.position === '0 อื่นๆ' || formData.position === '0 Other') && (
              <div className="pt-2 animate-fade-in">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.signup.positionOtherLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.signup.positionOtherPlaceholder}
                  value={formData.positionOther}
                  onChange={(e) => handleInputChange('positionOther', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#0026b3] focus:ring-2 focus:ring-[#0026b3]/20 outline-none font-medium"
                />
              </div>
            )}
          </div>

          {/* Section 4: Middle Yellow Highlighted Section - เลขทะเบียนนักวิทย์ * นว */}
          <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <label className="block text-xs font-extrabold text-amber-950">
              {t.signup.scientistNoTitle} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t.signup.scientistNoPlaceholder}
                value={formData.scientistNo}
                onChange={(e) => handleInputChange('scientistNo', e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-amber-400"
              />
            </div>
          </div>

          {/* Section 5: Educational Background (วุฒิการศึกษา) Table */}
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

            {/* Desktop & Mobile Table View */}
            <div className="space-y-3">
              {/* Header row for larger screens */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-xs font-bold text-[#0026b3]">
                <div className="col-span-4">{t.signup.degreeHeader}</div>
                <div className="col-span-5">{t.signup.institutionHeader}</div>
                <div className="col-span-2">{t.signup.yearHeader}</div>
                <div className="col-span-1 text-center">{t.signup.actionHeader}</div>
              </div>

              {/* Rows */}
              {educationList.map((row, idx) => (
                <div 
                  key={row.id} 
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 bg-slate-50/80 p-3 sm:p-2 rounded-xl border border-slate-200 items-center"
                >
                  <div className="sm:col-span-4">
                    <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">{t.signup.degreeHeader}</span>
                    <input
                      type="text"
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
                      title="ลบแถว"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Password for Login Account */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-[#0026b3] text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>{t.signup.passwordTitle}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.signup.passwordLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 transition flex items-center px-3.5 py-2.5">
                <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.signup.passwordPlaceholder}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 ml-2 focus:outline-none shrink-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-xs sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{t.signup.submitButton}</span>
          </button>

        </form>

        {/* Or Divider */}
        <div className="relative flex items-center justify-center my-1.5 sm:my-2">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-[#f6f8fc] px-3 text-xs font-medium text-slate-400 uppercase absolute">
            หรือ
          </span>
        </div>

        {/* Google Secondary Button */}
        <button
          onClick={onGoogleSignUp}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow transition flex items-center justify-center gap-2.5 sm:gap-3 cursor-pointer active:scale-[0.99]"
        >
          <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">Sign up with Google</span>
        </button>

        {/* Switch to Login */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-slate-500">
            มีบัญชีสมาชิกอยู่แล้ว?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#0026b3] font-bold hover:underline cursor-pointer ml-1"
            >
              เข้าสู่ระบบ (Log in)
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

