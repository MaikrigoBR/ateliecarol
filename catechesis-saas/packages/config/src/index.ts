import type { CoursePlanSnapshot, DeepPartial, TenantSettings } from '@catechesis-saas/types';

export const platformDefaults: TenantSettings = {
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  branding: {
    displayName: 'Plataforma de Formacao',
    shortName: 'Formacao+',
    primaryColor: '#d4622f',
    accentColor: '#f2c46d',
    surfaceColor: '#fff7ee',
    heroTone: 'youth'
  },
  audience: {
    ageRangeLabel: '13 a 17 anos',
    youthFirst: true,
    inclusiveForAdults: true,
    toneOfVoice: 'energized',
    consentMode: 'self_service'
  },
  billing: {
    interval: 1,
    intervalUnit: 'month',
    gracePeriodDays: 5,
    retryPolicy: [1, 3, 7],
    paymentOwnershipMode: 'HYBRID'
  },
  pedagogy: {
    minimumGrade: 7,
    maxAttempts: 3,
    releaseMode: 'manual',
    allowTeacherReopen: true
  },
  notifications: {
    emailEnabled: true,
    inAppEnabled: true,
    whatsappEnabled: false
  }
};

export function mergeTenantSettings(
  base: TenantSettings,
  overrides: DeepPartial<TenantSettings>
): TenantSettings {
  return {
    ...base,
    ...overrides,
    branding: { ...base.branding, ...overrides.branding },
    audience: { ...base.audience, ...overrides.audience },
    billing: {
      ...base.billing,
      ...overrides.billing,
      retryPolicy:
        overrides.billing?.retryPolicy?.filter((value): value is number => value !== undefined) ??
        base.billing.retryPolicy
    },
    pedagogy: { ...base.pedagogy, ...overrides.pedagogy },
    notifications: { ...base.notifications, ...overrides.notifications }
  };
}

export function createPlanSnapshot(
  planId: string,
  title: string,
  settings: TenantSettings
): CoursePlanSnapshot {
  return {
    planId,
    title,
    billing: settings.billing,
    pedagogy: settings.pedagogy,
    capturedAt: new Date().toISOString()
  };
}
