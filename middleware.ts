import { NextRequest, NextResponse } from 'next/server';
import {
  getClientIp,
  checkRateLimit,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ป้องกันเฉพาะ Endpoint ภายใต้ /api/*
  if (pathname.startsWith('/api')) {
    const ip = getClientIp(req);
    const method = req.method;

    // ข้าม Rate Limit สำหรับ Local Development หรือ Localhost เพื่อไม่ให้บล็อกการทำงานในเครื่อง
    if (
      process.env.NODE_ENV === 'development' ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === 'localhost'
    ) {
      return NextResponse.next();
    }

    // เลือกระดับความเข้มงวดตามประเภท Endpoint
    let profile = RATE_LIMIT_PROFILES.GENERAL_API;
    let identifier = `api:${ip}`;

    if (method === 'POST' && pathname === '/api/members') {
      profile = RATE_LIMIT_PROFILES.REGISTRATION;
      identifier = `register:${ip}`;
    } else if (pathname.startsWith('/api/members/verify')) {
      profile = RATE_LIMIT_PROFILES.VERIFY_QR;
      identifier = `verify:${ip}`;
    } else if (pathname === '/api/staff/verify-pin') {
      // ตรวจสอบรหัส Staff PIN (จำกัด 30 ครั้ง/นาที ป้องกันการสุ่มรหัส)
      profile = {
        maxRequests: 30,
        windowSeconds: 60,
        banDurationSeconds: 120,
        maxViolationsBeforeBan: 3,
      };
      identifier = `staff-pin:${ip}`;
    } else if (pathname.startsWith('/api/staff')) {
      // สำหรับการสแกนและ polling สถิติหน้างาน (ไม่บล็อกเจ้าหน้าที่จุดลงทะเบียนใน Wi-Fi เดียวกัน)
      profile = {
        maxRequests: 600,
        windowSeconds: 60,
        banDurationSeconds: 60,
        maxViolationsBeforeBan: 5,
      };
      identifier = `staff-portal:${ip}`;
    }

    const result = checkRateLimit(identifier, profile);

    // หากเกินโควตาคำขอ (Rate Limit Exceeded / DDoS Attempt)
    if (!result.success) {
      const errorMessage = result.isBanned
        ? `ระบบตรวจพบคำขอมากผิดปกติ IP ของคุณถูกระงับชั่วคราวเป็นเวลา ${result.retryAfterSeconds} วินาที`
        : `คุณส่งคำขอถี่เกินไป กรุณารออีก ${result.retryAfterSeconds} วินาที ก่อนลองใหม่อีกครั้ง`;

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: errorMessage,
          retry_after_seconds: result.retryAfterSeconds,
          is_banned: result.isBanned,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfterSeconds.toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetSeconds.toString(),
          },
        }
      );
    }

    // ผ่านการตรวจสอบ: ส่งต่อ Request พร้อมแนบ RateLimit Headers
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', result.limit.toString());
    res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    res.headers.set('X-RateLimit-Reset', result.resetSeconds.toString());
    return res;
  }

  return NextResponse.next();
}

// กำหนดขอบเขตการทำงานของ Middleware ให้ครอบคลุมทุก API route
export const config = {
  matcher: ['/api/:path*'],
};
