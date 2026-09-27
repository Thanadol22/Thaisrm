import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { getClientIp, checkRateLimitAsync } from '@/lib/security/rateLimiter';
import { extractOtpSessionFromRequest } from '@/lib/security/otpSessionAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: 10 ครั้ง / นาที ต่อ IP
    const rl = await checkRateLimitAsync(`member-profile-update:${ip}`, {
      maxRequests: 10,
      windowSeconds: 60,
      banDurationSeconds: 300,
      maxViolationsBeforeBan: 3,
    });

    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: `ท่านส่งคำขอถี่เกินไป กรุณารออีก ${rl.retryAfterSeconds} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      member_no,
      email,
      sessionToken,
      fullNameTh,
      fullNameEn,
      idLast4,
      mobile,
      lineId,
      address,
      workplace,
      work_phone,
      work_start_date,
      position,
      job_category,
      job_category_other,
      scientist_license_no,
      referees,
      photo_url,
      degree_cert_doc,
      work_cert_doc,
      educations,
    } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุอีเมล' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // ─── Step 1: ตรวจสอบความถูกต้องของสิทธิ์การเข้าใช้งาน (Cryptographic OTP Session Token) ────
    const session = extractOtpSessionFromRequest(req, sessionToken);
    if (!session || session.userType !== 'member' || !session.member_no) {
      return NextResponse.json(
        { success: false, message: 'สิทธิ์การเข้าใช้งานหมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนด้วยรหัส OTP ใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    // ─── Step 2: ตรวจสอบข้อมูลสมาชิกในระบบจาก member_no ──────────────────────────
    const verifiedMemberNo = session.member_no;
    const memberCheck = await prisma.member.findFirst({
      where: {
        member_no: verifiedMemberNo,
      },
      select: { member_no: true, email: true },
    });

    if (!memberCheck) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลสมาชิกในระบบ' },
        { status: 404 }
      );
    }

    // ─── Step 3: ตรวจสอบและอัปเดตอีเมล (กรณีเปลี่ยนอีเมลใหม่) ───────────────────
    let newEmailToSet: string | undefined = undefined;
    let updatedSessionToken: string | undefined = undefined;

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return NextResponse.json(
          { success: false, message: 'กรุณาระบุรูปแบบอีเมลให้ถูกต้อง (เช่น user@example.com)' },
          { status: 400 }
        );
      }

      if (cleanEmail !== (memberCheck.email || '').toLowerCase()) {
        const dupMember = await prisma.member.findFirst({
          where: {
            email: { equals: cleanEmail, mode: 'insensitive' },
            member_no: { not: verifiedMemberNo },
          },
          select: { member_no: true },
        });

        if (dupMember) {
          return NextResponse.json(
            { success: false, message: 'อีเมลนี้ถูกใช้งานโดยสมาชิกท่านอื่นในระบบแล้ว กรุณาใช้อีเมลอื่น' },
            { status: 409 }
          );
        }

        newEmailToSet = cleanEmail;
        const { createOtpSessionToken } = await import('@/lib/security/otpSessionAuth');
        updatedSessionToken = createOtpSessionToken({
          email: cleanEmail,
          userType: 'member',
          member_no: verifiedMemberNo,
        });
      }
    }

    // ─── Step 3.1: ตรวจสอบเลข 4 หลักท้ายบัตรประชาชน (กรณีเปลี่ยนเลขบัตร) ────────
    if (idLast4 !== undefined && idLast4 !== null && String(idLast4).trim() !== '') {
      const cleanIdLast4 = String(idLast4).trim();
      const dupIdMember = await prisma.member.findFirst({
        where: {
          idLast4: cleanIdLast4,
          member_no: { not: verifiedMemberNo },
        },
        select: { member_no: true, fullNameTh: true },
      });

      if (dupIdMember) {
        return NextResponse.json(
          { success: false, message: `เลข 4 หลักท้ายบัตรประชาชน (${cleanIdLast4}) ถูกใช้งานโดยสมาชิกท่านอื่นในระบบแล้ว` },
          { status: 409 }
        );
      }
    }

    // แปลงวันเริ่มทำงาน
    let parsedWorkStartDate: Date | null = null;
    if (work_start_date) {
      const d = new Date(work_start_date);
      if (!isNaN(d.getTime())) {
        parsedWorkStartDate = d;
      }
    }

    const db = prisma as any;

    // ทำการอัปเดตข้อมูลสมาชิก
    if (db.member) {
      await db.member.update({
        where: { member_no: verifiedMemberNo },
        data: {
          email: newEmailToSet,
          fullNameTh: fullNameTh !== undefined ? (fullNameTh ? String(fullNameTh).trim() : undefined) : undefined,
          fullNameEn: fullNameEn !== undefined ? (fullNameEn ? String(fullNameEn).trim() : null) : undefined,
          idLast4: idLast4 !== undefined ? (idLast4 ? String(idLast4).trim() : null) : undefined,
          mobile: mobile !== undefined ? (mobile ? String(mobile).trim() : null) : undefined,
          lineId: lineId !== undefined ? (lineId ? String(lineId).trim() : null) : undefined,
          address: address !== undefined ? (address ? String(address).trim() : null) : undefined,
          workplace: workplace !== undefined ? (workplace ? String(workplace).trim() : null) : undefined,
          work_phone: work_phone !== undefined ? (work_phone ? String(work_phone).trim() : null) : undefined,
          work_start_date: parsedWorkStartDate,
          position: position !== undefined ? (position ? String(position).trim() : null) : undefined,
          job_category: job_category !== undefined ? (job_category ? String(job_category).trim() : null) : undefined,
          job_category_other: job_category_other !== undefined ? (job_category_other ? String(job_category_other).trim() : null) : undefined,
          scientist_license_no: scientist_license_no !== undefined ? (scientist_license_no ? String(scientist_license_no).trim() : null) : undefined,
          referees: referees !== undefined ? (referees ? String(referees).trim() : null) : undefined,
          photo_url: photo_url !== undefined ? (photo_url ? String(photo_url).trim() : null) : undefined,
          degree_cert_doc: degree_cert_doc !== undefined ? (degree_cert_doc ? String(degree_cert_doc).trim() : null) : undefined,
          work_cert_doc: work_cert_doc !== undefined ? (work_cert_doc ? String(work_cert_doc).trim() : null) : undefined,
        },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE members SET
          email = COALESCE(${newEmailToSet}, email),
          full_name_th = COALESCE(${fullNameTh ? String(fullNameTh).trim() : null}, full_name_th),
          full_name_en = ${fullNameEn ? String(fullNameEn).trim() : null},
          id_last4 = ${idLast4 ? String(idLast4).trim() : null},
          mobile = ${mobile ? String(mobile).trim() : null},
          line_id = ${lineId ? String(lineId).trim() : null},
          address = ${address ? String(address).trim() : null},
          workplace = ${workplace ? String(workplace).trim() : null},
          work_phone = ${work_phone ? String(work_phone).trim() : null},
          work_start_date = ${parsedWorkStartDate},
          position = ${position ? String(position).trim() : null},
          job_category = ${job_category ? String(job_category).trim() : null},
          job_category_other = ${job_category_other ? String(job_category_other).trim() : null},
          scientist_license_no = ${scientist_license_no ? String(scientist_license_no).trim() : null},
          referees = ${referees ? String(referees).trim() : null},
          photo_url = ${photo_url ? String(photo_url).trim() : null},
          degree_cert_doc = ${degree_cert_doc ? String(degree_cert_doc).trim() : null},
          work_cert_doc = ${work_cert_doc ? String(work_cert_doc).trim() : null}
        WHERE member_no = ${verifiedMemberNo}
      `;
    }

    // อัปเดตประวัติการศึกษา (ถ้ามีการส่งมา)
    if (Array.isArray(educations)) {
      // ลบรายการเดิมแล้วใส่ใหม่
      if (db.member_educations) {
        await db.member_educations.deleteMany({
          where: { member_no: verifiedMemberNo },
        });
        for (const edu of educations) {
          if (edu.degree || edu.institution) {
            await db.member_educations.create({
              data: {
                member_no: verifiedMemberNo,
                degree: String(edu.degree || '').trim(),
                institution: String(edu.institution || '').trim(),
                graduation_year: edu.graduation_year ? String(edu.graduation_year).trim() : null,
              },
            });
          }
        }
      } else {
        await prisma.$executeRaw`
          DELETE FROM member_educations WHERE member_no = ${verifiedMemberNo}
        `;
        for (const edu of educations) {
          if (edu.degree || edu.institution) {
            await prisma.$executeRaw`
              INSERT INTO member_educations (member_no, degree, institution, graduation_year)
              VALUES (${verifiedMemberNo}, ${String(edu.degree || '').trim()}, ${String(edu.institution || '').trim()}, ${edu.graduation_year ? String(edu.graduation_year).trim() : null})
            `;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลส่วนตัวของสมาชิกเรียบร้อยแล้ว',
      sessionToken: updatedSessionToken,
      email: newEmailToSet,
    });
  } catch (error: any) {
    console.error('[MemberProfileUpdate] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
