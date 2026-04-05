/**
 * FinanceBalanceHelper.js
 * Centralized logic for calculating account balances to ensure consistency 
 * across Finance, Orders, and any other module that handles money.
 */
import db from '../services/database';

export const calculateAccountBalance = async (accountId, transactions = null) => {
    const account = await db.getById('accounts', accountId);
    if (!account) return 0;

    // Use provided transactions or fetch all if not provided
    const allTrans = transactions || await db.getAll('transactions') || [];
    
    // Only 'paid' transactions affect the actual current balance
    const accountTrans = allTrans.filter(t => 
        String(t.accountId) === String(accountId) && 
        t.status === 'paid' &&
        !t.deleted // Safety for logic changes later
    );

    const initial = Number(account.initialBalance || 0);
    const income = accountTrans
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = accountTrans
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return initial + income - expense;
};

/**
 * Bulk recalculate all account balances
 */
export const recalculateAllBalances = async () => {
    const accounts = await db.getAll('accounts') || [];
    const transactions = await db.getAll('transactions') || [];
    
    const results = {};
    for (const acc of accounts) {
        results[acc.id] = await calculateAccountBalance(acc.id, transactions);
    }
    return results;
};
