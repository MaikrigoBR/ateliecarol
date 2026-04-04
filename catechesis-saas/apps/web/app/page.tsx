import Link from 'next/link';
import { listTenantDemos } from '../lib/demo-content';
import { SectionShell } from '../components/section-shell';
import { MetricCard } from '../components/metric-card';

export default function HomePage() {
  const tenants = listTenantDemos();

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">SaaS multi-instituicao para formacao</p>
          <h1>Uma base unica para varias instituicoes, cada uma com sua propria experiencia.</h1>
          <p>
            Esta implementacao inicial abre a arquitetura do produto, mostra a parametrizacao por tenant
            e deixa uma vitrine navegavel para aluno, professor e administrador.
          </p>
          <div className="cta-row">
            <Link className="primary-link" href="/tenant/emmaus">
              Abrir tenant Emaus
            </Link>
            <Link className="secondary-link" href="/tenant/agape/admin">
              Ver tenant Agape
            </Link>
            <Link className="secondary-link" href="/local-test">
              Teste local
            </Link>
            <Link className="secondary-link" href="/tenant/emmaus/sign-in">
              Login demo
            </Link>
          </div>
        </div>
        <div className="hero-stack">
          {tenants[0].metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <div className="grid two-up">
        <SectionShell eyebrow="Teste rapido" title="Rodar localmente">
          <p>Use o script local para abrir a API e o frontend de demonstracao com um clique.</p>
          <div className="link-list">
            <a href="http://localhost:3000/local-test" target="_blank" rel="noreferrer">
              Abrir central local
            </a>
            <a href="http://localhost:3000/tenant/emmaus" target="_blank" rel="noreferrer">
              Abrir demo do aluno
            </a>
            <a href="http://localhost:4000/api/health" target="_blank" rel="noreferrer">
              Ver health da API
            </a>
          </div>
        </SectionShell>

        {tenants.map((tenant) => (
          <SectionShell
            key={tenant.tenant.id}
            eyebrow={tenant.settings.audience.ageRangeLabel}
            title={tenant.settings.branding.displayName}
          >
            <p>{tenant.hero.description}</p>
            <p>
              Pagamento: <strong>{tenant.tenant.paymentMode}</strong> | Schema:{' '}
              <strong>{tenant.tenant.schemaName}</strong>
            </p>
            <div className="link-list">
              <Link href={`/tenant/${tenant.tenant.slug}`}>Area do aluno</Link>
              <Link href={`/tenant/${tenant.tenant.slug}/teacher`}>Painel do professor</Link>
              <Link href={`/tenant/${tenant.tenant.slug}/admin`}>Painel administrativo</Link>
              <Link href={`/tenant/${tenant.tenant.slug}/sign-in`}>Entrar no tenant</Link>
            </div>
          </SectionShell>
        ))}
      </div>
    </main>
  );
}
