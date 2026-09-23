import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ฟังก์ชันช่วย normalize ชื่อเพื่อเปรียบเทียบ (ตัดคำนำหน้า, ช่องว่าง, ช่องว่างพิเศษ)
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(นพ\.|พญ\.|ทพ\.|ทญ\.|ดร\.|ศ\.|รศ\.|ผศ\.|นาย|นาง|นางสาว|น\.ส\.|dr\.|prof\.|assoc\.prof\.|asst\.prof\.|mr\.|mrs\.|ms\.)/gi, '')
    .replace(/\s+/g, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memberNoInput = (body.memberNo || '').toString().trim();
    const nameInput = (body.name || '').toString().trim();
    const meetingId = (body.meetingId || '').toString().trim();

    if (!memberNoInput) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: 'กรุณาระบุเลขสมาชิก (Member No.)',
        },
        { status: 400 }
      );
    }

    // จัดรูปแบบเลขสมาชิกให้เป็นเลข 4 หลัก เช่น '1' -> '0001'
    let formattedMemberNo = memberNoInput;
    if (/^\d+$/.test(memberNoInput) && memberNoInput.length < 4) {
      formattedMemberNo = memberNoInput.padStart(4, '0');
    }

    // 1. ค้นหาสมาชิกในระบบ
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { member_no: formattedMemberNo },
          { member_no: memberNoInput },
        ],
      },
    });

    if (!member) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `ไม่พบข้อมูลสมาชิกหมายเลข ${memberNoInput} ในระบบ`,
      });
    }

    // 2. ตรวจสอบสถานะสมาชิกภาพ (ต้องเป็น Active)
    if (member.membership_status && member.membership_status.toLowerCase() !== 'active') {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `สมาชิกหมายเลข ${member.member_no} (${member.fullNameTh}) สถานะปัจจุบันคือ "${member.membership_status}" ไม่สามารถใช้สิทธิ์ได้ (ต้องเป็นสถานะ Active)`,
        member: {
          member_no: member.member_no,
          fullNameTh: member.fullNameTh,
          membership_status: member.membership_status,
        },
      });
    }

    // 3. ตรวจสอบว่าชื่อที่กรอกตรงกับข้อมูลในระบบจริงหรือไม่ (ถ้ามีการระบุชื่อเข้ามา)
    let isNameMatching = true;
    if (nameInput) {
      const normInput = normalizeName(nameInput);
      const normTh = normalizeName(member.fullNameTh || '');
      const normEn = normalizeName(member.fullNameEn || '');

      const isThMatch = normTh.includes(normInput) || normInput.includes(normTh);
      const isEnMatch = normEn && (normEn.includes(normInput) || normInput.includes(normEn));

      if (!isThMatch && !isEnMatch) {
        isNameMatching = false;
        return NextResponse.json({
          success: false,
          valid: false,
          nameMismatch: true,
          message: `เลขสมาชิก ${member.member_no} ตรงกับ "${member.fullNameTh}" ในระบบ ซึ่งไม่ตรงกับชื่อ "${nameInput}" ที่ระบุ`,
          member: {
            member_no: member.member_no,
            fullNameTh: member.fullNameTh,
            fullNameEn: member.fullNameEn,
          },
        });
      }
    }

    // 4. ตรวจสอบว่าสมาชิกเคยลงทะเบียนในงานประชุมนี้แล้วหรือยัง (ถ้ามี meetingId)
    let alreadyRegistered = false;
    if (meetingId) {
      const existingAttendance = await prisma.meeting_attendances.findFirst({
        where: {
          meeting_id: meetingId,
          member_no: member.member_no,
        },
      });

      if (existingAttendance) {
        alreadyRegistered = true;
        return NextResponse.json({
          success: false,
          valid: false,
          alreadyRegistered: true,
          message: `สมาชิกหมายเลข ${member.member_no} (${member.fullNameTh}) ได้ลงทะเบียนเข้าร่วมงานประชุมนี้แล้ว`,
          member: {
            member_no: member.member_no,
            fullNameTh: member.fullNameTh,
            email: member.email,
            workplace: member.workplace,
            mobile: member.mobile,
          },
        });
      }
    }

    // สมาชิกถูกต้องสมบูรณ์
    return NextResponse.json({
      success: true,
      valid: true,
      message: 'ตรวจสอบสมาชิกสำเร็จ ข้อมูลถูกต้อง',
      member: {
        member_no: member.member_no,
        fullNameTh: member.fullNameTh,
        fullNameEn: member.fullNameEn,
        email: member.email,
        mobile: member.mobile,
        workplace: member.workplace,
        membership_status: member.membership_status,
        membership_type: member.membership_type,
      },
    });
  } catch (error: any) {
    console.error('[VerifyMember] Error:', error);
    return NextResponse.json(
      { success: false, valid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสมาชิก' },
      { status: 500 }
    );
  }
}
