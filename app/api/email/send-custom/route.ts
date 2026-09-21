import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendCustomBroadcastEmail } from '@/lib/email';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      subject,
      content,
      targetType = 'custom', // 'custom' | 'all_members' | 'active_members' | 'meeting_attendees'
      targetMeetingId,
      customEmails = '', // Comma or newline separated
      isTest = false,
      testRecipient = '',
    } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุหัวข้ออีเมล (Subject)' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกเนื้อหาอีเมล (Content)' }, { status: 400 });
    }

    // 1. If Test Send
    if (isTest) {
      const email = (testRecipient || session.username || '').trim();
      if (!email || !email.includes('@')) {
        return NextResponse.json({
          success: false,
          error: 'กรุณาระบุอีเมลสำหรับรับข้อความทดสอบที่ถูกต้อง',
        }, { status: 400 });
      }

      const samplePlaceholders = {
        name: 'นายทดสอบ ระบบสมาชิก',
        email: email,
        member_no: '0999',
        meeting_name: 'การประชุมวิชาการประจำปี TSRM 2026',
        ticket_code: 'TSRM-2026-TEST',
      };

      const result = await sendCustomBroadcastEmail({
        to: email,
        subject: `[ทดสอบ] ${subject}`,
        recipientName: 'ผู้รับทดสอบ (Admin)',
        rawHtmlContent: content,
        placeholders: samplePlaceholders,
      });

      return NextResponse.json({
        success: result.success,
        message: result.success ? `ส่งอีเมลทดสอบไปยัง ${email} สำเร็จ` : (result.error || 'ส่งเมลทดสอบล้มเหลว'),
      });
    }

    // 2. Resolve Target Recipients List
    let recipients: Array<{
      name: string;
      email: string;
      memberNo?: string;
      meetingName?: string;
      ticketCode?: string;
    }> = [];

    if (targetType === 'custom') {
      const rawList = customEmails
        .split(/[\n,;]+/)
        .map((e: string) => e.trim())
        .filter((e: string) => e && e.includes('@'));

      recipients = rawList.map((em: string) => ({
        name: em.split('@')[0],
        email: em,
      }));
    } else if (targetType === 'all_members' || targetType === 'active_members') {
      const whereCondition: any = {};
      if (targetType === 'active_members') {
        whereCondition.membership_status = 'Active';
      }

      const members = await prisma.member.findMany({
        where: {
          ...whereCondition,
          email: { not: null },
        },
        select: {
          fullNameTh: true,
          email: true,
          member_no: true,
        },
      });

      recipients = members
        .filter((m) => m.email && m.email.includes('@'))
        .map((m) => ({
          name: m.fullNameTh,
          email: m.email!,
          memberNo: m.member_no,
        }));
    } else if (targetType === 'meeting_attendees') {
      if (!targetMeetingId) {
        return NextResponse.json({ success: false, error: 'กรุณาเลือกงานประชุมที่ต้องการส่ง' }, { status: 400 });
      }

      const meeting = await prisma.meetings.findUnique({
        where: { meeting_id: targetMeetingId },
      });

      const attendees = await prisma.meeting_attendances.findMany({
        where: {
          meeting_id: targetMeetingId,
          attendance_status: { notIn: ['Cancelled', 'Rejected'] },
        },
        include: {
          members: {
            select: { fullNameTh: true, email: true, member_no: true },
          },
        },
      });

      recipients = attendees
        .map((a) => {
          const name = a.members?.fullNameTh || a.attendee_name || 'ผู้เข้าร่วมประชุม';
          const email = a.members?.email || a.attendee_email || '';
          return {
            name,
            email,
            memberNo: a.member_no || undefined,
            meetingName: meeting?.meeting_name,
            ticketCode: a.member_no ? `TSRM-${a.member_no}` : undefined,
          };
        })
        .filter((r) => r.email && r.email.includes('@'));
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบรายชื่อผู้รับตามกลุ่มเป้าหมายที่เลือก',
      }, { status: 400 });
    }

    // 3. Batch Send
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      try {
        const placeholders = {
          name: r.name,
          email: r.email,
          member_no: r.memberNo || '',
          meeting_name: r.meetingName || '',
          ticket_code: r.ticketCode || '',
        };

        const result = await sendCustomBroadcastEmail({
          to: r.email,
          subject,
          recipientName: r.name,
          rawHtmlContent: content,
          placeholders,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(`${r.email}: ${result.error || 'Failed'}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`${r.email}: ${err?.message || 'Error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: recipients.length,
        successCount,
        failedCount,
        errors: errors.slice(0, 5),
      },
      message: `ส่งอีเมลสำเร็จ ${successCount} จากทั้งหมด ${recipients.length} รายการ`,
    });
  } catch (error: any) {
    console.error('API /api/email/send-custom error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการส่งอีเมล',
    }, { status: 500 });
  }
}
