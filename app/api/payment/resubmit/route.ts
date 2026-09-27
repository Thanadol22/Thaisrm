import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Retrieve slip & rejection details by token with full registration details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const slip = await (prisma as any).payment_slips.findUnique({
      where: { resubmit_token: token },
      include: {
        members: {
          select: {
            member_no: true,
            fullNameTh: true,
            fullNameEn: true,
            idLast4: true,
            email: true,
            mobile: true,
            workplace: true,
            work_start_date: true,
            position: true,
            address: true,
            job_category: true,
            scientist_license_no: true,
            referees: true,
            photo_url: true,
            degree_cert_doc: true,
            work_cert_doc: true,
            member_educations: {
              select: {
                edu_id: true,
                degree: true,
                institution: true,
                graduation_year: true,
              },
            },
          },
        },
        meetings: {
          select: {
            meeting_name: true,
            meeting_date: true,
            location: true,
          },
        },
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการ หรือลิงก์หมดอายุแล้ว' },
        { status: 404 }
      );
    }

    let memberPayload: any = null;
    let groupPayload: any = null;
    let actObj: any = null;
    let isMembershipRegistration = false;
    let isGroup = false;
    let rejectType: 'info' | 'slip' = 'info';

    if (slip.selected_activities) {
      actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.rejectType) {
          rejectType = actObj.rejectType;
        }
        if (
          actObj.type === 'membership_group_registration' ||
          (actObj.isGroup === true && Array.isArray(actObj.applicants) && actObj.applicants.length > 0) ||
          slip.ticket_code?.startsWith('MEMGRP')
        ) {
          isGroup = true;
          isMembershipRegistration = true;
          groupPayload = actObj.groupPayload || actObj;
        } else if (
          actObj.type === 'conference_group_registration' ||
          (actObj.isGroup === true && Array.isArray(actObj.attendees) && actObj.attendees.length > 0) ||
          slip.ticket_code?.startsWith('GRP-') ||
          slip.ticket_code?.startsWith('GRP_') ||
          (Array.isArray(actObj.attendees) && actObj.attendees.length > 0 && (actObj.isGroup || actObj.companyName))
        ) {
          isGroup = true;
          isMembershipRegistration = false;
          groupPayload = actObj.groupPayload || actObj;
        } else if (actObj.type === 'membership_registration' || actObj.memberPayload) {
          isMembershipRegistration = true;
          memberPayload = actObj.memberPayload;
        }
      }
    }

    // Fallback if not stored in selected_activities:
    if (!rejectType || (rejectType !== 'info' && rejectType !== 'slip')) {
      const reason = slip.rejection_reason || '';
      rejectType = reason.includes('ข้อมูล') && !reason.includes('สลิป') ? 'info' : 'slip';
    }

    if (!groupPayload && (slip.ticket_code?.startsWith('MEM-') || slip.meeting_id === 'membership')) {
      isMembershipRegistration = true;
    }
    if (slip.ticket_code?.startsWith('MEMGRP')) {
      isGroup = true;
      isMembershipRegistration = true;
      if (!groupPayload && actObj) {
        groupPayload = actObj.groupPayload || actObj;
      }
    } else if (slip.ticket_code?.startsWith('GRP-') || slip.ticket_code?.startsWith('GRP_')) {
      isGroup = true;
      isMembershipRegistration = false;
      if (!groupPayload && actObj) {
        groupPayload = actObj.groupPayload || actObj;
      }
    }

    const isCorporate = Boolean(
      (isGroup && groupPayload) ||
      slip.ticket_code?.startsWith('MEMGRP') ||
      slip.ticket_code?.startsWith('GRP-') ||
      slip.ticket_code?.startsWith('GRP_') ||
      (groupPayload?.isGroup === true && (
        (Array.isArray(groupPayload?.attendees) && groupPayload.attendees.length > 0) ||
        (Array.isArray(groupPayload?.applicants) && groupPayload.applicants.length > 0)
      )) ||
      Boolean(slip.guest_name?.includes('ท่าน') && (slip.ticket_code?.startsWith('GRP') || slip.ticket_code?.startsWith('MEMGRP')))
    );

    let companyName = '';
    if (isCorporate) {
      companyName = groupPayload?.companyName || slip.guest_workplace || (slip.guest_name ? slip.guest_name.replace(/\s*\(\d+\s*ท่าน\)/, '') : '');
    }

    // Try finding matched member if guest email exists and slip.members is null
    let matchedMember = slip.members;
    if (!matchedMember && (slip.guest_email || slip.member_no)) {
      try {
        matchedMember = await prisma.member.findFirst({
          where: {
            OR: [
              ...(slip.member_no ? [{ member_no: slip.member_no }] : []),
              ...(slip.guest_email ? [{ email: { equals: slip.guest_email.trim(), mode: 'insensitive' as const } }] : []),
            ],
          },
          select: {
            member_no: true,
            fullNameTh: true,
            fullNameEn: true,
            idLast4: true,
            email: true,
            mobile: true,
            workplace: true,
            work_start_date: true,
            position: true,
            address: true,
            job_category: true,
            scientist_license_no: true,
            referees: true,
            photo_url: true,
            degree_cert_doc: true,
            work_cert_doc: true,
            member_educations: {
              select: {
                edu_id: true,
                degree: true,
                institution: true,
                graduation_year: true,
              },
            },
          },
        });
      } catch { }
    }

    const attendeesList = groupPayload?.attendees || groupPayload?.applicants || actObj?.attendees || [];
    const attendeeEmails = new Set<string>();
    if (Array.isArray(attendeesList)) {
      for (const a of attendeesList) {
        const em = (a.email || a.attendee_email)?.trim()?.toLowerCase();
        if (em) attendeeEmails.add(em);
      }
    }
    if (slip.members?.email) {
      attendeeEmails.add(slip.members.email.trim().toLowerCase());
    }

    let coordinatorName = groupPayload?.groupContact?.coordinatorName || '';
    let coordinatorEmail = groupPayload?.groupContact?.coordinatorEmail || '';
    let coordinatorPhone = groupPayload?.groupContact?.coordinatorPhone || '';

    if (coordinatorEmail && attendeeEmails.has(coordinatorEmail.trim().toLowerCase())) {
      coordinatorEmail = '';
    }

    if (!coordinatorEmail && slip.guest_email && !attendeeEmails.has(slip.guest_email.trim().toLowerCase())) {
      coordinatorEmail = slip.guest_email.trim();
    }

    if (isCorporate && !coordinatorEmail && companyName) {
      try {
        const sp = await (prisma as any).sponsors.findFirst({
          where: { name: { equals: companyName.trim(), mode: 'insensitive' } },
          select: { contact_email: true, contact_name: true },
        });
        if (sp?.contact_email && !attendeeEmails.has(sp.contact_email.trim().toLowerCase())) {
          coordinatorEmail = sp.contact_email.trim();
          coordinatorName = coordinatorName || sp.contact_name || companyName;
        }
      } catch { }
    }

    const nameTh = isCorporate
      ? companyName || slip.guest_name || ''
      : (slip.is_member
        ? slip.members?.fullNameTh || matchedMember?.fullNameTh || actObj?.nameTh || actObj?.fullNameTh || actObj?.attendees?.[0]?.nameTh || actObj?.attendees?.[0]?.fullNameTh || ''
        : (slip.guest_name && !slip.guest_name.includes('ท่าน') ? slip.guest_name : '') || actObj?.nameTh || actObj?.fullNameTh || actObj?.attendees?.[0]?.nameTh || actObj?.attendees?.[0]?.fullNameTh || memberPayload?.full_name_th || matchedMember?.fullNameTh || slip.guest_name || '');

    const nameEn = isCorporate
      ? ''
      : (slip.is_member
        ? slip.members?.fullNameEn || matchedMember?.fullNameEn || actObj?.nameEn || actObj?.fullNameEn || actObj?.attendees?.[0]?.nameEn || actObj?.attendees?.[0]?.fullNameEn || ''
        : actObj?.nameEn || actObj?.fullNameEn || actObj?.attendees?.[0]?.nameEn || actObj?.attendees?.[0]?.fullNameEn || groupPayload?.attendees?.[0]?.nameEn || memberPayload?.full_name_en || matchedMember?.fullNameEn || '');

    const email = isCorporate
      ? (coordinatorEmail || slip.guest_email || '')
      : (slip.is_member
        ? slip.members?.email || matchedMember?.email || actObj?.email || actObj?.attendees?.[0]?.email || ''
        : slip.guest_email || actObj?.email || actObj?.attendees?.[0]?.email || memberPayload?.email || matchedMember?.email || '');

    // ถ้าเป็นข้อมูลบริษัท อย่าดึงเบอร์โทรของคนสมัครมาปน
    const phone = isCorporate
      ? (coordinatorPhone || '')
      : (slip.is_member
        ? slip.members?.mobile || matchedMember?.mobile || actObj?.mobile || actObj?.phone || actObj?.attendees?.[0]?.mobile || actObj?.attendees?.[0]?.phone || ''
        : slip.guest_phone || actObj?.phone || actObj?.mobile || actObj?.attendees?.[0]?.phone || actObj?.attendees?.[0]?.mobile || memberPayload?.mobile || matchedMember?.mobile || '');

    const workplace = isCorporate
      ? companyName
      : (slip.is_member
        ? slip.members?.workplace || matchedMember?.workplace || actObj?.workplace || actObj?.attendees?.[0]?.workplace || ''
        : slip.guest_workplace || actObj?.workplace || actObj?.attendees?.[0]?.workplace || memberPayload?.workplace || matchedMember?.workplace || '');

    const position = isCorporate
      ? ''
      : (slip.members?.position || actObj?.position || actObj?.guestPosition || actObj?.attendees?.[0]?.position || groupPayload?.attendees?.[0]?.position || memberPayload?.position || matchedMember?.position || '');

    const address = slip.members?.address || actObj?.address || memberPayload?.address || matchedMember?.address || '';
    const jobCategory = slip.members?.job_category || actObj?.jobCategory || memberPayload?.job_category || matchedMember?.job_category || '';

    // Resolve coupon information for resubmit page
    let couponCode = groupPayload?.couponCode || groupPayload?.couponData?.code || null;
    let couponInfo: any = null;
    let discountTotal = Number(groupPayload?.discountAmount) || 0;

    try {
      if (!couponCode && slip.ticket_code) {
        const sgm = await (prisma as any).sponsor_group_members.findFirst({
          where: { ticket_code: slip.ticket_code, coupon_code: { not: null } },
        });
        if (sgm?.coupon_code) couponCode = sgm.coupon_code;
      }
      if (!couponCode && slip.meeting_id) {
        const att = await prisma.meeting_attendances.findFirst({
          where: {
            meeting_id: slip.meeting_id,
            coupon_code: { not: null },
            OR: [
              { member_no: slip.member_no },
              { sponsor_company_name: companyName || undefined },
            ],
          },
        });
        if (att?.coupon_code) couponCode = att.coupon_code;
      }

      if (couponCode) {
        const cRec = await prisma.coupons.findFirst({
          where: { code: { equals: couponCode.trim(), mode: 'insensitive' } },
        });
        if (cRec) {
          couponInfo = {
            code: cRec.code,
            companyName: cRec.company_name,
            discountType: cRec.discount_type,
            discountValue: Number(cRec.discount_value) || 0,
            remarks: cRec.remarks,
          };
          if (!discountTotal) {
            const attendees = groupPayload?.attendees || [];
            if (attendees.length > 0) {
              const origSum = attendees.reduce((sum: number, a: any) => sum + Number(a.subtotal || a.price || 0), 0);
              if (origSum > Number(slip.amount)) {
                discountTotal = origSum - Number(slip.amount);
              } else if (cRec.discount_type === 'free') {
                discountTotal = attendees.length * 4000;
              }
            } else if (cRec.discount_type === 'free') {
              discountTotal = 4000;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error resolving coupon for resubmit slip:', e);
    }

    if (isMembershipRegistration) {
      const sourceMember = slip.members || matchedMember;
      memberPayload = {
        full_name_th: memberPayload?.full_name_th || sourceMember?.fullNameTh || nameTh,
        full_name_en: memberPayload?.full_name_en || sourceMember?.fullNameEn || nameEn,
        id_last4: memberPayload?.id_last4 || memberPayload?.idLast4 || memberPayload?.id4Digits || sourceMember?.idLast4 || '',
        mobile: memberPayload?.mobile || sourceMember?.mobile || phone,
        email: memberPayload?.email || sourceMember?.email || email,
        workplace: memberPayload?.workplace || sourceMember?.workplace || workplace,
        start_date: memberPayload?.start_date || (sourceMember?.work_start_date ? new Date(sourceMember.work_start_date).toISOString().split('T')[0] : '') || '',
        position: memberPayload?.position || sourceMember?.position || position,
        positionOther: memberPayload?.positionOther || memberPayload?.member_type_other || '',
        job_category: memberPayload?.job_category || sourceMember?.job_category || jobCategory,
        scientist_reg_no: memberPayload?.scientist_reg_no || memberPayload?.scientistNo || sourceMember?.scientist_license_no || '',
        referees: memberPayload?.referees || sourceMember?.referees || '',
        address: memberPayload?.address || sourceMember?.address || address,
        photo_path: memberPayload?.photo_path || memberPayload?.photo_url || sourceMember?.photo_url || null,
        degree_cert_doc: memberPayload?.degree_cert_doc || sourceMember?.degree_cert_doc || null,
        work_cert_doc: memberPayload?.work_cert_doc || sourceMember?.work_cert_doc || null,
        educations: Array.isArray(memberPayload?.educations) && memberPayload.educations.length > 0
          ? memberPayload.educations.map((e: any, idx: number) => ({
              id: String(e.id || e.edu_id || idx + 1),
              degree: e.degree || '',
              institution: e.institution || '',
              year: e.graduation_year || e.year ? String(e.graduation_year || e.year) : '',
            }))
          : Array.isArray(sourceMember?.member_educations) && sourceMember.member_educations.length > 0
          ? sourceMember.member_educations.map((e: any, idx: number) => ({
              id: String(e.edu_id || idx + 1),
              degree: e.degree || '',
              institution: e.institution || '',
              year: e.graduation_year ? String(e.graduation_year) : '',
            }))
          : [{ id: '1', degree: '', institution: '', year: '' }],
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        meetingName: isMembershipRegistration
          ? 'การสมัครสมาชิก สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)'
          : (slip.meetings?.meeting_name || 'การประชุมวิชาการ สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)'),
        applicantName: nameTh || 'ผู้ลงทะเบียน',
        nameTh,
        nameEn,
        email,
        phone,
        workplace,
        position,
        address,
        jobCategory,
        isMember: slip.is_member,
        memberNo: slip.member_no,
        isMembershipRegistration,
        isGroup: Boolean(isGroup || groupPayload),
        isCorporate,
        companyName,
        groupPayload: groupPayload ? {
          ...groupPayload,
          companyName: groupPayload.companyName || companyName,
          groupContact: groupPayload.groupContact || {
            coordinatorName,
            coordinatorEmail,
            coordinatorPhone,
          },
          attendees: groupPayload.attendees || [],
          applicants: groupPayload.applicants || [],
        } : null,
        amount: slip.amount,
        bank: slip.bank,
        transferDate: slip.transfer_date,
        transferTime: slip.transfer_time,
        refNo: slip.ref_no,
        rejectionReason: slip.rejection_reason,
        status: slip.status,
        oldSlipUrl: slip.slip_url,
        ticketCode: slip.ticket_code,
        memberPayload,
        rejectType,
        couponCode: couponCode || null,
        couponInfo: couponInfo || null,
        discountTotal: discountTotal || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching slip by token:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Resubmit edited details and/or new slip
export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    const {
      token,
      slipUrl,
      bank,
      transferDate,
      transferTime,
      refNo,
      nameTh,
      nameEn,
      email,
      phone,
      workplace,
      position,
      address,
      jobCategory,
    } = body;

    const customMemberPayload = body.customMemberPayload || body.memberPayload || null;
    const customGroupPayload = body.customGroupPayload || body.groupPayload || null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const slip = await (prisma as any).payment_slips.findUnique({
      where: { resubmit_token: token },
      include: {
        members: true,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const finalSlipUrl = slipUrl || slip.slip_url;
    if (!finalSlipUrl || (finalSlipUrl === 'PAY_LATER' && !slipUrl)) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพสลิปหลักฐานการชำระเงิน' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : (slip.guest_email || slip.members?.email || '');
    const cleanNameTh = nameTh?.trim() || slip.guest_name || slip.members?.fullNameTh || '';
    const cleanPhone = phone?.trim() || slip.guest_phone || slip.members?.mobile || '';
    const cleanWorkplace = workplace?.trim() || slip.guest_workplace || slip.members?.workplace || '';

    // Handle updating selected_activities if this was a group registration or individual membership registration
    let updatedActivities: any = slip.selected_activities;
    if (updatedActivities) {
      if (typeof updatedActivities === 'string') {
        try { updatedActivities = JSON.parse(updatedActivities); } catch { }
      }
    }

    if (customGroupPayload) {
      const baseAct = typeof updatedActivities === 'object' && !Array.isArray(updatedActivities) ? updatedActivities : {};
      const isMemGroup =
        customGroupPayload.type === 'membership_group_registration' ||
        slip.ticket_code?.startsWith('MEMGRP') ||
        (Array.isArray(customGroupPayload.applicants) && customGroupPayload.applicants.length > 0);

      updatedActivities = {
        ...baseAct,
        ...customGroupPayload,
        isGroup: true,
        type: isMemGroup ? 'membership_group_registration' : 'conference_group_registration',
        companyName: customGroupPayload.companyName || baseAct.companyName || cleanWorkplace,
        groupContact: customGroupPayload.groupContact || baseAct.groupContact || {
          coordinatorName: cleanNameTh,
          coordinatorEmail: cleanEmail,
          coordinatorPhone: cleanPhone,
        },
        couponCode: customGroupPayload.couponCode || baseAct.couponCode || null,
        couponData: customGroupPayload.couponData || baseAct.couponData || null,
        discountAmount: customGroupPayload.discountAmount || baseAct.discountAmount || 0,
        originalAmount: customGroupPayload.originalAmount || baseAct.originalAmount || 0,
        rejectType: undefined,
      };

      if (isMemGroup) {
        const rawApplicants = customGroupPayload.applicants || baseAct.applicants || [];
        updatedActivities.applicants = rawApplicants.map((app: any, idx: number) => {
          const origApp = baseAct.applicants?.[idx] || {};
          return { ...origApp, ...app };
        });
        delete updatedActivities.attendees;
      } else {
        const rawAttendees = customGroupPayload.attendees || baseAct.attendees || [];
        updatedActivities.attendees = rawAttendees.map((att: any, idx: number) => {
          const origAtt = baseAct.attendees?.[idx] || {};
          return { ...origAtt, ...att };
        });
        delete updatedActivities.applicants;
      }
    } else if (customMemberPayload) {
      const baseAct = typeof updatedActivities === 'object' && !Array.isArray(updatedActivities) ? updatedActivities : {};
      updatedActivities = {
        ...baseAct,
        type: 'membership_registration',
        memberPayload: {
          ...(baseAct.memberPayload || {}),
          ...customMemberPayload,
          full_name_th: customMemberPayload.full_name_th || cleanNameTh,
          full_name_en: customMemberPayload.full_name_en || (nameEn ? nameEn.trim() : null),
          email: customMemberPayload.email || cleanEmail,
          mobile: customMemberPayload.mobile || cleanPhone,
          workplace: customMemberPayload.workplace || cleanWorkplace,
          position: customMemberPayload.position || (position ? position.trim() : null),
          address: customMemberPayload.address || (address ? address.trim() : null),
          job_category: customMemberPayload.job_category || (jobCategory ? jobCategory.trim() : null),
        },
        rejectType: undefined,
      };
    } else if (updatedActivities && typeof updatedActivities === 'object') {
      if (updatedActivities.memberPayload || updatedActivities.type === 'membership_registration' || slip.ticket_code?.startsWith('MEM-') || slip.meeting_id === 'membership') {
        updatedActivities.type = 'membership_registration';
        updatedActivities.memberPayload = {
          ...(updatedActivities.memberPayload || {}),
          full_name_th: cleanNameTh,
          ...(nameEn ? { full_name_en: nameEn.trim() } : {}),
          email: cleanEmail,
          mobile: cleanPhone,
          workplace: cleanWorkplace,
          ...(position ? { position: position.trim() } : {}),
          ...(address ? { address: address.trim() } : {}),
          ...(jobCategory ? { job_category: jobCategory.trim() } : {}),
        };
        updatedActivities.rejectType = undefined;
      } else {
        updatedActivities = {
          ...updatedActivities,
          nameTh: cleanNameTh,
          fullNameTh: cleanNameTh,
          nameEn: nameEn?.trim() || '',
          fullNameEn: nameEn?.trim() || '',
          email: cleanEmail,
          phone: cleanPhone,
          mobile: cleanPhone,
          workplace: cleanWorkplace,
          position: position?.trim() || '',
          rejectType: undefined,
        };
        if (Array.isArray(updatedActivities.attendees) && updatedActivities.attendees.length === 1) {
          updatedActivities.attendees[0] = {
            ...updatedActivities.attendees[0],
            nameTh: cleanNameTh,
            fullNameTh: cleanNameTh,
            nameEn: nameEn?.trim() || '',
            fullNameEn: nameEn?.trim() || '',
            email: cleanEmail,
            phone: cleanPhone,
            mobile: cleanPhone,
            workplace: cleanWorkplace,
            position: position?.trim() || '',
          };
        }
      }
    } else {
      updatedActivities = {
        nameTh: cleanNameTh,
        fullNameTh: cleanNameTh,
        nameEn: nameEn?.trim() || '',
        fullNameEn: nameEn?.trim() || '',
        email: cleanEmail,
        phone: cleanPhone,
        mobile: cleanPhone,
        workplace: cleanWorkplace,
        position: position?.trim() || '',
      };
    }

    const isGroupResubmit = Boolean(
      customGroupPayload ||
      (updatedActivities && typeof updatedActivities === 'object' && (
        updatedActivities.type === 'conference_group_registration' ||
        updatedActivities.type === 'membership_group_registration' ||
        (updatedActivities.isGroup === true && (
          (Array.isArray(updatedActivities.attendees) && updatedActivities.attendees.length > 1) ||
          (Array.isArray(updatedActivities.applicants) && updatedActivities.applicants.length > 1)
        ))
      ))
    );

    const groupCompany = customGroupPayload?.companyName || cleanWorkplace || 'Corporate Group';
    const groupAttendeesCount = customGroupPayload?.attendees?.length || customGroupPayload?.applicants?.length || 0;
    const groupCoordEmail = customGroupPayload?.groupContact?.coordinatorEmail || cleanEmail;
    const groupCoordPhone = customGroupPayload?.groupContact?.coordinatorPhone || cleanPhone;

    // Update payment_slips record in place (ไม่สร้าง record ใหม่!)
    await (prisma as any).payment_slips.update({
      where: { resubmit_token: token },
      data: {
        slip_url: finalSlipUrl,
        bank: bank || slip.bank,
        transfer_date: transferDate || slip.transfer_date,
        transfer_time: transferTime || slip.transfer_time,
        ref_no: refNo || slip.ref_no,
        guest_name: isGroupResubmit
          ? `${groupCompany} (${groupAttendeesCount} ท่าน)`
          : (!slip.is_member ? cleanNameTh : slip.guest_name),
        guest_email: isGroupResubmit ? groupCoordEmail : (!slip.is_member ? cleanEmail : slip.guest_email),
        guest_phone: isGroupResubmit ? groupCoordPhone : (!slip.is_member ? cleanPhone : slip.guest_phone),
        guest_workplace: isGroupResubmit ? groupCompany : (!slip.is_member ? cleanWorkplace : slip.guest_workplace),
        selected_activities: updatedActivities,
        status: 'pending',
        rejection_reason: null,
      },
    });

    // Synchronize meeting_attendances back to pending and update details
    if (isGroupResubmit && customGroupPayload?.attendees && Array.isArray(customGroupPayload.attendees)) {
      // Synchronize all group conference attendees into meeting_attendances
      for (const att of customGroupPayload.attendees) {
        const attName = att.nameTh || att.nameEn || 'Attendee';
        const attEmail = att.email?.trim()?.toLowerCase() || '';
        const attWorkplace = att.workplace || groupCompany;
        let attMemberNo = att.memberNo?.trim() || null;
        const attPhone = att.phone?.trim() || null;

        if (!attMemberNo && attEmail) {
          const foundMem = await prisma.member.findFirst({
            where: { email: { equals: attEmail, mode: 'insensitive' } },
            select: { member_no: true },
          });
          if (foundMem?.member_no) {
            attMemberNo = foundMem.member_no.trim();
          }
        }

        if (attMemberNo) {
          await prisma.$executeRaw`
            UPDATE meeting_attendances
            SET attendance_status = 'Pending_Payment',
                workplace = COALESCE(${attWorkplace}, workplace),
                attendee_phone = COALESCE(${attPhone}, attendee_phone)
            WHERE meeting_id = ${slip.meeting_id} AND member_no = ${attMemberNo}
          `;

          // Clean up any orphaned non-member record
          if (attEmail) {
            await prisma.$executeRaw`
              DELETE FROM meeting_attendances
              WHERE meeting_id = ${slip.meeting_id}
                AND member_no IS NULL
                AND LOWER(attendee_email) = ${attEmail}
            `.catch(() => {});
          }
        } else if (attEmail) {
          const existingAtt = await prisma.meeting_attendances.findFirst({
            where: {
              meeting_id: slip.meeting_id,
              member_no: null,
              attendee_email: { equals: attEmail, mode: 'insensitive' },
            },
          });
          if (existingAtt) {
            await prisma.meeting_attendances.update({
              where: { attendance_id: existingAtt.attendance_id },
              data: {
                attendance_status: 'Non-Member-Pending',
                attendee_name: attName,
                attendee_phone: attPhone,
                workplace: attWorkplace,
              },
            });
          }
        }
      }
    } else if (slip.member_no) {
      await prisma.$executeRaw`
        UPDATE meeting_attendances
        SET attendance_status = 'Pending_Payment'
        WHERE meeting_id = ${slip.meeting_id} AND member_no = ${slip.member_no}
      `;

      // Also optionally update member contact info if provided
      if (cleanWorkplace || cleanPhone || (cleanEmail && cleanEmail !== slip.members?.email)) {
        try {
          await (prisma as any).members.update({
            where: { member_no: slip.member_no },
            data: {
              ...(cleanWorkplace ? { workplace: cleanWorkplace } : {}),
              ...(cleanPhone ? { mobile: cleanPhone } : {}),
              ...(position ? { position: position.trim() } : {}),
              ...(address ? { address: address.trim() } : {}),
            },
          });
        } catch (memberUpdateErr) {
          console.warn('Could not sync member updates directly:', memberUpdateErr);
        }
      }
    } else if (slip.guest_email || cleanEmail) {
      const targetOldEmail = slip.guest_email ? slip.guest_email.trim().toLowerCase() : cleanEmail;
      await prisma.$executeRaw`
        UPDATE meeting_attendances
        SET 
          attendance_status = 'Non-Member-Pending',
          attendee_name = ${cleanNameTh},
          attendee_email = ${cleanEmail},
          attendee_phone = ${cleanPhone},
          workplace = ${cleanWorkplace}
        WHERE meeting_id = ${slip.meeting_id} AND LOWER(attendee_email) = ${targetOldEmail}
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'pending',
        message: 'แก้ไขข้อมูลและส่งหลักฐานเรียบร้อยแล้ว เจ้าหน้าที่จะทำการตรวจสอบใหม่อีกครั้ง',
      },
    });
  } catch (error: any) {
    console.error('Error resubmitting slip and details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
