import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Retrieve slip & rejection details by token
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
            fullNameTh: true,
            email: true,
            member_no: true,
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
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const applicantName = slip.is_member
      ? slip.members?.fullNameTh || 'สมาชิก'
      : slip.guest_name || 'ผู้ลงทะเบียน';

    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        meetingName: slip.meetings?.meeting_name,
        applicantName,
        amount: slip.amount,
        rejectionReason: slip.rejection_reason,
        status: slip.status,
        oldSlipUrl: slip.slip_url,
        ticketCode: slip.ticket_code,
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

// POST: Resubmit new slip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, slipUrl, bank, transferDate, transferTime, refNo } = body;

    if (!token || !slipUrl) {
      return NextResponse.json(
        { success: false, error: 'Token and new slip URL are required' },
        { status: 400 }
      );
    }

    const slip = await (prisma as any).payment_slips.findUnique({
      where: { resubmit_token: token },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Update slip back to 'pending'
    const updated = await (prisma as any).payment_slips.update({
      where: { resubmit_token: token },
      data: {
        slip_url: slipUrl,
        bank: bank || slip.bank,
        transfer_date: transferDate || slip.transfer_date,
        transfer_time: transferTime || slip.transfer_time,
        ref_no: refNo || slip.ref_no,
        status: 'pending',
        rejection_reason: null,
      },
    });

    // Synchronize meeting_attendances status back to pending
    if (slip.member_no) {
      await prisma.$executeRaw`
        UPDATE meeting_attendances
        SET attendance_status = 'Pending_Payment'
        WHERE meeting_id = ${slip.meeting_id} AND member_no = ${slip.member_no}
      `;
    } else if (slip.guest_email) {
      await prisma.$executeRaw`
        UPDATE meeting_attendances
        SET attendance_status = 'Non-Member-Pending'
        WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${slip.guest_email}
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'pending',
        message: 'Slip re-uploaded successfully. Staff will review shortly.',
      },
    });
  } catch (error: any) {
    console.error('Error resubmitting slip:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
