import React, { useState } from 'react';
import { 
    X, AlertTriangle, CheckCircle, Database, ArrowRight, 
    ShieldAlert, Zap, Truck, ShieldCheck, Activity, 
    BarChart3, AlertCircle, RefreshCw, Layers, Landmark
} from 'lucide-react';
import FinanceAuditService from '../services/FinanceAuditService.js';
import { formatCurrency } from '../utils/financeUtils.js';

export function AuditReportModal({ isOpen, report = [], accounts, onClose, onRefresh }) {
    const [isRepairing, setIsRepairing] = useState(false);

    if (!isOpen || !report) return null;

    const handleRepair = async () => {
        setIsRepairing(true);
        try {
            // Repair all balance discrepancies
            const balanceIssues = report.filter(r => r.type === 'balance_discrepancy');
            for (const issue of balanceIssues) {
                await FinanceAuditService.repairBalance(issue.accountId);
            }
            
            alert('Protocolo de Reparo concluído com sucesso. Os saldos das contas foram sincronizados com os lançamentos reais.');
            if (onRefresh) onRefresh();
            onClose();
        } catch (err) {
            alert('Falha no reparo: ' + err.message);
        } finally {
            setIsRepairing(false);
        }
    };

    const totalIssues = report.length;
    const discrepancies = report.filter(r => r.type === 'balance_discrepancy');
    const negativeBalances = report.filter(r => r.type === 'negative_balance');
    const duplicates = report.filter(r => r.type === 'duplicate_transaction');
    const orphaned = report.filter(r => r.type === 'orphaned_transaction');

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000, display: 'flex' }}>
            <div className="modal-content animate-scale-in" style={{ maxWidth: '700px', width: '95%', backgroundColor: 'var(--surface)', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex items-center gap-4">
                        <div style={{ padding: '12px', background: totalIssues > 0 ? '#ef4444' : '#10b981', color: 'white', borderRadius: '14px' }}>
                            {totalIssues > 0 ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Diagnóstico de Saúde Financeira</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {totalIssues > 0 ? `${totalIssues} inconsistências identificadas pelo Motor IA` : 'Transações 100% Auditadas e Sincronizadas'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-icon" style={{ color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }} className="scrollbar-hide">
                    
                    {/* KPI Briefing */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Divergências', count: discrepancies.length, color: '#ef4444' },
                            { label: 'Negativos', count: negativeBalances.length, color: '#f59e0b' },
                            { label: 'Duplicados', count: duplicates.length, color: '#ec4899' },
                            { label: 'Órfãos', count: orphaned.length, color: '#3b82f6' }
                        ].map((stat, i) => (
                            <div key={i} style={{ background: 'var(--background)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>{stat.label}</p>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: stat.count > 0 ? stat.color : 'var(--text-muted)' }}>{stat.count}</h3>
                            </div>
                        ))}
                    </div>

                    {totalIssues === 0 ? (
                        <div style={{ background: 'var(--surface-hover)', border: '1px dashed var(--border)', padding: '3rem', textAlign: 'center', borderRadius: '24px' }}>
                            <CheckCircle size={48} className="text-primary" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Integridade Total</h3>
                            <p className="text-sm text-muted mt-2">O recálculo de caixa bate 100% com os saldos registrados.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Balance Discrepancy */}
                            {discrepancies.length > 0 && (
                                <section>
                                    <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.1em' }}>Divergências de Saldo (Recálculo vs. Banco)</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {discrepancies.map((issue, idx) => (
                                            <div key={idx} style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '1rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>{issue.accountName}</p>
                                                    <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: '4px 0 0 0' }}>{issue.message}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '10px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>Diferença</p>
                                                    <p style={{ fontSize: '1rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>R$ {formatCurrency(issue.diff)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Negative Balance */}
                            {negativeBalances.length > 0 && (
                                <section>
                                    <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.1em' }}>Alertas de Liquidez Imediata</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {negativeBalances.map((issue, idx) => (
                                            <div key={idx} style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '14px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <AlertTriangle size={20} className="text-amber-500" />
                                                <div>
                                                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', margin: 0 }}>{issue.accountName}: Saldo Negativo</p>
                                                    <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '4px 0 0 0' }}>{issue.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Duplicates */}
                            {duplicates.length > 0 && (
                                <section>
                                    <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.1em' }}>Detecção de Lançamentos Suspeitos</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {duplicates.map((issue, idx) => (
                                            <div key={idx} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '14px' }}>
                                                <div className="flex justify-between">
                                                    <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{issue.transaction.description}</p>
                                                    <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ef4444' }}>R$ {formatCurrency(issue.transaction.amount)}</p>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{issue.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}>Fechar Auditoria</button>
                    {discrepancies.length > 0 && (
                        <button onClick={handleRepair} disabled={isRepairing} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isRepairing ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                            {isRepairing ? 'Reparando Base...' : 'Executar Protocolo de Reparo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
