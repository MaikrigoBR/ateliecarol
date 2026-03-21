import React, { useMemo } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Info, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FinanceAIInsights({ transactions, accounts, openEditTrans }) {
    const navigate = useNavigate();
    // Basic AI Agent logic
    const insights = useMemo(() => {
        const issues = [];
        const suggestions = [];

        // 1. Incongruence check: Account with negative balance?
        accounts.forEach(acc => {
            if (acc.type !== 'credit' && Number(acc.balance) < 0) {
                issues.push({
                    type: 'danger',
                    text: `A conta "${acc.name}" está com saldo negativo (R$ ${Number(acc.balance).toLocaleString('pt-BR')}). Cheque o Cheque-especial ou cadastre um aporte via Lançamento.`
                });
            }
        });

        // 2. High spending alert
        const recentExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const totalRecent = recentExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        
        // Dynamic median to detect anomalies
        const allExpenses = transactions.filter(t => t.type === 'expense');
        const avgExpense = allExpenses.length > 0 ? allExpenses.reduce((s, t) => s + Number(t.amount), 0) / allExpenses.length : 0;
        
        if (totalRecent > (avgExpense * 5) && avgExpense > 0) {
             suggestions.push({
                 type: 'warning',
                 text: `Aviso de Fluxo de Caixa: Os gastos da última semana (R$ ${totalRecent.toLocaleString('pt-BR')}) estão muito acima da sua média. Certifique-se de que compras grandes (como maquinário ou aportes) não estão categorizadas como gasto comum.`,
                 actionText: 'Revisar (Buscar Maior Valor)',
                 action: () => {
                     const srch = document.querySelector('input[placeholder*="Descrição"]');
                     if(srch) srch.focus();
                     window.scrollTo({top: 0, behavior: 'smooth'});
                 }
             });
        }

        // 3. Transactions on non-business days or very large anomalous transactions out of median
        const anomalousTransactions = allExpenses.filter(t => Number(t.amount) > (avgExpense * 10) && avgExpense > 50).slice(0, 3);
        anomalousTransactions.forEach(t => {
            let navText = 'Módulo Origem';
            let navAction = () => { /* No specific jump if not tied */ };
            
            if (t.referenceType === 'Inventory') {
                navText = 'Ir p/ Estoque (Origem)';
                navAction = () => navigate(t.referenceId ? `/inventory?edit_item=${t.referenceId}` : '/inventory');
            } else if (t.referenceType === 'Equipment' || t.category?.includes('Equipamento')) {
                navText = 'Revisar Máquina';
                navAction = () => navigate(t.referenceId ? `/equipments?maintenance_id=${t.referenceId}` : '/equipments');
            } else if (t.referenceType === 'Order') {
                navText = 'Abrir Pedido';
                navAction = () => navigate('/orders');
            }

            issues.push({
                type: 'danger',
                text: `Alerta Contábil: Há lançamentos discrepantes (ex: "${t.description}") que custam muito acima da sua média diária (R$ ${Number(t.amount).toLocaleString('pt-BR')}). Confirme se isso não foi um erro de dígito ou se é de fato Capital Instalado/Imobilizado!`,
                actionText: 'Editar Lançamento',
                action: () => openEditTrans ? openEditTrans(t) : null,
                secondaryActionText: navText,
                secondaryAction: navAction
            });
        });
        
        // 4. Incongruence: Categorization mistakes
        const weirdIncomes = transactions.filter(t => t.type === 'income' && t.category?.toLowerCase?.().includes('taxa'));
        if (weirdIncomes.length > 0) {
            const t = weirdIncomes[0];
            suggestions.push({
                type: 'warning',
                text: `Sua receita "${t.description}" está declarada na categoria de Despesa (${t.category}). Revise para não bagunçar o DRE.`,
                actionText: 'Corrigir Lançamento',
                action: () => openEditTrans ? openEditTrans(t) : null
            });
        }

        // 5. Equipment Cross-Module auditing
        const equipmentHeavyExp = allExpenses.filter(t => (t.category?.includes('Equipamento') || t.description?.toLowerCase().includes('manutenção')) && Number(t.amount) > (avgExpense * 1.5)).slice(0, 2);
        equipmentHeavyExp.forEach(t => {
            issues.push({
                type: 'danger',
                text: `Alerta de Manutenção: Lançamento atrelado a maquinário "${t.description}" foi além do normal (R$ ${Number(t.amount).toLocaleString('pt-BR')}). Mantenha as datas e valores coesos com o módulo de equipamentos.`,
                actionText: 'Corrigir no Caixa',
                action: () => openEditTrans ? openEditTrans(t) : null,
                secondaryActionText: 'Verificar Origem (Máquina)',
                secondaryAction: () => navigate(t.referenceId ? `/equipments?maintenance_id=${t.referenceId}` : `/equipments`)
            });
        });

        // 6. Overdue Payable Bills (Contas a Pagar Atrasadas)
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const overdueExpenses = allExpenses.filter(t => t.status === 'pending' && new Date(t.date) < today);
        if (overdueExpenses.length > 0) {
            const sumOverdue = overdueExpenses.reduce((s, t) => s + Number(t.amount), 0);
            issues.push({
                type: 'danger',
                text: `Alerta de Inadimplência Própria: Você possui ${overdueExpenses.length} despesa(s) catalogada(s) que já venceram no sistema, somando R$ ${sumOverdue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Isso atrapalha a precisão do Caixa Real. Programe os pagamentos ou edite as datas.`,
                actionText: 'Rolar para Últimos Lançamentos',
                action: () => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})
            });
        }

        // 7. Overdue Receivables (Contas a Receber Atrasadas/Calotes)
        const overdueIncomes = transactions.filter(t => t.type === 'income' && t.status === 'pending' && new Date(t.date) < today);
        if (overdueIncomes.length > 0) {
            const sumOverdueInc = overdueIncomes.reduce((s, t) => s + Number(t.amount), 0);
            suggestions.push({
                type: 'warning',
                text: `Atraso em Recebimentos: O sistema detectou ${overdueIncomes.length} receita(s) esperada(s) que já passaram da data preterida, estancando R$ ${sumOverdueInc.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Acione os devedores ou baixe se já recebeu.`,
                actionText: 'Checar Inadimplência',
                action: () => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})
            });
        }

        // 8. Credit Card Open Faturas
        accounts.filter(a => a.type === 'credit').forEach(card => {
            const cardBalance = Number(card.balance) || 0;
            // Nas lógicas de cartão, um balanço negativo sinaliza uso de limite, logo a fatura acumulou dívida.
            if (cardBalance < 0) {
                suggestions.push({
                    type: 'warning',
                    text: `Fatura de Cartão Preditiva: O cartão "${card.name}" consolidou um gasto de R$ ${Math.abs(cardBalance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Não se esqueça de registrar o Lançamento de Baixa/Pagamento desta fatura no dia do vencimento usando uma conta corrente, caso já tenha liquidado o banco.`,
                    actionText: 'Rolar até os Cartões',
                    action: () => window.scrollTo({top: 0, behavior: 'smooth'})
                });
            }
        });

        return { issues, suggestions };
    }, [transactions, accounts, navigate, openEditTrans]);

    if (insights.issues.length === 0 && insights.suggestions.length === 0) {
        return (
            <div style={{ padding: '16px', background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
               <Sparkles size={24} color="#16a34a" />
               <span style={{ color: '#166534', fontWeight: 600 }}>Auditoria Copiloto IA: Tudo Perfeito! Nenhuma incongruência financeira ou erro de digitação contábil detectado.</span>
            </div>
        );
    }

    return (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                  <Sparkles size={18} color="#8b5cf6" />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#6d28d9', letterSpacing: '0.05em', margin: 0 }}>Auditoria Contábil Copiloto IA</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {insights.issues.map((i, idx) => (
                      <div key={'i'+idx} style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 300px' }}>
                              <ShieldAlert size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                              <span style={{ color: '#7f1d1d', fontWeight: 600, fontSize: '0.95rem' }}>{i.text}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                              {i.secondaryAction && (
                                  <button onClick={i.secondaryAction} style={{ background: 'transparent', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '8px', color: '#991b1b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      {i.secondaryActionText}
                                  </button>
                              )}
                              {i.action && (
                                  <button onClick={i.action} style={{ background: '#fecaca', border: '1px solid transparent', padding: '6px 12px', borderRadius: '8px', color: '#991b1b', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      {i.actionText} <ArrowRight size={14} />
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
                  {insights.suggestions.map((s, idx) => (
                      <div key={'s'+idx} style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 300px' }}>
                              <Info size={24} color="#d97706" style={{ flexShrink: 0 }} />
                              <span style={{ color: '#92400e', fontWeight: 600, fontSize: '0.95rem' }}>{s.text}</span>
                          </div>
                           <div style={{ display: 'flex', gap: '8px' }}>
                              {s.secondaryAction && (
                                  <button onClick={s.secondaryAction} style={{ background: 'transparent', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      {s.secondaryActionText}
                                  </button>
                              )}
                              {s.action && (
                                  <button onClick={s.action} style={{ background: '#fde68a', border: '1px solid transparent', padding: '6px 12px', borderRadius: '8px', color: '#b45309', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      {s.actionText} <ArrowRight size={14} />
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
         </div>
    );
}

import { ChevronDown, ChevronRight, Calculator, PieChart, Briefcase } from 'lucide-react';

export function SimpleDRETable({ stats }) {
    const [expanded, setExpanded] = React.useState({
        receita: false,
        cmv: false,
        fixas: false,
    });

    const toggle = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

    const grossIncome = stats.monthIncome + (stats.gatewayTaxes || 0);
    const deductions = (stats.gatewayTaxes || 0);
    const netIncome = Math.max(0, stats.monthIncome); // Receita Liquida
    
    const expMap = stats.expenseMap || {};
    
    // CMV (Custos Variáveis DIreTOS)
    const materiais = expMap['Materiais & Insumos'] || 0;
    const frete = expMap['Logística & Frete'] || 0;
    const impostos = expMap['Impostos & Taxas'] || 0; // Usually grouped under deductions or variable expenses
    
    const cmvTotal = materiais + frete;
    
    // Lucro Bruto
    const grossProfit = netIncome - cmvTotal;
    
    // Operacionais Fixas
    const fixasKeys = Object.keys(expMap).filter(k => k !== 'Materiais & Insumos' && k !== 'Logística & Frete' && k !== 'Taxas Gateway (M.P.)');
    const fixasTotal = fixasKeys.reduce((acc, k) => acc + (expMap[k] || 0), 0);
    
    // Lucro Líquido
    const netProfit = grossProfit - fixasTotal;
    
    // Margin %
    const marginPercent = netIncome > 0 ? (netProfit / netIncome) * 100 : 0;

    const SubRow = ({ label, value, isLast }) => (
        <tr style={{ backgroundColor: '#fdfdfd', borderBottom: isLast ? '1px solid #e2e8f0' : 'none' }} className="animate-fade-in">
            <td style={{ padding: '8px 16px 8px 48px', fontSize: '0.825rem', color: '#64748b' }}>└ {label}</td>
            <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    );

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#0369a1' }}><Briefcase size={20} /></div>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>D.R.E. Analítico</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Demonstrativo de Resultados do Exercício</p>
                </div>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }} className="scrollbar-hide">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <tbody>
                        {/* 1. Receitas */}
                        <tr style={{ background: '#f8fafc', borderBottom: '1px dashed #cbd5e1', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => toggle('receita')} className="hover:bg-gray-100">
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {expanded.receita ? <ChevronDown size={14} /> : <ChevronRight size={14} />} 1. Receita Operacional Bruta
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>R$ {grossIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {expanded.receita && <SubRow label="Faturamento Total" value={grossIncome} isLast={false} />}
                        {expanded.receita && <SubRow label="(-) Taxas de Plataforma/Gateway" value={deductions} isLast={true} />}
                        
                        {/* 2. ROL */}
                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f0fdf4' }}>
                            <td style={{ padding: '12px 16px 12px 24px', fontWeight: 800, color: '#166534', fontSize: '0.85rem', textTransform: 'uppercase' }}>= Receita Operacional Líquida</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>R$ {netIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>

                        {/* 3. CMV */}
                        <tr style={{ borderBottom: '1px dashed #cbd5e1', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => toggle('cmv')} className="hover:bg-gray-50">
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {expanded.cmv ? <ChevronDown size={14} /> : <ChevronRight size={14} />} (-) Custos Variáveis (C.M.V)
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>- R$ {cmvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {expanded.cmv && <SubRow label="Matérias-primas e Insumos" value={materiais} isLast={false} />}
                        {expanded.cmv && <SubRow label="Logística e Fretes" value={frete} isLast={true} />}

                        {/* 4. Margem de Contribuição */}
                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#eff6ff' }}>
                            <td style={{ padding: '12px 16px 12px 24px', fontWeight: 800, color: '#1e40af', fontSize: '0.85rem', textTransform: 'uppercase' }}>= Margem de Contribuição (Lucro Bruto)</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#1e40af' }}>R$ {grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>

                        {/* 5. Despesas Fixas */}
                        <tr style={{ borderBottom: '1px dashed #cbd5e1', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => toggle('fixas')} className="hover:bg-gray-50">
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {expanded.fixas ? <ChevronDown size={14} /> : <ChevronRight size={14} />} (-) Despesas Operacionais Fixas
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>- R$ {fixasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {expanded.fixas && fixasKeys.filter(k => expMap[k] > 0).map((k, idx) => (
                             <SubRow key={k} label={k} value={expMap[k]} isLast={idx === fixasKeys.filter(key => expMap[key] > 0).length - 1} />
                        ))}
                        {expanded.fixas && fixasKeys.filter(k => expMap[k] > 0).length === 0 && <SubRow label="Nenhuma despesa registrada" value={0} isLast={true} />}

                        {/* 6. Resultado Líquido */}
                        <tr style={{ backgroundColor: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            <td style={{ padding: '16px', fontWeight: 900, color: '#ffffff', fontSize: '1.05rem', textTransform: 'uppercase', display: 'flex', flexDirection: 'column' }}>
                                <span>= Lucro Líquido do Exercício</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>Margem Líquida: {marginPercent.toFixed(1)}%</span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 900, color: '#ffffff', fontSize: '1.2rem', verticalAlign: 'middle' }}>
                                R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
