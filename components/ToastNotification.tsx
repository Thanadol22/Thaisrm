'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error';
}

export function ToastNotification({ message, type = 'success' }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!message || !mounted) return null;

  return createPortal(
    <div className="fixed bottom-6 left-0 right-0 z-[10000] flex justify-center pointer-events-none px-4">
      <div
        className={`px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in pointer-events-auto max-w-md ${
          type === 'error'
            ? 'bg-rose-700 text-white border-rose-400/40'
            : 'bg-[#0026b3] text-white border-blue-400/40'
        }`}
      >
        {type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-[#4ade80] shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-semibold leading-snug">{message}</span>
      </div>
    </div>,
    document.body
  );
}

