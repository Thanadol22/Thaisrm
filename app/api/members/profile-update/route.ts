import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      member_no,
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
      photo_url,
      educations,
    } = body;

    if (!member_no) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบรหัสสมาชิก' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;

    // ตรวจสอบว่ามีสมาชิกนี้จริงหรือไม่
    let existingMember: any = null;
    if (prismaAny.member) {
      existingMember = await prismaAny.member.findUnique({
        where: { member_no: String(member_no) },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM members WHERE member_no = ${String(member_no)} LIMIT 1
      `;
      existingMember = list[0] || null;
    }

    if (!existingMember) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลสมาชิกในระบบ' },
        { status: 404 }
      );
    }

    // แปลงวันเริ่มทำงาน
    let parsedWorkStartDate: Date | null = null;
    if (work_start_date) {
      const d = new Date(work_start_date);
      if (!isNaN(d.getTime())) {
        parsedWorkStartDate = d;
      }
    }

    // ทำการอัปเดตข้อมูลสมาชิก
    if (prismaAny.member) {
      await prismaAny.member.update({
        where: { member_no: String(member_no) },
        data: {
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
          photo_url: photo_url !== undefined ? (photo_url ? String(photo_url).trim() : null) : undefined,
        },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE members SET
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
          photo_url = ${photo_url ? String(photo_url).trim() : null}
        WHERE member_no = ${String(member_no)}
      `;
    }

    // อัปเดตประวัติการศึกษา (ถ้ามีการส่งมา)
    if (Array.isArray(educations)) {
      // ลบรายการเดิมแล้วใส่ใหม่
      if (prismaAny.member_educations) {
        await prismaAny.member_educations.deleteMany({
          where: { member_no: String(member_no) },
        });
        for (const edu of educations) {
          if (edu.degree || edu.institution) {
            await prismaAny.member_educations.create({
              data: {
                member_no: String(member_no),
                degree: String(edu.degree || '').trim(),
                institution: String(edu.institution || '').trim(),
                graduation_year: edu.graduation_year ? String(edu.graduation_year).trim() : null,
              },
            });
          }
        }
      } else {
        await prisma.$executeRaw`
          DELETE FROM member_educations WHERE member_no = ${String(member_no)}
        `;
        for (const edu of educations) {
          if (edu.degree || edu.institution) {
            await prisma.$executeRaw`
              INSERT INTO member_educations (member_no, degree, institution, graduation_year)
              VALUES (${String(member_no)}, ${String(edu.degree || '').trim()}, ${String(edu.institution || '').trim()}, ${edu.graduation_year ? String(edu.graduation_year).trim() : null})
            `;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลส่วนตัวของสมาชิกเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('[MemberProfileUpdate] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
