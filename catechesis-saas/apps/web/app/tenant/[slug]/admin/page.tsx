import { getTenantDemo } from '../../../../lib/demo-content';
import { SectionShell } from '../../../../components/section-shell';

export default async function TenantAdminPage({
  params
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const tenant = getTenantDemo(slug);

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Administrador institucional</p>
          <h1>{tenant.settings.branding.displayName}</h1>
          <p>
            Painel com parametrizacao editavel, cobranca por tenant, governanca pedagógica e operacao
            white-label sem depender de deploy.
          </p>
        </div>
      </section>

      <div className="grid three-up">
        <SectionShell eyebrow="Branding" title="Identidade da instituicao">
          <p>Nome publico: {tenant.settings.branding.displayName}</p>
          <p>Tom principal: {tenant.settings.branding.heroTone}</p>
          <p>Publico-alvo: {tenant.settings.audience.ageRangeLabel}</p>
        </SectionShell>

        <SectionShell eyebrow="Cobranca" title="Assinaturas e repasses">
          <p>Modo de pagamento: {tenant.tenant.paymentMode}</p>
          <p>Periodicidade padrao: {tenant.settings.billing.interval} {tenant.settings.billing.intervalUnit}</p>
          <p>Carencia: {tenant.settings.billing.gracePeriodDays} dias</p>
        </SectionShell>

        <SectionShell eyebrow="Pedagogia" title="Politicas editaveis">
          <p>Nota minima: {tenant.settings.pedagogy.minimumGrade}</p>
          <p>Tentativas: {tenant.settings.pedagogy.maxAttempts}</p>
          <p>Reabertura: {tenant.settings.pedagogy.allowTeacherReopen ? 'permitida' : 'bloqueada'}</p>
        </SectionShell>
      </div>
    </main>
  );
}
