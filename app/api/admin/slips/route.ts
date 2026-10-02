import { NextRequest, NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { 
  sendRegistrationApprovedEmail, 
  sendSlipRejectionEmail, 
  sendMembershipApprovedEmail, 
  sendCompanyGroupMembershipApprovedEmail,
  sendAttendeeSponsoredRegistrationEmail
} from '@/lib/email';
import { createMember } from '@/lib/services/memberService';
import { getSystemSettings } from '@/lib/services/settingsService';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { createReceiptForApprovedSlip } from '@/lib/services/receiptService';
import { getAdminAttachedSlipUrl } from '@/lib/adminAttachedSlip';
import {
  ADD_ON_MERGED_STATUS,
  AddOnMergeError,
  isAddOnPayload,
  mergeAddOnSlip,
  mergeGroupAddOnAttendees,
  parseSlipPayload,
  slipActivityList,
} from '@/lib/services/registrationAddOnService';

const normalizeMemberNo = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');

type GroupPaidInfo = { slipId: string; ticketCode: string; companyName: string; price: number };

/**
 * กิจกรรมที่บริษัทลงทะเบียนเพิ่มให้สมาชิก (รวมเข้ารายการเดิมแต่ยอดเงินอยู่ในบิลกลุ่ม)
 * อ่านจาก marker ใน addOnSlipIds รูปแบบ `${groupSlipId}:${memberNo}` → Map<originalSlipId, Map<activityId, ผู้ชำระ>>
 */
async function resolveGroupPaidActivities(slips: any[]): Promise<Map<string, Map<string, GroupPaidInfo>>> {
  const result = new Map<string, Map<string, GroupPaidInfo>>();
  try {
    const markersBySlip = new Map<string, { groupSlipId: string; memberKey: string }[]>();
    slips.forEach((s: any) => {
      const ids = parseSlipPayload(s.selected_activities)?.addOnSlipIds;
      if (!Array.isArray(ids)) return;
      const markers = ids
        .map((m: unknown) => String(m))
        .filter((m: string) => m.includes(':'))
        .map((m: string) => {
          const i = m.lastIndexOf(':');
          return { groupSlipId: m.slice(0, i), memberKey: normalizeMemberNo(m.slice(i + 1)) };
        });
      if (markers.length > 0) markersBySlip.set(s.slip_id, markers);
    });
    const groupSlipIds = Array.from(new Set(Array.from(markersBySlip.values()).flat().map((m) => m.groupSlipId)));
    if (groupSlipIds.length === 0) return result;

    const groupSlips = await prisma.payment_slips.findMany({
      where: { slip_id: { in: groupSlipIds } },
      select: { slip_id: true, ticket_code: true, guest_name: true, selected_activities: true },
    });
    const groupById = new Map(groupSlips.map((g) => [g.slip_id, g]));
    markersBySlip.forEach((markers, originalId) => {
      const paid = new Map<string, GroupPaidInfo>();
      markers.forEach(({ groupSlipId, memberKey }) => {
        const group = groupById.get(groupSlipId);
        const payload = parseSlipPayload(group?.selected_activities);
        if (!group || !Array.isArray(payload?.attendees)) return;
        const att = payload.attendees.find((a: any) =>
          a?.isAddOn &&
          a.addOnOriginalSlipId === originalId &&
          normalizeMemberNo(a.memberNo || a.member_no) === memberKey
        );
        if (!att) return;
        const acts: any[] = Array.isArray(att.selectedActivities) && typeof att.selectedActivities[0] === 'object'
          ? att.selectedActivities
          : (att.selectedProgramIds || []).map((id: string) => ({ id }));
        acts.forEach((a: any) => {
          if (!a?.id) return;
          paid.set(String(a.id), {
            slipId: group.slip_id,
            ticketCode: group.ticket_code || '',
            companyName: payload.companyName || payload.groupContact?.coordinatorName || group.guest_name || '',
            price: Number(a.price) || 0,
          });
        });
      });
      if (paid.size > 0) result.set(originalId, paid);
    });
  } catch (err) {
    console.warn('Could not resolve group-paid add-on activities:', err);
  }
  return result;
}

/** ติดป้ายผู้ชำระ (บริษัท) ให้กิจกรรมที่ชำระในบิลกลุ่ม */
function tagGroupPaidActivities(activities: any, paid: Map<string, GroupPaidInfo> | undefined) {
  if (!paid || !Array.isArray(activities)) return activities;
  return activities.map((a: any) => {
    const by = a?.id ? paid.get(String(a.id)) : undefined;
    return by ? { ...a, paidByGroup: by } : a;
  });
}
import { assertSeatsForReactivatedSlip, SeatUnavailableError } from '@/lib/services/activitySeatService';

// ส่งอีเมล (รวมงานใน after()) ทีละฉบับ — ให้เวลาพอสำหรับกลุ่มใหญ่
export const maxDuration = 300;

const MAIN_PROGRAM_PRICE = 4000;

function attendeeHasMainProgram(att: any): boolean {
  const acts = [
    ...(Array.isArray(att?.selectedActivities) ? att.selectedActivities : []),
    ...(Array.isArray(att?.activities) ? att.activities : []),
  ];
  // ไม่มีข้อมูลกิจกรรม = ลงเฉพาะการประชุมหลัก
  if (acts.length === 0 && !att?.programNameTh && !att?.programNameEn) return true;
  const isMainName = (name: unknown) => {
    const n = String(name || '').toLowerCase();
    return n.includes('การประชุมหลัก') || n.includes('main');
  };
  return (
    acts.some((a: any) =>
      typeof a === 'object' && a !== null
        ? a.type === 'main' || a.id === 'main' || isMainName(a.name)
        : a === 'main' || isMainName(a)
    ) ||
    isMainName(att?.programNameTh) ||
    isMainName(att?.programNameEn)
  );
}

/**
 * ส่วนลดคูปองของผู้ลงทะเบียนในกลุ่ม: ใช้ค่าที่บันทึกไว้ตอนลงทะเบียน (รวมถึง 0)
 * ประมาณค่าเฉพาะรายการเก่าที่ไม่มีข้อมูลส่วนลด โดยคูปองครอบคลุมเฉพาะการประชุมหลักของสมาชิก
 */
function estimateAttendeeCouponDiscount(att: any, couponRecord: any): number {
  if (!att || att.isAddOn) return 0;
  const stored = att.discountTotal ?? att.discountAmount;
  if (stored !== undefined && stored !== null && stored !== '') return Number(stored) || 0;

  const isMember = Boolean(att.isMember || att.memberNo) && !att.isExpiredMember;
  if (!isMember) return 0;
  const type = String(couponRecord?.discount_type || 'free').toLowerCase();
  if (type === 'fixed') return Number(couponRecord?.discount_value) || 0;
  if (type === 'percent') {
    const attPrice = Number(att.subtotal || att.price || 0);
    return Math.round(attPrice * ((Number(couponRecord?.discount_value) || 0) / 100));
  }
  return attendeeHasMainProgram(att) ? MAIN_PROGRAM_PRICE : 0;
}

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

    const parseActivitiesData = (act: any, slipAmount?: any): any => {
      if (!act) return { activities: [], isMembership: false, isGroupMembership: false, isGroupConference: false, isFormatChange: false, formatChangePayload: null, memberPayload: null, guestPayload: null, groupPayload: null };
      let parsed = act;
      if (typeof act === 'string') {
        try {
          parsed = JSON.parse(act);
        } catch {
          return { activities: [], isMembership: false, isGroupMembership: false, isGroupConference: false, isFormatChange: false, formatChangePayload: null, memberPayload: null, guestPayload: null, groupPayload: null };
        }
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        (parsed.type === 'membership_group_registration' || (parsed.isGroup && Array.isArray(parsed.applicants) && parsed.applicants.length > 0))
      ) {
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
          guestPayload: null,
          groupPayload: parsed,
        };
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        (parsed.type === 'conference_group_registration' || (parsed.isGroup && Array.isArray(parsed.attendees) && parsed.attendees.length > 0))
      ) {
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
          guestPayload: null,
          groupPayload: parsed,
        };
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type === 'membership_registration') {
        const effectivePrice = Number(slipAmount) || Number(parsed.amount) || 1000;
        return {
          activities: [{
            id: 'membership_registration',
            name: 'ค่าสมัครสมาชิก',
            type: 'membership_registration',
            price: effectivePrice,
            rateBadgeTh: 'สมัครสมาชิกใหม่',
            rateBadgeEn: 'New Member',
          }],
          isMembership: true,
          isGroupMembership: false,
          isGroupConference: false,
          isFormatChange: false,
          formatChangePayload: null,
          memberPayload: parsed.memberPayload || null,
          guestPayload: null,
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
          isGroupConference: false,
          isFormatChange: true,
          formatChangePayload: parsed,
          memberPayload: null,
          guestPayload: null,
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
        return { activities, isMembership: false, isGroupMembership: false, isGroupConference: false, isFormatChange: false, formatChangePayload: null, memberPayload: null, guestPayload: null, groupPayload: null };
      }

      if (parsed && typeof parsed === 'object') {
        const actsList = Array.isArray(parsed.activities)
          ? parsed.activities
          : (Array.isArray(parsed.selectedActivities) ? parsed.selectedActivities : []);

        const activities = actsList.map((actItem: any) => {
          if (actsList.length === 1 && (!actItem.price || Number(actItem.price) === 0) && Number(slipAmount) > 0) {
            return { ...actItem, price: Number(slipAmount) };
          }
          return actItem;
        });

        if (activities.length === 0 && (parsed.programNameTh || parsed.selectedPackage || (slipAmount && Number(slipAmount) > 0))) {
          activities.push({
            id: 'registration_package',
            name: parsed.programNameTh || parsed.selectedPackage || 'การลงทะเบียนประชุมวิชาการ',
            price: Number(slipAmount) || 0,
          });
        }

        const guestPayload = {
          nameTh: parsed.nameTh || (parsed.attendees?.[0]?.nameTh) || null,
          nameEn: parsed.nameEn || (parsed.attendees?.[0]?.nameEn) || null,
          email: parsed.email || (parsed.attendees?.[0]?.email) || null,
          phone: parsed.phone || (parsed.attendees?.[0]?.phone) || parsed.mobile || (parsed.attendees?.[0]?.mobile) || null,
          workplace: parsed.workplace || (parsed.attendees?.[0]?.workplace) || null,
          position: parsed.position || (parsed.attendees?.[0]?.position) || null,
          positionCode: parsed.positionCode || (parsed.attendees?.[0]?.positionCode) || null,
          attendanceType: parsed.attendanceType || (parsed.attendees?.[0]?.attendanceType) || null,
          dietaryPreference: parsed.dietaryPreference || (parsed.attendees?.[0]?.dietaryPreference) || null,
          foodAllergies: parsed.foodAllergies || (parsed.attendees?.[0]?.foodAllergies) || null,
          specialRequirements: parsed.specialRequirements || (parsed.attendees?.[0]?.specialRequirements) || null,
          isFellow: Boolean(parsed.isFellow || parsed.priceTier === 'fellow' || parsed.attendees?.[0]?.isFellow),
        };

        return {
          activities,
          isMembership: Boolean(parsed.type === 'membership_registration' || parsed.memberPayload),
          isGroupMembership: false,
          isGroupConference: false,
          isFormatChange: false,
          formatChangePayload: null,
          memberPayload: parsed.memberPayload || null,
          guestPayload,
          groupPayload: null,
        };
      }

      return { activities: [], isMembership: false, isGroupMembership: false, isGroupConference: false, isFormatChange: false, formatChangePayload: null, memberPayload: null, guestPayload: null, groupPayload: null };
    };

    const resolveSlipCouponAndDiscount = (
      s: any,
      parsedAct: any,
      companyName: string,
      ctx: {
        allCoupons: any[];
        allCouponUsages: any[];
        allSponsorGroupMembers: any[];
        allMeetingAttendances: any[];
      }
    ) => {
      const { allCoupons, allCouponUsages, allSponsorGroupMembers, allMeetingAttendances } = ctx;

      const matchedUsages = allCouponUsages.filter(
        (cu: any) => (s.ticket_code && cu.ticket_code === s.ticket_code) || (s.slip_id && cu.slip_id === s.slip_id)
      );

      const matchedSgm = allSponsorGroupMembers.filter(
        (sgm: any) => s.ticket_code && sgm.ticket_code === s.ticket_code
      );

      let couponCode = parsedAct.groupPayload?.couponCode || parsedAct.groupPayload?.couponData?.code || null;
      if (!couponCode && matchedUsages.length > 0) {
        couponCode = matchedUsages[0]?.coupon?.code || null;
      }
      if (!couponCode && matchedSgm.length > 0) {
        couponCode = matchedSgm.find((m: any) => m.coupon_code)?.coupon_code || null;
      }
      // ดูคูปองจาก meeting_attendances เฉพาะรายการกลุ่ม — รายบุคคลไม่มีคูปอง
      // (สมาชิกที่เคยลงแบบกลุ่มแล้วลงรายบุคคลเพิ่ม จะมีคูปองของรายการกลุ่มติดอยู่ที่ attendance)
      if (!couponCode && parsedAct.groupPayload) {
        const matchedAtt = allMeetingAttendances.find(
          (a: any) => a.meeting_id === s.meeting_id && (
            (s.member_no && a.member_no === s.member_no) ||
            (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees) &&
             parsedAct.groupPayload.attendees.some((att: any) => att.memberNo && att.memberNo === a.member_no))
          )
        );
        if (matchedAtt?.coupon_code) {
          couponCode = matchedAtt.coupon_code;
        }
      }

      const couponRecord = couponCode
        ? allCoupons.find((c: any) => c.code?.toUpperCase() === couponCode?.toUpperCase()) || matchedUsages[0]?.coupon || null
        : null;

      const attendees = parsedAct.groupPayload?.attendees || [];
      const attendeesCount = Array.isArray(attendees) ? attendees.length : 1;

      const couponInfo = couponRecord
        ? {
            code: couponRecord.code,
            companyName: couponRecord.company_name,
            discountType: couponRecord.discount_type,
            discountValue: Number(couponRecord.discount_value) || 0,
            remarks: couponRecord.remarks,
            usedCount: matchedUsages.length || matchedSgm.length || attendeesCount,
          }
        : (parsedAct.groupPayload?.couponData
          ? {
              code: parsedAct.groupPayload.couponData.code || couponCode,
              companyName: parsedAct.groupPayload.couponData.companyName,
              discountType: parsedAct.groupPayload.couponData.discountType || 'free',
              discountValue: Number(parsedAct.groupPayload.couponData.discountValue) || 0,
              remarks: parsedAct.groupPayload.couponData.description,
              usedCount: attendeesCount,
            }
          : (couponCode
            ? {
                code: couponCode,
                companyName: companyName,
                discountType: 'free',
                discountValue: 0,
                remarks: null,
                usedCount: matchedSgm.length || attendeesCount,
              }
            : null));

      // 1. Calculate discount across attendees if group attendees are present
      let calculatedAttendeesDiscount = 0;
      if (Array.isArray(attendees) && attendees.length > 0) {
        calculatedAttendeesDiscount = attendees.reduce((sum: number, att: any) => {
          const matchedCu = matchedUsages.find(
            (cu: any) => (att.memberNo && cu.member_no === att.memberNo) ||
              (att.email && cu.attendee_email?.toLowerCase() === att.email.toLowerCase()) ||
              (att.nameTh && cu.attendee_name === att.nameTh)
          );
          if (matchedCu?.discount_applied && Number(matchedCu.discount_applied) > 0) {
            return sum + Number(matchedCu.discount_applied);
          }
          return sum + (couponCode ? estimateAttendeeCouponDiscount(att, couponRecord) : 0);
        }, 0);
      }

      // 2. Sum from matchedUsages directly
      let usageSum = 0;
      if (matchedUsages.length > 0) {
        usageSum = matchedUsages.reduce((sum: number, cu: any) => sum + (Number(cu.discount_applied) || 0), 0);
        if (usageSum === 0 && (couponRecord?.discount_type === 'free' || couponInfo?.discountType === 'free')) {
          usageSum = matchedUsages.length * 4000;
        }
      }

      // 3. Payload discount amount
      const payloadDiscount = Number(parsedAct.groupPayload?.discountAmount) || 0;

      // 4. Difference from original total
      let diffDiscount = 0;
      if (Array.isArray(attendees) && attendees.length > 0) {
        const origSum = attendees.reduce((sum: number, a: any) => sum + Number(a.originalTotal || a.subtotal || a.price || 0), 0);
        if (origSum > Number(s.amount)) {
          diffDiscount = origSum - Number(s.amount);
        }
      }

      // 5. If individual registration with free coupon
      let singleFreeDiscount = 0;
      if (!Array.isArray(attendees) || attendees.length === 0) {
        if (couponRecord?.discount_type === 'free' || couponInfo?.discountType === 'free' || Boolean(couponCode)) {
          singleFreeDiscount = 4000;
        }
      }

      // Combine by taking the most accurate and complete discount value
      const discountTotal = Math.max(
        calculatedAttendeesDiscount,
        usageSum,
        payloadDiscount,
        diffDiscount,
        singleFreeDiscount
      );

      const couponUsagesList: any[] = matchedUsages.map((cu: any) => ({
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

      if (couponUsagesList.length === 0 && (couponRecord || couponCode)) {
        if (matchedSgm.length > 0) {
          matchedSgm.forEach((sgm: any) => {
            const attInGroup = attendees.find(
              (a: any) => (a.memberNo && a.memberNo === sgm.member_no) || (a.email && a.email.toLowerCase() === sgm.attendee_email?.toLowerCase())
            );
            const discount = Number(sgm.discount_amount) > 0
              ? Number(sgm.discount_amount)
              : (attInGroup ? estimateAttendeeCouponDiscount(attInGroup, couponRecord) : 0);
            if (discount <= 0) return;

            couponUsagesList.push({
              id: sgm.id ? sgm.id.toString() : `sgm-${sgm.member_no}`,
              couponCode: sgm.coupon_code || couponCode,
              memberNo: sgm.member_no,
              attendeeName: sgm.attendee_name,
              attendeeEmail: sgm.attendee_email,
              attendeePhone: sgm.attendee_phone,
              workplace: sgm.workplace,
              discountApplied: discount,
              finalAmount: Number(sgm.net_price) || 0,
            });
          });
        } else if (Array.isArray(attendees) && attendees.length > 0) {
          attendees.forEach((att: any, idx: number) => {
            const discount = estimateAttendeeCouponDiscount(att, couponRecord);
            if (discount <= 0) return; // ผู้ที่ลงเพิ่ม บุคคลทั่วไป หรือไม่ได้ลงการประชุมหลัก ไม่ได้ใช้สิทธิ์คูปอง
            couponUsagesList.push({
              id: `att-${idx}`,
              couponCode: couponCode,
              memberNo: att.memberNo || null,
              attendeeName: att.nameTh || att.nameEn || '',
              attendeeEmail: att.email || '',
              attendeePhone: att.mobile || '',
              workplace: att.workplace || companyName || '',
              discountApplied: discount,
              finalAmount: Math.max(0, Number(att.subtotal || att.price || 0) - discount),
            });
          });
        }
      } else if (Array.isArray(attendees) && attendees.length > couponUsagesList.length && (couponRecord || couponCode)) {
        // Supplement any missing group attendees to couponUsagesList
        attendees.forEach((att: any, idx: number) => {
          const alreadyInList = couponUsagesList.some(
            (cu: any) => (att.memberNo && cu.memberNo === att.memberNo) ||
              (att.email && cu.attendeeEmail?.toLowerCase() === att.email.toLowerCase()) ||
              (att.nameTh && cu.attendeeName === att.nameTh)
          );
          const discount = alreadyInList ? 0 : estimateAttendeeCouponDiscount(att, couponRecord);
          if (discount > 0) {
            couponUsagesList.push({
              id: `att-supp-${idx}`,
              couponCode: couponCode,
              memberNo: att.memberNo || null,
              attendeeName: att.nameTh || att.nameEn || '',
              attendeeEmail: att.email || '',
              attendeePhone: att.mobile || att.phone || '',
              workplace: att.workplace || companyName || '',
              discountApplied: discount,
              finalAmount: Math.max(0, Number(att.subtotal || att.price || 0) - discount),
            });
          }
        });
      }

      return {
        couponCode,
        couponInfo,
        discountTotal,
        couponUsagesList,
      };
    };

    if (slipsModel) {
      const whereClause: any = {};
      if (meetingId) whereClause.meeting_id = meetingId;
      // รายการเพิ่มเติมที่รวมเข้ารายการเดิมแล้วจะแสดงเป็นประวัติการชำระของรายการเดิมแทน
      if (status && status !== 'all') whereClause.status = status;
      else whereClause.status = { not: ADD_ON_MERGED_STATUS };

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
              position: true,
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
      let allSponsors: any[] = [];
      let allSponsorGroupMembers: any[] = [];
      let allMeetingAttendances: any[] = [];
      let allAttendeeMembers: any[] = [];
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
        allSponsors = await (prisma as any).sponsors.findMany();
        try {
          allSponsorGroupMembers = await (prisma as any).sponsor_group_members.findMany({
            where: { ticket_code: { in: allTicketCodes } },
          });
        } catch {
          allSponsorGroupMembers = await prisma.$queryRawUnsafe(
            `SELECT * FROM sponsor_group_members WHERE ticket_code = ANY($1::varchar[])`,
            allTicketCodes
          );
        }
        allMeetingAttendances = await prisma.meeting_attendances.findMany({
          where: {
            meeting_id: { in: slips.map((s: any) => s.meeting_id).filter(Boolean) },
            coupon_code: { not: null },
          },
          select: {
            attendance_id: true,
            meeting_id: true,
            member_no: true,
            coupon_code: true,
            sponsor_id: true,
            sponsor_company_name: true,
          },
        });

        // Query member profiles for all group attendees to enrich mobile/phone numbers
        const allMemberNosToLookup = new Set<string>();
        const allAttendeeEmailsToLookup = new Set<string>();
        slips.forEach((s: any) => {
          if (s.member_no) {
            allMemberNosToLookup.add(String(s.member_no).trim());
            allMemberNosToLookup.add(String(s.member_no).trim().padStart(4, '0'));
          }
          const parsed = typeof s.selected_activities === 'string'
            ? (() => { try { return JSON.parse(s.selected_activities); } catch { return {}; } })()
            : (s.selected_activities || {});
          const attendees = parsed.attendees || parsed.applicants || [];
          if (Array.isArray(attendees)) {
            attendees.forEach((a: any) => {
              if (a.memberNo) {
                allMemberNosToLookup.add(String(a.memberNo).trim());
                allMemberNosToLookup.add(String(a.memberNo).trim().padStart(4, '0'));
              }
              if (a.email) {
                allAttendeeEmailsToLookup.add(String(a.email).trim().toLowerCase());
              }
            });
          }
        });

        if (allMemberNosToLookup.size > 0 || allAttendeeEmailsToLookup.size > 0) {
          try {
            allAttendeeMembers = await prisma.member.findMany({
              where: {
                OR: [
                  ...(allMemberNosToLookup.size > 0 ? [{ member_no: { in: Array.from(allMemberNosToLookup) } }] : []),
                  ...(allAttendeeEmailsToLookup.size > 0 ? [{ email: { in: Array.from(allAttendeeEmailsToLookup) } }] : []),
                ],
              },
              select: {
                member_no: true,
                fullNameTh: true,
                fullNameEn: true,
                email: true,
                mobile: true,
                lineId: true,
                workplace: true,
                position: true,
              },
            });
          } catch (memErr) {
            console.warn('Could not query attendee members:', memErr);
          }
        }
      } catch (cErr) {
        console.warn('Could not query coupon data for slips:', cErr);
      }

      // ── การลงทะเบียนเพิ่มเติม: รายการเดิมของรายการที่รออนุมัติ และประวัติรายการที่รวมแล้ว ──
      const pendingAddOnOriginalIds: string[] = slips
        .filter((s: any) => isAddOnPayload(s.selected_activities))
        .map((s: any) => parseSlipPayload(s.selected_activities)?.originalSlipId)
        .filter(Boolean);
      const addOnOriginalsById = new Map<string, any>();
      const pendingAddOnCountByOriginal = new Map<string, number>();
      slips.forEach((s: any) => {
        if (s.status !== 'pending' || !isAddOnPayload(s.selected_activities)) return;
        const originalId = parseSlipPayload(s.selected_activities)?.originalSlipId;
        if (originalId) pendingAddOnCountByOriginal.set(originalId, (pendingAddOnCountByOriginal.get(originalId) || 0) + 1);
      });
      const mergedAddOnsByOriginal = new Map<string, any[]>();
      try {
        const [originals, mergedAddOns] = await Promise.all([
          pendingAddOnOriginalIds.length > 0
            ? prisma.payment_slips.findMany({ where: { slip_id: { in: pendingAddOnOriginalIds } } })
            : Promise.resolve([]),
          prisma.payment_slips.findMany({
            where: { status: ADD_ON_MERGED_STATUS, ...(meetingId ? { meeting_id: meetingId } : {}) },
            orderBy: { created_at: 'asc' },
          }),
        ]);
        originals.forEach((o: any) => addOnOriginalsById.set(o.slip_id, o));
        mergedAddOns.forEach((a: any) => {
          const originalId = parseSlipPayload(a.selected_activities)?.originalSlipId;
          if (!originalId) return;
          const list = mergedAddOnsByOriginal.get(originalId) || [];
          list.push({
            slipId: a.slip_id,
            ticketCode: a.ticket_code || '',
            amount: a.amount,
            bank: a.bank || '',
            transferDate: a.transfer_date || '',
            transferTime: a.transfer_time || '',
            refNo: a.ref_no || '',
            slipUrl: a.slip_url,
            activities: slipActivityList(a.selected_activities),
            reviewedBy: a.reviewed_by || '',
            reviewedAt: a.reviewed_at ? new Date(a.reviewed_at).toISOString() : null,
          });
          mergedAddOnsByOriginal.set(originalId, list);
        });
      } catch (addOnErr) {
        console.warn('Could not query add-on registrations:', addOnErr);
      }

      const groupPaidByOriginal = await resolveGroupPaidActivities(slips);

      formattedSlips = slips.map((s: any) => {
        const parsedAct = parseActivitiesData(s.selected_activities, s.amount);
        const addOnPayload = isAddOnPayload(s.selected_activities) ? parseSlipPayload(s.selected_activities) : null;
        const addOnOriginal = addOnPayload ? addOnOriginalsById.get(addOnPayload.originalSlipId) : null;

        const hasMemberAttendees = Boolean(
          parsedAct.hasMemberAttendees ||
          (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees) &&
           parsedAct.groupPayload.attendees.some((a: any) => a.isMember || a.memberNo))
        );
        const isMember = (s.is_member && s.members) || hasMemberAttendees;
        const isGroupConference = parsedAct.isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-'));
        const isCorporate = parsedAct.isGroupMembership || isGroupConference || Boolean(s.ticket_code?.startsWith('GRP-')) || Boolean(s.ticket_code?.startsWith('MEMGRP'));
        const companyName = parsedAct.groupPayload?.companyName || (isCorporate ? s.guest_workplace : null) || '';

        // Enrich attendees and applicants with mobile/phone from members table
        if (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees)) {
          parsedAct.groupPayload.attendees.forEach((att: any) => {
            const mem = allAttendeeMembers.find((m: any) => {
              if (att.memberNo && (
                String(m.member_no).trim() === String(att.memberNo).trim() ||
                String(m.member_no).trim() === String(att.memberNo).trim().padStart(4, '0') ||
                parseInt(m.member_no, 10) === parseInt(att.memberNo, 10)
              )) {
                return true;
              }
              if (att.email && m.email && m.email.trim().toLowerCase() === att.email.trim().toLowerCase()) {
                return true;
              }
              return false;
            });
            const sgm = allSponsorGroupMembers.find((sg: any) => s.ticket_code && sg.ticket_code === s.ticket_code && (
              (att.memberNo && (
                String(sg.member_no).trim() === String(att.memberNo).trim() ||
                String(sg.member_no).trim() === String(att.memberNo).trim().padStart(4, '0') ||
                parseInt(sg.member_no, 10) === parseInt(att.memberNo, 10)
              )) ||
              (att.email && sg.attendee_email && sg.attendee_email.trim().toLowerCase() === att.email.trim().toLowerCase())
            ));

            const phoneVal = att.mobile || att.phone || att.tel || mem?.mobile || sgm?.attendee_phone || '';
            att.mobile = phoneVal;
            att.phone = phoneVal;
            att.lineId = att.lineId || mem?.lineId || '';
            att.workplace = att.workplace || mem?.workplace || companyName || '';
            att.position = att.position || mem?.position || '';
          });
        }

        if (parsedAct.groupPayload?.applicants && Array.isArray(parsedAct.groupPayload.applicants)) {
          parsedAct.groupPayload.applicants.forEach((app: any) => {
            const mem = allAttendeeMembers.find((m: any) => {
              if (app.memberNo && (
                String(m.member_no).trim() === String(app.memberNo).trim() ||
                String(m.member_no).trim() === String(app.memberNo).trim().padStart(4, '0') ||
                parseInt(m.member_no, 10) === parseInt(app.memberNo, 10)
              )) {
                return true;
              }
              if (app.email && m.email && m.email.trim().toLowerCase() === app.email.trim().toLowerCase()) {
                return true;
              }
              return false;
            });
            const phoneVal = app.mobile || app.phone || app.tel || mem?.mobile || '';
            app.mobile = phoneVal;
            app.phone = phoneVal;
            app.lineId = app.lineId || mem?.lineId || '';
          });
        }
        
        const guestPayload: any = parsedAct.guestPayload || {};

        // Isolate company data from personal attendee data (Rule: do not mix personal with corporate)
        const nameTh = isCorporate && companyName
          ? companyName
          : isMember
            ? (s.members?.fullNameTh || 'สมาชิก')
            : (s.guest_name || parsedAct.memberPayload?.full_name_th || guestPayload.nameTh || 'ผู้สมัครทั่วไป');
        const nameEn = isCorporate && companyName
          ? companyName
          : isMember
            ? (s.members?.fullNameEn || '')
            : (parsedAct.memberPayload?.full_name_en || guestPayload.nameEn || '');

        const position = isCorporate
          ? ''
          : isMember
            ? (s.members?.position || '')
            : (parsedAct.memberPayload?.position || guestPayload.position || '');

        const attendanceType = isCorporate
          ? ''
          : (parsedAct.memberPayload?.attendanceType || guestPayload.attendanceType || '');

        // For corporate, use coordinator contact only, NEVER personal attendee email/phone
        let coordinatorEmail = parsedAct.groupPayload?.groupContact?.coordinatorEmail || null;
        let coordinatorPhone = parsedAct.groupPayload?.groupContact?.coordinatorPhone || null;
        let coordinatorName = parsedAct.groupPayload?.groupContact?.coordinatorName || null;

        if (isCorporate && !coordinatorEmail && companyName) {
          const matchedSp = allSponsors.find((sp: any) =>
            sp.name && (
              sp.name.trim().toLowerCase() === companyName.trim().toLowerCase() ||
              companyName.trim().toLowerCase().includes(sp.name.trim().toLowerCase())
            )
          );
          if (matchedSp?.contact_email) {
            coordinatorEmail = matchedSp.contact_email;
            coordinatorName = matchedSp.contact_name || matchedSp.name || coordinatorName;
          }
        }

        const email = isCorporate
          ? (coordinatorEmail || '')
          : isMember
            ? (s.members?.email || '')
            : (s.guest_email || parsedAct.memberPayload?.email || guestPayload.email || '');
        const phone = isCorporate
          ? (coordinatorPhone || '')
          : isMember
            ? (s.members?.mobile || '')
            : (s.guest_phone || parsedAct.memberPayload?.mobile || guestPayload.phone || '');
        const workplace = isCorporate
          ? companyName
          : isMember
            ? (guestPayload.workplace || parsedAct.memberPayload?.workplace || s.members?.workplace || '')
            : (s.guest_workplace || parsedAct.memberPayload?.workplace || guestPayload.workplace || '');

        // Resolve coupon and discount
        const { couponCode, couponInfo, discountTotal, couponUsagesList } = resolveSlipCouponAndDiscount(
          s,
          parsedAct,
          companyName,
          {
            allCoupons,
            allCouponUsages,
            allSponsorGroupMembers,
            allMeetingAttendances,
          }
        );

        const ticketType = addOnPayload
          ? '➕ ลงทะเบียนเพิ่มเติม'
          : parsedAct.isFormatChange
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
            ? 'สมัครสมาชิกสมาคม'
            : parsedAct.isFormatChange
              ? `แจ้งเปลี่ยนรูปแบบ - ${s.meetings?.meeting_name || ''}`
              : addOnPayload
                ? `ลงทะเบียนเพิ่มเติม - ${s.meetings?.meeting_name || ''}`
                : (s.meetings?.meeting_name || ''),
          memberNo: s.member_no,
          isAddOn: Boolean(addOnPayload),
          originalSlipId: addOnPayload?.originalSlipId || null,
          originalTicketCode: addOnPayload?.originalTicketCode || addOnOriginal?.ticket_code || null,
          originalActivities: addOnOriginal ? slipActivityList(addOnOriginal.selected_activities) : [],
          originalStatus: addOnOriginal?.status || null,
          pendingAddOnCount: pendingAddOnCountByOriginal.get(s.slip_id) || 0,
          addOnPayments: mergedAddOnsByOriginal.get(s.slip_id) || [],
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
          guestPayload,
          nameTh,
          nameEn,
          position,
          attendanceType,
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
          slipUrl: getAdminAttachedSlipUrl(s.slip_url) || s.slip_url,
          adminAttachedSlip: Boolean(getAdminAttachedSlipUrl(s.slip_url)),
          status: s.status as 'pending' | 'approved' | 'rejected',
          notes: s.rejection_reason || undefined,
          resubmitToken: s.resubmit_token,
          selectedActivities: tagGroupPaidActivities(parsedAct.activities, groupPaidByOriginal.get(s.slip_id)),
          createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
          couponCode: couponCode || null,
          couponInfo: couponInfo || null,
          couponUsages: couponUsagesList,
          discountTotal: discountTotal || 0,
          // บันทึกแยกสำหรับผู้ดูแลระบบ (ยอดรวมอยู่ในบิลอื่นแล้ว): ไม่นับรายได้/ยอดค้างชำระซ้ำ
          isAdminLedger: Boolean(parseSlipPayload(s.selected_activities)?.adminOnly),
          includedInTicketCode: parseSlipPayload(s.selected_activities)?.includedInTicketCode || null,
          // ── สถานะย่อยสำหรับ Pay Later flow ──
          isPayLater: !parseSlipPayload(s.selected_activities)?.adminOnly && Boolean(
            s.slip_url === 'PAY_LATER' ||
            s.slip_url === 'pay_later_pending' ||
            (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later')))
          ),
          // true = มีสลิปจริง + pending = "ส่งสลิปแล้ว รอตรวจสอบการชำระ"
          isPendingPaymentReview: Boolean(
            s.slip_url &&
            s.slip_url !== 'PAY_LATER' &&
            s.slip_url !== 'pay_later_pending' &&
            s.slip_url !== '/placeholder-slip.png' &&
            s.slip_url !== 'GROUP_REGISTRATION' &&
            s.slip_url !== 'GROUP_MEMBERSHIP' &&
            !s.slip_url.startsWith('TEMP_') &&
            s.status === 'pending'
          ),
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
          m.position AS member_position,
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
      let allSponsorGroupMembers: any[] = [];
      let allMeetingAttendances: any[] = [];
      let allAttendeeMembers: any[] = [];
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
        try {
          allSponsorGroupMembers = await (prisma as any).sponsor_group_members.findMany({
            where: { ticket_code: { in: allTicketCodes } },
          });
        } catch {
          allSponsorGroupMembers = await prisma.$queryRawUnsafe(
            `SELECT * FROM sponsor_group_members WHERE ticket_code = ANY($1::varchar[])`,
            allTicketCodes
          );
        }
        allMeetingAttendances = await prisma.meeting_attendances.findMany({
          where: {
            meeting_id: { in: slips.map((s: any) => s.meeting_id).filter(Boolean) },
            coupon_code: { not: null },
          },
          select: {
            attendance_id: true,
            meeting_id: true,
            member_no: true,
            coupon_code: true,
            sponsor_id: true,
            sponsor_company_name: true,
          },
        });
        // Query member profiles for all group attendees to enrich mobile/phone numbers
        const allMemberNosToLookup = new Set<string>();
        const allAttendeeEmailsToLookup = new Set<string>();
        slips.forEach((s: any) => {
          if (s.member_no) {
            allMemberNosToLookup.add(String(s.member_no).trim());
            allMemberNosToLookup.add(String(s.member_no).trim().padStart(4, '0'));
          }
          const parsed = typeof s.selected_activities === 'string'
            ? (() => { try { return JSON.parse(s.selected_activities); } catch { return {}; } })()
            : (s.selected_activities || {});
          const attendees = parsed.attendees || parsed.applicants || [];
          if (Array.isArray(attendees)) {
            attendees.forEach((a: any) => {
              if (a.memberNo) {
                allMemberNosToLookup.add(String(a.memberNo).trim());
                allMemberNosToLookup.add(String(a.memberNo).trim().padStart(4, '0'));
              }
              if (a.email) {
                allAttendeeEmailsToLookup.add(String(a.email).trim().toLowerCase());
              }
            });
          }
        });

        if (allMemberNosToLookup.size > 0 || allAttendeeEmailsToLookup.size > 0) {
          try {
            allAttendeeMembers = await prisma.member.findMany({
              where: {
                OR: [
                  ...(allMemberNosToLookup.size > 0 ? [{ member_no: { in: Array.from(allMemberNosToLookup) } }] : []),
                  ...(allAttendeeEmailsToLookup.size > 0 ? [{ email: { in: Array.from(allAttendeeEmailsToLookup) } }] : []),
                ],
              },
              select: {
                member_no: true,
                fullNameTh: true,
                fullNameEn: true,
                email: true,
                mobile: true,
                lineId: true,
                workplace: true,
                position: true,
              },
            });
          } catch (memErr) {
            console.warn('Could not query attendee members in fallback:', memErr);
          }
        }
      } catch (cErr) {
        console.warn('Could not query coupon data for fallback slips:', cErr);
      }

      const groupPaidByOriginal = await resolveGroupPaidActivities(slips);

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

        // Enrich attendees and applicants with mobile/phone from members table
        if (parsedAct.groupPayload?.attendees && Array.isArray(parsedAct.groupPayload.attendees)) {
          parsedAct.groupPayload.attendees.forEach((att: any) => {
            const mem = allAttendeeMembers.find((m: any) => {
              if (att.memberNo && (
                String(m.member_no).trim() === String(att.memberNo).trim() ||
                String(m.member_no).trim() === String(att.memberNo).trim().padStart(4, '0') ||
                parseInt(m.member_no, 10) === parseInt(att.memberNo, 10)
              )) {
                return true;
              }
              if (att.email && m.email && m.email.trim().toLowerCase() === att.email.trim().toLowerCase()) {
                return true;
              }
              return false;
            });
            const sgm = allSponsorGroupMembers.find((sg: any) => s.ticket_code && sg.ticket_code === s.ticket_code && (
              (att.memberNo && (
                String(sg.member_no).trim() === String(att.memberNo).trim() ||
                String(sg.member_no).trim() === String(att.memberNo).trim().padStart(4, '0') ||
                parseInt(sg.member_no, 10) === parseInt(att.memberNo, 10)
              )) ||
              (att.email && sg.attendee_email && sg.attendee_email.trim().toLowerCase() === att.email.trim().toLowerCase())
            ));

            const phoneVal = att.mobile || att.phone || att.tel || mem?.mobile || sgm?.attendee_phone || '';
            att.mobile = phoneVal;
            att.phone = phoneVal;
            att.lineId = att.lineId || mem?.lineId || '';
            att.workplace = att.workplace || mem?.workplace || companyName || '';
            att.position = att.position || mem?.position || '';
          });
        }

        if (parsedAct.groupPayload?.applicants && Array.isArray(parsedAct.groupPayload.applicants)) {
          parsedAct.groupPayload.applicants.forEach((app: any) => {
            const mem = allAttendeeMembers.find((m: any) => {
              if (app.memberNo && (
                String(m.member_no).trim() === String(app.memberNo).trim() ||
                String(m.member_no).trim() === String(app.memberNo).trim().padStart(4, '0') ||
                parseInt(m.member_no, 10) === parseInt(app.memberNo, 10)
              )) {
                return true;
              }
              if (app.email && m.email && m.email.trim().toLowerCase() === app.email.trim().toLowerCase()) {
                return true;
              }
              return false;
            });
            const phoneVal = app.mobile || app.phone || app.tel || mem?.mobile || '';
            app.mobile = phoneVal;
            app.phone = phoneVal;
            app.lineId = app.lineId || mem?.lineId || '';
          });
        }
        
        const guestPayload: any = parsedAct.guestPayload || {};

        const nameTh = isCorporate && companyName
          ? companyName
          : isMember
            ? (s.member_full_name_th || 'สมาชิก')
            : (s.guest_name || parsedAct.memberPayload?.full_name_th || guestPayload.nameTh || 'ผู้สมัครทั่วไป');
        const nameEn = isCorporate && companyName
          ? companyName
          : isMember
            ? (s.member_full_name_en || '')
            : (parsedAct.memberPayload?.full_name_en || guestPayload.nameEn || '');

        const position = isCorporate
          ? ''
          : isMember
            ? (s.member_position || '')
            : (parsedAct.memberPayload?.position || guestPayload.position || '');

        const attendanceType = isCorporate
          ? ''
          : (parsedAct.memberPayload?.attendanceType || guestPayload.attendanceType || '');

        const coordinatorEmail = parsedAct.groupPayload?.groupContact?.coordinatorEmail || null;
        const coordinatorPhone = parsedAct.groupPayload?.groupContact?.coordinatorPhone || null;
        const coordinatorName = parsedAct.groupPayload?.groupContact?.coordinatorName || null;

        const email = isCorporate
          ? (coordinatorEmail || '')
          : isMember
            ? (s.member_email || '')
            : (s.guest_email || parsedAct.memberPayload?.email || guestPayload.email || '');
        const phone = isCorporate
          ? (coordinatorPhone || '')
          : isMember
            ? (s.member_mobile || '')
            : (s.guest_phone || parsedAct.memberPayload?.mobile || guestPayload.phone || '');
        const workplace = isCorporate
          ? companyName
          : isMember
            ? (s.member_workplace || '')
            : (s.guest_workplace || parsedAct.memberPayload?.workplace || guestPayload.workplace || '');

        // Resolve coupon and discount
        const { couponCode, couponInfo, discountTotal, couponUsagesList } = resolveSlipCouponAndDiscount(
          s,
          parsedAct,
          companyName,
          {
            allCoupons,
            allCouponUsages,
            allSponsorGroupMembers,
            allMeetingAttendances,
          }
        );

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
          meetingName: parsedAct.isMembership ? 'สมัครสมาชิกสมาคม' : (s.meeting_name || ''),
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
          guestPayload,
          nameTh,
          nameEn,
          position,
          attendanceType,
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
          slipUrl: getAdminAttachedSlipUrl(s.slip_url) || s.slip_url,
          adminAttachedSlip: Boolean(getAdminAttachedSlipUrl(s.slip_url)),
          status: s.status as 'pending' | 'approved' | 'rejected',
          notes: s.rejection_reason || undefined,
          resubmitToken: s.resubmit_token,
          selectedActivities: tagGroupPaidActivities(parsedAct.activities, groupPaidByOriginal.get(s.slip_id)),
          createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
          couponCode: couponCode || null,
          couponInfo: couponInfo || null,
          couponUsages: couponUsagesList,
          discountTotal: discountTotal || 0,
          // บันทึกแยกสำหรับผู้ดูแลระบบ (ยอดรวมอยู่ในบิลอื่นแล้ว): ไม่นับรายได้/ยอดค้างชำระซ้ำ
          isAdminLedger: Boolean(parseSlipPayload(s.selected_activities)?.adminOnly),
          includedInTicketCode: parseSlipPayload(s.selected_activities)?.includedInTicketCode || null,
          // ── สถานะย่อยสำหรับ Pay Later flow ──
          isPayLater: !parseSlipPayload(s.selected_activities)?.adminOnly && Boolean(
            s.slip_url === 'PAY_LATER' ||
            s.slip_url === 'pay_later_pending' ||
            (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later')))
          ),
          // true = มีสลิปจริง + pending = "ส่งสลิปแล้ว รอตรวจสอบการชำระ"
          isPendingPaymentReview: Boolean(
            s.slip_url &&
            s.slip_url !== 'PAY_LATER' &&
            s.slip_url !== 'pay_later_pending' &&
            s.slip_url !== '/placeholder-slip.png' &&
            s.slip_url !== 'GROUP_REGISTRATION' &&
            s.slip_url !== 'GROUP_MEMBERSHIP' &&
            !s.slip_url.startsWith('TEMP_') &&
            s.status === 'pending'
          ),
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

/**
 * Safely resolves the corporate sponsor's official contact email and coordinator name.
 * Strictly excludes any individual registrant / attendee personal email addresses.
 */
async function resolveCorporateEmail(slip: any, groupPayload: any): Promise<{ email: string; name: string }> {
  // 1. Gather all attendee / applicant emails to exclude them strictly
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

  const compNameCandidate = (
    groupPayload?.companyName ||
    slip.guest_workplace ||
    (slip.guest_name ? slip.guest_name.replace(/\s*\(\d+\s*ท่าน\)/, '').trim() : '')
  )?.trim() || '';

  // 2. Direct coordinator email from groupPayload (ensure it's not an attendee's personal email)
  const directEmail =
    groupPayload?.groupContact?.coordinatorEmail?.trim() ||
    groupPayload?.companyEmail?.trim() ||
    groupPayload?.coordinatorEmail?.trim() ||
    groupPayload?.sponsorSession?.contactEmail?.trim() ||
    groupPayload?.sponsorEmail?.trim();

  if (directEmail && !attendeeEmails.has(directEmail.toLowerCase())) {
    return {
      email: directEmail,
      name: groupPayload?.groupContact?.coordinatorName || compNameCandidate || 'ตัวแทนบริษัท',
    };
  }

  // 3. From sponsor_group_members table (lookup sponsor_id -> sponsors.contact_email)
  if (slip.ticket_code) {
    try {
      const sgmList = await prisma.$queryRaw<Array<{ sponsor_id: string | null; submitted_by_email: string | null }>>`
        SELECT sponsor_id, submitted_by_email FROM sponsor_group_members
        WHERE ticket_code = ${slip.ticket_code}
        LIMIT 5
      `;
      for (const row of sgmList) {
        if (row.sponsor_id) {
          const sp = await (prisma as any).sponsors.findUnique({
            where: { id: row.sponsor_id },
            select: { contact_email: true, name: true, contact_name: true },
          });
          if (sp?.contact_email && !attendeeEmails.has(sp.contact_email.trim().toLowerCase())) {
            return {
              email: sp.contact_email.trim(),
              name: sp.contact_name || sp.name || compNameCandidate || 'ตัวแทนบริษัท',
            };
          }
        }
        if (row.submitted_by_email && !attendeeEmails.has(row.submitted_by_email.trim().toLowerCase())) {
          return {
            email: row.submitted_by_email.trim(),
            name: compNameCandidate || 'ตัวแทนบริษัท',
          };
        }
      }
    } catch (err) {
      console.warn('Could not query sponsor_group_members for corporate email:', err);
    }
  }

  // 4. From meeting_attendances table (lookup sponsor_id -> sponsors.contact_email)
  if (slip.meeting_id) {
    try {
      const attSponsors = await prisma.$queryRaw<Array<{ sponsor_id: string | null; sponsor_company_name: string | null }>>`
        SELECT sponsor_id, sponsor_company_name FROM meeting_attendances
        WHERE meeting_id = ${slip.meeting_id} AND sponsor_id IS NOT NULL
          AND (
            member_no = ${slip.member_no || ''} OR
            sponsor_company_name = ${slip.guest_workplace || ''} OR
            sponsor_company_name = ${compNameCandidate || ''}
          )
        LIMIT 5
      `;
      for (const row of attSponsors) {
        if (row.sponsor_id) {
          const sp = await (prisma as any).sponsors.findUnique({
            where: { id: row.sponsor_id },
            select: { contact_email: true, name: true, contact_name: true },
          });
          if (sp?.contact_email && !attendeeEmails.has(sp.contact_email.trim().toLowerCase())) {
            return {
              email: sp.contact_email.trim(),
              name: sp.contact_name || sp.name || row.sponsor_company_name || compNameCandidate || 'ตัวแทนบริษัท',
            };
          }
        }
      }
    } catch (err) {
      console.warn('Could not query meeting_attendances for corporate email:', err);
    }
  }

  // 5. From coupon_usages table (lookup coupon -> company_name -> sponsors.contact_email)
  try {
    const usages = await (prisma as any).coupon_usages.findMany({
      where: {
        OR: [
          { slip_id: slip.slip_id },
          { ticket_code: slip.ticket_code || '' },
        ],
      },
      include: { coupon: true },
      take: 5,
    });
    for (const u of usages) {
      if (u.coupon?.company_name) {
        const sp = await (prisma as any).sponsors.findFirst({
          where: { name: { equals: u.coupon.company_name.trim(), mode: 'insensitive' } },
          select: { contact_email: true, name: true, contact_name: true },
        });
        if (sp?.contact_email && !attendeeEmails.has(sp.contact_email.trim().toLowerCase())) {
          return {
            email: sp.contact_email.trim(),
            name: sp.contact_name || sp.name || u.coupon.company_name,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Could not query coupon_usages for corporate email:', err);
  }

  // 6. From company name lookup in sponsors table
  if (compNameCandidate) {
    try {
      let sp = await (prisma as any).sponsors.findFirst({
        where: { name: { equals: compNameCandidate, mode: 'insensitive' } },
        select: { contact_email: true, name: true, contact_name: true },
      });
      if (!sp) {
        sp = await (prisma as any).sponsors.findFirst({
          where: {
            OR: [
              { name: { contains: compNameCandidate, mode: 'insensitive' } },
            ],
          },
          select: { contact_email: true, name: true, contact_name: true },
        });
      }
      if (sp?.contact_email && !attendeeEmails.has(sp.contact_email.trim().toLowerCase())) {
        return {
          email: sp.contact_email.trim(),
          name: sp.contact_name || sp.name || compNameCandidate,
        };
      }
    } catch (err) {
      console.warn('Could not query sponsors table by company name:', err);
    }
  }

  // 7. Check slip.guest_email ONLY IF it is NOT an attendee email
  if (slip.guest_email && !attendeeEmails.has(slip.guest_email.trim().toLowerCase())) {
    return {
      email: slip.guest_email.trim(),
      name: compNameCandidate || 'ตัวแทนบริษัท',
    };
  }

  // 8. Fallback: If no separate dedicated coordinator email was found, use slip.guest_email, member email, or first attendee email so notifications are never dropped
  if (slip.guest_email) {
    return {
      email: slip.guest_email.trim(),
      name: compNameCandidate || slip.guest_name || 'ผู้ลงทะเบียน',
    };
  }

  if (slip.members?.email) {
    return {
      email: slip.members.email.trim(),
      name: slip.members.fullNameTh || slip.members.fullNameEn || compNameCandidate || 'ผู้ลงทะเบียน',
    };
  }

  if (attendeesList.length > 0) {
    const fallbackEmail = (attendeesList[0]?.email || attendeesList[0]?.attendee_email)?.trim();
    if (fallbackEmail) {
      return {
        email: fallbackEmail,
        name: compNameCandidate || attendeesList[0]?.nameTh || attendeesList[0]?.nameEn || 'ผู้ลงทะเบียน',
      };
    }
  }

  return { email: '', name: compNameCandidate || 'ตัวแทนบริษัท' };
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
          mtg.meeting_name, mtg.meeting_date, mtg.start_date, mtg.end_date
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
            meeting_date: r.meeting_date,
            start_date: r.start_date,
            end_date: r.end_date,
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

    if (slip.status === ADD_ON_MERGED_STATUS) {
      return NextResponse.json(
        { success: false, error: 'รายการนี้ถูกรวมเข้ากับรายการลงทะเบียนเดิมแล้ว ไม่สามารถเปลี่ยนสถานะได้' },
        { status: 400 }
      );
    }

    // รายการที่ถูกปฏิเสธคืนที่นั่งไปแล้ว: ก่อนกลับมาเป็นรอตรวจสอบ/อนุมัติ ต้องตรวจว่ายังมีที่นั่งเหลือ
    if (slip.status === 'rejected' && (action === 'approve' || action === 'reset')) {
      try {
        await assertSeatsForReactivatedSlip(slip);
      } catch (seatErr) {
        if (seatErr instanceof SeatUnavailableError) {
          return NextResponse.json(
            { success: false, error: seatErr.message, code: 'SEATS_UNAVAILABLE' },
            { status: 409 }
          );
        }
        throw seatErr;
      }
    }

    // สลิปที่แอดมินแนบไว้ล่วงหน้า: อนุมัติแล้วจึงนับเป็นสลิปจริง (ชำระเงินเรียบร้อย)
    const adminAttachedSlipUrl = action === 'approve' ? getAdminAttachedSlipUrl(slip.slip_url) : null;
    if (adminAttachedSlipUrl) {
      await prisma.payment_slips.update({
        where: { slip_id: slipId },
        data: { slip_url: adminAttachedSlipUrl },
      });
      slip.slip_url = adminAttachedSlipUrl;
    }

    // ลงทะเบียนเพิ่มเติม: อนุมัติแล้วรวมกิจกรรมและยอดเงินเข้ารายการเดิม
    if (action === 'approve' && isAddOnPayload(slip.selected_activities)) {
      return approveAddOnSlip(slip, reviewer || 'Admin');
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

    if (slip.ticket_code?.startsWith('GRP-') || slip.ticket_code?.startsWith('GRP_')) {
      isGroupConference = true;
    }

    if (slip.selected_activities) {
      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }
      if (actObj && typeof actObj === 'object') {
        if (actObj.type === 'membership_group_registration' || (actObj.isGroup && Array.isArray(actObj.applicants) && actObj.applicants.length > 0)) {
          isMembershipRegistration = true;
          isGroupMembership = true;
          isGroupConference = false;
          groupPayload = actObj;
        } else if (actObj.type === 'membership_registration') {
          isMembershipRegistration = true;
          memberPayload = actObj.memberPayload;
        } else if (
          actObj.type === 'conference_group_registration' ||
          (actObj.isGroup === true && Array.isArray(actObj.attendees) && actObj.attendees.length > 0) ||
          (Array.isArray(actObj.attendees) && actObj.attendees.length > 0 && (actObj.isGroup || actObj.companyName))
        ) {
          isGroupConference = true;
          isGroupMembership = false;
          isMembershipRegistration = false;
          groupPayload = actObj;
        } else if (actObj.isFormatChange) {
          isFormatChange = true;
          formatChangePayload = actObj;
        }
      }
    }

    const isCorporate = Boolean(
      isGroupMembership ||
      isGroupConference ||
      slip.ticket_code?.startsWith('MEMGRP') ||
      slip.ticket_code?.startsWith('GRP-') ||
      slip.ticket_code?.startsWith('GRP_') ||
      slip.slip_id?.includes('GRP') ||
      (groupPayload?.isGroup === true && (
        (Array.isArray(groupPayload?.attendees) && groupPayload.attendees.length > 0) ||
        (Array.isArray(groupPayload?.applicants) && groupPayload.applicants.length > 0)
      )) ||
      Boolean(slip.guest_name?.includes('ท่าน') && (slip.ticket_code?.startsWith('GRP') || slip.slip_id?.includes('GRP'))) ||
      Boolean(slip.guest_workplace && (slip.ticket_code?.startsWith('GRP') || slip.slip_id?.includes('GRP')))
    );

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
                try {
                  const applicantEmail = applicant.email;
                  const applicantName = applicant.full_name_th || applicant.full_name_en || 'สมาชิก';
                  const newMemberNo = applicantMemberNo;
                  // ส่งอีเมลหลังตอบกลับผู้ดูแลแล้ว เพื่อไม่ให้การอนุมัติต้องรอ SMTP
                  after(async () => {
                    console.log(`📧 [SLIP APPROVAL] Sending group member approval email to: ${applicantEmail} (Member: ${newMemberNo})`);
                    await sendMembershipApprovedEmail({
                      to: applicantEmail,
                      recipientName: applicantName,
                      memberNo: newMemberNo,
                      amountPaid: 1000,
                    }).catch((e) => console.error('Failed to send group member approval email:', e));
                  });
                } catch (e) {
                  console.error('Failed to send group member approval email:', e);
                }
              }
            }

            approvedApplicants.push({
              name: applicant.full_name_th || applicant.full_name_en || 'ผู้สมัคร',
              email: applicant.email || '',
              memberNo: applicantMemberNo,
            });
          }

          // Send approval summary email to company / coordinator
          let companyEmail = '';
          const companyName =
            groupPayload.companyName?.trim() ||
            slip.guest_workplace?.trim() ||
            'บริษัท / องค์กร';
          let coordinatorName =
            groupPayload.groupContact?.coordinatorName?.trim() ||
            companyName;

          const resolvedCorp = await resolveCorporateEmail(slip, groupPayload);
          if (resolvedCorp.email) {
            companyEmail = resolvedCorp.email;
            coordinatorName = resolvedCorp.name || coordinatorName;
          }

          const hasActualSlip = Boolean(
            slip.slip_url &&
            slip.slip_url !== 'PAY_LATER' &&
            slip.slip_url !== 'pay_later_pending' &&
            slip.slip_url !== '/placeholder-slip.png' &&
            slip.slip_url !== 'GROUP_REGISTRATION' &&
            slip.slip_url !== 'GROUP_MEMBERSHIP' &&
            !slip.slip_url.startsWith('TEMP_')
          );

          // หากมีสลิปจริงที่แนบเข้ามาแล้ว ไม่ต้องแสดงสถานะรอชำระ (isPayLater = false -> แสดงชำระเงินเรียบร้อยแล้ว)
          const isPayLater = !hasActualSlip && Boolean(
            slip.slip_url === 'PAY_LATER' ||
            slip.slip_url === 'pay_later_pending' ||
            (typeof slip.bank === 'string' && (slip.bank.includes('ชำระเงินภายหลัง') || slip.bank.toLowerCase().includes('pay later')))
          );

          if (companyEmail && approvedApplicants.length > 0) {
            const companyMailParams = {
              to: companyEmail,
              companyName,
              coordinatorName,
              ticketCode: slip.ticket_code || slip.slip_id,
              amountPaid: slip.amount || approvedApplicants.length * 1000,
              isPayLater,
              applicants: approvedApplicants,
            };
            after(async () => {
              console.log(`📧 [SLIP APPROVAL] Sending company group membership approval email to: ${companyMailParams.to}`);
              await sendCompanyGroupMembershipApprovedEmail(companyMailParams).catch((companyMailErr) =>
                console.error('Failed to send company group approval email:', companyMailErr)
              );
            });
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

      // Look up member data if member_no or assignedMemberNo exists
      let effectiveMemberRec: any = slip.members || null;
      const targetMemberNo = assignedMemberNo || slip.member_no;
      if (!effectiveMemberRec && targetMemberNo) {
        try {
          effectiveMemberRec = await prisma.member.findUnique({
            where: { member_no: targetMemberNo },
          });
        } catch (memFindErr) {
          console.warn('[Slip Approval] Failed to fetch member by member_no:', targetMemberNo, memFindErr);
        }
      }

      // 4. If conference meeting attendance exists, upsert into meeting_attendances
      if (!isMembershipRegistration && slip.meeting_id) {
        let actsObj = slip.selected_activities;
        if (typeof actsObj === 'string') {
          try { actsObj = JSON.parse(actsObj); } catch { actsObj = null; }
        }

        const effectiveSponsorId = (slip as any).sponsor_id || actsObj?.sponsorId || actsObj?.groupContact?.sponsorId || null;
        const effectiveSponsorName = (slip as any).sponsor_company_name || actsObj?.companyName || actsObj?.sponsorName || null;
        const effectiveCouponCode = (slip as any).coupon_code || actsObj?.couponCode || null;

        if (isGroupConference && groupPayload?.attendees && Array.isArray(groupPayload.attendees)) {
          for (const att of groupPayload.attendees) {
            let attMemberNo = att.memberNo ? att.memberNo.trim() : null;
            const attEmail = att.email ? att.email.trim().toLowerCase() : null;
            const attName = att.nameTh || att.nameEn || att.fullNameTh || att.fullNameEn || 'ผู้เข้าร่วมประชุม';
            const attPhone = att.phone || att.mobile || null;
            const attWorkplace = att.workplace || groupPayload.companyName || null;

            if (!attMemberNo && attEmail) {
              const foundMem = await prisma.member.findFirst({
                where: { email: { equals: attEmail, mode: 'insensitive' } },
                select: { member_no: true },
              });
              if (foundMem?.member_no) {
                attMemberNo = foundMem.member_no.trim();
              }
            }

            if (attMemberNo) {
              await prisma.$executeRaw`
                INSERT INTO meeting_attendances (
                  meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status, sponsor_id, sponsor_company_name, coupon_code
                ) VALUES (
                  ${slip.meeting_id}, ${attMemberNo}, ${attName}, ${attEmail}, ${attPhone}, ${attWorkplace}, 'Registered', ${effectiveSponsorId}, ${effectiveSponsorName}, ${effectiveCouponCode}
                )
                ON CONFLICT (meeting_id, member_no)
                DO UPDATE SET
                  attendance_status = 'Registered',
                  attendee_name = COALESCE(meeting_attendances.attendee_name, ${attName}),
                  attendee_email = COALESCE(meeting_attendances.attendee_email, ${attEmail}),
                  attendee_phone = COALESCE(meeting_attendances.attendee_phone, ${attPhone}),
                  workplace = COALESCE(meeting_attendances.workplace, ${attWorkplace}),
                  sponsor_id = COALESCE(meeting_attendances.sponsor_id, ${effectiveSponsorId}),
                  sponsor_company_name = COALESCE(meeting_attendances.sponsor_company_name, ${effectiveSponsorName}),
                  coupon_code = COALESCE(meeting_attendances.coupon_code, ${effectiveCouponCode})
              `;

              // Clean up any orphaned non-member ghost record
              if (attEmail) {
                await prisma.$executeRaw`
                  DELETE FROM meeting_attendances
                  WHERE meeting_id = ${slip.meeting_id}
                    AND member_no IS NULL
                    AND LOWER(attendee_email) = ${attEmail}
                `.catch(() => {});
              }
            } else if (attEmail) {
              const existingAtt = await (prisma as any).meeting_attendances.findFirst({
                where: {
                  meeting_id: slip.meeting_id,
                  member_no: null,
                  attendee_email: { equals: attEmail, mode: 'insensitive' },
                },
              });
              if (existingAtt) {
                await (prisma as any).meeting_attendances.update({
                  where: { attendance_id: existingAtt.attendance_id },
                  data: {
                    attendance_status: 'Non-Member',
                    attendee_name: attName,
                    attendee_phone: attPhone || existingAtt.attendee_phone,
                    workplace: attWorkplace || existingAtt.workplace,
                    sponsor_id: effectiveSponsorId || existingAtt.sponsor_id,
                    sponsor_company_name: effectiveSponsorName || existingAtt.sponsor_company_name,
                    coupon_code: effectiveCouponCode || existingAtt.coupon_code,
                  },
                });
              } else {
                await (prisma as any).meeting_attendances.create({
                  data: {
                    meeting_id: slip.meeting_id,
                    member_no: null,
                    attendee_name: attName,
                    attendee_email: attEmail,
                    attendee_phone: attPhone,
                    workplace: attWorkplace,
                    attendance_status: 'Non-Member',
                    sponsor_id: effectiveSponsorId,
                    sponsor_company_name: effectiveSponsorName,
                    coupon_code: effectiveCouponCode,
                  },
                });
              }
            }
          }
        } else if (assignedMemberNo || slip.member_no) {
          const targetMemNo = (assignedMemberNo || slip.member_no).trim();
          let memberRec: any = effectiveMemberRec;
          if (!memberRec) {
            memberRec = await prisma.member.findUnique({ where: { member_no: targetMemNo } });
          }
          const memName = memberRec?.fullNameTh || memberRec?.fullNameEn || slip.guest_name || 'สมาชิก';
          const memEmail = memberRec?.email || slip.guest_email || null;
          const memPhone = memberRec?.mobile || slip.guest_phone || null;
          const memWorkplace = memberRec?.workplace || slip.guest_workplace || null;

          await prisma.$executeRaw`
            INSERT INTO meeting_attendances (
              meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status, sponsor_id, sponsor_company_name, coupon_code
            ) VALUES (
              ${slip.meeting_id}, ${targetMemNo}, ${memName}, ${memEmail}, ${memPhone}, ${memWorkplace}, 'Registered', ${effectiveSponsorId}, ${effectiveSponsorName}, ${effectiveCouponCode}
            )
            ON CONFLICT (meeting_id, member_no)
            DO UPDATE SET
              attendance_status = 'Registered',
              attendee_name = COALESCE(meeting_attendances.attendee_name, ${memName}),
              attendee_email = COALESCE(meeting_attendances.attendee_email, ${memEmail}),
              attendee_phone = COALESCE(meeting_attendances.attendee_phone, ${memPhone}),
              workplace = COALESCE(meeting_attendances.workplace, ${memWorkplace})
          `;

          if (memEmail) {
            await prisma.$executeRaw`
              DELETE FROM meeting_attendances
              WHERE meeting_id = ${slip.meeting_id}
                AND member_no IS NULL
                AND LOWER(attendee_email) = ${memEmail.trim().toLowerCase()}
            `.catch(() => {});
          }
        } else {
          // Individual non-member conference registration (e.g. SLIP-MUJOERWK)
          const guestName = slip.guest_name || actsObj?.nameTh || actsObj?.fullNameTh || actsObj?.attendees?.[0]?.nameTh || actsObj?.attendees?.[0]?.fullNameTh || 'ผู้สมัครทั่วไป';
          const guestEmail = slip.guest_email || actsObj?.email || actsObj?.attendees?.[0]?.email || null;
          const guestPhone = slip.guest_phone || actsObj?.phone || actsObj?.mobile || actsObj?.attendees?.[0]?.phone || null;
          const guestWorkplace = slip.guest_workplace || actsObj?.workplace || actsObj?.attendees?.[0]?.workplace || null;

          let existingAtt: any = null;
          if (guestEmail) {
            existingAtt = await (prisma as any).meeting_attendances.findFirst({
              where: {
                meeting_id: slip.meeting_id,
                attendee_email: { equals: guestEmail.trim(), mode: 'insensitive' },
              },
            });
          }
          if (existingAtt) {
            await (prisma as any).meeting_attendances.update({
              where: { attendance_id: existingAtt.attendance_id },
              data: {
                attendance_status: 'Non-Member',
                attendee_name: guestName,
                attendee_phone: guestPhone || existingAtt.attendee_phone,
                workplace: guestWorkplace || existingAtt.workplace,
                sponsor_id: effectiveSponsorId || existingAtt.sponsor_id,
                sponsor_company_name: effectiveSponsorName || existingAtt.sponsor_company_name,
                coupon_code: effectiveCouponCode || existingAtt.coupon_code,
              },
            });
          } else {
            await (prisma as any).meeting_attendances.create({
              data: {
                meeting_id: slip.meeting_id,
                member_no: null,
                attendee_name: guestName,
                attendee_email: guestEmail,
                attendee_phone: guestPhone,
                workplace: guestWorkplace,
                attendance_status: 'Non-Member',
                sponsor_id: effectiveSponsorId,
                sponsor_company_name: effectiveSponsorName,
                coupon_code: effectiveCouponCode,
              },
            });
          }
        }
      }

      // 4.1 ผู้ที่ลงทะเบียนเพิ่มเติมในรายการกลุ่ม: รวมกิจกรรมที่เพิ่มเข้ารายการลงทะเบียนเดิมของแต่ละคน
      if (isGroupConference) {
        await mergeGroupAddOnAttendees(slipId).catch((mergeErr) =>
          console.error('Failed to merge group add-on attendees:', mergeErr)
        );
      }

      // 5. Send approval confirmation email after the response is sent (with DB Fallbacks)
      after(async () => {
      try {

        if (isMembershipRegistration) {
          // Individual membership registration
          if (!isGroupMembership) {
            const recipientEmail = (
              effectiveMemberRec?.email ||
              slip.members?.email ||
              slip.guest_email ||
              memberPayload?.email ||
              ''
            ).trim();

            const recipientName = (
              effectiveMemberRec?.fullNameTh ||
              slip.members?.fullNameTh ||
              slip.guest_name ||
              memberPayload?.full_name_th ||
              'ผู้สมัครสมาชิก'
            ).trim();

            if (recipientEmail) {
              console.log(`📧 [SLIP APPROVAL] Sending membership approval email to: ${recipientEmail} (Member: ${targetMemberNo || 'N/A'})`);
              await sendMembershipApprovedEmail({
                to: recipientEmail,
                recipientName,
                memberNo: targetMemberNo || '',
                amountPaid: slip.amount || 1000,
              });
            } else {
              console.warn(`⚠️ [SLIP APPROVAL] No recipient email found for membership slip ${slip.slip_id}`);
            }
          }
        } else {
          // ONLY for conference/meeting registrations
          let effectiveMeetingRec = slip.meetings;
          if (!effectiveMeetingRec && slip.meeting_id) {
            try {
              effectiveMeetingRec = await (prisma as any).meetings.findUnique({
                where: { meeting_id: slip.meeting_id },
              });
            } catch (mtgErr) {
              console.warn('[Slip Approval] Could not fetch meeting record:', mtgErr);
            }
          }

          let meetingDateStr: string | undefined = undefined;
          if (effectiveMeetingRec) {
            const m = effectiveMeetingRec;
            if (m.start_date && m.end_date) {
              const start = new Date(m.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
              const end = new Date(m.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
              meetingDateStr = start === end ? start : `${start} - ${end}`;
            } else if (m.meeting_date) {
              meetingDateStr = new Date(m.meeting_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
            }
          }

          const meetingNameStr = effectiveMeetingRec?.meeting_name || 'งานประชุมวิชาการ TSRM 2026';

          // Look up attendance record for extra fields if needed
          let attendanceRec: any = null;
          if (slip.meeting_id) {
            try {
              const attList = await prisma.$queryRaw<Array<any>>`
                SELECT * FROM meeting_attendances
                WHERE meeting_id = ${slip.meeting_id}
                  AND (
                    (member_no IS NOT NULL AND member_no = ${targetMemberNo || ''})
                    OR (attendee_email IS NOT NULL AND LOWER(attendee_email) = LOWER(${slip.guest_email || ''}))
                  )
                LIMIT 1
              `;
              attendanceRec = attList?.[0] || null;
            } catch (attQueryErr) {
              console.warn('[Slip Approval] Could not query meeting_attendances:', attQueryErr);
            }
          }

          let attendeesList = Array.isArray(groupPayload?.attendees) ? [...groupPayload.attendees] : [];

          // Fallback: If attendeesList is empty in groupPayload but this is a group slip, lookup sponsor_group_members or meeting_attendances
          if (isCorporate && attendeesList.length === 0 && (slip.ticket_code || slip.slip_id)) {
            try {
              const sgmList = await (prisma as any).sponsor_group_members.findMany({
                where: { ticket_code: slip.ticket_code },
              });
              if (sgmList && sgmList.length > 0) {
                attendeesList = sgmList.map((sgm: any) => ({
                  memberNo: sgm.member_no,
                  nameTh: sgm.attendee_name,
                  email: sgm.attendee_email,
                  phone: sgm.attendee_phone,
                  workplace: sgm.workplace,
                  ticketCode: sgm.ticket_code,
                }));
              }
            } catch (sgmErr) {
              console.warn('[Slip Approval] Failed to fallback query sponsor_group_members:', sgmErr);
            }
          }

          const hasCorporateAttendees = isCorporate && attendeesList.length > 0;

          if (isCorporate && hasCorporateAttendees) {
            // 1. For Corporate Group Conference: Send summary approval confirmation to the corporate coordinator
            const resolved = await resolveCorporateEmail(slip, groupPayload);
            if (resolved.email) {
              console.log(`📧 [SLIP APPROVAL] Sending corporate group approval email to coordinator: ${resolved.email}`);
              await sendRegistrationApprovedEmail({
                to: resolved.email,
                recipientName: resolved.name || 'ตัวแทนบริษัท',
                meetingName: meetingNameStr,
                meetingDate: meetingDateStr,
                ticketCode: slip.ticket_code || '',
                amountPaid: slip.amount,
                isMember: slip.is_member,
                selectedActivities: slip.selected_activities,
              }).catch((coordMailErr) =>
                console.error(`Failed to send coordinator approval email to ${resolved.email}:`, coordMailErr)
              );
            } else {
              console.warn(`[Conference Group Approval] Could not resolve corporate coordinator email for slip ${slip.slip_id}`);
            }

            // 2. Send sponsored registration approval notification to EACH individual attendee
            const companyName = groupPayload?.companyName?.trim() || slip.guest_workplace?.trim() || resolved.name || 'บริษัทผู้สนับสนุน';

            await Promise.all(attendeesList.map(async (att: any) => {
              let attEmail = (att.email || att.attendee_email)?.trim();
              let attName = att.nameTh || att.nameEn || att.fullName || att.fullNameTh || att.attendee_name || '';
              let attMemberNo = att.memberNo ? String(att.memberNo).trim() : undefined;
              let attWorkplace = att.workplace || undefined;
              let attPhone = att.phone || att.mobile || undefined;

              // If attendee email or name is missing, look up the member in the database
              if ((!attEmail || !attName || !attWorkplace) && attMemberNo) {
                try {
                  const cleanNo = attMemberNo.padStart(4, '0');
                  const dbMem = await prisma.member.findFirst({
                    where: {
                      OR: [
                        { member_no: attMemberNo },
                        { member_no: cleanNo },
                      ],
                    },
                  });
                  if (dbMem) {
                    attEmail = attEmail || dbMem.email?.trim();
                    attName = attName || dbMem.fullNameTh || dbMem.fullNameEn || '';
                    attWorkplace = attWorkplace || dbMem.workplace || undefined;
                    attPhone = attPhone || dbMem.mobile || undefined;
                  }
                } catch (dbMemErr) {
                  console.warn('[Slip Approval] Failed to lookup member by member_no:', attMemberNo, dbMemErr);
                }
              }

              if (attEmail && attEmail.includes('@')) {
                let attItems: any[] = [];
                if (Array.isArray(att.selectedActivities) && att.selectedActivities.length > 0) {
                  attItems = att.selectedActivities.map((a: any) => {
                    const isMain = a.type === 'main' || a.id === 'main';
                    const resolvedFormat = (isMain || a.format === 'both')
                      ? (att.attendanceType || (a.format && a.format !== 'both' ? a.format : 'onsite'))
                      : (a.format || a.attendanceType || (a.type === 'workshop' ? 'onsite' : 'onsite'));
                    return {
                      name: a.name || a.title || a.programNameTh || a.programNameEn || 'กิจกรรมการประชุม',
                      date: a.date || undefined,
                      format: resolvedFormat,
                    };
                  });
                } else if (att.programNameTh || att.programNameEn) {
                  attItems = [{
                    name: att.programNameTh || att.programNameEn,
                    format: att.attendanceType || 'onsite',
                  }];
                } else if (effectiveMeetingRec?.meeting_name) {
                  attItems = [{
                    name: effectiveMeetingRec.meeting_name,
                    format: att.attendanceType || 'onsite',
                  }];
                }

                console.log(`📧 [SLIP APPROVAL] Sending sponsored registration approval email to attendee: ${attEmail} (${attName || 'Attendee'})`);
                try {
                  await sendAttendeeSponsoredRegistrationEmail({
                    to: attEmail,
                    recipientName: attName || 'ผู้เข้าร่วมประชุม',
                    recipientEmail: attEmail,
                    memberNo: attMemberNo,
                    workplace: attWorkplace || companyName,
                    companyName,
                    meetingName: meetingNameStr,
                    meetingDate: meetingDateStr,
                    ticketCode: att.ticketCode || slip.ticket_code || '',
                    items: attItems,
                    format: att.attendanceType || undefined,
                  });
                } catch (mailErr) {
                  console.error(`❌ [SLIP APPROVAL] Failed to send email to attendee ${attEmail}:`, mailErr);
                }
              } else {
                console.warn(`⚠️ [SLIP APPROVAL] Skipping attendee email: No valid email found for attendee "${attName || attMemberNo || 'unknown'}"`);
              }
            }));
          } else {
            // Individual conference registration (or single attendee fallback)
            let parsedActObj: any = null;
            if (typeof slip.selected_activities === 'string') {
              try {
                parsedActObj = JSON.parse(slip.selected_activities);
              } catch {}
            } else if (typeof slip.selected_activities === 'object' && slip.selected_activities !== null) {
              parsedActObj = slip.selected_activities;
            }

            const recipientEmail = (
              effectiveMemberRec?.email ||
              slip.members?.email ||
              slip.guest_email ||
              parsedActObj?.email ||
              parsedActObj?.guestEmail ||
              attendanceRec?.attendee_email ||
              ''
            ).trim();

            const recipientName = (
              effectiveMemberRec?.fullNameTh ||
              slip.members?.fullNameTh ||
              slip.guest_name ||
              parsedActObj?.nameTh ||
              parsedActObj?.guestName ||
              attendanceRec?.attendee_name ||
              'ผู้ลงทะเบียน'
            ).trim();

            if (recipientEmail) {
              console.log(`📧 [SLIP APPROVAL] Sending individual registration approval email to: ${recipientEmail} (Ticket: ${slip.ticket_code || 'N/A'})`);
              await sendRegistrationApprovedEmail({
                to: recipientEmail,
                recipientName,
                nameEn: effectiveMemberRec?.fullNameEn || slip.members?.fullNameEn || parsedActObj?.nameEn || parsedActObj?.guestNameEn || undefined,
                memberNo: targetMemberNo || undefined,
                position: effectiveMemberRec?.position || slip.members?.position || parsedActObj?.position || parsedActObj?.guestPosition || undefined,
                workplace: effectiveMemberRec?.workplace || slip.members?.workplace || slip.guest_workplace || parsedActObj?.workplace || parsedActObj?.guestWorkplace || attendanceRec?.workplace || undefined,
                email: recipientEmail,
                phone: effectiveMemberRec?.mobile || slip.members?.mobile || slip.guest_phone || parsedActObj?.phone || parsedActObj?.guestPhone || attendanceRec?.attendee_phone || undefined,
                attendanceType: parsedActObj?.attendanceType || undefined,
                sponsorCompanyName: parsedActObj?.companyName || parsedActObj?.sponsorCompanyName || undefined,
                meetingName: meetingNameStr,
                meetingDate: meetingDateStr,
                ticketCode: slip.ticket_code || '',
                amountPaid: slip.amount,
                isMember: slip.is_member,
                selectedActivities: slip.selected_activities,
              });
            } else {
              console.warn(`⚠️ [SLIP APPROVAL] No recipient email found for conference slip ${slip.slip_id}`);
            }
          }
        }
      } catch (mailDispatchErr) {
        console.error('❌ [SLIP APPROVAL EMAIL DISPATCH ERROR]:', mailDispatchErr);
      }
      });

      // 6. Auto-generate / link receipt in receipts table for this approved transaction
      await createReceiptForApprovedSlip(slipId).catch((err) =>
        console.error('Failed to auto-generate receipt on approval:', err)
      );

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
        if (isGroupConference && groupPayload?.attendees && Array.isArray(groupPayload.attendees)) {
          for (const att of groupPayload.attendees) {
            if (att.isMember && att.memberNo) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Pending_Payment'
                WHERE meeting_id = ${slip.meeting_id} AND member_no = ${att.memberNo.trim()}
              `;
            } else if (att.email) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Non-Member-Pending'
                WHERE meeting_id = ${slip.meeting_id} AND attendee_email = ${att.email.trim().toLowerCase()}
              `;
            }
          }
          if (slip.ticket_code) {
            await prisma.$executeRaw`
              UPDATE sponsor_group_members
              SET status = 'pending', updated_at = NOW()
              WHERE ticket_code = ${slip.ticket_code}
            `.catch(() => {});
          }
        } else if (slip.member_no) {
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
        if (isGroupConference && groupPayload?.attendees && Array.isArray(groupPayload.attendees)) {
          for (const att of groupPayload.attendees) {
            const memNo = att.memberNo?.trim();
            const attEmail = att.email?.trim()?.toLowerCase();
            if (memNo) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Rejected'
                WHERE meeting_id = ${slip.meeting_id} AND member_no = ${memNo}
              `;
            }
            if (attEmail) {
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Rejected'
                WHERE meeting_id = ${slip.meeting_id} AND member_no IS NULL AND LOWER(attendee_email) = ${attEmail}
              `;
              await prisma.$executeRaw`
                UPDATE meeting_attendances
                SET attendance_status = 'Rejected'
                WHERE meeting_id = ${slip.meeting_id}
                  AND member_no IN (SELECT member_no FROM members WHERE LOWER(email) = ${attEmail})
              `.catch(() => {});
            }
          }
          if (slip.ticket_code) {
            await prisma.$executeRaw`
              UPDATE sponsor_group_members
              SET status = 'rejected', updated_at = NOW()
              WHERE ticket_code = ${slip.ticket_code}
            `.catch(() => {});
          }
        } else if (slip.member_no) {
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
        slip.ticket_code?.startsWith('GRP-') ||
        slip.ticket_code?.startsWith('GRP_') ||
        slip.slip_id?.includes('GRP') ||
        (groupPayload?.isGroup === true && (
          (Array.isArray(groupPayload?.attendees) && groupPayload.attendees.length > 1) ||
          (Array.isArray(groupPayload?.applicants) && groupPayload.applicants.length > 1)
        )) ||
        Boolean(slip.guest_name?.includes('ท่าน') && (slip.ticket_code?.startsWith('GRP') || slip.slip_id?.includes('GRP'))) ||
        Boolean(slip.guest_workplace && (slip.ticket_code?.startsWith('GRP') || slip.slip_id?.includes('GRP')))
      );

      let recipientEmail = '';
      let recipientName = '';

      let actObj = slip.selected_activities;
      if (typeof actObj === 'string') {
        try { actObj = JSON.parse(actObj); } catch { }
      }

      if (isCorporate) {
        const resolved = await resolveCorporateEmail(slip, groupPayload || actObj);
        recipientEmail = resolved.email || slip.guest_email || slip.members?.email || (actObj?.attendees?.[0]?.email) || (groupPayload?.attendees?.[0]?.email) || (actObj?.email) || '';
        recipientName = resolved.name || slip.guest_name || slip.members?.fullNameTh || (actObj?.attendees?.[0]?.nameTh) || (actObj?.attendees?.[0]?.fullNameTh) || (groupPayload?.attendees?.[0]?.nameTh) || 'ผู้สมัคร';
      } else {
        recipientEmail = slip.members?.email || slip.guest_email || memberPayload?.email || (actObj?.attendees?.[0]?.email) || (groupPayload?.attendees?.[0]?.email) || (actObj?.email) || '';
        recipientName = slip.members?.fullNameTh || slip.guest_name || memberPayload?.full_name_th || (actObj?.attendees?.[0]?.nameTh) || (actObj?.attendees?.[0]?.fullNameTh) || (groupPayload?.attendees?.[0]?.nameTh) || (actObj?.nameTh) || 'ผู้สมัคร';
      }

      // แสดงแค่ข้อมูลบริษัท ถ้าเป็นองค์กร/กลุ่ม อย่าดึงเบอร์โทรของผู้สมัครมาปน
      const applicantPhone = isCorporate ? undefined : (slip.members?.mobile || slip.guest_phone || memberPayload?.mobile || actObj?.attendees?.[0]?.mobile || actObj?.attendees?.[0]?.phone || '');
      const applicantWorkplace = isCorporate ? undefined : (slip.members?.workplace || slip.guest_workplace || memberPayload?.workplace || actObj?.attendees?.[0]?.workplace || '');

      const origin = request.headers.get('origin') || (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');
      const baseUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL || origin || 'http://localhost:3000';
      const resubmitUrl = `${baseUrl}/resubmit-slip/${resubmitToken}`;

      if (recipientEmail) {
        after(async () => {
        try {
          const mailResult = await sendSlipRejectionEmail({
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
            companyName: isCorporate ? recipientName : undefined,
            rejectType: effectiveRejectType,
          });
          console.log(`[Reject Slip] Rejection email sent to ${recipientEmail}, result:`, mailResult);
        } catch (mailErr) {
          console.error(`[Reject Slip] Failed to send rejection email to ${recipientEmail}:`, mailErr);
        }
        });
      } else {
        console.warn(`[Reject Slip] Could not find recipient email for slip ${slip.slip_id}, isCorporate: ${isCorporate}`);
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

async function approveAddOnSlip(slip: any, reviewer: string) {
  let merged: Awaited<ReturnType<typeof mergeAddOnSlip>>;
  try {
    merged = await mergeAddOnSlip(slip.slip_id, reviewer);
  } catch (err) {
    if (err instanceof AddOnMergeError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { original, newActivities } = merged;

  // ส่งอีเมลยืนยันการลงทะเบียนฉบับปรับปรุง (รวมกิจกรรมทั้งหมด) หลังตอบกลับแอดมินแล้ว
  after(async () => {
    try {
      const member = original.member_no
        ? await prisma.member.findUnique({ where: { member_no: original.member_no } })
        : null;
      const payload = parseSlipPayload(original.selected_activities) || {};
      const recipientEmail = (member?.email || original.guest_email || payload.email || '').trim();
      if (!recipientEmail) {
        console.warn(`⚠️ [ADD-ON APPROVAL] No recipient email for slip ${original.slip_id}`);
        return;
      }

      const meeting = await prisma.meetings.findUnique({ where: { meeting_id: original.meeting_id } });
      let meetingDateStr: string | undefined;
      if (meeting?.start_date && meeting?.end_date) {
        const start = new Date(meeting.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const end = new Date(meeting.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        meetingDateStr = start === end ? start : `${start} - ${end}`;
      } else if (meeting?.meeting_date) {
        meetingDateStr = new Date(meeting.meeting_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      await sendRegistrationApprovedEmail({
        to: recipientEmail,
        recipientName: member?.fullNameTh || original.guest_name || payload.nameTh || 'ผู้ลงทะเบียน',
        nameEn: member?.fullNameEn || payload.nameEn || undefined,
        memberNo: original.member_no || undefined,
        position: member?.position || payload.position || undefined,
        workplace: payload.workplace || member?.workplace || original.guest_workplace || undefined,
        email: recipientEmail,
        phone: member?.mobile || original.guest_phone || payload.phone || undefined,
        attendanceType: payload.attendanceType || undefined,
        meetingName: meeting?.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
        meetingDate: meetingDateStr,
        ticketCode: original.ticket_code || '',
        amountPaid: original.amount,
        isMember: original.is_member,
        selectedActivities: original.selected_activities,
      });
    } catch (mailErr) {
      console.error('❌ [ADD-ON APPROVAL EMAIL ERROR]:', mailErr);
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      status: 'approved',
      isAddOnMerged: true,
      originalSlipId: original.slip_id,
      message: `อนุมัติและรวมกิจกรรมเพิ่มเติม ${newActivities.length} รายการเข้ากับรายการลงทะเบียนเดิม (${original.ticket_code || original.slip_id}) เรียบร้อยแล้ว`,
    },
  });
}
