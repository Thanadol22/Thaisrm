import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ฟังก์ชันช่วย normalize ชื่อเพื่อเปรียบเทียบ (ตัดคำนำหน้าส่วนหัว, ช่องว่าง, อักขระพิเศษ)
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(
      /^(นายแพทย์|แพทย์หญิง|ทันตแพทย์หญิง|ทันตแพทย์|นพ\.|พญ\.|ทพ\.|ทญ\.|นพ|พญ|ทพ|ทญ|ดร\.|ดร|ศ\.|ศ|รศ\.|รศ|ผศ\.|ผศ|อาจารย์|อ\.|นาย|นางสาว|นาง|น\.ส\.|นส\.|dr\.|dr|prof\.|prof|assoc\.prof\.|asst\.prof\.|mr\.|mr|mrs\.|mrs|ms\.|ms)\s*/gi,
      ''
    )
    .replace(/\s+/g, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memberNoInput = (body.memberNo || '').toString().trim();
    const nameInput = (body.name || '').toString().trim();
    const nameThInput = (body.nameTh || '').toString().trim();
    const nameEnInput = (body.nameEn || '').toString().trim();
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
        message: `สมาชิกหมายเลข ${member.member_no} สถานะปัจจุบันคือ "${member.membership_status}" ไม่สามารถใช้สิทธิ์ได้ (ต้องเป็นสถานะ Active)`,
        member: {
          member_no: member.member_no,
          membership_status: member.membership_status,
        },
      });
    }

    // 3. ตรวจสอบว่าสมาชิกเคยลงทะเบียนในงานประชุมนี้แล้วหรือยัง (ถ้ามี meetingId)
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
          message: `สมาชิกหมายเลข ${member.member_no} ได้ลงทะเบียนเข้าร่วมงานประชุมนี้แล้ว`,
        });
      }
    }

    // 4. ตรวจสอบว่ามีชื่อส่งมาด้วยหรือไม่ หากยังไม่มี ถือเป็นการ Lookup เพื่อ Autofill ข้อมูล
    const activeNameInput = nameThInput || nameEnInput || nameInput;
    if (!activeNameInput) {
      return NextResponse.json({
        success: true,
        valid: true,
        isLookup: true,
        message: `พบข้อมูลสมาชิก: ${member.fullNameTh || member.fullNameEn || member.member_no}`,
        member: {
          member_no: member.member_no,
          fullNameTh: member.fullNameTh || '',
          fullNameEn: member.fullNameEn || '',
          email: member.email || '',
          mobile: member.mobile || '',
          workplace: member.workplace || '',
          position: member.position || member.job_category || '',
          membership_status: member.membership_status,
          membership_type: member.membership_type,
          expire_date: member.expire_date,
        },
      });
    }

    const normTh = normalizeName(member.fullNameTh || '');
    const normEn = normalizeName(member.fullNameEn || '');

    // ตรวจสอบกับภาษาไทย หรือ ภาษาอังกฤษ แบบตรงกันทั้งหมด
    let isMatched = false;
    if (nameThInput) {
      const normInputTh = normalizeName(nameThInput);
      if (normInputTh && normTh && normInputTh === normTh) {
        isMatched = true;
      }
    }
    if (nameEnInput && !isMatched) {
      const normInputEn = normalizeName(nameEnInput);
      if (normInputEn && normEn && normInputEn === normEn) {
        isMatched = true;
      }
    }
    if (nameInput && !isMatched) {
      const normInputGeneral = normalizeName(nameInput);
      if (normInputGeneral && ((normTh && normInputGeneral === normTh) || (normEn && normInputGeneral === normEn))) {
        isMatched = true;
      }
    }

    if (!isMatched) {
      return NextResponse.json({
        success: false,
        valid: false,
        nameMismatch: true,
        message: 'ชื่อไม่ตรงกับเลขสมาชิกในระบบ',
        member: {
          member_no: member.member_no,
          fullNameTh: member.fullNameTh || '',
          fullNameEn: member.fullNameEn || '',
          email: member.email || '',
          position: member.position || member.job_category || '',
        },
      });
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
        position: member.position || member.job_category || '',
        membership_status: member.membership_status,
        membership_type: member.membership_type,
        expire_date: member.expire_date,
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
