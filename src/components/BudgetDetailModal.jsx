import React, { useState, useEffect } from 'react';
import {
    X, Edit3, Save, Send, CheckCircle, XCircle, Package, DollarSign,
    Calendar, User, Clock, ArrowRight, ExternalLink, FileText, Layers,
    TrendingUp, AlertCircle, RefreshCcw, Trash2, ChevronDown, ChevronUp,
    Printer, Copy, Check
} from 'lucide-react';
import db from '../services/database.js';
import { getPublicAppBaseUrl } from '../utils/publicRuntime.js';

const STATUS_CONFIG = {
    'Rascunho':  { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
    'Enviado':   { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
    'Aprovado':  { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
    'Rejeitado': { bg: '#fef2f2', color: '#dc2626', dot: '#f87171' },
};

const ORDER_STATUS_CONFIG = {
    'Novo':                  { bg: '#eff6ff', color: '#1e40af' },
    'Em Produção':           { bg: '#fefce8', color: '#a16207' },
    'Pronto para Retirada':  { bg: '#f0fdf4', color: '#166534' },
    'Concluído':             { bg: '#f0fdf4', color: '#15803d' },
    'Cancelado':             { bg: '#fef2f2', color: '#dc2626' },
};

export function BudgetDetailModal({ isOpen, onClose, budget, onSaved, onApprove, onReject, onSendWhatsapp, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [relatedOrders, setRelatedOrders] = useState([]);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'items'

    useEffect(() => {
        if (isOpen && budget) {
            setEditData({
                customerName: budget.customerName || '',
                validUntil: budget.validUntil || '',
                notes: budget.notes || '',
                items: budget.items ? [...budget.items] : [],
            });
            setIsEditing(false);
            setActiveTab('overview');
            setExpandedOrder(null);
            loadRelatedData();
        }
    }, [isOpen, budget]);

    const loadRelatedData = async () => {
        if (!budget) return;
        try {
            const allOrders = await db.getAll('orders');
            const filtered = (allOrders || []).filter(o => String(o.fromBudget) === String(budget.id));
            filtered.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
            setRelatedOrders(filtered);

            const allCustomers = await db.getAll('customers');
            setCustomers(allCustomers || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!budget) return;
        setIsSaving(true);
        try {
            const updatedTotal = editData.items.reduce((acc, it) => acc + (it.total || 0), 0);
            await db.update('budgets', String(budget.id), {
                customerName: editData.customerName,
                validUntil: editData.validUntil,
                notes: editData.notes,
                items: editData.items,
                total: updatedTotal,
            });
            setIsEditing(false);
            if (onSaved) onSaved();
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = () => {
        if (!budget) return;
        const baseUrl = getPublicAppBaseUrl();
        const token = budget.publicToken ? `?t=${encodeURIComponent(budget.publicToken)}` : '';
        const link = `${baseUrl}/#/proposal/${budget.id}${token}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const removeItem = (idx) => {
        const newItems = [...editData.items];
        newItems.splice(idx, 1);
        setEditData(prev => ({ ...prev, items: newItems }));
    };

    const updateItemPrice = (idx, newPrice) => {
        const newItems = [...editData.items];
        newItems[idx] = { ...newItems[idx], price: parseFloat(newPrice) || 0, total: (parseFloat(newPrice) || 0) * (newItems[idx].quantity || 1) };
        setEditData(prev => ({ ...prev, items: newItems }));
    };

    const updateItemQty = (idx, newQty) => {
        const newItems = [...editData.items];
        newItems[idx] = { ...newItems[idx], quantity: parseInt(newQty) || 1, total: (newItems[idx].price || 0) * (parseInt(newQty) || 1) };
        setEditData(prev => ({ ...prev, items: newItems }));
    };

    if (!isOpen || !budget) return null;

    const statusCfg = STATUS_CONFIG[budget.status] || STATUS_CONFIG['Rascunho'];
    const editTotal = editData.items?.reduce((acc, it) => acc + (it.total || 0), 0) || 0;
    const totalOrders = relatedOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const totalPaid = relatedOrders.reduce((acc, o) => acc + (parseFloat(o.amountPaid) || 0), 0);
    const totalBalance = Math.max(0, totalOrders - totalPaid);

    const validUntilDate = budget.validUntil ? new Date(budget.validUntil + 'T00:00:00') : null;
    const isExpired = validUntilDate && validUntilDate < new Date();

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--surface, #fff)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '760px',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
                    overflow: 'hidden',
                    border: '1px solid var(--border, #e2e8f0)',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, var(--primary, #7c3aed) 0%, #9333ea 100%)',
                    color: 'white',
                }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Orçamento #{String(budget.id).substring(0, 12)}
                        </div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <User size={18} style={{ opacity: 0.85 }} />
                            {budget.customerName}
                        </h2>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={13} />
                                Criado em {budget.date ? new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                            </span>
                            {validUntilDate && (
                                <span style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px', color: isExpired ? '#fca5a5' : 'inherit' }}>
                                    <Clock size={13} />
                                    Válido até {validUntilDate.toLocaleDateString('pt-BR')}
                                    {isExpired && ' ⚠️ Vencido'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                            backgroundColor: statusCfg.bg,
                            color: statusCfg.color,
                            padding: '4px 12px', borderRadius: '20px',
                            fontSize: '0.78rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusCfg.dot, display: 'inline-block' }} />
                            {budget.status || 'Rascunho'}
                        </span>
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: 'white', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── KPI STRIP ── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    backgroundColor: 'var(--background, #f8fafc)',
                }}>
                    {[
                        { label: 'Valor do Orçamento', value: `R$ ${Number(budget.total || 0).toFixed(2).replace('.', ',')}`, icon: <FileText size={16} />, color: '#7c3aed' },
                        { label: 'Pedidos Gerados', value: relatedOrders.length, icon: <Package size={16} />, color: '#0ea5e9' },
                        { label: totalBalance > 0 ? 'Saldo a Receber' : 'Valor Recebido', value: `R$ ${(totalBalance > 0 ? totalBalance : totalPaid).toFixed(2).replace('.', ',')}`, icon: <DollarSign size={16} />, color: totalBalance > 0 ? '#f59e0b' : '#22c55e' },
                    ].map((kpi, i) => (
                        <div key={i} style={{ padding: '14px 20px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border, #e2e8f0)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: kpi.color, marginBottom: '2px' }}>
                                {kpi.icon}
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #1e293b)' }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── TABS ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border, #e2e8f0)', backgroundColor: 'var(--surface, #fff)', padding: '0 24px' }}>
                    {[
                        { id: 'overview', label: '📋 Visão Geral' },
                        { id: 'items', label: `📦 Itens (${budget.items?.length || 0})` },
                        { id: 'orders', label: `🛒 Pedidos (${relatedOrders.length})` },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px 16px',
                                border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--primary, #7c3aed)' : '2px solid transparent',
                                backgroundColor: 'transparent',
                                color: activeTab === tab.id ? 'var(--primary, #7c3aed)' : 'var(--text-muted, #64748b)',
                                fontWeight: activeTab === tab.id ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                marginBottom: '-1px',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── BODY ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Notes / Observações */}
                            <div style={{ backgroundColor: 'var(--background, #f8fafc)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border, #e2e8f0)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                    Observações / Anotações
                                </div>
                                {isEditing ? (
                                    <textarea
                                        value={editData.notes}
                                        onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                                        rows={3}
                                        placeholder="Adicionar observações sobre este orçamento..."
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', backgroundColor: 'white', fontSize: '0.9rem', color: 'var(--text-main, #1e293b)', resize: 'vertical', fontFamily: 'inherit' }}
                                    />
                                ) : (
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: editData.notes ? 'var(--text-main, #1e293b)' : 'var(--text-muted, #94a3b8)', lineHeight: '1.6', fontStyle: editData.notes ? 'normal' : 'italic' }}>
                                        {editData.notes || 'Nenhuma observação registrada.'}
                                    </p>
                                )}
                            </div>

                            {/* Validade (edit mode) */}
                            {isEditing && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                                        Nova Data de Validade
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.validUntil}
                                        onChange={e => setEditData(prev => ({ ...prev, validUntil: e.target.value }))}
                                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', backgroundColor: 'white', fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'inherit' }}
                                    />
                                </div>
                            )}

                            {/* Link público */}
                            {budget.publicToken && (
                                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                                🔗 Link Público da Proposta
                                            </div>
                                            <div style={{ fontSize: '0.82rem', color: '#16a34a', wordBreak: 'break-all' }}>
                                                {getPublicAppBaseUrl()}/#/proposal/{budget.id}
                                            </div>
                                            {budget.sharedAt && (
                                                <div style={{ fontSize: '0.72rem', color: '#86efac', marginTop: '4px' }}>
                                                    Enviado em {new Date(budget.sharedAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleCopyLink}
                                            style={{ backgroundColor: copied ? '#22c55e' : '#15803d', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', flexShrink: 0 }}
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            {copied ? 'Copiado!' : 'Copiar Link'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Financeiro consolidado dos pedidos */}
                            {relatedOrders.length > 0 && (
                                <div style={{ backgroundColor: 'var(--background, #f8fafc)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={16} color="var(--primary, #7c3aed)" />
                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #1e293b)' }}>Resumo Financeiro dos Pedidos</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'var(--border, #e2e8f0)' }}>
                                        {[
                                            { label: 'Total em Pedidos', value: `R$ ${totalOrders.toFixed(2).replace('.', ',')}`, color: '#334155' },
                                            { label: 'Total Recebido', value: `R$ ${totalPaid.toFixed(2).replace('.', ',')}`, color: '#22c55e' },
                                            { label: 'Saldo Pendente', value: `R$ ${totalBalance.toFixed(2).replace('.', ',')}`, color: totalBalance > 0 ? '#f59e0b' : '#22c55e' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ backgroundColor: 'var(--surface, white)', padding: '14px 16px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: ITEMS */}
                    {activeTab === 'items' && (
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                {(isEditing ? editData.items : budget.items || []).map((item, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr 80px 100px auto' : '1fr auto auto', gap: '10px', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--background, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main, #1e293b)' }}>{item.productName}</div>
                                            {!isEditing && (
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                                                    {item.quantity}x × R$ {Number(item.price || 0).toFixed(2).replace('.', ',')}
                                                </div>
                                            )}
                                        </div>
                                        {isEditing ? (
                                            <>
                                                <input type="number" min="1" value={item.quantity} onChange={e => updateItemQty(idx, e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '0.85rem', textAlign: 'center' }} />
                                                <input type="number" step="0.01" value={item.price} onChange={e => updateItemPrice(idx, e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '0.85rem' }} />
                                                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>x{item.quantity}</div>
                                                <div style={{ fontWeight: 700, color: 'var(--primary, #7c3aed)', textAlign: 'right', fontSize: '0.95rem' }}>R$ {Number(item.total || 0).toFixed(2).replace('.', ',')}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', backgroundColor: 'var(--primary, #7c3aed)', borderRadius: '12px', color: 'white' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '2px' }}>Total do Orçamento</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                                        R$ {(isEditing ? editTotal : Number(budget.total || 0)).toFixed(2).replace('.', ',')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ORDERS */}
                    {activeTab === 'orders' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {relatedOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted, #94a3b8)' }}>
                                    <Package size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                    <p style={{ margin: 0, fontWeight: 600 }}>Nenhum pedido gerado a partir deste orçamento.</p>
                                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Aprove o orçamento para gerar um pedido.</p>
                                </div>
                            ) : relatedOrders.map(order => {
                                const orderStatusCfg = ORDER_STATUS_CONFIG[order.status] || { bg: '#f1f5f9', color: '#64748b' };
                                const orderPaid = parseFloat(order.amountPaid) || 0;
                                const orderTotal = parseFloat(order.total) || 0;
                                const orderBalance = Math.max(0, orderTotal - orderPaid);
                                const paidPct = orderTotal > 0 ? Math.min(100, (orderPaid / orderTotal) * 100) : 0;
                                const isExpanded = expandedOrder === order.id;

                                return (
                                    <div key={order.id} style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: '14px', overflow: 'hidden', backgroundColor: 'var(--surface, white)' }}>
                                        {/* Order Header */}
                                        <div
                                            style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background, #f8fafc)' }}
                                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                        >
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main, #1e293b)', fontSize: '0.95rem' }}>
                                                        Pedido #{String(order.id).substring(0, 8)}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                                                        <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{order.date ? new Date(order.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                                                        <span>R$ {orderTotal.toFixed(2).replace('.', ',')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <span style={{ backgroundColor: orderStatusCfg.bg, color: orderStatusCfg.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {order.status || 'Novo'}
                                                </span>
                                                {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                                            </div>
                                        </div>

                                        {/* Order Detail Expanded */}
                                        {isExpanded && (
                                            <div style={{ padding: '16px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                                                {/* Financeiro */}
                                                <div style={{ marginBottom: '16px' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <DollarSign size={12} /> Status Financeiro
                                                    </div>
                                                    <div style={{ backgroundColor: 'var(--background, #f8fafc)', borderRadius: '10px', padding: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                                            <span>Pago: <strong style={{ color: '#22c55e' }}>R$ {orderPaid.toFixed(2).replace('.', ',')}</strong></span>
                                                            <span>Total: <strong>R$ {orderTotal.toFixed(2).replace('.', ',')}</strong></span>
                                                            {orderBalance > 0 && <span>Saldo: <strong style={{ color: '#f59e0b' }}>R$ {orderBalance.toFixed(2).replace('.', ',')}</strong></span>}
                                                        </div>
                                                        <div style={{ backgroundColor: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${paidPct}%`, backgroundColor: paidPct >= 100 ? '#22c55e' : '#f59e0b', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '4px', textAlign: 'right' }}>{paidPct.toFixed(0)}% recebido</div>
                                                    </div>
                                                </div>

                                                {/* Produção */}
                                                <div style={{ marginBottom: '12px' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Layers size={12} /> Produção
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {[
                                                            { label: 'Etapa', value: order.productionStep || 'Na Fila', icon: '⚙️' },
                                                            { label: 'Prazo', value: order.deadline ? new Date(order.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definido', icon: '📅' },
                                                            { label: 'Pgto', value: order.paymentMethod || '—', icon: '💳' },
                                                        ].map((info, i) => (
                                                            <div key={i} style={{ flex: '1', minWidth: '120px', padding: '10px 12px', backgroundColor: 'var(--background, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)' }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', marginBottom: '2px' }}>{info.icon} {info.label}</div>
                                                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{info.value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Itens do pedido */}
                                                {order.cartItems && order.cartItems.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                                            📦 Itens do Pedido
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {order.cartItems.map((ci, ci_idx) => (
                                                                <div key={ci_idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--background, #f8fafc)', borderRadius: '6px', fontSize: '0.82rem' }}>
                                                                    <span style={{ color: 'var(--text-main, #1e293b)' }}>{ci.quantity}x {ci.name}</span>
                                                                    <span style={{ color: 'var(--primary, #7c3aed)', fontWeight: 600 }}>R$ {Number(ci.total || 0).toFixed(2).replace('.', ',')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Link de rastreio */}
                                                <a
                                                    href={`${window.location.href.split('#')[0]}#/status/${order.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--primary, #7c3aed)', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
                                                >
                                                    <ExternalLink size={13} /> Ver página de rastreio do cliente
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', gap: '8px', justifyContent: 'space-between', backgroundColor: 'var(--surface, #fff)', flexWrap: 'wrap' }}>
                    {/* Ações destrutivas / secundárias */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => { if (onDelete) onDelete(budget); }}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: 'white', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Trash2 size={14} /> Excluir
                        </button>
                        <button
                            onClick={() => onSendWhatsapp && onSendWhatsapp(budget)}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Send size={14} /> WhatsApp
                        </button>
                    </div>

                    {/* Ações principais */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {budget.status !== 'Aprovado' && budget.status !== 'Rejeitado' && (
                            <>
                                <button
                                    onClick={() => onReject && onReject(budget)}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: 'white', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <XCircle size={14} /> Rejeitar
                                </button>
                                <button
                                    onClick={() => onApprove && onApprove(budget)}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#22c55e', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <CheckCircle size={14} /> Aprovar
                                </button>
                            </>
                        )}
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary, #7c3aed)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Edit3 size={14} /> Editar
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => { setIsEditing(false); setEditData({ customerName: budget.customerName, validUntil: budget.validUntil, notes: budget.notes || '', items: budget.items ? [...budget.items] : [] }); }}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', backgroundColor: 'white', color: 'var(--text-muted, #64748b)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary, #7c3aed)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: isSaving ? 0.7 : 1 }}
                                >
                                    <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
