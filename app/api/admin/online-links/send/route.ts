import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { sendOnlineLinkEmail, sendOnlineReminderEmail } from '@/lib/email';
import { formatThaiDate } from '@/lib/services/dailyCheckinService';
import { isValidEmail } from '@/lib/onlineLinkMatching';
import { markRemindersSent } from '@/lib/services/onlineReminderLog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// ฝั่งหน้าจอแบ่งส่งทีละชุด เพื่อไม่ให้คำขอเดียวใช้เวลานานเกินไป
const MAX_PER_REQUEST = 25;

type Recipient = {
  attendanceId: string;
  name: string;
  email: string;
  programs?: string[];
  linkId?: string;
};

/**
 * POST /api/admin/online-links/send
 * body: { meetingId, linkDate, type: 'reminder' | 'link', recipients: Recipient[] }
 * - reminder: อีเมลเตือนก่อนวันงาน 1 วัน (ไม่มีลิงก์)
 * - link: อีเมลลิงก์เข้าห้องประชุมเฉพาะบุคคล (ใช้ลิงก์จากฐานข้อมูลตาม linkId)
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { meetingId, linkDate, type, recipients } = await req.json();
    if (!meetingId || !DATE_RE.test(linkDate || '') || (type !== 'reminder' && type !== 'link') || !Array.isArray(recipients)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }
    if (recipients.length === 0 || recipients.length > MAX_PER_REQUEST) {
      return NextResponse.json({ success: false, error: `ส่งได้ครั้งละ 1-${MAX_PER_REQUEST} รายการ` }, { status: 400 });
    }

    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
      select: { meeting_name: true, meeting_time: true },
    });
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'ไม่พบงานประชุม' }, { status: 404 });
    }

    const linksById = new Map<string, { id: bigint; meeting_link: string }>();
    if (type === 'link') {
      const ids = (recipients as Recipient[]).map((r) => r.linkId).filter(Boolean) as string[];
      const rows = await prisma.online_meeting_links.findMany({
        where: {
          id: { in: ids.map((id) => BigInt(id)) },
          meeting_id: meetingId,
          link_date: new Date(`${linkDate}T00:00:00.000Z`),
        },
        select: { id: true, meeting_link: true },
      });
      rows.forEach((r) => linksById.set(r.id.toString(), r));
    }

    const base = {
      meetingName: meeting.meeting_name,
      dateLabel: formatThaiDate(linkDate) || linkDate,
      timeLabel: meeting.meeting_time || undefined,
    };

    const sentAttendanceIds: string[] = [];
    const sentLinkIds: bigint[] = [];
    const errors: string[] = [];

    for (const r of recipients as Recipient[]) {
      const email = String(r.email || '').trim();
      if (!isValidEmail(email)) {
        errors.push(`${r.name || '-'}: อีเมลไม่ถูกต้อง`);
        continue;
      }
      const common = {
        ...base,
        to: email,
        recipientName: String(r.name || '').trim() || 'ผู้เข้าร่วมประชุม',
        programNames: Array.isArray(r.programs) ? r.programs.map(String) : undefined,
      };

      if (type === 'link') {
        const link = r.linkId ? linksById.get(String(r.linkId)) : undefined;
        if (!link) {
          errors.push(`${common.recipientName}: ไม่พบลิงก์ประชุม`);
          continue;
        }
        const result = await sendOnlineLinkEmail({ ...common, meetingLink: link.meeting_link });
        if (result.success) sentLinkIds.push(link.id);
        else errors.push(`${email}: ${result.error || 'ส่งไม่สำเร็จ'}`);
      } else {
        const result = await sendOnlineReminderEmail(common);
        if (result.success) sentAttendanceIds.push(String(r.attendanceId));
        else errors.push(`${email}: ${result.error || 'ส่งไม่สำเร็จ'}`);
      }
    }

    if (type === 'link' && sentLinkIds.length > 0) {
      await prisma.online_meeting_links.updateMany({
        where: { id: { in: sentLinkIds } },
        data: { link_sent_at: new Date() },
      });
    }
    if (type === 'reminder') {
      await markRemindersSent(meetingId, linkDate, sentAttendanceIds);
    }

    const sentCount = type === 'link' ? sentLinkIds.length : sentAttendanceIds.length;
    console.info(
      `[OnlineLinks] admin="${session.username}" meeting="${meetingId}" date=${linkDate} type=${type} sent=${sentCount} failed=${errors.length}`
    );

    return NextResponse.json({ success: true, sent: sentCount, failed: errors.length, errors });
  } catch (error: any) {
    console.error('POST /api/admin/online-links/send error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถส่งอีเมลได้' }, { status: 500 });
  }
}
