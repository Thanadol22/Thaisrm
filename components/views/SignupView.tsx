'use client';

import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { GoogleIcon } from '@/components/GoogleIcon';

interface SignupViewProps {
  onNavigateToLogin: () => void;
  onSubmitSignup: () => void;
  onGoogleSignUp: () => void;
}

export function SignupView({ onNavigateToLogin, onSubmitSignup, onGoogleSignUp }: SignupViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitSignup();
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-7 pt-8 pb-10 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <BornIvfLogo className="w-13 h-13 mb-4" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed mt-1.5 font-normal">
            Join us to experience fresh, reliable connectivity.
          </p>
          <p className="text-sm font-bold text-white mt-2">THAISRM</p>
        </div>
      </div>

      {/* Form Body */}
      <div className="px-7 py-6 flex-1 flex flex-col justify-between space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">
              Full Name
            </label>
            <div className="relative rounded-2xl bg-white border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 transition flex items-center px-4 py-3.5 shadow-2xs">
              <User className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="John Doe"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                required
              />
            </div>
          </div>

          {/* Email Address Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">
              Email Address
            </label>
            <div className="relative rounded-2xl bg-white border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 transition flex items-center px-4 py-3.5 shadow-2xs">
              <Mail className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
              <input
                type="email"
                placeholder="john@example.com"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">
              Password
            </label>
            <div className="relative rounded-2xl bg-white border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 transition flex items-center px-4 py-3.5 shadow-2xs">
              <Lock className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 ml-2 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Primary Green Action Button */}
          <button
            type="submit"
            className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-base py-4 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer mt-2 flex items-center justify-center gap-2"
          >
            <span>Sign Up</span>
          </button>
        </form>

        {/* Or Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-[#f6f8fc] px-3 text-xs font-medium text-slate-400 uppercase absolute">
            or
          </span>
        </div>

        {/* Google Secondary Button */}
        <button
          onClick={onGoogleSignUp}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3.5 px-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow transition flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
        >
          <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">Sign up with Google</span>
        </button>

        {/* Switch to Login */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#0026b3] font-bold hover:underline cursor-pointer ml-1"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
