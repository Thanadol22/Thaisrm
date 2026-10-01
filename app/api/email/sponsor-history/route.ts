import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { sendSponsorHistoryEmail } from '@/lib/email';
import { getSystemSettings } from '@/lib/services/settingsService';
import {
  getSponsorRegistrationRows,
  groupRowsByBill,
  rowsForSponsor,
  SponsorBillSummary,
  SponsorRegistrationRow,
} from '@/lib/services/sponsorRegistrationService';
import {
  renderSponsorHistoryEmail,
  sponsorHistoryEmailSubject,
  SponsorHistoryEmailKind,
  SponsorHistoryEmailOptions,
} from '@/lib/emailTemplates/sponsorRegistrationHistoryTemplate';

export const dynamic = 'force-dynamic';
// ส่งทีละบริษัทต่อกัน — ให้เวลาพอเมื่อส่งแจ้งค้างชำระหลายบริษัท
export const maxDuration = 300;

type Scope = 'all' | 'bill' | 'meeting';

const TIER_WEIGHT: Record<string, number> = { Platinum: 1, Gold: 2, Silver: 3 };

async function loadSponsors() {
  const sponsors = await prisma.sponsors.findMany({
    select: { id: true, name: true, tier: true, contact_name: true, contact_email: true, is_active: true },
  });
  return sponsors.sort(
    (a, b) => (TIER_WEIGHT[a.tier] ?? 4) - (TIER_WEIGHT[b.tier] ?? 4) || a.name.localeCompare(b.name, 'th')
  );
}

function billView(b: SponsorBillSummary) {
  return {
    billNo: b.billNo,
    billDate: b.billDate,
    billType: b.billType,
    billStatus: b.billStatus,
    billStatusLabel: b.billStatusLabel,
    billAmount: b.billAmount,
    isOutstanding: b.isOutstanding,
    meetingId: b.meetingId,
    meetingName: b.meetingName,
    count: b.attendees.length,
  };
}

// GET /api/email/sponsor-history - รายชื่อบริษัทพร้อมบิลทั้งหมด ใช้สร้างตัวกรองในหน้าส่งอีเมล
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [sponsors, rows] = await Promise.all([loadSponsors(), getSponsorRegistrationRows()]);
    const data = sponsors.map((sp) => ({
      id: sp.id,
      name: sp.name,
      tier: sp.tier,
      contactName: sp.contact_name,
      contactEmail: sp.contact_email,
      isActive: sp.is_active,
      bills: groupRowsByBill(rowsForSponsor(rows, sp)).map(billView),
    }));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /api/email/sponsor-history GET error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถโหลดข้อมูลบริษัทได้' }, { status: 500 });
  }
}

function filterRows(rows: SponsorRegistrationRow[], scope: Scope, billNos: string[], meetingId: string) {
  if (scope === 'bill') {
    const set = new Set(billNos);
    return rows.filter((r) => set.has(r.billNo));
  }
  if (scope === 'meeting') return rows.filter((r) => r.meetingId === meetingId);
  return rows;
}

function scopeLabelOf(scope: Scope, bills: SponsorBillSummary[], meetingName: string) {
  if (scope === 'bill') return bills.length === 1 ? `บิลเลขที่ ${bills[0].billNo}` : `บิลที่เลือก ${bills.length} บิล`;
  if (scope === 'meeting') return `งานประชุม ${meetingName}`;
  return 'รวมทุกบิล';
}

