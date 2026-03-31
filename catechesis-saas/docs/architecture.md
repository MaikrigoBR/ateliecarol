# Architecture Overview

## Monorepo

- `apps/web`: interface Next.js com rotas de tenant, aluno, professor e administrador.
- `apps/api`: API NestJS com resolução de tenant, auth contextual, catálogo, settings e assinaturas.
- `apps/worker`: filas BullMQ para recorrência, conciliação e repasses.
- `packages/types`: contratos de domínio compartilhados.
- `packages/config`: defaults globais e merge de parâmetros.
- `packages/ui`: tokens simples de apresentação compartilhados.
- `prisma/`: modelagem do plano de controle global e do template de schema por tenant.

## Multi-Tenancy

- Um schema `public` concentra tenants, domínios, identidades, memberships, conectores de cobrança e feature flags.
- Cada instituição recebe um schema próprio com catálogo, matrículas, cobranças, métricas e auditoria.
- A precedência de configuração é: `platform defaults -> tenant settings -> course settings -> plan snapshot`.
- O `TenantClientFactory` previsto nesta base será responsável por criar e cachear clientes Prisma apontando para o schema do tenant.

## Payment Model

- O tenant pode operar em conta própria do Mercado Pago ou usar a conta central da plataforma.
- Assinaturas, invoices e payment events são salvos no schema do tenant.
- Quando a cobrança for centralizada, o worker de `tenant-settlement` calculará os repasses devidos.

## Roadmap Already Materialized

- Estrutura do monorepo pronta.
- Esqueleto do Prisma global e por tenant.
- API com contratos iniciais para tenant, login, catálogo, settings e assinatura.
- Frontend demonstrando identidade multi-tenant e papéis principais.
- Worker com filas base para recorrência e repasse.
