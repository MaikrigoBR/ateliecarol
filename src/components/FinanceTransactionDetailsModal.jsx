import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Calendar, DollarSign, Store, Hammer, FileText, Tag, Link2, Save, Trash2, User, Landmark, HelpCircle, Briefcase, ChevronDown, ShieldCheck } from 'lucide-react';
import db from '../services/database';
import { useNavigate } from 'react-router-dom';

export function FinanceTransactionDetailsModal({ transaction, isOpen, onClose, onUpdate, accounts, expenseCategories, incomeCategories }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({});
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [originData, setOriginData] = useState(null);

    useEffect(() => {
        if (transaction && isOpen) {
            setFormData({
                ...transaction,
                partnerId: transaction.partnerId || '',
                orderId: transaction.orderId || '',
                reconciled: !!transaction.reconciled,
                entityType: transaction.entityType || 'other'
            });
            fetchData();
        }
    }, [transaction, isOpen]);

    const fetchData = async () => {
        try {
            const [ordersData, customersData] = await Promise.all([
                db.getAll('orders'),
                db.getAll('customers')
            ]);
            setOrders(ordersData || []);
            setCustomers(customersData || []);
            
            if (transaction) fetchOrigin(transaction);
        } catch (e) {
            console.error("Erro ao carregar dados auxiliares", e);
        }
    };

    const fetchOrigin = async (t) => {
        if (!t) return;
        setOriginData(null);
        try {
            if (t.orderId) {
                const order = await db.getById('orders', t.orderId);
                if (order) setOriginData({ type: 'Order', data: order, path: '/orders', title: `Pedido #${String(order.id).substring(0,6)}` });
            } else if (t.referenceType === 'Inventory' && t.referenceId) {
                const item = await db.getById('inventory', t.referenceId);
                if (item) setOriginData({ type: 'Inventory', data: item, path: '/inventory', title: `Estoque: ${item.name}` });
            }
        } catch (e) { console.warn(e); }
    };

    const handleSave = async () => {
        if (!formData.description || formData.amount === undefined || !formData.accountId) {
             alert("Preencha Descrição, Valor e Conta."); 
             return;
        }
        
        setIsSaving(true);
        try {
            const updatePayload = {
                ...formData,
                amount: Number(formData.amount),
                updatedAt: new Date().toISOString()
            };

            // Se for parte de grupo parcelado
            if (transaction.parentId && Number(formData.amount) !== Number(transaction.amount)) {
                if (window.confirm("Deseja aplicar esta alteração de valor/parceiro a todas as parcelas futuras deste grupo?")) {
                    const allTrans = await db.getAll('transactions');
                    const group = allTrans.filter(t => t.parentId === transaction.parentId && t.date >= transaction.date);
                    for (const t of group) {
                        await db.update('transactions', t.id, { ...t, ...updatePayload, id: t.id, date: t.date });
                    }
                    finalize();
                    return;
                }
            }

            await db.update('transactions', transaction.id, updatePayload);
            finalize();
        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const finalize = () => {
        onUpdate();
        onClose();
    };

    if (!isOpen || !transaction) return null;

    const isExpense = formData.type === 'expense';
    const catList = isExpense ? expenseCategories : incomeCategories;

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '750px', width: '100%', padding: 0, overflow: 'hidden', borderRadius: '24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2xl)' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Integrado */}
                <div style={{ background: isExpense ? 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' : 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)', padding: '24px 32px', color: 'white', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Terminal de Auditoria AioX
                                </span>
                                <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 900 }}>
                                    ID: {String(transaction.id).substring(0,8)}
                                </span>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                                {isExpense ? 'Despesa Consolidada' : 'Receita Recebida'}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                                onClick={() => setFormData({...formData, reconciled: !formData.reconciled})} 
                                style={{ 
                                    background: formData.reconciled ? '#fff' : 'rgba(255,255,255,0.1)', 
                                    border: 'none', 
                                    borderRadius: '14px', 
                                    padding: '8px 16px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: 'pointer', 
                                    color: formData.reconciled ? (isExpense ? '#ef4444' : '#10b981') : 'white',
                                    fontWeight: 900,
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <ShieldCheck size={18} fill={formData.reconciled ? "currentColor" : "none"} />
                                {formData.reconciled ? 'Auditado' : 'Conciliar'}
                            </button>
                            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '32px', backgroundColor: 'var(--surface)', maxHeight: '75vh', overflowY: 'auto' }}>
                    
                    {/* Linha 1: Descrição e Valor */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Descrição Profissional</label>
                            <input type="text" disabled={formData.reconciled} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid var(--border)', background: formData.reconciled ? 'var(--bg-main)' : 'var(--bg-main)', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 800, outline: 'none', opacity: formData.reconciled ? 0.6 : 1 }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Valor (BRL)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>R$</span>
                                <input type="number" step="0.01" disabled={formData.reconciled} style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '16px', border: '2px solid var(--border)', background: 'var(--bg-main)', color: isExpense ? '#ef4444' : '#10b981', fontSize: '1.25rem', fontWeight: 900, outline: 'none', opacity: formData.reconciled ? 0.6 : 1 }} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Linha 2: Data, Conta e Categoria */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}><Calendar size={12}/> Data de Competência</label>
                            <input type="date" disabled={formData.reconciled} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600, opacity: formData.reconciled ? 0.6 : 1 }} value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}><Landmark size={12}/> Conta de Fluxo</label>
                            <select disabled={formData.reconciled} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600, opacity: formData.reconciled ? 0.6 : 1 }} value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}><Tag size={12}/> Classificação DRE</label>
                            <select disabled={formData.reconciled} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600, opacity: formData.reconciled ? 0.6 : 1 }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                <option value="">Sem Classificação</option>
                                {isExpense ? (
                                    <>
                                        <optgroup label="📌 CUSTOS VARIÁVEIS">
                                            {catList.filter(c => c.type === 'variable').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </optgroup>
                                        <optgroup label="🏢 DESPESAS FIXAS">
                                            {catList.filter(c => c.type === 'fixed' || !c.type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </optgroup>
                                        <optgroup label="💸 IMPOSTOS E TAXAS">
                                            {catList.filter(c => c.type === 'tax').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </optgroup>
                                        <optgroup label="🚀 INVESTIMENTOS">
                                            {catList.filter(c => c.type === 'investment').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </optgroup>
                                    </>
                                ) : (
                                    <optgroup label="📈 RECEITAS">
                                        {catList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Seção de Vínculos Integrados (Robustez) */}
                    <div style={{ padding: '24px', backgroundColor: 'var(--surface-hover)', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Link2 size={16} color="var(--primary)" /> Vínculos e Rastreabilidade do Sistema
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Favorecido / Parceiro */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Favorecido / Destino</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <select style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontWeight: 600 }} value={formData.partnerId} onChange={e => setFormData({...formData, partnerId: e.target.value})}>
                                        <option value="">Lançamento Avulso (Sem Parceiro)</option>
                                        <optgroup label="Clientes Ativos">
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            {/* Vínculo com Pedido */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Vincular a Pedido / Order</label>
                                <div style={{ position: 'relative' }}>
                                    <Store size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <select style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontWeight: 600 }} value={formData.orderId} onChange={e => setFormData({...formData, orderId: e.target.value})}>
                                        <option value="">Sem Vínculo com Pedido</option>
                                        <optgroup label="Pedidos Recentes">
                                            {orders.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 50).map(o => (
                                                <option key={o.id} value={o.id}>Pedido #{String(o.id).substring(0,8)} - (R$ {o.total?.toFixed(2)})</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {originData && (
                            <div style={{ backgroundColor: 'var(--primary-light, #eef2ff)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                                    <HelpCircle size={20} />
                                    <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Origem Detectada: {originData.title}</span>
                                </div>
                                <button onClick={() => { onClose(); navigate(originData.path); }} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    Abrir Módulo Raiz
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '32px' }}>
                         <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Status Operacional</label>
                         <div style={{ display: 'flex', gap: '12px' }}>
                             <button type="button" onClick={() => setFormData({...formData, status: 'paid'})} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid', borderColor: formData.status === 'paid' ? '#10b981' : 'var(--border)', backgroundColor: formData.status === 'paid' ? '#10b9811A' : 'var(--bg-main)', color: formData.status === 'paid' ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800, cursor: 'pointer' }}>
                                 <CheckCircle size={18} /> {isExpense ? 'Liquidado' : 'Recebido'}
                             </button>
                             <button type="button" onClick={() => setFormData({...formData, status: 'pending'})} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid', borderColor: formData.status === 'pending' ? '#f59e0b' : 'var(--border)', backgroundColor: formData.status === 'pending' ? '#f59e0b1A' : 'var(--bg-main)', color: formData.status === 'pending' ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800, cursor: 'pointer' }}>
                                 <Clock size={18} /> {isExpense ? 'Pendente' : 'Agendado'}
                             </button>
                         </div>
                    </div>
                </div>

                <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        disabled={formData.reconciled}
                        onClick={async () => { if(window.confirm('Excluir permanentemente?')) { await db.delete('transactions', transaction.id); finalize(); } }} 
                        style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 800, cursor: formData.reconciled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: formData.reconciled ? 0.4 : 1 }}
                    >
                        <Trash2 size={18} /> {formData.reconciled ? 'Bloqueado (Auditado)' : 'Excluir Lançamento'}
                    </button>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontWeight: 800, cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)' }}>
                            <Save size={20} /> {isSaving ? 'Gravando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
