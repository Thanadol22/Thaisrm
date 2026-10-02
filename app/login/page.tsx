'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LoginView, formatMeetingDateDisplay } from '@/components/views/LoginView';
import { ToastNotification } from '@/components/ToastNotification';
import { LoginHero } from '@/components/LoginHero';
import { LoginNavbar } from '@/components/LoginNavbar';
import { ProgramScheduleModal } from '@/components/ProgramScheduleModal';
import type { ProgramImage } from '@/lib/programSchedule';
import { useLanguage } from '@/context/LanguageContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { t, lang } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);
  const [heroMeeting, setHeroMeeting] = useState<{ meeting_id?: string; meeting_name?: string; description?: string | null; meeting_time?: string | null; location?: string | null; start_date?: string; meeting_date?: string } | null>(null);
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [programImages, setProgramImages] = useState<ProgramImage[]>([]);
  const formRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const scrollToActivities = useCallback(() => {
    const list = document.getElementById('activity-list');
    // วางรายการกิจกรรมไว้กลางจอ เพื่อไม่ให้หัวข้อถูก navbar บัง
    (list || formRef.current)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: list ? 'center' : 'start' });
  }, [reduceMotion]);

  // รูปตารางกิจกรรมของการประชุมที่เปิดรับลงทะเบียน (ตั้งค่าในหน้าแอดมิน)
  const meetingId = heroMeeting?.meeting_id;
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    fetch(`/api/meetings/program-images?meetingId=${encodeURIComponent(meetingId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) setProgramImages(json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [reduceMotion]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle URL errors (e.g. ?error=Configuration or ?error=AccessDenied)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'Configuration') {
        triggerNotification(
          lang === 'th'
            ? 'เกิดข้อผิดพลาดในการตั้งค่า Google OAuth กรุณาตรวจสอบ Authorized Redirect URI ใน Google Cloud Console'
            : 'Google OAuth Configuration Error. Please verify Authorized Redirect URI in Google Cloud Console'
        );
      } else if (errorParam === 'AccessDenied') {
        triggerNotification(
          lang === 'th'
            ? 'การเข้าสู่ระบบถูกปฏิเสธ'
            : 'Access was denied during sign in.'
        );
      } else {
        triggerNotification(
          lang === 'th'
            ? `การเข้าสู่ระบบไม่สำเร็จ (${errorParam})`
            : `Sign in failed (${errorParam})`
        );
      }
    }
  }, [searchParams, lang]);

  const isAutofill = searchParams.get('autofill') === 'true';
  const tabParam = searchParams.get('tab');

  // กลับมาจาก Google / หน้าชำระเงิน หรือมีลิงก์ระบุแท็บ: ข้าม hero ไปที่ฟอร์มทันที
  const skipHero = isAutofill || Boolean(tabParam) || searchParams.get('restore') === '1';
  useEffect(() => {
    if (!skipHero) return;
    const frame = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [skipHero]);
  const autofillTarget: 'conference' | 'membership' | null = isAutofill
    ? (tabParam === 'membership' ? 'membership' : 'conference')
    : null;

  // Handle autofill feedback on return from Google
  useEffect(() => {
    if (isAutofill && session?.user) {
      triggerNotification(
        lang === 'th'
          ? 'นำเข้าข้อมูลจากบัญชี Google สำเร็จ'
          : 'Google account details auto-filled successfully'
      );
    }
  }, [isAutofill, session, lang]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/login' }, { prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      triggerNotification(err.message || t.login.serverError);
    }
  };

  const handleGoogleAutofill = async (tab?: 'conference' | 'membership') => {
    try {
      const targetTab = tab || (tabParam === 'membership' ? 'membership' : 'conference');
      await signIn('google', { callbackUrl: `/login?autofill=true&tab=${targetTab}` }, { prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Autofill Error:', err);
      triggerNotification(err.message || t.login.serverError);
    }
  };

  const handleNavigateToSignup = async () => {
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
    } catch (e) {}
    try {
      await signOut({ redirect: false });
    } catch (e) {}
    router.push('/signup');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <LoginNavbar />

      <LoginHero
        meetingName={heroMeeting?.meeting_name}
        description={heroMeeting?.description}
        timeText={heroMeeting?.meeting_time}
        location={heroMeeting?.location}
        dateText={heroMeeting && (heroMeeting.start_date || heroMeeting.meeting_date) ? formatMeetingDateDisplay(heroMeeting, lang) : null}
        // ยังไม่มีรูปตารางกิจกรรม: พาไปที่รายการกิจกรรมในฟอร์มแทน
        onViewActivities={programImages.length > 0 ? () => setIsProgramOpen(true) : scrollToActivities}
        onScrollToForm={scrollToForm}
      />

      <ProgramScheduleModal
        isOpen={isProgramOpen}
        onClose={() => setIsProgramOpen(false)}
        meetingName={heroMeeting?.meeting_name}
        images={programImages}
        onRegister={() => {
          setIsProgramOpen(false);
          // รอให้ปลดล็อกการเลื่อนหน้าก่อน แล้วค่อยพาไปที่รายการกิจกรรมในฟอร์ม
          requestAnimationFrame(scrollToActivities);
        }}
      />

      {/* ฟอร์มเลื่อนขึ้นมาทับขอบล่างของ hero แล้วเด้งเข้าที่ */}
      <motion.main
        ref={formRef}
        initial={reduceMotion || skipHero ? false : { opacity: 0, y: 140, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 'some' }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, mass: 0.9 }}
        className="w-full max-w-5xl xl:max-w-6xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative z-10 -mt-16 sm:-mt-24 rounded-t-[28px] sm:rounded-t-[36px] sm:border-x sm:border-slate-200/80 overflow-hidden scroll-mt-32 lg:scroll-mt-20"
      >
        <LoginView
          onNavigateToSignup={handleNavigateToSignup}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleAutofill={handleGoogleAutofill}
          onActiveMeetingChange={setHeroMeeting}
          defaultTab={tabParam === 'membership' ? 'membership' : 'conference'}
          autofillTarget={autofillTarget}
          initialGoogleUser={
            isAutofill && session?.user
              ? {
                  name: session.user.name,
                  email: session.user.email,
                  picture: (session.user as any).picture || session.user.image || null,
                  given_name: (session.user as any).given_name || null,
                  family_name: (session.user as any).family_name || null,
                }
              : null
          }
        />
      </motion.main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

