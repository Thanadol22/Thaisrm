import prisma from '@/lib/prisma';

// บันทึกการส่งอีเมลเตือนก่อนวันงาน (ส่งถึงผู้ลงทะเบียนทุกคน รวมคนที่ยังไม่มีลิงก์ จึงเก็บแยกจากตารางลิงก์)
// เก็บใน system_settings: { [attendance_id]: ISO time }

function logKey(meetingId: string, linkDate: string): string {
  return `online_reminder_log:${meetingId}:${linkDate}`;
}

export async function getReminderLog(meetingId: string, linkDate: string): Promise<Record<string, string>> {
  const row = await prisma.system_settings.findUnique({ where: { key: logKey(meetingId, linkDate) } });
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function markRemindersSent(meetingId: string, linkDate: string, attendanceIds: string[]): Promise<void> {
  if (attendanceIds.length === 0) return;
  const log = await getReminderLog(meetingId, linkDate);
  const now = new Date().toISOString();
  for (const id of attendanceIds) log[id] = now;
  const key = logKey(meetingId, linkDate);
  await prisma.system_settings.upsert({
    where: { key },
    update: { value: JSON.stringify(log) },
    create: { key, value: JSON.stringify(log), description: 'Online meeting reminder dispatch log' },
  });
}
