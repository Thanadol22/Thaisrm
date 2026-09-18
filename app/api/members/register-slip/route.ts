import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateMemberInput } from '@/types/member';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberPayload,
      amount,
      bank,
      transferDate,
      transferTime,
      refNo,
      slipUrl,
    } = body;

    if (!memberPayload || !memberPayload.full_name_th || !memberPayload.full_name_th.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' },
        { status: 400 }
      );
    }

    if (!slipUrl) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพสลิปหลักฐานการโอนเงิน' },
        { status: 400 }
      );
    }

    const email = memberPayload.email?.trim()?.toLowerCase();

    // 1. ตรวจสอบอีเมลซ้ำกับสมาชิกที่มีอยู่ในระบบแล้ว
    if (email) {
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

    // 3. หา meeting_id ที่มีอยู่ในตาราง meetings สำหรับผูก Foreign Key
    let meetingId = 'TSRM34';
    const activeMeeting = await prisma.meetings.findFirst({
      orderBy: { meeting_date: 'desc' },
      select: { meeting_id: true },
    });

    if (activeMeeting) {
      meetingId = activeMeeting.meeting_id;
    } else {
      // Fallback: ดึง meeting id ใดๆ ที่มี
      const anyMeeting = await prisma.meetings.findFirst({
        select: { meeting_id: true },
      });
      if (anyMeeting) {
        meetingId = anyMeeting.meeting_id;
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
        meeting_id: meetingId,
        member_no: null,
        guest_name: memberPayload.full_name_th.trim(),
        guest_email: email || null,
        guest_phone: memberPayload.mobile?.trim() || null,
        guest_workplace: memberPayload.workplace?.trim() || null,
        is_member: false,
        ticket_code: ticketCode,
        amount: Number(amount) || 1000,
        bank: bank || 'Kasikorn (KBANK)',
        transfer_date: transferDate || null,
        transfer_time: transferTime || null,
        ref_no: refNo || null,
        slip_url: slipUrl,
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
