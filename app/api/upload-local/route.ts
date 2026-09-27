import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// ขนาดไฟล์สูงสุด: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME types ที่อนุญาต
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

// Folders ที่อนุญาต (whitelist — ป้องกัน path traversal)
const ALLOWED_FOLDERS = new Set(['slips', 'photos', 'docs', 'uploads']);

export async function POST(request: NextRequest) {
  // ─── Authentication Check ─────────────────────────────────────────────
  const adminSession = getAdminSessionFromRequest(request);
  const userSession = await auth();

  if (!adminSession && !userSession) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์' },
      { status: 401 }
    );
  }
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

    // ตรวจสอบ MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, WEBP, GIF, PDF เท่านั้น)' },
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    // Sanitize filename — อนุญาตเฉพาะตัวอักษร ตัวเลข - . _
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    const filename = `${timestamp}_${sanitizedName}`;

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
      fileName: sanitizedName,
    });
  } catch (error: any) {
    console.error('Error saving local file:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
