import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractOtpSessionFromRequest } from '@/lib/security/otpSessionAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sponsorId,
      contactEmail,
      meetingId,
      slip_url,
      targetSlipId,
      targetTicketCode,
      sessionToken,
      // legacy fields (ไม่บังคับใช้แล้ว แต่รับไว้เผื่อ fallback สร้างรายการใหม่)
      sponsorName,
      amount,
      bank,
      transfer_date,
      transfer_time,
      ref_no,
    } = body;

    if (!sponsorId || !contactEmail || !slip_url) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน (กรุณาระบุหลักฐานสลิปโอนเงิน)' },
        { status: 400 }
      );
    }

    // ตรวจสอบความถูกต้องของสิทธิ์การเข้าใช้งาน
    const session = extractOtpSessionFromRequest(req, sessionToken);
    if (!session || session.email !== contactEmail.trim().toLowerCase() || session.userType !== 'sponsor') {
      return NextResponse.json(
        { success: false, message: 'สิทธิ์การเข้าใช้งานหมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนด้วยรหัส OTP ใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const prismaAny = prisma as any;
    let targetRecord: any = null;

    // 1. ค้นหารายการเดิมตาม targetSlipId หรือ targetTicketCode
    if (targetSlipId || targetTicketCode) {
      targetRecord = await prisma.payment_slips.findFirst({
        where: {
          OR: [
            ...(targetSlipId ? [{ slip_id: targetSlipId }] : []),
            ...(targetTicketCode ? [{ ticket_code: targetTicketCode }] : []),
          ],
        },
      });
    }

    let updatedOrCreatedSlip: any = null;

    if (targetRecord) {
      // อัปเดตรายการเดิม — เก็บแค่ slip_url ใหม่ + รีเซ็ตสถานะเป็น pending
      // preserve ค่าเดิมทั้งหมด (amount, bank, date, time) จาก DB โดยไม่ต้องรับจาก frontend
      updatedOrCreatedSlip = await prisma.payment_slips.update({
        where: { id: targetRecord.id },
        data: {
          slip_url: slip_url,
          status: 'pending',
          rejection_reason: null,
          updated_at: new Date(),
        },
      });
    } else {
      // fallback: สร้างรายการสลิปใหม่ (กรณีไม่พบรายการเดิมใน DB)
      const newSlipId = `SLIP-SPON-${Date.now().toString(36).toUpperCase()}`;
      if (prismaAny.payment_slips) {
        updatedOrCreatedSlip = await prismaAny.payment_slips.create({
          data: {
            slip_id: newSlipId,
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
            ${newSlipId}, ${meetingId || 'TSRM34'}, ${sponsorName || 'ตัวแทนบริษัทสปอนเซอร์'}, ${contactEmail}, false,
            ${Number(amount) || 0}, ${bank || null}, ${transfer_date || null}, ${transfer_time || null}, ${ref_no || null}, ${slip_url}, 'pending', NOW(), NOW()
          )
          RETURNING *
        `;
        updatedOrCreatedSlip = inserted[0] || null;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'แนบสลิปการโอนเงินเรียบร้อยแล้ว เจ้าหน้าที่จะทำการตรวจสอบข้อมูล',
      slip: updatedOrCreatedSlip,
    });
  } catch (error: any) {
    console.error('[SponsorUploadSlip] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการแนบสลิป กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
