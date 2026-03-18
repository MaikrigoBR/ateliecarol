import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Check, Trash2, Plus, DollarSign } from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import AuditService from '../services/AuditService';

export function LinkedTransactionsModal({ isOpen, onClose, entityId, entityType, entityName }) {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [editingTrans, setEditingTrans] = useState(null);
    const [loading, setLoading] = useState(true);

    const [newTrans, setNewTrans] = useState({
        isAdding: false,
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        accountId: '',
        paymentMethod: 'pix'
    });

    useEffect(() => {
        if (isOpen && entityId) {
            loadData();
        } else {
            setTransactions([]);
        }
    }, [isOpen, entityId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const allAccounts = await db.getAll('accounts');
            setAccounts(allAccounts || []);

            const allTrans = await db.getAll('transactions');
            if (allTrans) {
                // Filtra as transações relacionadas à entidade
                const linked = allTrans.filter(t => t.referenceId === entityId);
                // Ordena por data
                linked.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(linked);
            }
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async (id, updatedFields) => {
        try {
            // Checa a diferença de valor p/ saldo
            const original = transactions.find(t => t.id === id);
            await db.update('transactions', id, updatedFields);
            
            // Re-calcular saldo se mudou valor/conta ou status (MUITO complexo em edições rápidas sem reverter o original)
            // Aqui simplificamos: o Financeiro refaz o saldo no banco de dados completo. (Ideal é não mexer nos saldos na tela rápida se já estiver pago, ou mexer restrito).
            AuditService.log(currentUser, 'UPDATE', 'Transactions', id, `Editou transação via modal rápido vinculado`);
            setEditingTrans(null);
            loadData();
        } catch(error) {
            alert('Erro ao salvar transação');
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm('Excluir este lançamento financeiro?')) {
            await db.delete('transactions', id);
            AuditService.log(currentUser, 'DELETE', 'Transactions', id, `Excluiu transação vinculada`);
            loadData();
        }
    };

    const handleAddNew = async () => {
        if(!newTrans.description || !newTrans.amount || !newTrans.accountId) return;
        
        const category = entityType === 'Equipment' ? 'Investimento / Equipamentos' 
                       : entityType === 'Maintenance' ? 'Manutenção de Equipamentos' 
                       : 'Materiais & Insumos';
                       
        const payload = {
            description: newTrans.description,
            amount: parseFloat(newTrans.amount),
            type: 'expense', // Assume despesa por padrão nestes vínculos
            category: category,
            date: newTrans.date,
            status: newTrans.status,
            paymentMethod: newTrans.paymentMethod,
            accountId: newTrans.accountId,
            referenceId: entityId,
            referenceType: entityType,
            installments: 1,
            isRecurring: false,
            createdAt: new Date().toISOString()
        };

        const created = await db.create('transactions', payload);
        AuditService.log(currentUser, 'CREATE', 'Transactions', created.id, `Criou despesa vinculada manualmente: ${payload.description}`);
        
        // Update account balance se for pago já
        if (payload.status === 'paid' && payload.paymentMethod !== 'credit') {
            const acc = accounts.find(a => a.id === payload.accountId);
            if(acc) {
                await db.update('accounts', acc.id, { balance: parseFloat(acc.balance) - payload.amount });
            }
        }

        setNewTrans({
            isAdding: false,
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            accountId: '',
            paymentMethod: 'pix'
        });
        loadData();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', padding: '0', backgroundColor: 'var(--background)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', border: '1px solid var(--border)' }}>
                
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign className="text-green-600" size={24} />
                            Financeiro Vinculado
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{entityName}</p>
                    </div>
                    <button className="btn btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--background)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Lançamentos Associados</h3>
                        <button className="btn btn-primary" onClick={() => setNewTrans({...newTrans, isAdding: !newTrans.isAdding, description: `Ref: ${entityName}`})} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            <Plus size={14} /> Novo Lançamento
                        </button>
                    </div>

                    {newTrans.isAdding && (
                        <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>Adicionar Despesa Referente a {entityName}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="form-group mb-0 col-span-2">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Descrição</label>
                                    <input type="text" className="form-input text-sm" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                                </div>
                                <div className="form-group mb-0">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Valor (R$)</label>
                                    <input type="number" step="0.01" className="form-input text-sm" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                                </div>
                                <div className="form-group mb-0">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Data (Venc./Pag.)</label>
                                    <input type="date" className="form-input text-sm" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} />
                                </div>
                                <div className="form-group mb-0 md:col-span-2">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Conta/Caixa</label>
                                    <select className="form-input text-sm" value={newTrans.accountId} onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Situação</label>
                                    <select className="form-input text-sm" value={newTrans.status} onChange={e => setNewTrans({...newTrans, status: e.target.value})}>
                                        <option value="pending">A Pagar</option>
                                        <option value="paid">Já Pago</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Meio</label>
                                    <select className="form-input text-sm" value={newTrans.paymentMethod} onChange={e => setNewTrans({...newTrans, paymentMethod: e.target.value})}>
                                        <option value="pix">PIX</option>
                                        <option value="credit">Cartão Crédito</option>
                                        <option value="debit">Cartão Débito</option>
                                        <option value="boleto">Boleto</option>
                                        <option value="cash">Dinheiro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-2">
                                <button className="btn btn-secondary text-sm px-3 py-1" onClick={() => setNewTrans({...newTrans, isAdding: false})}>Cancelar</button>
                                <button className="btn btn-primary text-sm px-3 py-1" onClick={handleAddNew} disabled={!newTrans.description || !newTrans.amount || !newTrans.accountId}>Salvar Lançamento</button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Carregando financeiro vinculado...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12" style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <DollarSign className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }} size={32} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum lançamento financeiro atrelado encontrado.</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>Lançamentos gerados a partir de agora aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <table className="table">
                                <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                                    <tr>
                                        <th style={{ width: '100px', padding: '12px' }}>Data</th>
                                        <th style={{ padding: '12px' }}>Descrição</th>
                                        <th style={{ width: '120px', padding: '12px' }}>Conta</th>
                                        <th style={{ width: '100px', padding: '12px' }}>Situação</th>
                                        <th style={{ width: '120px', textAlign: 'right', padding: '12px' }}>Valor</th>
                                        <th style={{ width: '80px', textAlign: 'center', padding: '12px' }}>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {editingTrans?.id === t.id ? (
                                                <>
                                                    <td style={{ padding: '8px' }}><input type="date" className="form-input text-xs p-1 h-7" value={editingTrans.date} onChange={e => setEditingTrans({...editingTrans, date: e.target.value})} /></td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input type="text" className="form-input text-xs p-1 h-7 w-full" value={editingTrans.description} onChange={e => setEditingTrans({...editingTrans, description: e.target.value})} />
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <select className="form-input text-xs p-1 h-7 w-full" value={editingTrans.accountId} onChange={e => setEditingTrans({...editingTrans, accountId: e.target.value})}>
                                                            <option value="">Conta...</option>
                                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <select className="form-input text-xs p-1 h-7 w-full" value={editingTrans.status} onChange={e => setEditingTrans({...editingTrans, status: e.target.value})}>
                                                            <option value="pending">A Pagar</option>
                                                            <option value="paid">Pago</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px' }}><input type="number" step="0.01" className="form-input text-xs p-1 h-7 w-full text-right" value={editingTrans.amount} onChange={e => setEditingTrans({...editingTrans, amount: e.target.value})} /></td>
                                                    <td className="text-center" style={{ padding: '8px' }}>
                                                        <div className="flex gap-1 justify-center">
                                                            <button title="Salvar" onClick={() => handleSaveEdit(t.id, editingTrans)} style={{ color: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: '6px', borderRadius: '4px' }}><Check size={14} /></button>
                                                            <button title="Cancelar" onClick={() => setEditingTrans(null)} style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-hover)', padding: '6px', borderRadius: '4px' }}><X size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '12px' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', padding: '12px' }}>{t.description}</td>
                                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '12px' }}>{accounts.find(a => a.id === t.accountId)?.name || 'N/A'}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700, backgroundColor: t.status === 'paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: t.status === 'paid' ? '#15803d' : '#b91c1c' }}>
                                                            {t.status === 'paid' ? 'PAGO' : 'A PAGAR'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', textAlign: 'right', padding: '12px' }}>R$ {parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                    <td className="text-center" style={{ padding: '12px' }}>
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={() => setEditingTrans(t)} style={{ color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '4px', border: 'none', cursor: 'pointer' }} title="Editar"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(t.id)} style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px', border: 'none', cursor: 'pointer' }} title="Excluir"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
