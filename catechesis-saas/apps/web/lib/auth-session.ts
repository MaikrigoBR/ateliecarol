import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  AuthenticatedUser,
  EnrollmentSummary,
  PlanSummary,
  Role,
  TenantSettings
} from '@catechesis-saas/types';

export const SESSION_COOKIE_NAME = 'catechesis_access_token';

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  tenantSlug?: string;
};

type ApiError = Error & {
  status?: number;
};

export function getApiBaseUrl() {
  return process.env.CATECHESIS_API_BASE_URL ?? 'http://localhost:4000/api';
}

export function resolveInternalPath(candidate: string | null | undefined, fallback: string) {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}

export function buildSignInUrl(tenantSlug: string, destination?: string, error?: string) {
  const searchParams = new URLSearchParams();

  if (destination) {
    searchParams.set('next', destination);
  }

  if (error) {
    searchParams.set('error', error);
  }

  const query = searchParams.toString();
  return `/tenant/${tenantSlug}/sign-in${query ? `?${query}` : ''}`;
}

async function buildApiError(response: Response) {
  const error = new Error(`API request failed with status ${response.status}`) as ApiError;
  error.status = response.status;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;

    if (message) {
      error.message = message;
    }
  } catch {
    // Keep the default message when the body is not JSON.
  }

  return error;
}

export async function apiRequest<T>(pathname: string, options: ApiRequestOptions = {}) {
  const { token, tenantSlug, headers, cache = 'no-store', ...init } = options;
  const response = await fetch(`${getApiBaseUrl()}${pathname}`, {
    ...init,
    cache,
    headers: {
      Accept: 'application/json',
      ...(tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as T;
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getSessionUser(tenantSlug: string) {
  const token = await getSessionToken();

  if (!token) {
    return { token: null, user: null as AuthenticatedUser | null };
  }

  try {
    const payload = await apiRequest<{ user: AuthenticatedUser }>('/auth/me', {
      method: 'GET',
      token,
      tenantSlug
    });

    return { token, user: payload.user };
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 401 || apiError.status === 403) {
      return { token, user: null as AuthenticatedUser | null };
    }

    throw error;
  }
}

export function canAccessTenant(user: AuthenticatedUser, tenantSlug: string) {
  return user.tenantSlug === tenantSlug || user.roles.includes('DEVELOPER');
}

export function hasAnyRole(user: AuthenticatedUser, roles: Role[]) {
  return roles.some((role) => user.roles.includes(role));
}

export function getDefaultDestination(user: AuthenticatedUser, tenantSlug: string) {
  if (user.roles.includes('ADMINISTRATOR') || user.roles.includes('DEVELOPER')) {
    return `/tenant/${tenantSlug}/admin`;
  }

  if (user.roles.includes('TEACHER')) {
    return `/tenant/${tenantSlug}/teacher`;
  }

  return `/tenant/${tenantSlug}`;
}

export async function requireTenantUser(tenantSlug: string, destination: string) {
  const session = await getSessionUser(tenantSlug);

  if (!session.user || !canAccessTenant(session.user, tenantSlug)) {
    redirect(buildSignInUrl(tenantSlug, destination));
  }

  return {
    token: session.token as string,
    user: session.user as AuthenticatedUser
  };
}

export async function getEffectiveSettings(tenantSlug: string, token: string) {
  return apiRequest<TenantSettings>('/settings/effective', {
    method: 'GET',
    token,
    tenantSlug
  });
}

export async function getTenantConfigLayers(tenantSlug: string, token: string) {
  return apiRequest<{
    platformDefaults: TenantSettings;
    tenantSettings: TenantSettings;
  }>('/settings/layers', {
    method: 'GET',
    token,
    tenantSlug
  });
}

export async function getTenantCourses(tenantSlug: string, token?: string | null) {
  return apiRequest<{
    courses: Array<{
      id: string;
      slug: string;
      title: string;
      audienceLabel: string;
      moduleCount: number;
      progressLabel?: string;
    }>;
  }>('/catalog/courses', {
    method: 'GET',
    token,
    tenantSlug
  });
}

export async function getTenantPlans(tenantSlug: string) {
  return apiRequest<{
    plans: PlanSummary[];
  }>('/catalog/plans', {
    method: 'GET',
    tenantSlug
  });
}

export async function previewTenantSettings(
  tenantSlug: string,
  token: string,
  overrides: {
    displayName?: string;
    ageRangeLabel?: string;
    youthFirst?: boolean;
  }
) {
  return apiRequest<TenantSettings>('/settings/tenant-preview', {
    method: 'PATCH',
    token,
    tenantSlug,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(overrides)
  });
}

export async function saveTenantSettings(
  tenantSlug: string,
  token: string,
  overrides: {
    displayName?: string;
    ageRangeLabel?: string;
    youthFirst?: boolean;
  }
) {
  return apiRequest<TenantSettings>('/settings/tenant', {
    method: 'PATCH',
    token,
    tenantSlug,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(overrides)
  });
}

export async function getStudentSubscriptions(tenantSlug: string, token: string, studentIdentityId?: string) {
  const searchParams = new URLSearchParams();

  if (studentIdentityId) {
    searchParams.set('studentIdentityId', studentIdentityId);
  }

  return apiRequest<{
    items: EnrollmentSummary[];
  }>(`/subscriptions/mine${searchParams.toString() ? `?${searchParams}` : ''}`, {
    method: 'GET',
    token,
    tenantSlug
  });
}
