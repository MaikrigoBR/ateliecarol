import React, { useState, useEffect } from 'react';
import { 
    X, DollarSign, Calendar, Filter, 
    ArrowRight, TrendingDown, TrendingUp,
    ShieldAlert, AlertCircle, Clock, Trash2,
    CalendarDays, BarChart2, CheckCircle, Activity,
    History, Search, Layers, RefreshCw
} from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import FinanceAuditService from '../services/FinanceAuditService.js';
import { formatCurrency } from '../utils/financeUtils.js';

export function LinkedTransactionsModal({ isOpen, item, targetTable, onClose, onUpdate }) {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        if (isOpen && item?.id) {
            fetchTransactions();
        }
    }, [isOpen, item?.id, targetTable]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const allTransactions = await db.getAll('transactions');
            const linked = allTransactions.filter(t => 
                String(t.originId) === String(item.id) && 
                String(t.originTable) === String(targetTable)
            );
            setTransactions(linked.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente deletar este lançamento financeiro? Esta ação pode impactar os relatórios de auditoria.')) return;
        try {
            await db.delete('transactions', id);
            AuditService.log('Operador', 'DELETE', 'transactions', id, `Removeu lançamento vinculado ao ativo: ${item.name}`);
            fetchTransactions();
            if (onUpdate) onUpdate();
        } catch (e) {
            alert('Erro ao deletar transação.');
        }
    };

    const handleToggleStatus = async (transaction) => {
        const newStatus = transaction.status === 'paid' ? 'pending' : 'paid';
        try {
            await db.update('transactions', transaction.id, { ...transaction, status: newStatus });
            fetchTransactions();
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen || !item) return null;

    const filteredTransactions = transactions.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterStatus === 'all' || t.status === filterStatus)
    );

    const totalSpent = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ borderRadius: '24px', overflow: 'hidden' }}>
                
                {/* Header */}
                <div className="modal-header" style={{ padding: '24px 32px' }}>
                    <div className="flex items-center gap-md">
                        <div style={{ padding: '12px', background: 'var(--primary)', color: 'white', borderRadius: '14px' }}>
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>Rastreabilidade Financeira</h2>
                            <p className="text-xs text-muted" style={{ margin: '4px 0 0 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Auditoria de Gastos: {item.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '32px' }}>
                    
                    {/* KPI Briefing */}
                    <div className="stats-grid" style={{ marginBottom: '32px' }}>
                        <div style={{ background: 'var(--background)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                            <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Total Comprometido</p>
                            <h3 className="text-2xl font-black text-slate-800">R$ {Math.abs(totalSpent).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                            <p className="text-[10px] text-muted font-bold mt-2">CAPEX E OPEX INTEGRADOS</p>
                        </div>
                        <div style={{ background: 'var(--background)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                            <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Volume de Lançamentos</p>
                            <h3 className="text-2xl font-black text-slate-800">{transactions.length} registros</h3>
                            <p className="text-[10px] text-muted font-bold mt-2">HISTÓRICO COMPLETO</p>
                        </div>
                    </div>

                    {/* Filter Tape */}
                    <div className="flex gap-md mb-md">
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Filtrar por descrição..." 
                                className="form-input" 
                                style={{ paddingLeft: '36px' }} 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="form-input" style={{ width: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">Todos os Status</option>
                            <option value="paid">✅ Liquidados</option>
                            <option value="pending">⏳ Pendentes</option>
                        </select>
                    </div>

                    {/* Transactions List */}
                    <div className="chart-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr style={{ background: 'var(--surface-hover)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Data/Histórico</th>
                                        <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Valor</th>
                                        <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>Gestão</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Mapeando fluxos...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum fluxo financeiro localizado.</td></tr>
                                    ) : filteredTransactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div className="font-bold text-slate-800">{new Date(t.date).toLocaleDateString('pt-BR')}</div>
                                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest">{t.description}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <button 
                                                    onClick={() => handleToggleStatus(t)}
                                                    className={`badge ${t.status === 'paid' ? 'badge-success' : 'badge-warning'} border-none cursor-pointer hover:opacity-80`}
                                                >
                                                    {t.status === 'paid' ? 'Liquidado' : 'Aguardando'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div className={`font-black text-sm ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    R$ {Math.abs(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleDelete(t.id)} className="btn-icon" style={{ color: 'var(--danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '24px 32px' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0 32px' }}>Sair da Auditoria</button>
                </div>
            </div>
        </div>
    );
}
