const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Target Neon URL from CLI argument, or environment variable
const targetUrl = process.argv[2] || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON;

if (!targetUrl) {
  console.log(`
❌ กรุณาระบุ Connection URL ของ Neon:
   node scripts/sync-to-neon.js "postgresql://<USER>:<PASSWORD>@<NEON_HOST>/tsrm?sslmode=require"

หรือคัดลอกคำสั่งในไฟล์:
   db/neon_full_sync.sql
ไปวางและรันใน Neon Console -> SQL Editor ได้ทันที
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
  console.log('🚀 เริ่มต้นอัปเดตโครงสร้างและข้อมูลทั้งหมด: Local PostgreSQL -> Neon Cloud DB...\n');

  // STEP 0: Apply DDL to Neon
  console.log('🛠️ 0. ตรวจสอบและอัปเดต Schema บน Neon...');
  const ddlStatements = [
    `CREATE SEQUENCE IF NOT EXISTS member_no_seq START WITH 1281 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_date DATE`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_date DATE`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_time VARCHAR(100)`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location VARCHAR(500)`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(20) DEFAULT 'onsite'`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS staff_code VARCHAR(10)`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS pricing_tiers JSONB`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS activities JSONB`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 0`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming'`,
    `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(255)`,
    `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_email VARCHAR(255)`,
    `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_phone VARCHAR(50)`,
    `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS workplace VARCHAR(255)`,
    `ALTER TABLE meeting_attendances ALTER COLUMN member_no DROP NOT NULL`,
    `CREATE TABLE IF NOT EXISTS payment_slips (
        id                  BIGSERIAL PRIMARY KEY,
        slip_id             VARCHAR(50) UNIQUE DEFAULT gen_random_uuid()::text,
        meeting_id          VARCHAR(50) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
        member_no           VARCHAR(20) REFERENCES members(member_no) ON DELETE CASCADE,
        guest_name          VARCHAR(255),
        guest_email         VARCHAR(255),
        guest_phone         VARCHAR(50),
        guest_workplace     VARCHAR(255),
        is_member           BOOLEAN DEFAULT false,
        ticket_code         VARCHAR(50),
        amount              INTEGER DEFAULT 0,
        bank                VARCHAR(100),
        transfer_date       VARCHAR(50),
        transfer_time       VARCHAR(50),
        ref_no              VARCHAR(100),
        slip_url            VARCHAR(500) NOT NULL,
        status              VARCHAR(20) DEFAULT 'pending',
        rejection_reason    VARCHAR(500),
        resubmit_token      VARCHAR(100) UNIQUE,
        selected_activities JSONB,
        reviewed_by         VARCHAR(100),
        reviewed_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       TEXT NOT NULL,
        description VARCHAR(255),
        updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS receipts (
        id                      VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        receipt_no              VARCHAR(50) UNIQUE NOT NULL,
        receipt_date            VARCHAR(50) NOT NULL,
        purpose_text            VARCHAR(500) NOT NULL,
        payer_type              VARCHAR(20) DEFAULT 'individual',
        payer_name              VARCHAR(255) NOT NULL,
        branch_name             VARCHAR(255),
        payer_address_line1     VARCHAR(500),
        payer_address_line2     VARCHAR(500),
        payer_phone             VARCHAR(50),
        payer_tax_id            VARCHAR(50),
        items                   JSONB NOT NULL,
        total_amount            INTEGER DEFAULT 0,
        thai_baht_text_override VARCHAR(255),
        payer_signer_name       VARCHAR(255),
        payer_signer_role       VARCHAR(100) DEFAULT 'ผู้จ่ายเงิน',
        payer_signed_date       VARCHAR(50),
        authorized_signer_name  VARCHAR(255) NOT NULL,
        authorized_signer_role  VARCHAR(100),
        authorized_signed_date  VARCHAR(50),
        prepared_by_name        VARCHAR(255) NOT NULL,
        prepared_by_role        VARCHAR(100) DEFAULT 'ผู้จัดทำ',
        prepared_by_signed_date VARCHAR(50),
        association_name_th     VARCHAR(255),
        association_name_en     VARCHAR(255),
        association_address     VARCHAR(500),
        association_contact     VARCHAR(500),
        association_tax_id      VARCHAR(50),
        meeting_id              VARCHAR(50),
        attendee_id             VARCHAR(50),
        slip_id                 VARCHAR(50),
        status                  VARCHAR(20) DEFAULT 'issued',
        created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const stmt of ddlStatements) {
    try {
      await neonPrisma.$executeRawUnsafe(stmt);
    } catch (e) {
      console.warn('   DDL statement note:', e.message);
    }
  }
  console.log('   ✅ Schema บน Neon อัปเดตพร้อมแล้ว\n');

  // STEP 1: Fetch local data
  console.log('📥 1. อ่านข้อมูลจาก Local PostgreSQL...');
  const [localMembers, localEducations, localMeetings, localAttendances, localSlips, localSettings, localReceipts] = await Promise.all([
    localPrisma.member.findMany(),
    localPrisma.member_educations.findMany(),
    localPrisma.meetings.findMany(),
    localPrisma.meeting_attendances.findMany(),
    localPrisma.payment_slips.findMany(),
    localPrisma.system_settings.findMany(),
    localPrisma.receipts.findMany(),
  ]);

  console.log(`   - Members: ${localMembers.length}`);
  console.log(`   - Educations: ${localEducations.length}`);
  console.log(`   - Meetings: ${localMeetings.length}`);
  console.log(`   - Attendances: ${localAttendances.length}`);
  console.log(`   - Slips: ${localSlips.length}`);
  console.log(`   - System Settings: ${localSettings.length}`);
  console.log(`   - Receipts: ${localReceipts.length}\n`);

  // STEP 2: Meetings Sync
  console.log('📤 2. Syncing Meetings (ทุกคอลัมน์)...');
  for (const m of localMeetings) {
    await neonPrisma.meetings.upsert({
      where: { meeting_id: m.meeting_id },
      update: {
        meeting_name: m.meeting_name,
        meeting_date: m.meeting_date,
        start_date: m.start_date,
        end_date: m.end_date,
        counts_toward_active: m.counts_toward_active,
        meeting_time: m.meeting_time,
        location: m.location,
        meeting_type: m.meeting_type,
        staff_code: m.staff_code,
        description: m.description,
        base_price: m.base_price,
        pricing_tiers: m.pricing_tiers,
        activities: m.activities,
        max_seats: m.max_seats,
        status: m.status,
      },
      create: {
        meeting_id: m.meeting_id,
        meeting_name: m.meeting_name,
        meeting_date: m.meeting_date,
        start_date: m.start_date,
        end_date: m.end_date,
        counts_toward_active: m.counts_toward_active,
        meeting_time: m.meeting_time,
        location: m.location,
        meeting_type: m.meeting_type,
        staff_code: m.staff_code,
        description: m.description,
        base_price: m.base_price,
        pricing_tiers: m.pricing_tiers,
        activities: m.activities,
        max_seats: m.max_seats,
        status: m.status,
      },
    });
  }
  console.log('   ✅ Meetings sync completed.');

  // STEP 3: Members Sync
  console.log('   Syncing Members...');
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

  // STEP 4: Educations Sync
  console.log('   Syncing Member Educations...');
  for (let i = 0; i < localEducations.length; i += BATCH_SIZE) {
    const chunk = localEducations.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((e) =>
        neonPrisma.member_educations.upsert({
          where: { edu_id: e.edu_id },
          update: {
            member_no: e.member_no,
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

  // STEP 5: Attendances Sync
  console.log('   Syncing Meeting Attendances...');
  for (let i = 0; i < localAttendances.length; i += BATCH_SIZE) {
    const chunk = localAttendances.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((a) =>
        neonPrisma.meeting_attendances.upsert({
          where: { attendance_id: a.attendance_id },
          update: {
            attendee_name: a.attendee_name,
            attendee_email: a.attendee_email,
            attendee_phone: a.attendee_phone,
            workplace: a.workplace,
            attendance_status: a.attendance_status,
            checkin_time: a.checkin_time,
          },
          create: {
            attendance_id: a.attendance_id,
            meeting_id: a.meeting_id,
            member_no: a.member_no,
            attendee_name: a.attendee_name,
            attendee_email: a.attendee_email,
            attendee_phone: a.attendee_phone,
            workplace: a.workplace,
            attendance_status: a.attendance_status,
            checkin_time: a.checkin_time,
          },
        })
      )
    );
    process.stdout.write(`   Processed ${Math.min(i + BATCH_SIZE, localAttendances.length)} / ${localAttendances.length} attendances\r`);
  }
  console.log('\n   ✅ Meeting attendances sync completed.');

  // STEP 6: System Settings Sync
  console.log('   Syncing System Settings...');
  for (const s of localSettings) {
    await neonPrisma.system_settings.upsert({
      where: { key: s.key },
      update: {
        value: s.value,
        description: s.description,
        updated_at: s.updated_at,
      },
      create: {
        key: s.key,
        value: s.value,
        description: s.description,
        updated_at: s.updated_at,
      },
    });
  }
  console.log('   ✅ System Settings sync completed.');

  // STEP 7: Payment Slips Sync
  if (localSlips.length > 0) {
    console.log('   Syncing Payment Slips...');
    for (const p of localSlips) {
      await neonPrisma.payment_slips.upsert({
        where: { slip_id: p.slip_id },
        update: {
          status: p.status,
          amount: p.amount,
          rejection_reason: p.rejection_reason,
          reviewed_by: p.reviewed_by,
          reviewed_at: p.reviewed_at,
          updated_at: p.updated_at,
        },
        create: {
          id: p.id,
          slip_id: p.slip_id,
          meeting_id: p.meeting_id,
          member_no: p.member_no,
          guest_name: p.guest_name,
          guest_email: p.guest_email,
          guest_phone: p.guest_phone,
          guest_workplace: p.guest_workplace,
          is_member: p.is_member,
          ticket_code: p.ticket_code,
          amount: p.amount,
          bank: p.bank,
          transfer_date: p.transfer_date,
          transfer_time: p.transfer_time,
          ref_no: p.ref_no,
          slip_url: p.slip_url,
          status: p.status,
          rejection_reason: p.rejection_reason,
          resubmit_token: p.resubmit_token,
          selected_activities: p.selected_activities,
          reviewed_by: p.reviewed_by,
          reviewed_at: p.reviewed_at,
          created_at: p.created_at,
          updated_at: p.updated_at,
        },
      });
    }
    console.log('   ✅ Payment Slips sync completed.');
  }

  // STEP 7.5: Receipts Sync
  console.log('   Syncing Receipts...');
  await neonPrisma.receipts.deleteMany();
  for (const r of localReceipts) {
    await neonPrisma.receipts.create({
      data: {
        id: r.id,
        receipt_no: r.receipt_no,
        receipt_date: r.receipt_date,
        purpose_text: r.purpose_text,
        payer_type: r.payer_type,
        payer_name: r.payer_name,
        branch_name: r.branch_name,
        payer_address_line1: r.payer_address_line1,
        payer_address_line2: r.payer_address_line2,
        payer_phone: r.payer_phone,
        payer_tax_id: r.payer_tax_id,
        items: r.items,
        total_amount: r.total_amount,
        thai_baht_text_override: r.thai_baht_text_override,
        payer_signer_name: r.payer_signer_name,
        payer_signer_role: r.payer_signer_role,
        payer_signed_date: r.payer_signed_date,
        authorized_signer_name: r.authorized_signer_name,
        authorized_signer_role: r.authorized_signer_role,
        authorized_signed_date: r.authorized_signed_date,
        prepared_by_name: r.prepared_by_name,
        prepared_by_role: r.prepared_by_role,
        prepared_by_signed_date: r.prepared_by_signed_date,
        association_name_th: r.association_name_th,
        association_name_en: r.association_name_en,
        association_address: r.association_address,
        association_contact: r.association_contact,
        association_tax_id: r.association_tax_id,
        meeting_id: r.meeting_id,
        attendee_id: r.attendee_id,
        slip_id: r.slip_id,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
    });
  }
  console.log('   ✅ Receipts sync completed.');

  // STEP 8: Reset Sequences on Neon
  const seqQueries = [
    `SELECT setval('member_no_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(member_no, '\\D', '', 'g'), '')::bigint) FROM members), 0) + 1, 1281), false)`,
    `SELECT setval('members_id_seq', COALESCE((SELECT MAX(id) FROM members), 1), true)`,
    `SELECT setval('member_educations_edu_id_seq', COALESCE((SELECT MAX(edu_id) FROM member_educations), 1), true)`,
    `SELECT setval('meeting_attendances_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM meeting_attendances), 1), true)`,
    `SELECT setval('payment_slips_id_seq', COALESCE((SELECT MAX(id) FROM payment_slips), 1), true)`,
  ];
  for (const q of seqQueries) {
    try {
      await neonPrisma.$executeRawUnsafe(q);
    } catch (e) {
      console.warn('   ⚠️ Sequence update note:', e.message);
    }
  }
  console.log('   ✅ Sequences updated successfully.');

  // STEP 9: Summary
  console.log('\n🔍 5. ตรวจสอบจำนวนข้อมูลบน Neon Cloud DB...');
  const [neonMembers, neonEducations, neonMeetings, neonAttendances, neonSettings, neonReceipts] = await Promise.all([
    neonPrisma.member.count(),
    neonPrisma.member_educations.count(),
    neonPrisma.meetings.count(),
    neonPrisma.meeting_attendances.count(),
    neonPrisma.system_settings.count(),
    neonPrisma.receipts.count(),
  ]);

  console.log(`
======================================================
🎉 ซิงค์ข้อมูลเข้าสู่ NEON เสร็จสมบูรณ์ทุกตารางแล้ว!
======================================================
  - สมาชิก (Members):             ${neonMembers} รายการ (Local: ${localMembers.length})
  - ประวัติการศึกษา (Educations):  ${neonEducations} รายการ (Local: ${localEducations.length})
  - การประชุม (Meetings):         ${neonMeetings} รายการ (Local: ${localMeetings.length})
  - ผู้เข้าร่วม (Attendances):     ${neonAttendances} รายการ (Local: ${localAttendances.length})
  - การตั้งค่าระบบ (Settings):     ${neonSettings} รายการ (Local: ${localSettings.length})
  - ใบเสร็จรับเงิน (Receipts):     ${neonReceipts} รายการ (Local: ${localReceipts.length})
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
