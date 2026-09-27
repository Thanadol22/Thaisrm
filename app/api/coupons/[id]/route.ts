import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// GET /api/coupons/[id] - รายละเอียดคูปองและประวัติการใช้
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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

    const usageMap = new Map<string, any>();

    // 1. จาก coupon_usages table (ผูกด้วย coupon_id)
    (coupon.usages || []).forEach((u: any) => {
      const key = `${u.id || ''}_${u.ticket_code || ''}_${u.member_no || ''}_${(u.attendee_email || '').toLowerCase()}`;
      usageMap.set(key, {
        id: u.id ? u.id.toString() : `cu-${Date.now()}`,
        attendee_name: u.attendee_name || u.member?.fullNameTh || u.member?.fullNameEn || 'ผู้เข้าร่วมประชุม',
        attendee_email: u.attendee_email || u.member?.email || '',
        attendee_phone: u.attendee_phone || u.member?.mobile || null,
        workplace: u.workplace || u.member?.workplace || coupon.company_name || null,
        member_no: u.member_no || u.member?.member_no || null,
        ticket_code: u.ticket_code || null,
        discount_applied: Number(u.discount_applied) || 0,
        final_amount: Number(u.final_amount) || 0,
        used_at: u.used_at ? new Date(u.used_at).toISOString() : new Date().toISOString(),
      });
    });

    // 2. ตรวจสอบ fallback จาก sponsor_group_members เฉพาะที่ระบุ coupon_code ตรงกับรหัสนี้เท่านั้น
    try {
      const sgmList = await (prisma as any).sponsor_group_members.findMany({
        where: {
          OR: [
            { coupon_code: coupon.code },
            { coupon_code: { equals: coupon.code, mode: 'insensitive' } },
          ],
        },
        orderBy: { created_at: 'desc' },
      });

      sgmList.forEach((sgm: any) => {
        const key = `${sgm.ticket_code || ''}_${sgm.member_no || ''}_${(sgm.attendee_email || '').toLowerCase()}`;
        // ตรวจสอบว่ามีอยู่แล้วใน usageMap หรือไม่
        let exists = false;
        for (const existingVal of Array.from(usageMap.values())) {
          if (
            (sgm.ticket_code && existingVal.ticket_code === sgm.ticket_code) ||
            (sgm.member_no && existingVal.member_no === sgm.member_no) ||
            (sgm.attendee_email && existingVal.attendee_email?.toLowerCase() === sgm.attendee_email.toLowerCase())
          ) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          usageMap.set(key, {
            id: sgm.id ? sgm.id.toString() : `sgm-${sgm.member_no}`,
            attendee_name: sgm.attendee_name || 'ผู้เข้าร่วมประชุม',
            attendee_email: sgm.attendee_email || '',
            attendee_phone: sgm.attendee_phone || null,
            workplace: sgm.workplace || coupon.company_name || null,
            member_no: sgm.member_no || null,
            ticket_code: sgm.ticket_code || null,
            discount_applied: Number(sgm.discount_amount) || 0,
            final_amount: Number(sgm.net_price) || 0,
            used_at: sgm.created_at ? new Date(sgm.created_at).toISOString() : new Date().toISOString(),
          });
        }
      });
    } catch (sgmErr) {
      console.warn('[Coupon Usages] SGM query fallback warning:', sgmErr);
    }

    // 3. ตรวจสอบ fallback จาก meeting_attendances เฉพาะที่ระบุ coupon_code ตรงกับรหัสนี้เท่านั้น
    try {
      const attList = await (prisma as any).meeting_attendances.findMany({
        where: {
          meeting_id: coupon.meeting_id,
          OR: [
            { coupon_code: coupon.code },
            { coupon_code: { equals: coupon.code, mode: 'insensitive' } },
          ],
        },
        include: {
          members: {
            select: {
              member_no: true,
              fullNameTh: true,
              fullNameEn: true,
              email: true,
              mobile: true,
              workplace: true,
            },
          },
        },
        orderBy: { attendance_id: 'desc' },
      });

      attList.forEach((att: any) => {
        const memNo = att.member_no || att.members?.member_no || '';
        const em = att.attendee_email || att.members?.email || '';
        const key = `att_${memNo}_${em.toLowerCase()}`;
        
        let alreadyCovered = false;
        for (const existingVal of Array.from(usageMap.values())) {
          if ((memNo && existingVal.member_no === memNo) || (em && existingVal.attendee_email?.toLowerCase() === em.toLowerCase())) {
            alreadyCovered = true;
            break;
          }
        }

        if (!alreadyCovered && (memNo || em)) {
          usageMap.set(key, {
            id: att.attendance_id ? att.attendance_id.toString() : `att-${Date.now()}`,
            attendee_name: att.attendee_name || att.members?.fullNameTh || att.members?.fullNameEn || 'ผู้เข้าร่วมประชุม',
            attendee_email: em,
            attendee_phone: att.attendee_phone || att.members?.mobile || null,
            workplace: att.workplace || att.members?.workplace || coupon.company_name || null,
            member_no: memNo || null,
            ticket_code: null,
            discount_applied: coupon.discount_type === 'free' ? 4000 : (coupon.discount_value || 0),
            final_amount: 0,
            used_at: att.checkin_time ? new Date(att.checkin_time).toISOString() : new Date().toISOString(),
          });
        }
      });
    } catch (attErr) {
      console.warn('[Coupon Usages] Attendance query fallback warning:', attErr);
    }

    const formattedUsages = Array.from(usageMap.values()).sort((a, b) => {
      return new Date(b.used_at).getTime() - new Date(a.used_at).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        ...coupon,
        used_count: Math.max(coupon.used_count || 0, formattedUsages.length),
        usages: formattedUsages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching coupon detail:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลรายละเอียดคูปองได้' },
      { status: 500 }
    );
  }
}

// PUT /api/coupons/[id] - แก้ไขข้อมูลคูปอง
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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
      { success: false, error: 'ไม่สามารถอัปเดตข้อมูลคูปองได้' },
      { status: 500 }
    );
  }
}

// PATCH /api/coupons/[id] - สลับสถานะเปิด/ปิดการใช้งาน (toggle is_active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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
      { success: false, error: 'ไม่สามารถเปลี่ยนสถานะคูปองได้' },
      { status: 500 }
    );
  }
}

// DELETE /api/coupons/[id] - ลบคูปอง
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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
      { success: false, error: 'ไม่สามารถลบคูปองได้' },
      { status: 500 }
    );
  }
}
