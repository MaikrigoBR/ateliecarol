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
  // Usamos Date.UTC ou garantimos que a hora não influencie no mês
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
    // Arredondamento padrão para 2 casas decimais
    // Adicionamos + 0 para remover o sinal negativo em casos de "-0,00" (JavaScript float quirk)
    const rounded = (Math.round(Number(value) * 100) / 100) + 0;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function groupByInvoiceCycle(transactions, selectedCard) {
    if (!selectedCard || !transactions) return [];

    const dueDay = Number(selectedCard.dueDay || 10);
    const closeDay = Number(selectedCard.closeDay || (dueDay - 7 <= 0 ? 30 + (dueDay - 7) : dueDay - 7));
    
    const groups = {};
    
    const parseSafeDate = (dStr) => {
        if (!dStr || typeof dStr !== 'string') return null;
        const bits = dStr.includes('-') ? dStr.split('-') : dStr.split('/');
        if (bits.length < 3) return null;
        let y, m, d;
        if (bits[0].length === 4) { y = Number(bits[0]); m = Number(bits[1]); d = Number(bits[2]); }
        else { y = Number(bits[2]); m = Number(bits[1]); d = Number(bits[0]); }
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        return { y, m, d };
    };

    // 1. Processar Transações Reais
    const relevantTrans = transactions.filter(t => !t.deleted && String(t.accountId) === String(selectedCard.id));

    relevantTrans.forEach(t => {
        try {
            const dt = parseSafeDate(t.date);
            if (!dt) return;

            let invoiceRef = new Date(dt.y, dt.m - 1, 1);
            if (dt.d >= closeDay) invoiceRef.setMonth(invoiceRef.getMonth() + 1);

            const descLower = (t.description || "").toLowerCase();
            const isInvoicePayment = descLower.includes('pagamento') || descLower.includes('liquidação') || descLower.includes('fatura');
            
            // Se for pagamento de fatura, retroagimos para o mês que ele está quitando
            if (isInvoicePayment && (t.type === 'income' || Number(t.amount) < 0)) {
                invoiceRef.setMonth(invoiceRef.getMonth() - 1);
            }

            const key = `${invoiceRef.getFullYear()}-${String(invoiceRef.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) {
                groups[key] = { key, year: invoiceRef.getFullYear(), month: invoiceRef.getMonth(), transactions: [], total: 0, paidAmount: 0 };
            }

            groups[key].transactions.push(t);
            const amount = Number(t.amount || 0);

            if (isInvoicePayment) {
                // Pagamentos NÃO somam nem subtraem do VOLUME da fatura no gráfico, eles "quitam" o valor
                groups[key].paidAmount += Math.abs(amount);
            } else {
                // Compras (expense) e Estornos (income não relacionado a fatura)
                if (t.type === 'income') groups[key].total -= Math.abs(amount);
                else groups[key].total += Math.abs(amount);
            }
        } catch (e) { console.error(e); }
    });

    // 2. Processar Projeções Virtuais
    relevantTrans.forEach(t => {
        try {
            if (!t.installmentsTotal || t.installmentsTotal <= 1 || !t.installmentNumber) return;
            const amount = Number(t.amount || 0);
            const total = Number(t.installmentsTotal);
            const current = Number(t.installmentNumber);
            const dt = parseSafeDate(t.date);
            if (!dt) return;
            
            let currentInvoiceRef = new Date(dt.y, dt.m - 1, 1);
            if (dt.d >= closeDay) currentInvoiceRef.setMonth(currentInvoiceRef.getMonth() + 1);

            for (let i = 1; i <= total; i++) {
                if (i === current) continue; 
                let targetInvoiceRef = new Date(currentInvoiceRef.getFullYear(), currentInvoiceRef.getMonth() + (i - current), 1);
                const key = `${targetInvoiceRef.getFullYear()}-${String(targetInvoiceRef.getMonth() + 1).padStart(2, '0')}`;

                const hasActual = (groups[key]?.transactions || []).some(at => 
                    (at.description || "").toLowerCase() === (t.description || "").toLowerCase() && 
                    Math.abs(Number(at.amount) - amount) < 0.05
                );

                if (!hasActual) {
                    if (!groups[key]) {
                        groups[key] = { key, year: targetInvoiceRef.getFullYear(), month: targetInvoiceRef.getMonth(), transactions: [], total: 0, paidAmount: 0, isProjection: true };
                    }
                    groups[key].total += amount;
                }
            }
        } catch (e) { console.error(e); }
    });

    return Object.values(groups).map(g => ({
        ...g,
        total: Math.max(0, Math.round(g.total * 100) / 100),
        paidAmount: Math.round(g.paidAmount * 100) / 100
    })).sort((a,b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}
