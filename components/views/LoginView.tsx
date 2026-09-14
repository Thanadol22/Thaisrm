'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { ParticipantSearchModal } from '@/components/ParticipantSearchModal';
import { SignupView } from '@/components/views/SignupView';
import { useLanguage } from '@/context/LanguageContext';
import { parseGoogleName } from '@/lib/utils';

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

const POSITION_OPTIONS = [
  {
    value: '1 RM',
    labelTh: '1 RM (แพทย์เวชศาสตร์การเจริญพันธุ์)',
    labelEn: '1 RM (Reproductive Medicine)'
  },
  {
    value: '2 Fellow RM',
    labelTh: '2 Fellow RM (แพทย์ประจำบ้านต่อยอด RM)',
    labelEn: '2 Fellow RM (Fellow in RM)'
  },
  {
    value: '3 Embryologist',
    labelTh: '3 Embryologist (นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน)',
    labelEn: '3 Embryologist'
  },
  {
    value: '4 Technologist for Andrology',
    labelTh: '4 Technologist for Andrology (นักวิทยาศาสตร์ห้องปฏิบัติการน้ำอสุจิ)',
    labelEn: '4 Technologist for Andrology'
  },
  {
    value: '5 Molecular Geneticist',
    labelTh: '5 Molecular Geneticist (นักพันธุศาสตร์ระดับโมเลกุล)',
    labelEn: '5 Molecular Geneticist'
  },
  {
    value: '6 Nurse',
    labelTh: '6 Nurse (พยาบาลด้านเวชศาสตร์การเจริญพันธุ์)',
    labelEn: '6 Nurse'
  },
  {
    value: '0 อื่นๆ',
    labelTh: '0 อื่นๆ (โปรดระบุ)...',
    labelEn: '0 Other (Please specify)...'
  },
];

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

  // Conference Program Selection & Attendance Type
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(['main']);
  const [attendanceType, setAttendanceType] = useState<'onsite' | 'online'>('onsite');

  const toggleProgram = (key: string) => {
    setSelectedPrograms(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
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
    position: '1 RM',
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
      position: '1 RM',
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

  // Submit conference registration (ยังไม่ต้อง validation ข้อมูล - ไปหน้าชำระเงินทันที)
  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();

    const programLabelsTh = selectedPrograms.map(p => {
      if (p === 'main') return 'Main Programs (21-22 ต.ค. 2569)';
      if (p === 'ws1') return 'Workshop 1: ART Nurse (20 ต.ค. 2569)';
      if (p === 'ws2') return 'Workshop 2: Genetics & Hysteroscopy (20 ต.ค. 2569)';
      return p;
    });

    const programLabelsEn = selectedPrograms.map(p => {
      if (p === 'main') return 'Main Programs (Oct 21-22, 2026)';
      if (p === 'ws1') return 'Workshop 1: ART Nurse (Oct 20, 2026)';
      if (p === 'ws2') return 'Workshop 2: Genetics & Hysteroscopy (Oct 20, 2026)';
      return p;
    });

    const programLabelTh = programLabelsTh.join(' + ');
    const programLabelEn = programLabelsEn.join(' + ');
    const selectedPosObj = POSITION_OPTIONS.find(o => o.value === formData.position);
    const finalPosition = formData.position === '0 อื่นๆ'
      ? (formData.positionOther || (lang === 'th' ? 'อื่นๆ' : 'Other'))
      : (selectedPosObj ? (lang === 'th' ? selectedPosObj.labelTh : selectedPosObj.labelEn) : formData.position);

    try {
      const regPayload = {
        category: 'conference',
        programKey: selectedPrograms.join(','),
        programNameTh: programLabelTh || 'Main Programs (21-22 ต.ค. 2569)',
        programNameEn: programLabelEn || 'Main Programs (Oct 21-22, 2026)',
        attendanceType: attendanceType,
        memberNo: formData.memberNo.trim(),
        nameTh: formData.nameTh.trim() || (lang === 'th' ? 'ผู้เข้าร่วมงานประชุม' : 'Conference Attendee'),
        nameEn: formData.nameEn.trim() || 'Conference Attendee',
        workplace: formData.workplace.trim(),
        position: finalPosition,
        specialCode: formData.specialCode.trim(),
        email: formData.email.trim() || 'attendee@thaisrm.org',
        registeredAt: new Date().toISOString(),
      };
      localStorage.setItem('conference_registration', JSON.stringify(regPayload));
    } catch (e) {
      console.error('Failed to save registration to localStorage', e);
    }

    // Directly navigate to payment page with registration type
    router.push('/payment?type=registration');
  };

  const handleMembershipComplete = () => {
    router.push('/payment?type=membership');
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-7 sm:pb-9 rounded-b-[28px] sm:rounded-b-[36px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl xl:max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 group hover:opacity-95 transition">
              <ThaiSrmLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 group-hover:scale-105 transition-transform" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider sm:tracking-widest text-blue-200 uppercase block truncate">
                  {t.associationName}
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-white">{t.brandName}</p>
              </div>
            </div>

            {/* Top Right Actions: Search Member Icon + Language Switcher Pill */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Member Search Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center p-2 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-xl text-xs font-semibold transition border border-white/20 cursor-pointer active:scale-95 shadow-2xs group"
                title={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
                aria-label={lang === 'th' ? 'ค้นหาข้อมูลสมาชิก' : 'Search Members'}
              >
                <Search className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />
              </button>

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
            <div className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm space-y-5 animate-fade-in">
              {/* Google Autofill Button with Accent Pill */}
              <div className="space-y-1.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleGoogleAutofill}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-3 px-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-2.5">
                    <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold">
                      {lang === 'th' ? 'กรอกข้อมูลอัตโนมัติด้วย Google' : 'Autofill with Google'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-[#4ade80]/25 border border-[#4ade80]/40 px-2.5 py-0.5 rounded-full shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>{lang === 'th' ? 'รวดเร็ว' : 'Fast'}</span>
                  </span>
                </button>

                {autofillSuccess && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 justify-center animate-fade-in">
                    <Sparkles className="w-3 h-3" />
                    {lang === 'th' ? 'กรอกข้อมูลจากบัญชี Google เรียบร้อยแล้ว' : 'Autofilled from Google successfully'}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase absolute">
                  {lang === 'th' ? 'หรือ กรอกข้อมูลด้วยตนเอง' : 'Or fill in details'}
                </span>
              </div>

              {/* Registration Form with 7 Specified Fields */}
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* 1. ชื่อ-นามสกุล(ไทย) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาไทย)' : 'Full Name (Thai)'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.nameTh}
                        onChange={(e) => handleInputChange('nameTh', e.target.value)}
                        placeholder={lang === 'th' ? 'เช่น วรวัฒน์ เกียรติอนันต์' : 'e.g. Worawat Kiat-anan'}
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 2. ชื่อ-นามสกุล(อังกฤษ) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาอังกฤษ)' : 'Full Name (English)'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.nameEn}
                        onChange={(e) => handleInputChange('nameEn', e.target.value)}
                        placeholder="e.g. Worawat Kiat-anan"
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 3. อีเมล (Email) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'อีเมล (Email)' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder={lang === 'th' ? 'เช่น yourname@gmail.com' : 'e.g. yourname@gmail.com'}
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 4. หน่วยงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'หน่วยงาน' : 'Organization / Workplace'}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.workplace}
                        onChange={(e) => handleInputChange('workplace', e.target.value)}
                        placeholder={lang === 'th' ? 'ชื่อโรงพยาบาล / สถาบัน / บริษัท' : 'e.g. Hospital / University / Clinic'}
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 5. ตำแหน่ง */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'ตำแหน่ง' : 'Position'}
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition appearance-none cursor-pointer"
                      >
                        {POSITION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {lang === 'th' ? opt.labelTh : opt.labelEn}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {formData.position === '0 อื่นๆ' && (
                      <div className="mt-2 animate-fade-in">
                        <input
                          type="text"
                          value={formData.positionOther}
                          onChange={(e) => handleInputChange('positionOther', e.target.value)}
                          placeholder={lang === 'th' ? 'โปรดระบุตำแหน่งอื่นๆ...' : 'Please specify other position...'}
                          className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                        />
                      </div>
                    )}
                  </div>

                  {/* 6. เลขสมาชิก */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'เลขสมาชิก (Member No.)' : 'Member No.'}
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.memberNo}
                        onChange={(e) => handleInputChange('memberNo', e.target.value)}
                        placeholder={lang === 'th' ? 'เช่น 0123 (เว้นว่างได้หากไม่ใช่สมาชิก)' : 'e.g. 0123 (Optional for non-members)'}
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* 7. โค๊ดพิเศษ */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'th' ? 'โค๊ดพิเศษ' : 'Special Code'}
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.specialCode}
                        onChange={(e) => handleInputChange('specialCode', e.target.value)}
                        placeholder={lang === 'th' ? 'กรอกรหัสส่วนลดหรือโค้ดพิเศษ (ถ้ามี)' : 'Enter promo or special code (if any)'}
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition uppercase tracking-wider"
                      />
                    </div>
                  </div>
                </div>

                {/* Minimalist Multi-select Program Options */}
                <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700">
                      {lang === 'th' ? 'เลือกหลักสูตร (เลือกได้หลายรายการ)' : 'Select Programs (Multi-select)'}
                    </label>
                    <span className="text-[9px] sm:text-[10px] text-[#0026b3] font-extrabold bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60">
                      {selectedPrograms.length} {lang === 'th' ? 'รายการ' : 'selected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    {/* Main Programs */}
                    <button
                      type="button"
                      onClick={() => toggleProgram('main')}
                      className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 sm:gap-1 active:scale-95 ${selectedPrograms.includes('main')
                        ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 font-extrabold'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                    >
                      <span className="text-[11px] sm:text-sm font-extrabold leading-tight">Main Programs</span>
                      <span className={`text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded font-bold whitespace-nowrap ${selectedPrograms.includes('main') ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {lang === 'th' ? '21-22 ต.ค.' : 'Oct 21-22'}
                      </span>
                    </button>

                    {/* Workshop 1 */}
                    <button
                      type="button"
                      onClick={() => toggleProgram('ws1')}
                      className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 sm:gap-1 active:scale-95 ${selectedPrograms.includes('ws1')
                        ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 font-extrabold'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                    >
                      <span className="text-[11px] sm:text-sm font-extrabold leading-tight">Workshop 1</span>
                      <span className={`text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded font-bold whitespace-nowrap ${selectedPrograms.includes('ws1') ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {lang === 'th' ? '20 ต.ค. (Nurse)' : 'Oct 20 (Nurse)'}
                      </span>
                    </button>

                    {/* Workshop 2 */}
                    <button
                      type="button"
                      onClick={() => toggleProgram('ws2')}
                      className={`p-1.5 sm:p-3 rounded-lg sm:rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 sm:gap-1 active:scale-95 ${selectedPrograms.includes('ws2')
                        ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30 font-extrabold'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                    >
                      <span className="text-[11px] sm:text-sm font-extrabold leading-tight">Workshop 2</span>
                      <span className={`text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded font-bold whitespace-nowrap ${selectedPrograms.includes('ws2') ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {lang === 'th' ? '20 ต.ค. (Genetics)' : 'Oct 20 (Genetics)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Minimalist Attendance Format: Onsite vs Online */}
                <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                  <label className="text-[11px] sm:text-xs font-bold text-slate-700 block">
                    {lang === 'th' ? 'รูปแบบการเข้าร่วม (Attendance Format)' : 'Attendance Format'}
                  </label>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {/* Onsite */}
                    <button
                      type="button"
                      onClick={() => setAttendanceType('onsite')}
                      className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl border text-[11px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 ${attendanceType === 'onsite'
                        ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                    >
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">{lang === 'th' ? 'Onsite (ที่งาน)' : 'Onsite'}</span>
                    </button>

                    {/* Online */}
                    <button
                      type="button"
                      onClick={() => setAttendanceType('online')}
                      className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl border text-[11px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 ${attendanceType === 'online'
                        ? 'bg-blue-50/90 border-[#0026b3] text-[#0026b3] shadow-2xs ring-1 ring-[#0026b3]/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                        }`}
                    >
                      <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">{lang === 'th' ? 'Online (ออนไลน์)' : 'Online'}</span>
                    </button>
                  </div>
                </div>

                {/* High-Impact Call to Action Button to Payment Page */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-black py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 transition-all flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base cursor-pointer active:scale-[0.99] group border border-blue-400/20 relative overflow-hidden mt-2.5 sm:mt-4"
                >
                  {/* Top glowing accent green line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />

                  <span className="tracking-wide">
                    {lang === 'th' ? 'ดำเนินการต่อไปยังขั้นตอนชำระเงิน' : 'Proceed to Payment'}
                  </span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>
                </button>
              </form>
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
        onSelectMember={(member) => {
          const nameThStr = (typeof member.nameTh === 'object' && member.nameTh ? member.nameTh.text : String(member.nameTh || '')) || '';
          const nameEnStr = (typeof member.nameEn === 'object' && member.nameEn ? member.nameEn.text : String(member.nameEn || '')) || '';
          const emailStr = (typeof member.email === 'object' && member.email ? member.email.text : String(member.email || '')) || '';
          const workplaceStr = (typeof member.workplace === 'object' && member.workplace ? member.workplace.text : String(member.workplace || '')) || '';
          const positionStr = (typeof member.position === 'object' && member.position ? member.position.text : String(member.position || '')) || '';

          setFormData(prev => ({
            ...prev,
            memberNo: member.memberId || prev.memberNo,
            nameTh: nameThStr || prev.nameTh,
            nameEn: nameEnStr || prev.nameEn,
            email: emailStr || prev.email,
            workplace: workplaceStr || prev.workplace,
            position: POSITION_OPTIONS.some(p => p.value === positionStr) ? positionStr : prev.position,
            positionOther: !POSITION_OPTIONS.some(p => p.value === positionStr) && positionStr ? positionStr : prev.positionOther,
          }));
          setAutofillSuccess(true);
          setTimeout(() => setAutofillSuccess(false), 4000);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}


