import { getTenantDemo } from '../../../../lib/demo-content';
import { SectionShell } from '../../../../components/section-shell';

export default async function TenantTeacherPage({
  params
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const tenant = getTenantDemo(slug);

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Professor</p>
          <h1>Gestao da trilha de alunos em {tenant.settings.branding.shortName}</h1>
          <p>
            Liberacao manual de modulos, reabertura de avaliacoes e indicadores de risco para manter a
            jornada acompanhada de perto.
          </p>
        </div>
      </section>

      <div className="grid two-up">
        <SectionShell eyebrow="Fila pedagogica" title="Acoes prioritarias">
          <ul className="simple-list">
            <li>4 alunos aguardando liberacao para o Modulo 3</li>
            <li>2 avaliacoes com reabertura sugerida</li>
            <li>3 alunos com risco de evasao acima de 70%</li>
          </ul>
        </SectionShell>

        <SectionShell eyebrow="Politica da instituicao" title="Regras em vigor">
          <ul className="simple-list">
            <li>Release mode: {tenant.settings.pedagogy.releaseMode}</li>
            <li>Nota minima: {tenant.settings.pedagogy.minimumGrade}</li>
            <li>Tentativas maximas: {tenant.settings.pedagogy.maxAttempts}</li>
          </ul>
        </SectionShell>
      </div>
    </main>
  );
}
