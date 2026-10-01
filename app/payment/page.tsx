'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentFlow, RegistrationPaymentData } from '@/components/views/PaymentFlow';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Router determines the payment type: 'registration' vs 'membership'
  const typeParam = searchParams.get('type');
  const paymentType: 'registration' | 'membership' = 
    typeParam === 'registration' || typeParam === 'conference' ? 'registration' : 'membership';

  // Load conference registration / membership payload saved by the previous step
  const [regData, setRegData] = useState<RegistrationPaymentData | null>(null);
  const [membershipRegData, setMembershipRegData] = useState<any>(null);

  React.useEffect(() => {
    if (paymentType === 'registration') {
      try {
        const saved = localStorage.getItem('conference_registration');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRegData(parsed);
        }
      } catch (err) {
        console.error('Failed to parse conference_registration from localStorage', err);
      }
    } else {
      try {
        const saved = localStorage.getItem('membership_registration');
        if (saved) {
          const parsed = JSON.parse(saved);
          setMembershipRegData(parsed);
        }
      } catch (err) {
        console.error('Failed to parse membership_registration from localStorage', err);
      }
    }
  }, [paymentType]);

  // ลงทะเบียนผ่านฟอร์มเฉพาะ: ย้อนกลับ/ปิดหน้าสำเร็จแล้วกลับไปที่ลิงก์ฟอร์มเดิม
  const specialFormSlug: string | undefined = (regData as any)?.specialForm?.slug;

  const handleSubmitted = () => {
    // Clean up draft localStorage
    try {
      if (paymentType === 'registration') {
        localStorage.removeItem('conference_registration');
      } else {
        localStorage.removeItem('membership_registration');
        localStorage.removeItem('tsrm_user');
        localStorage.removeItem('thaisrm_user');
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <main className="w-full min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <PaymentFlow
          paymentType={paymentType}
          regData={regData}
          membershipRegData={membershipRegData}
          onNavigateBack={() =>
            router.push(
              paymentType !== 'registration'
                ? '/signup'
                : specialFormSlug
                  ? `/forms/${specialFormSlug}?restore=1`
                  : '/login?tab=conference&restore=1'
            )
          }
          onSubmitted={handleSubmitted}
          onSuccessClose={() => router.push(specialFormSlug ? `/forms/${specialFormSlug}` : '/login')}
          onMissingMembershipData={() => router.push('/signup')}
        />
      </main>
    </div>
  );
}


export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
