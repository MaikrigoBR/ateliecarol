/**
 * Calcula a qual mês de fatura uma transação pertence, baseado no dia de fechamento do cartão.
 * 
 * @param {string} dateStr - Data da transação no formato YYYY-MM-DD
 * @param {number} closeDay - Dia de fechamento da fatura
 * @returns {Date} - Primeiro dia do mês da fatura correspondente
 */
export function getInvoiceMonth(dateStr, closeDay) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const transDate = new Date(y, m - 1, d);
  
  // Se o dia da compra for maior ou igual ao dia de fechamento, a conta vai para o próximo mês
  if (d >= closeDay) {
    return new Date(y, m, 1); // Mês subsequente à compra
  }
  
  return new Date(y, m - 1, 1); // Mesmo mês da compra
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
        if (t.accountId !== selectedCard.id) return;
        if (t.type !== 'expense' && t.type !== 'income') return;

        const invoiceMonth = getInvoiceMonth(t.date, processedCloseDay);
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
