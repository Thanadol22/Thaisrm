import { NextRequest, NextResponse } from 'next/server';
import { getMemberById, updateMember, deleteMember } from '@/lib/services/memberService';
import { validateUpdateMember } from '@/lib/validators/memberValidator';
import { UpdateMemberInput, ApiResponse } from '@/types/member';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/members/[id]
 * ดึงข้อมูลสมาชิกรายบุคคลตาม ID
 */
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Member ID' },
        { status: 400 }
      );
    }

    const member = await getMemberById(id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลสมาชิกที่ระบุ' },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: member,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/members/[id] GET error:', err);
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
 * PUT /api/members/[id]
 * แก้ไขข้อมูลสมาชิก
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Member ID' },
        { status: 400 }
      );
    }

    const body: UpdateMemberInput = await req.json();

    // ตรวจสอบความถูกต้องของข้อมูลที่จะอัปเดต (Validation & Verification)
    const validation = await validateUpdateMember(id, body);
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

    const updated = await updateMember(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบสมาชิกที่ต้องการแก้ไข หรือไม่สามารถแก้ไขข้อมูลได้' },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/members/[id] PUT error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members/[id]
 * ลบข้อมูลสมาชิก
 */
export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Member ID' },
        { status: 400 }
      );
    }

    const success = await deleteMember(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบข้อมูลสมาชิกได้ หรือไม่พบ ID นี้' },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'ลบข้อมูลสมาชิกสำเร็จ' },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/members/[id] DELETE error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}
