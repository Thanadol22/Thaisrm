import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
} from '@/lib/security/adminAuth';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate Limiting: Max 5 attempts per minute, ban for 15 minutes if exceeded
    const rateLimitResult = checkRateLimit(`admin-login:${ip}`, {
      maxRequests: 5,
      windowSeconds: 60,
      banDurationSeconds: 900, // 15 minutes
      maxViolationsBeforeBan: 2,
    });

    if (!rateLimitResult.success) {
      const waitMins = Math.ceil(rateLimitResult.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `ตรวจพบการพยายามเข้าสู่ระบบผิดพลาดหลายครั้ง กรุณารออีกประมาณ ${waitMins} นาที ก่อนลองใหม่อีกครั้ง`,
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          isBanned: rateLimitResult.isBanned,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Verify credentials
    const isValid = verifyAdminCredentials(username, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Create session token
    const token = createAdminSessionToken(username.trim());

    // Create response with secure HttpOnly cookie
    const isProd = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        username: username.trim(),
        role: 'admin',
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    return response;
  } catch (err: unknown) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
