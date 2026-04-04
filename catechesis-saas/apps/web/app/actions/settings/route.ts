import { NextRequest, NextResponse } from 'next/server';
import {
  buildSignInUrl,
  getSessionToken,
  resolveInternalPath,
  saveTenantSettings
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
  const redirectTo = resolveInternalPath(String(formData.get('redirectTo') ?? ''), `/tenant/${tenantSlug}/admin`);
  const token = await getSessionToken();

  if (!tenantSlug) {
    return NextResponse.redirect(
      buildRedirectUrl(request.url, '/tenant/emmaus/admin', {
        saved: 'error',
        message: 'Tenant invalido.'
      })
    );
  }

  if (!token) {
    return NextResponse.redirect(new URL(buildSignInUrl(tenantSlug, redirectTo), request.url));
  }

  const youthFirstValue = String(formData.get('youthFirst') ?? 'current');
  const payload = {
    displayName: String(formData.get('displayName') ?? '').trim() || undefined,
    ageRangeLabel: String(formData.get('ageRangeLabel') ?? '').trim() || undefined,
    youthFirst: youthFirstValue === 'true' ? true : youthFirstValue === 'false' ? false : undefined
  };

  try {
    await saveTenantSettings(tenantSlug, token, payload);

    return NextResponse.redirect(
      buildRedirectUrl(request.url, redirectTo, {
        saved: 'success'
      })
    );
  } catch (error) {
    return NextResponse.redirect(
      buildRedirectUrl(request.url, redirectTo, {
        saved: 'error',
        message: error instanceof Error ? error.message : 'Nao foi possivel salvar as configuracoes.'
      })
    );
  }
}
