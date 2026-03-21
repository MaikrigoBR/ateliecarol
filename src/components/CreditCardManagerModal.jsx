import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, CreditCard, Calendar, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import db from '../services/database';

export function CreditCardManagerModal({ account, accounts = [], transactions, isOpen, onClose, onUpdate, onEditTrans }) {
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

    const limit = Number(account?.limit || 0);
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
    const isPaid = account?.paidInvoices?.includes(monthKey);
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

    if (!isOpen || !account) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content" style={{ maxWidth: '750px', width: '100%', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Visal Cartão */}
                <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #a21caf 100%)', color: 'white', padding: '32px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.5)' }}>
                    
                    {/* BG Decorativo */}
                    <div style={{ position: 'absolute', top: 0, right: 0, marginRight: '-64px', marginTop: '-64px', width: '256px', height: '256px', borderRadius: '50%', backgroundColor: 'white', opacity: 0.05, filter: 'blur(30px)', mixBlendMode: 'overlay' }}></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, marginLeft: '-64px', marginBottom: '-64px', width: '192px', height: '192px', borderRadius: '50%', backgroundColor: '#e879f9', opacity: 0.2, filter: 'blur(30px)', mixBlendMode: 'screen' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'default', opacity: 0.9 }}>
                                <CreditCard size={26} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{account.name}</h2>
                            </div>
                            
                            <div style={{ marginTop: '24px', display: 'flex', gap: '32px' }}>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Limite Total</p>
                                    <p style={{ fontWeight: 600, fontSize: '1.125rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>R$ {limit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Limite Disponível</p>
                                    <p style={{ fontWeight: 900, fontSize: '1.25rem', color: '#6ee7b7', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>R$ {availableLimit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                                </div>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div style={{ width: '100px', height: '100px', position: 'relative', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                            <ResponsiveContainer width="100%" height={100}>
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        innerRadius={35}
                                        outerRadius={48}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="transparent"
                                        paddingAngle={4}
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '-0.05em', color: donutData[0].color === 'rgba(255,255,255,0.2)' ? 'white' : donutData[0].color, textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                                    {percentUsed.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <button onClick={onClose} style={{ position: 'absolute', right: '-8px', top: '-8px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.1)', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 20 }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Timeline Carrossel Mês */}
                    <div style={{ marginTop: '32px', position: 'relative', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                            <button onClick={handlePrevMonth} style={{ padding: '10px', backgroundColor: 'transparent', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} key={selectedDate.getTime()}>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginBottom: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                    {statusText}
                                </span>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.025em', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    {monthNames[selectedDate.getMonth()]} <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}>{selectedDate.getFullYear()}</span>
                                </div>
                            </div>
                            
                            <button onClick={handleNextMonth} style={{ padding: '10px', backgroundColor: 'transparent', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* SubHeader Valor Fatura */}
                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Valor da Fatura</p>
                        <h3 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            R$ {currentInvoice.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div>
                        <span style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900, 
                            border: statusText === 'Fechada' ? '1px solid #fecaca' : '1px solid transparent',
                            color: statusText === 'Paga' ? '#059669' : (statusText === 'Fechada' ? '#dc2626' : (statusText === 'Fatura Atual' ? '#7c3aed' : '#2563eb')),
                            backgroundColor: statusText === 'Paga' ? '#d1fae5' : (statusText === 'Fechada' ? '#fee2e2' : (statusText === 'Fatura Atual' ? '#ede9fe' : '#dbeafe'))
                        }}>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Lançamentos List */}
                <div style={{ padding: '24px', height: '350px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Lançamentos detalhados</h4>
                    
                    {currentInvoice.transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#cbd5e1' }}>
                            <Calendar size={48} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                            <p style={{ fontSize: '0.875rem' }}>Nenhum lançamento encontrado para este mês.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {currentInvoice.transactions.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => { if(onEditTrans){ onEditTrans(t); onClose(); } }}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }} 
                                    className="hover:bg-blue-50 hover:border-blue-200"
                                    title="Editar Lançamento"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {t.installmentsTotal > 1 ? <Calendar size={18} /> : <TrendingDown size={18} />}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', margin: 0 }}>
                                                {t.description.replace(/\(\d+\/\d+\)/, '').trim()} 
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de', '')}</p>
                                                {t.installmentsTotal > 1 && (
                                                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #e0e7ff' }}>
                                                        Parc {t.installmentNumber}/{t.installmentsTotal}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#334155', margin: 0 }}>
                                            R$ {Number(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Ações Inferiores (Pagamento da Fatura) */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    {statusText === 'Fechada' && currentInvoice.total > 0 ? (
                        <div style={{ display: 'flex', width: '100%', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conta para Pagamento</label>
                                <select 
                                    className="form-input"
                                    style={{ width: '100%', fontSize: '0.875rem', padding: '10px 12px', borderColor: '#e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
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
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', height: '42px', flexShrink: 0, opacity: (!selectedPaymentAccount) ? 0.7 : 1, filter: (!selectedPaymentAccount) ? 'grayscale(1)' : 'none', cursor: (!selectedPaymentAccount) ? 'not-allowed' : 'pointer' }}
                            >
                                <CheckCircle size={18} /> 
                                {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', height: '42px' }}>
                            {statusText === 'Paga' ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 600 }}><CheckCircle size={16}/> Fatura já está quitada. Limite restaurado.</span>
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
