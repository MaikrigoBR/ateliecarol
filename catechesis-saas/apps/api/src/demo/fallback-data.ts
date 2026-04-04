import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import type {
  CourseSummary,
  DeepPartial,
  PlanSummary,
  Role,
  TenantSettings,
  TenantSummary,
  UserMembership
} from '@catechesis-saas/types';

export const fallbackTenantSettings: Record<string, DeepPartial<TenantSettings>> = {
  emmaus: {
    branding: {
      displayName: 'Escola de Catequese Emaus',
      shortName: 'Emaus',
      primaryColor: '#cc6f32',
      accentColor: '#f4d27e',
      surfaceColor: '#fff8ef',
      heroTone: 'youth'
    },
    audience: {
      ageRangeLabel: '13 a 17 anos',
      youthFirst: true,
      inclusiveForAdults: true,
      toneOfVoice: 'energized',
      consentMode: 'guardian_optional'
    }
  },
  agape: {
    branding: {
      displayName: 'Instituto Agape de Formacao',
      shortName: 'Agape',
      primaryColor: '#1f6f8b',
      accentColor: '#9fd3c7',
      surfaceColor: '#f4fbfb',
      heroTone: 'balanced'
    },
    audience: {
      ageRangeLabel: 'Jovens e adultos',
      youthFirst: false,
      inclusiveForAdults: true,
      toneOfVoice: 'gentle',
      consentMode: 'self_service'
    }
  }
};

export const fallbackTenants: TenantSummary[] = [
  {
    id: 'tenant-emmaus',
    slug: 'emmaus',
    schemaName: 'tenant_emmaus',
    status: 'active',
    paymentMode: 'HYBRID',
    customDomain: 'emmaus.local'
  },
  {
    id: 'tenant-agape',
    slug: 'agape',
    schemaName: 'tenant_agape',
    status: 'active',
    paymentMode: 'TENANT',
    customDomain: 'agape.local'
  }
];

export const fallbackCourses: Record<string, CourseSummary[]> = {
  emmaus: [
    {
      id: 'course-jornada',
      slug: 'jornada-da-fe',
      title: 'Jornada da Fe',
      audienceLabel: 'Juventude em preparacao sacramental',
      moduleCount: 8,
      progressLabel: 'Rotas com liberacao manual do professor'
    },
    {
      id: 'course-servico',
      slug: 'lideranca-em-servico',
      title: 'Lideranca em Servico',
      audienceLabel: 'Jovens e voluntarios',
      moduleCount: 6,
      progressLabel: 'Plano mensal com trilha guiada'
    }
  ],
  agape: [
    {
      id: 'course-fundamentos',
      slug: 'fundamentos-da-formacao',
      title: 'Fundamentos da Formacao',
      audienceLabel: 'Jovens e adultos',
      moduleCount: 10,
      progressLabel: 'Turmas mistas com configuracao flexivel'
    }
  ]
};

export const fallbackPlans: Record<
  string,
  Record<string, { id: string; title: string; courseId: string; priceCents: number }>
> = {
  emmaus: {
    'plano-jovem': {
      id: 'plano-jovem',
      title: 'Plano Jovem Emaus',
      courseId: 'course-jornada',
      priceCents: 4900
    }
  },
  agape: {
    'plano-misto': {
      id: 'plano-misto',
      title: 'Plano Formacao Agape',
      courseId: 'course-fundamentos',
      priceCents: 6900
    }
  }
};

export const fallbackDemoUsers: Record<
  string,
  {
    password: string;
    memberships: UserMembership[];
    globalRoles: Role[];
  }
> = {
  'dev@platform.local': {
    password: 'Dev@123',
    memberships: [
      {
        tenantId: 'tenant-emmaus',
        roles: ['DEVELOPER'],
        displayName: 'Platform Developer'
      }
    ],
    globalRoles: ['DEVELOPER']
  },
  'admin@emmaus.local': {
    password: 'Admin@123',
    memberships: [
      {
        tenantId: 'tenant-emmaus',
        roles: ['ADMINISTRATOR'],
        displayName: 'Ana Gestora'
      }
    ],
    globalRoles: []
  },
  'teacher@emmaus.local': {
    password: 'Teacher@123',
    memberships: [
      {
        tenantId: 'tenant-emmaus',
        roles: ['TEACHER'],
        displayName: 'Prof. Rafael'
      }
    ],
    globalRoles: []
  },
  'student@emmaus.local': {
    password: 'Student@123',
    memberships: [
      {
        tenantId: 'tenant-emmaus',
        roles: ['STUDENT'],
        displayName: 'Lia Rocha'
      }
    ],
    globalRoles: []
  }
};

export function getFallbackTenant(slug: string) {
  return fallbackTenants.find((item) => item.slug === slug);
}

export function getFallbackTenantSettings(slug: string) {
  return mergeTenantSettings(platformDefaults, fallbackTenantSettings[slug] ?? {});
}

export function getFallbackCoursesForTenant(slug: string) {
  return fallbackCourses[slug] ?? [];
}

export function getFallbackPlan(tenantSlug: string, planId: string) {
  return fallbackPlans[tenantSlug]?.[planId];
}

export function listFallbackPlansForTenant(tenantSlug: string): PlanSummary[] {
  const tenant = getFallbackTenant(tenantSlug);
  const settings = getFallbackTenantSettings(tenantSlug);
  const coursesById = new Map(getFallbackCoursesForTenant(tenantSlug).map((course) => [course.id, course.title]));

  return Object.values(fallbackPlans[tenantSlug] ?? {}).map((plan) => ({
    id: plan.id,
    title: plan.title,
    courseId: plan.courseId,
    courseTitle: coursesById.get(plan.courseId),
    priceCents: plan.priceCents,
    currency: 'BRL',
    interval: settings.billing.interval,
    intervalUnit: settings.billing.intervalUnit,
    paymentOwnershipMode: tenant?.paymentMode ?? settings.billing.paymentOwnershipMode
  }));
}
