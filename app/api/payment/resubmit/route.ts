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
            email: true,
            mobile: true,
            workplace: true,
            position: true,
            address: true,
            job_category: true,
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
    let isMembershipRegistration = false;
    let isGroup = false;
    let rejectType: 'info' | 'slip' = 'info';

    if (slip.selected_activities) {
      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.rejectType) {
          rejectType = actObj.rejectType;
        }
        if (actObj.type === 'membership_registration' || actObj.memberPayload) {
          isMembershipRegistration = true;
          memberPayload = actObj.memberPayload;
        } else if (
          actObj.type === 'membership_group_registration' ||
          actObj.isGroup ||
          (actObj.attendees && Array.isArray(actObj.attendees)) ||
          (actObj.applicants && Array.isArray(actObj.applicants))
        ) {
          isGroup = true;
          groupPayload = actObj;
        }
      }
    }

    // Fallback if not stored in selected_activities:
    if (!rejectType || (rejectType !== 'info' && rejectType !== 'slip')) {
      const reason = slip.rejection_reason || '';
      rejectType = reason.includes('ข้อมูล') && !reason.includes('สลิป') ? 'info' : 'slip';
    }

    if (slip.ticket_code?.startsWith('MEM-') || slip.meeting_id === 'membership') {
      isMembershipRegistration = true;
    }
    if (slip.ticket_code?.startsWith('MEMGRP')) {
      isGroup = true;
      isMembershipRegistration = true;
    }

    const isCorporate = Boolean(
      isGroup ||
      slip.ticket_code?.startsWith('MEMGRP') ||
      slip.ticket_code?.startsWith('GRP-') ||
      slip.guest_name?.includes('ท่าน') ||
      groupPayload
    );

    let companyName = '';
    if (isCorporate) {
      companyName = groupPayload?.companyName || slip.guest_workplace || (slip.guest_name ? slip.guest_name.replace(/\s*\(\d+\s*ท่าน\)/, '') : '');
    }

    const attendeesList = groupPayload?.attendees || groupPayload?.applicants || [];
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
        ? slip.members?.fullNameTh || ''
        : slip.guest_name || memberPayload?.full_name_th || '');

    const nameEn = slip.is_member
      ? slip.members?.fullNameEn || ''
      : memberPayload?.full_name_en || '';

    const email = isCorporate
      ? (coordinatorEmail || slip.guest_email || '')
      : (slip.is_member
        ? slip.members?.email || ''
        : slip.guest_email || memberPayload?.email || '');

    // ถ้าเป็นข้อมูลบริษัท อย่าดึงเบอร์โทรของคนสมัครมาปน
    const phone = isCorporate
      ? (coordinatorPhone || '')
      : (slip.is_member
        ? slip.members?.mobile || ''
        : slip.guest_phone || memberPayload?.mobile || '');

    const workplace = isCorporate
      ? companyName
      : (slip.is_member
        ? slip.members?.workplace || ''
        : slip.guest_workplace || memberPayload?.workplace || '');

    const position = slip.members?.position || memberPayload?.position || '';
    const address = slip.members?.address || memberPayload?.address || '';
    const jobCategory = slip.members?.job_category || memberPayload?.job_category || '';

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
    const body = await request.json();
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
      memberPayload: customMemberPayload,
      groupPayload: customGroupPayload,
    } = body;

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
    let updatedActivities = slip.selected_activities;
    if (updatedActivities) {
      let actObj = updatedActivities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }
      if (actObj && typeof actObj === 'object') {
        if (customGroupPayload) {
          actObj = {
            ...actObj,
            ...customGroupPayload,
            companyName: customGroupPayload.companyName || actObj.companyName || cleanWorkplace,
            groupContact: customGroupPayload.groupContact || {
              coordinatorName: cleanNameTh,
              coordinatorEmail: cleanEmail,
              coordinatorPhone: cleanPhone,
            },
            attendees: customGroupPayload.attendees || actObj.attendees || [],
            applicants: customGroupPayload.applicants || actObj.applicants || [],
            rejectType: undefined,
          };
          updatedActivities = actObj;
        } else if (actObj.memberPayload || actObj.type === 'membership_registration') {
          actObj.memberPayload = {
            ...(actObj.memberPayload || {}),
            ...(customMemberPayload || {}),
            full_name_th: cleanNameTh,
            ...(nameEn ? { full_name_en: nameEn.trim() } : {}),
            email: cleanEmail,
            mobile: cleanPhone,
            workplace: cleanWorkplace,
            ...(position ? { position: position.trim() } : {}),
            ...(address ? { address: address.trim() } : {}),
            ...(jobCategory ? { job_category: jobCategory.trim() } : {}),
          };
          actObj.rejectType = undefined;
          updatedActivities = actObj;
        }
      }
    } else if (customGroupPayload) {
      updatedActivities = customGroupPayload;
    }

    const isGroupResubmit = Boolean(
      customGroupPayload ||
      (updatedActivities && typeof updatedActivities === 'object' && (updatedActivities.isGroup || updatedActivities.attendees || updatedActivities.applicants))
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
        const attMemberNo = att.memberNo?.trim() || null;
        const attPhone = att.phone?.trim() || null;

        if (attMemberNo) {
          await prisma.$executeRaw`
            INSERT INTO meeting_attendances (
              meeting_id, member_no, attendance_status, workplace, attendee_phone
            ) VALUES (
              ${slip.meeting_id}, ${attMemberNo}, 'Pending_Payment', ${attWorkplace}, ${attPhone}
            ) ON CONFLICT (meeting_id, member_no)
            DO UPDATE SET
              attendance_status = 'Pending_Payment',
              workplace = COALESCE(${attWorkplace}, meeting_attendances.workplace),
              attendee_phone = COALESCE(${attPhone}, meeting_attendances.attendee_phone)
          `;
        } else if (attEmail) {
          const existingAtt = await prisma.meeting_attendances.findFirst({
            where: {
              meeting_id: slip.meeting_id,
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
          } else {
            await prisma.meeting_attendances.create({
              data: {
                meeting_id: slip.meeting_id,
                attendee_name: attName,
                attendee_email: attEmail,
                attendee_phone: attPhone,
                workplace: attWorkplace,
                attendance_status: 'Non-Member-Pending',
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
