'use client';

import React, { useState } from 'react';
import {
  Building,
  Mail,
  Phone,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  MembershipResubmitForm,
  MembershipFormData,
} from './MembershipResubmitForm';
import {
  ConferenceResubmitForm,
  ConferenceFormData,
} from './ConferenceResubmitForm';

export interface CorporateFormData {
  companyName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  isMembershipGroup: boolean;
  applicants: MembershipFormData[];
  attendees: ConferenceFormData[];
  activePersonIndex: number;
}

interface CorporateResubmitFormProps {
  formData: CorporateFormData;
  onChange: <K extends keyof CorporateFormData>(field: K, value: CorporateFormData[K]) => void;
}

export function CorporateResubmitForm({ formData, onChange }: CorporateResubmitFormProps) {
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const activeIdx = Math.max(
    0,
    Math.min(
      formData.activePersonIndex || 0,
      (formData.isMembershipGroup ? formData.applicants.length : formData.attendees.length) - 1
    )
  );

  const totalPersons = formData.isMembershipGroup
    ? formData.applicants.length
    : formData.attendees.length;

  const currentApplicant = formData.applicants[activeIdx] || {
    nameTh: '',
    nameEn: '',
    id4Digits: '',
    mobile: '',
    email: '',
    workplace: formData.companyName || '',
    startDate: '',
    position: '',
    positionOther: '',
    scientistNo: '',
    referees: '',
    address: '',
    educations: [{ id: '1', degree: '', institution: '', year: '' }],
    photoPreview: null,
    selectedPhotoFile: null,
    degreeCertPreview: null,
    selectedDegreeCertFile: null,
    workCertPreview: null,
    selectedWorkCertFile: null,
  };

  const currentAttendee = formData.attendees[activeIdx] || {
    nameTh: '',
    nameEn: '',
    email: '',
    phone: '',
    workplace: formData.companyName || '',
    position: '',
    positionOther: '',
  };

  const triggerSwitch = (newIdx: number) => {
    if (newIdx === activeIdx) return;
    setIsSwitching(true);
    onChange('activePersonIndex', newIdx);
    setTimeout(() => {
      setIsSwitching(false);
    }, 200);
  };

  const handleApplicantFieldChange = <K extends keyof MembershipFormData>(
    field: K,
    val: MembershipFormData[K]
  ) => {
    const updated = [...formData.applicants];
    updated[activeIdx] = {
      ...updated[activeIdx],
      [field]: val,
    };
    onChange('applicants', updated);
  };

  const handleAttendeeFieldChange = <K extends keyof ConferenceFormData>(
    field: K,
    val: ConferenceFormData[K]
  ) => {
    const updated = [...formData.attendees];
    updated[activeIdx] = {
      ...updated[activeIdx],
      [field]: val,
    };
    onChange('attendees', updated);
  };

  const handleAddPerson = () => {
    if (formData.isMembershipGroup) {
      const newApplicant: MembershipFormData = {
        nameTh: '',
        nameEn: '',
        id4Digits: '',
        mobile: '',
        email: '',
        workplace: formData.companyName || '',
        startDate: '',
        position: '',
        positionOther: '',
        scientistNo: '',
        referees: '',
        address: '',
        educations: [{ id: Date.now().toString(), degree: '', institution: '', year: '' }],
        photoPreview: null,
        selectedPhotoFile: null,
        degreeCertPreview: null,
        selectedDegreeCertFile: null,
        workCertPreview: null,
        selectedWorkCertFile: null,
      };
      onChange('applicants', [...formData.applicants, newApplicant]);
      onChange('activePersonIndex', formData.applicants.length);
    } else {
      const newAttendee: ConferenceFormData = {
        nameTh: '',
        nameEn: '',
        email: '',
        phone: '',
        workplace: formData.companyName || '',
        position: '',
        positionOther: '',
      };
      onChange('attendees', [...formData.attendees, newAttendee]);
      onChange('activePersonIndex', formData.attendees.length);
    }
  };

  const handleRemovePerson = (removeIdx: number) => {
    if (totalPersons <= 1) return;
    if (formData.isMembershipGroup) {
      const updated = formData.applicants.filter((_, idx) => idx !== removeIdx);
      onChange('applicants', updated);
      onChange('activePersonIndex', Math.max(0, removeIdx - 1));
    } else {
      const updated = formData.attendees.filter((_, idx) => idx !== removeIdx);
      onChange('attendees', updated);
      onChange('activePersonIndex', Math.max(0, removeIdx - 1));
    }
  };

  const handleCopyWorkplaceToAll = () => {
    const targetWp = formData.companyName?.trim() || currentApplicant.workplace?.trim() || '';
    if (!targetWp) {
      alert('กรุณาระบุชื่อบริษัทหรือสถานที่ทำงานก่อนคัดลอก');
      return;
    }
    if (formData.isMembershipGroup) {
      const updated = formData.applicants.map((app) => ({
        ...app,
        workplace: targetWp,
      }));
      onChange('applicants', updated);
    } else {
      const updated = formData.attendees.map((att) => ({
        ...att,
        workplace: targetWp,
      }));
      onChange('attendees', updated);
    }
    setCopiedNotice(targetWp);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header: Corporate / Coordinator Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-[#0026b3]" />
            <span>ข้อมูลบริษัทและผู้ประสานงาน</span>
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
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>
                อีเมลประสานงานบริษัท <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="email"
              value={formData.coordinatorEmail}
              onChange={(e) => onChange('coordinatorEmail', e.target.value)}
              placeholder="coordinator@company.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
            />
          </div>

          {/* Coordinator Phone */}
          <div className="space-y-1.5">
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

      {/* 2. Multi-Applicant Roster Navigation & Pagination Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0026b3]" />
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              {formData.isMembershipGroup
                ? 'รายชื่อผู้สมัครสมาชิก (คลิกเลือกเพื่อตรวจสอบและแก้ไขรายบุคคล):'
                : 'รายชื่อผู้เข้าร่วมประชุม (คลิกเลือกเพื่อตรวจสอบและแก้ไขรายบุคคล):'}
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {copiedNotice && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg animate-fade-in flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>คัดลอกที่ทำงานให้ทุกคนแล้ว</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyWorkplaceToAll}
              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95"
              title="คัดลอกสถานที่ทำงานไปยังทุกคน"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอกที่ทำงานให้ทุกคน</span>
            </button>

            {totalPersons > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePerson(activeIdx)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบคนที่ {activeIdx + 1}</span>
              </button>
            )}
          </div>
        </div>

        {/* Pagination Pills / Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {(formData.isMembershipGroup ? formData.applicants : formData.attendees).map((item, idx) => {
            const isActive = idx === activeIdx;
            const hasName = Boolean(item.nameTh?.trim());
            const label = item.nameTh?.trim()
              ? item.nameTh.length > 14
                ? item.nameTh.slice(0, 14) + '...'
                : item.nameTh
              : `คนที่ ${idx + 1}`;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => triggerSwitch(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0026b3] to-[#001c8c] text-white border-blue-900 shadow-md ring-2 ring-blue-400/40 scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isActive ? 'bg-white text-[#0026b3]' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{label}</span>
                {hasName && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#4ade80]' : 'text-emerald-600'
                    }`}
                  />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleAddPerson}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 border-dashed transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มรายชื่อ</span>
          </button>
        </div>

        {/* Current Person Header Notice */}
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-100 rounded-2xl px-4 py-2.5 text-xs text-blue-950 font-bold">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0026b3] animate-pulse" />
            <span>
              {formData.isMembershipGroup ? 'ข้อมูลผู้สมัครคนที่' : 'ข้อมูลผู้เข้าร่วมคนที่'} {activeIdx + 1} จากทั้งหมด {totalPersons} ท่าน
            </span>
          </span>
          <span className="text-[11px] text-blue-700 font-semibold truncate max-w-[200px]">
            {currentApplicant.nameTh || currentAttendee.nameTh || 'ยังไม่ได้ระบุชื่อ'}
          </span>
        </div>
      </div>

      {/* 3. Form Body: 1 Person per Page with Fade / Switch Transition */}
      <div className="relative">
        {isSwitching && (
          <div className="absolute inset-0 z-30 bg-white/75 backdrop-blur-[2px] rounded-3xl flex items-center justify-center animate-fade-in pointer-events-none transition-all">
            <div className="bg-[#0026b3] text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-pulse">
              <Sparkles className="w-4 h-4 text-[#4ade80] animate-spin" />
              <span>กำลังสลับไปยังคนที่ {activeIdx + 1}...</span>
            </div>
          </div>
        )}

        {formData.isMembershipGroup ? (
          <MembershipResubmitForm
            formData={currentApplicant}
            onChange={handleApplicantFieldChange}
          />
        ) : (
          <ConferenceResubmitForm
            formData={currentAttendee}
            onChange={handleAttendeeFieldChange}
          />
        )}
      </div>

      {/* 4. Bottom Step Navigation Between Persons */}
      {totalPersons > 1 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <button
            type="button"
            disabled={activeIdx === 0}
            onClick={() => triggerSwitch(activeIdx - 1)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeIdx === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>คนก่อนหน้า (#{activeIdx})</span>
          </button>

          <span className="text-xs font-bold text-slate-500">
            {activeIdx + 1} / {totalPersons}
          </span>

          <button
            type="button"
            disabled={activeIdx === totalPersons - 1}
            onClick={() => triggerSwitch(activeIdx + 1)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeIdx === totalPersons - 1
                ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-[#0026b3] hover:bg-blue-900 text-white shadow-sm'
            }`}
          >
            <span>คนถัดไป (#{activeIdx + 2})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
