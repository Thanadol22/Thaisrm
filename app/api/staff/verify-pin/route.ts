import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string' || pin.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสผ่าน 6 หลัก' },
        { status: 400 }
      );
    }

    const staffPin = process.env.STAFF_PIN;

    if (!staffPin) {
      console.error('STAFF_PIN is not configured in .env');
      return NextResponse.json(
        { success: false, error: 'ระบบยังไม่ได้ตั้งค่ารหัสเจ้าหน้าที่' },
        { status: 500 }
      );
    }

    if (pin === staffPin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'รหัสผ่านไม่ถูกต้อง' },
      { status: 401 }
    );
  } catch (err: unknown) {
    console.error('Staff PIN Verification Error:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
