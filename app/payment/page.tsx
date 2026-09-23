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
    isGroup?: boolean;
    companyName?: string;
    groupContact?: {
      coordinatorName: string;
      coordinatorEmail: string;
      coordinatorPhone: string;
      coordinatorTaxId?: string;
    };
    attendees?: any[];
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
    couponData?: {
      code: string;
      companyName: string;
      discountType: string;
      discountValue: number;
      isFullFree: boolean;
      discountAmount: number;
    };
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

  const [membershipRegData, setMembershipRegData] = useState<any>(null);

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
    } else {
      try {
        const saved = localStorage.getItem('membership_registration');
        if (saved) {
          const parsed = JSON.parse(saved);
          setMembershipRegData(parsed);
        }
      } catch (err) {
        console.error('Failed to parse membership_registration from localStorage', err);
      }
    }
  }, [paymentType]);

  // Dynamic Pricing Calculation (Main Program uses Participant pricing + Workshops + Coupon deduction)
  const calculationResult = React.useMemo(() => {
    if (paymentType !== 'registration' || !regData) {
      if (membershipRegData?.isGroup) {
        const applicants = membershipRegData.applicants || [];
        const feePerPerson = systemSettings.annual_membership_fee;
        const total = applicants.length * feePerPerson;
        const groupList = applicants.map((app: any) => ({
          name: app.full_name_th || app.full_name_en || 'ผู้สมัคร',
          email: app.email,
          position: app.position || app.job_category,
          workplace: app.workplace || membershipRegData.companyName,
          price: feePerPerson,
          isMember: false,
          details: `ค่าบำรุงสมาชิกรายปี (${app.email || ''})`,
        }));
        return {
          originalAmount: total,
          totalAmount: total,
          discountAmount: 0,
          isCouponSponsored: false,
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
          isMemberUser: false,
          attendType: 'onsite' as const,
          groupSummary: groupList,
        };
      }

      return {
        originalAmount: systemSettings.annual_membership_fee,
        totalAmount: systemSettings.annual_membership_fee,
        discountAmount: 0,
        isCouponSponsored: false,
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
        groupSummary: [] as Array<{
          name: string;
          email?: string;
          position?: string;
          workplace?: string;
          price: number;
          isMember?: boolean;
          details?: string;
        }>,
      };
    }

    // Check if Corporate / Group Conference Registration
    if (regData.isGroup && (regData as any).attendees) {
      const attendees = (regData as any).attendees as any[];
      const pricingTiers = regData.pricingTiers;
      const basePrice = regData.basePrice ?? 0;
      const allActivities = regData.selectedActivities || regData.activities || [];

      let groupTotal = 0;
      const groupList = attendees.map((att: any) => {
        const isMem = Boolean(att.isMember) && !att.isExpiredMember && Boolean(att.memberNo?.trim());
        const attType = (att.attendanceType === 'online' && isMem) ? 'online' : 'onsite';
        
        let personTotal = 0;
        let mainPrice = 0;
        if (attType === 'online') {
          mainPrice = isMem
            ? (pricingTiers?.participant?.onlineMember ?? basePrice ?? 3500)
            : (pricingTiers?.participant?.onlineNonMember ?? (basePrice ? basePrice + 1000 : 4500));
        } else {
          mainPrice = isMem
            ? (pricingTiers?.participant?.onsiteMember ?? basePrice ?? 3500)
            : (pricingTiers?.participant?.onsiteNonMember ?? (basePrice ? basePrice + 1000 : 4500));
        }
        personTotal += mainPrice;

        const selWorkshops = (att.selectedWorkshops || []) as string[];
        if (selWorkshops.length > 0 && allActivities.length > 0) {
          allActivities.filter((a: any) => selWorkshops.includes(a.id)).forEach((ws: any) => {
            const mPrice = typeof ws.memberPrice === 'number' ? ws.memberPrice : 0;
            const nonMPrice = typeof ws.nonMemberPrice === 'number' ? ws.nonMemberPrice : mPrice;
            personTotal += isMem ? mPrice : nonMPrice;
          });
        }

        groupTotal += personTotal;
        return {
          name: att.nameTh || att.nameEn || 'ผู้ลงทะเบียน',
          email: att.email,
          position: att.position,
          workplace: att.workplace || (regData as any).companyName,
          price: personTotal,
          isMember: isMem,
          attendanceType: attType,
          details: `${attType === 'online' ? '💻 Online' : '🏢 Onsite'}${selWorkshops.length > 0 ? ` + ${selWorkshops.length} เวิร์กช็อป` : ''}`,
        };
      });

      return {
        originalAmount: groupTotal,
        totalAmount: groupTotal,
        discountAmount: 0,
        isCouponSponsored: false,
        items: [] as any[],
        isMemberUser: false,
        attendType: 'onsite' as const,
        groupSummary: groupList,
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

    const originalAmount = items.reduce((sum, item) => sum + item.price, 0);

    // Coupon Calculation
    let discountAmount = 0;
    let isCouponSponsored = false;

    if (regData.couponData) {
      if (regData.couponData.isFullFree || regData.couponData.discountType === 'free') {
        discountAmount = originalAmount;
        isCouponSponsored = true;
      } else if (regData.couponData.discountType === 'fixed') {
        discountAmount = Math.min(originalAmount, regData.couponData.discountValue || 0);
        isCouponSponsored = discountAmount >= originalAmount;
      } else if (regData.couponData.discountType === 'percent') {
        const pct = Math.min(100, Math.max(0, regData.couponData.discountValue || 0));
        discountAmount = Math.round((originalAmount * pct) / 100);
        isCouponSponsored = pct === 100 || discountAmount >= originalAmount;
      }
    }

    const totalAmount = Math.max(0, originalAmount - discountAmount);

    return {
      originalAmount,
      totalAmount,
      discountAmount,
      isCouponSponsored,
      items,
      isMemberUser,
      attendType,
      groupSummary: [] as Array<{
        name: string;
        email?: string;
        position?: string;
        workplace?: string;
        price: number;
        isMember?: boolean;
        details?: string;
      }>,
    };
  }, [paymentType, regData, membershipRegData, systemSettings]);

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
    const isFreeOrSponsored = calculationResult.isCouponSponsored || calculationResult.totalAmount === 0;

    if (!isFreeOrSponsored && !uploadedSlipData) {
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
        if ((regData as any)?.isGroup) {
          // Group Conference Registration Submission
          const res = await fetch(`/api/meetings/${meetingId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isGroup: true,
              companyName: (regData as any).companyName,
              groupContact: (regData as any).groupContact,
              attendees: (regData as any).attendees,
              amount: calculationResult.totalAmount,
              originalAmount: calculationResult.originalAmount,
              bank: systemSettings.bank_name,
              slipUrl: uploadedSlipData?.fileUrl || '',
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to submit group conference registration');
          }
        } else {
          // Individual Conference Registration Submission
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
              originalAmount: calculationResult.originalAmount,
              couponCode: regData?.couponData?.code || undefined,
              bank: isFreeOrSponsored ? `สิทธิ์สปอนเซอร์: ${regData?.couponData?.companyName || 'Corporate Pass'}` : systemSettings.bank_name,
              slipUrl: uploadedSlipData?.fileUrl || (isFreeOrSponsored ? `SPONSORED:${regData?.couponData?.companyName || 'COUPON'}` : undefined),
              selectedActivities: selectedActivitiesPayload,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to submit conference registration');
          }
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
      // Membership payment with Slip Upload (Wait for Admin Approval before DB insert)
      if (!membershipRegData) {
        triggerNotification(lang === 'th' ? 'ไม่พบข้อมูลการสมัครสมาชิก กรุณากรอกใบสมัครใหม่อีกครั้ง' : 'Registration data not found. Please fill out the form again.');
        router.push('/signup');
        return;
      }

      setSubmitting(true);
      try {
        const isGroupMembership = Boolean(membershipRegData.isGroup);
        const res = await fetch('/api/members/register-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isGroup: isGroupMembership,
            companyName: membershipRegData.companyName,
            groupContact: membershipRegData.groupContact,
            applicants: membershipRegData.applicants,
            memberPayload: isGroupMembership ? undefined : membershipRegData,
            amount: calculationResult.totalAmount,
            bank: systemSettings.bank_name,
            slipUrl: uploadedSlipData?.fileUrl || '',
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (lang === 'th' ? 'ไม่สามารถส่งใบสมัครและหลักฐานได้ กรุณาลองใหม่อีกครั้ง' : 'Failed to submit application and slip.'));
        }

        // Clean up draft localStorage
        try {
          localStorage.removeItem('membership_registration');
          localStorage.removeItem('tsrm_user');
          localStorage.removeItem('thaisrm_user');
        } catch (e) {}

        setShowSuccessModal(true);
      } catch (err: any) {
        console.error('Membership slip submission error:', err);
        triggerNotification(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการส่งใบสมัครและหลักฐาน' : 'Submission failed. Please try again.'));
      } finally {
        setSubmitting(false);
      }
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
    ? (calculationResult.isCouponSponsored
        ? (lang === 'th' ? 'ลงทะเบียนด้วยสิทธิ์คูปองสปอนเซอร์สำเร็จ' : 'Sponsor Registration Confirmed')
        : (t.successModal as any).paymentSuccessTitle || (lang === 'th' ? 'ลงทะเบียนเข้าร่วมงานประชุมสำเร็จ' : 'Conference Registration Submitted'))
    : (lang === 'th' ? 'ส่งใบสมัครและหลักฐานการชำระเงินเรียบร้อยแล้ว' : 'Membership Application & Slip Submitted');


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
          customAmount={calculationResult.totalAmount}
          isGroup={Boolean(paymentType === 'registration' ? regData?.isGroup : membershipRegData?.isGroup)}
          companyName={paymentType === 'registration' ? regData?.companyName : membershipRegData?.companyName}
          groupAttendees={calculationResult.groupSummary}
          isMember={paymentType === 'registration' ? calculationResult.isMemberUser : true}
          attendeeName={paymentType === 'registration' ? (regData?.nameTh || regData?.nameEn) : (membershipRegData?.full_name_th || membershipRegData?.full_name_en)}
          attendeePosition={paymentType === 'registration' ? regData?.position : (membershipRegData?.position || membershipRegData?.job_category)}
          attendeeWorkplace={paymentType === 'registration' ? regData?.workplace : membershipRegData?.workplace}
          attendeeMemberNo={paymentType === 'registration' ? regData?.memberNo : undefined}
          isExpiredMember={regData?.isExpiredMember}
          attendanceType={calculationResult.attendType}
          itemizedActivities={calculationResult.items}
          isCouponSponsored={calculationResult.isCouponSponsored}
          sponsorCompanyName={regData?.couponData?.companyName}
          couponCode={regData?.couponData?.code}
          discountAmount={calculationResult.discountAmount}
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
