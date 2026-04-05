# 📋 Plano de Implementação: Importador V10.0 "Espelho Fiel"

## 🎯 Objetivo
Transformar o importador em um sistema de "Espelho Fiel" ao banco, eliminando a criação proativa de parcelas futuras e focando na precisão de reconciliação e indexação ao catálogo.

---

## 🛠️ Checklist de Alterações

### 1. Limpeza de Código (Decommissioning)
- [ ] Remover loop de criação de transações projetadas (`isProjected`).
- [ ] Eliminar lógica `alreadyPresent` (agora obsoleta sem as projeções).
- [ ] Remover referências a `source: 'projection'` e `status: 'paid'/'pending'` automáticos baseados em posição de parcela.

### 2. Refinamento do Motor de Anti-Duplicidade (Legado V9)
- [ ] Manter `isWithinTolerance` (± R$ 0.05).
- [ ] Manter `getsMonthYear` para recorrências (V9.5).
- [ ] Manter `getFuzzy` (V9.4) para ID Digital.

### 3. Nova Inteligência de Vínculo (Auto-Indexação)
- [ ] Implementar busca de `linkedItemId` baseado em `fuzzyId` no histórico. 
  - *Se você já vinculou "LOJA X" a uma "Máquina" no passado, o novo importador já deve vir com essa sugestão pré-selecionada.*

### 4. Interface e Experiência
- [ ] Ocultar coluna de "Audit ID" (manter apenas no console para depuração técnica).
- [ ] Simplificar a visualização Master-Child para apenas "Linhas de Banco".
- [ ] Adicionar um badge de "Vínculo Sugerido" quando encontrar relação com o catálogo.

---

## 📅 Status do Projeto
- **Versão Atual:** 9.6
- **Próxima Versão:** 10.0 (Status: Planejamento)
- **Risco:** Baixo (Simplificação de código)
- **Vantagem:** Estabilidade 100% fiel ao extrato bancário.
