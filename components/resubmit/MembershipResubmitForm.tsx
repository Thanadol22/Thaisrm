'use client';

import React from 'react';
import {
  User,
  Building,
  GraduationCap,
  Camera,
  Upload,
  Trash2,
  Phone,
  FileText,
  FileCheck,
  CheckCircle2,
  Eye,
  Plus,
} from 'lucide-react';
import { PositionSelect } from '@/components/PositionSelect';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { SmartEmailInput } from '@/components/SmartEmailInput';

export interface EducationRow {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface MembershipFormData {
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  mobile: string;
  email: string;
  workplace: string;
  startDate: string;
  position: string;
  positionOther: string;
  scientistNo: string;
  referees: string;
  address: string;
  educations: EducationRow[];
  photoPreview: string | null;
  selectedPhotoFile: File | null;
  degreeCertPreview: string | null;
  selectedDegreeCertFile: File | null;
  workCertPreview: string | null;
  selectedWorkCertFile: File | null;
}

interface MembershipResubmitFormProps {
  formData: MembershipFormData;
  onChange: <K extends keyof MembershipFormData>(field: K, value: MembershipFormData[K]) => void;
}

const isPdfFile = (file: File | null, previewUrl: string | null): boolean => {
  if (file) {
    if (file.type === 'application/pdf') return true;
    if (file.name.toLowerCase().endsWith('.pdf')) return true;
  }
  if (previewUrl) {
    const cleanUrl = previewUrl.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.pdf')) return true;
  }
  return false;
};

export function MembershipResubmitForm({ formData, onChange }: MembershipResubmitFormProps) {
  const isDoctorOrFellow = formData.position.startsWith('1') || formData.position.startsWith('2');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange('selectedPhotoFile', file);
      const url = URL.createObjectURL(file);
      onChange('photoPreview', url);
    }
  };

  const handleDegreeCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange('selectedDegreeCertFile', file);
      const url = URL.createObjectURL(file);
      onChange('degreeCertPreview', url);
    }
  };

  const handleWorkCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange('selectedWorkCertFile', file);
      const url = URL.createObjectURL(file);
      onChange('workCertPreview', url);
    }
  };

  const handleEducationChange = (id: string, field: keyof EducationRow, val: string) => {
    const updated = formData.educations.map((edu) =>
      edu.id === id ? { ...edu, [field]: val } : edu
    );
    onChange('educations', updated);
  };

  const addEducationRow = () => {
    const newId = Date.now().toString();
    onChange('educations', [
      ...formData.educations,
      { id: newId, degree: '', institution: '', year: '' },
    ]);
  };

  const removeEducationRow = (id: string) => {
    if (formData.educations.length <= 1) return;
    onChange('educations', formData.educations.filter((edu) => edu.id !== id));
  };

  const isDegreeCertPdf = isPdfFile(formData.selectedDegreeCertFile, formData.degreeCertPreview);
  const isWorkCertPdf = isPdfFile(formData.selectedWorkCertFile, formData.workCertPreview);

  return (
    <div className="space-y-4">
      {/* 1. ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <User className="w-4 h-4 text-[#0026b3] shrink-0" />
          <span>ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก</span>
        </h3>

        {/* Profile Photo Upload Row */}
        <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-white rounded-2xl p-4 border border-blue-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-blue-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-xs group-hover:border-[#0026b3] transition-all relative">
              {formData.photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.photoPreview}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-[#0026b3] transition-colors">
                  <User className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5] mb-0.5" />
                  <span className="text-[10px] font-bold text-slate-500">รูปถ่าย</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                title="เลือกรูปโปรไฟล์"
              />
            </div>

            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0026b3] text-white flex items-center justify-center shadow-md border-2 border-white pointer-events-none group-hover:scale-110 transition-transform">
              <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                รูปถ่ายหน้าตรงติดบัตรสมาชิก
              </h4>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                รูปหน้าตรงสุภาพ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              อัปโหลดรูปถ่ายหน้าตรงสุภาพ (ไฟล์ JPG/PNG ขนาดไม่เกิน 5MB)
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs hover:border-[#0026b3] transition active:scale-95">
                <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>{formData.photoPreview ? 'เปลี่ยนรูปถ่าย' : 'เลือกรูปถ่าย'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>

              {formData.photoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('photoPreview', null);
                    onChange('selectedPhotoFile', null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ลบรูป</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
          {/* ชื่อ-นามสกุล ภาษาไทย */}
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

          {/* ชื่อ-นามสกุล ภาษาอังกฤษ */}
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

          {/* เลข 4 หลักท้ายบัตรประชาชน */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลข 4 หลักท้ายบัตรประชาชน
            </label>
            <input
              type="text"
              maxLength={4}
              placeholder="เช่น 1234"
              value={formData.id4Digits}
              onChange={(e) => onChange('id4Digits', e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-mono"
            />
          </div>

          {/* เบอร์โทรศัพท์มือถือ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
              <input
                type="tel"
                placeholder="08XXXXXXXX"
                value={formData.mobile}
                onChange={(e) => onChange('mobile', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition font-medium"
              />
            </div>
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <SmartEmailInput
              value={formData.email}
              onChange={(val) => onChange('email', val)}
              label="อีเมล"
              placeholder="example@mail.com"
              required
            />
          </div>
        </div>
      </div>

      {/* 2. สถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Building className="w-4 h-4 text-[#0026b3] shrink-0" />
          <span>ข้อมูลสถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Workplace */}
          <div>
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

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันที่เริ่มปฏิบัติงาน
            </label>
            <ThaiDatePicker
              value={formData.startDate}
              onChange={(val) => onChange('startDate', val)}
              outputFormat="iso"
              placeholder="เลือกวันที่เริ่มปฏิบัติงาน"
              className="w-full"
            />
          </div>
        </div>

        {/* Position */}
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

        {/* Scientist License No. */}
        <div
          className={`border rounded-2xl p-3 sm:p-3.5 space-y-1.5 transition-all text-xs ${
            isDoctorOrFellow ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300/40' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="block text-xs font-bold text-slate-700 flex flex-wrap items-center justify-between gap-1">
            <span className="flex items-center gap-1 min-w-0">
              <span>เลขทะเบียนผู้ปฏิบัติงานด้านเทคโนโลยีช่วยการเจริญพันธุ์ (นว.)</span>
              {isDoctorOrFellow && <span className="text-rose-500 font-black">*</span>}
            </span>
            <span
              className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                isDoctorOrFellow ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {isDoctorOrFellow ? 'จำเป็นสำหรับตำแหน่ง 1 และ 2' : 'ถ้ามี'}
            </span>
          </label>
          <input
            type="text"
            placeholder={
              isDoctorOrFellow
                ? 'กรอกเลขทะเบียนนักวิทย์ (นว) *จำเป็นสำหรับตำแหน่ง 1 และ 2'
                : 'กรอกเลขทะเบียนนักวิทย์ (ถ้ามี)...'
            }
            value={formData.scientistNo}
            onChange={(e) => onChange('scientistNo', e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] transition font-medium"
          />
        </div>

        {/* Work Certificate Upload Box */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                หลักฐานใบรับรองการทำงาน
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
              หนังสือรับรอง
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            {formData.workCertPreview ? (
              isWorkCertPdf ? (
                <div className="relative w-14 h-14 rounded-xl border border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-600 shrink-0 shadow-xs">
                  <FileText className="w-6 h-6 text-rose-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 mt-0.5">PDF</span>
                </div>
              ) : (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.workCertPreview}
                    alt="Work Cert"
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 flex items-center justify-center text-indigo-500 shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
            )}

            <div className="flex-1 space-y-1 min-w-0">
              {formData.workCertPreview ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {isWorkCertPdf
                        ? 'แนบเอกสาร PDF ใบรับรองการทำงานแล้ว'
                        : 'แนบรูปหลักฐานใบรับรองการทำงานแล้ว'}
                    </span>
                  </div>
                  {formData.selectedWorkCertFile?.name && (
                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                      {formData.selectedWorkCertFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  อัปโหลดใบรับรองการทำงาน (JPG, PNG หรือ PDF ไม่เกิน 10MB)
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {formData.workCertPreview && (
                  <a
                    href={formData.workCertPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 shadow-xs transition active:scale-95 min-h-[32px]"
                    title="เปิดดูไฟล์ในแท็บใหม่"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0026b3]" />
                    <span>{isWorkCertPdf ? 'เปิดดู PDF' : 'ดูรูปภาพ'}</span>
                  </a>
                )}

                <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200 shadow-xs transition active:scale-95 min-h-[32px]">
                  <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                  <span>{formData.workCertPreview ? 'เปลี่ยนไฟล์' : 'อัปโหลดใบรับรองการทำงาน'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleWorkCertUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>

                {formData.workCertPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('workCertPreview', null);
                      onChange('selectedWorkCertFile', null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer min-h-[32px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบเอกสาร</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ประวัติการศึกษาและหลักฐานปริญญาบัตร */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h3 className="font-extrabold text-[#0026b3] text-sm flex items-center gap-1.5 min-w-0">
            <GraduationCap className="w-4 h-4 text-[#0026b3] shrink-0" />
            <span>ประวัติการศึกษาและหลักฐานปริญญาบัตร</span>
          </h3>
          <button
            type="button"
            onClick={addEducationRow}
            className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer border border-[#0026b3]/20 shrink-0 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>เพิ่มแถวการศึกษา</span>
          </button>
        </div>

        {/* Education Rows */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-xs font-bold text-[#0026b3]">
            <div className="col-span-4">ระดับการศึกษา / วุฒิ</div>
            <div className="col-span-5">สถาบันการศึกษา</div>
            <div className="col-span-2">ปีที่สำเร็จ (พ.ศ.)</div>
            <div className="col-span-1 text-center">จัดการ</div>
          </div>

          {formData.educations.map((row, idx) => (
            <div
              key={row.id || idx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 bg-slate-50/80 p-2.5 sm:p-2 rounded-xl border border-slate-200 items-center"
            >
              <div className="sm:col-span-4">
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">
                  ระดับการศึกษา / วุฒิ
                </span>
                <input
                  type="text"
                  placeholder="เช่น แพทยศาสตรบัณฑิต, วท.บ."
                  value={row.degree}
                  onChange={(e) => handleEducationChange(row.id, 'degree', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] font-medium"
                />
              </div>

              <div className="sm:col-span-5">
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">
                  สถาบันการศึกษา
                </span>
                <input
                  type="text"
                  placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
                  value={row.institution}
                  onChange={(e) => handleEducationChange(row.id, 'institution', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">
                  ปีที่สำเร็จ (พ.ศ.)
                </span>
                <input
                  type="text"
                  placeholder="เช่น 2560"
                  value={row.year}
                  onChange={(e) => handleEducationChange(row.id, 'year', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] font-medium font-mono"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end sm:justify-center pt-0.5 sm:pt-0">
                <button
                  type="button"
                  onClick={() => removeEducationRow(row.id)}
                  disabled={formData.educations.length <= 1}
                  className="text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                  title="ลบแถวนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Degree Certificate Upload Box */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-2.5 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <GraduationCap className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                หลักฐานปริญญาบัตร / ใบรับรองคุณวุฒิ
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
              ปริญญาบัตร
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            {formData.degreeCertPreview ? (
              isDegreeCertPdf ? (
                <div className="relative w-14 h-14 rounded-xl border border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-600 shrink-0 shadow-xs">
                  <FileText className="w-6 h-6 text-rose-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 mt-0.5">PDF</span>
                </div>
              ) : (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.degreeCertPreview}
                    alt="Degree Cert"
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center text-blue-500 shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
            )}

            <div className="flex-1 space-y-1 min-w-0">
              {formData.degreeCertPreview ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {isDegreeCertPdf
                        ? 'แนบเอกสาร PDF ปริญญาบัตรแล้ว'
                        : 'แนบรูปหลักฐานปริญญาบัตรแล้ว'}
                    </span>
                  </div>
                  {formData.selectedDegreeCertFile?.name && (
                    <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                      {formData.selectedDegreeCertFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  อัปโหลดรูปหลักฐานปริญญาบัตร (JPG, PNG หรือ PDF ไม่เกิน 10MB)
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {formData.degreeCertPreview && (
                  <a
                    href={formData.degreeCertPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 shadow-xs transition active:scale-95 min-h-[32px]"
                    title="เปิดดูไฟล์ในแท็บใหม่"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0026b3]" />
                    <span>{isDegreeCertPdf ? 'เปิดดู PDF' : 'ดูรูปภาพ'}</span>
                  </a>
                )}

                <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 shadow-xs transition active:scale-95 min-h-[32px]">
                  <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
                  <span>{formData.degreeCertPreview ? 'เปลี่ยนไฟล์' : 'อัปโหลดปริญญาบัตร'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleDegreeCertUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>

                {formData.degreeCertPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('degreeCertPreview', null);
                      onChange('selectedDegreeCertFile', null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer min-h-[32px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบเอกสาร</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
