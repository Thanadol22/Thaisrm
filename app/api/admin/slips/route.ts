import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendRegistrationApprovedEmail, sendSlipRejectionEmail, sendMembershipApprovedEmail } from '@/lib/email';
import { createMember } from '@/lib/services/memberService';
import { getSystemSettings } from '@/lib/services/settingsService';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// GET: Fetch all payment slips for Admin Review
export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const status = searchParams.get('status');
    const settings = await getSystemSettings();
    const defaultBank = settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)';

    let formattedSlips: any[] = [];

    const slipsModel = (prisma as any).payment_slips || (prisma as any).paymentSlip;

    const parseActivitiesData = (act: any) => {
      if (!act) return { activities: [], isMembership: false, memberPayload: null };
      let parsed = act;
      if (typeof act === 'string') {
        try {
          parsed = JSON.parse(act);
        } catch {
          return { activities: [], isMembership: false, memberPayload: null };
        }
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type === 'membership_registration') {
        return {
          activities: [{
            id: 'membership_registration',
            name: 'ค่าบำรุงสมาชิกรายปี (Membership Fee)',
            type: 'membership_registration',
            price: parsed.amount || 1000,
            rateBadgeTh: 'สมัครสมาชิกใหม่',
            rateBadgeEn: 'New Member',
          }],
          isMembership: true,
          memberPayload: parsed.memberPayload || null,
        };
      }

      if (Array.isArray(parsed)) {
        return { activities: parsed, isMembership: false, memberPayload: null };
      }

      return { activities: [], isMembership: false, memberPayload: null };
    };

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
        const parsedAct = parseActivitiesData(s.selected_activities);
        const isMember = s.is_member && s.members;
        const nameTh = isMember
          ? s.members?.fullNameTh || 'สมาชิก'
          : s.guest_name || parsedAct.memberPayload?.full_name_th || 'ผู้สมัครทั่วไป';
        const nameEn = isMember
          ? s.members?.fullNameEn || ''
          : parsedAct.memberPayload?.full_name_en || '';
        const email = isMember
          ? s.members?.email || ''
          : s.guest_email || parsedAct.memberPayload?.email || '';
        const phone = isMember
          ? s.members?.mobile || ''
          : s.guest_phone || parsedAct.memberPayload?.mobile || '';
        const workplace = isMember
          ? s.members?.workplace || ''
          : s.guest_workplace || parsedAct.memberPayload?.workplace || '';

        const ticketType = parsedAct.isMembership
          ? 'Membership Registration'
          : s.is_member
          ? 'Member Pass'
          : 'Non-Member Pass';

        return {
          id: s.slip_id,
          dbId: s.id.toString(),
          meetingId: s.meeting_id,
          meetingName: parsedAct.isMembership ? 'สมัครสมาชิกสมาคม (Membership Registration)' : (s.meetings?.meeting_name || ''),
          memberNo: s.member_no,
          isMember: s.is_member,
          isMembershipRegistration: parsedAct.isMembership,
          memberPayload: parsedAct.memberPayload,
          nameTh,
          nameEn,
          email,
          phone,
          workplace,
          ticketType,
          ticketCode: s.ticket_code || '',
          amount: s.amount,
          bank: s.bank || defaultBank,
          transferTime: s.transfer_time || '',
          transferDate: s.transfer_date || '',
          refNo: s.ref_no || s.slip_id,
          slipUrl: s.slip_url,
          status: s.status as 'pending' | 'approved' | 'rejected',
          notes: s.rejection_reason || undefined,
          resubmitToken: s.resubmit_token,
          selectedActivities: parsedAct.activities,
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
        const parsedAct = parseActivitiesData(s.selected_activities);
        const isMember = s.is_member && s.member_full_name_th;
        const nameTh = isMember
          ? s.member_full_name_th
          : s.guest_name || parsedAct.memberPayload?.full_name_th || 'ผู้สมัครทั่วไป';
        const nameEn = isMember
          ? s.member_full_name_en || ''
          : parsedAct.memberPayload?.full_name_en || '';
        const email = isMember
          ? s.member_email || ''
          : s.guest_email || parsedAct.memberPayload?.email || '';
        const phone = isMember
          ? s.member_mobile || ''
          : s.guest_phone || parsedAct.memberPayload?.mobile || '';
        const workplace = isMember
          ? s.member_workplace || ''
          : s.guest_workplace || parsedAct.memberPayload?.workplace || '';

        const ticketType = parsedAct.isMembership
          ? 'Membership Registration'
          : s.is_member
          ? 'Member Pass'
          : 'Non-Member Pass';

        return {
          id: s.slip_id,
          dbId: s.id?.toString(),
          meetingId: s.meeting_id,
          meetingName: parsedAct.isMembership ? 'สมัครสมาชิกสมาคม (Membership Registration)' : (s.meeting_name || ''),
          memberNo: s.member_no,
          isMember: s.is_member,
          isMembershipRegistration: parsedAct.isMembership,
          memberPayload: parsedAct.memberPayload,
          nameTh,
          nameEn,
          email,
          phone,
          workplace,
          ticketType,
          ticketCode: s.ticket_code || '',
          amount: Number(s.amount) || 0,
          bank: s.bank || defaultBank,
          transferTime: s.transfer_time || '',
          transferDate: s.transfer_date || '',
          refNo: s.ref_no || s.slip_id,
          slipUrl: s.slip_url,
          status: s.status as 'pending' | 'approved' | 'rejected',
          notes: s.rejection_reason || undefined,
          resubmitToken: s.resubmit_token,
          selectedActivities: parsedAct.activities,
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
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสลิป' },
      { status: 500 }
    );
  }
}

