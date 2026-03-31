# Catechesis SaaS

Base inicial para uma plataforma multi-instituição de formação e catequese por assinatura, criada dentro deste repositório sem alterar a aplicação já existente.

## O que já foi implementado

- monorepo com `apps/web`, `apps/api`, `apps/worker` e `packages/*`;
- modelagem Prisma separando plano de controle global e schema por tenant;
- API NestJS com resolução de tenant, autenticação contextual, catálogo, settings e assinatura com snapshot;
- frontend Next.js com landing page, vitrine por tenant e painéis iniciais de aluno, professor e administrador;
- worker BullMQ com filas base para recorrência e repasse;
- documentação de arquitetura e setup.

## Estrutura

- `apps/web`: experiência visual multi-tenant.
- `apps/api`: núcleo do backend.
- `apps/worker`: jobs assíncronos.
- `packages/types`: tipos de domínio.
- `packages/config`: defaults e merge de parâmetros.
- `packages/ui`: tokens leves compartilhados.
- `prisma/`: schemas e estratégia de dados.
- `scripts/`: provisionamento e seed local do banco demo.

## Setup local

1. Entre em [catechesis-saas](./).
2. Copie `.env.example` para `.env`.
3. Suba Postgres e Redis:

```bash
docker compose up -d
```

4. Instale dependências:

```bash
npm install
```

5. Gere os clients Prisma:

```bash
npm run prisma:generate
```

6. Se quiser a API usando persistência real em Postgres, provisione o ambiente demo:

```bash
npm run db:provision:demo
```

7. Rode os apps em terminais separados:

```bash
npm run dev:api
npm run dev:web
npm run dev:worker
```

## Teste local rapido

No Windows, voce pode abrir o ambiente de teste com um clique:

```bash
start-local-test.cmd
```

Ou pelo npm:

```bash
npm run dev:local
```

Depois abra:

- `http://localhost:3000/local-test`
- `http://localhost:3000/tenant/emmaus`
- `http://localhost:4000/api/health`

## Rotas demonstrativas

- `/`: vitrine principal da plataforma.
- `/tenant/emmaus`: visão do aluno.
- `/tenant/emmaus/teacher`: visão do professor.
- `/tenant/emmaus/admin`: visão do administrador.

## Próximos passos naturais

- ligar autenticação e RBAC reais ao controle global persistido;
- adicionar MFA e guards por papel/tenant;
- conectar Mercado Pago e webhooks idempotentes;
- incluir testes automatizados e seeds.
