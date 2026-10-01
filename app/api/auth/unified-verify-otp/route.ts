import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createOtpSessionToken } from '@/lib/security/otpSessionAuth';
import { statusLabelTh } from '@/lib/statusLabels';
import { resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุอีเมลและรหัส OTP' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: 'รูปแบบรหัส OTP ไม่ถูกต้อง กรุณากรอกตัวเลข 6 หลัก' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 1. ตรวจสอบรหัส OTP (ตรวจสอบทั้ง hashed และ plaintext เพื่อ backward-compatibility)
    let otpRecord: any = null;
    if (prismaAny.sponsor_otp_codes) {
      otpRecord = await prismaAny.sponsor_otp_codes.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          otp_code: { in: [hashedOtp, otp] },
          is_used: false,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsor_otp_codes
        WHERE LOWER(email) = LOWER(${email})
          AND otp_code IN (${hashedOtp}, ${otp})
          AND is_used = false
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
      otpRecord = list[0] || null;
    }

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว (กรุณาขอรหัสใหม่)',
        },
        { status: 401 }
      );
    }

    // ทำเครื่องหมายว่าใช้งานแล้ว
    if (prismaAny.sponsor_otp_codes) {
      await prismaAny.sponsor_otp_codes.update({
        where: { id: otpRecord.id },
        data: { is_used: true },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE sponsor_otp_codes SET is_used = true WHERE id = ${otpRecord.id}
      `;
    }

    // 2. ตรวจสอบว่าเป็น Member หรือ Sponsor
    let member: any = null;
    if (prismaAny.member) {
      member = await prismaAny.member.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: {
          member_educations: {
            orderBy: { graduation_year: 'desc' },
          },
        },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM members WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `;
      member = list[0] || null;
      if (member) {
        const edus: any[] = await prisma.$queryRaw`
          SELECT * FROM member_educations WHERE member_no = ${member.member_no} ORDER BY graduation_year DESC
        `;
        member.member_educations = edus;
      }
    }

    if (member) {
      // จัดเตรียมข้อมูล Member พร้อมสถิติความสมบูรณ์ของข้อมูล
      const rawEdus = (member.member_educations || []).map((e: any) => ({
        edu_id: e.edu_id ? e.edu_id.toString() : '',
        degree: e.degree || '',
        institution: e.institution || '',
        graduation_year: e.graduation_year || '',
      }));

      // เช็คฟิลด์ที่ว่างให้ตรงกับเงื่อนไขการสมัคร
      const fieldsToCheck = [
        { key: 'fullNameTh', label: 'ชื่อ-นามสกุล (ภาษาไทย)' },
        { key: 'fullNameEn', label: 'ชื่อ-นามสกุล (ภาษาอังกฤษ)' },
        { key: 'idLast4', label: 'เลข 4 หลักท้ายบัตรประชาชน' },
        { key: 'mobile', label: 'เบอร์โทรศัพท์มือถือ' },
        { key: 'workplace', label: 'สถานที่ทำงาน' },
        { key: 'position', label: 'ตำแหน่งงาน' },
      ];

      const missingFields: string[] = [];
      fieldsToCheck.forEach((f) => {
        const val = member[f.key];
        if (!val || String(val).trim() === '' || String(val).trim() === '-' || String(val).trim().toLowerCase() === 'null') {
          missingFields.push(f.label);
        }
      });

      const sessionToken = createOtpSessionToken({
        email: member.email || email,
        userType: 'member',
        member_no: member.member_no,
      });

      return NextResponse.json({
        success: true,
        userType: 'member',
        sessionToken,
        data: {
          member_no: member.member_no,
          fullNameTh: member.fullNameTh || '',
          fullNameEn: member.fullNameEn || '',
          idLast4: member.idLast4 || '',
          mobile: member.mobile || '',
          email: member.email || '',
          lineId: member.lineId || '',
          address: member.address || '',
          workplace: member.workplace || '',
          work_phone: member.work_phone || '',
          work_start_date: member.work_start_date ? new Date(member.work_start_date).toISOString().split('T')[0] : '',
          position: member.position || '',
          job_category: member.job_category || '',
          job_category_other: member.job_category_other || '',
          scientist_license_no: member.scientist_license_no || '',
          referees: member.referees || '',
          photo_url: member.photo_url || '',
          degree_cert_doc: member.degree_cert_doc || '',
          work_cert_doc: member.work_cert_doc || '',
          membership_status: member.membership_status || 'ปกติ',
          membership_type: member.membership_type || 'สามัญ',
          applied_at: member.applied_at,
          expire_date: member.expire_date,
          educations: rawEdus,
          missingFields,
          isProfileComplete: missingFields.length === 0,
        },
      });
    }

    // 3. หากเป็น Sponsor
    let sponsor: any = null;
    if (prismaAny.sponsors) {
      sponsor = await prismaAny.sponsors.findFirst({
        where: {
          contact_email: { equals: email, mode: 'insensitive' },
          is_active: true,
        },
        include: {
          quotas: {
            include: {
              meeting: {
                select: { meeting_id: true, meeting_name: true, meeting_date: true },
              },
            },
          },
          group_members: {
            include: {
              meeting: {
                select: { meeting_id: true, meeting_name: true },
              },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors WHERE LOWER(contact_email) = LOWER(${email}) AND is_active = true LIMIT 1
      `;
      sponsor = list[0] || null;
      if (sponsor) {
        sponsor.quotas = await prisma.$queryRaw`
          SELECT sq.*, m.meeting_name, m.meeting_date
          FROM sponsor_quotas sq
          JOIN meetings m ON sq.meeting_id = m.meeting_id
          WHERE sq.sponsor_id = ${sponsor.id}
        `;
        sponsor.group_members = await prisma.$queryRaw`
          SELECT sgm.*, m.meeting_name
          FROM sponsor_group_members sgm
          JOIN meetings m ON sgm.meeting_id = m.meeting_id
          WHERE sgm.sponsor_id = ${sponsor.id}
          ORDER BY sgm.created_at DESC
        `;
      }
    }

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบบัญชีผู้ใช้งานที่ผูกกับอีเมลนี้' },
        { status: 404 }
      );
    }

    // ค้นหาสลิปทั้งหมดที่เกี่ยวข้องกับ Sponsor นี้
    let sponsorSlipsRaw: any[] = [];
    try {
      sponsorSlipsRaw = await prisma.payment_slips.findMany({
        where: {
          OR: [
            { guest_email: { equals: email, mode: 'insensitive' } },
            { guest_email: { equals: sponsor.contact_email, mode: 'insensitive' } },
            { guest_workplace: { equals: sponsor.name, mode: 'insensitive' } },
          ],
        },
        include: {
          meetings: {
            select: { meeting_id: true, meeting_name: true, activities: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (e) {
      console.error('[UnifiedVerifyOTP] Error fetching sponsor slips:', e);
    }
    // บันทึกแยกสำหรับผู้ดูแลระบบ (เช่น รายการ fellow ที่รวมอยู่ในบิลเดิมแล้ว) ไม่แสดงให้บริษัท
    sponsorSlipsRaw = sponsorSlipsRaw.filter((s: any) => !(s.selected_activities as any)?.adminOnly);

    // Process slips to determine actual payment & pay-later status
    const sponsorSlips = sponsorSlipsRaw.map((s: any) => {
      const isPayLater =
        s.slip_url === 'PAY_LATER' ||
        s.slip_url === 'pay_later_pending' ||
        (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later'))) ||
        !s.slip_url ||
        s.slip_url === '/placeholder-slip.png';

      const hasActualSlip = Boolean(
        s.slip_url &&
        s.slip_url !== 'PAY_LATER' &&
        s.slip_url !== 'pay_later_pending' &&
        s.slip_url !== '/placeholder-slip.png' &&
        s.slip_url !== 'GROUP_REGISTRATION' &&
        s.slip_url !== 'GROUP_MEMBERSHIP' &&
        !s.slip_url.startsWith('TEMP_')
      );

      // Determine item-level payment status
      let itemStatus: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'pending_payment_review' | 'rejected' | 'awaiting_payment' = 'approved';
      if (s.status === 'rejected') {
        itemStatus = 'rejected';
      } else if (hasActualSlip && s.status === 'pending') {
        // มีสลิปจริง + pending = ส่งสลิปแล้ว รอตรวจสอบการชำระเงิน (ไม่ใช่ รออนุมัติสิทธิ์)
        itemStatus = 'pending_payment_review';
      } else if (hasActualSlip && s.status === 'approved') {
        // มีสลิปจริง + approved = ยืนยันการชำระเงินแล้ว
        itemStatus = 'approved';
      } else if (isPayLater) {
        if (s.status === 'approved') {
          // PAY_LATER + approved = อนุมัติสิทธิ์แล้ว รอชำระเงิน
          itemStatus = 'approved_awaiting_payment';
        } else {
          // PAY_LATER + pending = รออนุมัติสิทธิ์
          itemStatus = 'awaiting_payment';
        }
      } else if (s.amount > 0 && s.status === 'pending') {
        // ไม่มีสลิป + pending = รออนุมัติสิทธิ์
        itemStatus = 'pending_review';
      } else if (s.amount === 0) {
        itemStatus = 'approved';
      }

      // requiresSlipUpload: เฉพาะสถานะที่ยังรอให้บริษัทอัพสลิป
      // pending_payment_review = ส่งสลิปแล้ว ไม่ต้องแสดงฟอร์มอีก
      const requiresSlipUpload =
        (itemStatus === 'approved_awaiting_payment' || itemStatus === 'awaiting_payment' || itemStatus === 'rejected') &&
        s.amount > 0;

      // Extract details from selected_activities (if any)
      const groupPayload = (s.selected_activities as any) || {};
      const attendees = Array.isArray(groupPayload.attendees)
        ? groupPayload.attendees
        : Array.isArray(groupPayload.applicants)
        ? groupPayload.applicants
        : [];
      const attendeesCount = attendees.length || 1;
      const isGroupMembership = Boolean(
        s.ticket_code?.startsWith('MEMGRP') ||
        groupPayload.isGroupMembership ||
        groupPayload.membershipType
      );

      const isFellowSlip = Boolean(groupPayload.isFellow || groupPayload.priceTier === 'fellow');
      const title = isGroupMembership
        ? `ค่าสมัครสมาชิกแบบกลุ่ม (${sponsor.name} - รวม ${attendeesCount} ท่าน)`
        : `ลงทะเบียนประชุมแบบกลุ่ม${isFellowSlip ? ' ราคา fellow' : ''} (${sponsor.name} - รวม ${attendeesCount} ท่าน)`;

      return {
        id: s.id ? s.id.toString() : '',
        slip_id: s.slip_id,
        ticket_code: s.ticket_code || s.slip_id,
        meeting_id: s.meeting_id,
        meeting_name: s.meetings?.meeting_name || (s.meeting_id === 'TSRM34' ? '34th TSRM2026 V.2' : s.meeting_id),
        title,
        amount: Number(s.amount) || 0,
        bank: s.bank,
        transfer_date: s.transfer_date,
        transfer_time: s.transfer_time,
        slip_url: hasActualSlip ? s.slip_url : '',
        raw_slip_url: s.slip_url,
        status: s.status,
        itemStatus,
        isPayLater,
        hasActualSlip,
        requiresSlipUpload,
        rejection_reason: s.rejection_reason,
        attendeesCount,
        created_at: s.created_at,
      };
    });

    // Aggregating all registered group members (from sponsor_group_members + meeting_attendances + slips payload)
    // 1 คน / 1 งานประชุม = 1 แถว: ใช้เลขสมาชิกเป็นหลัก (ตัดศูนย์นำหน้า) หากไม่มีจึงใช้อีเมล
    const aggregatedMembersMap = new Map<string, any>();
    const personKey = (meetingId: unknown, memberNo: unknown, email: unknown): string | null => {
      const no = String(memberNo ?? '').trim().replace(/^0+/, '');
      if (no && no !== '-' && no !== 'null') return `${meetingId}|m:${no}`;
      const mail = String(email ?? '').trim().toLowerCase();
      if (mail && mail !== '-') return `${meetingId}|e:${mail}`;
      return null;
    };

    // 1. From sponsor.group_members
    (sponsor.group_members || []).forEach((m: any) => {
      const key = personKey(m.meeting_id, m.member_no, m.attendee_email);
      if (!key || aggregatedMembersMap.has(key)) return;
      aggregatedMembersMap.set(key, {
        id: m.id ? m.id.toString() : '',
        member_no: m.member_no || '-',
        attendee_name: m.attendee_name || '-',
        attendee_email: m.attendee_email || '-',
        ticket_code: m.ticket_code || '-',
        discount_amount: m.discount_amount || 0,
        net_price: m.net_price || 0,
        status: m.status || 'ยืนยันสิทธิ์แล้ว',
        meeting_id: m.meeting_id,
        meeting_name: m.meeting?.meeting_name || m.meeting_name || 'งานประชุม',
        created_at: m.created_at,
      });
    });

    // 2. From meeting_attendances linked to this sponsor
    try {
      const attendances = await prisma.meeting_attendances.findMany({
        where: {
          OR: [
            { sponsor_id: sponsor.id },
            { sponsor_company_name: { equals: sponsor.name, mode: 'insensitive' } },
          ],
        },
        include: {
          members: {
            select: { member_no: true, fullNameTh: true, fullNameEn: true, email: true, workplace: true },
          },
          meetings: {
            select: { meeting_id: true, meeting_name: true },
          },
        },
      });

      attendances.forEach((att: any) => {
        const mem = att.members;
        const attEmail = att.attendee_email || mem?.email || '';
        const key = personKey(att.meeting_id, att.member_no, attEmail);
        if (key && !aggregatedMembersMap.has(key)) {
          aggregatedMembersMap.set(key, {
            id: att.attendance_id ? att.attendance_id.toString() : '',
            member_no: att.member_no || '-',
            attendee_name: att.attendee_name || mem?.fullNameTh || mem?.fullNameEn || (att.member_no ? `สมาชิก #${att.member_no}` : '-'),
            attendee_email: attEmail ? String(attEmail).toLowerCase() : '-',
            ticket_code: att.ticket_code || '-',
            discount_amount: 0,
            net_price: 0,
            status: att.attendance_status === 'Registered' ? 'ยืนยันสิทธิ์แล้ว' : statusLabelTh(att.attendance_status),
            meeting_id: att.meeting_id,
            meeting_name: att.meetings?.meeting_name || att.meeting_id,
            created_at: att.created_at,
          });
        }
      });
    } catch (attErr) {
      console.error('[UnifiedVerifyOTP] Error fetching attendances for sponsor:', attErr);
    }

    // 3. From payment_slips payload attendees (ไม่นับรายการที่ถูกปฏิเสธ)
    const activeSponsorSlips = sponsorSlipsRaw.filter((s: any) => s.status !== 'rejected');
    // ยอดสุทธิรวมของแต่ละคนจากทุกรายการ (เช่น ลงเวิร์กช็อปรายการหนึ่ง แล้วลงการประชุมหลักเพิ่มอีกรายการ)
    const payloadNetByPerson = new Map<string, number>();
    activeSponsorSlips.forEach((s: any) => {
      const payload = (s.selected_activities as any) || {};
      const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];
      attendees.forEach((att: any) => {
        if (!att || typeof att !== 'object') return;
        const emailKey = att.email?.trim()?.toLowerCase() || '';
        const memberNoKey = att.memberNo || att.member_no || '';
        const key = personKey(s.meeting_id, memberNoKey, emailKey);
        if (!key) return;
        if (payload.type !== 'membership_group_registration') {
          payloadNetByPerson.set(key, (payloadNetByPerson.get(key) || 0) + Number(att.price ?? att.netPrice ?? 0));
        }
        if (!aggregatedMembersMap.has(key)) {
          aggregatedMembersMap.set(key, {
            id: `payload_${s.id}_${emailKey}`,
            member_no: memberNoKey || '-',
            attendee_name: att.nameTh || att.nameEn || att.fullNameTh || att.fullNameEn || att.fullName || '-',
            attendee_email: emailKey || '-',
            ticket_code: s.ticket_code || '-',
            discount_amount: Number(att.discountTotal || att.discountAmount || 0),
            net_price: Number(att.price || att.netPrice || 0),
            status: s.status === 'approved' ? 'อนุมัติสิทธิ์แล้ว' : 'รอตรวจสอบ',
            meeting_id: s.meeting_id,
            meeting_name: s.meetings?.meeting_name || s.meeting_id,
            created_at: s.created_at,
          });
        }
      });
    });

    // รายการหลักสูตรและรูปแบบการเข้าร่วมของแต่ละคน จากข้อมูลการลงทะเบียนประชุมแบบกลุ่ม
    // เพื่อให้บริษัทตรวจสอบได้เองว่าแต่ละคนลงหลักสูตรใด แบบออนไซต์หรือออนไลน์
    // คนเดียวกันอาจลงหลายรายการ (เช่น เวิร์กช็อปรายการหนึ่ง การประชุมหลักอีกรายการ) จึงรวมหลักสูตรจากทุกรายการ
    // price = ราคาสุทธิของหลักสูตรนั้น (หักสิทธิ์ฟรีจากคูปองบริษัท ซึ่งครอบคลุมเฉพาะการประชุมหลัก)
    type ProgramEntry = { name: string; type: string; format: 'onsite' | 'online'; price?: number; isFellow?: boolean };
    const programLookup = new Map<string, ProgramEntry[]>();
    const addPrograms = (key: string, programs: ProgramEntry[]) => {
      const list = programLookup.get(key) || [];
      for (const p of programs) {
        if (!list.some((x) => x.name.trim().toLowerCase() === p.name.trim().toLowerCase())) list.push(p);
      }
      list.sort((a, b) => Number(b.type === 'main') - Number(a.type === 'main'));
      programLookup.set(key, list);
    };
    activeSponsorSlips.forEach((s: any) => {
      const payload = (s.selected_activities as any) || {};
      if (payload.type === 'membership_group_registration' || !Array.isArray(payload.attendees)) return;
      const meetingActs = Array.isArray(s.meetings?.activities) ? (s.meetings.activities as any[]) : [];

      payload.attendees.forEach((att: any) => {
        if (!att || typeof att !== 'object') return;
        const attFormat = (att.selectedFormat || att.attendanceType || att.format) === 'online' ? 'online' : 'onsite';
        let acts = resolveAttendeeActivities(att, meetingActs);
        if (acts.length === 0) acts = meetingActs.filter((a: any) => a?.type === 'main').slice(0, 1);
        let discountLeft = Math.max(0, Number(att.discountTotal ?? att.discountAmount ?? 0) || 0);
        const isFellowAttendee = Boolean(payload.isFellow || payload.priceTier === 'fellow' || att.priceTier === 'fellow');
        const programs: ProgramEntry[] = acts.map((a: any) => {
          // หลักสูตรที่กำหนดรูปแบบตายตัว (เช่น workshop ออนไซต์) คงตามนั้น ที่เหลือตามรูปแบบที่ผู้เข้าร่วมเลือก
          const fixed = a?.format || (a?.type === 'workshop' ? 'onsite' : 'both');
          const isMain = a?.type === 'main' || a?.id === 'main';
          const listPrice = Number(a?.price);
          let price: number | undefined;
          if (Number.isFinite(listPrice)) {
            const discount = isMain ? Math.min(discountLeft, listPrice) : 0;
            discountLeft -= discount;
            price = Math.max(0, listPrice - discount);
          }
          return {
            name: String(a?.name || 'Main Program'),
            type: String(a?.type || 'main'),
            format: fixed === 'onsite' || fixed === 'online' ? fixed : attFormat,
            price,
            isFellow: isFellowAttendee && (isMain || a?.priceTier === 'fellow'),
          };
        });
        // ราคาแยกหลักสูตรต้องรวมได้เท่ายอดสุทธิของผู้ลงทะเบียน ไม่เช่นนั้นไม่แสดงราคาแยก (ข้อมูลเก่าที่คำนวณต่างกัน)
        const attNet = Number(att.price ?? att.netPrice);
        const sumPrograms = programs.reduce((sum, p) => sum + (p.price ?? NaN), 0);
        if (!Number.isFinite(attNet) || sumPrograms !== attNet) programs.forEach((p) => delete p.price);

        const memberKey = personKey(s.meeting_id, att.memberNo || att.member_no, '');
        const emailKey = personKey(s.meeting_id, '', att.email);
        if (memberKey) addPrograms(memberKey, programs);
        if (emailKey) addPrograms(emailKey, programs);
      });
    });

    const rawGroupMembers = Array.from(aggregatedMembersMap.values()).map((m: any) => {
      const memberKey = personKey(m.meeting_id, m.member_no, '');
      const emailKey = personKey(m.meeting_id, '', m.attendee_email);
      const programs =
        (memberKey && programLookup.get(memberKey)) ||
        (emailKey && programLookup.get(emailKey)) ||
        [];
      const ownKey = memberKey || emailKey;
      const payloadNet = ownKey ? payloadNetByPerson.get(ownKey) : undefined;
      return {
        ...m,
        net_price: payloadNet !== undefined ? payloadNet : m.net_price,
        programs,
        isMembershipOnly: programs.length === 0 && String(m.ticket_code || '').startsWith('MEMGRP'),
      };
    });

    // Calculate totals and overall financial status
    const pendingPaymentReviewSlips = sponsorSlips.filter((s) => s.itemStatus === 'pending_payment_review');
    const awaitingAccessSlips = sponsorSlips.filter((s) => s.itemStatus === 'awaiting_payment' || s.itemStatus === 'pending_review');
    const awaitingPaymentSlips = sponsorSlips.filter((s) => s.requiresSlipUpload);
    const rejectedSlips = sponsorSlips.filter((s) => s.itemStatus === 'rejected');

    const totalOutstandingAmount = awaitingPaymentSlips.reduce((sum, s) => sum + s.amount, 0);
    const totalSlipsAmount = sponsorSlips.reduce((sum, s) => sum + s.amount, 0);

    const hasOutstanding = awaitingPaymentSlips.length > 0;

    let overallPaymentStatus: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'pending_payment_review' | 'rejected' | 'unpaid' | 'free_quota' = 'approved';
    if (awaitingPaymentSlips.length > 0) {
      const hasApprovedAwaiting = awaitingPaymentSlips.some((s) => s.itemStatus === 'approved_awaiting_payment');
      overallPaymentStatus = hasApprovedAwaiting ? 'approved_awaiting_payment' : 'unpaid';
    } else if (pendingPaymentReviewSlips.length > 0) {
      overallPaymentStatus = 'pending_payment_review';
    } else if (awaitingAccessSlips.length > 0) {
      overallPaymentStatus = 'pending_review';
    } else if (rejectedSlips.length > 0) {
      overallPaymentStatus = 'rejected';
    } else if (sponsorSlips.length === 0 && rawGroupMembers.length === 0) {
      overallPaymentStatus = 'free_quota';
    } else {
      overallPaymentStatus = 'approved';
    }

    const sessionToken = createOtpSessionToken({
      email: sponsor.contact_email || email,
      userType: 'sponsor',
      sponsorId: sponsor.id,
    });

    return NextResponse.json({
      success: true,
      userType: 'sponsor',
      sessionToken,
      data: {
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        tier: sponsor.tier,
        contactName: sponsor.contact_name || '',
        contactEmail: sponsor.contact_email,
        quotas: (sponsor.quotas || []).map((q: any) => ({
          meeting_id: q.meeting_id,
          meeting_name: q.meeting?.meeting_name || q.meeting_name || '',
          quota_seats: q.quota_seats || 0,
          used_seats: q.used_seats || 0,
          remaining_seats: Math.max(0, (q.quota_seats || 0) - (q.used_seats || 0)),
        })),
        groupMembers: rawGroupMembers,
        slips: sponsorSlips,
        awaitingPaymentSlips,
        totalAmount: totalSlipsAmount,
        outstandingAmount: totalOutstandingAmount,
        hasOutstanding,
        paymentStatus: overallPaymentStatus,
      },
    });
  } catch (error: any) {
    console.error('[UnifiedVerifyOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' },
      { status: 500 }
    );
  }
}
