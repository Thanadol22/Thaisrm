import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateMemberInput } from '@/types/member';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      isGroup,
      companyName,
      groupContact,
      applicants,
      memberPayload,
      amount,
      bank,
      transferDate,
      transferTime,
      refNo,
      slipUrl,
      isPayLater: isPayLaterInput,
    } = body;

    const isPayLater = Boolean(isPayLaterInput || body.isPayLater);
    if (!slipUrl && !isPayLater) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพสลิปหลักฐานการโอนเงิน (ยกเว้นกรณีเลือกชำระเงินภายหลัง)' },
        { status: 400 }
      );
    }

    // การสมัครสมาชิกสมาคม (Membership Application) เป็นของสมาคมโดยตรง ไม่ได้ผูกกับรอบการประชุมใดๆ
    // การดึง meeting_id มาใช้เพื่อตอบสนอง Foreign Key constraint ของตาราง payment_slips ในฐานข้อมูลเท่านั้น
    let meetingId: string | null = null;
    const refMeeting = await prisma.meetings.findFirst({
      orderBy: { meeting_date: 'desc' },
      select: { meeting_id: true },
    });

    if (refMeeting) {
      meetingId = refMeeting.meeting_id;
    } else {
      const anyMeeting = await prisma.meetings.findFirst({
        select: { meeting_id: true },
      });
      meetingId = anyMeeting?.meeting_id || null;
    }

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'ระบบยังไม่พร้อมรับข้อมูล กรุณาติดต่อเจ้าหน้าที่สมาคม' },
        { status: 500 }
      );
    }
    // Type narrowed: meetingId is string from here
    const safeMeetingId: string = meetingId;

    // Handle Corporate / Group Membership Application
    if (isGroup) {
      if (!Array.isArray(applicants) || applicants.length === 0) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุรายชื่อผู้สมัครสมาชิกอย่างน้อย 1 ท่าน' },
          { status: 400 }
        );
      }

      // Check duplicates and sponsor company email conflict for each applicant
      for (let i = 0; i < applicants.length; i++) {
        const app = applicants[i];
        const appEmail = app.email?.trim()?.toLowerCase();
        if (appEmail) {
          // 1. Check if applicant email matches coordinator/sponsor email submitted
          const coordEmail = groupContact?.coordinatorEmail?.trim()?.toLowerCase();
          if (coordEmail && appEmail === coordEmail) {
            return NextResponse.json(
              {
                success: false,
                error: `ผู้สมัครลำดับที่ ${i + 1} (${app.full_name_th || 'ผู้สมัคร'}): ไม่สามารถใช้อีเมลเดียวกับบริษัท/ผู้ประสานงานในการสมัครสมาชิกได้ กรุณาระบุอีเมลส่วนตัวของผู้สมัคร`,
                code: 'SPONSOR_EMAIL_NOT_ALLOWED',
              },
              { status: 400 }
            );
          }

          // 2. Check if applicant email matches any registered sponsor company in database
          const sponsorMatch = await (prisma as any).sponsors.findFirst({
            where: { contact_email: { equals: appEmail, mode: 'insensitive' } },
            select: { name: true },
          });
          if (sponsorMatch) {
            return NextResponse.json(
              {
                success: false,
                error: `ผู้สมัครลำดับที่ ${i + 1} (${app.full_name_th || 'ผู้สมัคร'}): ไม่สามารถใช้อีเมลนี้ได้ เนื่องจากเป็นอีเมลของบริษัท (${sponsorMatch.name}) กรุณาระบุอีเมลส่วนตัวของผู้สมัคร`,
                code: 'SPONSOR_EMAIL_NOT_ALLOWED',
              },
              { status: 400 }
            );
          }

          // 3. Check existing member duplicate
          const existing = await prisma.member.findFirst({
            where: { email: { equals: appEmail, mode: 'insensitive' } },
            select: { member_no: true, fullNameTh: true },
          });
          if (existing) {
            return NextResponse.json(
              {
                success: false,
                error: `อีเมล ${appEmail} (${app.full_name_th || ''}) เป็นสมาชิกในระบบแล้ว (รหัส: ${existing.member_no})`,
                code: 'DUPLICATE_MEMBER_EMAIL',
              },
              { status: 400 }
            );
          }
        }
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `MEMGRP-${new Date().getFullYear()}-${randomSuffix}`;
      const slipId = `SLIP-MEMGRP-${Date.now().toString(36).toUpperCase()}`;

      const groupPayload = {
        isGroup: true,
        type: 'membership_group_registration',
        companyName: companyName || 'Corporate Group',
        groupContact: groupContact || null,
        applicants: applicants,
        submittedAt: new Date().toISOString(),
        amount: Number(amount) || applicants.length * 1000,
      };

      const slip = await prisma.payment_slips.create({
        data: {
          slip_id: slipId,
          meeting_id: safeMeetingId,
          member_no: null,
          guest_name: `${companyName || 'Corporate Group'} (${applicants.length} ท่าน)`,
          guest_email: groupContact?.coordinatorEmail || applicants[0]?.email || null,
          guest_phone: groupContact?.coordinatorPhone || applicants[0]?.mobile || null,
          guest_workplace: companyName || null,
          is_member: false,
          ticket_code: ticketCode,
          amount: Number(amount) || applicants.length * 1000,
          bank: isPayLater ? 'ชำระเงินภายหลัง (Pay Later)' : (bank || 'Kasikorn (KBANK)'),
          transfer_date: transferDate || null,
          transfer_time: transferTime || null,
          ref_no: refNo || null,
          slip_url: isPayLater ? 'PAY_LATER' : (slipUrl || 'GROUP_MEMBERSHIP'),
          status: 'pending',
          selected_activities: groupPayload as any,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          slipId: slip.slip_id,
          ticketCode,
          status: 'pending',
          isGroup: true,
          applicantCount: applicants.length,
          message: 'ส่งใบสมัครสมาชิกแบบกลุ่มและหลักฐานการชำระเงินเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบและอนุมัติ',
        },
      }, { status: 201 });
    }

    // Individual Membership Application
    if (!memberPayload || !memberPayload.full_name_th || !memberPayload.full_name_th.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' },
        { status: 400 }
      );
    }

    const email = memberPayload.email?.trim()?.toLowerCase();

    // 1. ตรวจสอบว่าไม่ใช่อีเมลเดียวกับบริษัทสปอนเซอร์
    if (email) {
      const sponsorMatch = await (prisma as any).sponsors.findFirst({
        where: { contact_email: { equals: email, mode: 'insensitive' } },
        select: { name: true },
      });

      if (sponsorMatch) {
        return NextResponse.json(
          {
            success: false,
            error: `ไม่สามารถใช้อีเมลนี้ในการสมัครสมาชิกได้ เนื่องจากเป็นอีเมลของบริษัท (${sponsorMatch.name}) กรุณาระบุอีเมลส่วนตัวของผู้สมัคร`,
            code: 'SPONSOR_EMAIL_NOT_ALLOWED',
          },
          { status: 400 }
        );
      }

      // ตรวจสอบอีเมลซ้ำกับสมาชิกที่มีอยู่ในระบบแล้ว
      const existingMember = await prisma.member.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { member_no: true, fullNameTh: true, email: true, membership_status: true },
      });

      if (existingMember) {
        return NextResponse.json(
          {
            success: false,
            error: `อีเมล ${email} นี้เป็นสมาชิกในระบบแล้ว (รหัสสมาชิก: ${existingMember.member_no}) ไม่สามารถสมัครสมาชิกซ้ำได้`,
            code: 'DUPLICATE_MEMBER_EMAIL',
          },
          { status: 400 }
        );
      }

      // 2. ตรวจสอบว่ามีคำขอสมัครสมาชิกรออนุมัติที่มีอีเมลเดียวกันหรือไม่
      const pendingSlips = await prisma.payment_slips.findFirst({
        where: {
          guest_email: { equals: email, mode: 'insensitive' },
          status: 'pending',
        },
      });

      if (pendingSlips) {
        return NextResponse.json(
          {
            success: false,
            error: `อีเมล ${email} มีคำขอสมัครสมาชิกอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบสลิปแล้ว ไม่สามารถส่งซ้ำได้`,
            code: 'PENDING_REGISTRATION_EXISTS',
          },
          { status: 400 }
        );
      }
    }

    // 4. Generate Slip ID และ Ticket Code สำหรับอ้างอิง
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `MEM-${new Date().getFullYear()}-${randomSuffix}`;
    const slipId = `SLIP-MEM-${Date.now().toString(36).toUpperCase()}`;

    // 5. บันทึกลงตาราง payment_slips (status = pending, member_no = null)
    const activitiesPayload = {
      type: 'membership_registration',
      memberPayload: memberPayload as CreateMemberInput,
      submittedAt: new Date().toISOString(),
      amount: Number(amount) || 1000,
    };

    const slip = await prisma.payment_slips.create({
      data: {
        slip_id: slipId,
        meeting_id: safeMeetingId,
        member_no: null,
        guest_name: memberPayload.full_name_th.trim(),
        guest_email: email || null,
        guest_phone: memberPayload.mobile?.trim() || null,
        guest_workplace: memberPayload.workplace?.trim() || null,
        is_member: false,
        ticket_code: ticketCode,
        amount: Number(amount) || 1000,
        bank: isPayLater ? 'ชำระเงินภายหลัง (Pay Later)' : (bank || 'Kasikorn (KBANK)'),
        transfer_date: transferDate || null,
        transfer_time: transferTime || null,
        ref_no: refNo || null,
        slip_url: isPayLater ? 'PAY_LATER' : slipUrl,
        status: 'pending',
        selected_activities: activitiesPayload as any,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        ticketCode,
        status: 'pending',
        message: 'ส่งใบสมัครและหลักฐานการชำระเงินเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบและอนุมัติ',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API /api/members/register-slip POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'เกิดข้อผิดพลาดในการส่งใบสมัครสมาชิก กรุณาลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}

