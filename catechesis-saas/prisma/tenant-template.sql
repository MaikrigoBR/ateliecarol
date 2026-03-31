CREATE SCHEMA IF NOT EXISTS template_tenant;

COMMENT ON SCHEMA template_tenant IS 'Template versionado para schemas institucionais do catechesis SaaS';

-- Cada migração de tenant deve ser aplicada trocando o schema alvo em tempo de execução.
-- Exemplo: template_tenant -> tenant_emmaus
