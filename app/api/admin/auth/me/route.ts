import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      username: session.username,
      role: session.role,
      expiresAt: session.expiresAt,
    },
  });
}
