const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function escapeSqlString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportData() {
  console.log('📦 Starting full database export from Local PostgreSQL for Neon...');

  const [members, educations, meetings, attendances, paymentSlips, systemSettings, receipts] = await Promise.all([
    prisma.member.findMany({ orderBy: { member_no: 'asc' } }),
    prisma.member_educations.findMany({ orderBy: { edu_id: 'asc' } }),
    prisma.meetings.findMany({ orderBy: { meeting_id: 'asc' } }),
    prisma.meeting_attendances.findMany({ orderBy: { attendance_id: 'asc' } }),
    prisma.payment_slips.findMany({ orderBy: { id: 'asc' } }),
    prisma.system_settings.findMany({ orderBy: { key: 'asc' } }),
    prisma.receipts.findMany({ orderBy: { receipt_no: 'asc' } }),
  ]);

  console.log(`Found in Local DB:
  - Members: ${members.length}
  - Educations: ${educations.length}
  - Meetings: ${meetings.length}
  - Attendances: ${attendances.length}
  - Payment Slips: ${paymentSlips.length}
  - System Settings: ${systemSettings.length}
  - Receipts: ${receipts.length}
  `);

  let sql = `-- ==========================================================\n`;
  sql += `-- TSRM FULL DATABASE MIGRATION & SYNC FOR NEON POSTGRESQL\n`;
  sql += `-- Generated at: ${new Date().toISOString()}\n`;
  sql += `-- ==========================================================\n\n`;

  // ------------------------------------------------------------
  // STEP 0: DDL Schema Alterations & Table Creations (Safe & Idempotent)
  // ------------------------------------------------------------
  sql += `-- 0. Ensure Schema & Columns exist on Neon\n`;
  sql += `CREATE SEQUENCE IF NOT EXISTS member_no_seq START WITH 1281 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;\n\n`;

  // meetings schema
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_date DATE;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_date DATE;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_time VARCHAR(100);\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location VARCHAR(500);\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(20) DEFAULT 'onsite';\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS staff_code VARCHAR(10);\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS base_price INTEGER DEFAULT 0;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS pricing_tiers JSONB;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS activities JSONB;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 0;\n`;
  sql += `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming';\n\n`;

  // meeting_attendances schema
  sql += `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(255);\n`;
  sql += `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_email VARCHAR(255);\n`;
  sql += `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS attendee_phone VARCHAR(50);\n`;
  sql += `ALTER TABLE meeting_attendances ADD COLUMN IF NOT EXISTS workplace VARCHAR(255);\n\n`;

  // payment_slips schema
  sql += `CREATE TABLE IF NOT EXISTS payment_slips (
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
);\n\n`;

  // system_settings schema
  sql += `CREATE TABLE IF NOT EXISTS system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description VARCHAR(255),
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);\n\n`;

  // receipts schema
  sql += `CREATE TABLE IF NOT EXISTS receipts (
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
);\n\n`;

  sql += `BEGIN;\n\n`;

  // 1. meetings (all columns)
  sql += `-- 1. Table: meetings (${meetings.length} rows)\n`;
  for (const m of meetings) {
    const cols = [
      'meeting_id', 'meeting_name', 'meeting_date', 'start_date', 'end_date',
      'counts_toward_active', 'meeting_time', 'location', 'meeting_type', 'staff_code',
      'description', 'base_price', 'pricing_tiers', 'activities', 'max_seats', 'status'
    ];
    const vals = [
      escapeSqlString(m.meeting_id),
      escapeSqlString(m.meeting_name),
      escapeSqlString(m.meeting_date),
      escapeSqlString(m.start_date),
      escapeSqlString(m.end_date),
      m.counts_toward_active ? 'TRUE' : 'FALSE',
      escapeSqlString(m.meeting_time),
      escapeSqlString(m.location),
      escapeSqlString(m.meeting_type),
      escapeSqlString(m.staff_code),
      escapeSqlString(m.description),
      m.base_price ?? 0,
      escapeSqlString(m.pricing_tiers),
      escapeSqlString(m.activities),
      m.max_seats ?? 0,
      escapeSqlString(m.status || 'upcoming'),
    ];

    sql += `INSERT INTO meetings (${cols.join(', ')}) VALUES (${vals.join(', ')})
ON CONFLICT (meeting_id) DO UPDATE SET
  meeting_name = EXCLUDED.meeting_name,
  meeting_date = EXCLUDED.meeting_date,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  counts_toward_active = EXCLUDED.counts_toward_active,
  meeting_time = EXCLUDED.meeting_time,
  location = EXCLUDED.location,
  meeting_type = EXCLUDED.meeting_type,
  staff_code = EXCLUDED.staff_code,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  pricing_tiers = EXCLUDED.pricing_tiers,
  activities = EXCLUDED.activities,
  max_seats = EXCLUDED.max_seats,
  status = EXCLUDED.status;\n`;
  }
  sql += `\n`;

  // 2. members
  sql += `-- 2. Table: members (${members.length} rows)\n`;
  for (const m of members) {
    const cols = [
      'id', 'member_no', 'full_name_th', 'full_name_en', 'id_last4', 'mobile',
      'email', 'line_id', 'address', 'workplace', 'work_phone', 'work_start_date',
      'position', 'job_category', 'job_category_other', 'scientist_license_no',
      'username', 'password_hash', 'referees', 'photo_url', 'id_card_doc',
      'degree_cert_doc', 'work_cert_doc', 'membership_status', 'membership_type',
      'applied_at', 'expire_date', 'special_expire_date', 'qr_code_data', 'qr_code_image_url'
    ];
    const vals = [
      m.id.toString(),
      escapeSqlString(m.member_no),
      escapeSqlString(m.fullNameTh),
      escapeSqlString(m.fullNameEn),
      escapeSqlString(m.idLast4),
      escapeSqlString(m.mobile),
      escapeSqlString(m.email),
      escapeSqlString(m.lineId),
      escapeSqlString(m.address),
      escapeSqlString(m.workplace),
      escapeSqlString(m.work_phone),
      escapeSqlString(m.work_start_date),
      escapeSqlString(m.position),
      escapeSqlString(m.job_category),
      escapeSqlString(m.job_category_other),
      escapeSqlString(m.scientist_license_no),
      escapeSqlString(m.username),
      escapeSqlString(m.password_hash),
      escapeSqlString(m.referees),
      escapeSqlString(m.photo_url),
      escapeSqlString(m.id_card_doc),
      escapeSqlString(m.degree_cert_doc),
      escapeSqlString(m.work_cert_doc),
      escapeSqlString(m.membership_status),
      escapeSqlString(m.membership_type),
      escapeSqlString(m.applied_at),
      escapeSqlString(m.expire_date),
      escapeSqlString(m.special_expire_date),
      escapeSqlString(m.qr_code_data),
      escapeSqlString(m.qr_code_image_url)
    ];

    sql += `INSERT INTO members (${cols.join(', ')}) VALUES (${vals.join(', ')})
ON CONFLICT (member_no) DO UPDATE SET
  full_name_th = EXCLUDED.full_name_th,
  full_name_en = EXCLUDED.full_name_en,
  id_last4 = EXCLUDED.id_last4,
  mobile = EXCLUDED.mobile,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  address = EXCLUDED.address,
  workplace = EXCLUDED.workplace,
  work_phone = EXCLUDED.work_phone,
  work_start_date = EXCLUDED.work_start_date,
  position = EXCLUDED.position,
  job_category = EXCLUDED.job_category,
  job_category_other = EXCLUDED.job_category_other,
  scientist_license_no = EXCLUDED.scientist_license_no,
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  referees = EXCLUDED.referees,
  photo_url = EXCLUDED.photo_url,
  id_card_doc = EXCLUDED.id_card_doc,
  degree_cert_doc = EXCLUDED.degree_cert_doc,
  work_cert_doc = EXCLUDED.work_cert_doc,
  membership_status = EXCLUDED.membership_status,
  membership_type = EXCLUDED.membership_type,
  applied_at = EXCLUDED.applied_at,
  expire_date = EXCLUDED.expire_date,
  special_expire_date = EXCLUDED.special_expire_date,
  qr_code_data = EXCLUDED.qr_code_data,
  qr_code_image_url = EXCLUDED.qr_code_image_url;\n`;
  }
  sql += `\n`;

  // 3. member_educations
  sql += `-- 3. Table: member_educations (${educations.length} rows)\n`;
  for (const e of educations) {
    sql += `INSERT INTO member_educations (edu_id, member_no, degree, institution, graduation_year) VALUES (${e.edu_id}, ${escapeSqlString(e.member_no)}, ${escapeSqlString(e.degree)}, ${escapeSqlString(e.institution)}, ${escapeSqlString(e.graduation_year)})
ON CONFLICT (edu_id) DO UPDATE SET
  member_no = EXCLUDED.member_no,
  degree = EXCLUDED.degree,
  institution = EXCLUDED.institution,
  graduation_year = EXCLUDED.graduation_year;\n`;
  }
  sql += `\n`;

  // 4. meeting_attendances
  sql += `-- 4. Table: meeting_attendances (${attendances.length} rows)\n`;
  for (const a of attendances) {
    const cols = ['attendance_id', 'meeting_id', 'member_no', 'attendee_name', 'attendee_email', 'attendee_phone', 'workplace', 'attendance_status', 'checkin_time'];
    const vals = [
      a.attendance_id.toString(),
      escapeSqlString(a.meeting_id),
      escapeSqlString(a.member_no),
      escapeSqlString(a.attendee_name),
      escapeSqlString(a.attendee_email),
      escapeSqlString(a.attendee_phone),
      escapeSqlString(a.workplace),
      escapeSqlString(a.attendance_status),
      escapeSqlString(a.checkin_time)
    ];
    sql += `INSERT INTO meeting_attendances (${cols.join(', ')}) VALUES (${vals.join(', ')})
ON CONFLICT (meeting_id, member_no) DO UPDATE SET
  attendee_name = EXCLUDED.attendee_name,
  attendee_email = EXCLUDED.attendee_email,
  attendee_phone = EXCLUDED.attendee_phone,
  workplace = EXCLUDED.workplace,
  attendance_status = EXCLUDED.attendance_status,
  checkin_time = EXCLUDED.checkin_time;\n`;
  }
  sql += `\n`;

  // 5. system_settings
  sql += `-- 5. Table: system_settings (${systemSettings.length} rows)\n`;
  for (const s of systemSettings) {
    sql += `INSERT INTO system_settings (key, value, description, updated_at) VALUES (${escapeSqlString(s.key)}, ${escapeSqlString(s.value)}, ${escapeSqlString(s.description)}, ${escapeSqlString(s.updated_at)})
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;\n`;
  }
  sql += `\n`;

  // 6. payment_slips
  if (paymentSlips.length > 0) {
    sql += `-- 6. Table: payment_slips (${paymentSlips.length} rows)\n`;
    for (const p of paymentSlips) {
      const cols = [
        'id', 'slip_id', 'meeting_id', 'member_no', 'guest_name', 'guest_email', 'guest_phone',
        'guest_workplace', 'is_member', 'ticket_code', 'amount', 'bank', 'transfer_date',
        'transfer_time', 'ref_no', 'slip_url', 'status', 'rejection_reason', 'resubmit_token',
        'selected_activities', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
      ];
      const vals = [
        p.id.toString(),
        escapeSqlString(p.slip_id),
        escapeSqlString(p.meeting_id),
        escapeSqlString(p.member_no),
        escapeSqlString(p.guest_name),
        escapeSqlString(p.guest_email),
        escapeSqlString(p.guest_phone),
        escapeSqlString(p.guest_workplace),
        p.is_member ? 'TRUE' : 'FALSE',
        escapeSqlString(p.ticket_code),
        p.amount,
        escapeSqlString(p.bank),
        escapeSqlString(p.transfer_date),
        escapeSqlString(p.transfer_time),
        escapeSqlString(p.ref_no),
        escapeSqlString(p.slip_url),
        escapeSqlString(p.status),
        escapeSqlString(p.rejection_reason),
        escapeSqlString(p.resubmit_token),
        escapeSqlString(p.selected_activities),
        escapeSqlString(p.reviewed_by),
        escapeSqlString(p.reviewed_at),
        escapeSqlString(p.created_at),
        escapeSqlString(p.updated_at),
      ];
      sql += `INSERT INTO payment_slips (${cols.join(', ')}) VALUES (${vals.join(', ')})
ON CONFLICT (slip_id) DO UPDATE SET
  status = EXCLUDED.status,
  amount = EXCLUDED.amount,
  rejection_reason = EXCLUDED.rejection_reason,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  updated_at = EXCLUDED.updated_at;\n`;
    }
    sql += `\n`;
  }

  // 7. receipts
  if (receipts.length > 0) {
    sql += `-- 7. Table: receipts (${receipts.length} rows)\n`;
    for (const r of receipts) {
      sql += `INSERT INTO receipts (id, receipt_no, receipt_date, purpose_text, payer_type, payer_name, branch_name, payer_address_line1, payer_address_line2, payer_phone, payer_tax_id, items, total_amount, thai_baht_text_override, payer_signer_name, payer_signer_role, payer_signed_date, authorized_signer_name, authorized_signer_role, authorized_signed_date, prepared_by_name, prepared_by_role, prepared_by_signed_date, association_name_th, association_name_en, association_address, association_contact, association_tax_id, meeting_id, attendee_id, slip_id, status, created_at, updated_at)
VALUES (${escapeSqlString(r.id)}, ${escapeSqlString(r.receipt_no)}, ${escapeSqlString(r.receipt_date)}, ${escapeSqlString(r.purpose_text)}, ${escapeSqlString(r.payer_type)}, ${escapeSqlString(r.payer_name)}, ${escapeSqlString(r.branch_name)}, ${escapeSqlString(r.payer_address_line1)}, ${escapeSqlString(r.payer_address_line2)}, ${escapeSqlString(r.payer_phone)}, ${escapeSqlString(r.payer_tax_id)}, ${escapeSqlString(r.items)}, ${r.total_amount}, ${escapeSqlString(r.thai_baht_text_override)}, ${escapeSqlString(r.payer_signer_name)}, ${escapeSqlString(r.payer_signer_role)}, ${escapeSqlString(r.payer_signed_date)}, ${escapeSqlString(r.authorized_signer_name)}, ${escapeSqlString(r.authorized_signer_role)}, ${escapeSqlString(r.authorized_signed_date)}, ${escapeSqlString(r.prepared_by_name)}, ${escapeSqlString(r.prepared_by_role)}, ${escapeSqlString(r.prepared_by_signed_date)}, ${escapeSqlString(r.association_name_th)}, ${escapeSqlString(r.association_name_en)}, ${escapeSqlString(r.association_address)}, ${escapeSqlString(r.association_contact)}, ${escapeSqlString(r.association_tax_id)}, ${escapeSqlString(r.meeting_id)}, ${escapeSqlString(r.attendee_id)}, ${escapeSqlString(r.slip_id)}, ${escapeSqlString(r.status)}, ${escapeSqlString(r.created_at)}, ${escapeSqlString(r.updated_at)})
ON CONFLICT (receipt_no) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;\n`;
    }
    sql += `\n`;
  }

  // Sequences update
  sql += `-- 8. Update Sequences\n`;
  sql += `SELECT setval('member_no_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(member_no, '\\D', '', 'g'), '')::bigint) FROM members), 0) + 1, 1281), false);\n`;
  sql += `SELECT setval('members_id_seq', COALESCE((SELECT MAX(id) FROM members), 1), true);\n`;
  sql += `SELECT setval('member_educations_edu_id_seq', COALESCE((SELECT MAX(edu_id) FROM member_educations), 1), true);\n`;
  sql += `SELECT setval('meeting_attendances_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM meeting_attendances), 1), true);\n`;
  sql += `SELECT setval('payment_slips_id_seq', COALESCE((SELECT MAX(id) FROM payment_slips), 1), true);\n\n`;

  sql += `COMMIT;\n`;

  const outputPath = path.join(__dirname, '..', 'db', 'neon_full_sync.sql');
  fs.writeFileSync(outputPath, sql, 'utf-8');
  const sizeMb = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Export completed successfully! Saved to:`);
  console.log(`   ${outputPath} (${sizeMb} MB)`);
}

exportData().catch(console.error).finally(() => prisma.$disconnect());
