import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'tsrm_admin_session';
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

interface AdminSessionPayload {
  username: string;
  role: 'admin';
  issuedAt: number;
  expiresAt: number;
}

/**
 * Get the secret used for signing session cookies
 */
function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not configured. Admin authentication is disabled.');
  }
  return secret;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    // Hash both to equalize length before comparison to avoid leaking length via timing
    const hashA = crypto.createHash('sha256').update(bufA).digest();
    const hashB = crypto.createHash('sha256').update(bufB).digest();
    crypto.timingSafeEqual(hashA, hashB);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Hash a password using bcrypt (cost factor 12)
 * ใช้แทน SHA-256 + hardcoded salt เพื่อความปลอดภัยที่สูงขึ้น
 */
export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify admin credentials against environment variables
 * รองรับทั้ง bcrypt hash (ADMIN_PASSWORD_HASH) และ plaintext (ADMIN_PASSWORD)
 * Production ควรใช้ ADMIN_PASSWORD_HASH เท่านั้น
 */
export async function verifyAdminCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<boolean> {
  const configuredUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  // Reject if neither password nor password hash is configured
  if (!configuredPassword && !configuredPasswordHash) {
    console.error('ADMIN_PASSWORD or ADMIN_PASSWORD_HASH environment variable is not configured.');
    return false;
  }

  // ใน production บังคับใช้ hash เท่านั้น
  if (process.env.NODE_ENV === 'production' && !configuredPasswordHash) {
    console.error('ADMIN_PASSWORD_HASH is required in production. Please set it in your environment variables.');
    return false;
  }

  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();

  // 1. Verify username (timing-safe)
  if (!timingSafeCompare(cleanUser.toLowerCase(), configuredUsername.toLowerCase())) {
    return false;
  }

  // 2. Verify password using bcrypt hash if available (preferred)
  if (configuredPasswordHash) {
    try {
      return await bcrypt.compare(cleanPass, configuredPasswordHash);
    } catch {
      return false;
    }
  }

  // 3. Fallback: direct timing-safe comparison with plaintext (dev only)
  return timingSafeCompare(cleanPass, configuredPassword!);
}

/**
 * Create a signed session token
 */
export function createAdminSessionToken(username: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    username,
    role: 'admin',
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE,
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
 * Verify and decode a signed session token
 */
export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
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
    const payload: AdminSessionPayload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) {
      return null; // Expired
    }

    if (payload.role !== 'admin') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Check admin authentication from NextRequest headers/cookies
 */
export function getAdminSessionFromRequest(req: NextRequest): AdminSessionPayload | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value || req.cookies.get('thaisrm_admin_session')?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
