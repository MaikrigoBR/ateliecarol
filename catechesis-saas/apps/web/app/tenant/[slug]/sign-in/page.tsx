import Link from 'next/link';
import type { DashboardMetric } from '@catechesis-saas/types';
import { MetricCard } from '../../../../components/metric-card';
import { SectionShell } from '../../../../components/section-shell';
import { LogoutForm } from '../../../../components/logout-form';
import { getTenantDemo } from '../../../../lib/demo-content';
import {
  canAccessTenant,
  getDefaultDestination,
  getSessionUser,
  resolveInternalPath
} from '../../../../lib/auth-session';
import { listDemoCredentials } from '../../../../lib/demo-users';

const signInMetrics: DashboardMetric[] = [
  {
    id: 'auth-1',
    label: 'Sessao web',
    value: 'HTTP-only',
    trend: 'Token guardado em cookie seguro no frontend'
  },
  {
    id: 'auth-2',
    label: 'Protecao por perfil',
    value: 'RBAC',
    trend: 'Teacher e admin validam papel antes de abrir o painel'
  },
  {
    id: 'auth-3',
    label: 'Tenant atual',
    value: 'Contextual',
    trend: 'Cada login respeita o slug informado no fluxo'
  }
];

export default async function TenantSignInPage({
  params,
  searchParams
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}>) {
  const { slug } = await params;
  const tenant = getTenantDemo(slug);
  const resolvedSearchParams = await searchParams;
  const destination = resolveInternalPath(resolvedSearchParams.next, `/tenant/${slug}/admin`);
  const session = await getSessionUser(slug);
  const activeUser = session.user && canAccessTenant(session.user, slug) ? session.user : null;
  const credentials = listDemoCredentials(slug);

  if (activeUser) {
    const defaultDestination = getDefaultDestination(activeUser, slug);

    return (
      <main className="page-shell tenant-shell">
        <section className="hero tenant-hero">
          <div className="hero-copy">
            <p className="eyebrow">Sessao ativa</p>
            <h1>Voce ja entrou em {tenant.settings.branding.displayName}.</h1>
            <p>
              Continue para o painel correspondente ao seu perfil ou encerre a sessao para testar outro
              usuario.
            </p>
            <div className="cta-row">
              <Link className="primary-link" href={destination || defaultDestination}>
                Continuar navegacao
              </Link>
              <Link className="secondary-link" href={defaultDestination}>
                Abrir painel principal
              </Link>
              <LogoutForm redirectTo={`/tenant/${slug}/sign-in?next=${encodeURIComponent(destination)}`} />
            </div>
          </div>
          <div className="hero-stack">
            <SectionShell eyebrow="Usuario" title={activeUser.displayName}>
              <p>Email: {activeUser.email}</p>
              <p>Tenant: {activeUser.tenantSlug}</p>
              <p>Papeis: {activeUser.roles.join(', ')}</p>
            </SectionShell>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell tenant-shell">
      <section className="hero tenant-hero">
        <div className="hero-copy">
          <p className="eyebrow">Autenticacao por tenant</p>
          <h1>Entrar em {tenant.settings.branding.displayName}</h1>
          <p>
            O frontend agora usa a API real para autenticar e abrir os paineis protegidos conforme o
            papel do usuario.
          </p>
          <form className="auth-form" action="/auth/session" method="post">
            <input type="hidden" name="tenantSlug" value={slug} />
            <input type="hidden" name="destination" value={destination} />

            <label className="field">
              <span>Email</span>
              <input autoComplete="email" name="email" placeholder="admin@emmaus.local" type="email" required />
            </label>

            <label className="field">
              <span>Senha</span>
              <input
                autoComplete="current-password"
                name="password"
                placeholder="Digite sua senha"
                type="password"
                required
              />
            </label>

            <div className="cta-row">
              <button className="primary-link button-reset" type="submit">
                Entrar
              </button>
              <Link className="secondary-link" href={`/tenant/${slug}`}>
                Voltar ao tenant
              </Link>
            </div>

            {resolvedSearchParams.error ? (
              <p className="form-error" role="alert">
                {resolvedSearchParams.error}
              </p>
            ) : null}
          </form>
        </div>

        <div className="hero-stack">
          {signInMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <div className="grid two-up">
        <SectionShell eyebrow="Credenciais demo" title="Perfis prontos para testar">
          <div className="credential-grid">
            {credentials.map((credential) => (
              <article key={`${credential.email}-${credential.tenantSlug}`} className="credential-card">
                <h3>{credential.profile}</h3>
                <p>{credential.description}</p>
                <p>
                  Tenant: <code>{credential.tenantSlug}</code>
                </p>
                <p>
                  Email: <code>{credential.email}</code>
                </p>
                <p>
                  Senha: <code>{credential.password}</code>
                </p>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Fluxo" title="O que acontece depois do login">
          <ul className="simple-list">
            <li>Administrador e desenvolvedor seguem para o painel administrativo.</li>
            <li>Professor abre o painel pedagogico protegido.</li>
            <li>Aluno volta para a visao do tenant com sessao ativa.</li>
            <li>Se o tenant nao tiver usuarios demo locais, use o desenvolvedor global.</li>
          </ul>
        </SectionShell>
      </div>
    </main>
  );
}
