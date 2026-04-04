import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, X, ChevronLeft, ChevronRight, Calendar, ShoppingBag, CheckCircle, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import db from '../services/database';
import { formatCurrency, groupByInvoiceCycle } from '../utils/financeUtils';

export function CreditCardManagerModal({ account, accounts = [], transactions, isOpen, onClose, onUpdate, onEditTrans }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPaying, setIsPaying] = useState(false);
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    
    const invoices = useMemo(() => {
        if (!account || !transactions) return [];
        return groupByInvoiceCycle(transactions, account);
    }, [account?.id, transactions]);

    const hasAnyTransactions = useMemo(() => {
        if (!account || !transactions) return false;
        return transactions.some(t => String(t.accountId) === String(account.id));
    }, [account?.id, transactions]);

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
            alert('Por favor, selecione de qual conta o dinheiro sairá.');
            return;
        }

        const amountToPay = Number(paymentAmount);
        
        if (amountToPay <= 0) {
            alert('Por favor, insira um valor válido para o pagamento.');
            return;
        }

        setIsPaying(true);

        try {
            // 1. Prepare Saída do dinheiro na conta origem
            const sourceExpense = {
                description: `Pagamento Fatura ${account.name} (${monthKey})`,
                amount: amountToPay,
                type: 'expense',
                category: 'Cartão de Crédito',
                accountId: selectedPaymentAccount,
                date: paymentDate,
                status: 'paid',
                installments: 1,
                createdAt: new Date().toISOString()
            };
            
            // 2. Prepare Entrada do dinheiro no cartão de crédito (Restaurando o limite)
            const creditIncome = {
                description: `Pagamento Fatura (${monthKey})`,
                amount: amountToPay,
                type: 'income',
                category: 'Cartão de Crédito',
                accountId: account.id,
                date: paymentDate,
                status: 'paid',
                installments: 1,
                createdAt: new Date().toISOString()
            };
            
            // 3. Marcar fatura como paga (Só se for o valor total ou maior)
            let accountUpdatePromise = null;
            if (amountToPay >= currentInvoice.total) {
                const currentPaid = account.paidInvoices || [];
                if (!currentPaid.includes(monthKey)) {
                    accountUpdatePromise = db.update('accounts', account.id, {
                        ...account,
                        paidInvoices: [...currentPaid, monthKey]
                    });
                }
            }

            await Promise.all([
                db.create('transactions', sourceExpense),
                db.create('transactions', creditIncome),
                ...(accountUpdatePromise ? [accountUpdatePromise] : [])
            ]);

            setShowPaymentSuccess(true);
            setTimeout(() => {
                setShowPaymentSuccess(false);
                onClose();
                if (onUpdate) onUpdate();
            }, 2000);
            
        } catch (err) {
            console.error(err);
            alert('Erro ao processar pagamento.');
        } finally {
            setIsPaying(false);
        }
    };

    const currentDebt = useMemo(() => {
        if (!account || !transactions) return 0;
        let bal = Number(account.initialBalance || 0);
        transactions.forEach(t => {
            if (String(t.accountId) === String(account.id) && t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') bal += amt;
                else bal -= amt;
            }
        });
        return bal < 0 ? Math.abs(bal) : 0;
    }, [account?.id, transactions, account?.initialBalance]);

    const limit = Number(account?.limit || 0);
    const availableLimit = Math.max(0, limit - currentDebt);
    const percentUsed = limit > 0 ? (currentDebt / limit) * 100 : 0;

    const donutData = useMemo(() => {
        if (limit === 0 && currentDebt === 0) {
            return [{ name: 'Sem Limite', value: 1, color: 'rgba(255,255,255,0.1)' }];
        }
        return [
            { name: 'Usado', value: currentDebt || 0.001, color: percentUsed > 90 ? '#ef4444' : (percentUsed > 70 ? '#fbbf24' : '#ffffff') },
            { name: 'Livre', value: limit > 0 ? availableLimit : 0, color: 'rgba(255,255,255,0.2)' }
        ];
    }, [limit, currentDebt, availableLimit, percentUsed]);

    const monthKey = useMemo(() => {
        try {
            return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        } catch (e) {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    }, [selectedDate]);
    
    // Create a dynamic range of months based on actual data + future projection
    const timelineMonths = useMemo(() => {
        if (!account) return [];
        
        const today = new Date();
        const availableKeys = invoices.map(inv => inv.key);
        
        // Determinar o limite inferior (o mais cedo entre -12 meses ou transação mais antiga)
        let firstDate = new Date(today.getFullYear(), today.getMonth() - 12, 1);
        if (invoices.length > 0) {
            const earliestKey = invoices.sort((a,b) => a.key.localeCompare(b.key))[0].key;
            const [y, m] = earliestKey.split('-').map(Number);
            const earliestDate = new Date(y, m - 1, 1);
            if (earliestDate < firstDate) firstDate = earliestDate;
        }

        // Determinar o limite superior (o mais tarde entre +12 meses ou transação futura)
        let lastDate = new Date(today.getFullYear(), today.getMonth() + 12, 1);
        if (invoices.length > 0) {
            const latestKey = invoices.sort((a,b) => b.key.localeCompare(a.key))[0].key;
            const [y, m] = latestKey.split('-').map(Number);
            const latestDate = new Date(y, m - 1, 1);
            if (latestDate > lastDate) lastDate = latestDate;
        }

        const months = [];
        let cursor = new Date(firstDate);
        while (cursor <= lastDate) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
            const hasData = invoices.some(inv => inv.key === key && inv.transactions.find(t => t.type === 'expense'));
            const hasPayment = invoices.some(inv => inv.key === key && inv.transactions.find(t => t.type === 'income'));
            const isPaidMonth = account?.paidInvoices?.includes(key);
            
            months.push({ 
                date: new Date(cursor), 
                key, 
                hasData, 
                hasPayment, 
                isPaidMonth 
            });
            
            cursor.setMonth(cursor.getMonth() + 1);
        }
        
        return months;
    }, [invoices, account?.id, account?.paidInvoices]);

    const currentInvoice = useMemo(() => {
        const found = invoices.find(inv => inv.key === monthKey);
        return found || { total: 0, transactions: [] };
    }, [invoices, monthKey]);

    useEffect(() => {
        if (currentInvoice.total > 0) {
            setPaymentAmount(currentInvoice.total);
        }
    }, [currentInvoice.total]);
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const isPaid = account?.paidInvoices?.includes(monthKey);
    const today = new Date();
    const isPast = selectedDate.getFullYear() < today.getFullYear() || (selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() < today.getMonth());
    
    let statusText = 'Em Aberto';
    let statusColor = '#3b82f6';
    let statusBg = '#dbeafe';

    if (isPaid) {
        statusText = 'Paga';
        statusColor = '#059669';
        statusBg = '#d1fae5';
    } else if (isPast) {
        statusText = 'Fechada';
        statusColor = '#dc2626';
        statusBg = '#fee2e2';
    } else if (selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear()) {
        statusText = 'Fatura Atual';
        statusColor = '#7c3aed';
        statusBg = '#ede9fe';
    }

    if (!isOpen || !account) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content" style={{ maxWidth: '750px', width: '100%', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                
                <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #a21caf 100%)', color: 'white', padding: '32px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.5)' }}>
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
                                    <p style={{ fontWeight: 600, fontSize: '1.125rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>R$ {formatCurrency(limit)}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Limite Disponível</p>
                                    <p style={{ fontWeight: 900, fontSize: '1.25rem', color: '#6ee7b7', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>R$ {formatCurrency(availableLimit)}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '110px', height: '110px', position: 'relative' }}>
                            {/* Visual reference fix: month/year above the chart */}
                            <div style={{ position: 'absolute', top: '-18px', left: 0, width: '100%', textAlign: 'center', zIndex: 5 }}>
                                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                    {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                                </div>
                            </div>

                            <div style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}>
                                <ResponsiveContainer width="100%" height={110}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            innerRadius={36}
                                            outerRadius={50}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            stroke="transparent"
                                            paddingAngle={limit > 0 && currentDebt > 0 ? 4 : 0}
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} style={{ transition: 'all 0.5s ease' }} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', paddingTop: '4px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                                    {limit > 0 ? `${Math.round(percentUsed)}%` : '--'}
                                </span>
                            </div>
                            <button onClick={onClose} style={{ position: 'absolute', right: '-16px', top: '-16px', width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Horizontal Timeline Selector */}
                    <div style={{ marginTop: '20px', padding: '0 4px', position: 'relative', zIndex: 10 }}>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }} className="scrollbar-hide">
                            {timelineMonths.map(m => {
                                const isSelected = m.key === monthKey;
                                const isTodayMonth = m.date.getMonth() === today.getMonth() && m.date.getFullYear() === today.getFullYear();
                                return (
                                    <button
                                        key={m.key}
                                        onClick={() => setSelectedDate(m.date)}
                                        style={{
                                            flex: '0 0 auto', padding: '8px 16px', borderRadius: '12px', border: 'none',
                                            backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.1)',
                                            color: isSelected ? '#4338ca' : 'white',
                                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            minWidth: '85px',
                                            boxShadow: isSelected ? '0 10px 15px -3px rgba(0,0,0,0.2)' : 'none',
                                            opacity: m.hasData || isSelected ? 1 : 0.4,
                                            transform: isSelected ? 'scale(1.05)' : 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', opacity: isSelected ? 0.6 : 0.8, letterSpacing: '0.05em' }}>
                                            {monthNames[m.date.getMonth()].slice(0, 3)}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 900 }}>{m.date.getFullYear() % 100}</span>
                                        <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                                            {m.hasData && (
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#4338ca' : 'white', opacity: 0.8 }}></div>
                                            )}
                                            {m.hasPayment && (
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                            )}
                                            {m.isPaidMonth && (
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#34d399', border: '1px solid white' }}></div>
                                            )}
                                        </div>
                                        {isTodayMonth && !isSelected && (
                                            <div style={{ position: 'absolute', top: '2px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '24px', backgroundColor: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)' }}>
                    <div>
                        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Total do Ciclo</p>
                        <h3 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>R$</span> {formatCurrency(currentInvoice.total)}
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ 
                            padding: '6px 16px', borderRadius: '12px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900, 
                            color: statusColor,
                            backgroundColor: statusBg,
                            border: `1.5px solid ${statusColor}15`,
                            boxShadow: `0 4px 12px ${statusColor}10`
                        }}>
                            {statusText}
                        </span>
                        {isPast && !isPaid && currentInvoice.total > 0 && (
                             <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', opacity: 0.8 }}>Vencida / Aguardando Pagamento</span>
                        )}
                    </div>
                </div>

                <div style={{ padding: '24px', height: '350px', overflowY: 'auto', backgroundColor: '#ffffff', position: 'relative' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Lançamentos detalhados</h4>
                    
                    {currentInvoice.transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                <Calendar size={32} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#64748b', margin: '0 0 4px 0' }}>
                                    {!hasAnyTransactions ? 'Nenhum lançamento no sistema' : 'Ciclo de Fatura Vazio'}
                                </p>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', margin: 0, maxWidth: '240px', lineHeight: '1.5' }}>
                                    {!hasAnyTransactions 
                                        ? 'Este cartão (Will) ainda não possui histórico de compras ou lançamentos registrados em nenhuma data.' 
                                        : 'Não foram identificados gastos ou parcelas vencendo neste período específico. Tente navegar para outros meses no seletor acima.'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedDate(new Date())}
                                style={{ fontSize: '10px', fontWeight: 900, color: '#4338ca', backgroundColor: '#eef2ff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                                Voltar para Hoje
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {currentInvoice.transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map((t, idx) => (
                                <div 
                                    key={t.id} 
                                    onClick={() => { if(onEditTrans){ onEditTrans(t); onClose(); } }}
                                    style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', 
                                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', 
                                        boxShadow: '0 2px 8px -4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        animation: `fadeInDown 0.3s ease-out ${idx * 0.05}s both`
                                    }} 
                                    className="hover:scale-[1.01] hover:shadow-lg hover:border-indigo-100 hover:bg-slate-50/50"
                                    title="Editar Lançamento"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ 
                                            width: '42px', height: '42px', borderRadius: '14px', 
                                            backgroundColor: t.type === 'income' ? '#ecfdf5' : 'rgba(99, 102, 241, 0.08)', 
                                            color: t.type === 'income' ? '#10b981' : '#6366f1', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            {t.type === 'income' ? <CheckCircle size={20} /> : (t.installmentsTotal > 1 ? <Calendar size={20} /> : <ShoppingBag size={20} />)}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
                                                {t.description.replace(/\(\d+\/\d+\)/, '').trim()} 
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de', '')}</p>
                                                {(t.installmentsTotal > 1 || t.installment) && (
                                                    <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                                                        {t.installment || `${t.installmentNumber}/${t.installmentsTotal}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 900, fontSize: '1.05rem', color: t.type === 'income' ? '#10b981' : '#334155', margin: 0, letterSpacing: '-0.02em' }}>
                                            {t.type === 'income' ? '+ ' : ''}{formatCurrency(t.amount)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', position: 'relative' }}>
                    {showPaymentSuccess && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.95)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 16px 16px', backdropFilter: 'blur(8px)', animation: 'fade-in 0.3s ease' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)' }}>
                                <CheckCircle size={48} strokeWidth={3} className="animate-bounce" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065f46', margin: '0 0 8px 0' }}>Pagamento Realizado!</h3>
                            <p style={{ color: '#059669', fontWeight: 600, fontSize: '0.875rem' }}>O limite do cartão será restaurado em instantes.</p>
                        </div>
                    )}

                    {statusText === 'Fechada' && currentInvoice.total > 0 && !isPaid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1.5px solid #eef2ff', boxShadow: '0 10px 25px -10px rgba(99, 102, 241, 0.15)' }}>
                             <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={14} /> Quitar Fatura Fechada
                             </h4>
                             
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Valor do Pagamento</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#cbd5e1', fontSize: '0.9rem' }}>R$</span>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            style={{ width: '100%', padding: '0 16px 0 44px', fontSize: '1.1rem', fontWeight: 900, height: '52px', borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc', color: '#1e293b' }}
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.backgroundColor = '#fff'; }}
                                            onBlur={e => { e.target.style.borderColor = '#f1f5f9'; e.target.style.backgroundColor = '#f8fafc'; }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Data da Quitação</label>
                                    <input 
                                        type="date"
                                        style={{ width: '100%', padding: '0 16px', fontSize: '0.95rem', fontWeight: 700, height: '52px', borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b' }}
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#f1f5f9'; e.target.style.backgroundColor = '#f8fafc'; }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Selecione a Origem dos Fundos</label>
                                    <select 
                                        style={{ width: '100%', height: '52px', padding: '0 16px', fontSize: '0.95rem', fontWeight: 700, borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                        value={selectedPaymentAccount}
                                        onChange={e => setSelectedPaymentAccount(e.target.value)}
                                        disabled={isPaying}
                                    >
                                        <option value="">Escolher conta...</option>
                                        {accounts.filter(a => a.type !== 'credit').map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.name} (Saldo: R$ {formatCurrency(a.balance || 0)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    onClick={handlePayInvoice} 
                                    disabled={isPaying || !selectedPaymentAccount || !paymentAmount}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                                        padding: '0 32px', height: '52px', borderRadius: '16px', 
                                        backgroundColor: selectedPaymentAccount ? '#4f46e5' : '#e2e8f0',
                                        color: 'white', border: 'none', cursor: 'pointer',
                                        boxShadow: selectedPaymentAccount ? '0 10px 15px -3px rgba(79, 70, 229, 0.3)' : 'none',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        opacity: isPaying ? 0.7 : 1,
                                        transform: isPaying ? 'scale(0.98)' : 'none'
                                    }}
                                    onMouseEnter={e => { if(!isPaying && selectedPaymentAccount) e.currentTarget.style.backgroundColor = '#4338ca'; }}
                                    onMouseLeave={e => { if(!isPaying && selectedPaymentAccount) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
                                >
                                    {isPaying ? null : <CheckCircle size={20} />} 
                                    <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem' }}>{isPaying ? 'Processando...' : 'Confirmar Pagamento'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
                            {statusText === 'Paga' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#059669', fontWeight: 800, backgroundColor: '#ecfdf5', padding: '16px 32px', borderRadius: '20px', border: '2px solid #d1fae5', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={18} strokeWidth={3} />
                                    </div>
                                    <span>Fatura liquidada com sucesso!</span>
                                </div>
                            ) : currentInvoice.total <= 0 && statusText === 'Fechada' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                                    <span>Fatura sem lançamentos ou já quitada.</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                    <Calendar size={20} style={{ opacity: 0.5 }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>A fatura ainda está <b style={{ color: '#7c3aed' }}>em aberto</b>. O fechamento e pagamento serão liberados automaticamente no ciclo correto.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
