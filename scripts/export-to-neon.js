const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function escapeSqlString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportData() {
  console.log('📦 Starting data export from Local PostgreSQL...');

  const [members, educations, meetings, attendances] = await Promise.all([
    prisma.member.findMany({ orderBy: { member_no: 'asc' } }),
    prisma.member_educations.findMany({ orderBy: { edu_id: 'asc' } }),
    prisma.meetings.findMany({ orderBy: { meeting_id: 'asc' } }),
    prisma.meeting_attendances.findMany({ orderBy: { attendance_id: 'asc' } }),
  ]);

  console.log(`Found:
  - Members: ${members.length}
  - Educations: ${educations.length}
  - Meetings: ${meetings.length}
  - Attendances: ${attendances.length}
  `);

  let sql = `-- ==========================================================\n`;
  sql += `-- THAISRM DATA EXPORT FOR NEON POSTGRESQL\n`;
  sql += `-- Generated at: ${new Date().toISOString()}\n`;
  sql += `-- ==========================================================\n\n`;
  sql += `BEGIN;\n\n`;

  // 1. meetings
  sql += `-- 1. Table: meetings (${meetings.length} rows)\n`;
  for (const m of meetings) {
    sql += `INSERT INTO meetings (meeting_id, meeting_name, meeting_date, counts_toward_active) VALUES (${escapeSqlString(m.meeting_id)}, ${escapeSqlString(m.meeting_name)}, ${escapeSqlString(m.meeting_date)}, ${m.counts_toward_active ? 'TRUE' : 'FALSE'}) ON CONFLICT (meeting_id) DO UPDATE SET meeting_name = EXCLUDED.meeting_name, meeting_date = EXCLUDED.meeting_date, counts_toward_active = EXCLUDED.counts_toward_active;\n`;
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
      m.qr_code_data ? `'${JSON.stringify(m.qr_code_data).replace(/'/g, "''")}'::jsonb` : 'NULL',
      escapeSqlString(m.qr_code_image_url)
    ];

    sql += `INSERT INTO members (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (member_no) DO UPDATE SET full_name_th = EXCLUDED.full_name_th, full_name_en = EXCLUDED.full_name_en, workplace = EXCLUDED.workplace, position = EXCLUDED.position, membership_status = EXCLUDED.membership_status, membership_type = EXCLUDED.membership_type, email = EXCLUDED.email, mobile = EXCLUDED.mobile;\n`;
  }
  sql += `\n`;

  // 3. member_educations
  sql += `-- 3. Table: member_educations (${educations.length} rows)\n`;
  for (const e of educations) {
    sql += `INSERT INTO member_educations (edu_id, member_no, degree, institution, graduation_year) VALUES (${e.edu_id}, ${escapeSqlString(e.member_no)}, ${escapeSqlString(e.degree)}, ${escapeSqlString(e.institution)}, ${escapeSqlString(e.graduation_year)}) ON CONFLICT (edu_id) DO UPDATE SET degree = EXCLUDED.degree, institution = EXCLUDED.institution, graduation_year = EXCLUDED.graduation_year;\n`;
  }
  sql += `\n`;

  // 4. meeting_attendances
  sql += `-- 4. Table: meeting_attendances (${attendances.length} rows)\n`;
  for (const a of attendances) {
    sql += `INSERT INTO meeting_attendances (attendance_id, meeting_id, member_no, attendance_status, checkin_time) VALUES (${a.attendance_id}, ${escapeSqlString(a.meeting_id)}, ${escapeSqlString(a.member_no)}, ${escapeSqlString(a.attendance_status)}, ${escapeSqlString(a.checkin_time)}) ON CONFLICT (meeting_id, member_no) DO UPDATE SET attendance_status = EXCLUDED.attendance_status, checkin_time = EXCLUDED.checkin_time;\n`;
  }
  sql += `\n`;

  // Sequence sync
  sql += `-- 5. Update Sequences\n`;
  sql += `SELECT setval('member_no_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(member_no, '\\D', '', 'g'), '')::bigint) FROM members), 0) + 1, 1281), false);\n`;
  sql += `SELECT setval('members_id_seq', COALESCE((SELECT MAX(id) FROM members), 1), true);\n`;
  sql += `SELECT setval('member_educations_edu_id_seq', COALESCE((SELECT MAX(edu_id) FROM member_educations), 1), true);\n`;
  sql += `SELECT setval('meeting_attendances_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM meeting_attendances), 1), true);\n\n`;

  sql += `COMMIT;\n`;

  const outputPath = path.join(__dirname, '..', 'db', 'neon_export_data.sql');
  fs.writeFileSync(outputPath, sql, 'utf-8');
  console.log(`✅ Exported to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

exportData().catch(console.error).finally(() => prisma.$disconnect());
