/**
 * FinanceAuditService.js
 * Advanced diagnostic engine for identifying financial leaks, orphaned transactions,
 * and balance discrepancies.
 */
import db from './database';
import * as XLSX from 'xlsx';

const FinanceAuditService = {
    /**
     * Run a full health check on all accounts and transactions
     */
    runFullAudit: async () => {
        const accounts = await db.getAll('accounts');
        const transactions = await db.getAll('transactions');
        
        const reports = [];
        
        for (const account of accounts) {
            const accTransactions = transactions.filter(t => t.accountId === account.id && t.status === 'paid');
            
            // 1. Calculate Expected Balance
            const initialBalance = parseFloat(account.balance || 0);
            const totalIncome = accTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const totalExpense = accTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            
            const expectedBalance = initialBalance + totalIncome - totalExpense;
            const currentStoredBalance = parseFloat(account.current_balance || initialBalance);
            
            const discrepancy = Math.abs(expectedBalance - currentStoredBalance);
            
            if (discrepancy > 0.01) {
                reports.push({
                    type: 'balance_discrepancy',
                    severity: 'high',
                    accountId: account.id,
                    accountName: account.name,
                    storedBalance: currentStoredBalance,
                    recalculatedBalance: expectedBalance,
                    diff: discrepancy,
                    message: `O saldo exibido (R$ ${currentStoredBalance.toFixed(2)}) diverge do extrato real (R$ ${expectedBalance.toFixed(2)}).`
                });
            }

            // 2. Identify Negative Balance
            if (expectedBalance < 0 && account.type !== 'credit') {
                reports.push({
                    type: 'negative_balance',
                    severity: 'medium',
                    accountId: account.id,
                    accountName: account.name,
                    balance: expectedBalance,
                    message: `A conta está no negativo. Verifique se há entradas não registradas.`
                });
            }
        }

        // 3. Identify Potential Duplicates in DB (V6 - FUZZY MATCH)
        // We use a temporal window and normalized descriptions to find 'ghost' duplicates
        const normalizedTrans = transactions.map(t => ({
            ...t,
            normDesc: (t.description || '').toLowerCase()
                .replace(/\d+\/\d+/g, '') // Remove 01/10
                .replace(/parc\w*/g, '')   // Remove Parc.
                .replace(/\s+/g, ' ')
                .trim(),
            normDate: new Date(t.date).getTime()
        })).sort((a,b) => a.normDate - b.normDate);

        for (let i = 0; i < normalizedTrans.length; i++) {
            for (let j = i + 1; j < normalizedTrans.length; j++) {
                const a = normalizedTrans[i];
                const b = normalizedTrans[j];
                
                // Only compare within same account
                if (a.accountId !== b.accountId) continue;
                
                // Temporal Window: +/- 3 days (259200000 ms)
                const dayDiff = Math.abs(a.normDate - b.normDate);
                const isWithinWindow = dayDiff <= 259200000;
                
                // Financial Tolerance: +/- 0.05
                const amtDiff = Math.abs(Number(a.amount) - Number(b.amount));
                const isSameAmount = amtDiff <= 0.05;

                // Simple Description Match (at least 70% similar or normalized equality)
                const isSameDesc = a.normDesc === b.normDesc;

                if (isWithinWindow && isSameAmount && isSameDesc && a.id !== b.id) {
                    reports.push({
                        type: 'duplicate_transaction',
                        severity: 'low',
                        transaction: b,
                        originalTransaction: a,
                        message: `Possível duplicidade inteligente detectada: "${a.description}" em ${a.date} vs "${b.description}" em ${b.date}.`
                    });
                }

                // If dates are too far apart in sorted list, break inner loop to save performance
                if (dayDiff > 300000000) break; 
            }
        }

        // 4. Identify Orphaned Transactions (No valid account)
        const accountIds = new Set(accounts.map(a => a.id));
        transactions.forEach(t => {
            if (t.accountId && !accountIds.has(t.accountId)) {
                reports.push({
                    type: 'orphaned_transaction',
                    severity: 'high',
                    transaction: t,
                    message: `Lançamento órfão! Refere-se a uma conta que foi excluída.`
                });
            }
        });

        return reports;
    },

    /**
     * Fix balance discrepancies by updating account.current_balance
     */
    repairBalance: async (accountId) => {
        const account = await db.getById('accounts', accountId);
        const transactions = await db.getAll('transactions');
        const accTransactions = transactions.filter(t => t.accountId === accountId && t.status === 'paid');
        
        const initialBalance = parseFloat(account.balance || 0);
        const totalIncome = accTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalExpense = accTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const realBalance = initialBalance + totalIncome - totalExpense;
        
        await db.update('accounts', accountId, {
            ...account,
            current_balance: realBalance
        });
        
        return realBalance;
    },
    /**
     * Generate an enriched report for accountancy purposes
     */
    generateAccountantReport: async (startDate, endDate) => {
        const transactions = await db.getAll('transactions') || [];
        const accounts = await db.getAll('accounts') || [];
        const equipments = await db.getAll('equipments') || [];
        const materials = await db.getAll('inventory') || []; // Inventory uses 'inventory' store

        const filtered = transactions.filter(t => {
            if (!t.date) return false;
            // Compare as strings YYYY-MM-DD which is safe for ISO dates
            return t.date >= startDate && t.date <= endDate;
        });

        // Enriching data for accountant
        return filtered.map(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            let linkedName = '';
            if (t.linkedItemId) {
                const item = [...equipments, ...materials].find(i => i.id === t.linkedItemId);
                linkedName = item ? (item.name || item.description) : 'Item vinculado';
            }
            
            return {
                'Data': t.date.split('-').reverse().join('/'),
                'Conta': acc ? acc.name : 'N/A',
                'Descrição Original': t.description,
                'ID Operação': t.bankReferenceId || 'N/A',
                'Impacto (R$)': Number(t.amount).toFixed(2),
                'Tipo': t.type === 'income' ? 'ENTRADA' : 'SAÍDA',
                'Categoria': t.category,
                'Centro de Custo': t.costCenter || 'Geral',
                'Vínculo': linkedName || 'N/A',
                'Status': t.status === 'paid' ? 'QUITADO' : 'PENDENTE',
                'Parcela': t.installmentNumber ? `${t.installmentNumber}/${t.installmentsTotal}` : 'À Vista'
            };
        });
    },

    /**
     * Export data to Excel (XLSX)
     */
    exportToExcel: (data, filename) => {
        if (!data || data.length === 0) return;
        
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Financeiro");
            
            // Set column widths for better readability
            const wscols = Object.keys(data[0]).map(key => ({
                wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
            }));
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `${filename}.xlsx`);
        } catch (error) {
            console.error("Erro ao gerar Excel:", error);
            // Fallback to basic link trigger if writeFile fails in some environments
            alert("Erro ao formatar Excel. Verifique o console.");
        }
    },
    /**
     * Reassign orphaned transactions to a system 'Adjustment Account'
     */
    repairOrphanedTransactions: async (transactionIds) => {
        let adjustmentAcc = (await db.getAll('accounts')).find(a => a.name === 'Ajuste de Auditoria');
        
        if (!adjustmentAcc) {
            adjustmentAcc = await db.create('accounts', {
                name: 'Ajuste de Auditoria',
                type: 'adjustment',
                initialBalance: 0,
                color: '#9ca3af',
                description: 'Conta automática para resgate de lançamentos órfãos.'
            });
        }

        for (const id of transactionIds) {
            const t = await db.getById('transactions', id);
            if (t) {
                await db.update('transactions', id, {
                    ...t,
                    accountId: adjustmentAcc.id,
                    auditNote: 'Resgatado por Auto-Reparo de Auditoria V10.5'
                });
            }
        }
        return adjustmentAcc.id;
    }
};

export default FinanceAuditService;
