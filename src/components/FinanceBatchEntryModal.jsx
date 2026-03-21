import React, { useState } from 'react';
import { X, Plus, Save, Trash2, Calendar, DollarSign, ListOrdered, UploadCloud } from 'lucide-react';
import db from '../services/database';

export function FinanceBatchEntryModal({ isOpen, onClose, accounts, categories, onSaveSuccess }) {
    const [entries, setEntries] = useState([
        { id: Date.now(), description: '', amount: '', type: 'income', category: 'Aportes / Rendimentos', accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], status: 'paid' }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const addRow = () => {
        setEntries([
            ...entries,
            { id: Date.now(), description: '', amount: '', type: 'expense', category: 'Outros', accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], status: 'paid' }
        ]);
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
            <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                <div className="modal-header border-b pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
                            <UploadCloud size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 m-0">Injeção em Lote (Lançamento Rápido Retroativo)</h2>
                            <p className="text-sm text-gray-500 m-0">Adicione até dezenas de gastos/entradas passadas de uma só vez para compor sua base.</p>
                        </div>
                    </div>
                    <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body scrollbar-hide" style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                    
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4 border border-blue-100">
                        ⚡ <strong>Dica Retrógrada:</strong> Se for um <strong>Aporte de Capital</strong> (dinheiro investido pela dona), classifique como <em>Entrada</em> e Categoria <em>Aportes / Rendimentos</em>. Assim ele não bagunça o seu Resultado de Vendas no DRE!
                    </div>

                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 border-b">
                                <th className="p-2 font-semibold">Tipo</th>
                                <th className="p-2 font-semibold w-1/4">Descrição</th>
                                <th className="p-2 font-semibold">Valor (R$)</th>
                                <th className="p-2 font-semibold w-1/5">Categoria</th>
                                <th className="p-2 font-semibold">Conta Ref.</th>
                                <th className="p-2 font-semibold">Data (Retroativa)</th>
                                <th className="p-2 font-semibold text-center"><Trash2 size={14} /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((row, index) => (
                                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50/50">
                                    <td className="p-2">
                                        <select 
                                            className="form-input text-xs font-bold" 
                                            style={{ color: row.type === 'income' ? '#10b981' : '#ef4444', backgroundColor: row.type === 'income' ? '#ecfdf5' : '#fef2f2' }}
                                            value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                                        >
                                            <option value="income">Entrada (+)</option>
                                            <option value="expense">Saída (-)</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="text" className="form-input text-xs w-full" placeholder="Ex: Aporte Initial, Fatura Antiga..." value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" step="0.01" className="form-input text-xs w-full font-bold" placeholder="0.00" value={row.amount} onChange={e => updateRow(row.id, 'amount', e.target.value)} />
                                    </td>
                                    <td className="p-2">
                                        <select className="form-input text-xs w-full" value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)}>
                                            {categories.filter(c => c.type === row.type).map(cat => (
                                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                                            ))}
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select className="form-input text-xs w-full" value={row.accountId} onChange={e => updateRow(row.id, 'accountId', e.target.value)}>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="date" className="form-input text-xs w-full" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                                    </td>
                                    <td className="p-2 text-center text-gray-400 hover:text-red-500 cursor-pointer transition-colors" onClick={() => removeRow(row.id)}>
                                        <Trash2 size={16} className="mx-auto" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 flex justify-center">
                        <button onClick={addRow} className="btn bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 border-dashed border-2 border-gray-300">
                            <Plus size={16} /> Adicionar Linha
                        </button>
                    </div>

                </div>

                <div className="mt-4 pt-4 border-t flex justify-end gap-3 bg-gray-50 flex-none rounded-b-xl px-4 pb-4">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSaveBatch} disabled={isSaving}>
                        {isSaving ? 'Injetando no Banco...' : `Salvar e Injetar ${entries.filter(e => e.description && e.amount).length} Lançamentos`}
                    </button>
                </div>
            </div>
        </div>
    );
}
