# Resumo e Plano de Ação: Upgrade do Motor de Cartões de Crédito (Atelier)

## Contexto

No final da última sessão, concordamos em reconstruir o sistema de gerenciamento de Cartões de Crédito para torná-lo um verdadeiro "Motor de Faturas" (estilo Nubank/Inter), abandonando a ideia de que um cartão é apenas uma conta corrente com saldo negativo.

## O Que Foi Aprovado (A Proposta "Wow")

1. **A Máquina de Parcelamentos:**
   - Capacidade de lançar uma despesa e dividi-la em `X` parcelas.
   - O sistema calculará automaticamente o valor de cada parcela (incluindo juros/sobretaxas) e injetará essas parcelas nos meses futuros.
   - Tags visuais nas faturas (ex: "Compra Insumo (Parcela 1/10)").

2. **Gestor de Fatura (Time Travel):**
   - Criação de um novo componente principal: `<CreditCardManagerModal />`.
   - Um modal imersivo e tecnológico que abre ao clicar em um cartão de crédito na tabela de Finanças.
   - Carrossel de meses no topo (ex: Jan [Paga] -> Fev [Fechada] -> Março [Aberta] -> Abril [Futura]).
   - Capacidade de navegar pelos meses futuros para ver o comprometimento do limite com parcelas que ainda vão vencer.

3. **Status Inteligentes da Fatura:**
   - 🟢 **Em Aberto:** Recebendo novas compras.
   - 🔴 **Fechada:** Aguardando pagamento (dia do fechamento atingido).
   - ⚪ **Paga:** Ação de conciliação onde o usuário informa de qual conta o dinheiro saiu para pagar a fatura, restaurando o limite.

4. **Limímetro Dinâmico:**
   - A barra de progresso do cartão se tornará elástica e inteligente.
   - Capacidade de reajustar o Limite Total do cartão (pois o banco muda o limite).
   - O limite livre volta ao normal automaticamente assim que a fatura do mês é marcada como "Paga".

## Próximos Passos Técnicos (Por Onde a Nova IA Deve Começar)

1. Analisar a estrutura de dados atual das transações (`transactions`) e contas (`accounts`) no `FinanceFinal.jsx`.
2. Adicionar os campos na estrutura de dados de transações para suportar parcelamento (ex: `installments`, `currentInstallment`, `parentId`).
3. Modificar o modal de "Novo Lançamento" (`NewTransactionModal.jsx`) para exibir opções de parcelamento quando o destino for um cartão de crédito.
4. Criar o novo componente `CreditCardManagerModal.jsx`.

---

**Instrução para a IA na próxima sessão:** Ao ler este arquivo, confirme com o usuário se ele deseja iniciar a Etapa 1 do "Plano de Upgrade de Cartões de Crédito" e comece a rascunhar as extensões de dados necessárias.
