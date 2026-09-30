import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { isValidEmail, isValidLink, normalizeEmail } from '@/lib/onlineLinkMatching';
import { getReminderLog } from '@/lib/services/onlineReminderLog';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function serialize(row: any) {
  return {
    id: row.id.toString(),
    meetingId: row.meeting_id,
    linkDate: row.link_date.toISOString().slice(0, 10),
    attendanceId: row.attendance_id ? row.attendance_id.toString() : null,
    memberNo: row.member_no,
    name: row.import_name,
    email: row.import_email,
    link: row.meeting_link,
    reminderSentAt: row.reminder_sent_at,
    linkSentAt: row.link_sent_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/admin/online-links?meetingId=...&date=YYYY-MM-DD
 * ดึงลิงก์ประชุมออนไลน์รายบุคคลของงาน (ระบุวันได้)
 */
export async function GET(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');
  const date = searchParams.get('date');
  if (!meetingId) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุงานประชุม' }, { status: 400 });
  }
  try {
    const rows = await prisma.online_meeting_links.findMany({
      where: {
        meeting_id: meetingId,
        ...(date && DATE_RE.test(date) ? { link_date: toDbDate(date) } : {}),
      },
      orderBy: [{ link_date: 'asc' }, { id: 'asc' }],
    });
    const reminderLog = date && DATE_RE.test(date) ? await getReminderLog(meetingId, date) : {};
    return NextResponse.json({ success: true, data: rows.map(serialize), reminderLog });
  } catch (error: any) {
    console.error('GET /api/admin/online-links error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดึงข้อมูลลิงก์ประชุมได้' }, { status: 500 });
  }
}

/**
 * POST /api/admin/online-links
 * บันทึกลิงก์ที่นำเข้า (อีเมลเดิมในวันเดียวกันจะถูกอัปเดตลิงก์)
 * body: { meetingId, linkDate, rows: [{ name, email, link, attendanceId?, memberNo? }], replaceAll? }
 * replaceAll = true (โหมดแก้ไข): ลบลิงก์ของวันนั้นที่ไม่มีในรายการใหม่
 */
export async function POST(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { meetingId, linkDate, rows, replaceAll } = await req.json();
    if (!meetingId || !DATE_RE.test(linkDate || '') || !Array.isArray(rows)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const seenEmails = new Set<string>();
    const seenLinks = new Set<string>();
    for (const [i, r] of rows.entries()) {
      const email = normalizeEmail(r?.email);
      const link = String(r?.link || '').trim();
      if (!String(r?.name || '').trim() || !isValidEmail(email) || !isValidLink(link)) {
        return NextResponse.json(
          { success: false, error: `แถวที่ ${i + 1} ข้อมูลไม่ถูกต้อง (ชื่อ อีเมล หรือลิงก์)` },
          { status: 400 }
        );
      }
      if (seenEmails.has(email)) {
        return NextResponse.json({ success: false, error: `อีเมลซ้ำในไฟล์: ${email}` }, { status: 400 });
      }
      if (seenLinks.has(link)) {
        return NextResponse.json({ success: false, error: `ลิงก์ซ้ำในไฟล์ (แถวที่ ${i + 1}) ลิงก์ต้องไม่ซ้ำกันต่อคน` }, { status: 400 });
      }
      seenEmails.add(email);
      seenLinks.add(link);
    }

    const date = toDbDate(linkDate);
    const existing = await prisma.online_meeting_links.findMany({
      where: { meeting_id: meetingId, link_date: date },
    });
    const existingByEmail = new Map(existing.map((e) => [e.import_email, e]));
    const clash = replaceAll ? null : existing.find((e) => seenLinks.has(e.meeting_link) && !seenEmails.has(e.import_email));
    if (clash) {
      return NextResponse.json(
        { success: false, error: `ลิงก์ซ้ำกับที่บันทึกไว้ของ ${clash.import_name} (${clash.import_email})` },
        { status: 400 }
      );
    }

    const removedIds = replaceAll ? existing.filter((e) => !seenEmails.has(e.import_email)).map((e) => e.id) : [];

    await prisma.$transaction([
      ...(removedIds.length > 0 ? [prisma.online_meeting_links.deleteMany({ where: { id: { in: removedIds } } })] : []),
      ...rows.map((r: any) => {
        const email = normalizeEmail(r.email);
        const link = String(r.link).trim();
        const prev = existingByEmail.get(email);
        const data = {
          import_name: String(r.name).trim(),
          meeting_link: link,
          attendance_id: r.attendanceId ? BigInt(r.attendanceId) : null,
          member_no: r.memberNo || null,
          // ลิงก์เปลี่ยน ต้องส่งลิงก์ใหม่ให้ผู้เข้าร่วมอีกครั้ง
          ...(prev && prev.meeting_link !== link ? { link_sent_at: null } : {}),
        };
        return prisma.online_meeting_links.upsert({
          where: {
            meeting_id_link_date_import_email: { meeting_id: meetingId, link_date: date, import_email: email },
          },
          update: data,
          create: { ...data, meeting_id: meetingId, link_date: date, import_email: email },
        });
      }),
    ]);

    return NextResponse.json({ success: true, message: `บันทึกลิงก์ประชุม ${rows.length} รายการเรียบร้อย` });
  } catch (error: any) {
    console.error('POST /api/admin/online-links error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถบันทึกลิงก์ประชุมได้' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/online-links
 * body: { meetingId, linkDate, ids?: string[] }  (ไม่ระบุ ids = ลบทั้งวัน)
 */
export async function DELETE(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { meetingId, linkDate, ids } = await req.json();
    if (!meetingId || !DATE_RE.test(linkDate || '')) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }
    const result = await prisma.online_meeting_links.deleteMany({
      where: {
        meeting_id: meetingId,
        link_date: toDbDate(linkDate),
        ...(Array.isArray(ids) && ids.length > 0 ? { id: { in: ids.map((id: string) => BigInt(id)) } } : {}),
      },
    });
    return NextResponse.json({ success: true, message: `ลบลิงก์ประชุม ${result.count} รายการ` });
  } catch (error: any) {
    console.error('DELETE /api/admin/online-links error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถลบลิงก์ประชุมได้' }, { status: 500 });
  }
}
