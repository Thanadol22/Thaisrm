import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';
import { ADD_ON_MERGED_STATUS } from '@/lib/services/registrationAddOnService';

const NO_SLIP_URLS = new Set(['PAY_LATER', 'pay_later_pending', '/placeholder-slip.png', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP']);

/** สถานะการชำระเงินของบิล (ใช้เกณฑ์เดียวกับหน้าบริษัทสปอนเซอร์) */
function billStatus(s: any): { key: string; label: string } {
  const url: string = s.slip_url || '';
  const hasActualSlip = Boolean(url) && !NO_SLIP_URLS.has(url) && !url.startsWith('TEMP_');
  const isPayLater =
    url === 'PAY_LATER' ||
    url === 'pay_later_pending' ||
    (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later')));

  if (s.status === 'rejected') return { key: 'rejected', label: 'ถูกปฏิเสธ' };
  if (Number(s.amount) === 0) return { key: 'free', label: s.status === 'approved' ? 'ฟรี อนุมัติแล้ว' : 'ฟรี รออนุมัติ' };
  if (hasActualSlip) {
    return s.status === 'approved'
      ? { key: 'paid', label: 'ชำระเงินแล้ว' }
      : { key: 'review', label: 'รอตรวจสลิป' };
  }
  if (isPayLater) {
    return s.status === 'approved'
      ? { key: 'awaiting', label: 'อนุมัติแล้ว รอชำระเงิน' }
      : { key: 'pending', label: 'รออนุมัติสิทธิ์' };
  }
  return s.status === 'approved' ? { key: 'paid', label: 'อนุมัติแล้ว' } : { key: 'pending', label: 'รออนุมัติสิทธิ์' };
}

function parsePayload(raw: unknown): any {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw && typeof raw === 'object' ? raw : null;
}

const cleanNo = (v: unknown) => String(v ?? '').trim().replace(/^0+/, '');

// GET /api/admin/sponsors/registrations - ประวัติการลงทะเบียนของบริษัททั้งหมด แตกทุกบิลเป็นรายผู้เข้าร่วม
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [slips, groupMembers, attendances] = await Promise.all([
      prisma.payment_slips.findMany({
        where: {
          status: { not: ADD_ON_MERGED_STATUS },
          OR: [
            { ticket_code: { startsWith: 'GRP' } },
            { ticket_code: { startsWith: 'MEMGRP' } },
            { slip_id: { startsWith: 'SLIP-GRP' } },
            { slip_id: { startsWith: 'SLIP-SPON' } },
            { guest_workplace: { not: null } },
          ],
        },
        include: { meetings: { select: { meeting_name: true, activities: true } } },
        orderBy: { created_at: 'desc' },
      }),
      prisma.sponsor_group_members.findMany({
        include: {
          sponsor: { select: { name: true } },
          meeting: { select: { meeting_name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.meeting_attendances.findMany({
        where: { OR: [{ sponsor_id: { not: null } }, { sponsor_company_name: { not: null } }] },
        select: { meeting_id: true, member_no: true, attendee_email: true, attendance_status: true },
      }),
    ]);

    // สถานะเข้างานของแต่ละคน
    const attendanceByKey = new Map<string, string>();
    for (const a of attendances) {
      if (a.member_no) attendanceByKey.set(`${a.meeting_id}|m:${cleanNo(a.member_no)}`, a.attendance_status);
      if (a.attendee_email) attendanceByKey.set(`${a.meeting_id}|e:${a.attendee_email.trim().toLowerCase()}`, a.attendance_status);
    }
    const attendanceOf = (meetingId: string, memberNo: unknown, email: unknown) => {
      const no = cleanNo(memberNo);
      const mail = String(email ?? '').trim().toLowerCase();
      return (no && attendanceByKey.get(`${meetingId}|m:${no}`)) || (mail && attendanceByKey.get(`${meetingId}|e:${mail}`)) || null;
    };

    const rows: any[] = [];
    const coveredTickets = new Set<string>();
    const coveredPeople = new Set<string>();

    for (const s of slips) {
      const payload = parsePayload(s.selected_activities);
      // บันทึกแยกสำหรับผู้ดูแลระบบ (เช่น รายการ fellow ที่รวมอยู่ในบิลเดิมแล้ว) ไม่ใช่บิลจริงของบริษัท
      if (!payload || payload.adminOnly) continue;
      const isMembership = payload.type === 'membership_group_registration' || Array.isArray(payload.applicants) && !Array.isArray(payload.attendees);
      const people: any[] = Array.isArray(payload.attendees) ? payload.attendees : Array.isArray(payload.applicants) ? payload.applicants : [];
      if (!payload.isGroup && payload.type !== 'conference_group_registration' && !isMembership) continue;
      if (people.length === 0) continue;

      if (s.ticket_code) coveredTickets.add(s.ticket_code);
      const status = billStatus(s);
      const company = payload.companyName || s.guest_workplace || '-';
      const meetingActs = Array.isArray(s.meetings?.activities) ? (s.meetings!.activities as any[]) : [];

      people.forEach((att: any, idx: number) => {
        if (!att || typeof att !== 'object') return;
        const memberNo = att.memberNo || att.member_no || '';
        const email = String(att.email || att.attendee_email || '').trim().toLowerCase();
        const programs = isMembership
          ? []
          : resolveAttendeeActivities(att, meetingActs).map((a: any) => String(a?.name || '')).filter(Boolean);
        const format = (att.selectedFormat || att.attendanceType || att.format) === 'online' ? 'ออนไลน์' : 'ออนไซต์';
        const no = cleanNo(memberNo);
        if (no) coveredPeople.add(`${s.meeting_id}|m:${no}`);
        if (email) coveredPeople.add(`${s.meeting_id}|e:${email}`);

        rows.push({
          key: `${s.slip_id}_${idx}`,
          billNo: s.ticket_code || s.slip_id,
          slipId: s.slip_id,
          billDate: s.created_at,
          billAmount: Number(s.amount) || 0,
          billCount: people.length,
          billStatus: status.key,
          billStatusLabel: status.label,
          billType: isMembership ? 'สมัครสมาชิก' : 'ลงทะเบียนประชุม',
          company,
          couponCode: payload.couponCode || payload.couponData?.code || null,
          meetingId: s.meeting_id,
          meetingName: s.meetings?.meeting_name || s.meeting_id,
          seq: idx + 1,
          memberNo: memberNo || '',
          name: att.nameTh || att.fullNameTh || att.full_name_th || att.fullName || att.nameEn || att.fullNameEn || att.full_name_en || '-',
          email,
          phone: att.phone || att.mobile || '',
          programs: programs.join(', '),
          format: isMembership ? '' : format,
          isAddOn: Boolean(att.isAddOn),
          discount: Number(att.discountTotal ?? att.discountAmount ?? 0) || 0,
          netPrice: Number(att.price ?? att.netPrice ?? 0) || 0,
          attendanceStatus: isMembership ? null : attendanceOf(s.meeting_id, memberNo, email),
        });
      });
    }

    // รายการที่ลงผ่านโควต้าบริษัทโดยไม่มีบิล
    const quotaBills = new Map<string, any[]>();
    for (const gm of groupMembers) {
      if (gm.ticket_code && coveredTickets.has(gm.ticket_code)) continue;
      const no = cleanNo(gm.member_no);
      const mail = (gm.attendee_email || '').trim().toLowerCase();
      if ((no && coveredPeople.has(`${gm.meeting_id}|m:${no}`)) || (mail && coveredPeople.has(`${gm.meeting_id}|e:${mail}`))) continue;
      const day = new Date(gm.created_at).toISOString().slice(0, 10);
      const groupKey = `${gm.sponsor_id}|${gm.meeting_id}|${day}`;
      const list = quotaBills.get(groupKey) || [];
      list.push(gm);
      quotaBills.set(groupKey, list);
    }
    for (const [groupKey, list] of quotaBills) {
      list.forEach((gm, idx) => {
        rows.push({
          key: `sgm_${gm.id.toString()}`,
          billNo: `โควต้า-${groupKey.split('|')[2].replace(/-/g, '')}`,
          slipId: null,
          billDate: list[0].created_at,
          billAmount: 0,
          billCount: list.length,
          billStatus: 'quota',
          billStatusLabel: 'ใช้โควต้าบริษัท',
          billType: 'ลงทะเบียนประชุม',
          company: gm.sponsor?.name || '-',
          couponCode: gm.coupon_code,
          meetingId: gm.meeting_id,
          meetingName: gm.meeting?.meeting_name || gm.meeting_id,
          seq: idx + 1,
          memberNo: gm.member_no || '',
          name: gm.attendee_name || '-',
          email: (gm.attendee_email || '').toLowerCase(),
          phone: gm.attendee_phone || '',
          programs: '',
          format: 'ออนไซต์',
          isAddOn: false,
          discount: gm.discount_amount || 0,
          netPrice: gm.net_price || 0,
          attendanceStatus: attendanceOf(gm.meeting_id, gm.member_no, gm.attendee_email),
          // ใช้เลขบัตรของแต่ละคนเป็นข้อมูลประกอบ
          ticketCode: gm.ticket_code,
        });
      });
    }

    rows.sort((a, b) => {
      const t = new Date(b.billDate).getTime() - new Date(a.billDate).getTime();
      if (t !== 0) return t;
      if (a.billNo !== b.billNo) return a.billNo < b.billNo ? -1 : 1;
      return a.seq - b.seq;
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('[AdminSponsorRegistrations] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติการลงทะเบียนของบริษัท' },
      { status: 500 }
    );
  }
}
