import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendRegistrationApprovedEmail, sendSlipRejectionEmail, sendMembershipApprovedEmail, sendCompanyGroupMembershipApprovedEmail } from '@/lib/email';
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

    const parseActivitiesData = (act: any, slipAmount?: any) => {
      if (!act) return { activities: [], isMembership: false, isFormatChange: false, formatChangePayload: null, memberPayload: null };
      let parsed = act;
      if (typeof act === 'string') {
        try {
          parsed = JSON.parse(act);
        } catch {
          return { activities: [], isMembership: false, isFormatChange: false, formatChangePayload: null, memberPayload: null };
        }
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.type === 'membership_group_registration' || (parsed.isGroup && parsed.applicants))) {
        const applicantCount = parsed.applicants?.length || 1;
        const effectivePrice = Number(slipAmount) || Number(parsed.amount) || (applicantCount * 1000);
        return {
          activities: [{
            id: 'membership_group_registration',
            name: `ค่าสมัครสมาชิกแบบกลุ่ม (${parsed.companyName || 'Corporate'} - ${applicantCount} ท่าน)`,
            type: 'membership_group_registration',
            price: effectivePrice,
            rateBadgeTh: `กลุ่ม ${applicantCount} ท่าน`,
            rateBadgeEn: `Group (${applicantCount})`,
          }],
          isMembership: true,
          isGroupMembership: true,
          isGroupConference: false,
          isFormatChange: false,
          formatChangePayload: null,
          memberPayload: null,
          groupPayload: parsed,
        };
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.type === 'conference_group_registration' || (parsed.isGroup && (parsed.attendees || !parsed.applicants)))) {
        const attendeeCount = Array.isArray(parsed.attendees) ? parsed.attendees.length : 1;
        const attendeesSum = Array.isArray(parsed.attendees)
          ? parsed.attendees.reduce((sum: number, a: any) => sum + Number(a.subtotal || a.price || 0), 0)
          : 0;
        const effectivePrice = Number(slipAmount) || Number(parsed.amount) || attendeesSum || 0;
        const hasMemberAttendees = Array.isArray(parsed.attendees) && parsed.attendees.some((a: any) => a.isMember || a.memberNo);
        const groupActivities: any[] = [{
          id: 'conference_group_registration',
          name: hasMemberAttendees
            ? `ลงทะเบียนประชุมแบบกลุ่ม - สมาชิกสมาคม (${parsed.companyName || 'Corporate'} - รวม ${attendeeCount} ท่าน)`
            : `ลงทะเบียนประชุมแบบกลุ่ม (${parsed.companyName || 'Corporate'} - รวม ${attendeeCount} ท่าน)`,
          type: 'conference_group',
          price: effectivePrice,
          rateBadgeTh: hasMemberAttendees ? `กลุ่มสมาชิก ${attendeeCount} ท่าน` : `กลุ่ม ${attendeeCount} ท่าน`,
          rateBadgeEn: hasMemberAttendees ? `Member Group (${attendeeCount})` : `Group (${attendeeCount})`,
        }];

        return {
          activities: groupActivities,
          isMembership: false,
          isGroupMembership: false,
          isGroupConference: true,
          hasMemberAttendees,
          isFormatChange: false,
          formatChangePayload: null,
          memberPayload: null,
          groupPayload: parsed,
        };
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type === 'membership_registration') {
        const effectivePrice = Number(slipAmount) || Number(parsed.amount) || 1000;
        return {
          activities: [{
            id: 'membership_registration',
            name: 'ค่าสมัครสมาชิก (Membership Fee)',
            type: 'membership_registration',
            price: effectivePrice,
            rateBadgeTh: 'สมัครสมาชิกใหม่',
            rateBadgeEn: 'New Member',
          }],
          isMembership: true,
          isGroupMembership: false,
          isFormatChange: false,
          formatChangePayload: null,
          memberPayload: parsed.memberPayload || null,
          groupPayload: null,
        };
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.isFormatChange) {
        const origFmt = parsed.originalFormat === 'onsite' ? 'Onsite' : 'Online';
        const targetFmt = parsed.targetFormat === 'onsite' ? 'Onsite' : 'Online';
        const effectivePrice = Number(slipAmount) || Number(parsed.changeFee) || 1000;
        return {
          activities: [{
            id: 'format_change',
            name: `ค่าธรรมเนียมเปลี่ยนรูปแบบการเข้าร่วม (${origFmt} ➔ ${targetFmt})`,
            type: 'format_change',
            price: effectivePrice,
            rateBadgeTh: `เปลี่ยนเป็น ${targetFmt}`,
            rateBadgeEn: `Change to ${targetFmt}`,
          }],
          isMembership: false,
          isGroupMembership: false,
          isFormatChange: true,
          formatChangePayload: parsed,
          memberPayload: null,
          groupPayload: null,
        };
      }

      if (Array.isArray(parsed)) {
        const activities = parsed.map((actItem: any) => {
          if (parsed.length === 1 && (!actItem.price || Number(actItem.price) === 0) && Number(slipAmount) > 0) {
            return { ...actItem, price: Number(slipAmount) };
          }
          return actItem;
        });
        return { activities, isMembership: false, isFormatChange: false, formatChangePayload: null, memberPayload: null };
      }

      return { activities: [], isMembership: false, isFormatChange: false, formatChangePayload: null, memberPayload: null };
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

      const allTicketCodes = slips.map((s: any) => s.ticket_code).filter(Boolean);
      const allSlipIds = slips.map((s: any) => s.slip_id).filter(Boolean);

      let allCouponUsages: any[] = [];
      let allCoupons: any[] = [];
      try {
        allCouponUsages = await prisma.coupon_usages.findMany({
          where: {
            OR: [
              { ticket_code: { in: allTicketCodes } },
              { slip_id: { in: allSlipIds } },
            ],
          },
          include: {
            coupon: true,
          },
        });
        allCoupons = await prisma.coupons.findMany();
      } catch (cErr) {
        console.warn('Could not query coupon data for slips:', cErr);
      }

      formattedSlips = slips.map((s: any) => {
        const parsedAct = parseActivitiesData(s.selected_activities, s.amount);
        const hasMemberAttendees = Boolean(
          parsedAct.hasMemberAttendees ||
          (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees) &&
           parsedAct.groupPayload.attendees.some((a: any) => a.isMember || a.memberNo))
        );
        const isMember = (s.is_member && s.members) || hasMemberAttendees;
        const isGroupConference = parsedAct.isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-'));
        const isCorporate = parsedAct.isGroupMembership || isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-')) || Boolean(s.ticket_code?.startsWith('MEMGRP'));
        const companyName = parsedAct.groupPayload?.companyName || (isCorporate ? s.guest_workplace : null) || '';
        
        // Isolate company data from personal attendee data (Rule: do not mix personal with corporate)
        const nameTh = isCorporate && companyName
          ? companyName
          : isMember
            ? s.members?.fullNameTh || 'สมาชิก'
            : s.guest_name || parsedAct.memberPayload?.full_name_th || 'ผู้สมัครทั่วไป';
        const nameEn = isCorporate && companyName
          ? companyName
          : isMember
            ? s.members?.fullNameEn || ''
            : parsedAct.memberPayload?.full_name_en || '';

        // For corporate, use coordinator contact only, NEVER personal attendee email/phone
        const coordinatorEmail = parsedAct.groupPayload?.groupContact?.coordinatorEmail || null;
        const coordinatorPhone = parsedAct.groupPayload?.groupContact?.coordinatorPhone || null;
        const coordinatorName = parsedAct.groupPayload?.groupContact?.coordinatorName || null;

        const email = isCorporate
          ? (coordinatorEmail || '')
          : isMember
            ? s.members?.email || ''
            : s.guest_email || parsedAct.memberPayload?.email || '';
        const phone = isCorporate
          ? (coordinatorPhone || '')
          : isMember
            ? s.members?.mobile || ''
            : s.guest_phone || parsedAct.memberPayload?.mobile || '';
        const workplace = isCorporate
          ? companyName
          : isMember
            ? s.members?.workplace || ''
            : s.guest_workplace || parsedAct.memberPayload?.workplace || '';

        // Match coupon usages
        const matchedUsages = allCouponUsages.filter(
          (cu) => (s.ticket_code && cu.ticket_code === s.ticket_code) || (s.slip_id && cu.slip_id === s.slip_id)
        );

        let couponCode = parsedAct.groupPayload?.couponCode || parsedAct.groupPayload?.couponData?.code || null;
        if (!couponCode && matchedUsages.length > 0) {
          couponCode = matchedUsages[0]?.coupon?.code || null;
        }

        const couponRecord = couponCode
          ? allCoupons.find((c) => c.code?.toUpperCase() === couponCode?.toUpperCase()) || matchedUsages[0]?.coupon || null
          : null;

        const couponInfo = couponRecord
          ? {
              code: couponRecord.code,
              companyName: couponRecord.company_name,
              discountType: couponRecord.discount_type,
              discountValue: Number(couponRecord.discount_value) || 0,
              remarks: couponRecord.remarks,
              usedCount: matchedUsages.length,
            }
          : (parsedAct.groupPayload?.couponData
            ? {
                code: parsedAct.groupPayload.couponData.code || couponCode,
                companyName: parsedAct.groupPayload.couponData.companyName,
                discountType: parsedAct.groupPayload.couponData.discountType || 'free',
                discountValue: Number(parsedAct.groupPayload.couponData.discountValue) || 0,
                remarks: parsedAct.groupPayload.couponData.description,
                usedCount: parsedAct.groupPayload?.attendees?.length || 1,
              }
            : null);

        // Calculate total discount applied
        let discountTotal = 0;
        if (matchedUsages.length > 0) {
          const usageSum = matchedUsages.reduce((sum, cu) => sum + (Number(cu.discount_applied) || 0), 0);
          if (usageSum > 0) {
            discountTotal = usageSum;
          } else if (couponRecord?.discount_type === 'free') {
            // Free Main Program pass for each attendee
            discountTotal = matchedUsages.length * 4000;
          }
        }
        if (!discountTotal && parsedAct.groupPayload?.discountAmount) {
          discountTotal = Number(parsedAct.groupPayload.discountAmount) || 0;
        }

        const couponUsagesList = matchedUsages.map((cu) => ({
          id: cu.id.toString(),
          couponCode: cu.coupon?.code || couponCode,
          memberNo: cu.member_no,
          attendeeName: cu.attendee_name,
          attendeeEmail: cu.attendee_email,
          attendeePhone: cu.attendee_phone,
          workplace: cu.workplace,
          discountApplied: Number(cu.discount_applied) > 0 ? Number(cu.discount_applied) : (couponRecord?.discount_type === 'free' ? 4000 : 0),
          finalAmount: Number(cu.final_amount) || 0,
        }));

        const ticketType = parsedAct.isFormatChange
          ? `🔄 ขอเปลี่ยนเป็น ${parsedAct.formatChangePayload?.targetFormat === 'onsite' ? 'Onsite' : 'Online'}`
          : parsedAct.isMembership
            ? (parsedAct.isGroupMembership ? 'Group Membership' : 'Membership Registration')
            : isGroupConference
              ? (hasMemberAttendees
                  ? `Group Member Pass (${parsedAct.groupPayload?.attendees?.length || 0} ท่าน)`
                  : `Group Conference Pass (${parsedAct.groupPayload?.attendees?.length || 0} ท่าน)`)
              : s.is_member
                ? 'Member Pass'
                : 'Non-Member Pass';

        return {
          id: s.slip_id,
          dbId: s.id.toString(),
          meetingId: s.meeting_id,
          meetingName: parsedAct.isMembership
            ? 'สมัครสมาชิกสมาคม (Membership Registration)'
            : parsedAct.isFormatChange
              ? `แจ้งเปลี่ยนรูปแบบ - ${s.meetings?.meeting_name || ''}`
              : (s.meetings?.meeting_name || ''),
          memberNo: s.member_no,
          isMember: Boolean(s.is_member || hasMemberAttendees),
          isMembershipRegistration: parsedAct.isMembership,
          isGroupMembership: parsedAct.isGroupMembership,
          isGroupConference,
          groupPayload: parsedAct.groupPayload,
          companyName,
          coordinatorName,
          coordinatorEmail,
          coordinatorPhone,
          isFormatChange: parsedAct.isFormatChange,
          formatChangePayload: parsedAct.formatChangePayload,
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
          couponCode: couponCode || null,
          couponInfo: couponInfo || null,
          couponUsages: couponUsagesList,
          discountTotal: discountTotal || 0,
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

      const allTicketCodes = slips.map((s: any) => s.ticket_code).filter(Boolean);
      const allSlipIds = slips.map((s: any) => s.slip_id).filter(Boolean);

      let allCouponUsages: any[] = [];
      let allCoupons: any[] = [];
      try {
        allCouponUsages = await prisma.coupon_usages.findMany({
          where: {
            OR: [
              { ticket_code: { in: allTicketCodes } },
              { slip_id: { in: allSlipIds } },
            ],
          },
          include: {
            coupon: true,
          },
        });
        allCoupons = await prisma.coupons.findMany();
      } catch (cErr) {
        console.warn('Could not query coupon data for fallback slips:', cErr);
      }

      formattedSlips = slips.map((s: any) => {
        const parsedAct = parseActivitiesData(s.selected_activities, s.amount);
        const hasMemberAttendees = Boolean(
          parsedAct.hasMemberAttendees ||
          (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees) &&
           parsedAct.groupPayload.attendees.some((a: any) => a.isMember || a.memberNo))
        );
        const isMember = (s.is_member && s.member_full_name_th) || hasMemberAttendees;
        const isGroupConference = parsedAct.isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-'));
        const isCorporate = parsedAct.isGroupMembership || isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-')) || Boolean(s.ticket_code?.startsWith('MEMGRP'));
        const companyName = parsedAct.groupPayload?.companyName || (isCorporate ? (s.guest_workplace || s.member_workplace) : null) || '';
        const nameTh = isCorporate && companyName
          ? companyName
          : isMember
            ? s.member_full_name_th
            : s.guest_name || parsedAct.memberPayload?.full_name_th || 'ผู้สมัครทั่วไป';
        const nameEn = isCorporate && companyName
          ? companyName
          : isMember
            ? s.member_full_name_en || ''
            : parsedAct.memberPayload?.full_name_en || '';

        const coordinatorEmail = parsedAct.groupPayload?.groupContact?.coordinatorEmail || null;
        const coordinatorPhone = parsedAct.groupPayload?.groupContact?.coordinatorPhone || null;
        const coordinatorName = parsedAct.groupPayload?.groupContact?.coordinatorName || null;

        const email = isCorporate
          ? (coordinatorEmail || '')
          : isMember
            ? s.member_email || ''
            : s.guest_email || parsedAct.memberPayload?.email || '';
        const phone = isCorporate
          ? (coordinatorPhone || '')
          : isMember
            ? s.member_mobile || ''
            : s.guest_phone || parsedAct.memberPayload?.mobile || '';
        const workplace = isCorporate
          ? companyName
          : isMember
            ? s.member_workplace || ''
            : s.guest_workplace || parsedAct.memberPayload?.workplace || '';

        const matchedUsages = allCouponUsages.filter(
          (cu) => (s.ticket_code && cu.ticket_code === s.ticket_code) || (s.slip_id && cu.slip_id === s.slip_id)
        );

        let couponCode = parsedAct.groupPayload?.couponCode || parsedAct.groupPayload?.couponData?.code || null;
        if (!couponCode && matchedUsages.length > 0) {
          couponCode = matchedUsages[0]?.coupon?.code || null;
        }

        const couponRecord = couponCode
          ? allCoupons.find((c) => c.code?.toUpperCase() === couponCode?.toUpperCase()) || matchedUsages[0]?.coupon || null
          : null;

        const couponInfo = couponRecord
          ? {
              code: couponRecord.code,
              companyName: couponRecord.company_name,
              discountType: couponRecord.discount_type,
              discountValue: Number(couponRecord.discount_value) || 0,
              remarks: couponRecord.remarks,
              usedCount: matchedUsages.length,
            }
          : (parsedAct.groupPayload?.couponData
            ? {
                code: parsedAct.groupPayload.couponData.code || couponCode,
                companyName: parsedAct.groupPayload.couponData.companyName,
                discountType: parsedAct.groupPayload.couponData.discountType || 'free',
                discountValue: Number(parsedAct.groupPayload.couponData.discountValue) || 0,
                remarks: parsedAct.groupPayload.couponData.description,
                usedCount: parsedAct.groupPayload?.attendees?.length || 1,
              }
            : null);

        let discountTotal = 0;
        if (matchedUsages.length > 0) {
          const usageSum = matchedUsages.reduce((sum, cu) => sum + (Number(cu.discount_applied) || 0), 0);
          if (usageSum > 0) {
            discountTotal = usageSum;
          } else if (couponRecord?.discount_type === 'free') {
            discountTotal = matchedUsages.length * 4000;
          }
        }
        if (!discountTotal && parsedAct.groupPayload?.discountAmount) {
          discountTotal = Number(parsedAct.groupPayload.discountAmount) || 0;
        }

        const couponUsagesList = matchedUsages.map((cu) => ({
          id: cu.id.toString(),
          couponCode: cu.coupon?.code || couponCode,
          memberNo: cu.member_no,
          attendeeName: cu.attendee_name,
          attendeeEmail: cu.attendee_email,
          attendeePhone: cu.attendee_phone,
          workplace: cu.workplace,
          discountApplied: Number(cu.discount_applied) > 0 ? Number(cu.discount_applied) : (couponRecord?.discount_type === 'free' ? 4000 : 0),
          finalAmount: Number(cu.final_amount) || 0,
        }));

        const ticketType = parsedAct.isMembership
          ? (parsedAct.isGroupMembership ? 'Group Membership' : 'Membership Registration')
          : isGroupConference
            ? (hasMemberAttendees
                ? `Group Member Pass (${parsedAct.groupPayload?.attendees?.length || 0} ท่าน)`
                : `Group Conference Pass (${parsedAct.groupPayload?.attendees?.length || 0} ท่าน)`)
            : s.is_member
              ? 'Member Pass'
              : 'Non-Member Pass';

        return {
          id: s.slip_id,
          dbId: s.id?.toString(),
          meetingId: s.meeting_id,
          meetingName: parsedAct.isMembership ? 'สมัครสมาชิกสมาคม (Membership Registration)' : (s.meeting_name || ''),
          memberNo: s.member_no,
          isMember: Boolean(s.is_member || hasMemberAttendees),
          isMembershipRegistration: parsedAct.isMembership,
          isGroupMembership: parsedAct.isGroupMembership,
          isGroupConference,
          groupPayload: parsedAct.groupPayload,
          companyName,
          coordinatorName,
          coordinatorEmail,
          coordinatorPhone,
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
          couponCode: couponCode || null,
          couponInfo: couponInfo || null,
          couponUsages: couponUsagesList,
          discountTotal: discountTotal || 0,
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
    const { slipId, action, notes, reviewer, rejectType } = body;

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

    // Check if this slip is a membership registration or format change request
    let isMembershipRegistration = false;
    let isGroupMembership = false;
    let isGroupConference = false;
    let isFormatChange = false;
    let memberPayload: any = null;
    let groupPayload: any = null;
    let formatChangePayload: any = null;

    if (slip.ticket_code?.startsWith('MEMGRP') || slip.ticket_code?.startsWith('MEM-') || slip.meeting_id === 'membership') {
      isMembershipRegistration = true;
      if (slip.ticket_code?.startsWith('MEMGRP')) {
        isGroupMembership = true;
      }
    }

    if (slip.selected_activities) {
      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.type === 'membership_group_registration' || (actObj.isGroup && actObj.applicants)) {
          isMembershipRegistration = true;
          isGroupMembership = true;
          groupPayload = actObj;
        } else if (actObj.type === 'membership_registration') {
          isMembershipRegistration = true;
          memberPayload = actObj.memberPayload;
        } else if (actObj.isGroup && actObj.attendees) {
          isGroupConference = true;
          groupPayload = actObj;
        } else if (actObj.isFormatChange) {
          isFormatChange = true;
          formatChangePayload = actObj;
        }
      }
    }

    if (action === 'approve') {
      let assignedMemberNo = slip.member_no;

      // 1. If this is a group membership registration slip, create members for all applicants!
      if (isGroupMembership && groupPayload?.applicants && Array.isArray(groupPayload.applicants)) {
        // Pre-validate all applicants to ensure none use sponsor company emails
        for (let i = 0; i < groupPayload.applicants.length; i++) {
          const applicant = groupPayload.applicants[i];
          const cleanEmail = applicant.email?.trim()?.toLowerCase();
          if (cleanEmail) {
            const sponsorMatch = await (prisma as any).sponsors.findFirst({
              where: { contact_email: { equals: cleanEmail, mode: 'insensitive' } },
              select: { name: true },
            });
            if (sponsorMatch) {
              return NextResponse.json(
                {
                  success: false,
                  error: `ไม่สามารถอนุมัติได้: ผู้สมัครลำดับที่ ${i + 1} (${applicant.full_name_th || 'ผู้สมัคร'}) ใช้อีเมลเดียวกับบริษัท (${sponsorMatch.name}) กรุณาแก้ไขอีเมลของผู้สมัครก่อนอนุมัติ`,
                },
                { status: 400 }
              );
            }
          }
        }

        try {
          const approvedApplicants: Array<{ name: string; email: string; memberNo: string }> = [];

          for (const applicant of groupPayload.applicants) {
            const cleanEmail = applicant.email?.trim()?.toLowerCase();
            const existing = cleanEmail ? await prisma.member.findFirst({
              where: { email: { equals: cleanEmail, mode: 'insensitive' } },
            }) : null;

            let applicantMemberNo = existing?.member_no || '';

            if (!existing) {
              const created = await createMember(applicant);
              applicantMemberNo = created.member_no || '';
              if (applicant.email) {
                // Send approval email to individual member in background without blocking response
                sendMembershipApprovedEmail({
                  to: applicant.email,
                  recipientName: applicant.full_name_th || applicant.full_name_en || 'สมาชิก',
                  memberNo: applicantMemberNo,
                  amountPaid: 1000,
                }).catch((e) => console.error('Failed to send group member approval email:', e));
              }
            }

            approvedApplicants.push({
              name: applicant.full_name_th || applicant.full_name_en || 'ผู้สมัคร',
              email: applicant.email || '',
              memberNo: applicantMemberNo,
            });
          }

          // Send approval summary email to company / coordinator
          let companyEmail =
            groupPayload.groupContact?.coordinatorEmail?.trim() ||
            groupPayload.companyEmail?.trim();

          const companyName =
            groupPayload.companyName?.trim() ||
            slip.guest_workplace?.trim() ||
            'บริษัท / องค์กร';

          if (!companyEmail && companyName) {
            const sp = await (prisma as any).sponsors.findFirst({
              where: { name: { equals: companyName, mode: 'insensitive' } },
              select: { contact_email: true },
            });
            if (sp?.contact_email) {
              companyEmail = sp.contact_email.trim();
            }
          }

          if (!companyEmail && slip.guest_email) {
            companyEmail = slip.guest_email.trim();
          }

          const coordinatorName =
            groupPayload.groupContact?.coordinatorName?.trim() ||
            companyName;

          const isPayLater =
            slip.slip_url === 'PAY_LATER' ||
            (typeof slip.bank === 'string' && slip.bank.includes('ชำระเงินภายหลัง'));

          if (companyEmail && approvedApplicants.length > 0) {
            sendCompanyGroupMembershipApprovedEmail({
              to: companyEmail,
              companyName,
              coordinatorName,
              ticketCode: slip.ticket_code || slip.slip_id,
              amountPaid: slip.amount || approvedApplicants.length * 1000,
              isPayLater,
              applicants: approvedApplicants,
            }).catch((companyMailErr) =>
              console.error('Failed to send company group approval email:', companyMailErr)
            );
          }
        } catch (grpCreateErr: any) {
          console.error('Failed to create group members on slip approval:', grpCreateErr);
        }
      } else if (isMembershipRegistration && memberPayload && !assignedMemberNo) {
        // Individual membership registration
        const cleanEmail = memberPayload.email?.trim()?.toLowerCase();
        if (cleanEmail) {
          const sponsorMatch = await (prisma as any).sponsors.findFirst({
            where: { contact_email: { equals: cleanEmail, mode: 'insensitive' } },
            select: { name: true },
          });
          if (sponsorMatch) {
            return NextResponse.json(
              {
                success: false,
                error: `ไม่สามารถอนุมัติได้: ผู้สมัคร (${memberPayload.full_name_th || 'ผู้สมัคร'}) ใช้อีเมลเดียวกับบริษัท (${sponsorMatch.name}) กรุณาแก้ไขอีเมลของผู้สมัครก่อนอนุมัติ`,
              },
              { status: 400 }
            );
          }
        }

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
      const hasMemberAttendeesInGroup = Boolean(
        groupPayload?.attendees &&
        Array.isArray(groupPayload.attendees) &&
        groupPayload.attendees.some((a: any) => a.isMember || a.memberNo)
      );

      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'approved',
            member_no: assignedMemberNo || null,
            is_member: !!assignedMemberNo || hasMemberAttendeesInGroup,
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
              is_member = ${!!assignedMemberNo || hasMemberAttendeesInGroup},
              rejection_reason = NULL,
              resubmit_token = NULL,
              reviewed_by = ${reviewer || 'Admin'},
              reviewed_at = NOW(),
              updated_at = NOW()
          WHERE slip_id = ${slipId}
        `;
      }

      // 3. If this is a format change slip, update the original registration slip
      if (isFormatChange && formatChangePayload) {
        try {
          const targetFormat = formatChangePayload.targetFormat;
          const origSlipId = formatChangePayload.originalSlipId;

          let origSlip = null;
          if (origSlipId) {
            origSlip = await (prisma as any).payment_slips.findUnique({
              where: { slip_id: origSlipId },
            });
          }

          if (!origSlip && (slip.ticket_code || assignedMemberNo)) {
            origSlip = await (prisma as any).payment_slips.findFirst({
              where: {
                meeting_id: slip.meeting_id,
                OR: [
                  ...(slip.ticket_code ? [{ ticket_code: slip.ticket_code }] : []),
                  ...(assignedMemberNo ? [{ member_no: assignedMemberNo }] : []),
                ],
                slip_id: { not: slipId },
              },
            });
          }

          if (origSlip) {
            let origActs = origSlip.selected_activities;
            if (typeof origActs === 'string') {
              try { origActs = JSON.parse(origActs); } catch { }
            }

            if (Array.isArray(origActs)) {
              origActs = origActs.map((item: any) => ({
                ...item,
                format: targetFormat,
              }));
            } else if (origActs && typeof origActs === 'object') {
              origActs = {
                ...origActs,
                format: targetFormat,
                attendanceType: targetFormat,
              };
            }

            await (prisma as any).payment_slips.update({
              where: { slip_id: origSlip.slip_id },
              data: {
                selected_activities: origActs as any,
              },
            });
          }
        } catch (fmtErr) {
          console.error('Error updating original registration format:', fmtErr);
        }
      }

      // 4. If conference meeting attendance exists, update meeting_attendances
      if (!isMembershipRegistration) {
        if (isGroupConference && groupPayload?.attendees && Array.isArray(groupPayload.attendees)) {
          for (const att of groupPayload.attendees) {
            if (att.isMember && att.memberNo) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Registered'
                WHERE meeting_id = ${slip.meeting_id} AND member_no = ${att.memberNo.trim()}
              `;
            } else if (att.email) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Non-Member'
                WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${att.email.trim().toLowerCase()}
              `;
            }
          }
        } else if (assignedMemberNo) {
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

      // 5. Send approval confirmation email (asynchronously in background)
      if (isMembershipRegistration) {
        // Individual membership registration
        if (!isGroupMembership) {
          const recipientEmail = slip.members?.email || slip.guest_email || memberPayload?.email || '';
          const recipientName = slip.members?.fullNameTh || slip.guest_name || memberPayload?.full_name_th || 'ผู้สมัครสมาชิก';
          if (recipientEmail) {
            sendMembershipApprovedEmail({
              to: recipientEmail,
              recipientName,
              memberNo: assignedMemberNo || '',
              amountPaid: slip.amount,
            }).catch((mailErr) => console.error('Failed to send membership approval email:', mailErr));
          }
        }
      } else {
        // ONLY for conference/meeting registrations
        const recipientEmail = slip.members?.email || slip.guest_email || '';
        const recipientName = slip.members?.fullNameTh || slip.guest_name || 'ผู้ลงทะเบียน';

        if (recipientEmail) {
          sendRegistrationApprovedEmail({
            to: recipientEmail,
            recipientName,
            meetingName: slip.meetings?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
            ticketCode: slip.ticket_code || '',
            amountPaid: slip.amount,
            isMember: slip.is_member,
          }).catch((mailErr) => console.error('Failed to send conference registration approval email:', mailErr));
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'approved',
          memberNo: assignedMemberNo,
          message: isMembershipRegistration
            ? `อนุมัติสิทธิ์และบันทึกข้อมูลสมาชิกสำเร็จ (รหัสสมาชิก: ${assignedMemberNo || 'Group'})`
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
      const rejectionReason = notes || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง';
      const effectiveRejectType: 'info' | 'slip' = rejectType || (rejectionReason.includes('ข้อมูล') && !rejectionReason.includes('สลิป') ? 'info' : 'slip');

      // Update selected_activities to include rejectType
      let updatedActivities = slip.selected_activities;
      try {
        let act = typeof slip.selected_activities === 'string'
          ? JSON.parse(slip.selected_activities)
          : (slip.selected_activities || {});
        if (typeof act === 'object' && !Array.isArray(act)) {
          act.rejectType = effectiveRejectType;
          updatedActivities = act;
        } else if (Array.isArray(act)) {
          updatedActivities = {
            activities: act,
            rejectType: effectiveRejectType,
          };
        }
      } catch {}

      if ((prisma as any).payment_slips) {
        await (prisma as any).payment_slips.update({
          where: { slip_id: slipId },
          data: {
            status: 'rejected',
            rejection_reason: rejectionReason,
            resubmit_token: resubmitToken,
            reviewed_by: reviewer || 'Admin',
            reviewed_at: new Date(),
            selected_activities: updatedActivities,
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

      // Determine if corporate/group registration
      const isCorporate = Boolean(
        isGroupMembership ||
        isGroupConference ||
        slip.ticket_code?.startsWith('MEMGRP') ||
        groupPayload ||
        slip.guest_name?.includes('ท่าน')
      );

      const effectiveCompanyName = groupPayload?.companyName || slip.guest_workplace || slip.members?.workplace || (isCorporate ? slip.guest_name?.replace(/\s*\(\d+\s*ท่าน\)/, '') : '');

      // Send rejection & resubmit email stub
      const recipientEmail = slip.members?.email || slip.guest_email || memberPayload?.email || '';
      const recipientName = isCorporate && effectiveCompanyName
        ? effectiveCompanyName
        : (slip.members?.fullNameTh || slip.guest_name || memberPayload?.full_name_th || 'ผู้สมัคร');

      // แสดงแค่ข้อมูลบริษัท ถ้าเป็นองค์กร/กลุ่ม อย่าดึงเบอร์โทรของผู้สมัครมาปน
      const applicantPhone = isCorporate ? undefined : (slip.members?.mobile || slip.guest_phone || memberPayload?.mobile || '');
      const applicantWorkplace = isCorporate ? undefined : (slip.members?.workplace || slip.guest_workplace || memberPayload?.workplace || '');

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
            ticketCode: slip.ticket_code || '',
            amount: slip.amount,
            applicantEmail: recipientEmail,
            applicantPhone,
            applicantWorkplace,
            isCorporate,
            companyName: effectiveCompanyName || undefined,
            rejectType: effectiveRejectType,
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

