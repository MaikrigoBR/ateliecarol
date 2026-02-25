import React, { useState, useMemo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CreditCard, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import db from '../services/database';

export function CreditCardManagerModal({ account, transactions, onClose, onUpdate }) {
    const [selectedDate, setSelectedDate] = useState(() => {
        // Start view in the current month
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const [isEditingLimit, setIsEditingLimit] = useState(false);
    const [newLimit, setNewLimit] = useState(account.limit || 0);

    // Calculate months to show in the carousel (3 months back, 12 months ahead)
    const carouselMonths = useMemo(() => {
        const months = [];
        const base = new Date();
        base.setDate(1);
        
        for (let i = -3; i <= 12; i++) {
            const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
            months.push(d);
        }
        return months;
    }, []);

    const isSameMonth = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    };

    // Card Details
    const limit = Number(account.limit || 0);

    // Get transactions specific to this exact month's invoice
    // Invoice "Month" usually closes on dueDay - 7
    const currentMonthTrans = useMemo(() => {
        return transactions.filter(t => {
            if (t.accountId !== account.id) return false;
            if (t.type !== 'expense') return false; // Invoices only sum expenses explicitly paid with credit
            
            // Assume the transaction date falls into the selected month's invoice
            // This is a simplification: if the transaction is on 2024-03-05, it falls into March.
            // If we needed strictly closing day logic, we'd check if date <= closingDay and > prevClosingDay
            const [y, m, d] = t.date.split('-');
            const transDate = new Date(y, m - 1, d);
            
            return isSameMonth(transDate, selectedDate);
        }).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [transactions, account.id, selectedDate]);

    // Calculate invoice total for THIS selected month
    const invoiceTotal = currentMonthTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Dynamic Limit Calculation
    // Total used limit = sum of ALL unresolved credit card transactions (past unpaid, current open, future pending)
    const usedLimit = useMemo(() => {
        return transactions.filter(t => {
            if (t.accountId !== account.id) return false;
            if (t.type !== 'expense') return false;
            // Unresolved means it hasn't been paid via "pagar fatura" (status still pending or paid but not reconciled)
            // For credit cards, 'pending' generally signifies future installments, 'paid' might signify already committed.
            // A true Reconciliation would need an "invoice structure" or we just sum all transactions that we haven't officially "cleared" from credit card.
            // Simplified: We sum ALL transactions in this credit card account that are fundamentally outstanding or "paid" but haven't reduced the card's native 'balance' offset.
            // Wait, we can just use the absolute of account.balance? Yes! account.balance already holds the net aggregation of unpaid transactions if managed correctly.
            // But since we want to be independent and calculate it:
            return true; 
        }).reduce((acc, t) => {
            if (t.status === 'paid' && t.category === 'Pagamento de Fatura') {
                 // Paying an invoice frees limit
                 return acc - Number(t.amount);
            }
            if (t.type === 'expense') {
                return acc + Number(t.amount);
            }
            return acc;
        }, 0);
    }, [transactions, account.id]);
    
    // For now, simpler: Use the pre-calculated balance from FinanceV2
    const totalBalanceUsed = Math.abs(Number(account.balance || 0)); 
    const limitUsedPercent = limit > 0 ? (totalBalanceUsed / limit) * 100 : 0;
    const availableLimit = Math.max(0, limit - totalBalanceUsed);

    // Invoice Status (Simplified Logic)
    // If selected month < current month: Fechada (or Paga if we had a flag)
    // If selected month == current month: Em Aberto
    // If selected month > current month: Futura
    const now = new Date();
    let invoiceStatus = 'Em Aberto';
    let statusColor = 'text-blue-500 bg-blue-50 border-blue-100';
    let StatusIcon = CreditCard;

    if (selectedDate.getFullYear() < now.getFullYear() || (selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() < now.getMonth())) {
        invoiceStatus = 'Fechada / Aguardando Pagamento';
        statusColor = 'text-red-600 bg-red-50 border-red-100';
        StatusIcon = AlertCircle;
    } else if (selectedDate.getFullYear() > now.getFullYear() || (selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() > now.getMonth())) {
        invoiceStatus = 'Fatura Futura';
        statusColor = 'text-gray-500 bg-gray-50 border-gray-200';
        StatusIcon = Calendar;
    } else {
        const today = now.getDate();
        const dueDay = account.dueDay || 10;
        const closingDay = dueDay - 7 <= 0 ? (dueDay - 7) + 30 : dueDay - 7;
        
        if (today >= closingDay) {
            invoiceStatus = 'Fechada';
            statusColor = 'text-orange-500 bg-orange-50 border-orange-100';
            StatusIcon = CheckCircle;
        }
    }

    const handleSaveLimit = async () => {
        await db.update('accounts', account.id, { limit: Number(newLimit) });
        setIsEditingLimit(false);
        onUpdate();
    };

    // Navigate to next or previous month when clicking arrows
    const shiftMonth = (offset) => {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
        setSelectedDate(d);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '650px', width: '100%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {/* Header Profile / Card */}
                <div style={{ padding: '1.5rem', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 m-0" style={{ color: 'var(--text-main)' }}>{account.name}</h2>
                            <p className="text-sm text-gray-500 m-0">Vencimento dia {account.dueDay || 10}</p>
                        </div>
                    </div>
                    <button type="button" className="btn btn-icon" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Time Travel Carousel */}
                <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto', padding: '10px 0' }} className="scrollbar-hide relative">
                    <div className="flex items-center gap-2 px-4" style={{ minWidth: 'max-content' }}>
                        {carouselMonths.map((month, idx) => {
                            const isSelected = isSameMonth(month, selectedDate);
                            const name = month.toLocaleDateString('pt-BR', { month: 'short' });
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => setSelectedDate(month)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${isSelected ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    {name} {month.getFullYear()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Body */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh', backgroundColor: 'var(--bg-main)' }}>
                    
                    {/* Invoice Summary Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 relative overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                        {/* Status Badge */}
                        <div className={`absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusColor}`}>
                            <StatusIcon size={14} />
                            {invoiceStatus}
                        </div>

                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Fatura do Mês</p>
                        <h3 className="text-4xl font-black text-gray-800 tracking-tight" style={{ color: 'var(--text-main)' }}>
                            R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        
                        {invoiceTotal > 0 && invoiceStatus.includes('Fechada') && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button className="btn w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                    <CheckCircle size={18} /> Pagar Fatura de R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Limímetro Dinâmico */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 dark:bg-gray-800 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700" style={{ color: 'var(--text-main)' }}>Limímetro Dinâmico</h4>
                            {!isEditingLimit ? (
                                <button onClick={() => setIsEditingLimit(true)} className="text-xs font-bold text-purple-600 hover:underline">Ajustar Limite</button>
                            ) : null}
                        </div>

                        {isEditingLimit ? (
                            <div className="flex gap-2 mb-4 animate-fade-in">
                                <input 
                                    type="number" 
                                    className="form-input flex-1" 
                                    value={newLimit} 
                                    onChange={e => setNewLimit(e.target.value)} 
                                    step="100"
                                />
                                <button onClick={handleSaveLimit} className="btn btn-primary">Salvar</button>
                            </div>
                        ) : null}

                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-purple-600 font-bold">R$ {totalBalanceUsed.toLocaleString('pt-BR', {minimumFractionDigits: 2})} usado</span>
                            <span className="text-emerald-500 font-bold">R$ {availableLimit.toLocaleString('pt-BR', {minimumFractionDigits: 2})} livre</span>
                        </div>
                        <div className="w-full bg-emerald-100 rounded-full h-3 overflow-hidden shadow-inner">
                            <div 
                                className={`h-full rounded-full transition-all duration-700 ease-out ${limitUsedPercent > 90 ? 'bg-red-500' : (limitUsedPercent > 70 ? 'bg-orange-400' : 'bg-purple-600')}`}
                                style={{ width: `${Math.min(100, limitUsedPercent)}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-right text-xs text-gray-400 font-bold">
                            Limite Total: R$ {limit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                    </div>

                    {/* Transaction List for this month */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-3" style={{ color: 'var(--text-main)' }}>Transações ({currentMonthTrans.length})</h4>
                        
                        {currentMonthTrans.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed dark:bg-gray-800 dark:border-gray-700">
                                <p>Nenhuma compra nesta fatura.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentMonthTrans.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm" style={{ color: 'var(--text-main)' }}>
                                                {t.description} 
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                                {t.installmentsTotal > 1 && (
                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 rounded-full border border-purple-100">
                                                        Parcela {t.installmentNumber}/{t.installmentsTotal}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-800" style={{ color: 'var(--text-main)' }}>
                                            R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
