import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import type { DeepPartial, TenantSettings } from '@catechesis-saas/types';
import { ControlPlanePrismaService } from '../../database/control-plane-prisma.service.js';
import { TenantClientFactory } from '../../database/tenant-client.factory.js';
import {
  fallbackTenantSettings,
  fallbackTenants,
  getFallbackTenant,
  getFallbackTenantSettings
} from '../../demo/fallback-data.js';

const runtimeTenantOverrides = new Map<string, DeepPartial<TenantSettings>>();

function mergePartialSettings(
  base: DeepPartial<TenantSettings>,
  overrides: DeepPartial<TenantSettings>
): DeepPartial<TenantSettings> {
  return {
    ...base,
    ...overrides,
    branding: { ...base.branding, ...overrides.branding },
    audience: { ...base.audience, ...overrides.audience },
    billing: { ...base.billing, ...overrides.billing },
    pedagogy: { ...base.pedagogy, ...overrides.pedagogy },
    notifications: { ...base.notifications, ...overrides.notifications }
  };
}

@Injectable()
export class TenantService {
  constructor(
    @Inject(ControlPlanePrismaService)
    private readonly controlPlanePrisma: ControlPlanePrismaService,
    @Inject(TenantClientFactory)
    private readonly tenantClientFactory: TenantClientFactory
  ) {}

  async listTenants() {
    try {
      const prisma = await this.controlPlanePrisma.client();
      const rows = await prisma.tenant.findMany({
        include: {
          domains: {
            where: { isPrimary: true },
            take: 1
          }
        },
        orderBy: {
          displayName: 'asc'
        }
      });

      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        schemaName: row.schemaName,
        status: row.status.toLowerCase() as 'active' | 'paused' | 'archived',
        paymentMode: row.paymentMode,
        customDomain: row.domains[0]?.host
      }));
    } catch {
      return fallbackTenants;
    }
  }

  async resolveTenant(slug: string) {
    const tenants = await this.listTenants();
    const tenant = tenants.find((item) => item.slug === slug) ?? getFallbackTenant('emmaus');

    if (!tenant) {
      throw new NotFoundException(`Tenant ${slug} not found`);
    }

    return {
      tenant,
      settings: await this.getEffectiveSettings(tenant.slug)
    };
  }

  async getEffectiveSettings(slug: string) {
    const tenant = getFallbackTenant(slug);
    const baseSettings = mergeTenantSettings(platformDefaults, fallbackTenantSettings[slug] ?? {});
    const runtimeOverridesForTenant = runtimeTenantOverrides.get(slug) ?? {};

    if (!tenant) {
      return mergeTenantSettings(baseSettings, runtimeOverridesForTenant);
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const rows = await client.tenantSetting.findMany();
      const overrides = rows.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      return mergeTenantSettings(
        mergeTenantSettings(baseSettings, overrides as Partial<TenantSettings>),
        runtimeOverridesForTenant
      );
    } catch {
      return mergeTenantSettings(baseSettings, runtimeOverridesForTenant);
    }
  }

  async saveTenantSettingsPatch(slug: string, overrides: DeepPartial<TenantSettings>) {
    const tenant = getFallbackTenant(slug);
    const currentRuntimeOverrides = runtimeTenantOverrides.get(slug) ?? {};
    const mergedRuntimeOverrides = mergePartialSettings(currentRuntimeOverrides, overrides);

    runtimeTenantOverrides.set(slug, mergedRuntimeOverrides);

    if (tenant) {
      try {
        const client = await this.tenantClientFactory.getClient(tenant.schemaName);

        if (mergedRuntimeOverrides.branding) {
          await client.tenantSetting.upsert({
            where: { key: 'branding' },
            update: { value: mergedRuntimeOverrides.branding },
            create: {
              key: 'branding',
              value: mergedRuntimeOverrides.branding
            }
          });
        }

        if (mergedRuntimeOverrides.audience) {
          await client.tenantSetting.upsert({
            where: { key: 'audience' },
            update: { value: mergedRuntimeOverrides.audience },
            create: {
              key: 'audience',
              value: mergedRuntimeOverrides.audience
            }
          });
        }
      } catch {
        // Keep runtime overrides available even when persistence is unavailable.
      }
    }

    return this.getEffectiveSettings(slug);
  }

  getDemoSettings(slug: string) {
    return getFallbackTenantSettings(slug);
  }
}
