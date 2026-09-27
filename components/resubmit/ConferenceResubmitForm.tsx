'use client';

import React from 'react';
import { User, Building, Phone } from 'lucide-react';
import { PositionSelect } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';

export interface ConferenceFormData {
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  workplace: string;
  position: string;
  positionOther: string;
}

interface ConferenceResubmitFormProps {
  formData: ConferenceFormData;
  onChange: <K extends keyof ConferenceFormData>(field: K, value: ConferenceFormData[K]) => void;
  hidePhone?: boolean;
}

export function ConferenceResubmitForm({ formData, onChange, hidePhone = false }: ConferenceResubmitFormProps) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-2">
          <User className="w-4 h-4 text-[#0026b3]" />
          <span>แบบฟอร์มแก้ไขข้อมูลผู้ลงทะเบียนเข้าร่วมประชุม</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">แก้ไขข้อมูลที่ผิดพลาดได้ทันที</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        {/* Full Name TH */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ชื่อ - นามสกุล ภาษาไทย <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="ระบุชื่อ-นามสกุล ภาษาไทย"
            value={formData.nameTh}
            onChange={(e) => onChange('nameTh', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
          />
        </div>

        {/* Full Name EN */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ชื่อ - นามสกุล ภาษาอังกฤษ
          </label>
          <input
            type="text"
            placeholder="Full Name English"
            value={formData.nameEn}
            onChange={(e) => onChange('nameEn', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
          />
        </div>

        {/* Phone (ซ่อนในกรณีลงทะเบียนแบบกลุ่ม) */}
        {!hidePhone && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
              <input
                type="tel"
                placeholder="08XXXXXXXX"
                value={formData.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div className={hidePhone ? 'sm:col-span-2' : ''}>
          <SmartEmailInput
            value={formData.email}
            onChange={(val) => onChange('email', val)}
            label="อีเมล"
            placeholder="example@mail.com"
            required
          />
        </div>

        {/* Workplace */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            หน่วยงาน / โรงพยาบาล / สถานที่ทำงาน <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="ชื่อโรงพยาบาล หรือหน่วยงานต้นสังกัด"
              value={formData.workplace}
              onChange={(e) => onChange('workplace', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
            />
          </div>
        </div>

        {/* Position */}
        <div className="sm:col-span-2">
          <PositionSelect
            value={formData.position}
            onChange={(val) => onChange('position', val)}
            otherValue={formData.positionOther}
            onOtherChange={(val) => onChange('positionOther', val)}
            showIcon={false}
            showLabel={true}
            label="ตำแหน่ง / สาขาวิชาชีพ"
            otherLabel="ระบุตำแหน่ง / สาขาวิชาชีพอื่นๆ"
            otherPlaceholder="โปรดระบุตำแหน่งของคุณ..."
            selectClassName="px-3.5 py-2.5 text-xs font-semibold shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
