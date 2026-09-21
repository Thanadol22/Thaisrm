'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone, Monitor, Mail, Sparkles } from 'lucide-react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
}

export function EmailPreviewModal({
  isOpen,
  onClose,
  subject,
  htmlContent,
}: EmailPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0026b3] to-[#001768] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Mail className="w-5 h-5 text-blue-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#4ade80]">
                  Live Email Preview
                </span>
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-md font-bold">
                  ตัวอย่างการแสดงผลอีเมล
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate max-w-md mt-0.5">
                หัวข้อ: {subject || '(ยังไม่ระบุหัวข้อ)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Device Switcher */}
            <div className="bg-black/30 p-1 rounded-xl flex items-center gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deviceMode === 'desktop'
                    ? 'bg-white text-[#0026b3] shadow-xs'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deviceMode === 'mobile'
                    ? 'bg-white text-[#0026b3] shadow-xs'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Client Simulated Container */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
          <div
            className={`transition-all duration-300 bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col ${
              deviceMode === 'mobile'
                ? 'w-[375px] max-w-full min-h-[580px]'
                : 'w-full max-w-[650px] min-h-[500px]'
            }`}
          >
            {/* Client Top Header Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-700">จาก:</span>
                <span className="truncate">TSRM &lt;tsrm.info@gmail.com&gt;</span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">จำลองการแสดงผล</span>
            </div>

            {/* HTML Render Frame / View */}
            <div className="flex-1 p-0 overflow-y-auto">
              <iframe
                title="Email Preview"
                srcDoc={htmlContent}
                className="w-full h-[540px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Sparkles className="w-4 h-4 text-[#0026b3]" />
            <span>เทมเพลตรองรับทั้ง Gmail, Outlook และ Mobile Clients แบบ Responsive</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่างตัวอย่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
