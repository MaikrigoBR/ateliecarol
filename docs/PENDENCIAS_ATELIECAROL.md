# 📋 Pendências Identificadas — Ateliê Carol

> **Última Atualização:** 2026-04-01 (Sessão de Finalização do Motor Financeiro)
> **Status Geral:** 🟢 ESTÁVEL EM PRODUÇÃO

---

## 🚀 Entregas Recentes (Abril 2024)

### 1. Sistema Financeiro "Invoice Engine" — Concluído
- [x] **Pagamento em Lote (Bulk Pay)**: Interface de seleção múltipla com barra de ações flutuante para baixa rápida de despesas.
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

### 1. Filtros Avançados no Fluxo de Caixa (Financeiro)
- [ ] Implementar filtros por **Período Customizado** (atualmente é por Mês/Ano fechado).
- [ ] Adicionar filtro por **Status de Confirmação** (Conciliado vs. Estimado).

### 2. Monitoramento de Ciclos de Cartão
- [ ] Observar comportamento do `closeDay` em produção para cartões com viradas de mês atípicas.
- [ ] Adicionar aviso visual quando um cartão está com >90% do limite utilizado na tela principal do dashboard.

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
