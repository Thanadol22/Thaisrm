'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(errorParam));
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (token && userJson) {
      try {
        const userData = JSON.parse(decodeURIComponent(userJson));
        
        // บันทึก Token และข้อมูล User ใน localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));

        setStatus('success');
        
        // พาผู้ใช้ไปยังหน้าหลักหลังจากแสดงอนิเมชันสำเร็จ
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (err) {
        setStatus('error');
        setErrorMessage('ไม่สามารถอ่านข้อมูลผู้ใช้งานได้');
        setTimeout(() => router.push('/login'), 3000);
      }
    } else {
      setStatus('error');
      setErrorMessage('ไม่พบ Token ยืนยันตัวตน');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl max-w-sm sm:max-w-md w-full text-center border border-slate-100 flex flex-col items-center">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-[#0026b3] animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-800">กำลังยืนยันตัวตน...</h2>
          <p className="text-sm text-slate-500 mt-2">โปรดรอสักครู่ ระบบกำลังประมวลผลการเข้าสู่ระบบ</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">เข้าสู่ระบบสำเร็จ!</h2>
          <p className="text-sm text-slate-500 mt-2">ยินดีต้อนรับ กำลังนำคุณเข้าสู่ระบบ...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">เข้าสู่ระบบไม่สำเร็จ</h2>
          <p className="text-sm text-rose-500 mt-2">{errorMessage}</p>
          <p className="text-xs text-slate-400 mt-4">กำลังกลับสู่หน้าเข้าสู่ระบบ...</p>
        </>
      )}
    </div>
  );
}

export default function LoginCallbackPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-[#0026b3] animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-800">กำลังโหลด...</h2>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
