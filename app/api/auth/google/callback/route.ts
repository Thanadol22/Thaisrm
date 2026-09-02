import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const queryString = searchParams.toString();

  try {
    const backendRes = await fetch(`http://localhost:5000/api/auth/google/callback?${queryString}`, {
      cache: 'no-store',
      redirect: 'manual',
    });

    const location = backendRes.headers.get('location');
    if (location) {
      return NextResponse.redirect(location);
    }

    const text = await backendRes.text();
    return new NextResponse(text, {
      status: backendRes.status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Callback connection error' },
      { status: 500 }
    );
  }
}
