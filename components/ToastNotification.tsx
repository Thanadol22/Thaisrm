import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export function ToastNotification({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#0026b3] text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400/40 flex items-center gap-3 animate-fade-in">
      <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}
