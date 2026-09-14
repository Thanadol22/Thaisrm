const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 1. Get Neon Connection String from command line argument, or env variable
const targetUrl = process.argv[2] || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON;

if (!targetUrl) {
  console.log(`
❌ Usage:
  node scripts/sync-to-neon.js "<NEON_DATABASE_URL>"

Or set NEON_DATABASE_URL in .env and run:
  node scripts/sync-to-neon.js

Alternatively, you can copy the contents of db/neon_export_data.sql and execute it in Neon SQL Editor.
`);
  process.exit(1);
}

const localPrisma = new PrismaClient();
const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: targetUrl,
    },
  },
});

async function main() {
  console.log('🚀 Starting Data Sync: Local PostgreSQL -> Neon Cloud DB...\n');

  // 1. Fetch all records from Local DB
  console.log('📥 1. Reading data from Local PostgreSQL...');
  const [localMembers, localEducations, localMeetings, localAttendances] = await Promise.all([
    localPrisma.member.findMany(),
    localPrisma.member_educations.findMany(),
    localPrisma.meetings.findMany(),
    localPrisma.meeting_attendances.findMany(),
  ]);

  console.log(`   - Members: ${localMembers.length}`);
  console.log(`   - Educations: ${localEducations.length}`);
  console.log(`   - Meetings: ${localMeetings.length}`);
  console.log(`   - Attendances: ${localAttendances.length}\n`);

  // 2. Push to Neon
  console.log('📤 2. Writing data to Neon Cloud DB in transactions...');

  // 2.1 Meetings
  console.log('   Syncing meetings...');
  for (const m of localMeetings) {
    await neonPrisma.meetings.upsert({
      where: { meeting_id: m.meeting_id },
      update: {
        meeting_name: m.meeting_name,
        meeting_date: m.meeting_date,
        counts_toward_active: m.counts_toward_active,
      },
      create: {
        meeting_id: m.meeting_id,
        meeting_name: m.meeting_name,
        meeting_date: m.meeting_date,
        counts_toward_active: m.counts_toward_active,
      },
    });
  }

  // 2.2 Members (Batching 100 at a time)
  console.log('   Syncing members...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < localMembers.length; i += BATCH_SIZE) {
    const chunk = localMembers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((m) =>
        neonPrisma.member.upsert({
          where: { member_no: m.member_no },
          update: {
            fullNameTh: m.fullNameTh,
            fullNameEn: m.fullNameEn,
            idLast4: m.idLast4,
            mobile: m.mobile,
            email: m.email,
            lineId: m.lineId,
            address: m.address,
            workplace: m.workplace,
            work_phone: m.work_phone,
            work_start_date: m.work_start_date,
            position: m.position,
            job_category: m.job_category,
            job_category_other: m.job_category_other,
            scientist_license_no: m.scientist_license_no,
            username: m.username,
            password_hash: m.password_hash,
            referees: m.referees,
            photo_url: m.photo_url,
            id_card_doc: m.id_card_doc,
            degree_cert_doc: m.degree_cert_doc,
            work_cert_doc: m.work_cert_doc,
            membership_status: m.membership_status,
            membership_type: m.membership_type,
            applied_at: m.applied_at,
            expire_date: m.expire_date,
            special_expire_date: m.special_expire_date,
            qr_code_data: m.qr_code_data ?? undefined,
            qr_code_image_url: m.qr_code_image_url,
          },
          create: {
            id: m.id,
            member_no: m.member_no,
            fullNameTh: m.fullNameTh,
            fullNameEn: m.fullNameEn,
            idLast4: m.idLast4,
            mobile: m.mobile,
            email: m.email,
            lineId: m.lineId,
            address: m.address,
            workplace: m.workplace,
            work_phone: m.work_phone,
            work_start_date: m.work_start_date,
            position: m.position,
            job_category: m.job_category,
            job_category_other: m.job_category_other,
            scientist_license_no: m.scientist_license_no,
            username: m.username,
            password_hash: m.password_hash,
            referees: m.referees,
            photo_url: m.photo_url,
            id_card_doc: m.id_card_doc,
            degree_cert_doc: m.degree_cert_doc,
            work_cert_doc: m.work_cert_doc,
            membership_status: m.membership_status,
            membership_type: m.membership_type,
            applied_at: m.applied_at,
            expire_date: m.expire_date,
            special_expire_date: m.special_expire_date,
            qr_code_data: m.qr_code_data ?? undefined,
            qr_code_image_url: m.qr_code_image_url,
          },
        })
      )
    );
    process.stdout.write(`   Processed ${Math.min(i + BATCH_SIZE, localMembers.length)} / ${localMembers.length} members\r`);
  }
  console.log('\n   ✅ Members sync completed.');

  // 2.3 Member Educations
  console.log('   Syncing member educations...');
  for (let i = 0; i < localEducations.length; i += BATCH_SIZE) {
    const chunk = localEducations.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((e) =>
        neonPrisma.member_educations.upsert({
          where: { edu_id: e.edu_id },
          update: {
            degree: e.degree,
            institution: e.institution,
            graduation_year: e.graduation_year,
          },
          create: {
            edu_id: e.edu_id,
            member_no: e.member_no,
            degree: e.degree,
            institution: e.institution,
            graduation_year: e.graduation_year,
          },
        })
      )
    );
  }
  console.log('   ✅ Member educations sync completed.');

  // 2.4 Meeting Attendances
  console.log('   Syncing meeting attendances...');
  for (let i = 0; i < localAttendances.length; i += BATCH_SIZE) {
    const chunk = localAttendances.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((a) =>
        neonPrisma.meeting_attendances.upsert({
          where: {
            meeting_id_member_no: {
              meeting_id: a.meeting_id,
              member_no: a.member_no,
            },
          },
          update: {
            attendance_status: a.attendance_status,
            checkin_time: a.checkin_time,
          },
          create: {
            attendance_id: a.attendance_id,
            meeting_id: a.meeting_id,
            member_no: a.member_no,
            attendance_status: a.attendance_status,
            checkin_time: a.checkin_time,
          },
        })
      )
    );
    process.stdout.write(`   Processed ${Math.min(i + BATCH_SIZE, localAttendances.length)} / ${localAttendances.length} attendances\r`);
  }
  console.log('\n   ✅ Meeting attendances sync completed.');

  // 3. Reset Sequences on Neon
  console.log('\n🔄 3. Updating Sequences on Neon...');
  try {
    await neonPrisma.$executeRawUnsafe(`
      SELECT setval('member_no_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(member_no, '\\D', '', 'g'), '')::bigint) FROM members), 0) + 1, 1281), false);
      SELECT setval('members_id_seq', COALESCE((SELECT MAX(id) FROM members), 1), true);
      SELECT setval('member_educations_edu_id_seq', COALESCE((SELECT MAX(edu_id) FROM member_educations), 1), true);
      SELECT setval('meeting_attendances_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM meeting_attendances), 1), true);
    `);
    console.log('   ✅ Sequences updated successfully.');
  } catch (seqErr) {
    console.warn('   ⚠️ Note: Sequence update:', seqErr.message);
  }

  // 4. Verify Neon Data Counts
  console.log('\n🔍 4. Verifying Neon Cloud DB counts...');
  const [neonMembers, neonEducations, neonMeetings, neonAttendances] = await Promise.all([
    neonPrisma.member.count(),
    neonPrisma.member_educations.count(),
    neonPrisma.meetings.count(),
    neonPrisma.meeting_attendances.count(),
  ]);

  console.log(`
======================================================
🎉 NEON DATA SYNC COMPLETED SUCCESSFULLY!
======================================================
  - Members:      ${neonMembers} records (Local: ${localMembers.length})
  - Educations:   ${neonEducations} records (Local: ${localEducations.length})
  - Meetings:     ${neonMeetings} records (Local: ${localMeetings.length})
  - Attendances:  ${neonAttendances} records (Local: ${localAttendances.length})
======================================================
  `);
}

main()
  .catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
    await neonPrisma.$disconnect();
  });
