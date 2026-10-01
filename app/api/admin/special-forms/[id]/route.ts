import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { normalizeSpecialFormInput, serializeSpecialForm, specialFormInclude } from '@/lib/services/specialFormAdmin';
import { buildSpecialFormMeeting, parseSpecialFormItems } from '@/lib/services/specialFormService';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/special-forms/[id] — ฟอร์มพร้อมงานประชุมในราคาของฟอร์ม (ใช้ลงทะเบียนแทนบริษัท) */
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const form = await prisma.special_forms.findUnique({ where: { id }, include: specialFormInclude });
  if (!form) return NextResponse.json({ success: false, error: 'ไม่พบฟอร์ม' }, { status: 404 });
  const meeting = await prisma.meetings.findUnique({ where: { meeting_id: form.meeting_id } });
  if (!meeting) return NextResponse.json({ success: false, error: 'ไม่พบงานประชุมของฟอร์ม' }, { status: 404 });
  const sponsors = await prisma.sponsors.findMany({
    where: { id: { in: form.sponsors.map((s) => s.sponsor_id) } },
  });
  return NextResponse.json({
    success: true,
    data: await serializeSpecialForm(form),
    meeting: buildSpecialFormMeeting(meeting, parseSpecialFormItems(form.items)),
    companies: sponsors,
  });
}

/** PUT /api/admin/special-forms/[id] — แก้ไขฟอร์ม รายการ ราคา และบริษัทที่มีสิทธิ์ (ราคาใหม่ใช้กับการลงทะเบียนครั้งถัดไป) */
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const existing = await prisma.special_forms.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'ไม่พบฟอร์ม' }, { status: 404 });
    const { data, sponsorIds } = await normalizeSpecialFormInput(await req.json());
    const form = await prisma.$transaction(async (tx) => {
      await tx.special_form_sponsors.deleteMany({ where: { form_id: id, sponsor_id: { notIn: sponsorIds } } });
      const current = await tx.special_form_sponsors.findMany({ where: { form_id: id }, select: { sponsor_id: true } });
      const have = new Set(current.map((c) => c.sponsor_id));
      const toAdd = sponsorIds.filter((s) => !have.has(s));
      if (toAdd.length > 0) {
        await tx.special_form_sponsors.createMany({ data: toAdd.map((sponsor_id) => ({ form_id: id, sponsor_id })) });
      }
      return tx.special_forms.update({ where: { id }, data, include: specialFormInclude });
    });
    return NextResponse.json({ success: true, data: await serializeSpecialForm(form) });
  } catch (err: any) {
    console.error('[AdminSpecialForms] update error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'บันทึกฟอร์มไม่สำเร็จ' }, { status: 400 });
  }
}

/** PATCH /api/admin/special-forms/[id] — เปิดหรือปิดรับลงทะเบียน */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const form = await prisma.special_forms
    .update({ where: { id }, data: { is_open: Boolean(body.isOpen) }, include: specialFormInclude })
    .catch(() => null);
  if (!form) return NextResponse.json({ success: false, error: 'ไม่พบฟอร์ม' }, { status: 404 });
  return NextResponse.json({ success: true, data: await serializeSpecialForm(form) });
}

/** DELETE /api/admin/special-forms/[id] — ลบฟอร์ม (ลบได้เฉพาะฟอร์มที่ยังไม่มีผู้ลงทะเบียน) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const used = await prisma.payment_slips.count({ where: { selected_activities: { path: ['specialFormId'], equals: id } } });
  if (used > 0) {
    return NextResponse.json(
      { success: false, error: `ฟอร์มนี้มีรายการลงทะเบียนแล้ว ${used} รายการ ลบไม่ได้ ให้ปิดรับลงทะเบียนแทน` },
      { status: 400 }
    );
  }
  await prisma.special_forms.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
