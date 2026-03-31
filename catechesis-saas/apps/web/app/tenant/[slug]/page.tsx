import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getTenantDemo } from '../../../lib/demo-content';
import { MetricCard } from '../../../components/metric-card';
import { SectionShell } from '../../../components/section-shell';

export default async function TenantStudentPage({
  params
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const tenant = getTenantDemo(slug);

  if (!tenant) {
    notFound();
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
          </div>
        </div>
        <div className="hero-stack">
          {tenant.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

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

        <SectionShell eyebrow="Cursos ativos" title="Catalogo da instituicao">
          {tenant.courseHighlights.map((course) => (
            <article key={course.title} className="course-card">
              <h3>{course.title}</h3>
              <p>{course.modules}</p>
              <p>{course.releaseMode}</p>
            </article>
          ))}
        </SectionShell>
      </div>
    </main>
  );
}
