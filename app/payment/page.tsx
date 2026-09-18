'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentView } from '@/components/views/PaymentView';
import { SlipUploadModal } from '@/components/SlipUploadModal';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();
  const [copiedBank, setCopiedBank] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [uploadedSlipData, setUploadedSlipData] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Router determines the payment type: 'registration' vs 'membership'
  const typeParam = searchParams.get('type');
  const paymentType: 'registration' | 'membership' = 
    typeParam === 'registration' || typeParam === 'conference' ? 'registration' : 'membership';

// Load conference registration payload if available
  const [regData, setRegData] = useState<{
    category?: string;
    meetingId?: string;
    meetingName?: string;
    meetingDate?: string;
    meetingLocation?: string;
    pricingTiers?: any;
    basePrice?: number;
    selectedProgramIds?: string[];
    selectedActivities?: Array<{
      id: string;
      name: string;
      type?: string;
      format?: 'onsite' | 'online' | 'both';
      date?: string;
      memberPrice?: number;
      nonMemberPrice?: number;
      price?: number;
    }>;
    activities?: Array<{
      id: string;
      name: string;
      type?: string;
      format?: 'onsite' | 'online' | 'both';
      date?: string;
      memberPrice?: number;
      nonMemberPrice?: number;
    }>;
    attendanceType?: 'onsite' | 'online';
    memberNo?: string;
    isMember?: boolean;
    isExpiredMember?: boolean;
    memberStatus?: string;
    expireDate?: string | null;
    nameTh?: string;
    nameEn?: string;
    email?: string;
    workplace?: string;
    position?: string;
    positionCode?: string;
    specialCode?: string;
    registeredAt?: string;
  } | null>(null);

  const [systemSettings, setSystemSettings] = useState<{
    bank_name: string;
    bank_account_no: string;
    bank_account_name: string;
    annual_membership_fee: number;
  }>({
    bank_name: 'Kasikorn (KBANK)',
    bank_account_no: '020-8-16398-1',
    bank_account_name: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
    annual_membership_fee: 1000,
  });

  // Fetch dynamic system settings
  React.useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSystemSettings({
            bank_name: json.data.bank_name || 'Kasikorn (KBANK)',
            bank_account_no: json.data.bank_account_no || '020-8-16398-1',
            bank_account_name: json.data.bank_account_name || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
            annual_membership_fee: Number(json.data.annual_membership_fee) || 1000,
          });
        }
      })
      .catch((err) => console.warn('Could not load dynamic settings in payment page:', err));
  }, []);

  React.useEffect(() => {
    if (paymentType === 'registration') {
      try {
        const saved = localStorage.getItem('conference_registration');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRegData(parsed);
        }
      } catch (err) {
        console.error('Failed to parse conference_registration from localStorage', err);
      }
    }
  }, [paymentType]);

  // Dynamic Pricing Calculation (Main Program uses Participant pricing + Workshops)
  const calculationResult = React.useMemo(() => {
    if (paymentType !== 'registration' || !regData) {
      return {
        totalAmount: systemSettings.annual_membership_fee,
        items: [] as Array<{
          id: string;
          name: string;
          type: string;
          format?: string;
          date?: string;
          price: number;
          rateBadgeTh: string;
          rateBadgeEn: string;
        }>,
        isMemberUser: true,
        attendType: 'onsite' as const,
      };
    }

    // A member is only granted member rate if active (not expired) and isMember is true
    const isMemberUser = Boolean(regData.isMember) && !regData.isExpiredMember && Boolean(regData.memberNo?.trim());
    const pricingTiers = regData.pricingTiers;
    const basePrice = regData.basePrice ?? 0;

    // Get list of activity items to evaluate
    const allActivities = (regData.selectedActivities && regData.selectedActivities.length > 0)
      ? regData.selectedActivities
      : (regData.activities && regData.activities.length > 0)
        ? regData.activities
        : [
            { id: 'main', type: 'main', name: regData.meetingName || 'Main Program' }
          ];

    const selectedIds = regData.selectedProgramIds || allActivities.map(a => a.id);
    const activitiesToCalculate = allActivities.filter(a => selectedIds.includes(a.id));

    // Enforce attendance rule:
    // 1. If any selected activity is strictly 'onsite' -> force 'onsite'
    // 2. Online rate is only eligible if no onsite-only activity is selected and user is active member
    const hasOnsiteOnly = activitiesToCalculate.some(a => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
    const isOnlineEligible = !hasOnsiteOnly && isMemberUser;
    const attendType: 'onsite' | 'online' = (regData.attendanceType === 'online' && isOnlineEligible) ? 'online' : 'onsite';

    // Calculate each item
    const items = activitiesToCalculate.map((act) => {
      let price = 0;
      let rateBadgeTh = '';
      let rateBadgeEn = '';

      if (act.type === 'main') {
        if (attendType === 'online') {
          price = isMemberUser
            ? (pricingTiers?.participant?.onlineMember ?? basePrice ?? 3500)
            : (pricingTiers?.participant?.onlineNonMember ?? pricingTiers?.participant?.onsiteNonMember ?? (basePrice ? basePrice + 1000 : 4500));
          rateBadgeTh = isMemberUser ? 'Online (ราคาสมาชิก)' : 'Online (ราคาบุคคลทั่วไป)';
          rateBadgeEn = isMemberUser ? 'Online (Member Rate)' : 'Online (Non-Member Rate)';
        } else {
          // Onsite
          price = isMemberUser
            ? (pricingTiers?.participant?.onsiteMember ?? basePrice ?? 3500)
            : (pricingTiers?.participant?.onsiteNonMember ?? (basePrice ? basePrice + 1000 : 4500));
          rateBadgeTh = isMemberUser ? 'Onsite (ราคาสมาชิก)' : 'Onsite (ราคาบุคคลทั่วไป)';
          rateBadgeEn = isMemberUser ? 'Onsite (Member Rate)' : 'Onsite (Non-Member Rate)';
        }
      } else {
        // Workshop
        const mPrice = typeof act.memberPrice === 'number' ? act.memberPrice : 0;
        const nonMPrice = typeof act.nonMemberPrice === 'number' ? act.nonMemberPrice : mPrice;
        price = isMemberUser ? mPrice : nonMPrice;
        rateBadgeTh = isMemberUser ? 'Workshop (ราคาสมาชิก)' : 'Workshop (ราคาบุคคลทั่วไป)';
        rateBadgeEn = isMemberUser ? 'Workshop (Member Rate)' : 'Workshop (Non-Member Rate)';
      }

      return {
        id: act.id,
        name: act.name,
        type: act.type || 'main',
        format: act.format,
        date: act.date,
        price,
        rateBadgeTh,
        rateBadgeEn,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    return {
      totalAmount,
      items,
      isMemberUser,
      attendType,
    };
  }, [paymentType, regData]);

  const bankAccountNumber = systemSettings.bank_account_no;

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyBank = () => {
    navigator.clipboard.writeText(bankAccountNumber);
    setCopiedBank(true);
    triggerNotification(t.payment.copyToast);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleSlipUploadSuccess = (slipData: { fileName: string; fileUrl: string }) => {
    setUploadedSlipData(slipData);
    triggerNotification(t.payment.uploadSuccessToast);
  };

  const handleRemoveSlip = () => {
    setUploadedSlipData(null);
  };

  const handleConfirmPayment = async () => {
    if (!uploadedSlipData) {
      triggerNotification(t.payment.noSlipWarning);
      setUploadModalOpen(true);
      return;
    }

    if (paymentType === 'registration') {
      const meetingId = regData?.meetingId;
      if (!meetingId) {
        triggerNotification(lang === 'th' ? 'ไม่พบรหัสการประชุม กรุณาลองลงทะเบียนใหม่อีกครั้ง' : 'Meeting ID not found. Please register again.');
        return;
      }

      setSubmitting(true);
      try {
        const isMember = calculationResult.isMemberUser;
        const selectedActivitiesPayload = calculationResult.items.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          price: item.price,
          date: item.date,
        }));

        const res = await fetch(`/api/meetings/${meetingId}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isMember: isMember,
            memberNo: isMember ? regData?.memberNo : undefined,
            guestName: !isMember ? (regData?.nameTh || regData?.nameEn || 'Guest Attendee') : undefined,
            guestEmail: !isMember ? (regData?.email || 'guest@tsrm.org') : undefined,
            guestPhone: undefined,
            guestWorkplace: !isMember ? (regData?.workplace || null) : undefined,
            amount: calculationResult.totalAmount,
            bank: systemSettings.bank_name,
            slipUrl: uploadedSlipData.fileUrl,
            selectedActivities: selectedActivitiesPayload,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit conference registration');
        }

        // Successfully registered
        try {
          localStorage.removeItem('conference_registration');
        } catch (e) {}

        setShowSuccessModal(true);
      } catch (err: any) {
        console.error('Registration submission error:', err);
        triggerNotification(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการลงทะเบียน' : 'Failed to submit registration. Please try again.'));
      } finally {
        setSubmitting(false);
      }
    } else {
      // Membership payment
      try {
        localStorage.removeItem('membership_registration');
        localStorage.removeItem('tsrm_user');
        localStorage.removeItem('thaisrm_user');
      } catch (e) {}
      setShowSuccessModal(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.push('/login');
  };

  const totalAmountValue = paymentType === 'registration'
    ? calculationResult.totalAmount
    : systemSettings.annual_membership_fee;

  const amountDueText = lang === 'th'
    ? `จำนวน ${totalAmountValue.toLocaleString()} บาท`
    : `Amount: ${totalAmountValue.toLocaleString()} THB`;

  const successModalTitle = paymentType === 'registration'
    ? (t.successModal as any).paymentSuccessTitle || (lang === 'th' ? 'ลงทะเบียนเข้าร่วมงานประชุมสำเร็จ' : 'Conference Registration Submitted')
    : (t.successModal as any).membershipSuccessTitle || t.successModal.loginTitle || t.successModal.title;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title={successModalTitle}
      />

      <main className="w-full min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <PaymentView
          paymentType={paymentType}
          customAmount={paymentType === 'registration' ? calculationResult.totalAmount : undefined}
          isMember={paymentType === 'registration' ? calculationResult.isMemberUser : true}
          attendeeName={paymentType === 'registration' ? (regData?.nameTh || regData?.nameEn) : undefined}
          attendeePosition={paymentType === 'registration' ? regData?.position : undefined}
          attendeeWorkplace={paymentType === 'registration' ? regData?.workplace : undefined}
          attendeeMemberNo={paymentType === 'registration' ? regData?.memberNo : undefined}
          isExpiredMember={regData?.isExpiredMember}
          attendanceType={calculationResult.attendType}
          itemizedActivities={calculationResult.items}
          submitting={submitting}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onCopyBank={handleCopyBank}
          copiedBank={copiedBank}
          bankAccount={bankAccountNumber}
          uploadedSlipData={uploadedSlipData}
          onRemoveSlip={handleRemoveSlip}
          onConfirmPayment={handleConfirmPayment}
        />
      </main>

      <SlipUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleSlipUploadSuccess}
        bankAccount={bankAccountNumber}
        bankName={systemSettings.bank_name}
        amountDueText={amountDueText}
      />
    </div>
  );
}


export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
