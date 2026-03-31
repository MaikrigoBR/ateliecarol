import Link from 'next/link';
import { SectionShell } from '../../components/section-shell';

const localLinks = [
  {
    label: 'Homepage local',
    href: 'http://localhost:3000'
  },
  {
    label: 'Central de teste',
    href: 'http://localhost:3000/local-test'
  },
  {
    label: 'Aluno - tenant Emaus',
    href: 'http://localhost:3000/tenant/emmaus'
  },
  {
    label: 'Professor - tenant Emaus',
    href: 'http://localhost:3000/tenant/emmaus/teacher'
  },
  {
    label: 'Administrador - tenant Emaus',
    href: 'http://localhost:3000/tenant/emmaus/admin'
  },
  {
    label: 'Health da API',
    href: 'http://localhost:4000/api/health'
  },
  {
    label: 'Lista de tenants',
    href: 'http://localhost:4000/api/tenants'
  },
  {
    label: 'Catalogo demo',
    href: 'http://localhost:4000/api/catalog/courses?tenant=emmaus'
  },
  {
    label: 'Auth me (exige Bearer token)',
    href: 'http://localhost:4000/api/auth/me'
  }
];

const demoCredentials = [
  {
    profile: 'Desenvolvedor global',
    tenant: 'emmaus',
    email: 'dev@platform.local',
    password: 'Dev@123'
  },
  {
    profile: 'Administrador',
    tenant: 'emmaus',
    email: 'admin@emmaus.local',
    password: 'Admin@123'
  },
  {
    profile: 'Professor',
    tenant: 'emmaus',
    email: 'teacher@emmaus.local',
    password: 'Teacher@123'
  },
  {
    profile: 'Aluno',
    tenant: 'emmaus',
    email: 'student@emmaus.local',
    password: 'Student@123'
  }
];

const loginExample = `POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@emmaus.local",
  "password": "Admin@123",
  "tenantSlug": "emmaus"
}`;

export default function LocalTestPage() {
  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Teste local</p>
          <h1>Central para abrir a aplicacao localmente.</h1>
          <p>
            Para subir o ambiente de teste no Windows, execute <code>start-local-test.cmd</code> ou{' '}
            <code>npm run dev:local</code> na pasta raiz do monorepo.
          </p>
          <div className="cta-row">
            <Link className="primary-link" href="/tenant/emmaus">
              Ir para o tenant Emaus
            </Link>
            <a className="secondary-link" href="http://localhost:4000/api/health" target="_blank" rel="noreferrer">
              Conferir API
            </a>
          </div>
        </div>
      </section>

      <div className="grid two-up">
        <SectionShell eyebrow="Atalho" title="Como subir">
          <p>Na pasta do projeto rode um destes comandos:</p>
          <pre className="code-block">start-local-test.cmd</pre>
          <pre className="code-block">npm run dev:local</pre>
        </SectionShell>

        <SectionShell eyebrow="Links" title="Abrir no navegador">
          <div className="link-list">
            {localLinks.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </SectionShell>
      </div>

      <div className="grid two-up">
        <SectionShell eyebrow="Credenciais" title="Perfis demo">
          <div className="link-list">
            {demoCredentials.map((item) => (
              <div key={item.email}>
                <strong>{item.profile}</strong>
                <p>
                  Tenant: <code>{item.tenant}</code>
                </p>
                <p>
                  Email: <code>{item.email}</code>
                </p>
                <p>
                  Senha: <code>{item.password}</code>
                </p>
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell eyebrow="API" title="Como testar login">
          <p>
            Faca login em <code>/api/auth/login</code> e use o token Bearer retornado em{' '}
            <code>/api/auth/me</code>.
          </p>
          <pre className="code-block">{loginExample}</pre>
        </SectionShell>
      </div>
    </main>
  );
}
