import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, emails, mobile, idLast4 } = body;

    const emailsToCheck: string[] = Array.isArray(emails)
      ? emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
      : email
      ? [String(email).trim().toLowerCase()]
      : [];

    if (emailsToCheck.length === 0 && !mobile && !idLast4) {
      return NextResponse.json({ success: true, isDuplicate: false });
    }

    // Check email duplicates in members table
    if (emailsToCheck.length > 0) {
      for (const targetEmail of emailsToCheck) {
        const existingMember = await prisma.member.findFirst({
          where: { email: { equals: targetEmail, mode: 'insensitive' } },
          select: { member_no: true, fullNameTh: true, email: true },
        });

        if (existingMember) {
          return NextResponse.json({
            success: true,
            isDuplicate: true,
            field: 'email',
            email: targetEmail,
            message: `อีเมล ${targetEmail} (${existingMember.fullNameTh || 'สมาชิก'}) มีอยู่ในระบบแล้ว (รหัสสมาชิก: ${existingMember.member_no})`,
          });
        }

        // Check pending slips
        const pendingSlip = await prisma.payment_slips.findFirst({
          where: {
            guest_email: { equals: targetEmail, mode: 'insensitive' },
            status: 'pending',
          },
          select: { slip_id: true, guest_name: true },
        });

        if (pendingSlip) {
          return NextResponse.json({
            success: true,
            isDuplicate: true,
            field: 'email',
            email: targetEmail,
            message: `อีเมล ${targetEmail} มีคำขอสมัครสมาชิกรอเจ้าหน้าที่ตรวจสอบสลิปแล้ว`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
    });
  } catch (err: any) {
    console.error('API /api/members/check-duplicate error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error checking duplicates' },
      { status: 500 }
    );
  }
}
