import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking test member 0000...');

  const memberData = {
    member_no: '0000',
    fullNameTh: 'บัญชีทดสอบ ระบบ',
    fullNameEn: 'Test Account',
    idLast4: '0000',
    mobile: '0800000000',
    email: 'test0000@tsrm.com',
    lineId: 'test0000',
    address: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย อาคารเฉลิมพระบารมี ๕๐ ปี ซ.ศูนย์วิจัย ถ.เพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
    workplace: 'โรงพยาบาลทดสอบ (Test Hospital)',
    work_phone: '020000000',
    work_start_date: new Date('2020-01-01'),
    position: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
    job_category: 'RM',
    scientist_license_no: 'TEST-0000',
    membership_status: 'Inactive',
    membership_type: 'Regular',
    applied_at: new Date(),
    expire_date: new Date('2020-12-31'),
    special_expire_date: null,
  };

  const existing = await prisma.member.findUnique({
    where: { member_no: '0000' },
  });

  if (existing) {
    console.log('Found existing member 0000, updating...');
    const updated = await prisma.member.update({
      where: { member_no: '0000' },
      data: memberData,
    });
    console.log('✅ Updated test member 0000:', {
      member_no: updated.member_no,
      fullNameTh: updated.fullNameTh,
      fullNameEn: updated.fullNameEn,
      email: updated.email,
      membership_status: updated.membership_status,
      expire_date: updated.expire_date,
    });
  } else {
    console.log('Creating new test member 0000...');
    const created = await prisma.member.create({
      data: memberData,
    });
    console.log('✅ Created test member 0000:', {
      member_no: created.member_no,
      fullNameTh: created.fullNameTh,
      fullNameEn: created.fullNameEn,
      email: created.email,
      membership_status: created.membership_status,
      expire_date: created.expire_date,
    });
  }

  // Also check if education exists, if not add a sample education
  const eduCount = await prisma.member_educations.count({
    where: { member_no: '0000' },
  });

  if (eduCount === 0) {
    await prisma.member_educations.create({
      data: {
        member_no: '0000',
        degree: 'แพทยศาสตรบัณฑิต (พบ.)',
        institution: 'มหาวิทยาลัยแพทยศาสตร์ทดสอบ',
        graduation_year: '2560',
      },
    });
    console.log('✅ Added education record for 0000');
  }

  // Check meeting attendance record for sample
  const meetingCount = await prisma.meetings.count();
  if (meetingCount > 0) {
    const latestMeeting = await prisma.meetings.findFirst({
      orderBy: { meeting_date: 'desc' },
    });
    if (latestMeeting) {
      const attendanceExists = await prisma.meeting_attendances.findFirst({
        where: {
          meeting_id: latestMeeting.meeting_id,
          member_no: '0000',
        },
      });
      if (!attendanceExists) {
        await prisma.meeting_attendances.create({
          data: {
            meeting_id: latestMeeting.meeting_id,
            member_no: '0000',
            attendance_status: 'Attended',
            checkin_time: new Date(),
          },
        });
        console.log(`✅ Linked test member 0000 to meeting ${latestMeeting.meeting_id}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error creating test member:', e);
  await prisma.$disconnect();
  process.exit(1);
});
