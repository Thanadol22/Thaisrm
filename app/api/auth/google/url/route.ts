import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const origin = req.nextUrl.origin;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('localhost:5000')
      ? process.env.GOOGLE_REDIRECT_URI
      : `${origin}/api/auth/google/callback`;

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID ใน Environment Variables' },
        { status: 400 }
      );
    }

    const googleClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'select_account',
    });

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Google Auth URL Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการสร้าง Google OAuth URL' },
      { status: 500 }
    );
  }
}
