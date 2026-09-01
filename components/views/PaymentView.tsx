'use client';

import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, Shield, Upload } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';

interface PaymentViewProps {
  onNavigateBack: () => void;
  onOpenUploadModal: () => void;
  onCopyBank: () => void;
  copiedBank: boolean;
  bankAccount: string;
}

export function PaymentView({
  onNavigateBack,
  onOpenUploadModal,
  onCopyBank,
  copiedBank,
  bankAccount
}: PaymentViewProps) {
  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-7 pt-8 pb-10 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={onNavigateBack}
              className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition border border-white/15 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <BornIvfLogo className="w-9 h-9" />
              <span className="font-bold text-white text-base tracking-wide">Born IVF</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-5">
            New Member Payment
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed mt-2 font-normal">
            Secure your premium clinic pass and start your fertility journey today.
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="px-7 py-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Pass Details White Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#0026b3] text-lg tracking-tight">
              Born Premium Pass
            </h3>
            <span className="bg-[#eff4ff] text-[#0026b3] text-[10px] font-black tracking-widest px-3 py-1 rounded-full border border-[#d6e4ff]">
              LIVELONG
            </span>
          </div>

          {/* Features List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>Priority cycle scheduling & consults</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>Direct messaging with clinical care team</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>Secure real-time embryology updates</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-600">Total Due Now:</span>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900 tracking-tight">$1,000</span>
              <span className="block text-[10px] text-slate-400 font-medium">(~ 35,000 THB)</span>
            </div>
          </div>
        </div>

        {/* Bank Account Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#0026b3] font-black text-base tracking-wider">
                {bankAccount}
              </span>
              {/* Kasikorn K+ Badge */}
              <span className="bg-[#00a950] text-white text-[11px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                K+
              </span>
            </div>
          </div>
          <button
            onClick={onCopyBank}
            className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedBank ? "คัดลอกแล้ว!" : "คัดลอก"}</span>
          </button>
        </div>

        {/* Security Encrypted Checkout Badge */}
        <div className="w-full bg-[#eff4ff] text-[#0026b3] font-bold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 border border-[#d6e4ff]">
          <Shield className="w-4 h-4 text-[#0026b3]" />
          <span>SECURE 256-BIT ENCRYPTED CHECKOUT</span>
        </div>

        {/* Primary Green CTA Button */}
        <button
          onClick={onOpenUploadModal}
          className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-base py-4 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5 stroke-[2.5]" />
          <span>Upload Slip Now</span>
        </button>

        {/* Footer Terms Disclaimer */}
        <p className="text-[11px] text-slate-400 text-center leading-normal px-2 pb-4">
          By clicking pay now you agree to Born IVF terms of service. Your subscription auto-renews livelong.
        </p>
      </div>
    </div>
  );
}
