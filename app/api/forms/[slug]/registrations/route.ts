import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractOtpSessionFromRequest } from '@/lib/security/otpSessionAuth';
import { getSpecialFormBySlug } from '@/lib/services/specialFormService';

export const dynamic = 'force-dynamic';

/** GET /api/forms/[slug]/registrations — รายชื่อที่บริษัทนี้เคยส่งผ่านฟอร์มเฉพาะนี้ (ต้องมี token จาก OTP ของฟอร์ม) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getSpecialFormBySlug(slug);
  if (!form) return NextResponse.json({ success: false, message: 'ไม่พบฟอร์มนี้' }, { status: 404 });

  const session = extractOtpSessionFromRequest(req);
  if (!session || session.userType !== 'sponsor' || session.formId !== form.id || !session.sponsorId) {
    return NextResponse.json({ success: false, message: 'สิทธิ์การเข้าใช้งานหมดอายุ กรุณายืนยันตัวตนใหม่' }, { status: 401 });
  }

  const slips = await prisma.payment_slips.findMany({
    where: { selected_activities: { path: ['specialFormId'], equals: form.id } },
    orderBy: { created_at: 'desc' },
  });

  const data = slips
    .filter((s) => (s.selected_activities as any)?.sponsorId === session.sponsorId)
    .map((s) => {
      const p = s.selected_activities as any;
      return {
        slipId: s.slip_id,
        ticketCode: s.ticket_code,
        status: s.status,
        amount: s.amount,
        isPayLater: s.slip_url === 'PAY_LATER',
        createdAt: s.created_at,
        attendees: (Array.isArray(p?.attendees) ? p.attendees : []).map((a: any) => ({
          name: a.nameTh || a.nameEn || '-',
          memberNo: a.memberNo || '',
          email: a.email || '',
          attendanceType: a.attendanceType === 'online' ? 'online' : 'onsite',
          programs: (Array.isArray(a.selectedActivities) ? a.selectedActivities : []).map((x: any) => x?.name).filter(Boolean),
          price: Number(a.price) || 0,
        })),
      };
    });

  return NextResponse.json({ success: true, data });
}
