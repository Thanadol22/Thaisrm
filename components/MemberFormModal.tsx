'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Member,
  MemberType,
  MEMBER_TYPE_LABELS,
  JOB_CATEGORIES,
  CreateMemberInput,
  UpdateMemberInput,
  MemberEducation,
} from '@/types/member';
import { MemberAvatar } from '@/components/MemberAvatar';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Calendar,
  MessageSquare,
  IdCard,
  Image as ImageIcon
} from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: Member | null; // If passed, mode is edit; otherwise create
  onSuccess: (savedMember: Member, isNew: boolean) => void;
}

interface EducationFormItem {
  degree: string;
  institution: string;
  graduation_year: string;
}

export function MemberFormModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: MemberFormModalProps) {
  const isEdit = !!member;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [fullNameTh, setFullNameTh] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [idLast4, setIdLast4] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [address, setAddress] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState('');
  const [jobCategory, setJobCategory] = useState<string>('RM');
  const [jobCategoryOther, setJobCategoryOther] = useState('');
  const [membershipType, setMembershipType] = useState<string>('Regular');
  const [membershipStatus, setMembershipStatus] = useState<string>('Active');
  const [scientistRegNo, setScientistRegNo] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [educations, setEducations] = useState<EducationFormItem[]>([
    { degree: '', institution: '', graduation_year: '' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'work' | 'education'>('basic');

  // Initialize or reset form when member changes
  useEffect(() => {
    if (isOpen) {
      if (member) {
        setFullNameTh(member.full_name_th || '');
        setFullNameEn(member.full_name_en || '');
        setIdLast4(member.id_last4 || '');
        setMobile(member.mobile || '');
        setEmail(member.email || '');
        setLineId(member.line_id || '');
        setAddress(member.address || '');
        setWorkplace(member.workplace || '');
        setWorkPhone(member.work_phone || '');
        setPosition(member.position || '');
        setStartDate(member.start_date || '');
        setJobCategory(member.job_category || 'RM');
        setJobCategoryOther(member.member_type_other || '');
        setMembershipType(member.membership_type || 'Regular');
        setMembershipStatus(member.membership_status || 'Active');
        setScientistRegNo(member.scientist_reg_no || '');
        setPhotoPath(member.photo_path || '');

        if (member.educations && member.educations.length > 0) {
          setEducations(
            member.educations.map((edu) => ({
              degree: edu.degree || '',
              institution: edu.institution || '',
              graduation_year: edu.graduation_year ? String(edu.graduation_year) : '',
            }))
          );
        } else {
          setEducations([{ degree: '', institution: '', graduation_year: '' }]);
        }
      } else {
        // Reset form for create
        setFullNameTh('');
        setFullNameEn('');
        setIdLast4('');
        setMobile('');
        setEmail('');
        setLineId('');
        setAddress('');
        setWorkplace('');
        setWorkPhone('');
        setPosition('');
        setStartDate('');
        setJobCategory('RM');
        setJobCategoryOther('');
        setMembershipType('Regular');
        setMembershipStatus('Active');
        setScientistRegNo('');
        setPhotoPath('');
        setEducations([{ degree: '', institution: '', graduation_year: '' }]);
      }
      setFormError(null);
      setActiveTab('basic');
    }
  }, [isOpen, member]);

  if (!isOpen) return null;

  // Add education row
  const handleAddEducation = () => {
    setEducations((prev) => [...prev, { degree: '', institution: '', graduation_year: '' }]);
  };

  // Remove education row
  const handleRemoveEducation = (index: number) => {
    if (educations.length <= 1) {
      setEducations([{ degree: '', institution: '', graduation_year: '' }]);
      return;
    }
    setEducations((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update education row
  const handleEducationChange = (
    index: number,
    field: keyof EducationFormItem,
    value: string
  ) => {
    setEducations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side quick check
    if (!fullNameTh.trim()) {
      setFormError('กรุณาระบุชื่อ-นามสกุล (ภาษาไทย)');
      setActiveTab('basic');
      return;
    }

    if (idLast4 && !/^\d{4}$/.test(idLast4.trim())) {
      setFormError('เลขบัตรประชาชน 4 หลักท้ายต้องเป็นตัวเลข 4 หลักเท่านั้น');
      setActiveTab('basic');
      return;
    }

    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setFormError('รูปแบบอีเมลไม่ถูกต้อง');
      setActiveTab('basic');
      return;
    }

    if (mobile && !/^(0[2-9][0-9]{7,8}|\+66[2-9][0-9]{7,8})$/.test(mobile.replace(/[\s\-]/g, ''))) {
      setFormError('เบอร์โทรศัพท์ไม่ถูกต้อง (กรุณากรอกตัวเลข 9-10 หลัก เช่น 0812345678)');
      setActiveTab('basic');
      return;
    }

    if (jobCategory === 'อื่นๆ' && !jobCategoryOther.trim()) {
      setFormError('กรณีเลือกตำแหน่ง/สาขาวิชาชีพ "อื่นๆ" กรุณาระบุรายละเอียด');
      setActiveTab('work');
      return;
    }

    // Filter valid educations
    const validEducations = educations
      .filter((edu) => edu.degree.trim() !== '' || edu.institution.trim() !== '')
      .map((edu, idx) => ({
        degree: edu.degree.trim(),
        institution: edu.institution.trim(),
        graduation_year: edu.graduation_year.trim() ? Number(edu.graduation_year.trim()) : null,
        display_order: idx + 1,
      }));

    setIsLoading(true);

    try {
      if (isEdit && member) {
        // PUT /api/members/[id]
        const updatePayload: UpdateMemberInput = {
          full_name_th: fullNameTh.trim(),
          full_name_en: fullNameEn.trim() || null,
          id_last4: idLast4.trim() || null,
          mobile: mobile.trim() || null,
          email: email.trim() || null,
          line_id: lineId.trim() || null,
          address: address.trim() || null,
          workplace: workplace.trim() || null,
          work_phone: workPhone.trim() || null,
          position: position.trim() || null,
          job_category: jobCategory === 'อื่นๆ' && jobCategoryOther.trim() ? jobCategoryOther.trim() : jobCategory,
          member_type_other: jobCategory === 'อื่นๆ' ? jobCategoryOther.trim() : null,
          membership_type: membershipType,
          membership_status: membershipStatus,
          start_date: startDate.trim() || null,
          scientist_reg_no: scientistRegNo.trim() || null,
          photo_path: photoPath.trim() || null,
          educations: validEducations,
        };

        const targetId = member.member_no || member.member_id;
        const res = await fetch(`/api/members/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสมาชิก');
        }

        onSuccess(json.data, false);
      } else {
        // POST /api/members
        const createPayload: CreateMemberInput = {
          full_name_th: fullNameTh.trim(),
          full_name_en: fullNameEn.trim() || null,
          id_last4: idLast4.trim() || null,
          mobile: mobile.trim() || null,
          email: email.trim() || null,
          line_id: lineId.trim() || null,
          address: address.trim() || null,
          workplace: workplace.trim() || null,
          work_phone: workPhone.trim() || null,
          position: position.trim() || null,
          job_category: jobCategory === 'อื่นๆ' && jobCategoryOther.trim() ? jobCategoryOther.trim() : jobCategory,
          member_type_other: jobCategory === 'อื่นๆ' ? jobCategoryOther.trim() : null,
          membership_type: membershipType,
          membership_status: membershipStatus,
          start_date: startDate.trim() || null,
          scientist_reg_no: scientistRegNo.trim() || null,
          photo_path: photoPath.trim() || null,
          educations: validEducations,
        };

        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิกใหม่');
        }

        onSuccess(json.data, true);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Member form save error:', err);
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-[#4ade80]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#4ade80]">
                {isEdit ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
              </span>
              <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                {isEdit ? `แก้ไข: ${member?.full_name_th} (${member?.member_no || ''})` : 'กรอกข้อมูลสมาชิกสมาคม (TSRM)'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'basic'
                ? 'border-[#0026b3] text-[#0026b3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ข้อมูลทั่วไปและการติดต่อ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'work'
                ? 'border-[#0026b3] text-[#0026b3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>ตำแหน่งและวิชาชีพ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('education')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'education'
                ? 'border-[#0026b3] text-[#0026b3]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>ประวัติการศึกษา</span>
          </button>
        </div>

        {/* Error Notification */}
        {formError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: ข้อมูลทั่วไปและการติดต่อ */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ชื่อ-นามสกุล ไทย */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>ชื่อ-นามสกุล (ภาษาไทย)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullNameTh}
                    onChange={(e) => setFullNameTh(e.target.value)}
                    placeholder="เช่น นพ.สมชาย ใจดี หรือ นางสาวสุภาพร วิจิตร"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                    required
                  />
                </div>

                {/* ชื่อ-นามสกุล อังกฤษ */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    ชื่อ-นามสกุล (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={fullNameEn}
                    onChange={(e) => setFullNameEn(e.target.value)}
                    placeholder="เช่น Dr. Somchai Jaidee"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* เลขบัตร 4 ตัวท้าย */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>เลขประจำตัวประชาชน 4 ตัวท้าย</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={idLast4}
                    onChange={(e) => setIdLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="เช่น 1234"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* เบอร์โทรศัพท์ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>เบอร์โทรศัพท์มือถือ</span>
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="เช่น 0812345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* อีเมล */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>อีเมล (Email)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น member@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* Line ID */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>LINE ID</span>
                  </label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น somchai_line"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* รูปโปรไฟล์ URL / Path */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>URL รูปโปรไฟล์ (ถ้ามี)</span>
                  </label>
                  <input
                    type="text"
                    value={photoPath}
                    onChange={(e) => setPhotoPath(e.target.value)}
                    placeholder="/uploads/photo.jpg หรือ https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* ที่อยู่สำหรับติดต่อ */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    ที่อยู่สำหรับติดต่อ / ส่งเอกสาร
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ตำแหน่งและวิชาชีพ */}
          {activeTab === 'work' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* กลุ่มตำแหน่ง / สาขาวิชาชีพ */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>ตำแหน่ง / กลุ่มวิชาชีพ</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={jobCategory}
                    onChange={(e) => setJobCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ระบุอื่นๆ หากเลือกอื่นๆ */}
                {jobCategory === 'อื่นๆ' && (
                  <div className="space-y-1 sm:col-span-2 animate-fade-in">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>ระบุกลุ่มวิชาชีพ / ตำแหน่งอื่นๆ</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={jobCategoryOther}
                      onChange={(e) => setJobCategoryOther(e.target.value)}
                      placeholder="กรุณาระบุตำแหน่ง/สาขาวิชาชีพ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}

                {/* ตำแหน่งงาน / สายงานย่อย */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    ชื่อตำแหน่งงานเฉพาะทาง (Position title)
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="เช่น สูตินรีแพทย์ ผู้เชี่ยวชาญเวชศาสตร์การเจริญพันธุ์ หรือ นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อนอาวุโส"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* สถานที่ทำงาน */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>สถานที่ทำงาน / โรงพยาบาล / สถาบัน</span>
                  </label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="เช่น โรงพยาบาลศิริราช, ศูนย์ผู้มีบุตรยาก..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* เบอร์โทรที่ทำงาน */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>เบอร์โทรศัพท์ที่ทำงาน</span>
                  </label>
                  <input
                    type="text"
                    value={workPhone}
                    onChange={(e) => setWorkPhone(e.target.value)}
                    placeholder="เช่น 02-123-4567 ต่อ 123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* วันที่เริ่มปฏิบัติงาน */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>วันที่เริ่มปฏิบัติงาน</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* เลขที่ใบอนุญาตนักวิทยาศาสตร์ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    เลขที่ใบประกอบวิชาชีพ / ทะเบียนนักวิทย์
                  </label>
                  <input
                    type="text"
                    value={scientistRegNo}
                    onChange={(e) => setScientistRegNo(e.target.value)}
                    placeholder="เช่น ว.12345 หรือ ทบ.678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  />
                </div>

                {/* ประเภทสมาชิกสมาคม */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    ประเภทสมาชิกสมาคม
                  </label>
                  <select
                    value={membershipType}
                    onChange={(e) => setMembershipType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:border-transparent"
                  >
                    <option value="Regular">สามัญ</option>
                    <option value="Associate">วิสามัญ</option>
                    <option value="Honorary">กิตติมศักดิ์</option>
                  </select>
                </div>

                {/* สถานะสมาชิก (Active / Inactive) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>สถานะสมาชิกภาพ</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setMembershipStatus('Active')}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                        membershipStatus.toLowerCase() === 'active'
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        membershipStatus.toLowerCase() === 'active'
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-slate-300'
                      }`}>
                        {membershipStatus.toLowerCase() === 'active' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>ปกติ</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">
                            ACTIVE
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          สถานะสมาชิกสมบูรณ์ มีสิทธิประโยชน์ครบถ้วน
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMembershipStatus('Inactive')}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                        membershipStatus.toLowerCase() === 'inactive'
                          ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        membershipStatus.toLowerCase() === 'inactive'
                          ? 'border-rose-600 bg-rose-600'
                          : 'border-slate-300'
                      }`}>
                        {membershipStatus.toLowerCase() === 'inactive' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>หมดอายุ</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono">
                            EXPIRED
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          สมาชิกหมดอายุการต่ออายุ หรือสถานะรอชำระ
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ประวัติการศึกษา */}
          {activeTab === 'education' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    รายการประวัติการศึกษา / คุณวุฒิ
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ระบุระดับการศึกษา วุฒิการศึกษา และสถาบันที่สำเร็จการศึกษา
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold transition cursor-pointer border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มวุฒิการศึกษา</span>
                </button>
              </div>

              <div className="space-y-3">
                {educations.map((edu, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <GraduationCap className="w-3.5 h-3.5 text-[#0026b3]" />
                        <span>ลำดับที่ {index + 1}</span>
                      </div>
                      {educations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(index)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          ระดับ / วุฒิการศึกษา
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) =>
                            handleEducationChange(index, 'degree', e.target.value)
                          }
                          placeholder="เช่น แพทยศาสตรบัณฑิต (พบ.) หรือ วท.บ."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0026b3]"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          สถาบันการศึกษา
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) =>
                            handleEducationChange(index, 'institution', e.target.value)
                          }
                          placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0026b3]"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          ปีที่สำเร็จการศึกษา (พ.ศ.)
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={edu.graduation_year}
                          onChange={(e) =>
                            handleEducationChange(
                              index,
                              'graduation_year',
                              e.target.value.replace(/\D/g, '')
                            )
                          }
                          placeholder="เช่น 2555"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0026b3] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            {activeTab !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'education') setActiveTab('work');
                  else if (activeTab === 'work') setActiveTab('basic');
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                ย้อนกลับ
              </button>
            )}

            {activeTab !== 'education' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('work');
                  else if (activeTab === 'work') setActiveTab('education');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0026b3] hover:bg-[#0022a1] transition cursor-pointer shadow-md shadow-[#0026b3]/20"
              >
                ถัดไป
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-[#4ade80] hover:bg-emerald-400 transition cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกสมาชิกใหม่'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
