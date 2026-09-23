import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/sponsors/[id] - ดึงข้อมูลบริษัทสปอนเซอร์รายบริษัท
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prismaAny = prisma as any;
    let sponsor: any = null;

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
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });
    } else {
      const rawList: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors WHERE id = ${id} LIMIT 1
      `;
      if (rawList && rawList.length > 0) {
        sponsor = rawList[0];
        const qList: any[] = await prisma.$queryRaw`
          SELECT sq.*, m.meeting_name, m.meeting_date
          FROM sponsor_quotas sq
          LEFT JOIN meetings m ON sq.meeting_id = m.meeting_id
          WHERE sq.sponsor_id = ${id}
        `;
        sponsor.quotas = qList.map((q) => ({
          ...q,
          meeting: {
            meeting_id: q.meeting_id,
            meeting_name: q.meeting_name,
            meeting_date: q.meeting_date,
          },
        }));

        const mList: any[] = await prisma.$queryRaw`
          SELECT sgm.*, m.meeting_name, m.meeting_date
          FROM sponsor_group_members sgm
          LEFT JOIN meetings m ON sgm.meeting_id = m.meeting_id
          WHERE sgm.sponsor_id = ${id}
          ORDER BY sgm.created_at DESC
        `;
        sponsor.group_members = mList;
      }
    }

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลบริษัทสปอนเซอร์' },
        { status: 404 }
      );
    }

    const totalAllocatedQuota = (sponsor.quotas || []).reduce(
      (sum: number, q: any) => sum + (q.quota_seats || 0),
      0
    );
    const totalUsedSeats = (sponsor.quotas || []).reduce(
      (sum: number, q: any) => sum + (q.used_seats || 0),
      0
    );
    const totalRegisteredMembers = (sponsor.group_members || []).length;

    return NextResponse.json({
      success: true,
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        tier: sponsor.tier,
        contact_name: sponsor.contact_name,
        contact_email: sponsor.contact_email,
        is_active: sponsor.is_active,
        created_at: sponsor.created_at,
        total_allocated_quota: totalAllocatedQuota,
        total_used_seats: totalUsedSeats,
        total_registered_members: totalRegisteredMembers,
        quotas: sponsor.quotas || [],
      },
    });
  } catch (error: any) {
    console.error('[GetSponsorById] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'ไม่สามารถดึงข้อมูลบริษัทได้' },
      { status: 500 }
    );
  }
}

// PUT /api/sponsors/[id] - แก้ไขข้อมูลบริษัทและโควต้า
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const name = (body.name || '').trim();
    const tier = (body.tier || 'Silver').trim();
    const contactEmail = (body.contactEmail || body.contact_email || '').trim().toLowerCase();
    const contactName = (body.contactName ?? body.contact_name ?? '').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : (body.is_active !== undefined ? Boolean(body.is_active) : true);
    const quotaSeats = body.quotaSeats !== undefined ? parseInt(String(body.quotaSeats), 10) : undefined;
    const meetingId = body.meetingId;

    if (!name || !contactEmail) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกชื่อบริษัทและอีเมลตัวแทน' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;

    // ตรวจสอบชื่อ/อีเมลซ้ำกับบริษัทอื่น
    if (prismaAny.sponsors) {
      const duplicate = await prismaAny.sponsors.findFirst({
        where: {
          id: { not: id },
          OR: [
            { contact_email: { equals: contactEmail, mode: 'insensitive' } },
            { name: { equals: name, mode: 'insensitive' } },
          ],
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: duplicate.contact_email.toLowerCase() === contactEmail.toLowerCase()
              ? 'อีเมลตัวแทนนี้ถูกใช้งานโดยบริษัทอื่นแล้ว'
              : 'ชื่อบริษัทนี้มีอยู่ในระบบแล้ว',
          },
          { status: 400 }
        );
      }

      await prismaAny.sponsors.update({
        where: { id },
        data: {
          name,
          tier,
          contact_email: contactEmail,
          contact_name: contactName || null,
          is_active: isActive,
          updated_at: new Date(),
        },
      });

      // จัดการโควต้าของงานประชุมถ้ามีการระบุ
      if (meetingId && !isNaN(Number(quotaSeats))) {
        await prismaAny.sponsor_quotas.upsert({
          where: {
            sponsor_id_meeting_id: {
              sponsor_id: id,
              meeting_id: meetingId,
            },
          },
          update: {
            quota_seats: Number(quotaSeats),
            updated_at: new Date(),
          },
          create: {
            sponsor_id: id,
            meeting_id: meetingId,
            quota_seats: Number(quotaSeats),
            used_seats: 0,
            members_only: true,
          },
        });
      }
    } else {
      // Raw SQL Fallback
      const dupRows: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors
        WHERE id != ${id}
          AND (LOWER(contact_email) = LOWER(${contactEmail}) OR LOWER(name) = LOWER(${name}))
        LIMIT 1
      `;

      if (dupRows && dupRows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: dupRows[0].contact_email.toLowerCase() === contactEmail.toLowerCase()
              ? 'อีเมลตัวแทนนี้ถูกใช้งานโดยบริษัทอื่นแล้ว'
              : 'ชื่อบริษัทนี้มีอยู่ในระบบแล้ว',
          },
          { status: 400 }
        );
      }

      await prisma.$executeRaw`
        UPDATE sponsors
        SET 
          name = ${name},
          tier = ${tier},
          contact_email = ${contactEmail},
          contact_name = ${contactName || null},
          is_active = ${isActive},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      if (meetingId && !isNaN(Number(quotaSeats))) {
        await prisma.$executeRaw`
          INSERT INTO sponsor_quotas (id, sponsor_id, meeting_id, quota_seats, used_seats, members_only, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${id}, ${meetingId}, ${Number(quotaSeats)}, 0, true, NOW(), NOW())
          ON CONFLICT (sponsor_id, meeting_id)
          DO UPDATE SET quota_seats = ${Number(quotaSeats)}, updated_at = NOW()
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการแก้ไขข้อมูลบริษัทสำเร็จ',
    });
  } catch (error: any) {
    console.error('[UpdateSponsor] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลบริษัท' },
      { status: 500 }
    );
  }
}

