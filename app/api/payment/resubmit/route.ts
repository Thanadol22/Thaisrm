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
    let isMembershipRegistration = false;
    let isGroup = false;
    let rejectType: 'info' | 'slip' = 'info';

    if (slip.selected_activities) {
      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch {}
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.rejectType) {
          rejectType = actObj.rejectType;
        }
        if (actObj.type === 'membership_registration' || actObj.memberPayload) {
          isMembershipRegistration = true;
          memberPayload = actObj.memberPayload;
        } else if (actObj.type === 'membership_group_registration' || actObj.isGroup) {
          isGroup = true;
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

    const isCorporate = Boolean(
      isGroup ||
      slip.ticket_code?.startsWith('MEMGRP') ||
      slip.guest_name?.includes('ท่าน')
    );

    let companyName = '';
    if (isCorporate) {
      companyName = slip.guest_workplace || (slip.guest_name ? slip.guest_name.replace(/\s*\(\d+\s*ท่าน\)/, '') : '');
    }

    const nameTh = isCorporate
      ? companyName || slip.guest_name || ''
      : (slip.is_member
        ? slip.members?.fullNameTh || ''
        : slip.guest_name || memberPayload?.full_name_th || '');

    const nameEn = slip.is_member
      ? slip.members?.fullNameEn || ''
      : memberPayload?.full_name_en || '';

    const email = slip.is_member
      ? slip.members?.email || ''
      : slip.guest_email || memberPayload?.email || '';

    // ถ้าเป็นข้อมูลบริษัท อย่าดึงเบอร์โทรของคนสมัครมาปน
    const phone = isCorporate
      ? ''
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
        isGroup,
        isCorporate,
        companyName,
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
    if (!finalSlipUrl || finalSlipUrl === 'PAY_LATER' && !slipUrl) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพสลิปหลักฐานการชำระเงิน' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : (slip.guest_email || slip.members?.email || '');
    const cleanNameTh = nameTh?.trim() || slip.guest_name || slip.members?.fullNameTh || '';
    const cleanPhone = phone?.trim() || slip.guest_phone || slip.members?.mobile || '';
    const cleanWorkplace = workplace?.trim() || slip.guest_workplace || slip.members?.workplace || '';

    // Handle updating selected_activities if this was a membership registration
    let updatedActivities = slip.selected_activities;
    if (updatedActivities) {
      let actObj = updatedActivities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch {}
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.memberPayload || actObj.type === 'membership_registration') {
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
          updatedActivities = actObj;
        }
      }
    }

    // Update payment_slips record
    await (prisma as any).payment_slips.update({
      where: { resubmit_token: token },
      data: {
        slip_url: finalSlipUrl,
        bank: bank || slip.bank,
        transfer_date: transferDate || slip.transfer_date,
        transfer_time: transferTime || slip.transfer_time,
        ref_no: refNo || slip.ref_no,
        guest_name: !slip.is_member ? cleanNameTh : slip.guest_name,
        guest_email: !slip.is_member ? cleanEmail : slip.guest_email,
        guest_phone: !slip.is_member ? cleanPhone : slip.guest_phone,
        guest_workplace: !slip.is_member ? cleanWorkplace : slip.guest_workplace,
        selected_activities: updatedActivities,
        status: 'pending',
        rejection_reason: null,
      },
    });

    // Synchronize meeting_attendances back to pending and update details
    if (slip.member_no) {
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
