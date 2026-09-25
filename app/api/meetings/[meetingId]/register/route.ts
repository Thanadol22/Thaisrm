import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `GRP-${new Date().getFullYear()}-${randomSuffix}`;
      const slipId = `SLIP-GRP-${Date.now().toString(36).toUpperCase()}`;
      const registrationStatus = isFreeRegistration ? 'approved' : 'pending';

      const groupPayload = {
        isGroup: true,
        companyName: companyName || 'Corporate Group',
        groupContact: groupContact || null,
        attendees: attendees,
        submittedAt: new Date().toISOString(),
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

      // ห่อทุก DB write ด้วย Transaction เพื่อความ Atomic
      let slip: any;
      await prisma.$transaction(async (tx) => {
        // Create single group payment slip
        slip = await tx.payment_slips.create({
          data: {
            slip_id: slipId,
            meeting_id: meetingId,
            member_no: null,
            guest_name: `${companyName || 'Corporate Group'} (${attendees.length} ท่าน)`,
            guest_email: groupContact?.coordinatorEmail || attendees[0]?.email || null,
            guest_phone: groupContact?.coordinatorPhone || null,
            guest_workplace: companyName || null,
            is_member: false,
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

        // Create attendance records for each attendee & link sponsor data
        for (const att of attendees) {
          const attName = att.nameTh || att.nameEn || 'Attendee';
          const attEmail = att.email?.trim()?.toLowerCase() || '';
          const attWorkplace = att.workplace || companyName || null;
          const attMemberNo = att.memberNo ? att.memberNo.trim() : null;
          const attDiscount = Number(att.discountTotal || att.discountAmount || 0);
          const attNet = Number(att.price || att.netPrice || 0);

          let attendanceId: any = null;

          if (attMemberNo) {
            const attResult = await tx.$queryRaw<Array<{ attendance_id: any }>>`
              INSERT INTO meeting_attendances (
                meeting_id, member_no, attendance_status, sponsor_id, sponsor_company_name, coupon_code
              ) VALUES (
                ${meetingId}, ${attMemberNo}, ${isFreeRegistration ? 'Registered' : 'Pending_Payment'},
                ${effectiveSponsorId}, ${effectiveSponsorName}, ${couponCode || null}
              ) ON CONFLICT (meeting_id, member_no)
              DO UPDATE SET 
                attendance_status = ${isFreeRegistration ? 'Registered' : 'Pending_Payment'},
                sponsor_id = COALESCE(${effectiveSponsorId}, meeting_attendances.sponsor_id),
                sponsor_company_name = COALESCE(${effectiveSponsorName}, meeting_attendances.sponsor_company_name),
                coupon_code = COALESCE(${couponCode || null}, meeting_attendances.coupon_code)
              RETURNING attendance_id
            `;
            attendanceId = attResult?.[0]?.attendance_id;

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
                  ${att.phone || null}, ${attWorkplace}, ${ticketCode}, ${attendanceId || null},
                  ${couponCode || null}, ${attDiscount}, ${attNet},
                  ${groupContact?.coordinatorEmail || attendees[0]?.email || null},
                  ${isFreeRegistration ? 'confirmed' : 'pending'}, NOW(), NOW()
                ) ON CONFLICT (meeting_id, member_no)
                DO UPDATE SET
                  status = ${isFreeRegistration ? 'confirmed' : 'pending'},
                  attendance_id = COALESCE(${attendanceId || null}, sponsor_group_members.attendance_id),
                  updated_at = NOW()
              `;
            }
          } else if (attEmail) {
            const attResult = await tx.$queryRaw<Array<{ attendance_id: any }>>`
              INSERT INTO meeting_attendances (
                meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status,
                sponsor_id, sponsor_company_name, coupon_code
              ) VALUES (
                ${meetingId}, NULL, ${attName}, ${attEmail}, ${att.phone || null}, ${attWorkplace},
                ${isFreeRegistration ? 'Registered' : 'Non-Member-Pending'},
                ${effectiveSponsorId}, ${effectiveSponsorName}, ${couponCode || null}
              )
              RETURNING attendance_id
            `;
            attendanceId = attResult?.[0]?.attendance_id;
          }
        }

        // Update sponsor quota if assigned
        if (effectiveSponsorId) {
          await tx.$executeRaw`
            UPDATE sponsor_quotas 
            SET used_seats = used_seats + ${attendees.length}, updated_at = NOW()
            WHERE sponsor_id = ${effectiveSponsorId} AND meeting_id = ${meetingId}
          `;
        }

        // Log coupon usages
        if (couponCode) {
          const couponRec = await tx.coupons.findFirst({ where: { code: couponCode } });
          if (couponRec) {
            await tx.$executeRaw`
              UPDATE coupons 
              SET used_count = used_count + ${attendees.length}, updated_at = NOW()
              WHERE id = ${couponRec.id}
            `;
            for (const att of attendees) {
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
      effectiveAttendeeName = member.fullNameTh || member.fullNameEn || effectiveAttendeeName;
      effectiveAttendeeEmail = member.email || effectiveAttendeeEmail;
      effectiveAttendeePhone = member.mobile || effectiveAttendeePhone;
      effectiveAttendeeWorkplace = member.workplace || effectiveAttendeeWorkplace;

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

      if (existingSlip || existingAttendance) {
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

      // Duplicate registration check for non-member
      const cleanGuestEmail = guestEmail.trim().toLowerCase();
      const guestSlips = await prisma.$queryRaw<Array<{ slip_id: string; status: string }>>`
        SELECT slip_id, status 
        FROM payment_slips 
        WHERE meeting_id = ${meetingId} 
          AND is_member = false 
          AND LOWER(guest_email) = ${cleanGuestEmail} 
          AND status IN ('pending', 'approved') 
        LIMIT 1
      `;
      const existingGuestSlip = guestSlips?.[0];

      const guestAttendances = await prisma.$queryRaw<Array<{ attendance_id: any; attendance_status: string }>>`
        SELECT attendance_id, attendance_status 
        FROM meeting_attendances 
        WHERE meeting_id = ${meetingId} 
          AND LOWER(attendee_email) = ${cleanGuestEmail} 
          AND attendance_status NOT IN ('Cancelled', 'Rejected') 
        LIMIT 1
      `;
      const existingGuestAttendance = guestAttendances?.[0];

      if (existingGuestSlip || existingGuestAttendance) {
        const isApproved = existingGuestSlip?.status === 'approved' || existingGuestAttendance?.attendance_status === 'Registered';
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

    // Generate unique Ticket Code: TSRM-YYYY-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TSRM-${new Date().getFullYear()}-${randomSuffix}`;
    const slipId = `SLIP-${Date.now().toString(36).toUpperCase()}`;
    const registrationStatus = isFreeRegistration ? 'approved' : 'pending';
    const attendanceStatus = isFreeRegistration ? 'Registered' : (isMember ? 'Pending_Payment' : 'Non-Member-Pending');
    const effectiveSlipUrl = slipUrl || (couponRecord ? `COUPON_SPONSORED:${couponRecord.company_name}` : 'FREE_REGISTRATION');

    // 2. Record payment slip in payment_slips table
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
          amount: numericAmount,
          bank: bank || (couponRecord ? `สิทธิ์คูปอง: ${couponRecord.company_name}` : null),
          transfer_date: transferDate || null,
          transfer_time: transferTime || null,
          ref_no: refNo || (couponRecord ? `COUPON:${couponRecord.code}` : null),
          slip_url: effectiveSlipUrl,
          status: registrationStatus,
          selected_activities: selectedActivities || null,
          reviewed_by: isFreeRegistration ? (couponRecord ? `SYSTEM:COUPON(${couponRecord.code})` : 'SYSTEM:AUTO_FREE') : null,
          reviewed_at: isFreeRegistration ? new Date() : null,
        },
      });
    } else {
      const actJson = selectedActivities ? JSON.stringify(selectedActivities) : null;
      await prisma.$executeRaw`
        INSERT INTO payment_slips (
          slip_id, meeting_id, member_no, guest_name, guest_email, guest_phone, guest_workplace,
          is_member, ticket_code, amount, bank, transfer_date, transfer_time, ref_no, slip_url,
          status, selected_activities, reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES (
          ${slipId}, ${meetingId}, ${validMemberNo}, ${!isMember ? guestName : null}, ${!isMember ? guestEmail : null},
          ${!isMember ? (guestPhone || null) : null}, ${!isMember ? (guestWorkplace || null) : null},
          ${!!isMember}, ${ticketCode}, ${numericAmount}, ${bank || (couponRecord ? `สิทธิ์คูปอง: ${couponRecord.company_name}` : null)}, ${transferDate || null},
          ${transferTime || null}, ${refNo || (couponRecord ? `COUPON:${couponRecord.code}` : null)}, ${effectiveSlipUrl}, 
          ${registrationStatus}, ${actJson}::jsonb, ${isFreeRegistration ? 'SYSTEM:AUTO' : null}, ${isFreeRegistration ? new Date() : null}, NOW(), NOW()
        )
      `;
      slip = { slip_id: slipId };
    }

    // 3. Record attendance in meeting_attendances table
    if (isMember && validMemberNo) {
      await prisma.$executeRaw`
        INSERT INTO meeting_attendances (
          meeting_id, member_no, attendance_status
        ) VALUES (
          ${meetingId}, ${validMemberNo}, ${attendanceStatus}
        ) ON CONFLICT (meeting_id, member_no)
        DO UPDATE SET attendance_status = ${attendanceStatus}
      `;
    } else {
      // Create non-member attendance record
      await prisma.$executeRaw`
        INSERT INTO meeting_attendances (
          meeting_id, member_no, attendee_name, attendee_email, attendee_phone, workplace, attendance_status
        ) VALUES (
          ${meetingId}, NULL, ${guestName}, ${guestEmail}, ${guestPhone || null}, ${guestWorkplace || null}, ${attendanceStatus}
        )
      `;
    }

    // 4. Record Coupon Usage & increment used_count if coupon was used
    if (couponRecord) {
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
    console.error('Error during meeting registration:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
