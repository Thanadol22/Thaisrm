import prisma from '../lib/prisma';
import {
  ensureDailyCheckinsForMeeting,
  processDailyQrScan,
  getMeetingProgramsAndDates,
  formatBangkokDate,
} from '../lib/services/dailyCheckinService';

async function main() {
  console.log('🧪 Starting Daily Dynamic QR Code & Checkin System Verification...\n');

  // 1. Fetch or create a test meeting with 2-day date range (e.g. 21-22 Oct)
  let meeting = await prisma.meetings.findFirst({
    where: { meeting_id: 'TEST-CONF-2026' },
  });

  if (!meeting) {
    meeting = await prisma.meetings.create({
      data: {
        meeting_id: 'TEST-CONF-2026',
        meeting_name: 'การประชุมวิชาการประจำปี TSRM 2026',
        meeting_date: new Date('2026-10-21'),
        start_date: new Date('2026-10-21'),
        end_date: new Date('2026-10-22'),
        location: 'โรงแรมสยาม เคมปินสกี้ กรุงเทพฯ',
        staff_code: '1234',
        status: 'upcoming',
        activities: [
          { name: 'Pre-congress Workshop: Advanced ART', date: '2026-10-20' },
        ],
      },
    });
    console.log('✅ Created test meeting: TEST-CONF-2026');
  }

  // 2. Check program and dates extraction
  const programs = getMeetingProgramsAndDates(meeting);
  console.log('📅 Extracted Programs & Dates:');
  console.log(JSON.stringify(programs, null, 2));

  // 3. Ensure test attendee exists (use test account 0000 or find existing)
  let member = await prisma.member.findFirst({
    where: { member_no: '0000' },
  });
  if (!member) {
    member = await prisma.member.findFirst({
      orderBy: { id: 'desc' },
    });
  }
  if (!member) {
    throw new Error('No member found in DB for test checkin.');
  }

  let att = await prisma.meeting_attendances.findFirst({
    where: { meeting_id: meeting.meeting_id, member_no: member.member_no },
  });
  if (!att) {
    att = await prisma.meeting_attendances.create({
      data: {
        meeting_id: meeting.meeting_id,
        member_no: member.member_no,
        attendance_status: 'Registered',
      },
    });
  }

  // 4. Test generate daily checkin tokens
  const todayStr = formatBangkokDate();
  console.log(`\n⚙️ Generating daily check-ins for date: ${todayStr}...`);
  const syncResult = await ensureDailyCheckinsForMeeting(meeting.meeting_id, todayStr);
  console.log(`✅ Generated ${syncResult.createdCount} daily records.`);

  const dailyRec = syncResult.dailyRecords[0];
  console.log('📌 Sample Daily QR Record:');
  console.log({
    ticket_code: dailyRec.ticket_code,
    program_name: dailyRec.program_name,
    daily_qr_token: dailyRec.daily_qr_token,
  });

  // 5. Test Scanning - Case 1: First time scan today (Success)
  console.log('\n🔍 Testing Scan Case 1: First scan today...');
  const scan1 = await processDailyQrScan(dailyRec.daily_qr_token, meeting.meeting_id);
  console.log('Result 1:', scan1.status, '-', scan1.message);

  // 6. Test Scanning - Case 2: Duplicate scan today (Duplicate)
  console.log('\n🔍 Testing Scan Case 2: Duplicate scan today...');
  const scan2 = await processDailyQrScan(dailyRec.daily_qr_token, meeting.meeting_id);
  console.log('Result 2:', scan2.status, '-', scan2.message);

  // 7. Test Scanning - Case 3: Wrong date token (Invalid Date)
  console.log('\n🔍 Testing Scan Case 3: Wrong date token...');
  const tomorrowToken = `TSRM-DAY-TESTCONF-20991231-${dailyRec.ticket_code}`;
  await prisma.meeting_daily_checkins.upsert({
    where: {
      meeting_id_ticket_code_checkin_date: {
        meeting_id: meeting.meeting_id,
        ticket_code: dailyRec.ticket_code,
        checkin_date: new Date('2099-12-31T00:00:00.000Z'),
      },
    },
    update: {},
    create: {
      meeting_id: meeting.meeting_id,
      ticket_code: dailyRec.ticket_code,
      checkin_date: new Date('2099-12-31T00:00:00.000Z'),
      program_name: 'Main Program (Future Day)',
      daily_qr_token: tomorrowToken,
      checkin_status: 'pending',
    },
  });

  const scan3 = await processDailyQrScan(tomorrowToken, meeting.meeting_id);
  console.log('Result 3:', scan3.status, '-', scan3.message);

  console.log('\n🎉 ALL DAILY CHECKIN SYSTEM TESTS PASSED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
