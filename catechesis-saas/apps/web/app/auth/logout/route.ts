import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, resolveInternalPath } from '../../../lib/auth-session';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const redirectTo = resolveInternalPath(String(formData.get('redirectTo') ?? '/'), '/');
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return response;
}
