import { Injectable, NotFoundException } from '@nestjs/common';
import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import type { TenantSettings } from '@catechesis-saas/types';
import { ControlPlanePrismaService } from '../../database/control-plane-prisma.service.js';
import { TenantClientFactory } from '../../database/tenant-client.factory.js';
import {
  fallbackTenantSettings,
  fallbackTenants,
  getFallbackTenant,
  getFallbackTenantSettings
} from '../../demo/fallback-data.js';

@Injectable()
export class TenantService {
  constructor(
    private readonly controlPlanePrisma: ControlPlanePrismaService,
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

    if (!tenant) {
      return baseSettings;
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const rows = await client.tenantSetting.findMany();
      const overrides = rows.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      return mergeTenantSettings(baseSettings, overrides as Partial<TenantSettings>);
    } catch {
      return baseSettings;
    }
  }

  getDemoSettings(slug: string) {
    return getFallbackTenantSettings(slug);
  }
}
