# Memory Box Update - 2026-03-28

## 1. Re-engenharia de Checkout Multi-fontes (Módulo Pedidos & Financeiro)
- **Modal de Pagamentos:** Reescrevemos o componente `ConfirmOrderPaymentModal.jsx` para suportar múltiplas fontes de pagamento (split payment). O operador pode combinar Pix, Dinheiro, e Cartões diferentes em um mesmo pedido.
- **Transação Atômica:** O fluxo de confirmação `handleConfirmPayment` foi atualizado para iterar sobre o array de pagamentos inseridos, dividindo o valor corretamente e registrando os lançamentos de forma íntegra no módulo `FinanceFinal`.
- **Integridade de Dados:** Foram seguidas as regras do *Memory Box* (usando `$ref` para estorno e soft delete), assegurando que o anti-duplicidade continue rodando suavemente em múltiplos terminais.

## 2. Sintonia Fina dos Gráficos (Sazonalidade e Fluxo de Caixa)
- **Modos de Gráfico:** O `FinanceFinal.jsx` ganhou dois modos de visualização no gráfico de Fluxo de Caixa:
  - **Visão Diária (30d):** Foco em pagamentos recentes e próximos.
  - **Tendência Mensal (Sazonal):** Uma lógica expandida em `FinanceHelpers.jsx` que gera a curva financeira consolidando 6 meses anteriores e 6 meses projetados baseados nos vencimentos.

## 3. Próximo Passo: Módulo de Orçamentos
- Criação e Edição de registros estilo popup via CRM.
- Integração profunda: Orçamentos vinculados a Pedidos (usando a referência `fromBudget: budget.id`).
- Visualização de Histórico: Acesso a dados de Produção e Financeiro que retroalimentam o Orçamento originário.
