import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import type { DashboardMetric, TenantSettings, TenantSummary } from '@catechesis-saas/types';

type TenantDemo = {
  tenant: TenantSummary;
  settings: TenantSettings;
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  metrics: DashboardMetric[];
  courseHighlights: {
    title: string;
    modules: string;
    releaseMode: string;
  }[];
};

const tenants: Record<string, TenantDemo> = {
  emmaus: {
    tenant: {
      id: 'tenant-emmaus',
      slug: 'emmaus',
      schemaName: 'tenant_emmaus',
      status: 'active',
      paymentMode: 'HYBRID',
      customDomain: 'emmaus.local'
    },
    settings: mergeTenantSettings(platformDefaults, {
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
    }),
    hero: {
      eyebrow: 'Multi-tenant youth-first',
      title: 'Formacao que parece feita para a sua comunidade.',
      description:
        'Trilhas visuais, acompanhamento proximo de professores e um backoffice que adapta linguagem, identidade e politicas sem trocar de codigo.'
    },
    metrics: [
      { id: 'm1', label: 'Assinaturas ativas', value: '184', trend: '+12% no mes' },
      { id: 'm2', label: 'Progresso medio', value: '72%', trend: '+9 pp em 30 dias' },
      { id: 'm3', label: 'Risco de evasao', value: '11 alunos', trend: '3 precisam de reengajamento hoje' }
    ],
    courseHighlights: [
      { title: 'Jornada da Fe', modules: '8 modulos', releaseMode: 'Liberacao manual por professor' },
      { title: 'Lideranca em Servico', modules: '6 modulos', releaseMode: 'Plano mensal com checkpoints' }
    ]
  },
  agape: {
    tenant: {
      id: 'tenant-agape',
      slug: 'agape',
      schemaName: 'tenant_agape',
      status: 'active',
      paymentMode: 'TENANT',
      customDomain: 'agape.local'
    },
    settings: mergeTenantSettings(platformDefaults, {
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
    }),
    hero: {
      eyebrow: 'Configuracao flexivel',
      title: 'Uma mesma plataforma, identidades e jornadas totalmente independentes.',
      description:
        'Cada instituicao ajusta discurso, faixa etaria, recorrencia, politicas de consentimento e cobranca sem tocar no deploy global.'
    },
    metrics: [
      { id: 'm1', label: 'Assinaturas ativas', value: '93', trend: '+7% no mes' },
      { id: 'm2', label: 'Conclusao media', value: '68%', trend: 'Modulo 3 com maior retencao' },
      { id: 'm3', label: 'Pagamentos na conta propria', value: '100%', trend: 'Sem repasse central' }
    ],
    courseHighlights: [
      { title: 'Fundamentos da Formacao', modules: '10 modulos', releaseMode: 'Calendario e publico misto' }
    ]
  }
};

export function getTenantDemo(slug: string): TenantDemo {
  return tenants[slug] ?? tenants.emmaus;
}

export function listTenantDemos(): TenantDemo[] {
  return Object.values(tenants);
}
