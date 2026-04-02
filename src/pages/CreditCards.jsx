import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calendar, BarChart2, AlertCircle, ShoppingBag, CheckCircle, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, X, ArrowRight, Check } from 'lucide-react';
import db from '../services/database';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie
} from 'recharts';
import { FinanceTransactionDetailsModal } from '../components/FinanceTransactionDetailsModal';
import { formatCurrency, groupByInvoiceCycle } from '../utils/financeUtils';
import '../css/pages.css';

function StatCard({ title, value, icon: Icon, color, subtext, isActive, onClick }) {
    const getColor = (c) => {
        const map = {
            'primary': 'var(--primary)',
            'green': '#10b981', 
            'orange': '#f59e0b', 
            'purple': '#8b5cf6', 
            'blue': '#3b82f6',   
            'red': '#ef4444',
            'emerald': '#10b981'
        };
        return map[c] || c;
    };

    const activeColor = getColor(color);

    return (
        <div 
            className={`stat-card relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl ${isActive ? 'active-stat-card ring-2 ring-offset-2 ring-[var(--surface)]' : ''}`} 
            style={{ 
                borderLeft: `5px solid ${activeColor}`,
                cursor: onClick ? 'pointer' : 'default',
                transform: isActive ? 'translateY(-6px) scale(1.02)' : 'none',
                boxShadow: isActive ? `0 20px 30px -10px ${activeColor}33, 0 10px 15px -5px ${activeColor}1A` : 'var(--shadow-sm)',
                border: isActive ? `1.5px solid ${activeColor}40` : '1px solid var(--border)',
                background: isActive ? `linear-gradient(150deg, var(--surface) 0%, ${activeColor}0D 100%)` : 'var(--surface)',
                padding: '1.4rem',
                minHeight: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}
            onClick={onClick}
        >
            {/* Dynamic Glow Form */}
            {isActive && (
                <div 
                    className="animate-pulse"
                    style={{ 
                        position: 'absolute', top: '-30%', right: '-30%', width: '120px', height: '120px', 
                        background: `radial-gradient(circle, ${activeColor}26 0%, transparent 70%)`,
                        borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none', zIndex: 0
                    }}
                ></div>
            )}
            
            <div className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ 
                    fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.8
                }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <h3 style={{ 
                        fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0
                    }}>{value}</h3>
                </div>
                {subtext && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.8rem' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: activeColor }}></div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0, opacity: 0.9 }}>{subtext}</p>
                    </div>
                )}
            </div>
            
            <div className="stat-icon-wrapper shrink-0" style={{ 
                transform: isActive ? 'rotate(-8deg) scale(1.15)' : 'none',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                color: activeColor, 
                backgroundColor: `${activeColor}15`,
                width: '46px', height: '46px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? `0 8px 15px -4px ${activeColor}33` : 'none'
            }}>
                <Icon size={24} />
            </div>
        </div>
    );
}

