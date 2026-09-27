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

        // Check if email belongs to a corporate sponsor
        const existingSponsor = await (prisma as any).sponsors.findFirst({
          where: { contact_email: { equals: targetEmail, mode: 'insensitive' } },
          select: { name: true, contact_email: true },
        });

        if (existingSponsor) {
          return NextResponse.json({
            success: true,
            isDuplicate: true,
            field: 'email',
            email: targetEmail,
            message: `ไม่สามารถใช้อีเมลนี้สมัครสมาชิกได้ เนื่องจากเป็นอีเมลของบริษัท (${existingSponsor.name}) กรุณาใช้อีเมลส่วนตัวของผู้สมัคร`,
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

    // Check citizen ID card duplicates (idLast4 / idLast4s) in members table
    const idLast4sToCheck: string[] = Array.isArray(body.idLast4s)
      ? body.idLast4s.map((id: string) => String(id).trim()).filter(Boolean)
      : idLast4
      ? [String(idLast4).trim()]
      : [];

    if (idLast4sToCheck.length > 0) {
      for (const targetIdLast4 of idLast4sToCheck) {
        if (!targetIdLast4) continue;
        const existingMemberWithId = await prisma.member.findFirst({
          where: { idLast4: targetIdLast4 },
          select: { member_no: true, fullNameTh: true, idLast4: true },
        });

        if (existingMemberWithId) {
          return NextResponse.json({
            success: true,
            isDuplicate: true,
            field: 'idLast4',
            idLast4: targetIdLast4,
            message: `เลข 4 หลักท้ายบัตรประชาชน ${targetIdLast4} (${existingMemberWithId.fullNameTh || 'สมาชิก'}) มีอยู่ในระบบแล้ว (รหัสสมาชิก: ${existingMemberWithId.member_no})`,
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
