import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { retireUsedSponsorCoupon } from '@/lib/services/sponsorCouponService';
import crypto from 'crypto';
import { sendAttendeeTicketEmail, sendAttendeeSponsoredRegistrationEmail, sendRegistrationApprovedEmail } from '@/lib/email';

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

    // ─── Sponsor Identity Verification ────────────────────────────────────
    // ต้องส่ง submittedByEmail ที่ตรงกับ contact_email ของบริษัทในฐานข้อมูลเสมอ
    if (!submittedByEmail || typeof submittedByEmail !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: กรุณาระบุอีเมลตัวแทนบริษัท' },
        { status: 401 }
      );
    }

    const cleanEmail = submittedByEmail.trim().toLowerCase();

    // 1. ตรวจสอบข้อมูล Sponsor + ยืนยันว่า email ตรงกัน
    const sponsor = await (prisma as any).sponsors.findFirst({
      where: {
        id: sponsorId,
        contact_email: { equals: cleanEmail, mode: 'insensitive' },
        is_active: true,
      },
    });

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: อีเมลไม่ตรงกับข้อมูลบริษัท หรือบัญชีถูกระงับ' },
        { status: 401 }
      );
    }
    // ──────────────────────────────────────────────────────────────────────



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

    // 4. ตรวจสอบคูปอง (ถ้ามีการระบุคูปองมา หรือดึงคูปองปัจจุบันของบริษัท)
    let couponRecord: any = null;
    if (couponCode) {
      couponRecord = await (prisma as any).coupons.findFirst({
        where: {
          code: { equals: couponCode.trim(), mode: 'insensitive' },
          is_active: true,
        },
      });
    }
    if (!couponRecord) {
      couponRecord = await (prisma as any).coupons.findFirst({
        where: {
          company_name: { equals: sponsor.name, mode: 'insensitive' },
          meeting_id: meetingId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    const effectiveCouponCode = couponRecord?.code || (couponCode ? couponCode.trim().toUpperCase() : null);

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

      if (entry.email && sponsor.contact_email && entry.email.trim().toLowerCase() === sponsor.contact_email.trim().toLowerCase()) {
        errors.push(
          `ลำดับที่ ${i + 1}: ไม่สามารถใช้อีเมลเดียวกับตัวแทนบริษัทสปอนเซอร์ในการลงทะเบียนได้ กรุณาระบุอีเมลของผู้เข้าร่วม`
        );
        continue;
      }

      // สุ่มรหัส Ticket Code ที่ไม่ซ้ำ
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `TSRM-${meetingId.substring(0, 4).toUpperCase()}-SP${randomSuffix}`;

      // บันทึกลง meeting_attendances (อัปเดตรายการเดิมถ้ามี หรือสร้างรายการใหม่)
      let attendance: any = null;
      const existingAttendanceRecord = await (prisma as any).meeting_attendances.findFirst({
        where: {
          meeting_id: meetingId,
          member_no: dbMember.member_no,
        },
      });

      if (existingAttendanceRecord) {
        attendance = await (prisma as any).meeting_attendances.update({
          where: { attendance_id: existingAttendanceRecord.attendance_id },
          data: {
            attendee_name: dbMember.fullNameTh || entry.fullName,
            attendee_email: dbMember.email || entry.email,
            attendee_phone: dbMember.mobile || entry.phone || null,
            workplace: dbMember.workplace || entry.workplace || null,
            attendance_status: 'Registered',
            sponsor_id: sponsor.id,
            sponsor_company_name: sponsor.name,
            coupon_code: effectiveCouponCode,
          },
        });
      } else {
        attendance = await (prisma as any).meeting_attendances.create({
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
            coupon_code: effectiveCouponCode,
          },
        });
      }

      // ลบรายการบุคคลทั่วไปที่ตกค้างออกหากเป็นสมาชิก
      const effectiveAttendeeEmail = (dbMember.email || entry.email || '').trim().toLowerCase();
      if (effectiveAttendeeEmail) {
        await (prisma as any).meeting_attendances.deleteMany({
          where: {
            meeting_id: meetingId,
            member_no: null,
            attendee_email: { equals: effectiveAttendeeEmail, mode: 'insensitive' },
          },
        }).catch(() => {});
      }

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
          coupon_code: effectiveCouponCode,
          discount_amount: meeting.base_price || 0,
          net_price: 0,
          submitted_by_email: submittedByEmail || sponsor.contact_email,
          status: 'confirmed',
        },
      });

      // บันทึกประวัติการใช้คูปองลง coupon_usages เพื่อติดตามรายชื่อผู้ใช้สิทธิ์แยกตามรหัสคูปอง
      if (couponRecord) {
        try {
          await (prisma as any).coupon_usages.create({
            data: {
              coupon_id: couponRecord.id,
              meeting_id: meetingId,
              member_no: dbMember.member_no,
              attendee_name: dbMember.fullNameTh || entry.fullName,
              attendee_email: dbMember.email || entry.email,
              attendee_phone: dbMember.mobile || entry.phone || null,
              workplace: dbMember.workplace || entry.workplace || sponsor.name || null,
              discount_applied: meeting.base_price || 0,
              final_amount: 0,
              ticket_code: ticketCode,
              slip_id: `GRP-${sponsor.name}`,
              used_at: new Date(),
            },
          });
        } catch (usageErr) {
          console.error('[SubmitGroupRegistration] Failed to create coupon_usages:', usageErr);
        }
      }

      // อัปเดต Member ให้ระบุว่าได้รับการสนับสนุนโดยบริษัท
      await (prisma as any).member.update({
        where: { member_no: dbMember.member_no },
        data: {
          sponsor_id: sponsor.id,
          sponsored_by_company: sponsor.name,
        },
      });

      // จัดการ format วันที่ของงานประชุมอย่างปลอดภัย
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

      // ส่งอีเมลแจ้งผลการลงทะเบียนให้สมาชิกแต่ละท่าน (ถ้ามีอีเมล)
      const recipientEmail = (dbMember.email || entry.email)?.trim();
      const recipientName = dbMember.fullNameTh || entry.fullName || 'ผู้เข้าร่วมประชุม';
      const attendeeWorkplace = dbMember.workplace || entry.workplace || sponsor.name || undefined;

      if (recipientEmail && recipientEmail.includes('@')) {
        try {
          console.log(`📧 [SPONSOR PORTAL] Sending sponsored registration email to attendee: ${recipientEmail} (${recipientName})`);
          await sendAttendeeSponsoredRegistrationEmail({
            to: recipientEmail,
            recipientName,
            recipientEmail,
            memberNo: dbMember.member_no,
            workplace: attendeeWorkplace,
            companyName: sponsor.name,
            meetingName: meeting.meeting_name,
            meetingDate: meetingDateStr,
            ticketCode,
            items: [{
              name: meeting.meeting_name,
              format: 'onsite',
            }],
            format: 'onsite',
          });
        } catch (mailErr) {
          console.error(`Failed to send sponsored registration email to ${recipientEmail}:`, mailErr);
        }
      } else {
        console.warn(`⚠️ [SPONSOR PORTAL] Skipping email for member ${dbMember.member_no}: No email found.`);
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

    // ส่งอีเมลสรุปยืนยันการลงทะเบียนให้ตัวแทนบริษัทผู้ส่ง
    const coordinatorEmail = sponsor.contact_email?.trim() || cleanEmail;
    if (coordinatorEmail && results.length > 0) {
      try {
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

        console.log(`📧 [SPONSOR PORTAL] Sending group registration summary email to sponsor coordinator: ${coordinatorEmail}`);
        await sendRegistrationApprovedEmail({
          to: coordinatorEmail,
          recipientName: sponsor.contact_name || sponsor.name || 'ตัวแทนบริษัท',
          meetingName: meeting.meeting_name,
          meetingDate: meetingDateStr,
          ticketCode: `GRP-${sponsor.name}`,
          amountPaid: 0,
          isMember: true,
          sponsorCompanyName: sponsor.name,
          isFreeRegistration: true,
          selectedActivities: {
            isGroup: true,
            companyName: sponsor.name,
            attendees: results,
          },
        });
      } catch (coordMailErr) {
        console.error('Failed to send sponsor coordinator summary email:', coordMailErr);
      }
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

      // คูปองบริษัทใช้ได้ 1 ครั้ง: ปิดรหัสที่ใช้แล้วและออกรหัสใหม่สำหรับสิทธิ์คงเหลือ
      if (results.length > 0) {
        try {
          await retireUsedSponsorCoupon(couponRecord.code);
        } catch (rotateErr) {
          console.error('[SubmitGroupRegistration] Failed to rotate sponsor coupon:', rotateErr);
        }
      }
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
