'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { GoogleIcon } from '@/components/GoogleIcon';

interface LoginViewProps {
  onNavigateToSignup: () => void;
  onGoogleSignIn: () => void;
  onNavigateToStaffScan?: () => void;
}

export function LoginView({ onNavigateToSignup, onGoogleSignIn, onNavigateToStaffScan }: LoginViewProps) {
  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-7 pt-8 pb-12 rounded-b-[40px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <BornIvfLogo className="w-14 h-14 mb-4" />
          <p className="text-base font-bold text-white tracking-wide">THAISRM</p>
          <h1 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed mt-2.5 font-normal">
            Sign in to manage your high-speed connection and smart workspace instantly.
          </p>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-7 py-8 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Security Badge */}
          <div className="flex justify-start">
            <span className="inline-flex items-center gap-2 bg-[#eff4ff] text-[#0026b3] text-[11px] font-bold tracking-wider uppercase px-4 py-2 rounded-full border border-[#d6e4ff]">
              <Shield className="w-3.5 h-3.5 text-[#0026b3]" />
              <span>SECURE SINGLE SIGN-ON</span>
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={onGoogleSignIn}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-4 px-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow transition flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-base font-semibold">Sign in with Google</span>
          </button>
        </div>

        {/* Switch to Sign Up */}
        <div className="text-center pt-10 pb-4">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-[#0026b3] font-bold hover:underline cursor-pointer ml-1"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
