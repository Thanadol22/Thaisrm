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

    let data: any[] = [];

    const prismaAny = prisma as any;
    if (prismaAny.sponsors) {
      const sponsorsList = await prismaAny.sponsors.findMany({
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
      });

      const tierWeight = (t: string) => (t === 'Platinum' ? 1 : t === 'Gold' ? 2 : t === 'Silver' ? 3 : 4);
      sponsorsList.sort((a: any, b: any) => {
        const twA = tierWeight(a.tier);
        const twB = tierWeight(b.tier);
        if (twA !== twB) return twA - twB;
        return (a.name || '').localeCompare(b.name || '', 'th');
      });

      data = sponsorsList.map((sp: any) => {
        const totalAllocatedQuota = (sp.quotas || []).reduce((sum: number, q: any) => sum + (q.quota_seats || 0), 0);
        const totalUsedSeats = (sp.quotas || []).reduce((sum: number, q: any) => sum + (q.used_seats || 0), 0);
        const totalRegisteredMembers = (sp.group_members || []).length;

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
          quotas: sp.quotas || [],
        };
      });
    } else {
      // Fallback if Next.js has not reloaded generated Prisma delegate
      const rawSponsors: any[] = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.name, 
          s.tier, 
          s.contact_name, 
          s.contact_email, 
          s.is_active, 
          s.created_at,
          COALESCE((SELECT SUM(quota_seats) FROM sponsor_quotas WHERE sponsor_id = s.id), 0)::int as total_allocated_quota,
          COALESCE((SELECT SUM(used_seats) FROM sponsor_quotas WHERE sponsor_id = s.id), 0)::int as total_used_seats,
          (SELECT COUNT(*)::int FROM sponsor_group_members sgm WHERE sgm.sponsor_id = s.id) as total_registered_members
        FROM sponsors s
        ORDER BY 
          CASE s.tier WHEN 'Platinum' THEN 1 WHEN 'Gold' THEN 2 WHEN 'Silver' THEN 3 ELSE 4 END,
          s.name ASC
      `;

      // Fetch all quotas for detailed modal view
      const rawQuotas: any[] = await prisma.$queryRaw`
        SELECT sq.*, m.meeting_name, m.meeting_date
        FROM sponsor_quotas sq
        LEFT JOIN meetings m ON sq.meeting_id = m.meeting_id
      `;

      data = rawSponsors.map((sp) => {
        const spQuotas = rawQuotas
          .filter((q) => q.sponsor_id === sp.id)
          .map((q) => ({
            ...q,
            meeting: {
              meeting_id: q.meeting_id,
              meeting_name: q.meeting_name,
              meeting_date: q.meeting_date,
            },
          }));

        return {
          id: sp.id,
          name: sp.name,
          tier: sp.tier,
          contact_name: sp.contact_name,
          contact_email: sp.contact_email,
          is_active: sp.is_active,
          created_at: sp.created_at,
          total_allocated_quota: Number(sp.total_allocated_quota || 0),
          total_used_seats: Number(sp.total_used_seats || 0),
          total_registered_members: Number(sp.total_registered_members || 0),
          quotas: spQuotas,
        };
      });

      // Filter in memory for fallback if search or tier specified
      if (tier && tier !== 'all') {
        data = data.filter((d) => d.tier === tier);
      }
      if (search) {
        const sLower = search.toLowerCase();
        data = data.filter((d) =>
          (d.name && d.name.toLowerCase().includes(sLower)) ||
          (d.contact_email && d.contact_email.toLowerCase().includes(sLower)) ||
          (d.contact_name && d.contact_name.toLowerCase().includes(sLower))
        );
      }
    }

    return NextResponse.json({
      success: true,
      sponsors: data,
    });
  } catch (error: any) {
    console.error('[GetSponsors] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'ไม่สามารถดึงข้อมูลบริษัทสปอนเซอร์ได้', details: String(error) },
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

    const prismaAny = prisma as any;
    let existing: any = null;

    if (prismaAny.sponsors) {
      existing = await prismaAny.sponsors.findFirst({
        where: {
          OR: [
            { contact_email: { equals: contactEmail, mode: 'insensitive' } },
            { name: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
    } else {
      const dupRows: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors
        WHERE LOWER(contact_email) = LOWER(${contactEmail}) OR LOWER(name) = LOWER(${name})
        LIMIT 1
      `;
      existing = dupRows[0] || null;
    }

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'มีบริษัทหรืออีเมลนี้อยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    let sponsor: any = null;

    if (prismaAny.sponsors) {
      sponsor = await prismaAny.sponsors.create({
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
        await prismaAny.sponsor_quotas.create({
          data: {
            sponsor_id: sponsor.id,
            meeting_id: meetingId,
            quota_seats: initialQuota,
            used_seats: 0,
            members_only: true,
          },
        });
      }
    } else {
      const inserted: any[] = await prisma.$queryRaw`
        INSERT INTO sponsors (id, name, tier, contact_email, contact_name, is_active, created_at, updated_at)
        VALUES (gen_random_uuid()::text, ${name}, ${tier}, ${contactEmail}, ${contactName || null}, true, NOW(), NOW())
        RETURNING *
      `;
      sponsor = inserted[0];

      if (meetingId && initialQuota > 0 && sponsor?.id) {
        await prisma.$executeRaw`
          INSERT INTO sponsor_quotas (id, sponsor_id, meeting_id, quota_seats, used_seats, members_only, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${sponsor.id}, ${meetingId}, ${initialQuota}, 0, true, NOW(), NOW())
        `;
      }
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
