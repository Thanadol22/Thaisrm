const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const checkins = await prisma.meeting_daily_checkins.findMany({
    orderBy: { updated_at: 'desc' },
    take: 10,
    include: {
      members: { select: { fullNameTh: true, member_no: true } },
      meeting_attendances: { select: { attendance_id: true, attendee_name: true } }
    }
  });
  console.log('Daily Checkins count:', checkins.length);
  console.log('Recent checkins:', JSON.stringify(checkins, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const meetings = await prisma.meetings.findMany({
    select: { meeting_id: true, meeting_name: true, staff_code: true, meeting_date: true, status: true }
  });
  console.log('Meetings:', JSON.stringify(meetings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