// POST: Review slip (Approve / Reject / Reset)
export async function POST(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
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

    // Check if this slip is a membership registration request
    let isMembershipRegistration = false;
    let memberPayload: any = null;
    if (slip.selected_activities) {
      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch {}
      }
      if (actObj && typeof actObj === 'object' && actObj.type === 'membership_registration') {
        isMembershipRegistration = true;
        memberPayload = actObj.memberPayload;
      }
    }

    if (action === 'approve') {
      let assignedMemberNo = slip.member_no;

      // 1. If this is a membership registration slip and member_no is not yet created, create Member now!
      if (isMembershipRegistration && memberPayload && !assignedMemberNo) {
        try {
          const newMember = await createMember(memberPayload);
          assignedMemberNo = newMember.member_no;
        } catch (createErr: any) {
          console.error('Failed to create member on slip approval:', createErr);
          return NextResponse.json(
            { success: false, error: `ไม่สามารถสร้างข้อมูลสมาชิกได้: ${createErr.message || 'ข้อมูลไม่ถูกต้อง'}` },
            { status: 400 }
          );
        }
      }

      // 2. Update slip status to approved and attach member_no
      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'approved',
            member_no: assignedMemberNo || null,
            is_member: !!assignedMemberNo,
            rejection_reason: null,
            resubmit_token: null,
            reviewed_by: reviewer || 'Admin',
            reviewed_at: new Date(),
          },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE payment_slips
          SET status = 'approved',
              member_no = ${assignedMemberNo || null},
              is_member = ${!!assignedMemberNo},
              rejection_reason = NULL,
              resubmit_token = NULL,
              reviewed_by = ${reviewer || 'Admin'},
              reviewed_at = NOW(),
              updated_at = NOW()
          WHERE slip_id = ${slipId}
        `;
      }

      // 3. If conference meeting attendance exists, update meeting_attendances
      if (!isMembershipRegistration) {
        if (assignedMemberNo) {
          await prisma.$executeRaw`
            UPDATE meeting_attendances
            SET attendance_status = 'Registered'
            WHERE meeting_id = ${slip.meeting_id} AND member_no = ${assignedMemberNo}
          `;
        } else if (slip.guest_email) {
          await prisma.$executeRaw`
            UPDATE meeting_attendances
            SET attendance_status = 'Non-Member'
            WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${slip.guest_email}
          `;
        }
      }

      // 4. Send approval confirmation email
      const recipientEmail = slip.members?.email || slip.guest_email || memberPayload?.email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || memberPayload?.full_name_th || 'ผู้สมัครสมาชิก';

      if (recipientEmail) {
        try {
          if (isMembershipRegistration && assignedMemberNo) {
            await sendMembershipApprovedEmail({
              to: recipientEmail,
              recipientName,
              memberNo: assignedMemberNo,
              amountPaid: slip.amount,
            });
          } else {
            await sendRegistrationApprovedEmail({
              to: recipientEmail,
              recipientName,
              meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
              ticketCode: slip.ticket_code || '',
              amountPaid: slip.amount,
              isMember: slip.is_member,
            });
          }
        } catch (mailErr) {
          console.error('Failed to send approval email:', mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
          memberNo: assignedMemberNo,
          message: isMembershipRegistration
            ? `อนุมัติสลิปและบันทึกข้อมูลสมาชิกสำเร็จ (รหัสสมาชิก: ${assignedMemberNo})`
            : 'Slip approved and attendee confirmed successfully.',
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

      // Revert attendance status to pending if conference registration
      if (!isMembershipRegistration) {
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

      // Update attendance status to Rejected if conference registration
      if (!isMembershipRegistration) {
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

        // Auto Rollback Coupon Quota if this slip was associated with a coupon
        try {
          const couponUsage = await (prisma as any).coupon_usages.findFirst({
            where: {
              OR: [
                { slip_id: slip.slip_id },
                { ticket_code: slip.ticket_code },
              ],
            },
          });

          if (couponUsage) {
            await (prisma as any).coupons.update({
              where: { id: couponUsage.coupon_id },
              data: {
                used_count: { decrement: 1 },
              },
            });
            await (prisma as any).coupon_usages.delete({
              where: { id: couponUsage.id },
            });
          }
        } catch (couponRollbackErr) {
          console.error('Failed to auto-rollback coupon quota on slip rejection:', couponRollbackErr);
        }
      }

      // Send rejection & resubmit email stub
      const recipientEmail = slip.members?.email || slip.guest_email || memberPayload?.email || '';
      const recipientName = slip.members?.fullNameTh || slip.guest_name || memberPayload?.full_name_th || 'ผู้สมัคร';
      const origin = request.headers.get('origin') || (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');
      const baseUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL || origin || 'http://localhost:3000';
      const resubmitUrl = `${baseUrl}/resubmit-slip/${resubmitToken}`;

      if (recipientEmail) {
        try {
          await sendSlipRejectionEmail({
            to: recipientEmail,
            recipientName,
            meetingName: isMembershipRegistration
              ? 'การสมัครสมาชิก สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)'
              : (slip.meetings?.meeting_name || 'การประชุมวิชาการ สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)'),
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
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' },
      { status: 500 }
    );
  }
}

