import { NextRequest, NextResponse } from 'next/server';
import { createMember, getMembers } from '@/lib/services/memberService';
import { validateCreateMember } from '@/lib/validators/memberValidator';
import { CreateMemberInput, ApiResponse } from '@/types/member';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/members
 * ดึงรายการสมาชิก พร้อมรองรับ Search, Filter และ Pagination
 * Query Parameters:
 *   - search: string (ค้นหาจากชื่อ, รหัส, เลขสมาชิก, เบอร์โทร, อีเมล, ที่ทำงาน)
 *   - member_type: number (0-6)
 *   - page: number (default: 1)
 *   - limit: number (default: 20)
 *   - sort_by: string ('created_at' | 'updated_at' | 'full_name_th' | 'code' | 'membership_no')
 *   - order: string ('asc' | 'desc')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || undefined;
    const member_type = searchParams.get('member_type') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sort_by = (searchParams.get('sort_by') as any) || 'created_at';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = (searchParams.get('order') as any) || 'desc';

    const result = await getMembers({
      search,
      member_type,
      page,
      limit,
      sort_by,
      order,
    });

    const response: ApiResponse = {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/members GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members
 * บันทึกใบสมัครสมาชิกใหม่
 * Body: CreateMemberInput
 */
export async function POST(req: NextRequest) {
  try {
    const body: CreateMemberInput = await req.json();

    // ตรวจสอบความถูกต้องของข้อมูล (Validation & Verification)
    const validation = await validateCreateMember(body, { checkDuplicates: true });
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.errors[0]?.message || 'ข้อมูลไม่ถูกต้องตามเงื่อนไข',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // สร้างสมาชิกใหม่
    const newMember = await createMember(body);

    const response: ApiResponse = {
      success: true,
      data: newMember,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    console.error('API /api/members POST error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}