// DELETE /api/sponsors/[id] - ลบข้อมูลบริษัทสปอนเซอร์
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prismaAny = prisma as any;

    // ตรวจสอบจำนวนสมาชิกที่เคยลงทะเบียนภายใต้บริษัทนี้
    let memberCount = 0;
    if (prismaAny.sponsor_group_members) {
      memberCount = await prismaAny.sponsor_group_members.count({
        where: { sponsor_id: id },
      });
    } else {
      const countRows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM sponsor_group_members WHERE sponsor_id = ${id}
      `;
      memberCount = countRows[0]?.count || 0;
    }

    // ลบข้อมูลที่เกี่ยวข้อง
    if (prismaAny.sponsors) {
      await prismaAny.sponsor_group_members.deleteMany({ where: { sponsor_id: id } });
      await prismaAny.sponsor_quotas.deleteMany({ where: { sponsor_id: id } });
      await prismaAny.sponsors.delete({ where: { id } });
    } else {
      await prisma.$executeRaw`DELETE FROM sponsor_group_members WHERE sponsor_id = ${id}`;
      await prisma.$executeRaw`DELETE FROM sponsor_quotas WHERE sponsor_id = ${id}`;
      await prisma.$executeRaw`DELETE FROM sponsors WHERE id = ${id}`;
    }

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลบริษัทสปอนเซอร์เรียบร้อยแล้ว',
      deletedRegisteredMembersCount: memberCount,
    });
  } catch (error: any) {
    console.error('[DeleteSponsor] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'เกิดข้อผิดพลาดในการลบข้อมูลบริษัท' },
      { status: 500 }
    );
  }
}
