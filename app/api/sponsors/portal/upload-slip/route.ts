import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sponsorId,
      sponsorName,
      contactEmail,
      meetingId,
      amount,
      bank,
      transfer_date,
      transfer_time,
      slip_url,
      ref_no,
    } = body;

    if (!sponsorId || !contactEmail || !slip_url) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน (กรุณาระบุหลักฐานสลิปโอนเงิน)' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;
    const slipId = `SLIP-SPON-${Date.now().toString(36).toUpperCase()}`;

    // บันทึกรายการสลิปใน payment_slips
    let createdSlip: any = null;
    if (prismaAny.payment_slips) {
      createdSlip = await prismaAny.payment_slips.create({
        data: {
          slip_id: slipId,
          meeting_id: meetingId || 'TSRM34',
          guest_name: sponsorName || 'ตัวแทนบริษัทสปอนเซอร์',
          guest_email: contactEmail,
          is_member: false,
          amount: Number(amount) || 0,
          bank: bank || null,
          transfer_date: transfer_date || null,
          transfer_time: transfer_time || null,
          ref_no: ref_no || null,
          slip_url: slip_url,
          status: 'pending',
        },
      });
    } else {
      const inserted: any[] = await prisma.$queryRaw`
        INSERT INTO payment_slips (
          slip_id, meeting_id, guest_name, guest_email, is_member,
          amount, bank, transfer_date, transfer_time, ref_no, slip_url, status, created_at, updated_at
        )
        VALUES (
          ${slipId}, ${meetingId || 'TSRM34'}, ${sponsorName || 'ตัวแทนบริษัทสปอนเซอร์'}, ${contactEmail}, false,
          ${Number(amount) || 0}, ${bank || null}, ${transfer_date || null}, ${transfer_time || null}, ${ref_no || null}, ${slip_url}, 'pending', NOW(), NOW()
        )
        RETURNING *
      `;
      createdSlip = inserted[0] || null;
    }

    return NextResponse.json({
      success: true,
      message: 'แนบสลิปการโอนเงินเรียบร้อยแล้ว เจ้าหน้าที่จะทำการตรวจสอบข้อมูล',
      slip: createdSlip,
    });
  } catch (error: any) {
    console.error('[SponsorUploadSlip] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการแนบสลิป กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
