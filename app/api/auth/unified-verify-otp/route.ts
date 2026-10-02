import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createOtpSessionToken } from '@/lib/security/otpSessionAuth';
import { buildSponsorPortalData } from '@/lib/services/sponsorPortalService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุอีเมลและรหัส OTP' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: 'รูปแบบรหัส OTP ไม่ถูกต้อง กรุณากรอกตัวเลข 6 หลัก' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 1. ตรวจสอบรหัส OTP (ตรวจสอบทั้ง hashed และ plaintext เพื่อ backward-compatibility)
    let otpRecord: any = null;
    if (prismaAny.sponsor_otp_codes) {
      otpRecord = await prismaAny.sponsor_otp_codes.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          otp_code: { in: [hashedOtp, otp] },
          is_used: false,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsor_otp_codes
        WHERE LOWER(email) = LOWER(${email})
          AND otp_code IN (${hashedOtp}, ${otp})
          AND is_used = false
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
      otpRecord = list[0] || null;
    }

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว (กรุณาขอรหัสใหม่)',
        },
        { status: 401 }
      );
    }

    // ทำเครื่องหมายว่าใช้งานแล้ว
    if (prismaAny.sponsor_otp_codes) {
      await prismaAny.sponsor_otp_codes.update({
        where: { id: otpRecord.id },
        data: { is_used: true },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE sponsor_otp_codes SET is_used = true WHERE id = ${otpRecord.id}
      `;
    }

    // 2. ตรวจสอบว่าเป็น Member หรือ Sponsor
    let member: any = null;
    if (prismaAny.member) {
      member = await prismaAny.member.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: {
          member_educations: {
            orderBy: { graduation_year: 'desc' },
          },
        },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM members WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `;
      member = list[0] || null;
      if (member) {
        const edus: any[] = await prisma.$queryRaw`
          SELECT * FROM member_educations WHERE member_no = ${member.member_no} ORDER BY graduation_year DESC
        `;
        member.member_educations = edus;
      }
    }

    if (member) {
      // จัดเตรียมข้อมูล Member พร้อมสถิติความสมบูรณ์ของข้อมูล
      const rawEdus = (member.member_educations || []).map((e: any) => ({
        edu_id: e.edu_id ? e.edu_id.toString() : '',
        degree: e.degree || '',
        institution: e.institution || '',
        graduation_year: e.graduation_year || '',
      }));

      // เช็คฟิลด์ที่ว่างให้ตรงกับเงื่อนไขการสมัคร
      const fieldsToCheck = [
        { key: 'fullNameTh', label: 'ชื่อ-นามสกุล (ภาษาไทย)' },
        { key: 'fullNameEn', label: 'ชื่อ-นามสกุล (ภาษาอังกฤษ)' },
        { key: 'idLast4', label: 'เลข 4 หลักท้ายบัตรประชาชน' },
        { key: 'mobile', label: 'เบอร์โทรศัพท์มือถือ' },
        { key: 'workplace', label: 'สถานที่ทำงาน' },
        { key: 'position', label: 'ตำแหน่งงาน' },
      ];

      const missingFields: string[] = [];
      fieldsToCheck.forEach((f) => {
        const val = member[f.key];
        if (!val || String(val).trim() === '' || String(val).trim() === '-' || String(val).trim().toLowerCase() === 'null') {
          missingFields.push(f.label);
        }
      });

      const sessionToken = createOtpSessionToken({
        email: member.email || email,
        userType: 'member',
        member_no: member.member_no,
      });

      return NextResponse.json({
        success: true,
        userType: 'member',
        sessionToken,
        data: {
          member_no: member.member_no,
          fullNameTh: member.fullNameTh || '',
          fullNameEn: member.fullNameEn || '',
          idLast4: member.idLast4 || '',
          mobile: member.mobile || '',
          email: member.email || '',
          lineId: member.lineId || '',
          address: member.address || '',
          workplace: member.workplace || '',
          work_phone: member.work_phone || '',
          work_start_date: member.work_start_date ? new Date(member.work_start_date).toISOString().split('T')[0] : '',
          position: member.position || '',
          job_category: member.job_category || '',
          job_category_other: member.job_category_other || '',
          scientist_license_no: member.scientist_license_no || '',
          referees: member.referees || '',
          photo_url: member.photo_url || '',
          degree_cert_doc: member.degree_cert_doc || '',
          work_cert_doc: member.work_cert_doc || '',
          membership_status: member.membership_status || 'ปกติ',
          membership_type: member.membership_type || 'สามัญ',
          applied_at: member.applied_at,
          expire_date: member.expire_date,
          educations: rawEdus,
          missingFields,
          isProfileComplete: missingFields.length === 0,
        },
      });
    }

    // 3. หากเป็น Sponsor
    const sponsorData = await buildSponsorPortalData(email);
    if (!sponsorData) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบบัญชีผู้ใช้งานที่ผูกกับอีเมลนี้' },
        { status: 404 }
      );
    }

    const sessionToken = createOtpSessionToken({
      email: sponsorData.contactEmail || email,
      userType: 'sponsor',
      sponsorId: sponsorData.sponsorId,
    });

    return NextResponse.json({
      success: true,
      userType: 'sponsor',
      sessionToken,
      data: sponsorData,
    });
  } catch (error: any) {
    console.error('[UnifiedVerifyOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' },
      { status: 500 }
    );
  }
}
