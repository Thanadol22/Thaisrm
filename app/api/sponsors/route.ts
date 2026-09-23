import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/sponsors - ดึงรายชื่อบริษัททั้งหมด พร้อมข้อมูลโควต้าและสถิติการลงทะเบียน
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier');
    const search = searchParams.get('search');
    const meetingId = searchParams.get('meetingId');

    const whereClause: any = {};

    if (tier && tier !== 'all') {
      whereClause.tier = tier;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact_email: { contains: search, mode: 'insensitive' } },
        { contact_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sponsorsList = await (prisma as any).sponsors.findMany({
      where: whereClause,
      include: {
        quotas: {
          include: {
            meeting: true,
          },
        },
        group_members: {
          include: {
            meeting: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: [
        { tier: 'asc' },
        { name: 'asc' },
      ],
    });

    // ปรับโครงสร้างข้อมูลสำหรับ Frontend
    const data = sponsorsList.map((sp: any) => {
      const totalAllocatedQuota = sp.quotas.reduce((sum: number, q: any) => sum + (q.quota_seats || 0), 0);
      const totalUsedSeats = sp.quotas.reduce((sum: number, q: any) => sum + (q.used_seats || 0), 0);
      const totalRegisteredMembers = sp.group_members.length;

      return {
        id: sp.id,
        name: sp.name,
        tier: sp.tier,
        contact_name: sp.contact_name,
        contact_email: sp.contact_email,
        is_active: sp.is_active,
        created_at: sp.created_at,
        total_allocated_quota: totalAllocatedQuota,
        total_used_seats: totalUsedSeats,
        total_registered_members: totalRegisteredMembers,
        quotas: sp.quotas,
      };
    });

    return NextResponse.json({
      success: true,
      sponsors: data,
    });
  } catch (error: any) {
    console.error('[GetSponsors] Error:', error);
    return NextResponse.json(
      { success: false, message: 'ไม่สามารถดึงข้อมูลบริษัทสปอนเซอร์ได้' },
      { status: 500 }
    );
  }
}

// POST /api/sponsors - เพิ่มบริษัทใหม่
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const tier = (body.tier || 'Silver').trim();
    const contactEmail = (body.contactEmail || '').trim().toLowerCase();
    const contactName = (body.contactName || '').trim();
    const initialQuota = parseInt(body.initialQuota || '0', 10);
    const meetingId = body.meetingId;

    if (!name || !contactEmail) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกชื่อบริษัทและอีเมลตัวแทน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีอีเมลหรือชื่อซ้ำหรือไม่
    const existing = await (prisma as any).sponsors.findFirst({
      where: {
        OR: [
          { contact_email: { equals: contactEmail, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'มีบริษัทหรืออีเมลนี้อยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    const sponsor = await (prisma as any).sponsors.create({
      data: {
        name,
        tier,
        contact_email: contactEmail,
        contact_name: contactName || null,
        is_active: true,
      },
    });

    // หากระบุโควต้าและงานประชุม ให้สร้าง sponsor_quotas
    if (meetingId && initialQuota > 0) {
      await (prisma as any).sponsor_quotas.create({
        data: {
          sponsor_id: sponsor.id,
          meeting_id: meetingId,
          quota_seats: initialQuota,
          used_seats: 0,
          members_only: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'เพิ่มข้อมูลบริษัทสปอนเซอร์สำเร็จ',
      sponsor,
    });
  } catch (error: any) {
    console.error('[CreateSponsor] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มบริษัท' },
      { status: 500 }
    );
  }
}
