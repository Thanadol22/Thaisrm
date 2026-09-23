import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendAttendeeTicketEmail } from '@/lib/email';

interface MemberEntry {
  memberNo: string;
  fullName: string;
  email: string;
  phone?: string;
  workplace?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sponsorId,
      meetingId,
      members = [],
      couponCode,
      submittedByEmail,
    } = body;

    if (!sponsorId || !meetingId || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน กรุณาระบุบริษัท, งานประชุม และรายชื่อสมาชิกที่ต้องการลงทะเบียน',
        },
        { status: 400 }
      );
    }

    // 1. ตรวจสอบข้อมูล Sponsor
    const sponsor = await (prisma as any).sponsors.findUnique({
      where: { id: sponsorId },
    });

    if (!sponsor || !sponsor.is_active) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบบริษัทสปอนเซอร์หรือบัญชีถูกระงับ' },
        { status: 404 }
      );
    }

    // 2. ตรวจสอบงานประชุม
    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบงานประชุมที่เลือก' },
        { status: 404 }
      );
    }

    // 3. ตรวจสอบโควต้าของบริษัทสำหรับงานประชุมนี้
    const quota = await (prisma as any).sponsor_quotas.findFirst({
      where: {
        sponsor_id: sponsorId,
        meeting_id: meetingId,
      },
    });

    const requestedCount = members.length;
    let isUsingQuota = false;

    if (quota) {
      const remainingQuota = Math.max(0, quota.quota_seats - quota.used_seats);
      if (remainingQuota >= requestedCount) {
        isUsingQuota = true;
      }
    }

    // 4. ตรวจสอบคูปอง (ถ้ามีการระบุคูปองมา)
    let couponRecord: any = null;
    if (couponCode) {
      couponRecord = await (prisma as any).coupons.findFirst({
        where: {
          code: { equals: couponCode.trim(), mode: 'insensitive' },
          is_active: true,
        },
      });
    }

    // 5. ดำเนินการตรวจสอบและบันทึกข้อมูลสมาชิกแต่ละคน
    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < members.length; i++) {
      const entry: MemberEntry = members[i];
      let memberNo = (entry.memberNo || '').trim();
      if (/^\d+$/.test(memberNo) && memberNo.length < 4) {
        memberNo = memberNo.padStart(4, '0');
      }

      // ตรวจสอบสมาชิกในฐานข้อมูล
      const dbMember = await (prisma as any).member.findFirst({
        where: {
          OR: [{ member_no: memberNo }, { member_no: entry.memberNo }],
        },
      });

      if (!dbMember) {
        errors.push(`ลำดับที่ ${i + 1}: ไม่พบสมาชิกหมายเลข ${entry.memberNo} ในระบบ`);
        continue;
      }

      // ตรวจสอบสถานะสมาชิกภาพ
      if (dbMember.membership_status && dbMember.membership_status.toLowerCase() !== 'active') {
        errors.push(
          `ลำดับที่ ${i + 1}: สมาชิก ${dbMember.member_no} (${dbMember.fullNameTh}) สถานะเป็น "${dbMember.membership_status}" ไม่อนุญาตให้ลงทะเบียน`
        );
        continue;
      }

      // ตรวจสอบว่าลงทะเบียนงานนี้ไปแล้วหรือยัง
      const alreadyRegistered = await (prisma as any).meeting_attendances.findFirst({
        where: {
          meeting_id: meetingId,
          member_no: dbMember.member_no,
        },
      });

      if (alreadyRegistered) {
        errors.push(
          `ลำดับที่ ${i + 1}: สมาชิก ${dbMember.member_no} (${dbMember.fullNameTh}) ได้ลงทะเบียนงานนี้แล้ว`
        );
        continue;
      }

      // สุ่มรหัส Ticket Code ที่ไม่ซ้ำ
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `TSRM-${meetingId.substring(0, 4).toUpperCase()}-SP${randomSuffix}`;

      // บันทึกลง meeting_attendances
      const attendance = await (prisma as any).meeting_attendances.create({
        data: {
          meeting_id: meetingId,
          member_no: dbMember.member_no,
          attendee_name: dbMember.fullNameTh || entry.fullName,
          attendee_email: dbMember.email || entry.email,
          attendee_phone: dbMember.mobile || entry.phone || null,
          workplace: dbMember.workplace || entry.workplace || null,
          attendance_status: 'Registered',
          sponsor_id: sponsor.id,
          sponsor_company_name: sponsor.name,
          coupon_code: couponCode || (isUsingQuota ? `SPONSOR-${sponsor.name}` : null),
        },
      });

      // บันทึกลง sponsor_group_members
      await (prisma as any).sponsor_group_members.create({
        data: {
          sponsor_id: sponsor.id,
          meeting_id: meetingId,
          member_no: dbMember.member_no,
          attendee_name: dbMember.fullNameTh || entry.fullName,
          attendee_email: dbMember.email || entry.email,
          attendee_phone: dbMember.mobile || entry.phone || null,
          workplace: dbMember.workplace || entry.workplace || null,
          ticket_code: ticketCode,
          attendance_id: attendance.attendance_id,
          coupon_code: couponCode || null,
          discount_amount: meeting.base_price || 0,
          net_price: 0,
          submitted_by_email: submittedByEmail || sponsor.contact_email,
          status: 'confirmed',
        },
      });

      // อัปเดต Member ให้ระบุว่าได้รับการสนับสนุนโดยบริษัท
      await (prisma as any).member.update({
        where: { member_no: dbMember.member_no },
        data: {
          sponsor_id: sponsor.id,
          sponsored_by_company: sponsor.name,
        },
      });

      // ส่งอีเมลตั๋วให้สมาชิก (ถ้ามีอีเมล)
      const recipientEmail = dbMember.email || entry.email;
      if (recipientEmail && recipientEmail.includes('@')) {
        try {
          await sendAttendeeTicketEmail({
            to: recipientEmail,
            recipientName: dbMember.fullNameTh || entry.fullName,
            meetingName: meeting.meeting_name,
            meetingDate: meeting.meeting_date.toLocaleDateString('th-TH'),
            location: meeting.location || 'ดูรายละเอียดในกำหนดการ',
            ticketCode,
            memberNo: dbMember.member_no,
          });
        } catch (mailErr) {
          console.error(`Failed to send ticket email to ${recipientEmail}:`, mailErr);
        }
      }

      results.push({
        memberNo: dbMember.member_no,
        fullName: dbMember.fullNameTh,
        email: recipientEmail,
        ticketCode,
      });
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'ไม่สามารถลงทะเบียนได้เนื่องจากพบข้อผิดพลาดในรายชื่อทั้งหมด',
          errors,
        },
        { status: 400 }
      );
    }

    // 6. อัปเดตโควต้าที่ใช้ไปใน sponsor_quotas
    if (quota) {
      await (prisma as any).sponsor_quotas.update({
        where: { id: quota.id },
        data: {
          used_seats: {
            increment: results.length,
          },
        },
      });
    }

    // 7. อัปเดต used_count ในคูปอง (ถ้ามีการใช้คูปองแยก)
    if (couponRecord) {
      await (prisma as any).coupons.update({
        where: { id: couponRecord.id },
        data: {
          used_count: {
            increment: results.length,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `ลงทะเบียนสำเร็จเรียบร้อยแล้ว จำนวน ${results.length} ท่าน`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[SubmitGroupRegistration] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียนกลุ่ม กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
