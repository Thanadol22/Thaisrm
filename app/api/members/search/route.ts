import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface FieldData {
  text: string | null;
  status: 'HAS_DATA' | 'EMPTY' | 'ERROR';
  errorDetail?: string;
}

export interface RawMemberResult {
  member_no: string;
  id: bigint | number | null;
  full_name_th: string | null;
  full_name_en: string | null;
  id_last4: string | null;
  mobile: string | null;
  email: string | null;
  line_id: string | null;
  workplace: string | null;
  position: string | null;
  membership_status: string | null;
  membership_type: string | null;
  checkin_time: Date | string | null;
  meeting_name: string | null;
  meeting_date: Date | string | null;
}

/**
 * ฟังก์ชันประมวลผลฟิลด์ข้อมูล
 */
function parseField(raw: unknown, transform?: (val: string) => string): FieldData {
  try {
    if (raw === null || raw === undefined) {
      return { text: null, status: 'EMPTY' };
    }

    if (typeof raw !== 'string' && typeof raw !== 'number') {
      return { text: null, status: 'ERROR', errorDetail: 'ชนิดข้อมูลไม่ถูกต้อง' };
    }

    let str = String(raw).trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'null') {
      return { text: null, status: 'EMPTY' };
    }

    if (transform) {
      str = transform(str);
    }

    return { text: str, status: 'HAS_DATA' };
  } catch (err: unknown) {
    return {
      text: null,
      status: 'ERROR',
      errorDetail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านข้อมูล',
    };
  }
}

/**
 * แปลง Row จากฐานข้อมูลเป็น DTO สำหรับ Frontend
 */
function formatMemberRow(m: RawMemberResult) {
  let lastMeetingData: FieldData = { text: null, status: 'EMPTY' };
  try {
    const meetingName = m.meeting_name;
    const meetingDate = m.checkin_time || m.meeting_date;
    if (meetingName && meetingDate) {
      const d = new Date(meetingDate);
      const dateStr = d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      lastMeetingData = {
        text: `${meetingName} (${dateStr})`,
        status: 'HAS_DATA',
      };
    } else if (meetingName) {
      lastMeetingData = {
        text: meetingName,
        status: 'HAS_DATA',
      };
    }
  } catch (err: unknown) {
    lastMeetingData = {
      text: null,
      status: 'ERROR',
      errorDetail: err instanceof Error ? err.message : 'ไม่สามารถประมวลผลข้อมูลการประชุมได้',
    };
  }

  const workplaceData = parseField(m.workplace, (val) =>
    val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  );
  const emailData = parseField(m.email);
  const positionData = parseField(m.position);
  const nameThData = parseField(m.full_name_th);
  const nameEnData = parseField(m.full_name_en);
  const memberTypeData = parseField(m.membership_type);
  const memberStatusData = parseField(m.membership_status || 'Active');
  const memberNoFormatted = m.member_no ? String(m.member_no).padStart(4, '0') : '-';

  return {
    id: m.id ? m.id.toString() : String(m.member_no),
    memberId: memberNoFormatted,
    nameTh: nameThData,
    nameEn: nameEnData,
    email: emailData,
    workplace: workplaceData,
    position: positionData,
    memberType: memberTypeData,
    membershipStatus: memberStatusData,
    memberStatus: memberStatusData,
    lastAttendedMeeting: lastMeetingData,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = (searchParams.get('q') || '').trim();

    // หากไม่มีคำค้นหา ให้คืนค่าผลลัพธ์ว่าง
    if (!rawQ) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // ตัดคำนำหน้าชื่อทางวิชาชีพ/วิชาการ
    const prefixes = [
      'นพ.', 'พญ.', 'นพ ', 'พญ ', 'ศ.นพ.', 'รศ.นพ.', 'ผศ.นพ.', 'ศ.พญ.', 'รศ.พญ.', 'ผศ.พญ.',
      'ดร.', 'นว.', 'ภญ.', 'ภก.', 'พว.', 'นาย', 'นาง', 'นางสาว', 'น.ส.',
      'dr.', 'dr ', 'prof.', 'prof ', 'assoc. prof.', 'asst. prof.', 'mr.', 'mr ', 'mrs.', 'mrs ', 'ms.', 'ms ', 'rn.', 'rn '
    ];

    let cleanQ = rawQ;
    const lowerRaw = rawQ.toLowerCase();
    for (const prefix of prefixes) {
      if (lowerRaw.startsWith(prefix.toLowerCase())) {
        cleanQ = rawQ.slice(prefix.length).trim();
        break;
      }
    }

    const patternRaw = `%${rawQ}%`;
    const patternClean = `%${cleanQ}%`;

    // ค้นหาเลขที่สมาชิกแบบเติมศูนย์ 4 หลัก (เช่น 1 -> 0001)
    const numOnly = rawQ.replace(/\D/g, '');
    const paddedNum = numOnly ? numOnly.padStart(4, '0') : '';

    // ค้นหาข้อมูลสมาชิกแสดงเพียง 3 รายการตามที่ผู้ใช้ต้องการ (LIMIT 3)
    const membersRaw = await prisma.$queryRaw<RawMemberResult[]>`
      SELECT 
        m.member_no,
        m.id,
        m.full_name_th,
        m.full_name_en,
        m.id_last4,
        m.mobile,
        m.email,
        m.line_id,
        m.workplace,
        m.position,
        m.membership_status,
        m.membership_type,
        ma.checkin_time,
        mt.meeting_name,
        mt.meeting_date
      FROM members m
      LEFT JOIN LATERAL (
        SELECT checkin_time, meeting_id
        FROM meeting_attendances
        WHERE member_no = m.member_no
        ORDER BY checkin_time DESC NULLS LAST
        LIMIT 1
      ) ma ON true
      LEFT JOIN meetings mt ON mt.meeting_id = ma.meeting_id
      WHERE 
        m.full_name_th ILIKE ${patternRaw}
        OR m.full_name_en ILIKE ${patternRaw}
        OR m.full_name_th ILIKE ${patternClean}
        OR m.full_name_en ILIKE ${patternClean}
        OR m.member_no ILIKE ${patternRaw}
        OR (${paddedNum} != '' AND m.member_no = ${paddedNum})
        OR m.email ILIKE ${patternRaw}
        OR m.mobile ILIKE ${patternRaw}
        OR m.workplace ILIKE ${patternRaw}
      ORDER BY 
        CASE 
          WHEN m.member_no = ${paddedNum} THEN 1
          WHEN m.full_name_th ILIKE ${cleanQ} THEN 2
          WHEN m.full_name_th ILIKE ${patternClean} THEN 3
          ELSE 4
        END,
        m.member_no ASC
      LIMIT 3;
    `;

    const data = membersRaw.map(formatMemberRow);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('API /api/members/search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการค้นหาข้อมูลสมาชิกจากฐานข้อมูล',
      },
      { status: 500 }
    );
  }
}
