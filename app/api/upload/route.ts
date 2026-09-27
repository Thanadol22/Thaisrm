import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';


export const dynamic = 'force-dynamic';

// ขนาดไฟล์สูงสุดที่อนุญาต: 10 MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// MIME types ที่อนุญาต
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ─── Authentication Check ─────────────────────────────────────────────
  // ต้องมีสิทธิ์อย่างใดอย่างหนึ่ง: Admin session หรือ Google OAuth session
  const adminSession = getAdminSessionFromRequest(request);
  const userSession = await auth();

  if (!adminSession && !userSession) {
    return NextResponse.json(
      { error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์' },
      { status: 401 }
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  const body = (await request.json()) as HandleUploadBody;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN is not configured in environment variables.');
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // ตรวจสอบขนาดไฟล์จาก Content-Length (ถ้ามี)
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
          throw new Error('ขนาดไฟล์เกินกำหนด (สูงสุด 10 MB)');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString(),
            uploadedBy: adminSession
              ? 'admin'
              : (userSession as any)?.user?.email || 'user',
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('Error handling blob upload:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 400 }
    );
  }
}
