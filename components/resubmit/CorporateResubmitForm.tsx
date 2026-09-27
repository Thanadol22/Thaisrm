'use client';

import React from 'react';
import { Building, Mail, Phone } from 'lucide-react';

export interface CorporateFormData {
  companyName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
}

interface CorporateResubmitFormProps {
  formData: CorporateFormData;
  onChange: <K extends keyof CorporateFormData>(field: K, value: CorporateFormData[K]) => void;
}

export function CorporateResubmitForm({ formData, onChange }: CorporateResubmitFormProps) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-2">
          <Building className="w-4 h-4 text-[#0026b3]" />
          <span>แบบฟอร์มตรวจสอบและแก้ไขข้อมูลบริษัท / นิติบุคคล</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">แก้ไขข้อมูลที่ผิดพลาดได้ทันที</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Company Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="font-bold text-slate-700 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>
              ชื่อบริษัท / องค์กร / นิติบุคคล <span className="text-rose-500">*</span>
            </span>
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="ระบุชื่อบริษัท / องค์กร"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
          />
        </div>

        {/* Coordinator Email */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="font-bold text-slate-700 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>
              อีเมลประสานงานบริษัท / ผู้รับเอกสาร <span className="text-rose-500">*</span>
            </span>
          </label>
          <input
            type="email"
            value={formData.coordinatorEmail}
            onChange={(e) => onChange('coordinatorEmail', e.target.value)}
            placeholder="company@mail.com"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
          />
        </div>

        {/* Coordinator Phone */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="font-bold text-slate-700 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>เบอร์โทรศัพท์ผู้ประสานงาน</span>
          </label>
          <input
            type="tel"
            value={formData.coordinatorPhone}
            onChange={(e) => onChange('coordinatorPhone', e.target.value)}
            placeholder="08XXXXXXXX"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
          />
        </div>
      </div>
    </div>
  );
}
