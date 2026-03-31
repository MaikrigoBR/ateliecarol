import type { TenantSettings, TenantSummary } from '@catechesis-saas/types';

export interface TenantContextValue {
  tenant: TenantSummary;
  settings: TenantSettings;
}
