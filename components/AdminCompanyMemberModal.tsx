'use client';

import { registrationStatusLabel } from '@/lib/registrationStatus';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2 } from 'lucide-react';
import { LoginView, SpecialFormContext } from '@/components/views/LoginView';
import { PaymentFlow, RegistrationPaymentData } from '@/components/views/PaymentFlow';
import { SponsorSessionData } from '@/components/SponsorAuthModal';

export interface CompanyOption {
  id: string;
  name: string;
  tier: string;
  contact_name?: string | null;
  contact_email: string;
  is_active: boolean;
}

interface PendingSubmission {
  type: 'registration' | 'membership';
  payload: unknown;
}

/** ลงทะเบียนแทนบริษัทผ่านฟอร์มเฉพาะ: ใช้รายการและราคาของฟอร์ม เลือกได้เฉพาะบริษัทที่มีสิทธิ์ในฟอร์ม */
export interface AdminSpecialFormOption {
  id: string;
  slug: string;
  title: string;
  formType: string;
  allowCoupon: boolean;
  meeting: any;
}

interface AdminCompanyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyOption[];
  onSuccess?: (message: string) => void;
  specialForm?: AdminSpecialFormOption | null;
}

/**
 * แอดมินทำรายการแทนบริษัท โดยใช้ฟอร์มลงทะเบียน/สมัครสมาชิกและขั้นตอนชำระเงินชุดเดียวกับหน้าเว็บจริง
 * (ไม่บังคับแนบสลิป หากไม่แนบจะบันทึกเป็นสถานะรอสลิป)
 */
export function AdminCompanyMemberModal({ isOpen, onClose, companies, onSuccess, specialForm = null }: AdminCompanyMemberModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCompanies = useMemo(() => companies.filter((c) => c.is_active), [companies]);
  const [companyId, setCompanyId] = useState('');
  const [pending, setPending] = useState<PendingSubmission | null>(null);
  // เปลี่ยน key เพื่อล้างฟอร์มหลังบันทึกสำเร็จ
  const [formKey, setFormKey] = useState(0);

  const company = activeCompanies.find((c) => c.id === companyId) || null;

  const sponsorSession = useMemo<SponsorSessionData | null>(
    () =>
      company
        ? {
            sponsorId: company.id,
            sponsorName: company.name,
            tier: company.tier,
            contactEmail: company.contact_email,
            contactName: company.contact_name || undefined,
            verifiedAt: new Date().toISOString(),
            meetings: [],
          }
        : null,
    [company]
  );

  const specialFormContext = useMemo<SpecialFormContext | null>(
    () =>
      specialForm && sponsorSession
        ? {
            id: specialForm.id,
            slug: specialForm.slug,
            title: specialForm.title,
            formType: specialForm.formType,
            // แอดมินทำรายการด้วยสิทธิ์แอดมิน ไม่ใช้ token ของบริษัท
            token: '',
            meeting: specialForm.meeting,
            allowCoupon: specialForm.allowCoupon,
            sponsorSession,
            onSessionEnd: () => {},
          }
        : null,
    [specialForm, sponsorSession]
  );

  const handleClose = () => {
    setPending(null);
    setCompanyId('');
    setFormKey((k) => k + 1);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-blue-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {specialForm ? `ลงทะเบียนแทนบริษัท: ${specialForm.title}` : 'เพิ่มสมาชิกบริษัท'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {specialForm
                  ? 'ใช้รายการและราคาของฟอร์มนี้ เลือกได้เฉพาะบริษัทที่มีสิทธิ์ ไม่บังคับแนบสลิป'
                  : 'ลงทะเบียนหรือสมัครสมาชิกแทนบริษัท ไม่บังคับแนบสลิป'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPending(null);
              }}
              disabled={Boolean(pending)}
              className="w-full sm:w-64 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] cursor-pointer disabled:opacity-60"
            >
              <option value="">-- เลือกบริษัท --</option>
              {activeCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 bg-[#f6f8fc]">
          {!company || !sponsorSession ? (
            <div className="m-6 border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500 bg-white">
              กรุณาเลือกบริษัทก่อนเริ่มทำรายการ
            </div>
          ) : (
            <>
              {/* ขั้นตอนที่ 1: ฟอร์มลงทะเบียน / สมัครสมาชิก (ซ่อนไว้ระหว่างชำระเงินเพื่อให้ย้อนกลับมาแก้ไขได้) */}
              <div className={pending ? 'hidden' : 'p-4 sm:p-6'}>
                <LoginView
                  key={`${company.id}-${formKey}`}
                  adminSponsorSession={sponsorSession}
                  specialForm={specialFormContext}
                  onAdminSubmit={(type, payload) => setPending({ type, payload })}
                  onNavigateToSignup={() => {}}
                  onGoogleSignIn={() => {}}
                />
              </div>

              {/* ขั้นตอนที่ 2: ชำระเงิน */}
              {pending && (
                <PaymentFlow
                  paymentType={pending.type}
                  regData={pending.type === 'registration' ? (pending.payload as RegistrationPaymentData) : null}
                  membershipRegData={pending.type === 'membership' ? pending.payload : null}
                  adminMode
                  onNavigateBack={() => setPending(null)}
                  onSubmitted={({ adminStatus }) => {
                    const action = pending.type === 'registration' ? 'ลงทะเบียนเข้าประชุม' : 'สมัครสมาชิก';
                    const statusText =
                      adminStatus === 'paid'
                        ? ` สถานะ${registrationStatusLabel('registered')}`
                        : adminStatus === 'pending'
                        ? ` สถานะ${registrationStatusLabel('pending')}`
                        : adminStatus === 'approve_failed'
                        ? ' แต่ยังอนุมัติไม่สำเร็จ กรุณาอนุมัติที่เมนูตรวจสอบการชำระเงิน'
                        : '';
                    onSuccess?.(`บันทึก${action}ในนาม ${company.name} เรียบร้อย${statusText}`);
                  }}
                  onSuccessClose={() => {
                    setPending(null);
                    setFormKey((k) => k + 1);
                  }}
                  onMissingMembershipData={() => setPending(null)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
