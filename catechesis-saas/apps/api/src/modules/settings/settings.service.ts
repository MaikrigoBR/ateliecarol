import { Inject, Injectable } from '@nestjs/common';
import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import type { DeepPartial, TenantSettings } from '@catechesis-saas/types';
import { TenantService } from '../tenant/tenant.service.js';

@Injectable()
export class SettingsService {
  constructor(@Inject(TenantService) private readonly tenantService: TenantService) {}

  async getEffectiveSettings(slug: string) {
    return this.tenantService.getEffectiveSettings(slug);
  }

  async previewMergedSettings(slug: string, overrides: DeepPartial<TenantSettings>) {
    return mergeTenantSettings(await this.getEffectiveSettings(slug), overrides);
  }

  async getConfigLayers(slug: string) {
    return {
      platformDefaults,
      tenantSettings: await this.tenantService.getEffectiveSettings(slug)
    };
  }
}
