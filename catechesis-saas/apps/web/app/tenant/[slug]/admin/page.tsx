import Link from 'next/link';
import { SectionShell } from '../../../../components/section-shell';
import { LogoutForm } from '../../../../components/logout-form';
import {
  getEffectiveSettings,
  getTenantConfigLayers,
  hasAnyRole,
  previewTenantSettings,
  requireTenantUser
} from '../../../../lib/auth-session';

export default async function TenantAdminPage({
  params,
  searchParams
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    displayName?: string;
    ageRangeLabel?: string;
    youthFirst?: string;
    saved?: string;
    message?: string;
  }>;
}>) {
  const { slug } = await params;
  const { token, user } = await requireTenantUser(slug, `/tenant/${slug}/admin`);
  const canOpenAdmin = hasAnyRole(user, ['ADMINISTRATOR', 'DEVELOPER']);

  if (!canOpenAdmin) {
    return (
      <main className="page-shell">
        <section className="hero compact-hero">
          <div className="hero-copy">
            <p className="eyebrow">Acesso restrito</p>
            <h1>Seu perfil atual nao pode abrir o painel administrativo.</h1>
            <p>
              Entre com um administrador ou com o desenvolvedor global para editar configuracoes do tenant.
            </p>
            <div className="cta-row">
              <Link className="primary-link" href={`/tenant/${slug}/sign-in?next=/tenant/${slug}/admin`}>
                Trocar usuario
              </Link>
              <Link className="secondary-link" href={`/tenant/${slug}`}>
                Voltar ao tenant
              </Link>
              <LogoutForm redirectTo={`/tenant/${slug}/sign-in?next=${encodeURIComponent(`/tenant/${slug}/admin`)}`} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const [settings, layers] = await Promise.all([
    getEffectiveSettings(slug, token),
    getTenantConfigLayers(slug, token)
  ]);

  const youthFirstParam = resolvedSearchParams.youthFirst;
  const previewOverrides = {
    displayName: resolvedSearchParams.displayName?.trim() || undefined,
    ageRangeLabel: resolvedSearchParams.ageRangeLabel?.trim() || undefined,
    youthFirst:
      youthFirstParam === 'true' ? true : youthFirstParam === 'false' ? false : undefined
  };
  const hasPreview =
    previewOverrides.displayName !== undefined ||
    previewOverrides.ageRangeLabel !== undefined ||
    previewOverrides.youthFirst !== undefined;
  const previewSettings = hasPreview ? await previewTenantSettings(slug, token, previewOverrides) : null;

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Administrador institucional</p>
          <h1>{settings.branding.displayName}</h1>
          <p>
            Painel com parametrizacao editavel, cobranca por tenant, governanca pedagogica e operacao
            white-label sem depender de deploy.
          </p>
          <div className="cta-row">
            <Link className="primary-link" href={`/tenant/${slug}`}>
              Voltar para a vitrine
            </Link>
            <Link className="secondary-link" href={`/tenant/${slug}/teacher`}>
              Abrir painel do professor
            </Link>
            <LogoutForm redirectTo={`/tenant/${slug}/sign-in?next=${encodeURIComponent(`/tenant/${slug}/admin`)}`} />
          </div>
        </div>
      </section>

      {resolvedSearchParams.saved === 'success' ? (
        <section className="grid single-up">
          <SectionShell eyebrow="Configuracao salva" title="Alteracoes demo aplicadas ao tenant atual">
            <p>As configuracoes efetivas do tenant foram atualizadas nesta sessao local.</p>
          </SectionShell>
        </section>
      ) : null}

      {resolvedSearchParams.saved === 'error' ? (
        <section className="grid single-up">
          <SectionShell eyebrow="Nao foi possivel salvar" title="A API recusou a atualizacao">
            <p>{resolvedSearchParams.message ?? 'Revise os dados e tente novamente.'}</p>
          </SectionShell>
        </section>
      ) : null}

      <div className="grid three-up">
        <SectionShell eyebrow="Sessao" title={user.displayName}>
          <p>Email: {user.email}</p>
          <p>Papeis: {user.roles.join(', ')}</p>
          <p>Tenant autenticado: {user.tenantSlug}</p>
        </SectionShell>

        <SectionShell eyebrow="Branding" title="Identidade da instituicao">
          <p>Nome publico: {settings.branding.displayName}</p>
          <p>Nome curto: {settings.branding.shortName}</p>
          <p>Tom principal: {settings.branding.heroTone}</p>
          <p>Publico-alvo: {settings.audience.ageRangeLabel}</p>
        </SectionShell>

        <SectionShell eyebrow="Cobranca" title="Assinaturas e repasses">
          <p>Modo de pagamento: {settings.billing.paymentOwnershipMode}</p>
          <p>
            Periodicidade padrao: {settings.billing.interval} {settings.billing.intervalUnit}
          </p>
          <p>Carencia: {settings.billing.gracePeriodDays} dias</p>
          <p>Retries: {settings.billing.retryPolicy.join(', ')}</p>
        </SectionShell>

        <SectionShell eyebrow="Pedagogia" title="Politicas editaveis">
          <p>Nota minima: {settings.pedagogy.minimumGrade}</p>
          <p>Tentativas: {settings.pedagogy.maxAttempts}</p>
          <p>Release mode: {settings.pedagogy.releaseMode}</p>
          <p>Reabertura: {settings.pedagogy.allowTeacherReopen ? 'permitida' : 'bloqueada'}</p>
        </SectionShell>

        <SectionShell eyebrow="Comunicacao" title="Politicas ativas">
          <p>Email habilitado: {settings.notifications.emailEnabled ? 'sim' : 'nao'}</p>
          <p>In-app habilitado: {settings.notifications.inAppEnabled ? 'sim' : 'nao'}</p>
          <p>WhatsApp habilitado: {settings.notifications.whatsappEnabled ? 'sim' : 'nao'}</p>
          <p>Fuso horario: {settings.timezone}</p>
        </SectionShell>

        <SectionShell eyebrow="Origem" title="Camadas carregadas">
          <p>Locale base: {layers.platformDefaults.locale}</p>
          <p>Locale efetivo: {layers.tenantSettings.locale}</p>
          <p>Cor primaria efetiva: {layers.tenantSettings.branding.primaryColor}</p>
          <p>Consentimento: {layers.tenantSettings.audience.consentMode}</p>
        </SectionShell>
      </div>

      <div className="grid two-up">
        <SectionShell eyebrow="Preview" title="Simular e aplicar configuracao do tenant">
          <form className="auth-form" method="get">
            <input type="hidden" name="saved" value="" />

            <label className="field">
              <span>Nome publico</span>
              <input
                defaultValue={resolvedSearchParams.displayName ?? settings.branding.displayName}
                name="displayName"
                placeholder="Novo nome institucional"
                type="text"
              />
            </label>

            <label className="field">
              <span>Faixa etaria</span>
              <input
                defaultValue={resolvedSearchParams.ageRangeLabel ?? settings.audience.ageRangeLabel}
                name="ageRangeLabel"
                placeholder="Ex.: Jovens e adultos"
                type="text"
              />
            </label>

            <label className="field">
              <span>Prioridade youth-first</span>
              <select
                className="select-field"
                defaultValue={resolvedSearchParams.youthFirst ?? 'current'}
                name="youthFirst"
              >
                <option value="current">Manter atual</option>
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </label>

            <input type="hidden" name="tenantSlug" value={slug} />
            <input type="hidden" name="redirectTo" value={`/tenant/${slug}/admin`} />

            <div className="cta-row">
              <button className="primary-link button-reset" type="submit">
                Gerar preview
              </button>
              <button
                className="secondary-link button-reset"
                formAction="/actions/settings"
                formMethod="post"
                type="submit"
              >
                Salvar alteracoes demo
              </button>
              <Link className="secondary-link" href={`/tenant/${slug}/admin`}>
                Limpar simulacao
              </Link>
            </div>
          </form>
        </SectionShell>

        <SectionShell eyebrow="Resultado" title={hasPreview ? 'Preview calculado pela API' : 'Sem simulacao ativa'}>
          {previewSettings ? (
            <div className="stack">
              <p>Display name: {previewSettings.branding.displayName}</p>
              <p>Audience label: {previewSettings.audience.ageRangeLabel}</p>
              <p>Youth-first: {previewSettings.audience.youthFirst ? 'sim' : 'nao'}</p>
              <p>Consentimento: {previewSettings.audience.consentMode}</p>
              <p>Release mode: {previewSettings.pedagogy.releaseMode}</p>
            </div>
          ) : (
            <div className="stack">
              <p>Preencha o formulario ao lado para simular ajustes sem persistir no tenant.</p>
              <p>Depois use o botao Salvar alteracoes demo para manter o estado efetivo nesta sessao local.</p>
            </div>
          )}
        </SectionShell>
      </div>
    </main>
  );
}
