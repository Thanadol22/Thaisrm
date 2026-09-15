import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = await request.json();

    const {
      isMember,
      memberNo,
      guestName,
      guestEmail,
      guestPhone,
      guestWorkplace,
      amount,
      bank,
      transferDate,
      transferTime,
      refNo,
      slipUrl,
      selectedActivities,
    } = body;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    if (!slipUrl) {
      return NextResponse.json(
        { success: false, error: 'Payment slip image is required' },
        { status: 400 }
      );
    }

    // Verify meeting exists
    console.log('Prisma keys in route:', Object.keys(prisma));
    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });


    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    let validMemberNo: string | null = null;

    if (isMember) {
      if (!memberNo) {
        return NextResponse.json(
          { success: false, error: 'Member No is required for member registration' },
          { status: 400 }
        );
      }

      // Check member in database
      const member = await prisma.member.findUnique({
        where: { member_no: memberNo },
      });

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Member record not found' },
          { status: 404 }
        );
      }

      validMemberNo = member.member_no;
    } else {
      // Non-member validation
      if (!guestName || !guestEmail) {
        return NextResponse.json(
          { success: false, error: 'Full name and email are required for non-member registration' },
          { status: 400 }
        );
      }
    }

    // Generate unique Ticket Code: TSRM-YYYY-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TSRM-${new Date().getFullYear()}-${randomSuffix}`;
    const slipId = `SLIP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Record payment slip in payment_slips table
    let slip: any = null;
    if ((prisma as any).payment_slips) {
      slip = await (prisma as any).payment_slips.create({
        data: {
          slip_id: slipId,
          meeting_id: meetingId,
          member_no: validMemberNo,
          guest_name: !isMember ? guestName : null,
          guest_email: !isMember ? guestEmail : null,
          guest_phone: !isMember ? (guestPhone || null) : null,
          guest_workplace: !isMember ? (guestWorkplace || null) : null,
          is_member: !!isMember,
          ticket_code: ticketCode,
          amount: Number(amount) || 0,
          bank: bank || null,
          transfer_date: transferDate || null,
          transfer_time: transferTime || null,
          ref_no: refNo || null,
          slip_url: slipUrl,
          status: 'pending',
          selected_activities: selectedActivities || null,
        },
      });
    } else {
      const actJson = selectedActivities ? JSON.stringify(selectedActivities) : null;
      await prisma.$executeRaw`
        INSERT INTO payment_slips (
          slip_id, meeting_id, member_no, guest_name, guest_email, guest_phone, guest_workplace,
          is_member, ticket_code, amount, bank, transfer_date, transfer_time, ref_no, slip_url,
          status, selected_activities, created_at, updated_at
        ) VALUES (
          ${slipId}, ${meetingId}, ${validMemberNo}, ${!isMember ? guestName : null}, ${!isMember ? guestEmail : null},
          ${!isMember ? (guestPhone || null) : null}, ${!isMember ? (guestWorkplace || null) : null},
          ${!!isMember}, ${ticketCode}, ${Number(amount) || 0}, ${bank || null}, ${transferDate || null},
          ${transferTime || null}, ${refNo || null}, ${slipUrl}, 'pending', ${actJson}::jsonb, NOW(), NOW()
        )
      `;
      slip = { slip_id: slipId };
    }

    // 2. Record attendance in meeting_attendances table
    if (isMember && validMemberNo) {
      await prisma.$executeRaw`
        INSERT INTO meeting_attendances (
          meeting_id, member_no, attendance_status
        ) VALUES (
          ${meetingId}, ${validMemberNo}, 'Pending_Payment'
        ) ON CONFLICT (meeting_id, member_no)
        DO UPDATE SET attendance_status = 'Pending_Payment'
      `;
    } else {
      // Create non-member attendance record
      await prisma.$executeRaw`
        INSERT INTO meeting_attendances (
          meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status
        ) VALUES (
          ${meetingId}, NULL, ${guestName}, ${guestEmail}, ${guestPhone || null}, ${guestWorkplace || null}, 'Non-Member-Pending'
        )
      `;
    }


    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        ticketCode: ticketCode,
        status: 'pending',
        message: 'Registration submitted successfully, pending staff verification.',
      },
    });
  } catch (error: any) {
    console.error('Error during meeting registration:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}




