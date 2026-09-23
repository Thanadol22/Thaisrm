import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/sponsors/[id]/history - ดึงประวัติสมาชิกทั้งหมดที่บริษัทนี้เคยส่งลงทะเบียน
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prismaAny = prisma as any;
    let sponsor: any = null;
    let history: any[] = [];

    if (prismaAny.sponsors) {
      sponsor = await prismaAny.sponsors.findUnique({
        where: { id },
        include: {
          quotas: {
            include: {
              meeting: true,
            },
          },
          group_members: {
            include: {
              meeting: true,
              member: {
                select: {
                  member_no: true,
                  fullNameTh: true,
                  fullNameEn: true,
                  email: true,
                  mobile: true,
                  workplace: true,
                  membership_status: true,
                  membership_type: true,
                },
              },
              attendance: true,
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!sponsor) {
        return NextResponse.json(
          { success: false, message: 'ไม่พบข้อมูลบริษัทสปอนเซอร์' },
          { status: 404 }
        );
      }

      history = (sponsor.group_members || []).map((gm: any) => ({
        id: gm.id.toString(),
        memberNo: gm.member_no,
        attendeeName: gm.attendee_name,
        attendeeEmail: gm.attendee_email,
        attendeePhone: gm.attendee_phone,
        workplace: gm.workplace,
        ticketCode: gm.ticket_code,
        meetingId: gm.meeting_id,
        meetingName: gm.meeting?.meeting_name,
        meetingDate: gm.meeting?.meeting_date,
        couponCode: gm.coupon_code,
        submittedByEmail: gm.submitted_by_email,
        status: gm.status,
        registeredAt: gm.created_at,
        attendanceStatus: gm.attendance?.attendance_status || 'Registered',
      }));
    } else {
      const rawSponsors: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors WHERE id = ${id} LIMIT 1
      `;
      if (!rawSponsors || rawSponsors.length === 0) {
        return NextResponse.json(
          { success: false, message: 'ไม่พบข้อมูลบริษัทสปอนเซอร์' },
          { status: 404 }
        );
      }
      sponsor = rawSponsors[0];

      const rawQuotas: any[] = await prisma.$queryRaw`
        SELECT sq.*, m.meeting_name, m.meeting_date
        FROM sponsor_quotas sq
        LEFT JOIN meetings m ON sq.meeting_id = m.meeting_id
        WHERE sq.sponsor_id = ${id}
      `;
      sponsor.quotas = rawQuotas;

      const rawMembers: any[] = await prisma.$queryRaw`
        SELECT 
          sgm.*,
          m.meeting_name,
          m.meeting_date,
          ma.attendance_status
        FROM sponsor_group_members sgm
        LEFT JOIN meetings m ON sgm.meeting_id = m.meeting_id
        LEFT JOIN meeting_attendances ma ON sgm.attendance_id = ma.attendance_id
        WHERE sgm.sponsor_id = ${id}
        ORDER BY sgm.created_at DESC
      `;

      history = rawMembers.map((gm: any) => ({
        id: gm.id ? gm.id.toString() : '',
        memberNo: gm.member_no,
        attendeeName: gm.attendee_name,
        attendeeEmail: gm.attendee_email,
        attendeePhone: gm.attendee_phone,
        workplace: gm.workplace,
        ticketCode: gm.ticket_code,
        meetingId: gm.meeting_id,
        meetingName: gm.meeting_name,
        meetingDate: gm.meeting_date,
        couponCode: gm.coupon_code,
        submittedByEmail: gm.submitted_by_email,
        status: gm.status,
        registeredAt: gm.created_at,
        attendanceStatus: gm.attendance_status || 'Registered',
      }));
    }

    return NextResponse.json({
      success: true,
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        tier: sponsor.tier,
        contactName: sponsor.contact_name,
        contactEmail: sponsor.contact_email,
        isActive: sponsor.is_active,
      },
      quotas: sponsor.quotas,
      history,
    });
  } catch (error: any) {
    console.error('[GetSponsorHistory] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติสมาชิกของบริษัท' },
      { status: 500 }
    );
  }
}
