
import React, { useState, useEffect } from 'react';
import { Plus, Send, CheckCircle, XCircle, FileText, LayoutGrid, List, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import db from '../services/database.js';
import { NewBudgetModal } from '../components/NewBudgetModal.jsx';
import { BudgetDetailModal } from '../components/BudgetDetailModal.jsx';
import { getPublicAppBaseUrl } from '../utils/publicRuntime.js';

const STATUS_CONFIG = {
    'Rascunho':  { bg: '#f1f5f9', color: '#475569',  border: '#cbd5e1', dot: '#94a3b8',  label: 'Rascunho' },
    'Enviado':   { bg: '#eff6ff', color: '#1d4ed8',  border: '#bfdbfe', dot: '#3b82f6',  label: 'Enviado' },
    'Aprovado':  { bg: '#f0fdf4', color: '#15803d',  border: '#bbf7d0', dot: '#22c55e',  label: 'Aprovado' },
    'Rejeitado': { bg: '#fef2f2', color: '#dc2626',  border: '#fecaca', dot: '#f87171',  label: 'Rejeitado' },
};

export function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingBudget, setEditingBudget] = useState(null);
    // Detail popup state
    const [detailBudget, setDetailBudget] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    const generatePublicToken = () => {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return `prop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const fetchBudgets = async () => {
        try {
            const allBudgets = await db.getAll('budgets');
            const sorted = Array.isArray(allBudgets)
                ? [...allBudgets].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                : [];
            setBudgets(sorted);
        } catch (error) {
            console.error('Error fetching budgets:', error);
            setBudgets([]);
        }
    };

    useEffect(() => { fetchBudgets(); }, []);

    const openDetail = (budget) => {
        setDetailBudget(budget);
        setIsDetailOpen(true);
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
        // Refresh after closing in case edits were made
        fetchBudgets();
    };

    const handleSendWhatsapp = async (budget) => {
        try {
            const baseUrl = getPublicAppBaseUrl();
            const publicToken = budget.publicToken || generatePublicToken();
            const sharedAt = new Date().toISOString();

            await db.update('budgets', String(budget.id), {
                publicToken,
                publicAccess: true,
                sharedAt,
                status: budget.status === 'Rascunho' ? 'Enviado' : budget.status
            });

            const proposalLink = `${baseUrl}/#/proposal/${budget.id}?t=${encodeURIComponent(publicToken)}`;

            let companyName = 'nossa equipe';
            try {
                const saved = localStorage.getItem('stationery_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.companyName) companyName = parsed.companyName;
                }
            } catch (e) {}

            const firstName = budget.customerName.split(' ')[0];
            const message = `Olá, ${firstName}!\n✨ Preparamos com todo o carinho a sua proposta comercial.\n\nVocê pode conferir todos os detalhes, valores e aprovar o seu orçamento diretamente pelo nosso link interativo:\n\n${proposalLink}\n\nQualquer dúvida, a ${companyName} está à disposição!`;

            let sentViaApi = false;
            let num = '';
            const customers = await db.getAll('customers');
            const customerObj = customers.find(c => c.name === budget.customerName);

            if (customerObj && (customerObj.phone || customerObj.whatsapp)) {
                num = String(customerObj.phone || customerObj.whatsapp).replace(/\D/g, '');
            }

            if (num.length >= 10) {
                try {
                    const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
                    const res = await fetch(`${apiUrl}/api/campaign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targets: [{ phone: num, message }] })
                    });
                    if (res.ok) sentViaApi = true;
                } catch (e) { console.warn('Background API Failed', e); }
            }

            if (!sentViaApi) {
                let finalNum = num;
                if (finalNum.length >= 10) finalNum = `55${finalNum}`;
                const url = finalNum.length >= 10
                    ? `https://wa.me/${finalNum}?text=${encodeURIComponent(message)}`
                    : `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank') || (window.location.href = url);
            }

            fetchBudgets();
        } catch (err) {
            console.error(err);
        }
    };

    const handleApprove = async (budget) => {
        if (!window.confirm('Confirmar aprovação do cliente? Isso pode gerar um pedido automaticamente.')) return;
        await db.update('budgets', budget.id, { status: 'Aprovado' });

        if (window.confirm('Deseja criar um Pedido de Venda agora?')) {
            const mappedItems = budget.items?.map(it => ({
                productId: it.productId || '',
                name: it.productName || 'Item Orçamento',
                quantity: it.quantity || 1,
                price: it.price || 0,
                total: it.total || 0,
                productionStep: 'pending'
            })) || [];

            const newOrder = {
                customer: budget.customerName,
                date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                items: budget.items?.length || 0,
                total: budget.total,
                fromBudget: budget.id,
                cartItems: mappedItems
            };

            const createdOrder = await db.create('orders', newOrder);

            // CRM WhatsApp automation
            try {
                const customers = await db.getAll('customers');
                const customerObj = customers.find(c => c.name === budget.customerName);
                if (customerObj?.phone) {
                    const num = customerObj.phone.replace(/\D/g, '');
                    if (num.length >= 10) {
                        let companyName = 'nossa equipe';
                        try { const s = localStorage.getItem('stationery_config'); if (s) { const p = JSON.parse(s); if (p.companyName) companyName = p.companyName; } } catch (e) {}
                        const baseUrl = window.location.href.split('#')[0];
                        const finalId = createdOrder?.id || 'ID-Novo';
                        const trackingLink = `${baseUrl}#/status/${finalId}`;
                        const firstName = customerObj.name.split(' ')[0];
                        const msgText = `Olá ${firstName}!\n✨ O seu pedido #${finalId.toString().substring(0,8)} acaba de entrar na nossa *[Fila de Produção]*.\n\nAcompanhe em tempo real:\n\n${trackingLink}`;
                        const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
                        fetch(`${apiUrl}/api/campaign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targets: [{ phone: num, message: msgText }] }) }).catch(() => {});
                    }
                }
            } catch (err) { console.error(err); }
        }

        fetchBudgets();
        setIsDetailOpen(false);
    };

    const handleReject = async (budget) => {
        if (window.confirm('Marcar orçamento como rejeitado?')) {
            await db.update('budgets', budget.id, { status: 'Rejeitado' });
            fetchBudgets();
            setIsDetailOpen(false);
        }
    };

    const handleDelete = async (budget) => {
        if (window.confirm('Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.')) {
            await db.delete('budgets', budget.id);
            fetchBudgets();
            setIsDetailOpen(false);
        }
    };

    const filteredBudgets = budgets.filter(b => {
        const search = searchTerm.toLowerCase();
        const idStr = b.id ? b.id.toString() : '';
        const matchSearch = b.customerName?.toLowerCase().includes(search) || idStr.toLowerCase().includes(search);
        const matchStatus = statusFilter === '' || b.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // KPI summary
    const kpis = {
        total: budgets.length,
        approved: budgets.filter(b => b.status === 'Aprovado').length,
        pending: budgets.filter(b => b.status === 'Enviado').length,
        totalValue: budgets.reduce((acc, b) => acc + (Number(b.total) || 0), 0),
    };

    return (
        <div className="animate-fade-in">
            {/* ── PAGE HEADER ── */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 className="title">Orçamentos & Propostas</h2>
                        <p className="text-muted">Gerencie propostas comerciais e acompanhe o ciclo de aprovação.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditingBudget(null); setIsNewModalOpen(true); }}>
                        <Plus size={16} /> Novo Orçamento
                    </button>
                </div>

                {/* KPI Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px' }}>
                    {[
                        { label: 'Total de Orçamentos', value: kpis.total, icon: <FileText size={16} />, color: '#7c3aed', bg: '#faf5ff' },
                        { label: 'Aprovados', value: kpis.approved, icon: <CheckCircle size={16} />, color: '#15803d', bg: '#f0fdf4' },
                        { label: 'Aguardando Resposta', value: kpis.pending, icon: <Clock size={16} />, color: '#b45309', bg: '#fffbeb' },
                        { label: 'Volume Total', value: `R$ ${kpis.totalValue.toFixed(2).replace('.', ',')}`, icon: <DollarSign size={16} />, color: '#0369a1', bg: '#f0f9ff' },
                    ].map((k, i) => (
                        <div key={i} style={{ backgroundColor: k.bg, border: `1px solid ${k.color}22`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: k.color + '18', color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {k.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>{k.label}</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── FILTERS & VIEW TOGGLE ── */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por cliente ou ID..."
                    className="form-input"
                    style={{ flex: '1', minWidth: '200px' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-input"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ backgroundColor: 'var(--surface)', minWidth: '150px' }}
                >
                    <option value="">Todos os Status</option>
                    <option value="Rascunho">Rascunho</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Rejeitado">Rejeitado</option>
                </select>
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{ padding: '8px 12px', background: viewMode === 'grid' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Visualização em cards"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '8px 12px', background: viewMode === 'list' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Visualização em lista"
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            {/* ── GRID VIEW ── */}
            {viewMode === 'grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {filteredBudgets.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                            <FileText size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>Nenhum orçamento encontrado.</p>
                        </div>
                    )}
                    {filteredBudgets.map(budget => {
                        const cfg = STATUS_CONFIG[budget.status] || STATUS_CONFIG['Rascunho'];
                        const validDate = budget.validUntil ? new Date(budget.validUntil + 'T00:00:00') : null;
                        const isExpired = validDate && validDate < new Date() && budget.status !== 'Aprovado' && budget.status !== 'Rejeitado';

                        return (
                            <div
                                key={budget.id}
                                onClick={() => openDetail(budget)}
                                style={{
                                    backgroundColor: 'var(--surface, white)',
                                    border: `1px solid ${isExpired ? '#fca5a5' : cfg.border}`,
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                {/* Accent bar */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: cfg.dot }} />

                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            #{String(budget.id).substring(0, 10)}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginTop: '2px' }}>
                                            {budget.customerName}
                                        </div>
                                    </div>
                                    <span style={{ backgroundColor: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot, display: 'inline-block' }} />
                                        {budget.status || 'Rascunho'}
                                    </span>
                                </div>

                                {/* Value */}
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary, #7c3aed)', marginBottom: '12px' }}>
                                    R$ {Number(budget.total || 0).toFixed(2).replace('.', ',')}
                                </div>

                                {/* Meta */}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <FileText size={11} /> {budget.items?.length || 0} {budget.items?.length === 1 ? 'item' : 'itens'}
                                    </span>
                                    {validDate && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: isExpired ? '#dc2626' : 'inherit' }}>
                                            <Clock size={11} /> {isExpired ? '⚠️ Vencido' : `Válido até ${validDate.toLocaleDateString('pt-BR')}`}
                                        </span>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border, #f1f5f9)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => handleSendWhatsapp(budget)}
                                        title="Enviar WhatsApp"
                                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Send size={12} /> Enviar
                                    </button>
                                    {budget.status !== 'Aprovado' && budget.status !== 'Rejeitado' && (
                                        <button
                                            onClick={() => handleApprove(budget)}
                                            title="Aprovar"
                                            style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            <CheckCircle size={12} /> Aprovar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openDetail(budget)}
                                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <FileText size={12} /> Detalhes
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── LIST VIEW ── */}
            {viewMode === 'list' && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cliente</th>
                                    <th>Data</th>
                                    <th>Validade</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBudgets.map(budget => {
                                    const cfg = STATUS_CONFIG[budget.status] || STATUS_CONFIG['Rascunho'];
                                    return (
                                        <tr key={budget.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(budget)}>
                                            <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{String(budget.id).substring(0,10)}</td>
                                            <td style={{ fontWeight: 600 }}>{budget.customerName}</td>
                                            <td className="text-muted">{budget.date ? new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                            <td className="text-muted">{budget.validUntil ? new Date(budget.validUntil + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>R$ {Number(budget.total || 0).toFixed(2).replace('.', ',')}</td>
                                            <td>
                                                <span style={{ backgroundColor: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot }} />
                                                    {budget.status || 'Rascunho'}
                                                </span>
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-icon" title="Ver Detalhes" onClick={() => openDetail(budget)} style={{ color: 'var(--primary)' }}>
                                                        <FileText size={16} />
                                                    </button>
                                                    <button className="btn btn-icon" title="Enviar WhatsApp" onClick={() => handleSendWhatsapp(budget)} style={{ color: '#25D366' }}>
                                                        <Send size={16} />
                                                    </button>
                                                    {budget.status !== 'Aprovado' && budget.status !== 'Rejeitado' && (
                                                        <>
                                                            <button className="btn btn-icon" title="Aprovar" onClick={() => handleApprove(budget)} style={{ color: 'var(--success)' }}>
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button className="btn btn-icon" title="Rejeitar" onClick={() => handleReject(budget)} style={{ color: 'var(--danger)' }}>
                                                                <XCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBudgets.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center p-4 text-muted">Nenhum orçamento encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── MODALS ── */}
            <NewBudgetModal
                isOpen={isNewModalOpen}
                onClose={() => { setIsNewModalOpen(false); setEditingBudget(null); }}
                onBudgetCreated={fetchBudgets}
                editingBudget={editingBudget}
            />

            <BudgetDetailModal
                isOpen={isDetailOpen}
                budget={detailBudget}
                onClose={closeDetail}
                onSaved={fetchBudgets}
                onApprove={handleApprove}
                onReject={handleReject}
                onSendWhatsapp={handleSendWhatsapp}
                onDelete={handleDelete}
            />
        </div>
    );
}
