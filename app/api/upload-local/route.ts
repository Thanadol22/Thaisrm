import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { auth } from '@/auth';
import { getClientIp, checkRateLimit } from '@/lib/security/rateLimiter';
import { validateFileBuffer, sanitizeFileName } from '@/lib/security/fileValidator';

export const dynamic = 'force-dynamic';

// ขนาดไฟล์สูงสุด: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Folders ที่อนุญาต (whitelist — ป้องกัน path traversal)
const ALLOWED_FOLDERS = new Set(['slips', 'photos', 'docs', 'uploads', 'avatars', 'documents', 'programs']);

export async function POST(request: NextRequest) {
  // ─── Rate Limiting (สูงสุด 30 ไฟล์ / 1 นาที ต่อ IP) ──────────────────────
  const clientIp = getClientIp(request);
  const rateLimitRes = checkRateLimit(`upload:${clientIp}`, {
    maxRequests: 30,
    windowSeconds: 60,
    banDurationSeconds: 300,
    maxViolationsBeforeBan: 3,
  });

  if (!rateLimitRes.success) {
    return NextResponse.json(
      { success: false, error: 'มีการอัปโหลดไฟล์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRes.retryAfterSeconds) } }
    );
  }

  // ─── Source Tracking ─────────────────────────────────────────────────
  const adminSession = getAdminSessionFromRequest(request);
  const userSession = await auth();
  const uploaderIdentifier = adminSession
    ? 'admin'
    : (userSession as any)?.user?.email || 'guest_or_applicant';
  // ─────────────────────────────────────────────────────────────────────

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderInput = (formData.get('folder') as string) || 'slips';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ขนาดไฟล์เกินกำหนด (สูงสุด 10 MB)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ─── Magic Bytes Verification (ตรวจสอบโครงสร้างไฟล์จริง) ──────────────
    const validation = validateFileBuffer(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'ไฟล์ไม่ถูกต้องหรือไม่ปลอดภัย' },
        { status: 400 }
      );
    }

    // ตรวจสอบ folder (whitelist — ป้องกัน path traversal)
    const sanitizedFolder = folderInput.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!ALLOWED_FOLDERS.has(sanitizedFolder)) {
      return NextResponse.json(
        { success: false, error: 'ปลายทางการอัปโหลดไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const filename = `${timestamp}_${safeName}`;

    // Target directory: public/uploads/<folder>
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', sanitizedFolder);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);

    // ตรวจสอบ path traversal (path ต้องอยู่ภายใน uploadDir)
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json(
        { success: false, error: 'เส้นทางไฟล์ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${sanitizedFolder}/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: safeName,
    });
  } catch (error: any) {
    console.error('Error saving local file:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
