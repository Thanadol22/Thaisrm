import { NextRequest, NextResponse } from 'next/server';
import { getMemberByCodeOrNo } from '@/lib/services/memberService';
import { evaluateMemberAttendanceStatus } from '@/lib/services/membershipStatusService';
import { ApiResponse } from '@/types/member';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/members/verify/[code]
 * ตรวจสอบข้อมูลสมาชิกสำหรับสแกน QR Code หรือค้นหาด้วยเลขรหัส code / membership_no
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { code } = await context.params;

    if (!code || code.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสสมาชิกหรือรหัสโค้ด' },
        { status: 400 }
      );
    }

    const member = await getMemberByCodeOrNo(code);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: 'ไม่พบข้อมูลสมาชิกในระบบ TSRM',
        },
        { status: 404 }
      );
    }

    // ประเมินสถานะตามกฎการขาดประชุม 4 ครั้งล่าสุด
    let attendanceEvaluation = null;
    if (member.member_no) {
      attendanceEvaluation = await evaluateMemberAttendanceStatus(member.member_no);
    }

    const response: ApiResponse & { attendanceEvaluation?: typeof attendanceEvaluation } = {
      success: true,
      data: member,
      attendanceEvaluation,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/members/verify/[code] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}
