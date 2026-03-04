import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calendar, BarChart2, AlertCircle, ShoppingBag, CheckCircle, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, X } from 'lucide-react';
import db from '../services/database';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie
} from 'recharts';
import '../css/pages.css';

export function CreditCards() {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [allAccounts, setAllAccounts] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

    const [isAccModalOpen, setIsAccModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAccId, setPaymentAccId] = useState('');
    const [editAccId, setEditAccId] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'credit', balance: 0, limit: 0, dueDay: 10, closeDay: '', color: '#8b5cf6' });

    const fetchData = async () => {
        const accs = await db.getAll('accounts');
        const trans = await db.getAll('transactions');
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
        if(window.confirm('Tem certeza que deseja excluir este cartão de crédito? As transações atreladas a ele perderão vínculo e a fatura ficará órfã.')) {
            try {
                await db.delete('accounts', id);
                if (selectedCardId === id) setSelectedCardId(null);
                await fetchData();
            } catch (error) {
                console.error("Erro ao excluir cartão:", error);
                alert("Falha ao excluir o cartão.");
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

    // Fatura do cartão e mês selecionados
    const currentInvoiceTrans = useMemo(() => {
        if (!selectedCard) return [];
        
        const base = new Date();
        const targetDate = new Date(base.getFullYear(), base.getMonth() + selectedMonthOffset, 1);

        return transactions.filter(t => {
            if (t.accountId !== selectedCard.id) return false;
            // Mostramos apenas despesas para compor o valor da fatura
            if (t.type !== 'expense') return false; 
            
            const [y, m, d] = t.date.split('-');
            const transDate = new Date(y, m - 1, d);
            return isSameMonth(transDate, targetDate);
        }).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [transactions, selectedCard, selectedMonthOffset]);

    const invoiceTotal = currentInvoiceTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Soma os pagamentos de fatura feitos *neste mesmo range* para descontar da fatura "Em Aberto"
    const invoicePaidTotal = useMemo(() => {
        if (!selectedCard) return 0;
        const base = new Date();
        const targetDate = new Date(base.getFullYear(), base.getMonth() + selectedMonthOffset, 1);

        return transactions.filter(t => {
            if (t.accountId !== selectedCard.id) return false;
            if (t.type !== 'income') return false; // Pagamentos são entradas
            // Filtra só os pagamentos que caem no mes dessa fatura, mas idealmente marcamos um metadado
            // Mas checando o mesmo mês já serve na maioria dos casos básicos.
            const [y, m, d] = t.date.split('-');
            const transDate = new Date(y, m - 1, d);
            return isSameMonth(transDate, targetDate) && t.description.includes('Pagamento Fatura');
        }).reduce((acc, t) => acc + Number(t.amount || 0), 0);
    }, [transactions, selectedCard, selectedMonthOffset]);

    const invoiceBalance = Math.max(0, invoiceTotal - invoicePaidTotal);

    const openInvoicePayment = () => {
        setPaymentAccId('');
        setIsPaymentModalOpen(true);
    };

    const handlePayInvoice = async (e) => {
        e.preventDefault();
        if (!paymentAccId) return;

        // Saída de dinheiro da conta corrente
        const expensePayload = {
            description: `Pagamento Fatura ${selectedCard.name}`,
            amount: invoiceBalance,
            type: 'expense',
            category: 'Cartão de Crédito',
            accountId: paymentAccId,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            installments: 1
        };

        // Entrada de dinheiro no cartão (restaurando balance negativo / liberando limite)
        const incomePayload = {
            description: `Pagamento Fatura ${selectedCard.name}`,
            amount: invoiceBalance,
            type: 'income',
            category: 'Cartão de Crédito',
            accountId: selectedCard.id,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
            installments: 1
        };

        await Promise.all([
            db.create('transactions', expensePayload),
            db.create('transactions', incomePayload)
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

    let statusText = 'Em Aberto';
    let statusColor = '#3b82f6';

    if (selectedMonthOffset < 0) {
        statusText = 'Fechada / Paga';
        statusColor = '#10b981';
    } else if (selectedMonthOffset > 0) {
        statusText = 'Fatura Futura';
        statusColor = '#8b5cf6';
    }

    const used = selectedCard ? Math.abs(Number(selectedCard.balance || 0)) : 0;
    const limit = selectedCard ? Number(selectedCard.limit || 0) : 0;
    const available = selectedCard ? Math.max(0, limit - used) : 0;

    return (
        <div className="animate-fade-in page-content">
            {/* Header */}
            <div className="dashboard-header">
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

            {!selectedCard ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: '16px', border: '1px dashed var(--border)', marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Nenhum cartão cadastrado</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Cadastre seu primeiro cartão de crédito para começar a ter inteligência nas suas faturas.</p>
                    <button onClick={openNewAccount} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700 }}>
                        <Plus size={18} /> Adicionar Cartão
                    </button>
                </div>
            ) : (
                <>

            {/* Cartões como KPI Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
                {accounts.map(card => {
                    const isActive = selectedCardId === card.id;
                    const cardUsed = Math.abs(Number(card.balance || 0));
                    const cardLimit = Number(card.limit || 0);

                    return (
                        <div 
                            key={card.id} 
                            onClick={() => setSelectedCardId(card.id)}
                            className="stat-card" 
                            style={{ 
                                borderLeftColor: isActive ? 'var(--primary)' : 'transparent',
                                cursor: 'pointer',
                                opacity: isActive ? 1 : 0.6,
                                transition: 'all 0.2s ease',
                                transform: isActive ? 'translateY(-2px)' : 'none',
                                boxShadow: isActive ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                background: isActive ? 'var(--surface)' : 'var(--surface-hover)'
                            }}
                        >
                            <div className="flex-1">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                                        {card.name}
                                    </p>
                                    {isActive && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); openEditAccount(card); }} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Editar Cartão"><Edit2 size={12} /></button>
                                            <button onClick={(e) => handleDeleteAccount(card.id, e)} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Remover Cartão"><Trash2 size={12} /></button>
                                        </div>
                                    )}
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    R$ {cardUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                    Limite: R$ {cardLimit.toLocaleString('pt-BR')} <span style={{ opacity: 0.5, margin: '0 4px' }}>|</span> Dia {card.dueDay || 10}
                                </p>
                            </div>
                            <div className="stat-icon-wrapper" style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent' }}>
                                <CreditCard size={24} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Layout de Gráficos (Flex estilo Dashboard) */}
            <div className="charts-layout">
                
                {/* 1. Projeção de Faturas (Bar Chart) */}
                <div className="chart-card">
                    <div className="chart-header">
                        <BarChart2 size={20} color="var(--primary)" /> Projeção de Faturas (6 Meses)
                    </div>
                    <div style={{ width: '100%', height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
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
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                Total da Fatura ({statusText})
                            </span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.5rem 0', lineHeight: 1, textDecoration: invoicePaidTotal >= invoiceTotal && invoiceTotal > 0 ? 'line-through' : 'none' }}>
                                R$ {invoiceTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Vencimento dia {selectedCard.dueDay}
                            </p>

                            {invoiceBalance > 0 && selectedMonthOffset <= 0 && (
                                <button 
                                    className="btn btn-primary shadow-sm hover:-translate-y-0.5" 
                                    style={{ marginTop: '1rem', borderRadius: '9999px', padding: '0.5rem 1.5rem', fontWeight: 700, backgroundColor: 'var(--primary)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }} 
                                    onClick={() => openInvoicePayment()}
                                >
                                    <CheckCircle size={16} /> Pagar Fatura
                                </button>
                            )}
                            {invoicePaidTotal >= invoiceTotal && invoiceTotal > 0 && (
                                <p style={{ marginTop: '1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>
                                    ✨ Fatura Liquidada
                                </p>
                            )}
                        </div>

                        {/* Donut Chart para Limite Global */}
                        <div style={{ marginTop: '1rem', position: 'relative', height: '160px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
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
                                    R$ {limit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Usado: R$ {used.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Livre: R$ {available.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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
                                <tr key={trans.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-gray-50/10 transition-colors">
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
                                        {Number(trans.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                    R$ {invoiceBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>De onde o dinheiro vai sair? <span style={{color: '#ef4444'}}>*</span></label>
                                <select required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} value={paymentAccId} onChange={e => setPaymentAccId(e.target.value)}>
                                    <option value="">Selecione uma conta...</option>
                                    {allAccounts.filter(a => a.type !== 'credit').map(a => (
                                        <option key={a.id} value={a.id}>{a.name} (Saldo: R$ {Number(a.balance || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})})</option>
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

        </div>
    );
}
