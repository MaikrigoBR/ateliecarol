import React, { useMemo } from 'react';
import { 
    Sparkles, AlertTriangle, TrendingUp, TrendingDown, Info, ShieldAlert, 
    ArrowRight, Hammer, ChevronDown, ChevronRight, Calculator, PieChart, Briefcase 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FinanceAIInsights({ transactions, accounts, openEditTrans }) {
    const navigate = useNavigate();
    
    const insights = useMemo(() => {
        const issues = [];
        const suggestions = [];

        // 1. Account negative balance
        accounts.forEach(acc => {
            if (acc.type !== 'credit' && Number(acc.balance) < 0) {
                issues.push({
                    type: 'danger',
                    text: `A conta "${acc.name}" está com saldo negativo (R$ ${Number(acc.balance).toLocaleString('pt-BR')}). Cheque o Cheque-especial.`
                });
            }
        });

        // 2. High spending alert
        const allExpenses = transactions.filter(t => t.type === 'expense');
        const avgExpense = allExpenses.length > 0 ? allExpenses.reduce((s, t) => s + Number(t.amount), 0) / allExpenses.length : 0;
        const recentExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const totalRecent = recentExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        
        if (totalRecent > (avgExpense * 5) && avgExpense > 0) {
             suggestions.push({
                 type: 'warning',
                 text: `Os gastos da última semana (R$ ${totalRecent.toLocaleString('pt-BR')}) estão muito acima da média.`
             });
        }

        // 3. Anomalous transactions
        const anomalies = allExpenses.filter(t => Number(t.amount) > (avgExpense * 10) && avgExpense > 50).slice(0, 2);
        anomalies.forEach(t => {
            issues.push({
                type: 'danger',
                text: `Lançamento discrepante: "${t.description}" (R$ ${Number(t.amount).toLocaleString('pt-BR')}).`,
                actionText: 'Editar',
                action: () => openEditTrans ? openEditTrans(t) : null
            });
        });

        return { issues, suggestions };
    }, [transactions, accounts, openEditTrans]);

    if (insights.issues.length === 0 && insights.suggestions.length === 0) {
        return (
            <div style={{ padding: '24px', background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #bbf7d0', marginBottom: '32px' }}>
               <Sparkles size={28} color="#16a34a" strokeWidth={2.5} />
               <span style={{ color: '#166534', fontWeight: 800, fontSize: '1rem' }}>Auditoria Copiloto IA: Tudo Perfeito! Nenhuma incongruência detectada.</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            <div className="flex items-center gap-3 px-2">
                <Sparkles size={20} color="#8b5cf6" strokeWidth={2.5} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#6d28d9', letterSpacing: '0.1em', margin: 0 }}>Copiloto de Auditoria</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.issues.map((i, idx) => (
                    <div key={'i'+idx} style={{ padding: '20px', background: '#fef2f2', borderRadius: '20px', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <ShieldAlert size={24} color="#ef4444" strokeWidth={2.5} />
                            <span style={{ color: '#7f1d1d', fontWeight: 700, fontSize: '0.95rem' }}>{i.text}</span>
                        </div>
                        {i.action && (
                            <button onClick={i.action} style={{ background: '#f87171', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                                {i.actionText}
                            </button>
                        )}
                    </div>
                ))}
                {insights.suggestions.map((s, idx) => (
                    <div key={'s'+idx} style={{ padding: '20px', background: '#fffbeb', borderRadius: '20px', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Info size={24} color="#d97706" strokeWidth={2.5} />
                        <span style={{ color: '#92400e', fontWeight: 700, fontSize: '0.95rem' }}>{s.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SimpleDRETable({ stats }) {
    const [expanded, setExpanded] = React.useState({
        receita: false,
        cmv: false,
        fixas: false,
    });

    const toggle = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

    const netIncome = Math.max(0, stats.monthIncome || 0);
    const expMap = stats.expenseMap || {};
    
    // CMV
    const materiais = expMap['Materiais & Insumos'] || 0;
    const frete = expMap['Logística & Frete'] || 0;
    const cmvTotal = materiais + frete;
    const margem = netIncome - cmvTotal;
    
    // Fixas
    const fixasKeys = Object.keys(expMap).filter(k => k !== 'Materiais & Insumos' && k !== 'Logística & Frete' && k !== 'Taxas Gateway (M.P.)');
    const fixasTotal = fixasKeys.reduce((acc, k) => acc + (expMap[k] || 0), 0);
    const depre = stats.monthlyDepreciation || 0;
    const netProfit = margem - fixasTotal - depre;

    const MainRow = ({ label, icon: Icon, value, color, section, currentExpanded, onToggle }) => {
        const isExpanded = currentExpanded[section];
        return (
            <tr 
                onClick={() => onToggle(section)}
                style={{ 
                    cursor: 'pointer', 
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                    transition: 'all 0.2s'
                }}
            >
                <td style={{ padding: '18px 24px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: `${color}15`, padding: '8px', borderRadius: '12px' }}>
                        <Icon size={18} color={color} strokeWidth={2.5} />
                    </div>
                    {label}
                </td>
                <td style={{ padding: '18px 24px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        );
    };

    const SubRow = ({ label, value, isLast }) => (
        <tr style={{ background: '#fcfcfc', borderBottom: isLast ? '1px solid #e2e8f0' : '1px dashed #f1f5f9' }}>
            <td style={{ padding: '12px 24px 12px 64px', color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>• {label}</td>
            <td style={{ padding: '12px 24px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    );

    return (
        <div style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '32px', 
            overflow: 'hidden', 
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.1)',
            border: '1px solid var(--border)',
            width: '100%'
        }}>
            <div style={{ 
                padding: '32px', 
                background: 'linear-gradient(135deg, #1e293b, #334155)', 
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>DRE Analítico Profissional</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Regime de Competência • Ateliê Carol</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visão Mensal
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>Item / Categoria</th>
                            <th style={{ textAlign: 'right', padding: '16px 24px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontWeight: 500 }}>
                        <MainRow label="Receita Operacional Líquida" icon={TrendingUp} value={netIncome} color="#10b981" section="receita" currentExpanded={expanded} onToggle={toggle} />
                        {expanded.receita && <SubRow label="Faturamento Consolidado" value={netIncome} isLast={true} />}

                        <MainRow label="Custos com Vendas (CMV)" icon={PieChart} value={cmvTotal} color="#f59e0b" section="cmv" currentExpanded={expanded} onToggle={toggle} />
                        {expanded.cmv && (
                            <>
                                <SubRow label="Insumos e Matérias-primas" value={materiais} isLast={false} />
                                <SubRow label="Fretes e Logística" value={frete} isLast={true} />
                            </>
                        )}

                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '24px', fontWeight: 900, color: '#334155' }}>MARGEM DE CONTRIBUIÇÃO OPERACIONAL</td>
                            <td style={{ padding: '24px', textAlign: 'right', fontWeight: 900, color: '#3b82f6' }}>R$ {margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>

                        <MainRow label="Despesas Fixas e Adm." icon={Briefcase} value={fixasTotal} color="#6366f1" section="fixas" currentExpanded={expanded} onToggle={toggle} />
                        {expanded.fixas && fixasKeys.map((k, idx) => (
                            <SubRow key={k} label={k} value={expMap[k]} isLast={idx === fixasKeys.length - 1} />
                        ))}

                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '20px 24px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: `#94a3b815`, padding: '8px', borderRadius: '12px' }}>
                                    <Hammer size={18} color="#94a3b8" strokeWidth={2.5} />
                                </div>
                                (-) Depreciação e Amortização (D&A)
                            </td>
                            <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>- R$ {depre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>

                        <tr style={{ background: netProfit >= 0 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}>
                            <td style={{ padding: '32px 24px', fontWeight: 900, color: '#ffffff', fontSize: '1.2rem', textTransform: 'uppercase', display: 'flex', flexDirection: 'column' }}>
                                RESULTADO LÍQUIDO DO PERÍODO
                                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, marginTop: '6px' }}>{netProfit >= 0 ? "EXCEDENTE / LUCRO" : "DÉFICIT / PREJUÍZO"}</span>
                            </td>
                            <td style={{ padding: '32px 24px', textAlign: 'right', fontWeight: 950, color: '#ffffff', fontSize: '1.8rem' }}>
                                R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
