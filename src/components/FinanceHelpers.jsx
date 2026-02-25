
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

// Helper to process financial data
export function calculateFinancialStats(transactions, orders, accounts, dateFilter) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const startDate = new Date(today);
    const daysBack = dateFilter.daysBack || 30;
    startDate.setDate(today.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);
    
    const daysForward = dateFilter.daysForward || 90;
    const totalDays = daysBack + daysForward;

    // 1. Calculate Initial Balance (Acumulado até o dia anterior ao inicio do grafico)
    const accountsInitial = accounts.reduce((sum, a) => sum + Number(a.initialBalance || 0), 0);
    
    // 2. Past paid transactions (before startDate) to determine runningBalance at startDate
    const pastTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date);
        if (isNaN(tDate)) return false;
        tDate.setHours(0,0,0,0);
        return tDate < startDate && t.status === 'paid';
    });
    
    const pastBalance = pastTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
    }, 0);

    let runningBalance = accountsInitial + pastBalance;
    
    // 3. Prepare Effective Dates for Projections (Shift overdue/unpaid to TODAY)
    const effectiveTransactions = transactions.map(t => {
        let effectiveDate = t.date;
        if (t.status !== 'paid') {
            if (!effectiveDate || effectiveDate < todayStr) {
                effectiveDate = todayStr; // Push to today
            }
        }
        return { ...t, effectiveDate };
    });

    const pendingOrders = orders.filter(o => o.status !== 'Concluído' && o.status !== 'cancelled' && o.status !== 'completed');
    const effectiveOrders = pendingOrders.map(o => {
        let targetDate = '';
        if (o.nextDueDate) {
            targetDate = new Date(o.nextDueDate).toISOString().split('T')[0];
        } else if (o.deadline) {
            targetDate = new Date(o.deadline).toISOString().split('T')[0];
        } else if (o.createdAt) {
            const created = new Date(o.createdAt);
            created.setDate(created.getDate() + 7);
            targetDate = created.toISOString().split('T')[0];
        } else {
            targetDate = todayStr;
        }

        let effectiveDate = targetDate;
        if (!effectiveDate || effectiveDate < todayStr) {
            effectiveDate = todayStr; // Push overdue orders to today
        }
        
        const balanceDue = Number(o.balanceDue !== undefined ? o.balanceDue : (o.total || 0));
        return { ...o, effectiveDate, balanceDue };
    });

    const data = [];
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        // Match day
        const dayTransactions = effectiveTransactions.filter(t => t.effectiveDate === dateStr);

        const income = dayTransactions
            .filter(t => t.type === 'income' && t.status === 'paid')
            .reduce((sum, t) => sum + Number(t.amount), 0);
            
        const pendingIncome = dayTransactions
            .filter(t => t.type === 'income' && t.status !== 'paid')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const paidExpense = dayTransactions
            .filter(t => t.type === 'expense' && t.status === 'paid')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const pendingExpense = dayTransactions
            .filter(t => t.type === 'expense' && t.status !== 'paid')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const projectedIncomeFromOrders = effectiveOrders
            .filter(o => o.effectiveDate === dateStr)
            .reduce((sum, o) => sum + o.balanceDue, 0);

        const totalIncome = income + pendingIncome + projectedIncomeFromOrders;
        const totalExpense = paidExpense + pendingExpense;
        
        // The balance projection in the future assumes all pending items are paid on their effective date
        runningBalance += (totalIncome - totalExpense);

        data.push({
            name: dayLabel,
            fullName: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
            Receitas: income,
            Projeção: pendingIncome + projectedIncomeFromOrders,
            Despesas: paidExpense,
            APagar: pendingExpense,
            Saldo: runningBalance,
            isToday: dateStr === todayStr,
            isWeekend: d.getDay() === 0 || d.getDay() === 6
        });
    }
    return data;
}



export function FinancialSummary({ data, onFilterChange, currentFilter }) {
    if (!data || data.length === 0) return null;

    const totalIncome = data.reduce((acc, d) => acc + d.Receitas + d.Projeção, 0);
    const totalExpense = data.reduce((acc, d) => acc + d.Despesas + d.APagar, 0);
    const periodResult = totalIncome - totalExpense;
    const projectedFinalBalance = data[data.length - 1]?.Saldo || 0;

    const FilterButton = ({ days }) => (
        <button
            onClick={() => onFilterChange(days)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentFilter === days 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
            {days} dias
        </button>
    );

    const SummaryCard = ({ title, value, type, icon: Icon }) => {
        let colors = "text-gray-900";
        if (type === 'income') colors = "text-emerald-600";
        if (type === 'expense') colors = "text-red-600";
        if (type === 'result') colors = value >= 0 ? "text-blue-600" : "text-orange-600";
        if (type === 'balance') colors = "text-indigo-600";

        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-[140px]">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</span>
                    <div className={`p-2 rounded-lg bg-gray-50 ${colors}`}>
                        <Icon size={20} />
                    </div>
                </div>
                <div>
                    <h3 className={`text-2xl font-bold ${colors}`}>
                        {type === 'result' && value > 0 ? '+' : ''}
                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">no período selecionado</p>
                </div>
            </div>
        );
    };

    return (
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    Resumo Financeiro
                </h3>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {[30, 60, 90].map(d => (
                         <button
                            key={d}
                            onClick={() => onFilterChange(d)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                currentFilter === d 
                                ? 'bg-gray-100 text-gray-900 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard title="Total de Entradas" value={totalIncome} type="income" icon={TrendingUp} />
                <SummaryCard title="Total de Saídas" value={totalExpense} type="expense" icon={TrendingDown} />
                <SummaryCard title="Resultado Líquido" value={periodResult} type="result" icon={DollarSign} />
                <SummaryCard title="Saldo Projetado" value={projectedFinalBalance} type="balance" icon={TrendingUp} />
            </div>
        </div>
    );
}

