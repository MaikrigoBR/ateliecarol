import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, CreditCard, Calendar, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import db from '../services/database';

export function CreditCardManagerModal({ account, accounts = [], transactions, isOpen, onClose, onUpdate }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState('');
    const [isPaying, setIsPaying] = useState(false);
    
    // Derived states
    const invoices = useMemo(() => {
        if (!account || !transactions) return [];
        
        const ccTrans = transactions.filter(t => t.accountId === account.id);
        
        let groups = {};
        ccTrans.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    transactions: [],
                    total: 0
                };
            }
            groups[key].transactions.push(t);
            if (t.type === 'expense') groups[key].total += Number(t.amount);
            else groups[key].total -= Number(t.amount); 
        });
        
        return Object.values(groups).sort((a,b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    }, [account, transactions]);

    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const nd = new Date(prev);
            nd.setMonth(nd.getMonth() - 1);
            return nd;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const nd = new Date(prev);
            nd.setMonth(nd.getMonth() + 1);
            return nd;
        });
    };

    const handlePayInvoice = async () => {
        if (!selectedPaymentAccount) {
            alert('Por favor, selecione de qual conta o dinheiro sairá para pagar a fatura.');
            return;
        }

        const invoiceTotal = currentInvoice.total;
        
        if (invoiceTotal <= 0) {
            alert('Esta fatura não possui valor a pagar.');
            return;
        }

        setIsPaying(true);

        try {
            // 1. Saída do dinheiro na conta origem
            await db.create('transactions', {
                description: `Pagamento Fatura ${account.name} (${monthKey})`,
                amount: invoiceTotal,
                type: 'expense',
                category: 'Cartão de Crédito',
                accountId: selectedPaymentAccount,
                date: new Date().toISOString().split('T')[0],
                status: 'paid',
                installments: 1,
                createdAt: new Date().toISOString()
            });
            
            // 2. Entrada do dinheiro no cartão de crédito (Restaurando o limite)
            await db.create('transactions', {
                description: `Pagamento Fatura (${monthKey})`,
                amount: invoiceTotal,
                type: 'income',
                category: 'Cartão de Crédito',
                accountId: account.id,
                date: new Date().toISOString().split('T')[0],
                status: 'paid',
                installments: 1,
                createdAt: new Date().toISOString()
            });
            
            // 3. Marcar fatura como paga
            const currentPaid = account.paidInvoices || [];
            if (!currentPaid.includes(monthKey)) {
                await db.update('accounts', account.id, {
                    ...account,
                    paidInvoices: [...currentPaid, monthKey]
                });
            }

            onUpdate(); // fetch new data
            setSelectedPaymentAccount('');
        } catch (err) {
            console.error(err);
            alert('Erro ao pagar fatura.');
        } finally {
            setIsPaying(false);
        }
    };

    if (!isOpen || !account) return null;

    const currentDebt = useMemo(() => {
        if (!account || !transactions) return 0;
        let bal = Number(account.initialBalance || 0);
        transactions.forEach(t => {
            if (t.accountId === account.id && t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') bal += amt;
                else bal -= amt;
            }
        });
        return bal < 0 ? Math.abs(bal) : 0;
    }, [account, transactions]);

    const limit = Number(account.limit || 0);
    const availableLimit = Math.max(0, limit - currentDebt);
    const percentUsed = limit > 0 ? (currentDebt / limit) * 100 : 0;

    const donutData = [
        { name: 'Usado', value: currentDebt, color: percentUsed > 90 ? '#ef4444' : (percentUsed > 70 ? '#fde047' : '#ffffff') },
        { name: 'Livre', value: availableLimit, color: 'rgba(255,255,255,0.2)' }
    ];

    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const currentInvoice = invoices.find(i => i.key === monthKey) || { transactions: [], total: 0 };
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Calculando status dinâmico
    const isPaid = account.paidInvoices?.includes(monthKey);
    const today = new Date();
    const isPast = selectedDate.getFullYear() < today.getFullYear() || (selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() < today.getMonth());
    
    let statusText = 'Em Aberto';
    let statusColor = 'text-blue-600 bg-blue-50';
    if (isPaid) {
        statusText = 'Paga';
        statusColor = 'text-emerald-600 bg-emerald-50';
    } else if (isPast) {
        statusText = 'Fechada';
        statusColor = 'text-red-600 bg-red-50';
    } else if (selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear()) {
        statusText = 'Fatura Atual';
        statusColor = 'text-purple-600 bg-purple-50';
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content" style={{ maxWidth: '700px', width: '100%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {/* Header Dinâmico com Gráfico */}
                <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', position: 'relative' }}>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 cursor-default">
                                <CreditCard size={20} className="opacity-80" />
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{account.name}</h2>
                            </div>
                            
                            <div className="mt-4 flex gap-6">
                                <div>
                                    <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-0.5">Limite Total</p>
                                    <p className="font-medium text-[1.05rem]">R$ {limit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                                </div>
                                <div>
                                    <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-0.5">Disponível</p>
                                    <p className="font-bold text-[1.1rem] text-emerald-300">R$ {availableLimit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                                </div>
                            </div>
                        </div>

                        {/* Donut Chart de Comprometimento */}
                        <div style={{ width: '80px', height: '80px', position: 'relative', marginTop: '-5px' }} className="shrink-0 drop-shadow-md">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        innerRadius={26}
                                        outerRadius={38}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="transparent"
                                        paddingAngle={2}
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-[11px] font-black" style={{ color: donutData[0].color === 'rgba(255,255,255,0.2)' ? 'white' : donutData[0].color, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    {percentUsed.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <button onClick={onClose} className="absolute right-0 top-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white border-0 z-20">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Carrossel de Meses */}
                    <div className="flex items-center justify-between mt-6 bg-white/10 rounded-xl p-2 backdrop-blur-sm relative z-10">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white border-0">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex-1 text-center font-bold tracking-wide">
                            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                        </div>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white border-0">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Valor da Fatura</p>
                        <h3 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-white flex items-center gap-2">
                            R$ {currentInvoice.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div>
                        <span className={`px-4 py-2 rounded-full text-xs uppercase tracking-widest font-black ${statusColor} border shadow-sm ${statusText === 'Fechada' ? 'border-red-200' : 'border-transparent'}`}>
                            {statusText}
                        </span>
                    </div>
                </div>

                <div className="p-6 h-[350px] overflow-y-auto">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Lançamentos detalhados</h4>
                    
                    {currentInvoice.transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Nenhum lançamento encontrado para este mês.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentInvoice.transactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                            <TrendingDown size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                                {t.description} 
                                                {t.installmentsTotal > 1 && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">Parc {t.installmentNumber}/{t.installmentsTotal}</span>}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-red-600">
                                            R$ {Number(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Ações da Fatura */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-5">
                    {statusText === 'Fechada' && currentInvoice.total > 0 ? (
                        <div className="flex flex-col sm:flex-row w-full gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Conta para Pagamento</label>
                                <select 
                                    className="form-input w-full text-sm py-2 px-3 border-gray-200 shadow-sm bg-gray-50 focus:bg-white"
                                    value={selectedPaymentAccount}
                                    onChange={e => setSelectedPaymentAccount(e.target.value)}
                                    disabled={isPaying}
                                >
                                    <option value="">Selecione de onde sairá o dinheiro...</option>
                                    {accounts.filter(a => a.type !== 'credit').map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} • Saldo: R$ {Number(a.balance || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                onClick={handlePayInvoice} 
                                disabled={isPaying || !selectedPaymentAccount}
                                className={`btn btn-primary flex items-center justify-center gap-2 px-6 py-2 h-[42px] transition-all shadow-md mt-auto w-full sm:w-auto ${!selectedPaymentAccount ? 'opacity-70 grayscale cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle size={18} /> 
                                {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic w-full flex items-center justify-center py-2 h-[42px]">
                            {statusText === 'Paga' ? (
                                <span className="flex items-center gap-2 text-emerald-600"><CheckCircle size={16}/> Fatura já está quitada. Limite restaurado.</span>
                            ) : currentInvoice.total <= 0 && statusText === 'Fechada' ? (
                                <span>Fatura zerada. Não há valor para pagar.</span>
                            ) : (
                                <span>Aguarde o fechamento da fatura para realizar o pagamento.</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
