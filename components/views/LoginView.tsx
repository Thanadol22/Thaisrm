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
  Sparkles
} from 'lucide-react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { ParticipantSearchModal } from '@/components/ParticipantSearchModal';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Form State for Conference Registration
  const [formData, setFormData] = useState({
    nameTh: '',
    nameEn: '',
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
      setFormData({
        nameTh: nameTh || '',
        nameEn: nameEn || '',
        email: initialGoogleUser.email || '',
      });
      setAutofillSuccess(true);
      const timer = setTimeout(() => setAutofillSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [initialGoogleUser, autofillTarget]);

  // Tab switching clears fetched data & form fields across tabs
  const handleTabChange = (tab: 'conference' | 'membership') => {
    setActiveTab(tab);
    setFormData({
      nameTh: '',
      nameEn: '',
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
      onGoogleAutofill('conference');
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

    // Save registration payload directly without blocking validation
    try {
      const regPayload = {
        nameTh: formData.nameTh.trim() || 'ผู้เข้าร่วมงานประชุม',
        nameEn: formData.nameEn.trim() || 'Conference Attendee',
        email: formData.email.trim() || 'attendee@thaisrm.org',
        registeredAt: new Date().toISOString(),
      };
      localStorage.setItem('conference_registration', JSON.stringify(regPayload));
    } catch (e) {
      console.error('Failed to save registration to localStorage', e);
    }

    // Directly navigate to payment page
    router.push('/payment');
  };

  const handleMembershipComplete = () => {
    setShowSuccessModal(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-7 pt-6 sm:pt-8 pb-7 sm:pb-9 rounded-b-[28px] sm:rounded-b-[36px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
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

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            {lang === 'th' ? 'ลงทะเบียนและสมัครสมาชิก TSRM' : 'TSRM Registration & Membership'}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mt-1 font-normal">
            {lang === 'th'
              ? 'เลือกลงทะเบียนเข้าร่วมงานประชุมวิชาการ หรือ สมัครสมาชิกสมาคมฯ'
              : 'Register for Conference Summit or apply for TSRM membership'}
          </p>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-4 sm:px-7 py-5 sm:py-6 flex-1 flex flex-col justify-between">
        <div className="space-y-4">

          {/* Main Action Segmented Buttons (Call to Action Tabs) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-200/90 shadow-inner">
            {/* Tab 1: ลงทะเบียนเข้าร่วมงานประชุม */}
            <button
              type="button"
              onClick={() => handleTabChange('conference')}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-98 ${activeTab === 'conference'
                  ? 'bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white shadow-md shadow-blue-950/25 ring-2 ring-[#4ade80]/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <Ticket className={`w-4 h-4 shrink-0 ${activeTab === 'conference' ? 'text-[#4ade80]' : 'text-slate-400'}`} />
              <span>{lang === 'th' ? 'ลงทะเบียนเข้าร่วมงานประชุม' : 'Register Conference'}</span>
            </button>

            {/* Tab 2: สมัครสมาชิก TSRM */}
            <button
              type="button"
              onClick={() => handleTabChange('membership')}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-98 ${activeTab === 'membership'
                  ? 'bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white shadow-md shadow-blue-950/25 ring-2 ring-[#4ade80]/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <UserPlus className={`w-4 h-4 shrink-0 ${activeTab === 'membership' ? 'text-[#4ade80]' : 'text-slate-400'}`} />
              <span>{lang === 'th' ? 'สมัครสมาชิกสมาคมฯ (TSRM)' : 'TSRM Membership'}</span>
            </button>
          </div>

          {/* View 1: Conference Registration Form */}
          {activeTab === 'conference' ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4 animate-fade-in">
              {/* Google Autofill Button with Accent Pill */}
              <div className="space-y-1.5">
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
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase absolute">
                  {lang === 'th' ? 'หรือ กรอกข้อมูลด้วยตนเอง' : 'Or fill in details'}
                </span>
              </div>

              {/* Registration Form (ยังไม่ต้อง validation ข้อมูล) */}
              <form onSubmit={handleSubmitRegistration} className="space-y-3.5">
                {/* Thai Full Name */}
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

                {/* English Full Name */}
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

                {/* Email */}
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
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0026b3] focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* High-Impact Call to Action Button to Payment Page */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] hover:brightness-110 text-white font-black py-3.5 sm:py-4 px-6 rounded-2xl shadow-xl shadow-blue-900/30 hover:shadow-blue-900/40 transition-all flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer active:scale-[0.99] group border border-blue-400/20 relative overflow-hidden mt-3"
                >
                  {/* Top glowing accent green line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80] to-transparent opacity-90" />

                  <span className="tracking-wide">
                    {lang === 'th' ? 'ดำเนินการต่อไปยังขั้นตอนชำระเงิน' : 'Proceed to Payment'}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#4ade80] text-[#061d08] flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform shrink-0">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>
              </form>
            </div>
          ) : (
            /* View 2: TSRM Membership Application Form (Embedded cleanly matching screenshot) */
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

        {/* Bottom Options: Existing Google Sign-in */}
        <div className="text-center pt-5 pb-2 space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <Shield className="w-3.5 h-3.5 text-[#0026b3]" />
              {t.login.securityBadge}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {lang === 'th' ? 'มีบัญชีผู้ใช้งานอยู่แล้ว?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="text-[#0026b3] font-black hover:underline cursor-pointer ml-1"
            >
              {lang === 'th' ? 'เข้าสู่ระบบด้วย Google' : 'Sign In with Google'}
            </button>
          </p>
        </div>
      </div>

      {/* Participant Search Modal */}
      <ParticipantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Membership Registration Success Modal */}
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={() => router.push('/payment')}
      />
    </div>
  );
}
