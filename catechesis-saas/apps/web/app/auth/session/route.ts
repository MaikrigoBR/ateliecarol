import { NextRequest, NextResponse } from 'next/server';
import type { AuthenticatedUser } from '@catechesis-saas/types';
import {
  SESSION_COOKIE_NAME,
  buildSignInUrl,
  getApiBaseUrl,
  getDefaultDestination,
  resolveInternalPath
} from '../../../lib/auth-session';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const tenantSlug = String(formData.get('tenantSlug') ?? '').trim().toLowerCase();
  const requestedDestination = String(formData.get('destination') ?? '');
  const fallbackDestination = tenantSlug ? `/tenant/${tenantSlug}` : '/';
  const destination = resolveInternalPath(requestedDestination, fallbackDestination);

  if (!email || !password || !tenantSlug) {
    return NextResponse.redirect(
      new URL(buildSignInUrl(tenantSlug || 'emmaus', destination, 'Preencha email, senha e tenant.'), request.url)
    );
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantSlug
      },
      body: JSON.stringify({
        email,
        password,
        tenantSlug
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      let message = 'Nao foi possivel autenticar com essas credenciais.';

      try {
        const payload = (await response.json()) as { message?: string | string[] };
        const parsedMessage = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
        if (parsedMessage) {
          message = parsedMessage;
        }
      } catch {
        // Fall back to the default message.
      }

      return NextResponse.redirect(new URL(buildSignInUrl(tenantSlug, destination, message), request.url));
    }

    const session = (await response.json()) as {
      accessToken: string;
      user: AuthenticatedUser;
    };
    const redirectTarget = resolveInternalPath(
      requestedDestination,
      getDefaultDestination(session.user, tenantSlug)
    );
    const nextResponse = NextResponse.redirect(new URL(redirectTarget, request.url));

    nextResponse.cookies.set(SESSION_COOKIE_NAME, session.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8
    });

    return nextResponse;
  } catch {
    return NextResponse.redirect(
      new URL(buildSignInUrl(tenantSlug, destination, 'API indisponivel no momento.'), request.url)
    );
  }
}
