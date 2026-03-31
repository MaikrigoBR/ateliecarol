# Prisma Strategy

- `control-plane.prisma`: models globais do schema `public`.
- `tenant.prisma`: models operacionais que serão aplicados a cada schema institucional.
- `tenant-template.sql`: marcador simples para a estratégia de migração versionada por schema.

## Fluxo esperado

1. Provisionar tenant no schema `public`.
2. Criar schema institucional `tenant_<slug>`.
3. Aplicar as migrações do `tenant.prisma` nesse schema.
4. Registrar domínio, conectores de pagamento e memberships.
