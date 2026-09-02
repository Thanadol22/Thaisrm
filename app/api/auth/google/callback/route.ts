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
    const jwtSecret = process.env.JWT_SECRET;
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('localhost'))
      ? process.env.GOOGLE_REDIRECT_URI
      : `${origin}/api/auth/google/callback`;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in .env');
    }

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
      jwtSecret,
      { expiresIn: '7d' }
    );

    const state = searchParams.get('state');
    const redirectUrl = state === 'signup'
      ? `${origin}/signup?autofill=true`
      : `${origin}/login/callback`;

    const response = NextResponse.redirect(redirectUrl);

    // Set token as httpOnly cookie (secure, not visible in URL)
    response.cookies.set('thaisrm_token', appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Set user data as a regular cookie (readable by client JS for UI display)
    response.cookies.set('thaisrm_user', JSON.stringify({ googleId, email, name, picture }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('Google OAuth Callback Error:', err);
    const message = err instanceof Error ? err.message : 'OAuth Verification Failed';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }
}

