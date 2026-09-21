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
    } = body;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    const numericAmount = Math.max(0, Number(amount) || 0);
    const isFreeRegistration = numericAmount === 0;

    if (!slipUrl && !isFreeRegistration) {
      return NextResponse.json(
        { success: false, error: 'Payment slip image is required' },
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
        if (!couponRecord.is_active || couponRecord.used_count >= couponRecord.max_uses || (couponRecord.meeting_id && couponRecord.meeting_id !== meetingId)) {
          return NextResponse.json(
            { success: false, error: 'รหัสคูปองไม่ถูกต้อง ไม่ตรงรอบการประชุม หรือโควตาสิทธิ์เต็มแล้ว' },
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
