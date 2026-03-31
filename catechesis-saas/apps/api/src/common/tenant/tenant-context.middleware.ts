import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { TenantSummary } from '@catechesis-saas/types';
import { getFallbackTenant, getFallbackTenantSettings } from '../../demo/fallback-data.js';
import type { TenantContextValue } from './tenant-context.js';

function normalizeHost(host?: string): string | undefined {
  const normalized = host?.split(':')[0]?.toLowerCase();

  if (!normalized || normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return undefined;
  }

  if (normalized.endsWith('.local')) {
    return normalized.replace('.local', '');
  }

  return normalized.includes('.') ? normalized.split('.')[0] : undefined;
}

function buildTenantSummary(slug: string): TenantSummary {
  const fallbackTenant = getFallbackTenant(slug);

  if (fallbackTenant) {
    return fallbackTenant;
  }

  return {
    id: `tenant-${slug}`,
    slug,
    schemaName: `tenant_${slug.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`,
    status: 'active',
    paymentMode: 'HYBRID'
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    const slug = String(
      request.headers['x-tenant-slug'] ||
        request.query.tenant ||
        normalizeHost(request.headers.host) ||
        process.env.NEXT_PUBLIC_DEFAULT_TENANT ||
        'emmaus'
    );

    request.tenantContext = {
      tenant: buildTenantSummary(slug),
      settings: getFallbackTenantSettings(slug)
    } satisfies TenantContextValue;

    next();
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: TenantContextValue;
  }
}
