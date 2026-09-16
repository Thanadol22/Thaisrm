import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendRegistrationApprovedEmail, sendSlipRejectionEmail } from '@/lib/email';

// GET: Fetch all payment slips for Admin Review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const status = searchParams.get('status');

    let formattedSlips: any[] = [];

    const slipsModel = (prisma as any).payment_slips || (prisma as any).paymentSlip;

    if (slipsModel) {
      const whereClause: any = {};
      if (meetingId) whereClause.meeting_id = meetingId;
      if (status && status !== 'all') whereClause.status = status;

      const slips = await slipsModel.findMany({
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

      formattedSlips = slips.map((s: any) => {
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
          selectedActivities: s.selected_activities || [],
          createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        };
      });
    } else {
      // Fallback SQL query
      let query = `
        SELECT 
          s.id, s.slip_id, s.meeting_id, s.member_no, s.guest_name, s.guest_email, s.guest_phone,
          s.guest_workplace, s.is_member, s.ticket_code, s.amount, s.bank, s.transfer_date, s.transfer_time,
          s.ref_no, s.slip_url, s.status, s.rejection_reason, s.resubmit_token, s.selected_activities,
          s.reviewed_by, s.reviewed_at, s.created_at, s.updated_at,
          m.full_name_th AS member_full_name_th,
          m.full_name_en AS member_full_name_en,
          m.email AS member_email,
          m.mobile AS member_mobile,
          m.workplace AS member_workplace,
          mtg.meeting_name,
          mtg.meeting_date
        FROM payment_slips s
        LEFT JOIN members m ON s.member_no = m.member_no
        LEFT JOIN meetings mtg ON s.meeting_id = mtg.meeting_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (meetingId) {
        params.push(meetingId);
        query += ` AND s.meeting_id = $${params.length}`;
      }
      if (status && status !== 'all') {
        params.push(status);
        query += ` AND s.status = $${params.length}`;
      }
      query += ` ORDER BY s.created_at DESC`;

      const slips: any[] = await prisma.$queryRawUnsafe(query, ...params);

      formattedSlips = slips.map((s: any) => {
        const isMember = s.is_member && s.member_full_name_th;
        const nameTh = isMember ? s.member_full_name_th : s.guest_name || 'ผู้สมัครทั่วไป';
        const nameEn = isMember ? s.member_full_name_en || '' : '';
        const email = isMember ? s.member_email || '' : s.guest_email || '';
        const phone = isMember ? s.member_mobile || '' : s.guest_phone || '';
        const workplace = isMember ? s.member_workplace || '' : s.guest_workplace || '';

        return {
          id: s.slip_id,
          dbId: s.id?.toString(),
          meetingId: s.meeting_id,
          meetingName: s.meeting_name || '',
          memberNo: s.member_no,
          isMember: s.is_member,
          nameTh,
          nameEn,
          email,
          phone,
          workplace,
          ticketType: s.is_member ? 'Member Pass' : 'Non-Member Pass',
          ticketCode: s.ticket_code || '',
          amount: Number(s.amount) || 0,
          bank: s.bank || 'ธนาคารไทยพาณิชย์ (SCB)',
          transferTime: s.transfer_time || '',
          transferDate: s.transfer_date || '',
          refNo: s.ref_no || s.slip_id,
          slipUrl: s.slip_url,
          status: s.status as 'pending' | 'approved' | 'rejected',
          notes: s.rejection_reason || undefined,
          resubmitToken: s.resubmit_token,
          selectedActivities: s.selected_activities || [],
          createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: formattedSlips,
    });
  } catch (error: any) {
    console.error('Error fetching admin slips:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Review slip (Approve / Reject / Reset)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slipId, action, notes, reviewer } = body;

    if (!slipId || !action || !['approve', 'reject', 'reset'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'slipId and valid action (approve/reject/reset) are required' },
        { status: 400 }
      );
    }

    let slip: any = null;
    if ((prisma as any).payment_slips) {
      slip = await (prisma as any).payment_slips.findUnique({
        where: { slip_id: slipId },
        include: {
          members: true,
          meetings: true,
        },
      });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT 
          s.*,
          m.full_name_th, m.full_name_en, m.email AS member_email, m.mobile AS member_mobile, m.workplace AS member_workplace,
          mtg.meeting_name
        FROM payment_slips s
        LEFT JOIN members m ON s.member_no = m.member_no
        LEFT JOIN meetings mtg ON s.meeting_id = mtg.meeting_id
        WHERE s.slip_id = ${slipId}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0];
        slip = {
          ...r,
          members: r.member_no ? {
            member_no: r.member_no,
            fullNameTh: r.full_name_th,
            fullNameEn: r.full_name_en,
            email: r.member_email,
            mobile: r.member_mobile,
            workplace: r.member_workplace,
          } : null,
          meetings: {
            meeting_name: r.meeting_name,
          },
        };
      }
    }

    if (!slip) {
      return NextResponse.json(
        { success: false, error: 'Payment slip not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // 1. Update slip status to approved
      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'approved',
            rejection_reason: null,
            resubmit_token: null,
            reviewed_by: reviewer || 'Admin',
            reviewed_at: new Date(),
          },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE payment_slips
          SET status = 'approved', rejection_reason = NULL, resubmit_token = NULL,
              reviewed_by = ${reviewer || 'Admin'}, reviewed_at = NOW(), updated_at = NOW()
          WHERE slip_id = ${slipId}
        `;
      }

      // 2. Update meeting_attendances
      if (slip.member_no) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Registered'
          WHERE meeting_id = ${slip.meeting_id} AND member_no = ${slip.member_no}
        `;
      } else if (slip.guest_email) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Non-Member'
          WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${slip.guest_email}
        `;
      }

      // 3. Send approval confirmation email stub
      const recipientEmail = slip.members?.email || slip.guest_email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || 'ผู้เข้าร่วมประชุม';
      if (recipientEmail) {
        try {
          await sendRegistrationApprovedEmail({
            to: recipientEmail,
            recipientName,
            meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
            ticketCode: slip.ticket_code || '',
            amountPaid: slip.amount,
            isMember: slip.is_member,
          });
        } catch (mailErr) {
          console.error('Failed to send approval email:', mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
          message: 'Slip approved and attendee confirmed successfully.',
        },
      });
    } else if (action === 'reset') {
      // Reset action back to pending
      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'pending',
            rejection_reason: null,
            resubmit_token: null,
            reviewed_by: null,
            reviewed_at: null,
          },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE payment_slips
          SET status = 'pending', rejection_reason = NULL, resubmit_token = NULL,
              reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
          WHERE slip_id = ${slipId}
        `;
      }

      // Revert attendance status to pending
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
          message: 'Slip status reset to pending.',
        },
      });
    } else {
      // Reject action
      const resubmitToken = crypto.randomBytes(24).toString('hex');
      const rejectionReason = notes || 'โปรดแนบสลิปที่มียอดเงินและวันเวลาตรงตามที่กำหนด';

      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'rejected',
            rejection_reason: rejectionReason,
            resubmit_token: resubmitToken,
            reviewed_by: reviewer || 'Admin',
            reviewed_at: new Date(),
          },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE payment_slips
          SET status = 'rejected', rejection_reason = ${rejectionReason}, resubmit_token = ${resubmitToken},
              reviewed_by = ${reviewer || 'Admin'}, reviewed_at = NOW(), updated_at = NOW()
          WHERE slip_id = ${slipId}
        `;
      }

      // Update attendance status to Rejected
      if (slip.member_no) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Rejected'
          WHERE meeting_id = ${slip.meeting_id} AND member_no = ${slip.member_no}
        `;
      } else if (slip.guest_email) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Rejected'
          WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${slip.guest_email}
        `;
      }

      // Send rejection & resubmit email stub
      const recipientEmail = slip.members?.email || slip.guest_email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || 'ผู้ลงทะเบียน';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resubmitUrl = `${baseUrl}/resubmit-slip/${resubmitToken}`;

      if (recipientEmail) {
        try {
          await sendSlipRejectionEmail({
            to: recipientEmail,
            recipientName,
            meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
            rejectionReason,
            resubmitUrl,
          });
        } catch (mailErr) {
          console.error('Failed to send rejection email:', mailErr);
        }
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
