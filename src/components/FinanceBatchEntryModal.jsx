import React, { useState } from 'react';
import { X, Plus, Save, Trash2, Calendar, DollarSign, ListOrdered, UploadCloud, ArrowRight, CheckCircle } from 'lucide-react';
import db from '../services/database';

export function FinanceBatchEntryModal({ isOpen, onClose, accounts, categories, onSaveSuccess }) {
    const [entries, setEntries] = useState([
        { id: Date.now(), description: '', amount: '', type: 'income', category: 'Aportes / Rendimentos', accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], status: 'paid' }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const sHeader = { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', flexShrink: 0 };
    const sTitle = { fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' };
    const sBody = { padding: '1.5rem', overflowY: 'auto', flex: 1 };
    const sSection = { marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface)' };
    const sFooter = { padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--surface-hover)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0 };

    const addRow = () => {
        setEntries([
            ...entries,
            { id: Date.now(), description: '', amount: '', type: 'expense', category: 'Outros', accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], status: 'paid' }
        ]);
        // scroll bottom automatically after a tiny delay
        setTimeout(() => {
            const tableContainer = document.getElementById('batch-table-container');
            if (tableContainer) tableContainer.scrollTop = tableContainer.scrollHeight;
        }, 50);
    };

    const removeRow = (id) => {
        if (entries.length === 1) return;
        setEntries(entries.filter(e => e.id !== id));
    };

    const updateRow = (id, field, value) => {
        setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleSaveBatch = async () => {
        // Validate
        const validEntries = entries.filter(e => e.description.trim() !== '' && Number(e.amount) > 0);
        if (validEntries.length === 0) {
            alert('Não há lançamentos válidos para salvar. Preencha descrição e valor (maior que zero).');
            return;
        }

        setIsSaving(true);
        try {
            const promises = validEntries.map(entry => {
                const payload = {
                    description: entry.description,
                    amount: Number(entry.amount),
                    type: entry.type,
                    category: entry.category,
                    accountId: entry.accountId,
                    date: entry.date,
                    status: entry.status,
                    createdAt: new Date().toISOString()
                };
                return db.create('transactions', payload);
            });

            await Promise.all(promises);
            onSaveSuccess(validEntries.length);
            onClose();
            // Reset for next time
            setEntries([{ id: Date.now(), description: '', amount: '', type: 'income', category: 'Aportes / Rendimentos', accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], status: 'paid' }]);
        } catch (error) {
            alert("Erro ao salvar lote: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }}>
            <div className="modal-content animate-scale-in" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                
                {/* Header */}
                <div style={sHeader}>
                    <h2 style={sTitle}>
                        <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <ListOrdered size={20} />
                        </div>
                        Injeção em Lote (Retroativa)
                    </h2>
                    <button className="btn btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>

                {/* Body */}
                <div id="batch-table-container" className="scrollbar-hide" style={sBody}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Adicione dezenas de gastos/entradas passadas de uma só vez para recompor sua base histórica contábil com rapidez.
                    </p>

                    <div style={{ ...sSection, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ color: '#3b82f6', marginTop: '2px' }}><UploadCloud size={20} /></div>
                        <div>
                            <h4 style={{ margin: 0, color: '#1d4ed8', fontSize: '0.9rem', fontWeight: 700 }}>Aviso sobre Aportes Financeiros / Sócios</h4>
                            <p style={{ margin: 0, marginTop: '4px', color: '#1e3a8a', fontSize: '0.85rem' }}>
                                Se o lançamento for dinheiro investido pelos sócios (Aporte de Capital), classifique como <strong>Entrada (+)</strong> e Categoria <strong>Aportes / Rendimentos</strong>. Dessa forma ele inflará o saldo bancário mas NÃO vai distorcer o seu resultado de <strong>Faturamento no D.R.E.</strong>!
                            </p>
                        </div>
                    </div>

                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--surface)' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--surface-hover)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '0.75rem', fontWeight: 800 }}>Tipo</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 800, width: '25%' }}>Descrição</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 800 }}>Valor (R$)</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 800, width: '20%' }}>Categoria</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 800 }}>Conta Ref.</th>
                                    <th style={{ padding: '0.75rem', fontWeight: 800 }}>Competência</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}><Trash2 size={14} /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((row, index) => (
                                    <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select 
                                                className="form-input" 
                                                style={{ padding: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: row.type === 'income' ? '#10b981' : '#ef4444', backgroundColor: row.type === 'income' ? '#ecfdf5' : '#fef2f2', border: '1px solid transparent' }}
                                                value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                                            >
                                                <option value="income">Entrada (+)</option>
                                                <option value="expense">Saída (-)</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input type="text" className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }} placeholder="Ex: Fornecedor Papel" value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input type="number" step="0.01" className="form-input" style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', fontWeight: 700 }} placeholder="0.00" value={row.amount} onChange={e => updateRow(row.id, 'amount', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }} value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)}>
                                                {categories.filter(c => c.type === row.type).map(cat => (
                                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                                ))}
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }} value={row.accountId} onChange={e => updateRow(row.id, 'accountId', e.target.value)}>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input type="date" className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }} value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <button onClick={() => removeRow(row.id)} className="btn btn-icon" style={{ color: 'var(--danger)', padding: '4px' }} title="Remover Linha">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                            <button onClick={addRow} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', backgroundColor: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Plus size={14} /> Adicionar Nova Linha
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={sFooter}>
                    <button className="btn" onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }} disabled={isSaving}>Fechar</button>
                    <button className="btn btn-primary" onClick={handleSaveBatch} disabled={isSaving} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--primary)' }}>
                        {isSaving ? (
                            'Injetando no Banco...' 
                        ) : (
                            <>
                                <CheckCircle size={16} />
                                Salvar {entries.filter(e => e.description && e.amount).length} Lançamentos Definitivamente
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
