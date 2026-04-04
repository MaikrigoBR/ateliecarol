import Link from 'next/link';
import { SectionShell } from '../../../../components/section-shell';
import { LogoutForm } from '../../../../components/logout-form';
import {
  getEffectiveSettings,
  getTenantCourses,
  hasAnyRole,
  requireTenantUser
} from '../../../../lib/auth-session';

export default async function TenantTeacherPage({
  params
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { token, user } = await requireTenantUser(slug, `/tenant/${slug}/teacher`);
  const canOpenTeacher = hasAnyRole(user, ['TEACHER', 'ADMINISTRATOR', 'DEVELOPER']);

  if (!canOpenTeacher) {
    return (
      <main className="page-shell">
        <section className="hero compact-hero">
          <div className="hero-copy">
            <p className="eyebrow">Acesso restrito</p>
            <h1>Seu perfil atual nao pode abrir o painel do professor.</h1>
            <p>Entre com um professor, administrador ou desenvolvedor global para continuar.</p>
            <div className="cta-row">
              <Link className="primary-link" href={`/tenant/${slug}/sign-in?next=/tenant/${slug}/teacher`}>
                Trocar usuario
              </Link>
              <Link className="secondary-link" href={`/tenant/${slug}`}>
                Voltar ao tenant
              </Link>
              <LogoutForm redirectTo={`/tenant/${slug}/sign-in?next=${encodeURIComponent(`/tenant/${slug}/teacher`)}`} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [settings, catalog] = await Promise.all([
    getEffectiveSettings(slug, token ?? ''),
    getTenantCourses(slug, token ?? '')
  ]);

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Professor</p>
          <h1>Gestao da trilha de alunos em {settings.branding.shortName}</h1>
          <p>
            Liberacao manual de modulos, reabertura de avaliacoes e indicadores de risco para manter a
            jornada acompanhada de perto.
          </p>
          <div className="cta-row">
            <Link className="primary-link" href={`/tenant/${slug}`}>
              Voltar para a area do aluno
            </Link>
            <Link className="secondary-link" href={`/tenant/${slug}/admin`}>
              Painel administrativo
            </Link>
            <LogoutForm redirectTo={`/tenant/${slug}/sign-in?next=${encodeURIComponent(`/tenant/${slug}/teacher`)}`} />
          </div>
        </div>
      </section>

      <div className="grid two-up">
        <SectionShell eyebrow="Sessao" title={user.displayName}>
          <p>Email: {user.email}</p>
          <p>Papeis: {user.roles.join(', ')}</p>
          <p>Consentimento do tenant: {settings.audience.consentMode}</p>
        </SectionShell>

        <SectionShell eyebrow="Fila pedagogica" title="Acoes prioritarias">
          <ul className="simple-list">
            {catalog.courses.map((course) => (
              <li key={course.id}>
                {course.title}: {course.moduleCount} modulos e status {course.progressLabel ?? 'sem resumo'}
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell eyebrow="Politica da instituicao" title="Regras em vigor">
          <ul className="simple-list">
            <li>Release mode: {settings.pedagogy.releaseMode}</li>
            <li>Nota minima: {settings.pedagogy.minimumGrade}</li>
            <li>Tentativas maximas: {settings.pedagogy.maxAttempts}</li>
            <li>Reabertura permitida: {settings.pedagogy.allowTeacherReopen ? 'sim' : 'nao'}</li>
          </ul>
        </SectionShell>

        <SectionShell eyebrow="Catalogo" title="Cursos do tenant">
          <ul className="simple-list">
            {catalog.courses.map((course) => (
              <li key={`${course.slug}-audience`}>
                {course.title}: {course.audienceLabel}
              </li>
            ))}
          </ul>
        </SectionShell>
      </div>
    </main>
  );
}
