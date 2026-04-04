/**
 * Calcula a qual mês de fatura uma transação pertence, baseado no dia de fechamento do cartão.
 * 
 * @param {string} dateStr - Data da transação no formato YYYY-MM-DD
 * @param {number} closeDay - Dia de fechamento da fatura
 * @returns {Date} - Primeiro dia do mês da fatura correspondente
 */
export function getInvoiceMonth(dateStr, closeDay) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date();
  
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
  
  const normalizedCloseDay = Number(closeDay) || 3;
  
  // Se o dia da compra for maior ou igual ao dia de fechamento, a conta vai para o próximo mês
  if (d >= normalizedCloseDay) {
    return new Date(y, m, 1);
  }
  
  return new Date(y, m - 1, 1);
}

/**
 * Formata um valor monetário no padrão solicitado (2 casas decimais, arredondado para baixo).
 * 
 * @param {number} value - Valor numérico
 * @returns {string} - Valor formatado (Ex: 1.234,56 -> "1234,56")
 */
export function formatCurrency(value) {
    if (isNaN(value) || value === null) return '0,00';
    // Arredonda para baixo conforme diretriz
    const floored = Math.floor(Number(value) * 100) / 100;
    return floored.toFixed(2).replace('.', ',');
}

/**
 * Agrupa transações por mês de fatura.
 */
export function groupByInvoiceCycle(transactions, selectedCard) {
    if (!selectedCard || !transactions) return [];
    
    const closeDay = Number(selectedCard.closeDay || (Number(selectedCard.dueDay || 10) - 7));
    const processedCloseDay = closeDay <= 0 ? (30 + closeDay) : closeDay;

    const groups = {};
    
    transactions.forEach(t => {
        if (String(t.accountId) !== String(selectedCard.id)) return;
        if (t.type !== 'expense' && t.type !== 'income') return;

        let invoiceMonth = getInvoiceMonth(t.date, processedCloseDay);
        
        // Regra Especial de Pagamento de Fatura: Se for crédito (income) e for logo após o fechamento,
        // vinculamos à fatura que acabara de fechar para o usuário ver o abatimento correto.
        const isInvoicePayment = t.category === 'Pagamento de Fatura' || t.description.toLowerCase().includes('pagamento fatura');
        if (t.type === 'income' && isInvoicePayment) {
            const tDay = Number(t.date.split('-')[2]);
            // Se o dia do pagamento for entre o fechamento e o dia 15, provavelmente é o pagamento da conta anterior
            if (tDay >= processedCloseDay && tDay <= 15) {
                invoiceMonth = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() - 1, 1);
            }
        }

        const key = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groups[key]) {
            groups[key] = {
                key,
                year: invoiceMonth.getFullYear(),
                month: invoiceMonth.getMonth(),
                transactions: [],
                total: 0
            };
        }
        
        groups[key].transactions.push(t);
        if (t.type === 'expense') groups[key].total += Number(t.amount || 0);
        else groups[key].total -= Number(t.amount || 0); // Pagamentos (income) reduzem o total da fatura
    });
    
    return Object.values(groups).sort((a,b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}
