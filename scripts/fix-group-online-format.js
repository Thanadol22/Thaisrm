/**
 * ตรวจ/แก้รูปแบบการเข้าร่วมของผู้ลงทะเบียนแบบกลุ่ม ที่ลง Main + Workshop onsite
 * ซึ่งก่อนแก้บั๊ก (commit 44ca3f7) ระบบบังคับให้เป็น onsite ทั้งหมด เลือกออนไลน์ไม่ได้
 *
 * ระบบไม่ได้บันทึกว่าผู้ลงทะเบียน "ตั้งใจ" เลือกออนไลน์ จึงทำได้แค่หา "ผู้ที่อาจได้รับผลกระทบ"
 * แล้วให้ผู้ดูแลยืนยันกับบริษัทก่อนสั่งแก้เป็นรายคน
 *
 * ตรวจ (อ่านอย่างเดียว):
 *   node scripts/fix-group-online-format.js --url "<DATABASE_URL>" [--meeting TSRM34]
 * แก้เป็นออนไลน์ (ระบุ slipId:ลำดับผู้เข้าร่วม คั่นด้วย ,) — ต้องใส่ --confirm ถึงจะบันทึกจริง:
 *   node scripts/fix-group-online-format.js --url "<DATABASE_URL>" --apply SLIP-GRP-XXXX:0,SLIP-GRP-XXXX:2 [--confirm]
 */
const { PrismaClient } = require('@prisma/client');

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const url = argOf('--url') || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const meetingFilter = argOf('--meeting');
const applyArg = argOf('--apply');
const confirm = process.argv.includes('--confirm');

