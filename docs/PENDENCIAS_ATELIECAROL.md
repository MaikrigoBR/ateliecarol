# 📋 Pendências Identificadas — Ateliê Carol

> **Última Atualização:** 2026-04-01 (Sessão de Finalização do Motor Financeiro)
> **Status Geral:** 🟢 ESTÁVEL EM PRODUÇÃO

---

## 🚀 Entregas Recentes (Abril 2024)

### 1. Sistema Financeiro "Invoice Engine" — Concluído
- [x] **Pagamento em Lote (Bulk Pay)**: Interface de seleção múltipla com barra de ações flutuante para baixa rápida de despesas.
- [x] **Dashboard Financeiro**: Incluir resumos de "Contas a Pagar no Dia" e "Intervalo do Mês". (Concluído em 2026-04-01)
- [x] **Filtros Inteligentes**: Aprimorar os critérios de pesquisa no módulo de Inteligência Financeira para facilitar a baixa de títulos vencidos. (Concluído em 2026-04-01)
- [x] **Correção DRE**: Ajustada a lógica de cálculo para regime de competência (incluindo pendentes). (Concluído em 2026-04-01)
- [x] **Gestão de Cartões**: Apresentação de faturas em "blocos" de competência no módulo financeiro. (Concluído em 2026-04-01)
- [x] **Alertas de Vencimento Dinâmicos**: Indicadores "VENCIDO" e "VENCE HOJE" em tempo real na listagem financeira.
- [x] **Gestão de Cartões de Crédito**:
  - [x] Agrupamento inteligente de despesas por ciclo de fatura (Fechamento vs. Vencimento).
  - [x] Monitoramento de endividamento e limites com gráficos de rosca e KPIs de exposição.
  - [x] Lógica de pagamento de fatura com restauração automática de limite.
- [x] **Regra de Arredondamento Estrita**: Implementação centralizada em `financeUtils.js` garantindo 2 casas decimais e arredondamento para baixo (**decimal truncating**) em todos os cálculos monetários.

### 2. Estabilização de Produção — Concluído
- [x] **Correção de ReferenceErrors**: Resolução de falhas críticas de build (`used`, `limit`, `statusColor`, `accBalances`) que interrompiam o carregamento dos módulos de Cartão e Financeiro.
- [x] **Otimização de Performance**: Extração de cálculos pesados para `useMemo` para evitar re-renderizações desnecessárias.

---

## 🟡 Pendências em Aberto / Melhorias de UX

- [x] Implementar filtros por **Período Customizado** (Concluído em 2026-04-01).
- [x] Adicionar filtro por **Status de Confirmação** (Conciliado vs. Estimado) (Concluído em 2026-04-01).

### 2. Monitoramento de Ciclos de Cartão
- [x] Observar comportamento do `closeDay` e permitir edição manual no cadastro de contas (Concluído em 2026-04-01).
- [x] Adicionar aviso visual quando um cartão está com >90% do limite utilizado na tela principal do dashboard (Concluído em 2026-04-01).

---

## ✅ Histórico de Conclusões (Março 2024)

Todas as pendências do relatório de 2026-03-31 foram finalizadas:

| Item | Status anterior | Conclusão |
|---|---|---|
| **Módulo Orçamentos (Budgets)** | ❌ Pendente | ✅ Popup de edição, integração com pedidos e visual moderno implementados. |
| **Integração de Modelos (Production/Tracking)** | ⚠️ Parcial | ✅ Arte/Molde agora visível na fila de produção e rastreio do cliente. |
| **CRM Analytics Dashboard** | ⚠️ Parcial | ✅ Dashboard completo com visualizações, vendas e topo de produtos. |
| **Área do Cliente (Botão na Loja)** | ⚠️ Parcial | ✅ Link "Área do Cliente" adicionado ao header da vitrine pública. |
| **Módulo Designer (Editável)** | ❓ Verificar | ✅ Categorias agora são editáveis e miniaturas otimizadas. |
| **Compressão de Imagens (Firestore)** | ✅ | ✅ Redução automática para <1MB mantida. |

---

## 📌 Orientações de Desenvolvimento
- **Arredondamento**: SEMPRE utilize `formatCurrency()` do `financeUtils.js`. Não realize divisões ou multiplicações de valores monetários sem passar pelo utilitário.
- **Segurança UI**: Sempre inicialize variáveis de estado com valores padrão (Ex: `null`, `0` ou `[]`) para evitar `ReferenceError` em builds de produção (Vite).
