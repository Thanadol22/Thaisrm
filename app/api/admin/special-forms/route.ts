import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { newSpecialFormSlug } from '@/lib/services/specialFormService';
import { normalizeSpecialFormInput, serializeSpecialForm, specialFormInclude } from '@/lib/services/specialFormAdmin';

export const dynamic = 'force-dynamic';

/** GET /api/admin/special-forms — รายการฟอร์มเฉพาะทั้งหมด */
export async function GET(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const forms = await prisma.special_forms.findMany({ include: specialFormInclude, orderBy: { created_at: 'desc' } });
  return NextResponse.json({ success: true, data: await Promise.all(forms.map(serializeSpecialForm)) });
}

/** POST /api/admin/special-forms — สร้างฟอร์มเฉพาะ */
export async function POST(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data, sponsorIds } = await normalizeSpecialFormInput(await req.json());
    const form = await prisma.special_forms.create({
      data: {
        ...data,
        slug: newSpecialFormSlug(),
        sponsors: { create: sponsorIds.map((sponsor_id) => ({ sponsor_id })) },
      },
      include: specialFormInclude,
    });
    return NextResponse.json({ success: true, data: await serializeSpecialForm(form) });
  } catch (err: any) {
    console.error('[AdminSpecialForms] create error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'สร้างฟอร์มไม่สำเร็จ' }, { status: 400 });
  }
}
