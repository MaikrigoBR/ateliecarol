import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { EnrollmentSummary, PlanSummary } from '@catechesis-saas/types';
import { MetricCard } from '../../../components/metric-card';
import { SectionShell } from '../../../components/section-shell';
import { LogoutForm } from '../../../components/logout-form';
import {
  canAccessTenant,
  getSessionUser,
  getStudentSubscriptions,
  getTenantCourses,
  getTenantPlans,
  hasAnyRole
} from '../../../lib/auth-session';
import { getTenantDemo } from '../../../lib/demo-content';

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceCents / 100);
}

export default async function TenantStudentPage({
  params,
  searchParams
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    subscription?: string;
    message?: string;
    planId?: string;
    enrollmentId?: string;
    status?: string;
  }>;
}>) {
  const { slug } = await params;
  const tenant = getTenantDemo(slug);

  if (!tenant) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const session = await getSessionUser(slug);
  const activeUser = session.user && canAccessTenant(session.user, slug) ? session.user : null;
  const canCreateSubscription = activeUser
    ? hasAnyRole(activeUser, ['STUDENT', 'ADMINISTRATOR', 'DEVELOPER'])
    : false;

  let courses: Array<{
    id: string;
    slug: string;
    title: string;
    moduleCount: number;
    progressLabel?: string;
    audienceLabel: string;
  }> = tenant.courseHighlights.map((course, index) => ({
    id: `demo-course-${index}`,
    slug: `demo-${index}`,
    title: course.title,
    moduleCount: Number(course.modules.split(' ')[0]) || 0,
    progressLabel: course.releaseMode,
    audienceLabel: tenant.settings.audience.ageRangeLabel
  }));
  let plans: PlanSummary[] = [];
  let subscriptions: EnrollmentSummary[] = [];

  try {
    const requests: Array<Promise<unknown>> = [
      getTenantCourses(slug, session.token),
      getTenantPlans(slug)
    ];

    if (activeUser && session.token) {
      requests.push(getStudentSubscriptions(slug, session.token));
    }

    const [catalogResponse, plansResponse, subscriptionsResponse] = await Promise.all(requests);
    courses = (catalogResponse as Awaited<ReturnType<typeof getTenantCourses>>).courses;
    plans = (plansResponse as Awaited<ReturnType<typeof getTenantPlans>>).plans;
    subscriptions =
      (subscriptionsResponse as Awaited<ReturnType<typeof getStudentSubscriptions>> | undefined)?.items ?? [];
  } catch {
    // Keep demo fallback content when the API is unavailable.
  }

  return (
    <main
      className="page-shell tenant-shell"
      style={
        {
          '--tenant-primary': tenant.settings.branding.primaryColor,
          '--tenant-accent': tenant.settings.branding.accentColor,
          '--tenant-surface': tenant.settings.branding.surfaceColor
        } as CSSProperties
      }
    >
      <section className="hero tenant-hero">
        <div className="hero-copy">
          <p className="eyebrow">{tenant.hero.eyebrow}</p>
          <h1>{tenant.hero.title}</h1>
          <p>{tenant.hero.description}</p>
          <div className="cta-row">
            <Link className="primary-link" href={`/tenant/${slug}/admin`}>
              Painel do administrador
            </Link>
            <Link className="secondary-link" href={`/tenant/${slug}/teacher`}>
              Painel do professor
            </Link>
            {activeUser ? (
              <LogoutForm redirectTo={`/tenant/${slug}`} />
            ) : (
              <Link className="secondary-link" href={`/tenant/${slug}/sign-in`}>
                Entrar com perfil
              </Link>
            )}
          </div>
        </div>
        <div className="hero-stack">
          {tenant.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      {resolvedSearchParams.subscription === 'success' ? (
        <section className="grid single-up">
          <SectionShell eyebrow="Assinatura iniciada" title="Fluxo de contratacao criado com sucesso">
            <p>Plano: {resolvedSearchParams.planId ?? 'nao informado'}</p>
            <p>Enrollment: {resolvedSearchParams.enrollmentId ?? 'nao informado'}</p>
            <p>Status inicial: {resolvedSearchParams.status ?? 'PENDING'}</p>
          </SectionShell>
        </section>
      ) : null}

      {resolvedSearchParams.subscription === 'error' ? (
        <section className="grid single-up">
          <SectionShell eyebrow="Assinatura nao concluida" title="Nao foi possivel iniciar a contratacao">
            <p>{resolvedSearchParams.message ?? 'Tente novamente com um perfil autorizado.'}</p>
          </SectionShell>
        </section>
      ) : null}

      <div className="grid two-up">
        <SectionShell eyebrow="Area do aluno" title="Trilha de aprendizagem">
          <p>
            Conteudos, avaliacao, progresso consolidado, tempo de estudo e comunicacao adaptados para{' '}
            {tenant.settings.audience.ageRangeLabel}.
          </p>
          <div className="pill-row">
            <span className="pill">Onboarding self-service</span>
            <span className="pill">{tenant.settings.audience.consentMode}</span>
            <span className="pill">{tenant.settings.pedagogy.releaseMode}</span>
          </div>
        </SectionShell>

        <SectionShell eyebrow="Sessao" title={activeUser ? activeUser.displayName : 'Visitante'}>
          {activeUser ? (
            <>
              <p>Email: {activeUser.email}</p>
              <p>Papeis: {activeUser.roles.join(', ')}</p>
              <p>Tenant autenticado: {activeUser.tenantSlug}</p>
            </>
          ) : (
            <>
              <p>Entre com aluno, administrador ou desenvolvedor para testar a contratacao demo.</p>
              <div className="cta-row">
                <Link className="primary-link" href={`/tenant/${slug}/sign-in?next=/tenant/${slug}`}>
                  Fazer login
                </Link>
              </div>
            </>
          )}
        </SectionShell>
      </div>

      <div className="grid two-up">
        <SectionShell eyebrow="Cursos ativos" title="Catalogo da instituicao">
          {courses.map((course) => (
            <article key={course.id} className="course-card">
              <h3>{course.title}</h3>
              <p>{course.moduleCount} modulos</p>
              <p>{course.progressLabel ?? 'Curso pronto para matricula'}</p>
            </article>
          ))}
        </SectionShell>

        <SectionShell eyebrow="Planos" title="Contratacao demo">
          <div className="plan-grid">
            {plans.map((plan) => (
              <article key={plan.id} className="plan-card">
                <div className="plan-card-header">
                  <div>
                    <h3>{plan.title}</h3>
                    <p>{plan.courseTitle ?? 'Curso do tenant'}</p>
                  </div>
                  <strong>{formatPrice(plan.priceCents)}</strong>
                </div>
                <p>
                  Recorrencia: {plan.interval} {plan.intervalUnit}
                </p>
                <p>Repasse/cobranca: {plan.paymentOwnershipMode}</p>
                {canCreateSubscription ? (
                  <form action="/actions/subscribe" method="post" className="inline-form">
                    <input type="hidden" name="tenantSlug" value={slug} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="redirectTo" value={`/tenant/${slug}`} />
                    <button className="primary-link button-reset" type="submit">
                      Iniciar assinatura demo
                    </button>
                  </form>
                ) : (
                  <div className="stack">
                    <p className="muted-copy">Entre com um perfil autorizado para testar a assinatura.</p>
                    <Link className="secondary-link" href={`/tenant/${slug}/sign-in?next=/tenant/${slug}`}>
                      Entrar para contratar
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        </SectionShell>
      </div>

      <section className="grid single-up">
        <SectionShell eyebrow="Matriculas" title="Historico do usuario autenticado">
          {subscriptions.length > 0 ? (
            <div className="plan-grid">
              {subscriptions.map((item) => (
                <article key={item.id} className="plan-card">
                  <div className="plan-card-header">
                    <div>
                      <h3>{item.courseTitle}</h3>
                      <p>{item.planTitle}</p>
                    </div>
                    <strong>{formatPrice(item.priceCents)}</strong>
                  </div>
                  <p>Enrollment: {item.id}</p>
                  <p>Status da matricula: {item.enrollmentStatus}</p>
                  <p>Status da assinatura: {item.subscriptionStatus}</p>
                  <p>Iniciada em: {new Date(item.startedAt).toLocaleString('pt-BR')}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="stack">
              <p>
                {activeUser
                  ? 'Nenhuma matricula demo registrada ainda. Inicie uma assinatura acima para preencher esta area.'
                  : 'Entre com um usuario para visualizar o historico de matriculas.'}
              </p>
            </div>
          )}
        </SectionShell>
      </section>
    </main>
  );
}
