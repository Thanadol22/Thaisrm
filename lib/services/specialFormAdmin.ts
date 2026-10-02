import prisma from '@/lib/prisma';
import { parseSpecialFormItems, resolveSpecialFormItems, SPECIAL_FORM_TYPES } from '@/lib/services/specialFormService';

/** ตรวจและแปลงข้อมูลฟอร์มจากหน้าแอดมิน (ใช้ทั้งสร้างและแก้ไข) */
export async function normalizeSpecialFormInput(body: any) {
  const title = String(body.title || '').trim().slice(0, 255);
  const meetingId = String(body.meetingId || '').trim();
  const formType = SPECIAL_FORM_TYPES[String(body.formType || '')] ? String(body.formType) : 'fellow';
  if (!title) throw new Error('กรุณาตั้งชื่อฟอร์ม');
  if (!meetingId) throw new Error('กรุณาเลือกงานประชุม');

  const meeting = await prisma.meetings.findUnique({ where: { meeting_id: meetingId }, select: { activities: true } });
  if (!meeting) throw new Error('ไม่พบงานประชุมที่เลือก');
  const actIds = new Set((Array.isArray(meeting.activities) ? (meeting.activities as any[]) : []).map((a) => String(a?.id)));

  const items = parseSpecialFormItems(body.items).filter((i) => actIds.has(i.activityId));
  const seen = new Set<string>();
  const uniqueItems = items.filter((i) => (seen.has(i.activityId) ? false : (seen.add(i.activityId), true)));
  if (uniqueItems.length === 0) throw new Error('กรุณาเลือกรายการอย่างน้อย 1 รายการ และตั้งราคา');
  const missingLabel = uniqueItems.find((i) => !i.label);
  if (missingLabel) throw new Error('กรุณาตั้งชื่อรายการให้ครบทุกรายการที่เลือก');

  const sponsorIds = Array.from(new Set((Array.isArray(body.sponsorIds) ? body.sponsorIds : []).map((v: unknown) => String(v)))).filter(Boolean) as string[];
  if (sponsorIds.length > 0) {
    const count = await prisma.sponsors.count({ where: { id: { in: sponsorIds } } });
    if (count !== sponsorIds.length) throw new Error('มีบริษัทที่เลือกไม่อยู่ในระบบ');
  }

  const closeAt = body.closeAt ? new Date(body.closeAt) : null;
  if (closeAt && Number.isNaN(closeAt.getTime())) throw new Error('วันปิดรับลงทะเบียนไม่ถูกต้อง');

  return {
    data: {
      title,
      description: String(body.description || '').trim() || null,
      form_type: formType,
      meeting_id: meetingId,
      items: uniqueItems as any,
      allow_coupon: body.allowCoupon !== false,
      is_open: body.isOpen !== false,
      close_at: closeAt,
    },
    sponsorIds,
  };
}

/** ข้อมูลฟอร์มสำหรับหน้าแอดมิน พร้อมจำนวนผู้ลงทะเบียน */
export async function serializeSpecialForm(form: any) {
  const slips = await prisma.payment_slips.findMany({
    where: { selected_activities: { path: ['specialFormId'], equals: form.id } },
    select: { status: true, amount: true, selected_activities: true },
  });
  const active = slips.filter((s) => s.status !== 'rejected' && s.status !== 'cancelled');
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    formType: form.form_type,
    meetingId: form.meeting_id,
    meetingName: form.meeting?.meeting_name || form.meeting_id,
    items: resolveSpecialFormItems(form, form.meeting),
    allowCoupon: form.allow_coupon,
    isOpen: form.is_open,
    closeAt: form.close_at,
    createdAt: form.created_at,
    sponsors: (form.sponsors || []).map((s: any) => ({ id: s.sponsor.id, name: s.sponsor.name, contactEmail: s.sponsor.contact_email })),
    stats: {
      slips: active.length,
      attendees: active.reduce((n, s) => n + (Array.isArray((s.selected_activities as any)?.attendees) ? (s.selected_activities as any).attendees.length : 0), 0),
      amount: active.reduce((n, s) => n + (s.amount || 0), 0),
      pending: slips.filter((s) => s.status === 'pending').length,
    },
  };
}

export const specialFormInclude = {
  meeting: { select: { meeting_name: true, activities: true, pricing_tiers: true } },
  sponsors: { include: { sponsor: { select: { id: true, name: true, contact_email: true } } } },
} as const;
