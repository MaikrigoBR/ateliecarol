# 🧠 Memória de Contexto: Modernização do Importador Financeiro (Ateliê Carol)
**Data de Referência:** 05/04/2026
**Versão Atual da Inteligência:** V9.3 (Status: Depuração de Anti-Duplicidade)

## 🎯 Objetivo da Sessão (O que estávamos fazendo)
Professionalizar o terminal de importação bancária, focando em:
1. **Poda Automática:** Remover o texto de parcelas (" - Parcela 1/5") das descrições para manter o financeiro limpo.
2. **Anti-Duplicidade Autônoma:** Impedir que parcelas importadas de novas faturas criem duplicatas de itens que o sistema já projetou ou importou anteriormente.
3. **Identidade Digital (V9.3):** Uso de Fuzzy Matching (comparação aproximada) para ignorar variações de texto entre faturas.

---

## 🛠️ Arquivos em Edição e Suas Funções
1. `src/components/FinanceBankImport.jsx`: Motor de renderização, agrupamento Hierárquico (Master-Child) e lógica de busca de duplicatas no banco (`isInDB`).
2. `src/services/BankFileParserService.js`: Motor de extração de dados de arquivos OFX, CSV e Texto. Responsável pela "Poda" inicial das descrições.
3. `src/utils/financeUtils.js`: Utilitários de formatação e competência.

---

## 🔍 Diagnóstico do Problema Atual (Por que a V9.3 falhou?)
Apesar da implementação do motor **Fuzzy V9.0** (que extirpa parcelas antes de comparar), a aplicação ainda não está identificando duplicidades de forma autônoma. 

### Hipóteses para Investigação Imediata:
1. **Divergência de Dados Legados:** Registros antigos no bando de dados podem não ter sido limpos da mesma forma, causando falha no match.
2. **Escopo do `existingTransactions`:** O componente recebe as transações como Props. É possível que o Filtro do Dashboard esteja limitando os dados enviados ao importador, fazendo com que ele fique "cego" para parcelas de outros meses.
3. **Regex de Poda:** O padrão `instRegex` pode estar falhando em variações específicas do banco (ex: espaços triplos ou caracteres especiais invisíveis).

---

## 🚀 Plano de Retomada (Próximos Passos Sugeridos)
1. **Auditoria de Estado:** Iniciar logando o conteúdo de `existingTransactions` para verificar se o sistema está enxergando as parcelas anteriores.
2. **Normalização Prévia de Banco:** Rodar um script de limpeza nas descrições de transações já existentes no banco de dados para unificar o padrão com o novo importador.
3. **Fuzzy String Score:** Implementar o algoritmo de *Levenshtein Distance* para permitir matches mesmo com erros de digitação leves do banco.
4. **Modo de Depuração Visual:** Criar uma coluna temporária no terminal de importação mostrando o campo "ID Digital" gerado para cada linha, facilitando o diagnóstico visual do porquê o match falhou.

---

## 📌 Marcador de Identificação
Ao iniciar uma nova interação, aponte para este arquivo. A senha de estado é **"TERMINAL FINANCEIRO V9.3 - RECONSTRUÇÃO HIERÁRQUICA"**.
