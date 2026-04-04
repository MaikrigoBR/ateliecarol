import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Calendar, DollarSign, Store, Hammer, FileText, Tag, Link2, Download, AlertTriangle, ArrowRight, CornerDownRight, Save, Trash2, ShieldAlert } from 'lucide-react';
import db from '../services/database';
import { useNavigate } from 'react-router-dom';

export function FinanceTransactionDetailsModal({ transaction, isOpen, onClose, onUpdate, accounts, expenseCategories, incomeCategories }) {
    const navigate = useNavigate();
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [originData, setOriginData] = useState(null);

    useEffect(() => {
        if (transaction) {
            setFormData({...transaction});
            fetchOrigin(transaction);
        }
    }, [transaction]);

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
            } else if (t.referenceType === 'Equipment' && t.referenceId) {
                const equip = await db.getById('equipments', t.referenceId);
                if (equip) setOriginData({ type: 'Equipment', data: equip, path: '/equipments', title: `Máquina: ${equip.name}` });
            }
        } catch (e) {
            console.warn("Erro ao buscar origem", e);
        }
    };

    const handleSave = async () => {
        if (!formData.description || formData.amount === undefined || formData.amount === '' || !formData.accountId) {
             alert(`Por favor, preencha todos os campos.\nAssegure-se de que selecionou a "Conta / Fonte" na lista (ela é obrigatória).\n\nValores diagnosticados:\n- Descrição: ${formData.description ? 'OK' : 'Vazio'}\n- Valor: ${formData.amount !== undefined && formData.amount !== '' ? 'OK' : 'Vazio'}\n- Conta Selecionada: ${formData.accountId || 'Nenhuma (Por favor, clique e selecione)'}`); 
             return;
        }
        try {
            // Se for parte de um parcelamento/mensalidade agrupado
            if (transaction.parentId) {
                const choice = window.confirm(`Esta transação faz parte de um grupo recorrente/parcelado.\n\nClique OK para replicar o novo valor (R$ ${formData.amount}) para as parcelas futuras.\nClique CANCELAR para editar apenas esta parcela individual.`);
                
                if (choice) {
                    const allTrans = await db.getAll('transactions');
                    // Filtra apenas as parcelas deste grupo que vencem HOJE ou no FUTURO em relação a esta edição
                    const groupToUpdate = allTrans.filter(t => t.parentId === transaction.parentId && t.date >= transaction.date);
                    
                    const cleanBaseDesc = formData.description.replace(/\s?\(\d+[/]\d+\)$/, '').trim();
                    
                    for (const t of groupToUpdate) {
                        await db.update('transactions', t.id, {
                            ...t,
                            description: t.installmentNumber ? `${cleanBaseDesc} (${t.installmentNumber}/${t.installmentsTotal})` : formData.description,
                            amount: Number(formData.amount),
                            accountId: formData.accountId,
                            category: formData.category,
                            // Status só muda se for a parcela atual ou se o usuário estiver marcando como paga no futuro (raro)
                            status: t.id === transaction.id ? formData.status : t.status
                        });
                    }
                    onUpdate();
                    setEditMode(false);
                    onClose();
                    return;
                }
            }

            await db.update('transactions', transaction.id, {
                ...transaction,
                description: formData.description,
                amount: Number(formData.amount),
                accountId: formData.accountId,
                category: formData.category,
                date: formData.date,
                status: formData.status
            });
            onUpdate();
            setEditMode(false);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Erro ao editar o lançamento: " + e.message);
        }
    };

    const handleDelete = async () => {
        const warn = formData.orderId ? 
            "⚠️ ATENÇÃO: Este lançamento pertence a um pedido automático. Apagá-lo isoladamente aqui quebrará a trilha financeira do pedido (Partida Dobrada). Tem absoluta certeza?" : 
            "Excluir este lançamento permanentemente?";
            
        if (window.confirm(warn)) {
            try {
                await db.delete('transactions', formData.id);
                onUpdate();
                onClose();
            } catch (e) {
                alert("Erro ao excluir.");
            }
        }
    };

    if (!isOpen || !transaction) return null;

    const isExpense = formData.type === 'expense';
    const hasOriginInfo = formData.orderId || formData.referenceId;
    const catList = isExpense ? expenseCategories : incomeCategories;

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content animate-fade-in" style={{ maxWidth: '650px', width: '100%', padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Dinâmico */}
                <div style={{ position: 'relative', overflow: 'hidden', padding: '24px 32px', borderBottom: '1px solid #e2e8f0', background: isExpense ? 'linear-gradient(to right, #fef2f2, #fff1f2)' : 'linear-gradient(to right, #f0fdf4, #ecfdf5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: isExpense ? '#fee2e2' : '#d1fae5', color: isExpense ? '#991b1b' : '#065f46' }}>
                                    {isExpense ? 'Despesa' : 'Receita'}
                                </span>
                                {formData.status === 'paid' ? 
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}><CheckCircle size={14}/> Efetivado</span> : 
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}><Clock size={14}/> Pendente</span>
                                }
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
                                AioX: Auditoria de Lançamento
                            </h2>
                        </div>
                        <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: '50%' }} className="hover:bg-gray-200 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '24px 32px', backgroundColor: '#fff', maxHeight: '70vh', overflowY: 'auto' }}>
                    
                    {/* Origin Traceability Box */}
                    {hasOriginInfo && (
                        <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                <Link2 size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rastreabilidade de Origem</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    {formData.orderId ? <Store size={20} color="#8b5cf6" /> : (formData.referenceType === 'Equipment' ? <Hammer size={20} color="#f59e0b" /> : <FileText size={20} color="#f59e0b" />)}
                                    <span style={{ fontWeight: 600, color: '#334155' }}>
                                        {originData ? originData.title : (formData.orderId ? `Pedido Automático #${String(formData.orderId).substring(0,8)}` : `Origem Restrita ou Excluída`)}
                                    </span>
                                </div>
                                
                                {originData && (
                                    <button onClick={() => { onClose(); navigate(originData.path); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                        Inspecionar Origem <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                            
                            {formData.orderId && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.8rem' }}>
                                    <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>
                                        <strong>Transação Amarrada!</strong> Alterar montantes aqui mudará o caixa mas não o extrato do pedido em si. Para consistência plena, ajuste no Módulo Raiz ou libere edição local clicando no lápis abaixo (Modo Super-Admin).
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data Form */}
                    <div style={{ position: 'relative' }}>
                        {!editMode && (
                             <div style={{ position: 'absolute', top: '-12px', right: 0 }}>
                                 <button onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                     Liberar Edição Profunda
                                 </button>
                             </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: editMode ? '0' : '24px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Descrição da Transação</label>
                                {editMode ? (
                                    <input type="text" className="form-input" style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600, padding: '12px' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                ) : (
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid transparent' }}>{formData.description}</div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Valor Consolidado</label>
                                {editMode ? (
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>R$</div>
                                        <input type="number" step="0.01" className="form-input" style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, padding: '12px 12px 12px 40px', color: isExpense ? '#ef4444' : '#10b981' }} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isExpense ? '#ef4444' : '#10b981', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>R$ {Number(formData.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Competência Temporal</label>
                                {editMode ? (
                                    <input type="date" className="form-input" style={{ width: '100%', padding: '12px' }} value={formData.date?.split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} />
                                ) : (
                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={18} color="#94a3b8" /> {formData.date ? new Date(formData.date).toLocaleDateString('pt-BR') : '--'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Conta / Fonte</label>
                                {editMode ? (
                                    <select className="form-input" style={{ width: '100%', padding: '12px' }} value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                                        <option value="" disabled>-- Selecione a Conta Obrigatória --</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                        {formData.accountId ? (accounts.find(a => a.id === formData.accountId)?.name || 'Conta Remanescente/Excluída') : 'A Definir'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Centro de Custo (D.R.E.)</label>
                                {editMode ? (
                                    <select className="form-input" style={{ width: '100%', padding: '12px' }} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="">Nenhum/Outros</option>
                                        {catList?.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Tag size={16} color="#94a3b8" /> {formData.category || 'Nenhum / Outros'}
                                    </div>
                                )}
                            </div>
                            
                            {editMode && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Status</label>
                                    <select className="form-input" style={{ padding: '12px' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="paid">{isExpense ? 'Pago/Debitado' : 'Recebido/Disponível'}</option>
                                        <option value="pending">{isExpense ? 'Agendado/Pendente' : 'A Combinar/A Receber'}</option>
                                    </select>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Trash2 size={16} /> Estornar/Apagar
                    </button>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                            Fechar
                        </button>
                        {editMode && (
                            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
                                <Save size={18} /> Salvar Forçadamente
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
