import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/coupons/[id] - รายละเอียดคูปองและประวัติการใช้
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coupon = await (prisma as any).coupons.findUnique({
      where: { id },
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
          include: {
            member: {
              select: {
                member_no: true,
                fullNameTh: true,
                fullNameEn: true,
                mobile: true,
                email: true,
                workplace: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const formattedUsages = (coupon.usages || []).map((u: any) => ({
      ...u,
      id: u.id ? u.id.toString() : '',
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...coupon,
        usages: formattedUsages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching coupon detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupon details', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/coupons/[id] - แก้ไขข้อมูลคูปอง
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      company_name,
      meeting_id,
      discount_type,
      discount_value,
      applicable_type,
      max_uses,
      expire_date,
      is_active,
      remarks,
    } = body;

    const existing = await (prisma as any).coupons.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const updated = await (prisma as any).coupons.update({
      where: { id },
      data: {
        company_name: company_name !== undefined ? company_name.trim() : existing.company_name,
        meeting_id: meeting_id || existing.meeting_id,
        discount_type: discount_type || existing.discount_type,
        discount_value: discount_value !== undefined ? Number(discount_value) : existing.discount_value,
        applicable_type: applicable_type || existing.applicable_type,
        max_uses: max_uses !== undefined ? Math.max(existing.used_count, Number(max_uses)) : existing.max_uses,
        expire_date: expire_date !== undefined ? (expire_date ? new Date(expire_date) : null) : existing.expire_date,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
        remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : existing.remarks,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'อัปเดตข้อมูลคูปองเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update coupon', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/coupons/[id] - สลับสถานะเปิด/ปิดการใช้งาน (toggle is_active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const coupon = await (prisma as any).coupons.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const nextStatus = body.is_active !== undefined ? Boolean(body.is_active) : !coupon.is_active;

    const updated = await (prisma as any).coupons.update({
      where: { id },
      data: { is_active: nextStatus },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: nextStatus ? 'เปิดใช้งานคูปองแล้ว' : 'ระงับการใช้งานคูปองแล้ว',
    });
  } catch (error: any) {
    console.error('Error toggling coupon status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle coupon status', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/coupons/[id] - ลบคูปอง
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coupon = await (prisma as any).coupons.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    if (coupon.used_count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `คูปองนี้มีการใช้งานไปแล้ว ${coupon.used_count} สิทธิ์ ไม่สามารถลบได้ หากต้องการยกเลิกกรุณาเปลี่ยนสถานะเป็น "ระงับการใช้งาน" แทน`,
        },
        { status: 400 }
      );
    }

    await (prisma as any).coupons.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบคูปองเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon', details: error.message },
      { status: 500 }
    );
  }
}
