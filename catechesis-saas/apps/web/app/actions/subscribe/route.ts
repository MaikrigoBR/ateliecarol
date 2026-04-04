import { NextRequest, NextResponse } from 'next/server';
import { URLSearchParams } from 'node:url';
import {
  SESSION_COOKIE_NAME,
  apiRequest,
  buildSignInUrl,
  getSessionToken,
  resolveInternalPath
} from '../../../lib/auth-session';

function buildRedirectUrl(baseUrl: string, pathname: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return new URL(`${pathname}${query ? `?${query}` : ''}`, baseUrl);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim().toLowerCase();
  const planId = String(formData.get('planId') ?? '').trim();
  const redirectTo = resolveInternalPath(String(formData.get('redirectTo') ?? ''), `/tenant/${tenantSlug}`);
  const token = await getSessionToken();

  if (!tenantSlug || !planId) {
    return NextResponse.redirect(
      buildRedirectUrl(request.url, redirectTo, {
        subscription: 'error',
        message: 'Plano ou tenant invalidos.'
      })
    );
  }

  if (!token) {
    return NextResponse.redirect(new URL(buildSignInUrl(tenantSlug, redirectTo), request.url));
  }

  try {
    const response = await apiRequest<{
      enrollment: { id: string; planId: string };
      subscription: { status: string };
    }>('/subscriptions', {
      method: 'POST',
      token,
      tenantSlug,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId })
    });

    return NextResponse.redirect(
      buildRedirectUrl(request.url, redirectTo, {
        subscription: 'success',
        planId: response.enrollment.planId,
        enrollmentId: response.enrollment.id,
        status: response.subscription.status
      })
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Nao foi possivel iniciar a assinatura.';
    const response = NextResponse.redirect(
      buildRedirectUrl(request.url, redirectTo, {
        subscription: 'error',
        message
      })
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8
    });

    return response;
  }
}
