# Plano de Ação Atualizado: Motor de Cartões de Crédito e Gestão de Contas a Pagar

## 1. Visão Geral
Este documento atualiza o plano anterior para incluir as diretrizes de inovação em monitoramento de endividamento, agrupamento preciso por ciclo de fechamento e otimização da gestão de contas a pagar (Contas a Pagar) em todo o sistema financeiro.

## 2. Inovações em Cartões de Crédito

### 2.1 Agrupamento por Ciclo de Fechamento (Inteligência Real)
- **Problema:** Atualmente as despesas são agrupadas por mês civil. Cartões reais têm "Dia de Fechamento".
- **Solução:** Implementar lógica onde:
  - Se data da compra <= `diaFechamento`: Pertence à fatura do mês atual.
  - Se data da compra > `diaFechamento`: Pertence à fatura do próximo mês.
- **Visualização:** O carrossel de meses mostrará as faturas com base no vencimento, mas os itens dentro serão filtrados pelo ciclo de fechamento.

### 2.2 Monitoramento de Endividamento e Limites
- **Painel de Exposição:** Criar um KPI consolidado de "Endividamento Total em Cartões".
- **Alerta de Comprometimento:** Visualizar qual % da renda mensal está comprometida com faturas de cartões.
- **Saúde do Limite:** Dashboard comparativo de Limite Utilizado vs. Limite Disponível em todos os cartões.

### 2.3 Gestão Eficiente de Faturas
- **Fluxo de Pagamento:** Facilitar a conciliação ("Pagar Fatura") com seleção automática do saldo disponível em outras contas.
- **Previsibilidade:** Projeção de faturas futuras considerando parcelamentos pendentes.

## 3. Otimização de Contas a Pagar (Global)

### 3.1 Visão Unificada de Obrigações
- **Agenda de Pagamentos:** Centralizar todos os lançamentos `pending` (pendentes) de todas as contas em uma linha do tempo única.
- **Alertas de Vencimento:** Diferenciar visualmente contas Vencidas, Vencendo Hoje e Futuras.
- **Integração com Cartões:** Tratar a fatura do cartão como uma "Conta a Pagar" gigante que precisa de atenção no dia do vencimento.

### 3.2 Melhorias na Gestão
- **Pagamento em Lote:** Permitir marcar múltiplas transações pendentes como pagas simultaneamente.
- **Filtros Avançados:** Filtrar por fornecedor, categoria ou conta específica no módulo de contas a pagar.

## 4. Próximos Passos Técnicos

1. **Refatorar Lógica de Ciclo (CreditCardManagerModal & CreditCards.jsx):** Mudar de filtragem por mês civil para filtragem por ciclo de `closeDay`.
2. **Implementar Dashboard de Endividamento:** Adicionar KPIs de exposição ao crédito em `FinanceFinal.jsx`.
3. **Módulo de Contas a Pagar Revisitado:** Criar ou aprimorar a aba de obrigações em aberto, integrando com o fluxo de caixa.
4. **Utilização de Math.floor:** Garantir que toda a exibição monetária nestes novos painéis siga o padrão de 2 casas decimais arredondadas para baixo.

---
*Assinado: Antigravity AI*
*Status: CONCLUÍDO - Deploy realizado em 01/04/2026*
