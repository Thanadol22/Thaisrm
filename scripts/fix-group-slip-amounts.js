/**
 * ตรวจ/แก้ยอดเงินของรายการลงทะเบียนประชุมแบบกลุ่ม ที่ไม่ตรงกับรายชื่อผู้ลงทะเบียนปัจจุบัน
 * (เช่น นำรายชื่อออกหรือย้ายไปรายการอื่นแล้ว แต่ยอดในรายการยังเป็นยอดเดิม บริษัทจึงเห็นยอดเกินจริง)
 *
 * ยอดที่ถูกต้อง = ผลรวมยอดสุทธิของผู้ลงทะเบียนที่ยังอยู่ในรายการ (เกณฑ์เดียวกับหน้าแก้ไขรายชื่อของผู้ดูแลระบบ)
 * ไม่แก้ใบเสร็จ: รายการที่มีใบเสร็จยอดไม่ตรงจะแจ้งให้ผู้ดูแลออกใบเสร็จใหม่เอง
 *
 * ตรวจ (อ่านอย่างเดียว):
 *   node scripts/fix-group-slip-amounts.js --url "<DATABASE_URL>" [--meeting TSRM34] [--company "LG Chem"]
 * แก้ยอด (ระบุ slip_id คั่นด้วย ,) — ต้องใส่ --confirm ถึงจะบันทึกจริง:
 *   node scripts/fix-group-slip-amounts.js --url "<DATABASE_URL>" --apply SLIP-GRP-XXXX,SLIP-GRP-YYYY [--confirm]
 */
const { PrismaClient } = require('@prisma/client');

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const url = argOf('--url') || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const meetingFilter = argOf('--meeting');
const companyFilter = argOf('--company');
const applyArg = argOf('--apply');
const confirm = process.argv.includes('--confirm');