if (!url) {
  console.error('กรุณาระบุ --url "<DATABASE_URL>" หรือตั้งค่า NEON_DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

function parseJson(raw) {
  if (typeof raw !== 'string') return raw || null;
  try { return JSON.parse(raw); } catch { return null; }
}

const isGroupPayload = (p) =>
  Boolean(p && !Array.isArray(p) && (p.isGroup || p.type === 'conference_group_registration') && Array.isArray(p.attendees));

const fmtOf = (a) => a.format || (a.type === 'workshop' ? 'onsite' : 'both');
const formatOfAttendee = (att) => att.selectedFormat || att.attendanceType || att.format || 'onsite';

// เหมือน withAttendeeFormat ใน app/api/admin/slips/format/route.ts
function withAttendeeFormat(att, format) {
  return {
    ...att,
    attendanceType: format,
    ...(att.selectedFormat !== undefined ? { selectedFormat: format } : {}),
    ...(att.format !== undefined ? { format } : {}),
  };
}

function attendeeActivities(att, meetingActivities) {
  if (Array.isArray(att.selectedActivities) && att.selectedActivities.length > 0) return att.selectedActivities;
  const ids = att.selectedPrograms || att.selectedProgramIds || [];
  return meetingActivities.filter((a) => ids.includes(a.id));
}

async function listCandidates() {
  const slips = await prisma.payment_slips.findMany({
    where: {
      status: { in: ['pending', 'approved'] },
      ...(meetingFilter ? { meeting_id: meetingFilter } : {}),
    },
    include: { meetings: { select: { meeting_name: true, activities: true, pricing_tiers: true } } },
    orderBy: { created_at: 'asc' },
  });

  const rows = [];
  for (const slip of slips) {
    const payload = parseJson(slip.selected_activities);
    if (!isGroupPayload(payload)) continue;
    const meetingActs = parseJson(slip.meetings?.activities) || [];

    payload.attendees.forEach((att, idx) => {
      if (!att || typeof att !== 'object') return;
      const acts = attendeeActivities(att, meetingActs);
      const hasOnsiteWorkshop = acts.some((a) => a.type === 'workshop' && fmtOf(a) === 'onsite');
      const hasOnlineCapableMain = acts.some((a) => (a.type === 'main' || a.id === 'main') && fmtOf(a) !== 'onsite');
      const isMem = Boolean(att.isMember) && !att.isExpiredMember && Boolean(String(att.memberNo || '').trim());
      if (!hasOnsiteWorkshop || !hasOnlineCapableMain || formatOfAttendee(att) === 'online') return;

      rows.push({
        ref: `${slip.slip_id}:${idx}`,
        สถานะ: slip.status,
        ประชุม: slip.meeting_id,
        บริษัท: payload.companyName || '-',
        ชื่อ: att.nameTh || att.fullNameTh || att.nameEn || att.fullNameEn || '-',
        เลขสมาชิก: att.memberNo || '-',
        สมาชิกปกติ: isMem ? 'ใช่' : 'ไม่',
        workshop: acts.filter((a) => a.type === 'workshop').map((a) => a.name).join(', '),
        ลงเมื่อ: slip.created_at.toISOString().slice(0, 16).replace('T', ' '),
      });
    });
  }

  if (rows.length === 0) {
    console.log('ไม่พบผู้ลงทะเบียนกลุ่มที่ลง Main + Workshop onsite และยังเป็น onsite');
    return;
  }
  console.log(`พบ ${rows.length} คนที่ลง Main + Workshop onsite และยังเป็น onsite (อาจตั้งใจเลือกออนไลน์):\n`);
  console.table(rows);
  console.log('\nหมายเหตุ: ออนไลน์ใช้ได้เฉพาะสมาชิกปกติ คนที่ "สมาชิกปกติ = ไม่" ระบบจะคิดเป็น onsite อยู่แล้ว');
  console.log('เมื่อยืนยันกับบริษัทแล้ว ให้รันด้วย --apply <ref,...> --confirm');
}

async function applyOnline(refs) {
  const bySlip = new Map();
  for (const ref of refs) {
    const [slipId, idxStr] = ref.split(':');
    const idx = Number(idxStr);
    if (!slipId || !Number.isInteger(idx) || idx < 0) throw new Error(`รูปแบบ ref ไม่ถูกต้อง: ${ref}`);
    if (!bySlip.has(slipId)) bySlip.set(slipId, new Set());
    bySlip.get(slipId).add(idx);
  }

  for (const [slipId, indexes] of bySlip) {
    const slip = await prisma.payment_slips.findUnique({ where: { slip_id: slipId } });
    if (!slip) { console.log(`✗ ไม่พบ ${slipId}`); continue; }
    if (slip.status !== 'pending' && slip.status !== 'approved') { console.log(`✗ ${slipId} สถานะ ${slip.status} แก้ไม่ได้`); continue; }
    const payload = parseJson(slip.selected_activities);
    if (!isGroupPayload(payload)) { console.log(`✗ ${slipId} ไม่ใช่รายการกลุ่ม`); continue; }

    const bad = [...indexes].filter((i) => i >= payload.attendees.length);
    if (bad.length) { console.log(`✗ ${slipId} ไม่มีผู้เข้าร่วมลำดับ ${bad.join(', ')}`); continue; }

    const updated = {
      ...payload,
      attendees: payload.attendees.map((att, i) => (indexes.has(i) ? withAttendeeFormat(att, 'online') : att)),
    };
    for (const i of indexes) {
      const att = payload.attendees[i];
      console.log(`${confirm ? '✓' : '(ทดลอง)'} ${slipId}:${i} ${att.nameTh || att.nameEn || ''} ${formatOfAttendee(att)} -> online`);
    }
    if (confirm) {
      await prisma.payment_slips.update({ where: { id: slip.id }, data: { selected_activities: updated } });
    }
  }
  if (!confirm) console.log('\nยังไม่ได้บันทึก — ตรวจรายการด้านบนแล้วรันซ้ำพร้อม --confirm');
}

(async () => {
  console.log('ฐานข้อมูล:', url.split('@')[1]?.split('/')[0] || 'local');
  try {
    if (applyArg) await applyOnline(applyArg.split(',').map((s) => s.trim()).filter(Boolean));
    else await listCandidates();
  } catch (err) {
    console.error(err.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
