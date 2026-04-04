import React, { useMemo } from 'react';
import { 
    Calendar, TrendingUp, TrendingDown, AlertCircle, 
    CheckCircle, CreditCard, ArrowRight, Info,
    BarChart3, PieChart, Activity
} from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';

export function FinanceProjectionDashboard({ transactions, accounts, orders }) {
    const projection = useMemo(() => {
        const months = [];
        const today = new Date();
        const currentMonth = today.getUTCMonth();
        const currentYear = today.getUTCFullYear();

        // Calculate initial consolidated balance across all checking/savings accounts
        const initialCash = accounts
            .filter(a => a.type !== 'credit')
            .reduce((sum, a) => sum + Number(a.balance || 0), 0);

        let runningProjectedBalance = initialCash;

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, currentMonth + i, 1);
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            // 1. Credit Card Invoices (Faturas)
            // Sum of all 'paid' is 0, we care about 'pending' installments or transactions
            const creditExpenses = transactions.filter(t => {
                const tDate = new Date(t.date);
                const isCorrectMonth = tDate.getUTCMonth() === date.getUTCMonth() && tDate.getUTCFullYear() === date.getUTCFullYear();
                const account = accounts.find(a => a.id === t.accountId);
                return isCorrectMonth && t.type === 'expense' && account?.type === 'credit' && t.status === 'pending';
            }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

            // 2. Regular Pending Expenses (Landmark/Check/etc)
            const regularExpenses = transactions.filter(t => {
                const tDate = new Date(t.date);
                const isCorrectMonth = tDate.getUTCMonth() === date.getUTCMonth() && tDate.getUTCFullYear() === date.getUTCFullYear();
                const account = accounts.find(a => a.id === t.accountId);
                return isCorrectMonth && t.type === 'expense' && account?.type !== 'credit' && t.status === 'pending';
            }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

            // 3. Expected Incomes (Pending Transactions + Orders)
            const transIncome = transactions.filter(t => {
                const tDate = new Date(t.date);
                const isCorrectMonth = tDate.getUTCMonth() === date.getUTCMonth() && tDate.getUTCFullYear() === date.getUTCFullYear();
                return isCorrectMonth && t.type === 'income' && t.status === 'pending';
            }).reduce((sum, t) => sum + Number(t.amount || 0), 0);

            const orderIncome = orders.filter(o => {
                const targetDate = o.nextDueDate || o.deadline || o.createdAt;
                if (!targetDate) return false;
                const oDate = new Date(targetDate);
                return oDate.getUTCMonth() === date.getUTCMonth() && oDate.getUTCFullYear() === date.getUTCFullYear();
            }).reduce((sum, o) => sum + Number(o.balanceDue || o.total || 0), 0);

            const totalIncome = transIncome + orderIncome;
            const totalExpense = creditExpenses + regularExpenses;
            
            runningProjectedBalance += (totalIncome - totalExpense);

            months.push({
                label: monthLabel,
                monthKey,
                creditExpenses,
                regularExpenses,
                totalIncome,
                totalExpense,
                balance: runningProjectedBalance,
                isNegative: runningProjectedBalance < 0
            });
        }
        return months;
    }, [transactions, accounts, orders]);

    const totalCriticalMonths = projection.filter(m => m.isNegative).length;

    return (
        <div className="animate-fade-in" style={{ padding: '24px 0' }}>
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Projeção de Fluxo de Caixa</h3>
                    <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Análise Preditiva de 12 Meses (Faturas e Recebíveis)</p>
                </div>
                <div style={{ padding: '10px 20px', borderRadius: '12px', background: totalCriticalMonths > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${totalCriticalMonths > 0 ? '#fee2e2' : '#dcfce7'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {totalCriticalMonths > 0 ? (
                        <AlertCircle size={20} style={{ color: '#ef4444' }} />
                    ) : (
                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                    )}
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: totalCriticalMonths > 0 ? '#ef4444' : '#10b981', textTransform: 'uppercase' }}>
                        {totalCriticalMonths > 0 ? `${totalCriticalMonths} Meses com Risco de Caixa` : 'Fluxo Saudável Projetado'}
                    </span>
                </div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {projection.map((m, idx) => (
                    <div 
                        key={idx} 
                        style={{ 
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '24px', 
                            padding: '24px',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s'
                        }}
                        className="hover:shadow-md"
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: m.isNegative ? '#ef4444' : (idx === 0 ? 'var(--primary)' : 'var(--border)') }} />
                        
                        <div className="flex justify-between items-start mb-lg">
                            <div>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'capitalize', margin: 0 }}>{m.label}</h4>
                                <p className="text-[10px] text-muted font-black uppercase mt-1">Status Projetado</p>
                            </div>
                            {m.isToday && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '6px' }}>ATUAL</span>
                            )}
                        </div>

                        <div className="space-y-md">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-sm text-xs text-muted font-bold">
                                    <TrendingUp size={14} className="text-green-500" /> Entradas Previstas
                                </div>
                                <span className="text-xs font-black text-green-600">R$ {m.totalIncome.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center" style={{ paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
                                <div className="flex items-center gap-sm text-xs text-muted font-bold">
                                    <TrendingDown size={14} className="text-red-500" /> Saídas Totais
                                </div>
                                <span className="text-xs font-black text-red-600">R$ {m.totalExpense.toFixed(2)}</span>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-muted font-black uppercase tracking-widest">Comprometimento Cartões</span>
                                    <span className="text-[10px] font-bold text-slate-700">R$ {m.creditExpenses.toFixed(2)}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--background)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${Math.min(100, (m.creditExpenses / (m.totalExpense || 1)) * 100)}%`, 
                                        height: '100%', 
                                        background: 'var(--primary)' 
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-xs font-black text-slate-400 uppercase">Saldo Final</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: m.isNegative ? '#ef4444' : 'var(--text-main)' }}>
                                    R$ {m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {m.isNegative && (
                                    <p className="text-[9px] text-red-500 font-black uppercase mt-1 animate-pulse">Risco de Inadimplência</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ marginTop: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px' }}>
                <div className="flex gap-xl">
                    <div style={{ flex: 1 }}>
                        <h4 className="flex items-center gap-sm text-sm font-black text-slate-700 uppercase tracking-widest mb-md">
                            <Activity size={18} className="text-primary" /> Diagnóstico da Inteligência
                        </h4>
                        <p className="text-sm text-muted leading-relaxed">
                            Nossa análise preditiva combinou as faturas recorrentes de cartões de crédito, parcelamentos de estoque e prazos de recebimento de pedidos para gerar este mapa. O saldo considera a liquidez imediata das contas de giro.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p className="text-[10px] text-muted font-bold uppercase mb-2">Pior Cenário (Min.)</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>
                                R$ {Math.min(...projection.map(m => m.balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                         <div style={{ textAlign: 'center' }}>
                            <p className="text-[10px] text-muted font-bold uppercase mb-2">Melhor Cenário (Max.)</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>
                                R$ {Math.max(...projection.map(m => m.balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