// POST /api/email/sponsor-history - ดูตัวอย่าง ทดสอบส่ง หรือส่งอีเมลประวัติ/แจ้งค้างชำระให้บริษัท
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const kind: SponsorHistoryEmailKind = body.kind === 'overdue' ? 'overdue' : 'history';
    const scope: Scope = body.scope === 'bill' || body.scope === 'meeting' ? body.scope : 'all';
    const mode: 'preview' | 'test' | 'send' = body.mode === 'test' || body.mode === 'send' ? body.mode : 'preview';
    const sponsorIds: string[] = Array.isArray(body.sponsorIds) ? body.sponsorIds.map(String) : [];
    const billNos: string[] = Array.isArray(body.billNos) ? body.billNos.map(String) : [];
    const meetingId = String(body.meetingId || '');
    const extraNote = typeof body.extraNote === 'string' ? body.extraNote.slice(0, 2000) : '';
    const dueDate = typeof body.dueDate === 'string' && body.dueDate ? body.dueDate : null;

    if (sponsorIds.length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกบริษัท' }, { status: 400 });
    }
    if (scope === 'bill' && billNos.length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกบิลอย่างน้อย 1 บิล' }, { status: 400 });
    }
    if (scope === 'meeting' && !meetingId) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกรอบประชุม' }, { status: 400 });
    }

    const [sponsors, rows, settings] = await Promise.all([loadSponsors(), getSponsorRegistrationRows(), getSystemSettings()]);
    const selected = sponsorIds
      .map((id) => sponsors.find((sp) => sp.id === id))
      .filter((sp): sp is NonNullable<typeof sp> => !!sp);
    if (selected.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบบริษัทที่เลือก' }, { status: 404 });
    }

    const bank =
      kind === 'overdue'
        ? { name: settings.bank_name, accountNo: settings.bank_account_no, accountName: settings.bank_account_name }
        : null;

    // เตรียมเนื้อหาของแต่ละบริษัท
    const jobs: Array<{ sponsor: (typeof selected)[number]; options: SponsorHistoryEmailOptions }> = [];
    const skipped: string[] = [];
    for (const sp of selected) {
      const scoped = filterRows(rowsForSponsor(rows, sp), scope, billNos, meetingId);
      let bills = groupRowsByBill(scoped);
      if (kind === 'overdue') bills = bills.filter((b) => b.isOutstanding);
      if (bills.length === 0) {
        skipped.push(sp.name);
        continue;
      }
      jobs.push({
        sponsor: sp,
        options: {
          kind,
          companyName: sp.name,
          contactName: sp.contact_name,
          scopeLabel: scopeLabelOf(scope, bills, bills[0].meetingName),
          bills: bills.map((b) => ({
            billNo: b.billNo,
            billDate: b.billDate,
            billType: b.billType,
            billStatusLabel: b.billStatusLabel,
            billAmount: b.billAmount,
            isOutstanding: b.isOutstanding,
            meetingName: b.meetingName,
            attendees: b.attendees.map((a) => ({
              seq: a.seq,
              name: a.name,
              memberNo: a.memberNo,
              programs: a.programs,
              format: a.format,
              netPrice: a.netPrice,
            })),
          })),
          extraNote,
          dueDate,
          bank,
        },
      });
    }

    if (jobs.length === 0) {
      return NextResponse.json({
        success: false,
        error: kind === 'overdue' ? 'ไม่พบบิลค้างชำระตามเงื่อนไขที่เลือก' : 'ไม่พบประวัติการลงทะเบียนตามเงื่อนไขที่เลือก',
      }, { status: 400 });
    }

    if (mode === 'preview') {
      const first = jobs[0];
      return NextResponse.json({
        success: true,
        data: {
          subject: sponsorHistoryEmailSubject(kind, first.sponsor.name),
          html: renderSponsorHistoryEmail(first.options),
          recipient: first.sponsor.contact_email,
          companies: jobs.length,
        },
      });
    }

    if (mode === 'test') {
      const to = String(body.testRecipient || '').trim();
      if (!to.includes('@')) {
        return NextResponse.json({ success: false, error: 'กรุณาระบุอีเมลสำหรับรับข้อความทดสอบที่ถูกต้อง' }, { status: 400 });
      }
      const result = await sendSponsorHistoryEmail({ ...jobs[0].options, to, subjectPrefix: '[ทดสอบ] ' });
      return NextResponse.json({
        success: result.success,
        message: result.success ? `ส่งอีเมลทดสอบไปยัง ${to} สำเร็จ` : undefined,
        error: result.success ? undefined : result.error || 'ส่งอีเมลทดสอบไม่สำเร็จ',
      });
    }

    // ส่งจริงถึงอีเมลผู้ติดต่อของแต่ละบริษัท
    let successCount = 0;
    const errors: string[] = [];
    for (const job of jobs) {
      const to = (job.sponsor.contact_email || '').trim();
      if (!to.includes('@')) {
        errors.push(`${job.sponsor.name}: ไม่มีอีเมลผู้ติดต่อ`);
        continue;
      }
      try {
        const result = await sendSponsorHistoryEmail({ ...job.options, to });
        if (result.success) successCount++;
        else errors.push(`${job.sponsor.name}: ${result.error || 'ส่งไม่สำเร็จ'}`);
      } catch (err: any) {
        errors.push(`${job.sponsor.name}: ${err?.message || 'ส่งไม่สำเร็จ'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { total: jobs.length, successCount, failedCount: errors.length, skipped, errors: errors.slice(0, 10) },
      message: `ส่งอีเมลสำเร็จ ${successCount} จาก ${jobs.length} บริษัท${skipped.length ? ` ข้าม ${skipped.length} บริษัทที่ไม่มีรายการ` : ''}`,
    });
  } catch (error: any) {
    console.error('API /api/email/sponsor-history POST error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'เกิดข้อผิดพลาดในการส่งอีเมล' }, { status: 500 });
  }
}
