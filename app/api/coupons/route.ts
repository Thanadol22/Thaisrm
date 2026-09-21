import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/coupons - ดึงรายการคูปองทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const search = searchParams.get('search');

    const where: any = {};

    if (meetingId && meetingId !== 'all') {
      where.meeting_id = meetingId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { company_name: { contains: term, mode: 'insensitive' } },
        { remarks: { contains: term, mode: 'insensitive' } },
      ];
    }

    const couponsList = await (prisma as any).coupons.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        meetings: {
          select: {
            meeting_id: true,
            meeting_name: true,
            meeting_date: true,
            status: true,
          },
        },
        usages: {
          orderBy: { used_at: 'desc' },
          select: {
            id: true,
            attendee_name: true,
            attendee_email: true,
            member_no: true,
            ticket_code: true,
            discount_applied: true,
            final_amount: true,
            used_at: true,
          },
        },
      },
    });

    // Format BigInt and response
    const formatted = couponsList.map((c: any) => ({
      ...c,
      usages: (c.usages || []).map((u: any) => ({
        ...u,
        id: u.id ? u.id.toString() : '',
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/coupons - สร้างคูปองใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      company_name,
      meeting_id,
      discount_type = 'free',
      discount_value = 0,
      applicable_type = 'all',
      max_uses = 1,
      expire_date = null,
      is_active = true,
      remarks = null,
    } = body;

    // Validate required fields
    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสคูปอง (Coupon Code)' },
        { status: 400 }
      );
    }

    if (!company_name || !company_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อบริษัท / ผู้ให้การสนับสนุน' },
        { status: 400 }
      );
    }

    if (!meeting_id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกรอบการประชุม' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if code already exists
    const existing = await (prisma as any).coupons.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `รหัสคูปอง "${cleanCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` },
        { status: 400 }
      );
    }

    const newCoupon = await (prisma as any).coupons.create({
      data: {
        code: cleanCode,
        company_name: company_name.trim(),
        meeting_id,
        discount_type,
        discount_value: Number(discount_value) || 0,
        applicable_type,
        max_uses: Math.max(1, Number(max_uses) || 1),
        used_count: 0,
        expire_date: expire_date ? new Date(expire_date) : null,
        is_active: Boolean(is_active),
        remarks: remarks ? remarks.trim() : null,
      },
      include: {
        meetings: {
          select: {
            meeting_id: true,
            meeting_name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newCoupon,
      message: 'สร้างคูปองเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon', details: error.message },
      { status: 500 }
    );
  }
}
