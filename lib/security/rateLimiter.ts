import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
  bannedUntil?: number;
  violationCount: number;
}

interface RateLimitConfig {
  /** จำนวนคำขอสูงสุดที่อนุญาตในช่วงเวลา */
  maxRequests: number;
  /** หน้าต่างเวลาในหน่วยวินาที (เช่น 60 = 1 นาที) */
  windowSeconds: number;
  /** ระยะเวลาแบนชั่วคราวเมื่อทำผิดซ้ำ (วินาที, ค่าเริ่มต้น: 300 วินาที / 5 นาที) */
  banDurationSeconds?: number;
  /** จำนวนครั้งที่เกิน Limit ก่อนจะเริ่มแบน IP (ค่าเริ่มต้น: 3 ครั้ง) */
  maxViolationsBeforeBan?: number;
}

// In-Memory IP Store
const ipStore = new Map<string, RateLimitRecord>();

// ตั้งเวลากวาดล้าง IP เก่าที่หมดอายุทุกๆ 5 นาที เพื่อไม่ให้กิน Memory
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (record.bannedUntil && record.bannedUntil > now) continue;
      // ลบ timestamps ที่เก่าเกิน 10 นาที
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000);
      if (record.timestamps.length === 0 && (!record.bannedUntil || record.bannedUntil <= now)) {
        ipStore.delete(key);
      }
    }
  }, 300000); // 5 minutes
}

/**
 * ดึง Client IP Address จาก Request Headers
 */
export function getClientIp(req: NextRequest): string {
  // Cloudflare, AWS, Nginx, Vercel standard proxy headers
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    if (parts.length > 0 && parts[0].trim() !== '') {
      return parts[0].trim();
    }
  }

  return '127.0.0.1'; // Fallback for local development
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  isBanned: boolean;
  retryAfterSeconds: number;
}

/**
 * ตรวจสอบ Rate Limit (Sliding Window Algorithm พร้อม Temporary IP Banning)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const banDurationMs = (config.banDurationSeconds || 300) * 1000;
  const maxViolations = config.maxViolationsBeforeBan || 3;

  let record = ipStore.get(identifier);

  if (!record) {
    record = {
      timestamps: [],
      violationCount: 0,
    };
    ipStore.set(identifier, record);
  }

  // 1. ตรวจสอบว่า IP กำลังถูกแบนอยู่หรือไม่
  if (record.bannedUntil && record.bannedUntil > now) {
    const retryAfter = Math.ceil((record.bannedUntil - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: retryAfter,
      isBanned: true,
      retryAfterSeconds: retryAfter,
    };
  }

  // 2. กรอง timestamps ที่ยังอยู่ในหน้าต่างเวลา (Sliding Window)
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  // 3. ตรวจสอบว่าจำนวนคำขอเกิน Limit หรือไม่
  if (record.timestamps.length >= config.maxRequests) {
    record.violationCount += 1;

    // หากทำผิดซ้ำเกินเกณฑ์ ให้เริ่มแบน IP ชั่วคราว (Anti-DDoS / Brute-force protection)
    if (record.violationCount >= maxViolations) {
      record.bannedUntil = now + banDurationMs;
      const retryAfter = Math.ceil(banDurationMs / 1000);
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetSeconds: retryAfter,
        isBanned: true,
        retryAfterSeconds: retryAfter,
      };
    }

    const oldest = record.timestamps[0];
    const resetTime = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: resetTime,
      isBanned: false,
      retryAfterSeconds: resetTime,
    };
  }

  // 4. ผ่านการตรวจสอบ: บันทึก Timestamp ใหม่
  record.timestamps.push(now);
  const remaining = Math.max(0, config.maxRequests - record.timestamps.length);
  const oldest = record.timestamps[0];
  const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

  return {
    success: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
    isBanned: false,
    retryAfterSeconds: 0,
  };
}

/**
 * ค่าคอนฟิกเริ่มต้นสำหรับแต่ละระดับความเข้มงวด
 */
export const RATE_LIMIT_PROFILES = {
  // สำหรับการลงทะเบียนสมาชิก (POST /api/members): จำกัด 10 requests / นาที ป้องกัน Spam/Flood bot
  REGISTRATION: {
    maxRequests: 10,
    windowSeconds: 60,
    banDurationSeconds: 600, // แบน 10 นาทีหากยิงซ้ำรัวๆ
    maxViolationsBeforeBan: 3,
  },
  // สำหรับการสแกน QR / ตรวจสอบรหัส (GET /api/members/verify/*): จำกัด 60 requests / นาที
  VERIFY_QR: {
    maxRequests: 60,
    windowSeconds: 60,
    banDurationSeconds: 300,
    maxViolationsBeforeBan: 5,
  },
  // สำหรับ API ทั่วไป: จำกัด 120 requests / นาที
  GENERAL_API: {
    maxRequests: 120,
    windowSeconds: 60,
    banDurationSeconds: 300,
    maxViolationsBeforeBan: 5,
  },
};
