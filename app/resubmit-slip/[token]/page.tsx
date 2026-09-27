'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { TsrmLogo } from '@/components/TsrmLogo';
import { uploadImageToStorage } from '@/lib/blobUpload';
import { POSITION_CATEGORY_OPTIONS, normalizePosition } from '@/components/PositionSelect';
import {
  MembershipResubmitForm,
  MembershipFormData,
} from '@/components/resubmit/MembershipResubmitForm';
import {
  ConferenceResubmitForm,
  ConferenceFormData,
} from '@/components/resubmit/ConferenceResubmitForm';
import {
  CorporateResubmitForm,
  CorporateFormData,
} from '@/components/resubmit/CorporateResubmitForm';
import { SharedSlipResubmitSection } from '@/components/resubmit/SharedSlipResubmitSection';

interface ResubmitPageProps {
  params: Promise<{ token: string }>;
}

export default function ResubmitSlipPage({ params }: ResubmitPageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slipData, setSlipData] = useState<{
    slipId: string;
    meetingName: string;
    applicantName: string;
    nameTh?: string;
    nameEn?: string;
    email?: string;
    phone?: string;
    workplace?: string;
    position?: string;
    address?: string;
    jobCategory?: string;
    isMember?: boolean;
    isMembershipRegistration?: boolean;
    isGroup?: boolean;
    isCorporate?: boolean;
    companyName?: string;
    amount: number;
    bank?: string;
    transferDate?: string;
    transferTime?: string;
    refNo?: string;
    rejectionReason: string;
    rejectType?: 'info' | 'slip';
    status: string;
    oldSlipUrl: string;
    ticketCode: string;
    couponCode?: string | null;
    couponInfo?: any;
    discountTotal?: number;
    memberPayload?: any;
    groupPayload?: any;
  } | null>(null);

  // 1. Membership form state
  const [membershipData, setMembershipData] = useState<MembershipFormData>({
    nameTh: '',
    nameEn: '',
    id4Digits: '',
    mobile: '',
    email: '',
    workplace: '',
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
  });

  // 2. Conference form state
  const [conferenceData, setConferenceData] = useState<ConferenceFormData>({
    nameTh: '',
    nameEn: '',
    email: '',
    phone: '',
    workplace: '',
    position: '',
    positionOther: '',
  });

  // 3. Corporate form state
  const [corporateData, setCorporateData] = useState<CorporateFormData>({
    companyName: '',
    coordinatorEmail: '',
    coordinatorPhone: '',
    isMembershipGroup: false,
    applicants: [],
    attendees: [],
    activePersonIndex: 0,
  });

  // Shared slip state
  const [newSlipFile, setNewSlipFile] = useState<File | null>(null);
  const [newSlipUrl, setNewSlipUrl] = useState<string | null>(null);
  const [newSlipName, setNewSlipName] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchSlipDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payment/resubmit?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setSlipData(d);

          const rawPos = d.memberPayload?.position || d.position || '';
          const normalized = normalizePosition(rawPos);
          let resolvedPos = '';
          let resolvedPosOther = '';
          if (POSITION_CATEGORY_OPTIONS.some((o) => o.value === normalized)) {
            resolvedPos = normalized;
            resolvedPosOther = '';
          } else if (rawPos) {
            resolvedPos = '0 อื่นๆ';
            resolvedPosOther = rawPos;
          }

          // 1. Populate Single Membership Data
          if (d.isMembershipRegistration || d.memberPayload) {
            const mp = d.memberPayload || {};
            setMembershipData({
              nameTh: mp.full_name_th || d.nameTh || d.applicantName || '',
              nameEn: mp.full_name_en || d.nameEn || '',
              id4Digits: mp.id_last4 || mp.idLast4 || mp.id4Digits || '',
              mobile: mp.mobile || d.phone || '',
              email: mp.email || d.email || '',
              workplace: mp.workplace || d.workplace || '',
              startDate: mp.start_date || '',
              position: resolvedPos,
              positionOther: mp.positionOther || mp.member_type_other || resolvedPosOther,
              scientistNo: mp.scientist_reg_no || mp.scientistNo || '',
              referees: mp.referees || '',
              address: mp.address || d.address || '',
              educations: Array.isArray(mp.educations) && mp.educations.length > 0
                ? mp.educations
                : [{ id: '1', degree: '', institution: '', year: '' }],
              photoPreview: mp.photo_path || mp.photo_url || null,
              selectedPhotoFile: null,
              degreeCertPreview: mp.degree_cert_doc || null,
              selectedDegreeCertFile: null,
              workCertPreview: mp.work_cert_doc || null,
              selectedWorkCertFile: null,
            });
          }

          // 2. Populate Single Conference Data
          setConferenceData({
            nameTh: d.nameTh || d.applicantName || '',
            nameEn: d.nameEn || '',
            email: d.email || '',
            phone: d.phone || '',
            workplace: d.workplace || '',
            position: resolvedPos,
            positionOther: resolvedPosOther,
          });

          // 3. Populate Corporate / Group Roster Data
          let initialApplicants: MembershipFormData[] = [];
          if (Array.isArray(d.groupPayload?.applicants) && d.groupPayload.applicants.length > 0) {
            initialApplicants = d.groupPayload.applicants.map((app: any, idx: number) => {
              const appRawPos = app.position || '';
              const appNormPos = normalizePosition(appRawPos);
              let appResPos = '';
              let appResPosOther = '';
              if (POSITION_CATEGORY_OPTIONS.some((o) => o.value === appNormPos)) {
                appResPos = appNormPos;
              } else if (appRawPos) {
                appResPos = '0 อื่นๆ';
                appResPosOther = appRawPos;
              }

              return {
                nameTh: app.full_name_th || app.nameTh || '',
                nameEn: app.full_name_en || app.nameEn || '',
                id4Digits: app.id_last4 || app.idLast4 || app.id4Digits || '',
                mobile: app.mobile || app.phone || '',
                email: app.email || '',
                workplace: app.workplace || d.companyName || d.workplace || '',
                startDate: app.start_date || app.startDate || '',
                position: appResPos,
                positionOther: app.member_type_other || app.positionOther || appResPosOther,
                scientistNo: app.scientist_reg_no || app.scientistNo || '',
                referees: app.referees || '',
                address: app.address || '',
                educations: Array.isArray(app.educations) && app.educations.length > 0
                  ? app.educations.map((e: any, eIdx: number) => ({
                      id: String(e.id || e.edu_id || eIdx + 1),
                      degree: e.degree || '',
                      institution: e.institution || '',
                      year: e.graduation_year || e.year ? String(e.graduation_year || e.year) : '',
                    }))
                  : [{ id: '1', degree: '', institution: '', year: '' }],
                photoPreview: app.photo_path || app.photo_url || app.photoPreview || null,
                selectedPhotoFile: null,
                degreeCertPreview: app.degree_cert_doc || app.degreeCertPreview || null,
                selectedDegreeCertFile: null,
                workCertPreview: app.work_cert_doc || app.workCertPreview || null,
                selectedWorkCertFile: null,
              };
            });
          }

          let initialAttendees: ConferenceFormData[] = [];
          if (Array.isArray(d.groupPayload?.attendees) && d.groupPayload.attendees.length > 0) {
            initialAttendees = d.groupPayload.attendees.map((att: any) => {
              const attRawPos = att.position || '';
              const attNormPos = normalizePosition(attRawPos);
              let attResPos = '';
              let attResPosOther = '';
              if (POSITION_CATEGORY_OPTIONS.some((o) => o.value === attNormPos)) {
                attResPos = attNormPos;
              } else if (attRawPos) {
                attResPos = '0 อื่นๆ';
                attResPosOther = attRawPos;
              }

              return {
                nameTh: att.nameTh || att.fullNameTh || '',
                nameEn: att.nameEn || att.fullNameEn || '',
                email: att.email || '',
                phone: att.phone || att.mobile || '',
                workplace: att.workplace || d.companyName || d.workplace || '',
                position: attResPos,
                positionOther: att.positionOther || attResPosOther,
              };
            });
          }

          const isMemGroup = Boolean(
            d.isMembershipRegistration ||
            (d.ticketCode && d.ticketCode.startsWith('MEMGRP')) ||
            initialApplicants.length > 0
          );

          setCorporateData({
            companyName: d.groupPayload?.companyName || d.companyName || d.workplace || '',
            coordinatorEmail: d.groupPayload?.groupContact?.coordinatorEmail || d.email || '',
            coordinatorPhone: d.groupPayload?.groupContact?.coordinatorPhone || d.phone || '',
            isMembershipGroup: isMemGroup,
            applicants:
              initialApplicants.length > 0
                ? initialApplicants
                : [
                    {
                      nameTh: d.nameTh || d.applicantName || '',
                      nameEn: d.nameEn || '',
                      id4Digits: '',
                      mobile: d.phone || '',
                      email: d.email || '',
                      workplace: d.companyName || d.workplace || '',
                      startDate: '',
                      position: resolvedPos,
                      positionOther: resolvedPosOther,
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
                    },
                  ],
            attendees:
              initialAttendees.length > 0
                ? initialAttendees
                : [
                    {
                      nameTh: d.nameTh || d.applicantName || '',
                      nameEn: d.nameEn || '',
                      email: d.email || '',
                      phone: d.phone || '',
                      workplace: d.companyName || d.workplace || '',
                      position: resolvedPos,
                      positionOther: resolvedPosOther,
                    },
                  ],
            activePersonIndex: 0,
          });
        } else {
          setError(json.error || 'ไม่พบข้อมูลหรือลิงก์หมดอายุแล้ว');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchSlipDetails();
    }
  }, [token]);

  const handleMembershipChange = <K extends keyof MembershipFormData>(
    field: K,
    value: MembershipFormData[K]
  ) => {
    setMembershipData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConferenceChange = <K extends keyof ConferenceFormData>(
    field: K,
    value: ConferenceFormData[K]
  ) => {
    setConferenceData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCorporateChange = <K extends keyof CorporateFormData>(
    field: K,
    value: CorporateFormData[K]
  ) => {
    setCorporateData((prev) => ({ ...prev, [field]: value }));
  };

  const isInfoMode =
    slipData?.rejectType === 'info' ||
    (slipData?.rejectionReason?.includes('ข้อมูล') && !slipData?.rejectionReason?.includes('สลิป'));
  const isSlipMode =
    slipData?.rejectType === 'slip' ||
    (!isInfoMode && slipData?.rejectionReason?.includes('สลิป'));

  const handleConfirmResubmit = async () => {
    if (!slipData) return;

    // Validation
    if (isInfoMode) {
      if (slipData.isCorporate || slipData.isGroup) {
        if (corporateData.isMembershipGroup) {
          for (let i = 0; i < corporateData.applicants.length; i++) {
            const app = corporateData.applicants[i];
            if (!app.nameTh.trim()) {
              alert(`กรุณากรอกชื่อ-นามสกุล ภาษาไทย ของผู้สมัครคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
            if (!app.email.trim()) {
              alert(`กรุณากรอกอีเมล ของผู้สมัครคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
            if (!app.mobile.trim()) {
              alert(`กรุณากรอกเบอร์โทรศัพท์ ของผู้สมัครคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
            if (!app.workplace.trim()) {
              alert(`กรุณากรอกสถานที่ทำงาน ของผู้สมัครคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
          }
        } else {
          for (let i = 0; i < corporateData.attendees.length; i++) {
            const att = corporateData.attendees[i];
            if (!att.nameTh.trim()) {
              alert(`กรุณากรอกชื่อ-นามสกุล ของผู้เข้าร่วมคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
            if (!att.email.trim()) {
              alert(`กรุณากรอกอีเมล ของผู้เข้าร่วมคนที่ ${i + 1}`);
              handleCorporateChange('activePersonIndex', i);
              return;
            }
          }
        }
      } else if (slipData.isMembershipRegistration) {
        if (!membershipData.nameTh.trim()) {
          alert('กรุณากรอกชื่อ-นามสกุล ภาษาไทย');
          return;
        }
        if (!membershipData.email.trim()) {
          alert('กรุณากรอกอีเมล');
          return;
        }
        if (!membershipData.mobile.trim()) {
          alert('กรุณากรอกเบอร์โทรศัพท์มือถือ');
          return;
        }
        if (!membershipData.workplace.trim()) {
          alert('กรุณากรอกหน่วยงาน / โรงพยาบาล / สถานที่ทำงาน');
          return;
        }
      } else {
        if (!conferenceData.nameTh.trim()) {
          alert('กรุณากรอกชื่อ-นามสกุล ภาษาไทย');
          return;
        }
        if (!conferenceData.email.trim()) {
          alert('กรุณากรอกอีเมล');
          return;
        }
        if (!conferenceData.workplace.trim()) {
          alert('กรุณากรอกหน่วยงาน / โรงพยาบาล / สถานที่ทำงาน');
          return;
        }
      }
    } else if (isSlipMode) {
      if (!newSlipUrl && !newSlipFile) {
        alert('กรุณาแนบรูปภาพสลิปหลักฐานการชำระเงินใหม่');
        return;
      }
    }

    try {
      setSubmitting(true);

      // 1. Upload new slip if picked
      let finalSlipUrl = slipData.oldSlipUrl;
      if (newSlipFile) {
        const uploadResult = await uploadImageToStorage(newSlipFile, 'slips');
        finalSlipUrl = uploadResult.url;
      } else if (newSlipUrl) {
        finalSlipUrl = newSlipUrl;
      }

      // 2. Prepare payload according to registration type
      let payloadToSend: any = {
        token,
        slipUrl: finalSlipUrl,
        transferDate: new Date().toLocaleDateString('th-TH'),
        transferTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };

      if (slipData.isCorporate || slipData.isGroup) {
        let processedApplicants: any[] = [];
        if (corporateData.isMembershipGroup) {
          processedApplicants = await Promise.all(
            corporateData.applicants.map(async (app) => {
              let photoUrl = app.photoPreview;
              if (app.selectedPhotoFile) {
                try {
                  const uploadRes = await uploadImageToStorage(app.selectedPhotoFile, 'avatars');
                  photoUrl = uploadRes.url;
                } catch (e) {
                  console.warn('Photo upload failed:', e);
                }
              }

              let degreeUrl = app.degreeCertPreview;
              if (app.selectedDegreeCertFile) {
                try {
                  const uploadRes = await uploadImageToStorage(app.selectedDegreeCertFile, 'documents');
                  degreeUrl = uploadRes.url;
                } catch (e) {
                  console.warn('Degree cert upload failed:', e);
                }
              }

              let workUrl = app.workCertPreview;
              if (app.selectedWorkCertFile) {
                try {
                  const uploadRes = await uploadImageToStorage(app.selectedWorkCertFile, 'documents');
                  workUrl = uploadRes.url;
                } catch (e) {
                  console.warn('Work cert upload failed:', e);
                }
              }

              const finalPos =
                app.position === '0 อื่นๆ' || app.position === 'อื่นๆ'
                  ? app.positionOther.trim()
                  : app.position.trim() || app.positionOther.trim();

              return {
                full_name_th: app.nameTh.trim(),
                full_name_en: app.nameEn.trim() || null,
                id_last4: app.id4Digits.trim() || null,
                mobile: app.mobile.trim(),
                email: app.email.trim(),
                workplace: app.workplace.trim() || corporateData.companyName.trim(),
                start_date: app.startDate || null,
                position: finalPos,
                job_category: app.position,
                member_type_other: app.positionOther.trim() || null,
                scientist_reg_no: app.scientistNo.trim() || null,
                referees: app.referees.trim() || null,
                address: app.address.trim() || null,
                photo_path: photoUrl,
                degree_cert_doc: degreeUrl,
                work_cert_doc: workUrl,
                membership_type: 'Regular',
                membership_status: 'Active',
                educations: app.educations
                  .filter((edu) => edu.degree.trim() !== '' || edu.institution.trim() !== '')
                  .map((edu, idx) => ({
                    degree: edu.degree.trim(),
                    institution: edu.institution.trim(),
                    graduation_year: edu.year.trim() ? parseInt(edu.year.trim(), 10) : null,
                    display_order: idx + 1,
                  })),
              };
            })
          );
        }

        const processedAttendees = corporateData.attendees.map((att) => {
          const finalPos =
            att.position === '0 อื่นๆ' || att.position === 'อื่นๆ'
              ? att.positionOther.trim()
              : att.position.trim() || att.positionOther.trim();

          return {
            nameTh: att.nameTh.trim(),
            nameEn: att.nameEn?.trim() || null,
            email: att.email.trim(),
            phone: att.phone.trim(),
            workplace: att.workplace.trim() || corporateData.companyName.trim(),
            position: finalPos,
            positionOther: att.positionOther?.trim() || null,
          };
        });

        const customGroupPayload = {
          isGroup: true,
          type: corporateData.isMembershipGroup
            ? 'membership_group_registration'
            : 'conference_group_registration',
          companyName: corporateData.companyName.trim(),
          groupContact: {
            coordinatorName: corporateData.companyName.trim(),
            coordinatorEmail: corporateData.coordinatorEmail.trim(),
            coordinatorPhone: corporateData.coordinatorPhone.trim(),
          },
          applicants: corporateData.isMembershipGroup ? processedApplicants : [],
          attendees: !corporateData.isMembershipGroup ? processedAttendees : [],
          totalAmount: slipData.groupPayload?.totalAmount || slipData.amount,
          submittedAt: new Date().toISOString(),
        };

        payloadToSend = {
          ...payloadToSend,
          nameTh: corporateData.companyName.trim() || slipData.companyName || 'Corporate Group',
          email: corporateData.coordinatorEmail.trim() || slipData.email || '',
          phone: corporateData.coordinatorPhone.trim() || slipData.phone || '',
          workplace: corporateData.companyName.trim() || slipData.companyName || 'Corporate Group',
          groupPayload: customGroupPayload,
          customGroupPayload,
        };
      } else if (slipData.isMembershipRegistration) {
        // Upload photo/docs if newly selected
        let finalPhotoUrl = membershipData.photoPreview;
        if (membershipData.selectedPhotoFile) {
          try {
            const uploadRes = await uploadImageToStorage(membershipData.selectedPhotoFile, 'avatars');
            finalPhotoUrl = uploadRes.url;
          } catch (e) {
            console.warn('Photo upload failed:', e);
          }
        }

        let finalDegreeCertUrl = membershipData.degreeCertPreview;
        if (membershipData.selectedDegreeCertFile) {
          try {
            const uploadRes = await uploadImageToStorage(membershipData.selectedDegreeCertFile, 'documents');
            finalDegreeCertUrl = uploadRes.url;
          } catch (e) {
            console.warn('Degree cert upload failed:', e);
          }
        }

        let finalWorkCertUrl = membershipData.workCertPreview;
        if (membershipData.selectedWorkCertFile) {
          try {
            const uploadRes = await uploadImageToStorage(membershipData.selectedWorkCertFile, 'documents');
            finalWorkCertUrl = uploadRes.url;
          } catch (e) {
            console.warn('Work cert upload failed:', e);
          }
        }

        const finalPosition =
          membershipData.position === '0 อื่นๆ' || membershipData.position === 'อื่นๆ'
            ? membershipData.positionOther.trim()
            : membershipData.position.trim() || membershipData.positionOther.trim();

        const memberPayload = {
          full_name_th: membershipData.nameTh.trim(),
          full_name_en: membershipData.nameEn.trim() || null,
          id_last4: membershipData.id4Digits.trim() || null,
          mobile: membershipData.mobile.trim() || null,
          email: membershipData.email.trim() || null,
          workplace: membershipData.workplace.trim() || null,
          start_date: membershipData.startDate || null,
          position: finalPosition,
          job_category: membershipData.position,
          member_type_other: membershipData.positionOther.trim() || null,
          scientist_reg_no: membershipData.scientistNo.trim() || null,
          referees: membershipData.referees.trim() || null,
          address: membershipData.address.trim() || null,
          photo_path: finalPhotoUrl,
          degree_cert_doc: finalDegreeCertUrl,
          work_cert_doc: finalWorkCertUrl,
          membership_type: 'Regular',
          membership_status: 'Active',
          educations: membershipData.educations
            .filter((edu) => edu.degree.trim() !== '' || edu.institution.trim() !== '')
            .map((edu, idx) => ({
              degree: edu.degree.trim(),
              institution: edu.institution.trim(),
              graduation_year: edu.year.trim() ? parseInt(edu.year.trim(), 10) : null,
              display_order: idx + 1,
            })),
        };

        payloadToSend = {
          ...payloadToSend,
          nameTh: membershipData.nameTh.trim(),
          nameEn: membershipData.nameEn.trim(),
          email: membershipData.email.trim(),
          phone: membershipData.mobile.trim(),
          workplace: membershipData.workplace.trim(),
          position: finalPosition,
          address: membershipData.address.trim(),
          memberPayload,
          customMemberPayload: memberPayload,
        };
      } else {
        const finalPosition =
          conferenceData.position === '0 อื่นๆ' || conferenceData.position === 'อื่นๆ'
            ? conferenceData.positionOther.trim()
            : conferenceData.position.trim() || conferenceData.positionOther.trim();

        payloadToSend = {
          ...payloadToSend,
          nameTh: conferenceData.nameTh.trim(),
          nameEn: conferenceData.nameEn.trim(),
          email: conferenceData.email.trim(),
          phone: conferenceData.phone.trim(),
          workplace: conferenceData.workplace.trim(),
          position: finalPosition,
        };
      }

      const res = await fetch('/api/payment/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend),
      });

      const json = await res.json();
      if (json.success) {
        setIsSuccess(true);
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#0026b3]/30 border-t-[#0026b3] rounded-full animate-spin" />
        <p className="mt-4 text-sm font-bold text-slate-600">กำลังโหลดข้อมูลการลงทะเบียน...</p>
      </div>
    );
  }

  if (error || !slipData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'ไม่พบรายการที่ต้องแก้ไขข้อมูล หรือรายการนี้ได้รับการอนุมัติเรียบร้อยแล้ว'}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#0026b3] text-white py-3 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">บันทึกข้อมูลเรียบร้อยแล้ว</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              ระบบได้ปรับปรุงข้อมูลที่แก้ไขและส่งเข้าสู่คิวรอตรวจสอบของเจ้าหน้าที่แล้ว ท่านจะได้รับอีเมลยืนยันผลเมื่อเจ้าหน้าที่ตรวจสอบเสร็จสิ้น
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">รหัสอ้างอิง:</span>
              <span className="font-bold text-[#0026b3]">{slipData.ticketCode || slipData.slipId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">รายการ:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{slipData.meetingName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                {slipData.isCorporate ? 'บริษัท / นิติบุคคล:' : 'ชื่อผู้สมัคร:'}
              </span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">
                {slipData.isCorporate
                  ? corporateData.companyName
                  : slipData.isMembershipRegistration
                  ? membershipData.nameTh
                  : conferenceData.nameTh}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">อีเมล:</span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]">
                {slipData.isCorporate
                  ? corporateData.coordinatorEmail
                  : slipData.isMembershipRegistration
                  ? membershipData.email
                  : conferenceData.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#0026b3] text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-[#001f8f] transition shadow-md cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-5">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <TsrmLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-blue-200 block leading-tight">
                สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)
              </span>
              <h1 className="font-black text-white text-base sm:text-xl tracking-tight leading-tight mt-0.5">
                {isInfoMode
                  ? slipData.isMembershipRegistration
                    ? 'แบบฟอร์มแก้ไขข้อมูลและเอกสารการสมัครสมาชิก'
                    : 'ตรวจสอบและแก้ไขข้อมูลการลงทะเบียน'
                  : isSlipMode
                  ? 'แบบฟอร์มแนบหลักฐานสลิปการโอนเงินใหม่'
                  : 'ตรวจสอบและแก้ไขข้อมูลการลงทะเบียน'}
              </h1>
            </div>
          </div>
        </div>

        {/* Rejection Alert Box */}
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>เหตุผล / รายละเอียดที่เจ้าหน้าที่แจ้งกลับ</span>
          </div>
          <div className="text-xs sm:text-sm text-rose-950 font-bold bg-white/90 p-3.5 rounded-2xl border border-rose-200 leading-relaxed break-words whitespace-pre-wrap">
            {slipData.rejectionReason ||
              (isInfoMode ? 'ข้อมูลไม่ถูกต้อง กรุณาแก้ไขข้อมูล' : 'สลิปไม่ถูกต้อง กรุณาแนบสลิปใหม่')}
          </div>
          <p className="text-[11px] text-rose-700/80 font-medium">
            {isInfoMode
              ? '* กรุณาตรวจสอบและแก้ไขข้อมูลในแบบฟอร์มด้านล่างให้ถูกต้อง จากนั้นกดยืนยันเพื่อส่งให้เจ้าหน้าที่ตรวจสอบใหม่ (ไม่ต้องแนบหลักฐานการโอนเงินใหม่)'
              : isSlipMode
              ? '* กรุณาแนบรูปภาพหลักฐานการโอนเงินใหม่ที่มียอดเงินและรายละเอียดถูกต้องด้านล่าง'
              : '* กรุณาตรวจสอบและแก้ไขข้อมูลในฟอร์มด้านล่างให้ถูกต้อง หรือแนบหลักฐานการโอนเงินใหม่'}
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0026b3]" />
              <span>รายการลงทะเบียน</span>
            </h3>
            {slipData.ticketCode && (
              <span className="bg-blue-50 text-[#0026b3] text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 font-mono">
                {slipData.ticketCode}
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">ชื่องาน / รายการ:</span>
              <span className="font-bold text-slate-900 text-right max-w-[280px] sm:max-w-none">
                {slipData.meetingName}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">
                {slipData.isCorporate ? 'บริษัท / นิติบุคคล:' : 'ชื่อผู้ลงทะเบียน:'}
              </span>
              <span className="font-bold text-slate-900 text-right">
                {slipData.isCorporate
                  ? slipData.companyName || slipData.applicantName
                  : slipData.applicantName}
              </span>
            </div>
            {slipData.couponCode && (
              <div className="flex justify-between py-1.5 items-center">
                <span className="text-slate-500">คูปองที่ใช้:</span>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  🎟️ {slipData.couponCode}{' '}
                  {slipData.couponInfo?.discountType === 'free' ? 'สิทธิ์ฟรีเข้าร่วมประชุม' : ''}
                </span>
              </div>
            )}
            {((slipData.discountTotal && slipData.discountTotal > 0) ||
              slipData.couponInfo?.discountType === 'free' ||
              slipData.couponCode) && (
              <div className="flex justify-between py-1.5 items-center">
                <span className="text-slate-500">ส่วนลดที่ได้รับ:</span>
                <span className="font-extrabold text-emerald-700 text-xs sm:text-sm font-mono">
                  -฿{(slipData.discountTotal || 8000).toLocaleString()} THB
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-500">ยอดเงินที่ต้องชำระ:</span>
              <div className="text-right">
                {slipData.discountTotal && slipData.discountTotal > 0 ? (
                  <span className="line-through text-slate-400 text-xs font-mono mr-2">
                    ฿ {(slipData.amount + slipData.discountTotal).toLocaleString()}
                  </span>
                ) : null}
                <span className="font-extrabold text-[#0026b3] text-sm sm:text-base font-mono">
                  ฿ {slipData.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Resubmit Form based on type (Only rendered when not purely slip re-upload mode) */}
        {!isSlipMode && (
          slipData.isCorporate || slipData.isGroup ? (
            <CorporateResubmitForm
              formData={corporateData}
              onChange={handleCorporateChange}
            />
          ) : slipData.isMembershipRegistration ? (
            <MembershipResubmitForm
              formData={membershipData}
              onChange={handleMembershipChange}
            />
          ) : (
            <ConferenceResubmitForm
              formData={conferenceData}
              onChange={handleConferenceChange}
              hidePhone={Boolean(slipData.isCorporate || slipData.isGroup)}
            />
          )
        )}

        {/* Shared Proof of Payment Section & Submit Button */}
        <SharedSlipResubmitSection
          isInfoMode={Boolean(isInfoMode)}
          oldSlipUrl={slipData.oldSlipUrl}
          newSlipFile={newSlipFile}
          newSlipUrl={newSlipUrl}
          newSlipName={newSlipName}
          submitting={submitting}
          onSlipFileChange={(file, url, name) => {
            setNewSlipFile(file);
            setNewSlipUrl(url);
            setNewSlipName(name);
          }}
          onSubmit={handleConfirmResubmit}
        />
      </div>
    </div>
  );
}
