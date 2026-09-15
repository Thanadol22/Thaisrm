import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendRegistrationApprovedEmail, sendSlipRejectionEmail } from '@/lib/email';

// GET: Fetch all payment slips for Staff / Admin Review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (meetingId) whereClause.meeting_id = meetingId;
    if (status && status !== 'all') whereClause.status = status;

    const slips = await (prisma as any).payment_slips.findMany({
      where: whereClause,
      include: {
        members: {
          select: {
            member_no: true,
            fullNameTh: true,
            fullNameEn: true,
            email: true,
            mobile: true,
            workplace: true,
          },
        },
        meetings: {
          select: {
            meeting_id: true,
            meeting_name: true,
            meeting_date: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Format for StaffSlipsView UI
    const formattedSlips = slips.map((s: any) => {
      const isMember = s.is_member && s.members;
      const nameTh = isMember ? s.members?.fullNameTh || 'สมาชิก' : s.guest_name || 'ผู้สมัครทั่วไป';
      const nameEn = isMember ? s.members?.fullNameEn || '' : '';
      const email = isMember ? s.members?.email || '' : s.guest_email || '';
      const phone = isMember ? s.members?.mobile || '' : s.guest_phone || '';
      const workplace = isMember ? s.members?.workplace || '' : s.guest_workplace || '';

      return {
        id: s.slip_id,
        dbId: s.id.toString(),
        meetingId: s.meeting_id,
        meetingName: s.meetings?.meeting_name || '',
        memberNo: s.member_no,
        isMember: s.is_member,
        nameTh,
        nameEn,
        email,
        phone,
        workplace,
        ticketType: s.is_member ? 'Member Pass' : 'Non-Member Pass',
        ticketCode: s.ticket_code || '',
        amount: s.amount,
        bank: s.bank || 'ธนาคารไทยพาณิชย์ (SCB)',
        transferTime: s.transfer_time || '',
        transferDate: s.transfer_date || '',
        refNo: s.ref_no || s.slip_id,
        slipUrl: s.slip_url,
        status: s.status as 'pending' | 'approved' | 'rejected',
        notes: s.rejection_reason || undefined,
        resubmitToken: s.resubmit_token,
        createdAt: s.created_at.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedSlips,
    });
  } catch (error: any) {
    console.error('Error fetching slips:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Review slip (Approve / Reject)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slipId, action, notes, reviewer } = body;

    if (!slipId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'slipId and valid action (approve/reject) are required' },
        { status: 400 }
      );
    }

    const slip = await (prisma as any).payment_slips.findUnique({
      where: { slip_id: slipId },
      include: {
        members: true,
        meetings: true,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: 'Payment slip not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // 1. Update slip status to approved
      const updatedSlip = await (prisma as any).payment_slips.update({
        where: { slip_id: slipId },
        data: {
          status: 'approved',
          rejection_reason: null,
          resubmit_token: null,
          reviewed_by: reviewer || 'Staff Admin',
          reviewed_at: new Date(),
        },
      });

      // 2. Update meeting_attendances
      if (slip.member_no) {
        await (prisma as any).meeting_attendances.updateMany({
          where: {
            meeting_id: slip.meeting_id,
            member_no: slip.member_no,
          },
          data: {
            attendance_status: 'Registered',
          },
        });
      } else if (slip.guest_email) {
        await (prisma as any).meeting_attendances.updateMany({
          where: {
            meeting_id: slip.meeting_id,
            attendee_email: slip.guest_email,
          },
          data: {
            attendance_status: 'Non-Member',
          },
        });
      }

      // 3. Send approval confirmation email stub
      const recipientEmail = slip.members?.email || slip.guest_email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || 'ผู้เข้าร่วมประชุม';
      if (recipientEmail) {
        await sendRegistrationApprovedEmail({
          to: recipientEmail,
          recipientName,
          meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
          ticketCode: slip.ticket_code || '',
          amountPaid: slip.amount,
          isMember: slip.is_member,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
          message: 'Slip approved and attendee confirmed successfully.',
        },
      });
    } else {
      // Reject action
      const resubmitToken = crypto.randomBytes(24).toString('hex');
      const rejectionReason = notes || 'โปรดแนบสลิปที่มียอดเงินและวันเวลาตรงตามที่กำหนด';

      const updatedSlip = await (prisma as any).payment_slips.update({
        where: { slip_id: slipId },
        data: {
          status: 'rejected',
          rejection_reason: rejectionReason,
          resubmit_token: resubmitToken,
          reviewed_by: reviewer || 'Staff Admin',
          reviewed_at: new Date(),
        },
      });

      // Send rejection & resubmit email stub
      const recipientEmail = slip.members?.email || slip.guest_email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || 'ผู้ลงทะเบียน';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resubmitUrl = `${baseUrl}/resubmit-slip/${resubmitToken}`;

      if (recipientEmail) {
        await sendSlipRejectionEmail({
          to: recipientEmail,
          recipientName,
          meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
          rejectionReason,
          resubmitUrl,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'rejected',
          resubmitToken,
          resubmitUrl,
          message: 'Slip rejected and notification email sent.',
        },
      });
    }
  } catch (error: any) {
    console.error('Error reviewing slip:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
