import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSpecialFormBySlug, isSpecialFormOpen } from '@/lib/services/specialFormService';

export const dynamic = 'force-dynamic';

/** GET /api/forms/[slug] — ข้อมูลหัวฟอร์มสำหรับหน้าเข้าสู่ระบบ (ไม่มีราคาหรือรายชื่อบริษัท) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getSpecialFormBySlug(slug);
  if (!form) return NextResponse.json({ success: false, message: 'ไม่พบฟอร์มนี้' }, { status: 404 });
  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: form.meeting_id },
    select: { meeting_name: true, meeting_date: true, start_date: true, end_date: true, location: true },
  });
  return NextResponse.json({
    success: true,
    data: {
      title: form.title,
      description: form.description,
      formType: form.form_type,
      isOpen: isSpecialFormOpen(form),
      meeting,
    },
  });
}