export function CreditCards() {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [allAccounts, setAllAccounts] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

    const [isAccModalOpen, setIsAccModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAccId, setPaymentAccId] = useState('');
    const [editAccId, setEditAccId] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'credit', balance: 0, limit: 0, dueDay: 10, closeDay: '', color: '#8b5cf6' });
    const [selectedDetailTrans, setSelectedDetailTrans] = useState(null);

    const fetchData = async () => {
        const accs = await db.getAll('accounts');
        const trans = await db.getAll('transactions');
        const dbCategories = await db.getAll('categories') || [];
        setExpenseCategories(dbCategories.filter(c => c.type === 'expense').map(c => c.name));
        setIncomeCategories(dbCategories.filter(c => c.type === 'income').map(c => c.name));
        const cards = accs.filter(a => a.type === 'credit');
        setAllAccounts(accs);
        setAccounts(cards);
        setTransactions(trans);
        
        if (cards.length > 0 && !selectedCardId) {
            setSelectedCardId(cards[0].id);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditAccount = (acc) => {
        setNewAccount({ 
            name: acc.name, 
            type: 'credit', 
            balance: acc.initialBalance || 0,
            limit: acc.limit || 0,
            dueDay: acc.dueDay || 10,
            closeDay: acc.closeDay || ''
        });
        setEditAccId(acc.id);
        setIsAccModalOpen(true);
    };

    const handleDeleteAccount = async (id, e) => {
        e.stopPropagation();
        if(window.confirm('Tem certeza que deseja inativar este cartão de crédito? (Soft Delete)\nEle sumirá da lista, mas o histórico de lançamentos atrelados a ele será preservado financeiramente.')) {
            try {
                await db.update('accounts', id, { deleted: true });
                if (selectedCardId === id) setSelectedCardId(null);
                await fetchData();
            } catch (error) {
                console.error("Erro ao inativar cartão:", error);
                alert("Falha ao inativar o cartão.");
            }
        }
    };

    const handleSaveAccount = async (e) => {
        e.preventDefault();
        
        let closeD = newAccount.closeDay;
        // Calcula fechamento padrão (vencimento - 7) caso não seja preenchido
        if (!closeD) {
            let defaultClose = Number(newAccount.dueDay || 10) - 7;
            if (defaultClose <= 0) defaultClose += 30;
            closeD = defaultClose;
        }

        const payload = {
            ...newAccount,
            type: 'credit',
            initialBalance: Number(newAccount.balance || 0),
            limit: Number(newAccount.limit || 0),
            dueDay: Number(newAccount.dueDay || 10),
            closeDay: Number(closeD)
        };
        
        if (editAccId) {
            await db.update('accounts', editAccId, payload);
        } else {
            const added = await db.create('accounts', payload);
            if (!selectedCardId && added) setSelectedCardId(added.id);
        }
        
        setIsAccModalOpen(false);
        setEditAccId(null);
        setNewAccount({ name: '', type: 'credit', balance: 0, limit: 0, dueDay: 10, closeDay: '', color: '#8b5cf6' });
        fetchData();
    };

    const openNewAccount = () => {
        setEditAccId(null);
        setNewAccount({ name: '', type: 'credit', balance: 0, limit: 0, dueDay: 10, closeDay: '', color: '#8b5cf6' });
        setIsAccModalOpen(true);
    };

    const selectedCard = useMemo(() => {
        return accounts.find(a => a.id === selectedCardId);
    }, [accounts, selectedCardId]);

    // Calcula os meses (Timelines)
    const timelineMonths = useMemo(() => {
        const months = [];
        const base = new Date();
        base.setDate(1); 
        
        for (let i = -2; i <= 6; i++) {
            const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
            months.push({
                date: d,
                offset: i,
                label: d.toLocaleDateString('pt-BR', { month: 'short' }),
                year: d.getFullYear()
            });
        }
        return months;
    }, []);

    const isSameMonth = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    };

    // Agrupamento de faturas por ciclo de fechamento
    const invoiceGroups = useMemo(() => {
        return groupByInvoiceCycle(transactions, selectedCard);
    }, [transactions, selectedCard]);

    // Fatura do cartão e mês selecionados
    const currentInvoiceData = useMemo(() => {
        if (!selectedCard || invoiceGroups.length === 0) return { transactions: [], total: 0 };
        
        const base = new Date();
        const targetDate = new Date(base.getFullYear(), base.getMonth() + selectedMonthOffset, 1);
        const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        
        return invoiceGroups.find(g => g.key === key) || { transactions: [], total: 0 };
    }, [invoiceGroups, selectedMonthOffset, selectedCard]);

    const currentInvoiceTrans = currentInvoiceData.transactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    const invoiceTotal = currentInvoiceData.total;

    // Pagamento da fatura parcial (se houver pagamentos avulsos que ainda não foram agrupados ou para controle visual)
    // Nota:groupByInvoiceCycle já desconta incomes (pagamentos) do total.
    const invoiceBalance = Math.max(0, invoiceTotal);

    const openInvoicePayment = () => {
        setPaymentAccId('');
        setIsPaymentModalOpen(true);
    };

    const handlePayInvoice = async (e) => {
        e.preventDefault();
        if (!paymentAccId) return;

        // Calcula a chave do mês com base na variável global ou de targetDate
        const base = new Date();
        const targetDate = new Date(base.getFullYear(), base.getMonth() + selectedMonthOffset, 1);
        const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

        // Saída de dinheiro da conta corrente
        const expensePayload = {
            description: `Pagamento Fatura ${selectedCard.name} (${monthKey})`,
            amount: invoiceBalance,
            type: 'expense',
            category: 'Cartão de Crédito',
            accountId: paymentAccId,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            installments: 1,
            createdAt: new Date().toISOString()
        };

        // Entrada de dinheiro no cartão (restaurando balance negativo / liberando limite)
        const incomePayload = {
            description: `Pagamento Fatura ${selectedCard.name} (${monthKey})`,
            amount: invoiceTotal,
            type: 'income',
            category: 'Cartão de Crédito',
            accountId: selectedCard.id,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            installments: 1,
            createdAt: new Date().toISOString()
        };

        const currentPaid = selectedCard.paidInvoices || [];
        const accountUpdatePromise = currentPaid.includes(monthKey) ? null : db.update('accounts', selectedCard.id, {
            ...selectedCard,
            paidInvoices: [...currentPaid, monthKey]
        });

        await Promise.all([
            db.create('transactions', expensePayload),
            db.create('transactions', incomePayload),
            ...(accountUpdatePromise ? [accountUpdatePromise] : [])
        ]);

        setIsPaymentModalOpen(false);
        fetchData();
        alert('Fatura paga e limite restaurado com sucesso!');
    };

    // Gerar dados do Gráfico futuro
    const chartData = useMemo(() => {
        if (!selectedCard) return [];
        const base = new Date();
        const data = [];

        for (let i = 0; i < 6; i++) {
            const targetDate = new Date(base.getFullYear(), base.getMonth() + i, 1);
            
            const monthTotal = transactions.filter(t => {
                if (t.accountId !== selectedCard.id) return false;
                if (t.type !== 'expense') return false;
                
                const [y, m, d] = t.date.split('-');
                const transDate = new Date(y, m - 1, d);
                return isSameMonth(transDate, targetDate);
            }).reduce((acc, t) => acc + Number(t.amount), 0);

            data.push({
                name: targetDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
                Fatura: monthTotal,
                offset: i
            });
        }
        return data;
    }, [transactions, selectedCard]);

    const monthKey = `${timelineMonths.find(m => m.offset === selectedMonthOffset)?.year}-${String(timelineMonths.find(m => m.offset === selectedMonthOffset)?.date.getMonth() + 1).padStart(2, '0')}`;
    const isPaid = selectedCard?.paidInvoices?.includes(monthKey);

    let statusText = 'Em Aberto';
    let statusColor = '#3b82f6';

    if (isPaid) {
        statusText = 'Paga';
        statusColor = '#10b981';
    } else if (selectedMonthOffset < 0) {
        statusText = 'Fechada / Pendente';
        statusColor = '#ef4444';
    } else if (selectedMonthOffset > 0) {
        statusText = 'Fatura Futura';
        statusColor = '#8b5cf6';
    }

    // Calculate balances dynamically
    const accBalances = useMemo(() => {
        const balances = {};
        allAccounts.forEach(a => balances[a.id] = Number(a.initialBalance || 0));
        transactions.forEach(t => {
            if (t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') balances[t.accountId] += amt;
                else balances[t.accountId] -= amt;
            }
        });
        return balances;
    }, [allAccounts, transactions]);

    // Endividamento Total (Soma de todos os faturamentos negativos/uados)
    const totalCreditDebt = accounts.reduce((sum, card) => {
        const bal = accBalances[card.id] || 0;
        return sum + (bal < 0 ? Math.abs(bal) : 0);
    }, 0);

    const totalLimit = accounts.reduce((sum, card) => sum + Number(card.limit || 0), 0);
    const overallLimitUsage = totalLimit > 0 ? (totalCreditDebt / totalLimit) * 100 : 0;

    const currentCardBal = selectedCard ? (accBalances[selectedCard.id] || 0) : 0;
    const used = currentCardBal < 0 ? Math.abs(currentCardBal) : 0;
    const limit = selectedCard ? Number(selectedCard.limit || 0) : 0;
    const available = Math.max(0, limit - used);

    return (
        <div className="animate-fade-in page-content">
            {/* Header */}
            <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Gestão de Cartões
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Planejamento e visão de faturas futuras.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={openNewAccount} className="btn py-2 px-4 shadow-sm" style={{ 
                        background: 'var(--surface)', 
                        color: 'var(--primary)', 
                        border: '1px solid var(--primary)', 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        borderRadius: '8px' 
                    }}>
                        <Plus size={16} /> Novo Cartão
                    </button>
                    {selectedCard && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', background: 'var(--surface-hover)', borderRadius: '9999px', border: '1px solid var(--border)' }}>
                            Foco: <b>{selectedCard.name}</b>
                        </div>
                    )}
                </div>
            </div>
            {/* Dashboard Dash Style Summary Cards */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard 
                    title="Exposição Total" 
                    value={`R$ ${formatCurrency(totalCreditDebt)}`} 
                    icon={CreditCard} 
                    color="red"
                    subtext={`${overallLimitUsage.toFixed(1)}% do limite global usado`}
                />
                <StatCard 
                    title="Limite Disponível" 
                    value={`R$ ${formatCurrency(Math.max(0, totalLimit - totalCreditDebt))}`} 
                    icon={CheckCircle} 
                    color="green"
                    subtext="Fôlego financeiro total"
                />
                <StatCard 
                    title="Eficiência" 
                    value="Saudável" 
                    icon={BarChart2} 
                    color="blue"
                    subtext="Controle de gastos OK"
                />
            </div>

            {/* MEUS CARTÕES - Textos transformados em CARDS */}
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--primary)" /> Meus Cartões (Selecione para detalhar)
            </h3>
            
            <div className="dashboard-grid animate-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                {accounts.map(card => {
                    const isActive = selectedCardId === card.id;
                    const cardBal = accBalances[card.id] || 0;
                    const cardUsed = cardBal < 0 ? Math.abs(cardBal) : 0;
                    const cardLimit = Number(card.limit || 0);
                    const usagePercent = cardLimit > 0 ? (cardUsed / cardLimit) * 100 : 0;
                    
                    return (
                        <StatCard 
                            key={card.id}
                            title={card.name}
                            value={`R$ ${formatCurrency(cardUsed)}`}
                            icon={CreditCard}
                            color={usagePercent > 90 ? 'red' : (usagePercent > 70 ? 'orange' : 'primary')}
                            isActive={isActive}
                            onClick={() => setSelectedCardId(card.id)}
                            subtext={`Lim: R$ ${formatCurrency(cardLimit)} • Vence: Dia ${card.dueDay}`}
                        />
                    );
                })}
            </div>

            {!selectedCard ? (
                <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '24px', border: '2px dashed var(--border)', marginTop: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ backgroundColor: 'var(--surface-hover)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <CreditCard size={32} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Nenhum cartão cadastrado</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', marginInline: 'auto' }}>Cadastre seus cartões de crédito para monitorar limites, faturas futuras e ter total controle do seu endividamento.</p>
                    <button onClick={openNewAccount} className="btn py-3 px-8 shadow-md" style={{ background: 'var(--primary)', color: 'white', fontWeight: 800, borderRadius: '12px' }}>
                        Adicionar Meu Primeiro Cartão
                    </button>
                </div>
            ) : (
                <>
                {/* DETALHES DO CARTÃO SELECIONADO */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                        <BarChart2 size={20} color="var(--primary)" />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Inteligência: {selectedCard.name.toUpperCase()}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Métricas detalhadas e projeção de faturas.</p>
                    </div>
                </div>

                <div className="dashboard-grid animate-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '1.5rem' }}>
                    {(() => {
                        const cardBal = accBalances[selectedCard.id] || 0;
                        const cardUsed = cardBal < 0 ? Math.abs(cardBal) : 0;
                        const cardLimit = Number(selectedCard.limit || 0);
                        const percent = cardLimit > 0 ? (cardUsed / cardLimit) * 100 : 0;
                        const dueDay = selectedCard.dueDay || 10;
                        const closeDay = selectedCard.closeDay || (dueDay - 7 <= 0 ? 30 + (dueDay - 7) : dueDay - 7);

                        return (
                            <>
                                <StatCard 
                                    title="Gasto Atual" 
                                    value={`R$ ${formatCurrency(cardUsed)}`} 
                                    icon={ShoppingBag} 
                                    color="primary"
                                    subtext="Soma de faturas em aberto"
                                />

                                <StatCard 
                                    title="Uso do Limite" 
                                    value={`${percent.toFixed(1)}%`} 
                                    icon={BarChart2} 
                                    color={percent > 90 ? 'red' : 'blue'}
                                    subtext={`R$ ${formatCurrency(Math.max(0, cardLimit - cardUsed))} disponíveis`}
                                />

                                <div className="stat-card overflow-hidden" style={{ borderLeftColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.02)', position: 'relative' }}>
                                    <div className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Ciclo da Fatura</p>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1, padding: '12px', background: 'var(--surface)', borderRadius: '14px', border: '1.5px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vence</span>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Dia</span> {String(dueDay).padStart(2, '0')}
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, padding: '12px', background: 'var(--surface)', borderRadius: '14px', border: '1.5px solid rgba(245, 158, 11, 0.3)', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.1)' }}>
                                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>Fecha</span>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Dia</span> {String(closeDay).padStart(2, '0')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="stat-icon-wrapper" style={{ position: 'absolute', top: '10px', right: '10px', color: '#f59e0b', backgroundColor: '#f59e0b1A', width: '38px', height: '38px' }}>
                                        <Calendar size={18} />
                                    </div>
                                </div>

                                <div className="stat-card" style={{ borderLeftColor: 'var(--primary)', background: 'rgba(99, 102, 241, 0.02)' }}>
                                    <div className="flex-1">
                                        <p style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '1rem' }}>Gerenciar Cartão</p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openEditAccount(selectedCard); }} 
                                                className="btn flex-1 hover:scale-105 transition-all" 
                                                style={{ padding: '0 16px', height: '42px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}
                                            >
                                                <Edit2 size={14} color="var(--primary)" /> Ajustar
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteAccount(selectedCard.id, e)} 
                                                className="btn hover:scale-105 transition-all" 
                                                style={{ padding: '0 12px', height: '42px', background: '#fef2f2', border: '1.5px solid #fee2e2', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>



            {/* Layout de Gráficos (Flex estilo Dashboard) */}
            <div className="charts-layout">
                
                {/* 1. Projeção de Faturas (Bar Chart) */}
                <div className="chart-card">
                    <div className="chart-header">
                        <BarChart2 size={20} color="var(--primary)" /> Projeção de Faturas (6 Meses)
                    </div>
                    <div style={{ width: '100%', minHeight: '280px' }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFatura" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Fatura Projetada']}
                                />
                                <Bar 
                                    dataKey="Fatura" 
                                    fill="url(#colorFatura)" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={40}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Resumo da Fatura Atual / Timeline Simples */}
                <div className="chart-card">
                    <div className="chart-header flex justify-between items-center w-full">
                        <span className="flex items-center gap-2"><Calendar size={20} color="var(--primary)" /> Fatura do Mês</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', paddingBottom: '2rem' }}>
                        
                        {/* Timeline Toggle Clássico */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
                            <button 
                                onClick={() => setSelectedMonthOffset(prev => prev - 1)}
                                className="btn btn-icon" style={{ backgroundColor: 'var(--surface-hover)', padding: '8px' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <div style={{ 
                                padding: '8px 24px', 
                                backgroundColor: 'var(--surface-hover)', 
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: statusColor,
                                minWidth: '140px',
                                textAlign: 'center',
                                border: `1px solid ${statusColor}33`
                            }}>
                                {timelineMonths.find(m => m.offset === selectedMonthOffset)?.label} {timelineMonths.find(m => m.offset === selectedMonthOffset)?.year}
                            </div>

                            <button 
                                onClick={() => setSelectedMonthOffset(prev => prev + 1)}
                                className="btn btn-icon" style={{ backgroundColor: 'var(--surface-hover)', padding: '8px' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Fatura Value */}
                             <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0', lineHeight: 1, textDecoration: isPaid && invoiceTotal > 0 ? 'line-through' : 'none' }}>
                                 R$ {formatCurrency(invoiceTotal)}
                             </h2>
                             <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                 Vencimento dia {selectedCard.dueDay}
                             </p>

                             {invoiceBalance > 0 && selectedMonthOffset <= 0 && !isPaid && (
                                 <button 
                                     className="btn btn-primary shadow-sm hover:-translate-y-0.5" 
                                     style={{ marginTop: '1rem', borderRadius: '9999px', padding: '0.5rem 1.5rem', fontWeight: 700, backgroundColor: 'var(--primary)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }} 
                                     onClick={() => openInvoicePayment()}
                                 >
                                     <CheckCircle size={16} /> Pagar Fatura
                                 </button>
                             )}
                             {isPaid && invoiceTotal > 0 && (
                                 <p style={{ marginTop: '1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>
                                     ✨ Fatura Liquidada
                                 </p>
                             )}

                        {/* Donut Chart para Limite Global */}
                        <div style={{ marginTop: '1rem', position: 'relative', minHeight: '160px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Usado', value: used, fill: '#ef4444' }, // Red for Used
                                            { name: 'Livre', value: available, fill: '#e5e7eb' } // Gray for Available
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={75}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        paddingAngle={2}
                                        animationDuration={1500}
                                    />
                                    <Tooltip 
                                        formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                             <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                 <span style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{limit > 0 ? `${((used/limit)*100).toFixed(0)}% Usado` : 'Limite'}</span>
                                 <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                                     R$ {formatCurrency(limit)}
                                 </span>
                             </div>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '0.5rem' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Usado: R$ {formatCurrency(used)}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db' }}></div>
                                 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Livre: R$ {formatCurrency(available)}</span>
                             </div>
                         </div>

                    </div>
                </div>
            </div>

            {/* Tabela de Lançamentos Baseada no Dashboard */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Lançamentos ({timelineMonths.find(m => m.offset === selectedMonthOffset)?.label})
                    </h3>
                </div>
                
                <div className="table-container">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', width: '120px' }}>Data</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Descrição</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', width: '150px' }}>Parcela</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', width: '150px' }}>Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentInvoiceTrans.map(trans => (
                                <tr 
                                    key={trans.id} 
                                    onClick={() => setSelectedDetailTrans(trans)}
                                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} 
                                    className="hover:bg-blue-50 transition-colors"
                                    title="Editar Lançamento"
                                >
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        {new Date(trans.date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        {trans.description}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                        {trans.installmentsTotal > 1 ? (
                                             <span style={{ 
                                                backgroundColor: 'var(--surface-hover)', 
                                                color: 'var(--text-muted)', 
                                                padding: '4px 8px', 
                                                borderRadius: '4px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 600
                                            }}>
                                                {trans.installmentNumber} / {trans.installmentsTotal}
                                            </span>
                                        ) : '-'}
                                    </td>
                                     <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                                         R$ {formatCurrency(trans.amount)}
                                     </td>
                                </tr>
                            ))}
                            {currentInvoiceTrans.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                                        Nenhum lançamento registrado nesta fatura.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            </>
            )}

            {/* Modal for creating/editing credit card */}
            {isAccModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                {editAccId ? 'Editar Cartão' : 'Novo Cartão'}
                            </h2>
                            <button onClick={() => setIsAccModalOpen(false)} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Nome do Cartão <span style={{color: '#ef4444'}}>*</span></label>
                                <input required type="text" placeholder="Ex: Nubank, Inter, Itaú" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Dia do Vencimento <span style={{color: '#ef4444'}}>*</span></label>
                                    <input required type="number" min="1" max="31" placeholder="Ex: 5, 10, 20" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} value={newAccount.dueDay} onChange={e => setNewAccount({...newAccount, dueDay: e.target.value})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Dia de Fechamento</label>
                                    <input type="number" min="1" max="31" placeholder="Calculado aut." style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} value={newAccount.closeDay} onChange={e => setNewAccount({...newAccount, closeDay: e.target.value})} />
                                    <p style={{ fontSize: '0.70rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Se vazio, será Venc. - 7</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsAccModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    {editAccId ? 'Salvar Alterações' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for paying invoice */}
            {isPaymentModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '400px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                Pagar Fatura
                            </h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handlePayInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ textAlign: 'center', background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Valor a pagar</span>
                                 <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                                     R$ {formatCurrency(invoiceBalance)}
                                 </h3>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>De onde o dinheiro vai sair? <span style={{color: '#ef4444'}}>*</span></label>
                                <select required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} value={paymentAccId} onChange={e => setPaymentAccId(e.target.value)}>
                                    <option value="">Selecione uma conta...</option>
                                     {allAccounts.filter(a => a.type !== 'credit').map(a => (
                                         <option key={a.id} value={a.id}>{a.name} (Saldo: R$ {formatCurrency(accBalances[a.id] || 0)})</option>
                                     ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Confirmar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <FinanceTransactionDetailsModal
                isOpen={!!selectedDetailTrans}
                onClose={() => setSelectedDetailTrans(null)}
                transaction={selectedDetailTrans}
                onUpdate={fetchData}
                accounts={allAccounts}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
            />

        </div>
    );
}
