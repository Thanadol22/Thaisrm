import crypto from 'crypto';
import { NextRequest } from 'next/server';

export const OTP_SESSION_MAX_AGE_SECONDS = 20 * 60; // 20 minutes in seconds

export interface OtpSessionPayload {
  email: string;
  member_no?: string;
  sponsorId?: string;
  userType: 'member' | 'sponsor';
  issuedAt: number;
  expiresAt: number;
}

/**
 * Secret used for HMAC signing
 */
function getSigningSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'tsrm-otp-session-secret-salt-2026';
}

/**
 * Timing-safe string comparison
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    const hashA = crypto.createHash('sha256').update(bufA).digest();
    const hashB = crypto.createHash('sha256').update(bufB).digest();
    crypto.timingSafeEqual(hashA, hashB);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Create a signed session token after OTP verification
 */
export function createOtpSessionToken(params: {
  email: string;
  userType: 'member' | 'sponsor';
  member_no?: string;
  sponsorId?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OtpSessionPayload = {
    email: params.email.trim().toLowerCase(),
    userType: params.userType,
    member_no: params.member_no,
    sponsorId: params.sponsorId,
    issuedAt: now,
    expiresAt: now + OTP_SESSION_MAX_AGE_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = getSigningSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify a signed session token
 */
export function verifyOtpSessionToken(token: string): OtpSessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const secret = getSigningSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  if (!timingSafeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: OtpSessionPayload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract and verify token from Authorization header or body
 */
export function extractOtpSessionFromRequest(
  req: NextRequest,
  bodyToken?: string
): OtpSessionPayload | null {
  // 1. Try Bearer header
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyOtpSessionToken(token);
    if (payload) return payload;
  }

  // 2. Try body token
  if (bodyToken) {
    const payload = verifyOtpSessionToken(bodyToken);
    if (payload) return payload;
  }

  // 3. Try custom header
  const customHeader = req.headers.get('x-session-token');
  if (customHeader) {
    const payload = verifyOtpSessionToken(customHeader);
    if (payload) return payload;
  }

  return null;
}