if (!url) {
  console.error('กรุณาระบุ --url "<DATABASE_URL>" หรือตั้งค่า NEON_DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const clean = (v) => String(v ?? '').trim();
const toInt = (v) => Math.max(0, Math.round(Number(v) || 0));

function parseJson(raw) {
  if (typeof raw !== 'string') return raw || null;
  try { return JSON.parse(raw); } catch { return null; }
}

const isGroupConferencePayload = (p) =>
  Boolean(
    p && !Array.isArray(p) && Array.isArray(p.attendees) &&
    (p.isGroup || p.type === 'conference_group_registration') &&
    p.type !== 'membership_group_registration'
  );

// เหมือน attendeeNet / attendeeDiscount ใน app/api/admin/slips/attendees/route.ts
function attendeeNet(att) {
  if (!att) return 0;
  if (att.price !== undefined && att.price !== null && att.price !== '') return toInt(att.price);
  return Math.max(0, toInt(att.originalTotal || att.subtotal) - toInt(att.discountTotal ?? att.discountAmount));
}
const attendeeDiscount = (att) => toInt(att?.discountTotal ?? att?.discountAmount);
const attendeeOriginal = (att) => toInt(att?.originalTotal ?? att?.subtotal ?? attendeeNet(att));

const hasActualTransfer = (s) =>
  Boolean(s.slip_url) &&
  !['PAY_LATER', 'pay_later_pending', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP', '/placeholder-slip.png'].includes(s.slip_url) &&
  !String(s.slip_url).startsWith('TEMP_');

function expectedTotals(payload) {
  const attendees = payload.attendees.filter((a) => a && typeof a === 'object');
  return {
    amount: attendees.reduce((sum, a) => sum + attendeeNet(a), 0),
    originalAmount: attendees.reduce((sum, a) => sum + attendeeOriginal(a), 0),
    discountAmount: attendees.reduce((sum, a) => sum + attendeeDiscount(a), 0),
    count: attendees.length,
  };
}

async function listMismatches(slipIds) {
  const slips = await prisma.payment_slips.findMany({
    where: {
      status: { in: ['pending', 'approved'] },
      ...(slipIds ? { slip_id: { in: slipIds } } : {}),
      ...(meetingFilter ? { meeting_id: meetingFilter } : {}),
      ...(companyFilter ? { guest_workplace: { equals: companyFilter, mode: 'insensitive' } } : {}),
    },
    orderBy: { created_at: 'asc' },
  });

  const rows = [];
  for (const slip of slips) {
    const payload = parseJson(slip.selected_activities);
    // บันทึกแยกสำหรับผู้ดูแลระบบ (ยอดรวมอยู่ในบิลอื่นแล้ว) ไม่ต้องตรวจ
    if (!isGroupConferencePayload(payload) || payload.adminOnly) continue;
    const exp = expectedTotals(payload);
    if (exp.amount === slip.amount) continue;
    const receipts = await prisma.receipts.findMany({
      where: { slip_id: slip.slip_id, status: { not: 'cancelled' } },
      select: { receipt_no: true, total_amount: true },
    });
    rows.push({ slip, payload, exp, receipts });
  }
  return rows;
}

function printRow({ slip, exp, receipts }) {
  const diff = exp.amount - slip.amount;
  console.log(
    `${slip.slip_id} ${slip.ticket_code || ''} | ${slip.guest_workplace || slip.guest_name} | ${slip.status}` +
      ` | ยอดในรายการ ฿${slip.amount.toLocaleString()} → ตามรายชื่อ ${exp.count} ท่าน ฿${exp.amount.toLocaleString()}` +
      ` (${diff > 0 ? '+' : ''}${diff.toLocaleString()})` +
      (hasActualTransfer(slip) ? ' | มีสลิปโอนเงินจริงแล้ว ตรวจยอดโอนก่อนแก้' : ' | ยังไม่ได้ชำระ') +
      (receipts.length
        ? ` | ใบเสร็จ ${receipts.map((r) => `${r.receipt_no} ฿${r.total_amount.toLocaleString()}`).join(', ')} ต้องออกใหม่`
        : '')
  );
}

async function apply(slipIds) {
  const rows = await listMismatches(slipIds);
  const found = new Set(rows.map((r) => r.slip.slip_id));
  slipIds.filter((id) => !found.has(id)).forEach((id) => console.log(`${id}: ยอดตรงกับรายชื่อแล้ว หรือไม่ใช่รายการกลุ่มที่แก้ได้ ข้าม`));
  rows.forEach(printRow);
  if (!confirm) {
    console.log('\nรันทดลอง ไม่ได้บันทึก (เพิ่ม --confirm เพื่อบันทึกจริง)');
    return;
  }

  const stamp = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  for (const { slip, payload, exp } of rows) {
    const note = `${stamp} ปรับยอดตามรายชื่อปัจจุบัน ${exp.count} ท่าน: ฿${slip.amount.toLocaleString()} → ฿${exp.amount.toLocaleString()}`;
    await prisma.payment_slips.update({
      where: { id: slip.id },
      data: {
        amount: exp.amount,
        guest_name: `${clean(payload.companyName) || slip.guest_workplace || 'Corporate Group'}${payload.isFellow ? ' รายการ fellow' : ''} (${exp.count} ท่าน)`,
        selected_activities: {
          ...payload,
          totalAmount: exp.amount,
          originalAmount: exp.originalAmount,
          discountAmount: exp.discountAmount,
          adminNote: [clean(payload.adminNote), note].filter(Boolean).join('\n'),
        },
      },
    });
    console.log(`บันทึก ${slip.slip_id}: ${note}`);
  }
}

(async () => {
  if (applyArg) {
    await apply(applyArg.split(',').map((s) => s.trim()).filter(Boolean));
  } else {
    const rows = await listMismatches();
    if (rows.length === 0) console.log('ไม่พบรายการกลุ่มที่ยอดไม่ตรงกับรายชื่อ');
    rows.forEach(printRow);
  }
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERROR:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
