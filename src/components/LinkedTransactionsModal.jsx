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
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', padding: '0', backgroundColor: '#f8fafc', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign className="text-green-600" size={24} />
                            Financeiro Vinculado
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>{entityName}</p>
                    </div>
                    <button className="btn btn-icon text-muted" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Lançamentos Associados</h3>
                        <button className="btn btn-primary" onClick={() => setNewTrans({...newTrans, isAdding: !newTrans.isAdding, description: `Ref: ${entityName}`})} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            <Plus size={14} /> Novo Lançamento
                        </button>
                    </div>

                    {newTrans.isAdding && (
                        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>Adicionar Despesa Referente a {entityName}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="form-group mb-0 col-span-2">
                                    <label className="text-xs text-blue-900">Descrição</label>
                                    <input type="text" className="form-input text-sm" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-xs text-blue-900">Valor (R$)</label>
                                    <input type="number" step="0.01" className="form-input text-sm" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-xs text-blue-900">Data (Venc./Pag.)</label>
                                    <input type="date" className="form-input text-sm" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} />
                                </div>
                                <div className="form-group mb-0 md:col-span-2">
                                    <label className="text-xs text-blue-900">Conta/Caixa</label>
                                    <select className="form-input text-sm" value={newTrans.accountId} onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-xs text-blue-900">Situação</label>
                                    <select className="form-input text-sm" value={newTrans.status} onChange={e => setNewTrans({...newTrans, status: e.target.value})}>
                                        <option value="pending">A Pagar</option>
                                        <option value="paid">Já Pago</option>
                                    </select>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-xs text-blue-900">Meio</label>
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
                        <div className="text-center py-8 text-slate-500">Carregando financeiro vinculado...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                            <DollarSign className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-slate-500 text-sm">Nenhum lançamento financeiro atrelado encontrado.</p>
                            <p className="text-slate-400 text-xs mt-1">Lançamentos gerados a partir de agora aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="table">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th style={{ width: '100px' }}>Data</th>
                                        <th>Descrição</th>
                                        <th style={{ width: '120px' }}>Conta</th>
                                        <th style={{ width: '100px' }}>Situação</th>
                                        <th style={{ width: '120px', textAlign: 'right' }}>Valor</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id}>
                                            {editingTrans?.id === t.id ? (
                                                <>
                                                    <td><input type="date" className="form-input text-xs p-1 h-7" value={editingTrans.date} onChange={e => setEditingTrans({...editingTrans, date: e.target.value})} /></td>
                                                    <td>
                                                        <input type="text" className="form-input text-xs p-1 h-7 w-full" value={editingTrans.description} onChange={e => setEditingTrans({...editingTrans, description: e.target.value})} />
                                                    </td>
                                                    <td>
                                                        <select className="form-input text-xs p-1 h-7 w-full" value={editingTrans.accountId} onChange={e => setEditingTrans({...editingTrans, accountId: e.target.value})}>
                                                            <option value="">Conta...</option>
                                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select className="form-input text-xs p-1 h-7 w-full" value={editingTrans.status} onChange={e => setEditingTrans({...editingTrans, status: e.target.value})}>
                                                            <option value="pending">A Pagar</option>
                                                            <option value="paid">Pago</option>
                                                        </select>
                                                    </td>
                                                    <td><input type="number" step="0.01" className="form-input text-xs p-1 h-7 w-full text-right" value={editingTrans.amount} onChange={e => setEditingTrans({...editingTrans, amount: e.target.value})} /></td>
                                                    <td className="text-center">
                                                        <div className="flex gap-1 justify-center">
                                                            <button title="Salvar" onClick={() => handleSaveEdit(t.id, editingTrans)} className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded"><Check size={14} /></button>
                                                            <button title="Cancelar" onClick={() => setEditingTrans(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={14} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="text-xs text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                                    <td className="text-sm font-medium text-slate-800">{t.description}</td>
                                                    <td className="text-xs text-slate-600">{accounts.find(a => a.id === t.accountId)?.name || 'N/A'}</td>
                                                    <td>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {t.status === 'paid' ? 'PAGO' : 'A PAGAR'}
                                                        </span>
                                                    </td>
                                                    <td className="text-sm font-bold text-red-600 text-right">R$ {parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                    <td className="text-center">
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={() => setEditingTrans(t)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded transition-colors" title="Editar"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors" title="Excluir"><Trash2 size={14} /></button>
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
