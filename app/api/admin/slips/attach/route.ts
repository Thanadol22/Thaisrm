import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { toAdminAttachedSlipUrl } from '@/lib/adminAttachedSlip';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/slips/attach
 * ผู้ดูแลระบบแนบสลิปแทนผู้ลงทะเบียน (เช่น รายการชำระภายหลังที่ส่งสลิปมาทางอีเมล/LINE)
 * สถานะคงเดิม: สลิปถูกเก็บเป็นสลิปที่รออนุมัติ และจะนับเป็นชำระเงินเรียบร้อยเมื่อแอดมินกดอนุมัติ
 * ถ้ามีสลิปจริงอยู่แล้ว (แนบผิดรูป) จะเปลี่ยนรูปแทนที่โดยไม่กระทบสถานะการชำระเงิน
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const slipId = String(body.slipId || '').trim();
    const slipUrl = String(body.slipUrl || '').trim();
    const transferDate = String(body.transferDate || '').trim();
    const transferTime = String(body.transferTime || '').trim();

    if (!slipId || !slipUrl) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรายการและไฟล์สลิป' },
        { status: 400 }
      );
    }

    const storedSlipUrl = toAdminAttachedSlipUrl(slipUrl);
    if (storedSlipUrl.length > 500 || !(slipUrl.startsWith('https://') || slipUrl.startsWith('/'))) {
      return NextResponse.json(
        { success: false, error: 'ที่อยู่ไฟล์สลิปไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const slip = await prisma.payment_slips.findUnique({ where: { slip_id: slipId } });
    if (!slip) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการชำระเงิน' }, { status: 404 });
    }
    if (slip.status !== 'pending' && slip.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'แนบสลิปได้เฉพาะรายการที่รอตรวจสอบหรืออนุมัติสิทธิ์แล้ว' },
        { status: 400 }
      );
    }

    // มีสลิปจริงอยู่แล้ว (เช่น อนุมัติการชำระแล้ว หรือผู้ลงทะเบียนแนบเอง): เปลี่ยนรูปแทนที่ โดยยังนับเป็นสลิปจริง
    // ยังไม่มีสลิปจริง: เก็บเป็นสลิปที่รออนุมัติ
    const currentUrl = slip.slip_url || '';
    const hasActualSlip = Boolean(
      currentUrl &&
      !['PAY_LATER', 'pay_later_pending', '/placeholder-slip.png', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP'].includes(currentUrl) &&
      !currentUrl.startsWith('TEMP_') &&
      (currentUrl.startsWith('https://') || currentUrl.startsWith('/') || currentUrl.startsWith('data:'))
    );

    const updated = await prisma.payment_slips.update({
      where: { id: slip.id },
      data: {
        slip_url: hasActualSlip ? slipUrl : storedSlipUrl,
        ...(transferDate ? { transfer_date: transferDate.slice(0, 50) } : {}),
        ...(transferTime ? { transfer_time: transferTime.slice(0, 50) } : {}),
      },
    });

    console.info(
      `[AdminAttachSlip] admin="${session.username}" ${hasActualSlip ? 'replaced slip of' : 'attached slip to'} "${slipId}"`
    );

    return NextResponse.json({
      success: true,
      data: {
        slipId: updated.slip_id,
        slipUrl,
        awaitingApproval: !hasActualSlip,
        status: updated.status,
        transferDate: updated.transfer_date || '',
        transferTime: updated.transfer_time || '',
      },
    });
  } catch (error) {
    console.error('API /api/admin/slips/attach POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถแนบสลิปได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
