import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const origin = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    const googleClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error('ไม่ได้รับ ID Token จาก Google');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('ข้อมูลผู้ใช้งานจาก Google ไม่ถูกต้อง');
    }

    const { sub: googleId, email, name, picture } = payload;

    const appToken = jwt.sign(
      { googleId, email, name, picture },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    const userParam = encodeURIComponent(JSON.stringify({ googleId, email, name, picture }));
    return NextResponse.redirect(`${origin}/login/callback?token=${appToken}&user=${userParam}`);
  } catch (err: any) {
    console.error('Google OAuth Callback Error:', err);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'OAuth Verification Failed')}`);
  }
}
