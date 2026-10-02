import { NextRequest, NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { isPersonalEmail, personalEmailRequiredMessage } from '@/lib/validators/emailPolicy';
import { sendRegistrationApprovedEmail, sendAttendeeSponsoredRegistrationEmail } from '@/lib/email';
import {
  isCouponApplicableToActivities,
  resolveAttendeeActivities,
  retireUsedSponsorCoupon,
} from '@/lib/services/sponsorCouponService';
import {
  findGuestRegistration,
  getAddOnEligibility,
  getMemberRegistrationSummary,
  mergeAddOnSlip,
  mergeGroupAddOnAttendees,
  slipActivityList,
} from '@/lib/services/registrationAddOnService';
import {
  countSlipSeatClaims,
  lockAndAssertSeats,
  SeatUnavailableError,
} from '@/lib/services/activitySeatService';
import { verifyOtpSessionToken } from '@/lib/security/otpSessionAuth';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import {
  isSpecialFormOpen,
  isSponsorAllowedForForm,
  resolveSpecialFormItems,
  priceSpecialFormAttendees,
  SpecialFormPricingError,
} from '@/lib/services/specialFormService';

// ส่งอีเมล (รวมงานใน after()) ทีละฉบับ — ให้เวลาพอสำหรับกลุ่มใหญ่
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = await request.json();

    const {
      isGroup,
      companyName,
      groupContact,
      attendees,
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
      couponCode,
      originalAmount,
      isPayLater,
      addOnToSlipId,
    } = body;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    const isPayLaterMode = Boolean(isPayLater);
    const numericAmount = Math.max(0, Number(amount) || 0);
    const isFreeRegistration = numericAmount === 0;

    // บังคับแนบสลิป ยกเว้นกรณีเลือกชำระเงินภายหลัง (Pay Later) หรือได้สิทธิ์ฟรี 100%
    if (!slipUrl && !isFreeRegistration && !isPayLaterMode) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพสลิปหลักฐานการโอนเงิน (ยกเว้นกรณีเลือกชำระเงินภายหลัง)' },
        { status: 400 }
      );
    }

    // Verify meeting exists
    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Handle Corporate / Group Registration
    if (isGroup) {
      if (!Array.isArray(attendees) || attendees.length === 0) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุรายชื่อผู้ลงทะเบียนอย่างน้อย 1 ท่าน' },
          { status: 400 }
        );
      }

      // ห้ามใช้อีเมลองค์กรสำหรับผู้ลงทะเบียนที่ไม่ใช่สมาชิก (สมาชิกใช้อีเมลจากฐานข้อมูล)
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const attEmail = att?.email?.trim();
        if (!att?.memberNo && attEmail && !isPersonalEmail(attEmail)) {
          return NextResponse.json(
            {
              success: false,
              error: `ผู้ลงทะเบียนลำดับที่ ${i + 1}: ${personalEmailRequiredMessage('th')}`,
              code: 'PERSONAL_EMAIL_REQUIRED',
            },
            { status: 400 }
          );
        }
      }

      // ห้ามใส่ผู้ลงทะเบียนคนเดียวกันซ้ำในรายการเดียว (เทียบเลขสมาชิก หรืออีเมลของบุคคลทั่วไป)
      const seenAttendeeKeys = new Map<string, number>();
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const attMemberNo = att?.memberNo ? String(att.memberNo).trim().replace(/^0+/, '') : '';
        const attEmail = att?.email ? String(att.email).trim().toLowerCase() : '';
        const key = attMemberNo ? `m:${attMemberNo}` : attEmail ? `e:${attEmail}` : '';
        if (!key) continue;
        if (seenAttendeeKeys.has(key)) {
          return NextResponse.json(
            {
              success: false,
              error: `ผู้ลงทะเบียนลำดับที่ ${i + 1} ซ้ำกับลำดับที่ ${seenAttendeeKeys.get(key)! + 1} กรุณาตรวจสอบรายชื่ออีกครั้ง`,
              code: 'DUPLICATE_REGISTRATION',
            },
            { status: 400 }
          );
        }
        seenAttendeeKeys.set(key, i);
      }

      // ผู้ที่ลงทะเบียนงานนี้แล้ว: ลงได้เฉพาะกิจกรรมเพิ่มเติม (isAddOn) และห้ามเลือกกิจกรรมที่ลงไว้แล้ว
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const attMemberNo = att?.memberNo ? String(att.memberNo).trim() : '';
        if (!attMemberNo) {
          att.isAddOn = false;
          // บุคคลทั่วไป: ตรวจจากอีเมล ทั้งรายการรายบุคคลและรายชื่อในรายการกลุ่มอื่น
          const guestEmail = att?.email ? String(att.email).trim() : '';
          const existing = guestEmail ? await findGuestRegistration(meetingId, guestEmail) : null;
          if (existing) {
            const label = `ผู้ลงทะเบียนลำดับที่ ${i + 1} ${att.nameTh || att.nameEn || ''}`.trim();
            const ref = existing.ticketCode ? ` ${existing.ticketCode}` : '';
            return NextResponse.json(
              {
                success: false,
                error: existing.approved
                  ? `${label}: อีเมล ${guestEmail} ได้ลงทะเบียนและได้รับการยืนยันเข้าร่วมงานประชุมนี้แล้ว${ref} ไม่สามารถลงทะเบียนซ้ำได้`
                  : `${label}: อีเมล ${guestEmail} มีรายการลงทะเบียนงานประชุมนี้แล้ว${ref} กำลังรอเจ้าหน้าที่ตรวจสอบ ไม่สามารถลงทะเบียนซ้ำได้`,
                code: 'DUPLICATE_REGISTRATION',
              },
              { status: 400 }
            );
          }
          continue;
        }
        const registration = await getMemberRegistrationSummary(meetingId, attMemberNo);
        const label = `ผู้ลงทะเบียนลำดับที่ ${i + 1} ${att.nameTh || att.nameEn || ''} #${attMemberNo}`.trim();

        if (!registration.registered) {
          att.isAddOn = false;
          delete att.addOnOriginalSlipId;
          continue;
        }
        if (!att.isAddOn) {
          return NextResponse.json(
            {
              success: false,
              error: `${label}: ได้ลงทะเบียนงานประชุมนี้แล้ว กรุณาตรวจสอบเลขสมาชิกอีกครั้ง แล้วเลือกเฉพาะกิจกรรมที่ต้องการลงเพิ่ม`,
              code: 'DUPLICATE_REGISTRATION',
            },
            { status: 400 }
          );
        }

        const registeredIds = new Set(registration.registeredActivities.map((a) => a.id));
        const requested = resolveAttendeeActivities(att, meeting.activities);
        if (requested.length === 0) {
          return NextResponse.json(
            { success: false, error: `${label}: กรุณาเลือกกิจกรรมที่ต้องการลงทะเบียนเพิ่มเติมอย่างน้อย 1 รายการ` },
            { status: 400 }
          );
        }
        const duplicated = requested.filter((a: any) => registeredIds.has(String(a?.id)));
        if (duplicated.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `${label}: ลงทะเบียนกิจกรรมนี้ไว้แล้ว ${duplicated.map((a: any) => a?.name || a?.id).join(', ')}`,
              code: 'DUPLICATE_REGISTRATION',
            },
            { status: 400 }
          );
        }
        // ใช้ข้อมูลจากฐานข้อมูลเป็นหลัก ไม่เชื่อค่าที่ส่งมาจากหน้าเว็บ
        att.addOnOriginalSlipId = registration.originalSlipId;
        att.addOnOriginalTicketCode = registration.originalTicketCode;
        att.registeredActivities = registration.registeredActivities;
      }

      // ตรวจสอบคูปองอีกครั้งฝั่งเซิร์ฟเวอร์ (คูปองที่ใช้ไปแล้วจะถูกปิด ไม่สามารถใช้ซ้ำได้)
      let groupCoupon: Awaited<ReturnType<typeof prisma.coupons.findUnique>> = null;
      if (couponCode) {
        groupCoupon = await prisma.coupons.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } });
        if (groupCoupon) {
          let couponError = '';
          if (!groupCoupon.is_active) couponError = 'รหัสคูปองนี้ถูกใช้งานหรือปิดใช้งานแล้ว กรุณาใช้คูปองปัจจุบันของบริษัท';
          else if (groupCoupon.used_count >= groupCoupon.max_uses) couponError = 'โควตาสิทธิ์คูปองนี้ถูกใช้งานครบแล้ว';
          else if (groupCoupon.expire_date && new Date(groupCoupon.expire_date).getTime() + 86400000 < Date.now()) couponError = 'รหัสคูปองนี้หมดอายุแล้ว ไม่สามารถใช้งานได้';
          else if (groupCoupon.meeting_id && groupCoupon.meeting_id !== meetingId) couponError = 'รหัสคูปองนี้ไม่ตรงกับรอบการประชุมที่เลือก';
          if (couponError) {
            return NextResponse.json({ success: false, error: couponError }, { status: 400 });
          }
        }
      }

      // คูปองบริษัทใช้ได้เฉพาะสมาชิกสถานะปกติ: ผู้ที่ไม่ใช่สมาชิกลงทะเบียนได้ แต่ห้ามได้รับส่วนลด
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        if (att.isAddOn || Number(att.discountTotal || att.discountAmount || 0) <= 0) continue;
        const rawNo = att.memberNo ? String(att.memberNo).trim() : '';
        const discountedMember = rawNo
          ? await prisma.member.findFirst({
              where: { OR: [{ member_no: rawNo }, { member_no: rawNo.padStart(4, '0') }] },
              select: { membership_status: true },
            })
          : null;
        const status = (discountedMember?.membership_status || '').toLowerCase().trim();
        if (!discountedMember || (status !== '' && status !== 'active')) {
          return NextResponse.json(
            {
              success: false,
              error: `ผู้ลงทะเบียนลำดับที่ ${i + 1} ${att.nameTh || att.nameEn || ''}: คูปองบริษัทใช้ได้เฉพาะสมาชิกสถานะปกติเท่านั้น`.replace(/\s+:/, ':'),
              code: 'COUPON_MEMBERS_ONLY',
            },
            { status: 400 }
          );
        }
      }

      // ฟอร์มเฉพาะ (เช่น ราคา fellow): ตรวจสิทธิ์บริษัทจาก token ของฟอร์ม และคำนวณราคาใหม่จากรายการของฟอร์ม
      let specialFormMeta: Record<string, unknown> | null = null;
      if (body.specialFormId) {
        const session = verifyOtpSessionToken(String(body.specialFormToken || ''));
        const form = await prisma.special_forms.findUnique({ where: { id: String(body.specialFormId) } });
        if (!form || form.meeting_id !== meetingId) {
          return NextResponse.json({ success: false, error: 'ไม่พบฟอร์มที่ใช้ลงทะเบียน' }, { status: 404 });
        }
        if (!isSpecialFormOpen(form)) {
          return NextResponse.json({ success: false, error: 'ฟอร์มนี้ปิดรับลงทะเบียนแล้ว' }, { status: 403 });
        }
        // ตัวแทนบริษัทใช้ token จาก OTP ของฟอร์ม / แอดมินทำรายการแทนบริษัทที่มีสิทธิ์ในฟอร์มนี้
        const adminSession = getAdminSessionFromRequest(request);
        const formSponsorId = adminSession
          ? String(body.sponsorId || '')
          : session && session.userType === 'sponsor' && session.formId === form.id
            ? session.sponsorId || ''
            : '';
        if (!formSponsorId || !(await isSponsorAllowedForForm(form.id, formSponsorId))) {
          return NextResponse.json(
            {
              success: false,
              error: adminSession
                ? 'บริษัทที่เลือกไม่มีสิทธิ์ในฟอร์มนี้'
                : 'สิทธิ์การเข้าใช้ฟอร์มหมดอายุ กรุณาเปิดลิงก์ฟอร์มและยืนยันตัวตนใหม่',
            },
            { status: 401 }
          );
        }
        const formSponsor = await prisma.sponsors.findUnique({ where: { id: formSponsorId } });
        if (!formSponsor) {
          return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบริษัท' }, { status: 404 });
        }
        if (groupCoupon && (!form.allow_coupon || groupCoupon.company_name.trim().toLowerCase() !== formSponsor.name.trim().toLowerCase())) {
          return NextResponse.json({ success: false, error: 'รหัสคูปองนี้ใช้กับฟอร์มนี้ไม่ได้' }, { status: 400 });
        }

        const items = resolveSpecialFormItems(form, meeting);
        let priced;
        try {
          priced = await priceSpecialFormAttendees({
            meeting,
            items,
            attendees,
            coupon: groupCoupon,
            freeSeatsLimit: null,
          });
        } catch (err) {
          if (err instanceof SpecialFormPricingError) {
            return NextResponse.json({ success: false, error: err.message }, { status: 400 });
          }
          throw err;
        }
        const serverTotal = priced.reduce((sum, p) => sum + p.price, 0);
        if (serverTotal !== numericAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `ยอดชำระไม่ตรงกับราคาของฟอร์ม (ยอดที่ถูกต้อง ฿${serverTotal.toLocaleString()}) กรุณาเปิดลิงก์ฟอร์มและลงทะเบียนใหม่อีกครั้ง`,
              code: 'SPECIAL_FORM_PRICE_MISMATCH',
            },
            { status: 400 }
          );
        }
        // ใช้ราคาที่คำนวณจากเซิร์ฟเวอร์เท่านั้น
        priced.forEach((p) => {
          const att = attendees[p.index];
          att.price = p.price;
          att.originalTotal = p.originalTotal;
          att.subtotal = p.originalTotal;
          att.discountTotal = p.discountTotal;
          att.attendanceType = p.attendanceType;
          att.priceTier = form.form_type;
        });
        body.sponsorId = formSponsor.id;
        body.originalAmount = priced.reduce((sum, p) => sum + p.originalTotal, 0);
        body.discountAmount = priced.reduce((sum, p) => sum + p.discountTotal, 0);
        specialFormMeta = {
          specialFormId: form.id,
          specialFormSlug: form.slug,
          specialFormTitle: form.title,
          priceTier: form.form_type,
          isFellow: form.form_type === 'fellow',
          sponsorId: formSponsor.id,
          companyName: formSponsor.name,
          groupContact: {
            coordinatorEmail: formSponsor.contact_email,
            coordinatorName: formSponsor.contact_name || formSponsor.name,
            coordinatorPhone: '',
          },
        };
      }

      // นับเป็นการใช้สิทธิ์คูปองเฉพาะผู้ที่ได้รับส่วนลดจริง และลงโปรแกรมที่คูปองครอบคลุม
      // (เช่น คูปองฟรีการประชุมหลัก แต่ลงเฉพาะเวิร์กช็อป จะไม่ตัดโควต้า)
      const couponCoveredAttendees = groupCoupon
        ? attendees.filter(
            (a: any) =>
              !a.isAddOn &&
              Number(a.discountTotal || a.discountAmount || 0) > 0 &&
              isCouponApplicableToActivities(groupCoupon!, resolveAttendeeActivities(a, meeting.activities))
          )
        : [];

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `GRP-${new Date().getFullYear()}-${randomSuffix}`;
      const slipId = `SLIP-GRP-${Date.now().toString(36).toUpperCase()}`;
      const registrationStatus = isFreeRegistration ? 'approved' : 'pending';

      const groupPayload = {
        isGroup: true,
        companyName: companyName || 'Corporate Group',
        groupContact: groupContact || null,
        attendees: attendees,
        couponCode: couponCode || body.couponData?.code || null,
        couponData: body.couponData || null,
        discountAmount: Number(body.discountAmount) || (body.originalAmount ? Math.max(0, Number(body.originalAmount) - numericAmount) : 0),
        originalAmount: Number(body.originalAmount) || (numericAmount + (Number(body.discountAmount) || 0)),
        totalAmount: numericAmount,
        submittedAt: new Date().toISOString(),
        ...(specialFormMeta || {}),
      };

      // Resolve Sponsor Record ก่อนเริ่ม Transaction (read-only, ไม่ต้องอยู่ใน tx)
      let sponsorRecord: any = null;
      if (body.sponsorId) {
        sponsorRecord = await prisma.sponsors.findUnique({ where: { id: body.sponsorId } });
      }
      if (!sponsorRecord && couponCode) {
        const coupon = await prisma.coupons.findFirst({ where: { code: couponCode } });
        if (coupon && (coupon as any).sponsor_id) {
          sponsorRecord = await prisma.sponsors.findUnique({ where: { id: (coupon as any).sponsor_id } });
        }
      }
      if (!sponsorRecord && companyName) {
        sponsorRecord = await prisma.sponsors.findFirst({
          where: { name: { equals: companyName.trim(), mode: 'insensitive' } },
        });
      }

      const effectiveSponsorId = sponsorRecord?.id || body.sponsorId || null;
      const effectiveSponsorName = sponsorRecord?.name || companyName || null;

      const hasMemberAttendees = Array.isArray(attendees) && attendees.some((a: any) => a.isMember || a.memberNo);
      // เลขสมาชิกของรายการ: ใช้ผู้ลงทะเบียนใหม่ก่อน เพื่อไม่ให้รายการนี้ไปแทนที่รายการหลักของผู้ที่ลงเพิ่ม
      const primaryMemberNo = hasMemberAttendees
        ? attendees.find((a: any) => a.memberNo && !a.isAddOn)?.memberNo?.trim() || null
        : null;

      const requestedSeats = countSlipSeatClaims(
        { ticket_code: 'GRP', selected_activities: groupPayload },
        meeting.activities
      );

      // ห่อทุก DB write ด้วย Transaction เพื่อความ Atomic
      let slip: any;
      await prisma.$transaction(async (tx) => {
        // ตัดที่นั่งเวิร์กช็อปตั้งแต่ส่งรายการ (ยังไม่ต้องรออนุมัติ)
        await lockAndAssertSeats(tx, meetingId, requestedSeats, { meetingActivities: meeting.activities });

        let effectiveCompanyEmail = groupContact?.coordinatorEmail?.trim() || (groupPayload as any)?.companyEmail?.trim() || (groupPayload as any)?.sponsorSession?.contactEmail?.trim() || null;
        if (!effectiveCompanyEmail && effectiveSponsorId) {
          const spRec = await tx.sponsors.findUnique({
            where: { id: effectiveSponsorId },
            select: { contact_email: true },
          });
          if (spRec?.contact_email) {
            effectiveCompanyEmail = spRec.contact_email.trim();
          }
        }
        if (!effectiveCompanyEmail && companyName) {
          const spRec = await tx.sponsors.findFirst({
            where: { name: { equals: companyName.trim(), mode: 'insensitive' } },
            select: { contact_email: true },
          });
          if (spRec?.contact_email) {
            effectiveCompanyEmail = spRec.contact_email.trim();
          }
        }

        // Create single group payment slip
        slip = await tx.payment_slips.create({
          data: {
            slip_id: slipId,
            meeting_id: meetingId,
            member_no: primaryMemberNo,
            guest_name: `${companyName || 'Corporate Group'} (${attendees.length} ท่าน)`,
            guest_email: effectiveCompanyEmail || groupContact?.coordinatorEmail || null,
            guest_phone: groupContact?.coordinatorPhone || null,
            guest_workplace: companyName || null,
            is_member: hasMemberAttendees,
            ticket_code: ticketCode,
            amount: numericAmount,
            bank: isPayLaterMode ? 'ชำระเงินภายหลัง (Pay Later)' : (bank || 'Kasikorn (KBANK)'),
            transfer_date: transferDate || null,
            transfer_time: transferTime || null,
            ref_no: refNo || null,
            slip_url: isPayLaterMode ? 'PAY_LATER' : (slipUrl || 'GROUP_REGISTRATION'),
            status: registrationStatus,
            selected_activities: groupPayload as any,
            reviewed_by: isFreeRegistration ? 'SYSTEM:AUTO' : null,
            reviewed_at: isFreeRegistration ? new Date() : null,
          },
        });

        // Create attendance records ONLY IF registration is already approved (Free 100% / Auto-Approved)
        if (isFreeRegistration) {
          for (const att of attendees) {
            const attName = att.nameTh || att.nameEn || att.fullNameTh || att.fullNameEn || 'Attendee';
            const attEmail = att.email?.trim()?.toLowerCase() || '';
            const attPhone = att.phone?.trim() || att.mobile?.trim() || null;
            const attWorkplace = att.workplace || companyName || null;
            let attMemberNo = att.memberNo ? att.memberNo.trim() : null;
            const attDiscount = Number(att.discountTotal || att.discountAmount || 0);
            const attNet = Number(att.price || att.netPrice || 0);

            // If memberNo was not explicitly provided, search in members table by email
            if (!attMemberNo && attEmail) {
              const foundMem = await tx.member.findFirst({
                where: { email: { equals: attEmail, mode: 'insensitive' } },
                select: { member_no: true },
              });
              if (foundMem?.member_no) {
                attMemberNo = foundMem.member_no.trim();
              }
            }

            let attendanceId: any = null;

            if (attMemberNo) {
              const attResult = await tx.$queryRaw<Array<{ attendance_id: any }>>`
                INSERT INTO meeting_attendances (
                  meeting_id, member_no, attendance_status, sponsor_id, sponsor_company_name, coupon_code
                ) VALUES (
                  ${meetingId}, ${attMemberNo}, 'Registered',
                  ${effectiveSponsorId}, ${effectiveSponsorName}, ${couponCode || null}
                ) ON CONFLICT (meeting_id, member_no)
                DO UPDATE SET 
                  attendance_status = 'Registered',
                  sponsor_id = COALESCE(${effectiveSponsorId}, meeting_attendances.sponsor_id),
                  sponsor_company_name = COALESCE(${effectiveSponsorName}, meeting_attendances.sponsor_company_name),
                  coupon_code = COALESCE(${couponCode || null}, meeting_attendances.coupon_code)
                RETURNING attendance_id
              `;
              attendanceId = attResult?.[0]?.attendance_id;

              // Delete any orphaned non-member ghost record for this member in this meeting
              if (attEmail) {
                await tx.$executeRaw`
                  DELETE FROM meeting_attendances
                  WHERE meeting_id = ${meetingId}
                    AND member_no IS NULL
                    AND LOWER(attendee_email) = ${attEmail}
                `.catch(() => {});
              }

              // Update member record with sponsor company linkage (Rule #10)
              if (effectiveSponsorId || effectiveSponsorName) {
                await tx.$executeRaw`
                  UPDATE members 
                  SET 
                    sponsor_id = COALESCE(${effectiveSponsorId}, sponsor_id),
                    sponsored_by_company = COALESCE(${effectiveSponsorName}, sponsored_by_company)
                  WHERE member_no = ${attMemberNo}
                `;
              }

              // Insert into sponsor_group_members table for Company Portal roster tab
              if (effectiveSponsorId) {
                await tx.$executeRaw`
                  INSERT INTO sponsor_group_members (
                    sponsor_id, meeting_id, member_no, attendee_name, attendee_email, attendee_phone,
                    workplace, ticket_code, attendance_id, coupon_code, discount_amount, net_price,
                    submitted_by_email, status, created_at, updated_at
                  ) VALUES (
                    ${effectiveSponsorId}, ${meetingId}, ${attMemberNo}, ${attName}, ${attEmail},
                    ${attPhone}, ${attWorkplace}, ${ticketCode}, ${attendanceId || null},
                    ${couponCode || null}, ${attDiscount}, ${attNet},
                    ${effectiveCompanyEmail || groupContact?.coordinatorEmail || null},
                    'confirmed', NOW(), NOW()
                  ) ON CONFLICT (meeting_id, member_no)
                  DO UPDATE SET
                    status = 'confirmed',
                    attendance_id = COALESCE(${attendanceId || null}, sponsor_group_members.attendance_id),
                    updated_at = NOW()
                `;
              }
            } else if (attEmail) {
              // Check if existing non-member record already exists for this email
              const existingNonMember = await tx.meeting_attendances.findFirst({
                where: {
                  meeting_id: meetingId,
                  member_no: null,
                  attendee_email: { equals: attEmail, mode: 'insensitive' },
                },
              });

              if (existingNonMember) {
                await tx.meeting_attendances.update({
                  where: { attendance_id: existingNonMember.attendance_id },
                  data: {
                    attendee_name: attName,
                    attendee_phone: attPhone || existingNonMember.attendee_phone,
                    workplace: attWorkplace || existingNonMember.workplace,
                    attendance_status: 'Registered',
                    sponsor_id: effectiveSponsorId || existingNonMember.sponsor_id,
                    sponsor_company_name: effectiveSponsorName || existingNonMember.sponsor_company_name,
                    coupon_code: couponCode || existingNonMember.coupon_code,
                  },
                });
                attendanceId = existingNonMember.attendance_id;
              } else {
                const attResult = await tx.$queryRaw<Array<{ attendance_id: any }>>`
                  INSERT INTO meeting_attendances (
                    meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status,
                    sponsor_id, sponsor_company_name, coupon_code
                  ) VALUES (
                    ${meetingId}, NULL, ${attName}, ${attEmail}, ${attPhone}, ${attWorkplace},
                    'Registered',
                    ${effectiveSponsorId}, ${effectiveSponsorName}, ${couponCode || null}
                  )
                  RETURNING attendance_id
                `;
                attendanceId = attResult?.[0]?.attendance_id;
              }
            }
          }
        }

        // หักโควต้าบริษัทเฉพาะผู้ที่ได้รับส่วนลดจากคูปองจริง (ลงทะเบียนเต็มราคาไม่ถือว่าใช้สิทธิ์)
        if (effectiveSponsorId && couponCoveredAttendees.length > 0) {
          await tx.$executeRaw`
            UPDATE sponsor_quotas 
            SET used_seats = used_seats + ${couponCoveredAttendees.length}, updated_at = NOW()
            WHERE sponsor_id = ${effectiveSponsorId} AND meeting_id = ${meetingId}
          `;
        }

        // Log coupon usages
        if (couponCode && couponCoveredAttendees.length > 0) {
          const couponRec = await tx.coupons.findFirst({ where: { code: couponCode } });
          if (couponRec) {
            await tx.$executeRaw`
              UPDATE coupons 
              SET used_count = used_count + ${couponCoveredAttendees.length}, updated_at = NOW()
              WHERE id = ${couponRec.id}
            `;
            for (const att of couponCoveredAttendees) {
              await tx.$executeRaw`
                INSERT INTO coupon_usages (
                  coupon_id, meeting_id, member_no, attendee_name, attendee_email,
                  attendee_phone, workplace, discount_applied, final_amount,
                  ticket_code, slip_id, used_at
                ) VALUES (
                  ${couponRec.id}, ${meetingId}, ${att.memberNo || null}, ${att.nameTh || att.nameEn || 'Attendee'},
                  ${att.email?.trim()?.toLowerCase() || ''}, ${att.phone || null}, ${att.workplace || companyName || null},
                  ${Number(att.discountTotal || att.discountAmount || 0)}, ${Number(att.netPrice || att.price || 0)},
                  ${ticketCode}, ${slipId}, NOW()
                )
              `;
            }
          }
        }
      }, { timeout: 30000 }); // timeout 30s สำหรับกลุ่มใหญ่

      // ไม่มีค่าใช้จ่าย (อนุมัติอัตโนมัติ): รวมกิจกรรมของผู้ที่ลงเพิ่มเข้ารายการเดิมทันที
      if (isFreeRegistration && attendees.some((a: any) => a.isAddOn)) {
        try {
          await mergeGroupAddOnAttendees(slip.slip_id);
        } catch (mergeErr) {
          console.error('Failed to merge group add-on attendees:', mergeErr);
        }
      }

      // คูปองบริษัทใช้ได้ 1 ครั้ง: ปิดรหัสที่ใช้แล้วและออกรหัสใหม่สำหรับสิทธิ์คงเหลือ (โควต้าถูกหักใน Transaction แล้ว)
      if (couponCode && couponCoveredAttendees.length > 0) {
        try {
          await retireUsedSponsorCoupon(couponCode);
        } catch (rotateErr) {
          console.error('Failed to rotate sponsor coupon:', rotateErr);
        }
      }

      if (isFreeRegistration) {
        let meetingDateStr: string | undefined = undefined;
        if (meeting) {
          if (meeting.start_date && meeting.end_date) {
            const start = new Date(meeting.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            const end = new Date(meeting.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            meetingDateStr = start === end ? start : `${start} - ${end}`;
          } else if (meeting.meeting_date) {
            meetingDateStr = new Date(meeting.meeting_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
          }
        }

        const coordinatorEmail = groupContact?.coordinatorEmail || (groupPayload as any).companyEmail;
        if (coordinatorEmail) {
          after(() => sendRegistrationApprovedEmail({
            to: coordinatorEmail,
            recipientName: companyName || groupContact?.coordinatorName || 'ตัวแทนบริษัท',
            meetingName: meeting.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
            meetingDate: meetingDateStr,
            ticketCode: ticketCode,
            amountPaid: numericAmount,
            isMember: Boolean(hasMemberAttendees),
            selectedActivities: groupPayload,
          }).catch((mailErr) => console.error('Failed to send free group registration confirmation email:', mailErr)));
        }

        // Send sponsored registration notification to EACH attendee
        const effectiveCompanyName = companyName || 'บริษัทผู้สนับสนุน';
        if (Array.isArray(attendees) && attendees.length > 0) {
          for (const att of attendees) {
            let attEmail = (att.email || att.attendee_email)?.trim();
            let attName = att.nameTh || att.nameEn || att.fullName || att.fullNameTh || att.attendee_name || '';
            let attMemberNo = att.memberNo ? String(att.memberNo).trim() : undefined;
            let attWorkplace = att.workplace || undefined;

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
                }
              } catch (memErr) {
                console.warn('Failed to query member details for free attendee email:', memErr);
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
              }

              after(() => sendAttendeeSponsoredRegistrationEmail({
                to: attEmail,
                recipientName: attName || 'ผู้เข้าร่วมประชุม',
                recipientEmail: attEmail,
                memberNo: attMemberNo,
                workplace: attWorkplace || undefined,
                companyName: effectiveCompanyName,
                meetingName: meeting.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
                meetingDate: meetingDateStr,
                ticketCode: ticketCode,
                items: attItems,
                format: att.attendanceType || undefined,
              }).catch((attMailErr) =>
                console.error(`Failed to send free sponsored registration email to attendee ${attEmail}:`, attMailErr)
              ));
            } else {
              console.warn(`⚠️ [Free Group Reg] Skipping attendee email: No email found for attendee "${attName || attMemberNo}"`);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          slipId: slip.slip_id,
          ticketCode: ticketCode,
          status: registrationStatus,
          isGroup: true,
          attendeeCount: attendees.length,
          message: isFreeRegistration
            ? 'ลงทะเบียนแบบกลุ่มด้วยสิทธิ์สปอนเซอร์สำเร็จเรียบร้อยแล้ว'
            : 'ลงทะเบียนแบบกลุ่มเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบสลิป',
        },
      });
    }


    let validMemberNo: string | null = null;
    let effectiveAttendeeName = guestName || '';
    let effectiveAttendeeEmail = guestEmail || '';
    let effectiveAttendeePhone = guestPhone || null;
    let effectiveAttendeeWorkplace = guestWorkplace || null;

    if (isMember) {
      if (!memberNo) {
        return NextResponse.json(
          { success: false, error: 'Member No is required for member registration' },
          { status: 400 }
        );
      }

      // Check member in database — ค้นหาแบบเดียวกับหน้าตรวจสอบสมาชิก (รองรับเลขที่มี/ไม่มีศูนย์นำหน้า)
      const rawNo = String(memberNo).trim();
      const member = await prisma.member.findFirst({
        where: {
          OR: [
            { member_no: rawNo },
            { member_no: rawNo.padStart(4, '0') },
            { member_no: rawNo.replace(/^0+/, '') },
          ],
        },
      });

      if (!member) {
        return NextResponse.json(
          { success: false, error: `ไม่พบเลขสมาชิก "${rawNo}" ในระบบ กรุณาตรวจสอบเลขสมาชิกอีกครั้ง` },
          { status: 404 }
        );
      }

      validMemberNo = member.member_no;
      effectiveAttendeeName = member.fullNameTh || member.fullNameEn || effectiveAttendeeName;
      effectiveAttendeeEmail = member.email || effectiveAttendeeEmail;
      effectiveAttendeePhone = member.mobile || effectiveAttendeePhone;
      // ใช้หน่วยงานที่กรอกในฟอร์มลงทะเบียนครั้งนี้ก่อน หากเว้นว่างจึงใช้ข้อมูลจากทะเบียนสมาชิก
      const formWorkplace =
        selectedActivities && typeof selectedActivities === 'object' && !Array.isArray(selectedActivities)
          ? String(selectedActivities.workplace || '').trim()
          : '';
      effectiveAttendeeWorkplace = effectiveAttendeeWorkplace || formWorkplace || member.workplace || null;

      // Duplicate registration check for member
      const memberSlips = await prisma.$queryRaw<Array<{ slip_id: string; status: string }>>`
        SELECT slip_id, status 
        FROM payment_slips 
        WHERE meeting_id = ${meetingId} 
          AND member_no = ${validMemberNo} 
          AND status IN ('pending', 'approved') 
        LIMIT 1
      `;
      const existingSlip = memberSlips?.[0];

      const memberAttendances = await prisma.$queryRaw<Array<{ attendance_id: any; attendance_status: string }>>`
        SELECT attendance_id, attendance_status 
        FROM meeting_attendances 
        WHERE meeting_id = ${meetingId} 
          AND member_no = ${validMemberNo} 
          AND attendance_status NOT IN ('Cancelled', 'Rejected') 
        LIMIT 1
      `;
      const existingAttendance = memberAttendances?.[0];

      // ลงทะเบียนไว้แล้วแบบกลุ่มหรือเจ้าหน้าที่บันทึกให้ (ไม่มีรายการรายบุคคลให้รวม):
      // ลงกิจกรรมที่ยังไม่ได้ลงทะเบียนเป็นรายการใหม่ได้ แต่ห้ามเลือกกิจกรรมซ้ำ
      let separateFromPrior = false;
      if (!addOnToSlipId && (existingSlip || existingAttendance)) {
        const eligibility = await getAddOnEligibility(meetingId, { memberNo: validMemberNo });
        if (eligibility.state === 'unsupported') {
          const summary = await getMemberRegistrationSummary(meetingId, validMemberNo!);
          const registeredIds = new Set(summary.registeredActivities.map((a) => a.id));
          const requested = slipActivityList(selectedActivities);
          if (requested.length === 0) {
            return NextResponse.json(
              { success: false, error: 'กรุณาเลือกกิจกรรมที่ต้องการลงทะเบียนอย่างน้อย 1 รายการ' },
              { status: 400 }
            );
          }
          const duplicated = requested.filter((a: any) => registeredIds.has(String(a?.id)));
          if (duplicated.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error: `สมาชิกท่านนี้ลงทะเบียนกิจกรรมนี้ไว้แล้ว: ${duplicated.map((a: any) => a?.name || a?.id).join(', ')}`,
                code: 'DUPLICATE_REGISTRATION',
              },
              { status: 400 }
            );
          }
          separateFromPrior = true;
        }
      }

      if (!addOnToSlipId && !separateFromPrior && (existingSlip || existingAttendance)) {
        const isApproved = existingSlip?.status === 'approved' || existingAttendance?.attendance_status === 'Registered';
        return NextResponse.json(
          {
            success: false,
            error: isApproved
              ? 'สมาชิกท่านนี้ได้ลงทะเบียนและได้รับการยืนยันเข้าร่วมงานประชุมนี้แล้ว ไม่สามารถลงทะเบียนซ้ำได้'
              : 'สมาชิกท่านนี้มีรายการลงทะเบียนเข้าร่วมงานประชุมนี้แล้ว กำลังอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ ไม่สามารถลงทะเบียนซ้ำได้',
            code: 'DUPLICATE_REGISTRATION',
          },
          { status: 400 }
        );
      }
    } else {
      // Non-member validation
      if (!guestName || !guestEmail) {
        return NextResponse.json(
          { success: false, error: 'Full name and email are required for non-member registration' },
          { status: 400 }
        );
      }

      if (!isPersonalEmail(guestEmail)) {
        return NextResponse.json(
          { success: false, error: personalEmailRequiredMessage('th'), code: 'PERSONAL_EMAIL_REQUIRED' },
          { status: 400 }
        );
      }

      // Duplicate registration check for non-member (รวมรายชื่อในรายการกลุ่มด้วย)
      const existingGuest = addOnToSlipId ? null : await findGuestRegistration(meetingId, guestEmail);

      if (existingGuest) {
        const isApproved = existingGuest.approved;
        return NextResponse.json(
          {
            success: false,
            error: isApproved
              ? `อีเมลนี้ (${guestEmail}) ได้ลงทะเบียนและได้รับการยืนยันเข้าร่วมงานประชุมนี้แล้ว ไม่สามารถลงทะเบียนซ้ำได้`
              : `อีเมลนี้ (${guestEmail}) มีรายการลงทะเบียนเข้าร่วมงานประชุมนี้แล้ว กำลังอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ ไม่สามารถลงทะเบียนซ้ำได้`,
            code: 'DUPLICATE_REGISTRATION',
          },
          { status: 400 }
        );
      }
    }

    // ลงทะเบียนกิจกรรมเพิ่มเติม: ต้องมีรายการเดิมที่อนุมัติแล้ว และเลือกเฉพาะกิจกรรมที่ยังไม่ได้ลงทะเบียน
    let addOnOriginalSlip: any = null;
    if (addOnToSlipId) {
      if (couponCode && String(couponCode).trim()) {
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถใช้คูปองกับการลงทะเบียนกิจกรรมเพิ่มเติมได้' },
          { status: 400 }
        );
      }

      const eligibility = await getAddOnEligibility(
        meetingId,
        isMember ? { memberNo: validMemberNo } : { email: guestEmail }
      );
      if (eligibility.state !== 'eligible' || eligibility.originalSlip.slip_id !== addOnToSlipId) {
        const reason =
          eligibility.state === 'unsupported'
            ? 'รายการลงทะเบียนของท่านเป็นแบบกลุ่มหรือบันทึกโดยเจ้าหน้าที่ กรุณาติดต่อเจ้าหน้าที่สมาคมฯ เพื่อลงทะเบียนเพิ่มเติม'
            : 'ไม่พบรายการลงทะเบียนเดิม ไม่สามารถลงทะเบียนเพิ่มเติมได้ กรุณาลองใหม่อีกครั้ง';
        return NextResponse.json({ success: false, error: reason, code: 'ADD_ON_NOT_ALLOWED' }, { status: 400 });
      }

      const registeredIds = new Set(eligibility.registeredActivities.map((a) => a.id));
      if (isMember && validMemberNo) {
        // รวมกิจกรรมที่ลงผ่านช่องทางอื่น (เช่น แบบกลุ่ม) ด้วย
        const summary = await getMemberRegistrationSummary(meetingId, validMemberNo);
        summary.registeredActivities.forEach((a) => registeredIds.add(a.id));
      }
      const requestedActivities = slipActivityList(selectedActivities);
      if (requestedActivities.length === 0) {
        return NextResponse.json(
          { success: false, error: 'กรุณาเลือกกิจกรรมที่ต้องการลงทะเบียนเพิ่มเติมอย่างน้อย 1 รายการ' },
          { status: 400 }
        );
      }
      const duplicated = requestedActivities.filter((a: any) => registeredIds.has(String(a?.id)));
      if (duplicated.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `ท่านได้ลงทะเบียนกิจกรรมนี้ไว้แล้ว: ${duplicated.map((a: any) => a?.name || a?.id).join(', ')}`,
            code: 'DUPLICATE_REGISTRATION',
          },
          { status: 400 }
        );
      }
      addOnOriginalSlip = eligibility.originalSlip;
    }
    const isAddOn = Boolean(addOnOriginalSlip);

    // ลงทะเบียนรายบุคคลไม่มีระบบคูปอง (คูปองใช้ได้เฉพาะการลงทะเบียนแบบกลุ่มสำหรับบริษัท)
    if (couponCode && String(couponCode).trim()) {
      return NextResponse.json(
        { success: false, error: 'คูปองใช้ได้เฉพาะการลงทะเบียนแบบกลุ่มสำหรับบริษัทเท่านั้น', code: 'COUPON_GROUP_ONLY' },
        { status: 400 }
      );
    }

    // 1. Check & Validate Coupon if supplied
    let couponRecord: any = null;
    let discountAppliedAmount = 0;

    if (couponCode && couponCode.trim()) {
      const cleanCouponCode = couponCode.trim().toUpperCase();
      couponRecord = await (prisma as any).coupons.findUnique({
        where: { code: cleanCouponCode },
      });

      if (couponRecord) {
        // ตรวจสอบวันหมดอายุของคูปอง
        if (couponRecord.expire_date && new Date(couponRecord.expire_date) < new Date()) {
          return NextResponse.json(
            { success: false, error: 'รหัสคูปองนี้หมดอายุแล้ว ไม่สามารถใช้งานได้' },
            { status: 400 }
          );
        }
        if (!couponRecord.is_active) {
          return NextResponse.json(
            { success: false, error: 'รหัสคูปองนี้ถูกปิดใช้งานแล้ว' },
            { status: 400 }
          );
        }
        if (couponRecord.used_count >= couponRecord.max_uses) {
          return NextResponse.json(
            { success: false, error: 'โควตาสิทธิ์คูปองนี้ถูกใช้งานครบแล้ว' },
            { status: 400 }
          );
        }
        if (couponRecord.meeting_id && couponRecord.meeting_id !== meetingId) {
          return NextResponse.json(
            { success: false, error: 'รหัสคูปองนี้ไม่ตรงกับรอบการประชุมที่เลือก' },
            { status: 400 }
          );
        }

        // Calculate discount applied
        const origAmt = Number(originalAmount) || numericAmount;
        if (couponRecord.discount_type === 'free') {
          discountAppliedAmount = origAmt;
        } else if (couponRecord.discount_type === 'fixed') {
          discountAppliedAmount = Math.min(origAmt, couponRecord.discount_value);
        } else if (couponRecord.discount_type === 'percent') {
          const pct = Math.min(100, Math.max(0, couponRecord.discount_value));
          discountAppliedAmount = Math.round((origAmt * pct) / 100);
        }
      }
    }

    // Generate unique Ticket Code: TSRM-YYYY-XXXX (รายการเพิ่มเติมใช้รหัสเดิมต่อท้ายด้วย -ADD เพื่อไม่ให้ชนกับบัตรเข้างานเดิม)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = isAddOn
      ? `${addOnOriginalSlip.ticket_code || 'TSRM'}-ADD${Date.now().toString(36).slice(-4).toUpperCase()}`
      : `TSRM-${new Date().getFullYear()}-${randomSuffix}`;
    const slipId = `SLIP-${Date.now().toString(36).toUpperCase()}`;
    // รายการเพิ่มเติมบันทึกเป็น pending เสมอ แล้วรวมเข้ารายการเดิมเมื่ออนุมัติ (กรณีฟรีจะรวมทันทีด้านล่าง)
    const registrationStatus = isFreeRegistration && !isAddOn ? 'approved' : 'pending';
    const attendanceStatus = isFreeRegistration ? 'Registered' : (isMember ? 'Pending_Payment' : 'Non-Member-Pending');
    const effectiveSlipUrl = slipUrl || (couponRecord ? `COUPON_SPONSORED:${couponRecord.company_name}` : 'FREE_REGISTRATION');

    let effectiveSelectedActivities = selectedActivities || null;
    if (effectiveSelectedActivities && Array.isArray(effectiveSelectedActivities)) {
      effectiveSelectedActivities = {
        activities: effectiveSelectedActivities,
        nameTh: guestName || body.nameTh || null,
        nameEn: body.guestNameEn || body.nameEn || null,
        email: guestEmail || body.email || null,
        phone: guestPhone || body.phone || body.mobile || null,
        workplace: guestWorkplace || body.workplace || null,
        position: body.guestPosition || body.position || null,
        dietaryPreference: body.dietaryPreference || null,
        foodAllergies: body.foodAllergies || null,
        specialRequirements: body.specialRequirements || null,
        attendanceType: body.attendanceType || null,
      };
    } else if (effectiveSelectedActivities && typeof effectiveSelectedActivities === 'object') {
      effectiveSelectedActivities = {
        ...effectiveSelectedActivities,
        nameTh: effectiveSelectedActivities.nameTh || guestName || body.nameTh || null,
        nameEn: effectiveSelectedActivities.nameEn || body.guestNameEn || body.nameEn || null,
        email: effectiveSelectedActivities.email || guestEmail || body.email || null,
        phone: effectiveSelectedActivities.phone || guestPhone || body.phone || body.mobile || null,
        workplace: effectiveSelectedActivities.workplace || guestWorkplace || body.workplace || null,
        position: effectiveSelectedActivities.position || body.guestPosition || body.position || null,
        dietaryPreference: effectiveSelectedActivities.dietaryPreference || body.dietaryPreference || null,
        foodAllergies: effectiveSelectedActivities.foodAllergies || body.foodAllergies || null,
        specialRequirements: effectiveSelectedActivities.specialRequirements || body.specialRequirements || null,
        attendanceType: effectiveSelectedActivities.attendanceType || body.attendanceType || null,
      };
    } else {
      effectiveSelectedActivities = {
        activities: [],
        nameTh: guestName || body.nameTh || null,
        nameEn: body.guestNameEn || body.nameEn || null,
        email: guestEmail || body.email || null,
        phone: guestPhone || body.phone || body.mobile || null,
        workplace: guestWorkplace || body.workplace || null,
        position: body.guestPosition || body.position || null,
        dietaryPreference: body.dietaryPreference || null,
        foodAllergies: body.foodAllergies || null,
        specialRequirements: body.specialRequirements || null,
        attendanceType: body.attendanceType || null,
      };
    }

    if (isAddOn) {
      effectiveSelectedActivities = {
        ...effectiveSelectedActivities,
        type: 'conference_add_on_registration',
        isAddOn: true,
        originalSlipId: addOnOriginalSlip.slip_id,
        originalTicketCode: addOnOriginalSlip.ticket_code,
      };
    }

    // 2. Record payment slip in payment_slips table (ตัดที่นั่งเวิร์กช็อปพร้อมกันใน Transaction)
    const requestedSeats = countSlipSeatClaims({ selected_activities: effectiveSelectedActivities }, meeting.activities);
    let slip: any = null;
    await prisma.$transaction(async (tx) => {
      await lockAndAssertSeats(tx, meetingId, requestedSeats, { meetingActivities: meeting.activities });
      slip = await tx.payment_slips.create({
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
          amount: numericAmount,
          bank: bank || (couponRecord ? `สิทธิ์คูปอง: ${couponRecord.company_name}` : null),
          transfer_date: transferDate || null,
          transfer_time: transferTime || null,
          ref_no: refNo || (couponRecord ? `COUPON:${couponRecord.code}` : null),
          slip_url: effectiveSlipUrl,
          status: registrationStatus,
          selected_activities: effectiveSelectedActivities as any,
          reviewed_by: registrationStatus === 'approved' ? (couponRecord ? `SYSTEM:COUPON(${couponRecord.code})` : 'SYSTEM:AUTO_FREE') : null,
          reviewed_at: registrationStatus === 'approved' ? new Date() : null,
        },
      });
    });

    // กิจกรรมเพิ่มเติมที่ไม่มีค่าใช้จ่าย: รวมเข้ารายการเดิมทันที ไม่ต้องรอเจ้าหน้าที่
    if (isAddOn) {
      if (isFreeRegistration) {
        await mergeAddOnSlip(slip.slip_id, 'SYSTEM:AUTO_FREE', { allowPendingOriginal: true });
      }
      return NextResponse.json({
        success: true,
        data: {
          slipId: slip.slip_id,
          ticketCode: addOnOriginalSlip.ticket_code,
          status: isFreeRegistration ? 'approved' : 'pending',
          isAddOn: true,
          isFreeRegistration,
          message: isFreeRegistration
            ? 'เพิ่มกิจกรรมเข้ารายการลงทะเบียนเดิมเรียบร้อยแล้ว'
            : addOnOriginalSlip.status === 'approved'
              ? 'บันทึกการลงทะเบียนกิจกรรมเพิ่มเติมแล้ว เมื่อเจ้าหน้าที่ตรวจสอบการชำระเงิน ระบบจะรวมเข้ากับรายการลงทะเบียนเดิมให้อัตโนมัติ'
              : 'บันทึกการลงทะเบียนกิจกรรมเพิ่มเติมแล้ว เจ้าหน้าที่จะตรวจสอบรายการเดิมและรายการนี้ แล้วรวมเป็นรายการเดียวกันให้อัตโนมัติ',
        },
      });
    }

    // 3. Record attendance in meeting_attendances table ONLY IF isFreeRegistration (Auto-Approved)
    if (isFreeRegistration) {
      if (isMember && validMemberNo) {
        await prisma.$executeRaw`
          INSERT INTO meeting_attendances (
            meeting_id, member_no, workplace, attendance_status
          ) VALUES (
            ${meetingId}, ${validMemberNo}, ${effectiveAttendeeWorkplace}, 'Registered'
          ) ON CONFLICT (meeting_id, member_no)
          DO UPDATE SET attendance_status = 'Registered',
            workplace = COALESCE(EXCLUDED.workplace, meeting_attendances.workplace)
        `;
      } else {
        // Create or update non-member attendance record
        if (guestEmail) {
          const existingNonMember = await (prisma as any).meeting_attendances.findFirst({
            where: {
              meeting_id: meetingId,
              member_no: null,
              attendee_email: { equals: guestEmail.trim(), mode: 'insensitive' },
            },
          });
          if (existingNonMember) {
            await (prisma as any).meeting_attendances.update({
              where: { attendance_id: existingNonMember.attendance_id },
              data: {
                attendee_name: guestName,
                attendee_phone: guestPhone || existingNonMember.attendee_phone,
                workplace: guestWorkplace || existingNonMember.workplace,
                attendance_status: 'Registered',
              },
            });
          } else {
            await prisma.$executeRaw`
              INSERT INTO meeting_attendances (
                meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status
              ) VALUES (
                ${meetingId}, NULL, ${guestName}, ${guestEmail}, ${guestPhone || null}, ${guestWorkplace || null}, 'Registered'
              )
            `;
          }
        } else {
          await prisma.$executeRaw`
            INSERT INTO meeting_attendances (
              meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status
            ) VALUES (
              ${meetingId}, NULL, ${guestName}, ${guestEmail}, ${guestPhone || null}, ${guestWorkplace || null}, 'Registered'
            )
          `;
        }
      }
    }

    // 4. Record Coupon Usage & increment used_count if coupon was used
    // ลงเฉพาะโปรแกรมที่คูปองไม่ครอบคลุม ไม่ถือว่าใช้สิทธิ์คูปอง (ไม่ตัดโควต้า)
    const individualActivities = Array.isArray((effectiveSelectedActivities as any)?.activities)
      ? (effectiveSelectedActivities as any).activities
      : [];
    if (couponRecord && isCouponApplicableToActivities(couponRecord, individualActivities)) {
      try {
        await (prisma as any).coupon_usages.create({
          data: {
            coupon_id: couponRecord.id,
            meeting_id: meetingId,
            member_no: validMemberNo,
            attendee_name: effectiveAttendeeName,
            attendee_email: effectiveAttendeeEmail,
            attendee_phone: effectiveAttendeePhone,
            workplace: effectiveAttendeeWorkplace,
            discount_applied: discountAppliedAmount,
            final_amount: numericAmount,
            ticket_code: ticketCode,
            slip_id: slip.slip_id,
          },
        });

        // Increment used_count in coupons
        await (prisma as any).coupons.update({
          where: { id: couponRecord.id },
          data: {
            used_count: { increment: 1 },
          },
        });
      } catch (couponErr) {
        console.error('Failed to log coupon usage:', couponErr);
      }

      try {
        await retireUsedSponsorCoupon(couponRecord.code, { deductQuotaSeats: 1, meetingId });
      } catch (rotateErr) {
        console.error('Failed to rotate sponsor coupon:', rotateErr);
      }
    }

    if (isFreeRegistration && effectiveAttendeeEmail) {
      let meetingDateStr: string | undefined = undefined;
      if (meeting) {
        if (meeting.start_date && meeting.end_date) {
          const start = new Date(meeting.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
          const end = new Date(meeting.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
          meetingDateStr = start === end ? start : `${start} - ${end}`;
        } else if (meeting.meeting_date) {
          meetingDateStr = new Date(meeting.meeting_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      }

      after(() => sendRegistrationApprovedEmail({
        to: effectiveAttendeeEmail,
        recipientName: effectiveAttendeeName || 'ผู้ลงทะเบียน',
        nameEn: body.guestNameEn || body.nameEn || (effectiveSelectedActivities as any)?.nameEn || undefined,
        memberNo: validMemberNo || undefined,
        position: body.guestPosition || body.position || (effectiveSelectedActivities as any)?.position || undefined,
        workplace: effectiveAttendeeWorkplace || undefined,
        email: effectiveAttendeeEmail,
        phone: effectiveAttendeePhone || undefined,
        attendanceType: body.attendanceType || (effectiveSelectedActivities as any)?.attendanceType || undefined,
        sponsorCompanyName: couponRecord?.company_name || undefined,
        couponCode: couponRecord?.code || undefined,
        isCouponSponsored: Boolean(couponRecord),
        isFreeRegistration: true,
        meetingName: meeting.meeting_name || 'งานประชุมวิชาการ TSRM 2026',
        meetingDate: meetingDateStr,
        ticketCode: ticketCode,
        amountPaid: numericAmount,
        isMember: Boolean(isMember),
        selectedActivities: effectiveSelectedActivities,
      }).catch((mailErr) => console.error('Failed to send free individual registration confirmation email:', mailErr)));
    }

    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        ticketCode: ticketCode,
        status: registrationStatus,
        isFreeRegistration,
        sponsorCompany: couponRecord?.company_name || null,
        message: isFreeRegistration
          ? 'ลงทะเบียนสำเร็จด้วยสิทธิ์คูปองเรียบร้อยแล้ว ได้รับการยืนยันเข้าร่วมงานทันที!'
          : 'Registration submitted successfully, pending staff verification.',
      },
    });
  } catch (error: any) {
    if (error instanceof SeatUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'SEATS_UNAVAILABLE', shortages: error.shortages },
        { status: 409 }
      );
    }
    console.error('Error during meeting registration:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
