import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/google/url', { cache: 'no-store' });
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาตรวจสอบว่าเซิร์ฟเวอร์ Express (http://localhost:5000) สตาร์ทเรียบร้อยแล้ว' },
        { status: 500 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'ไม่สามารถเชื่อมต่อ Express Backend (http://localhost:5000) ได้' },
      { status: 500 }
    );
  }
}
