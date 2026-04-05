import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, CreditCard, Landmark, Plus, Trash2 } from 'lucide-react';
import db from '../services/database.js';

export function ConfirmOrderPaymentModal({ isOpen, onClose, onConfirm, order }) {
  if (!isOpen || !order) return null;

  const totalOrderValue = order.total || 0;
  const amountPaidSoFar = order.amountPaid || 0;
  const initialBalanceDue = Math.max(0, totalOrderValue - amountPaidSoFar);

  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [nextDueDate, setNextDueDate] = useState('');

  const resetPayments = (accs) => {
      const firstAcc = accs.length > 0 ? accs[0].id : '';
      setPayments([
          {
              id: Date.now(),
              amount: initialBalanceDue,
              method: order.paymentMethod || 'pix',
              condition: order.paymentCondition || 'spot',
              installments: order.installments || 1,
              applyInterest: false,
              interestRate: 0,
              gatewayFeePct: '',
              targetAccountId: firstAcc
          }
      ]);
      setNextDueDate('');
  };

  useEffect(() => {
      if (isOpen && order) {
          db.getAll('accounts').then(accs => {
              setAccounts(accs);
              resetPayments(accs);
          });
      }
  }, [isOpen, order, initialBalanceDue]);

  let sumSurcharges = 0;
  let sumAmounts = 0;
  let sumGatewayFees = 0;

  payments.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      const rate = parseFloat(p.interestRate) || 0;
      const sur = p.applyInterest ? (amt * (rate / 100)) : 0;
      const gate = parseFloat(p.gatewayFeePct) || 0;
      
      sumAmounts += amt;
      sumSurcharges += sur;
      sumGatewayFees += (amt + sur) * (gate / 100);
  });

  const finalOrderTotal = totalOrderValue + sumSurcharges;
  const totalPaidAfterThis = amountPaidSoFar + sumAmounts + sumSurcharges;
  const balanceRemaining = Math.max(0, finalOrderTotal - totalPaidAfterThis);

  const handleAddPayment = () => {
      const firstAcc = accounts.length > 0 ? accounts[0].id : '';
      setPayments([...payments, {
          id: Date.now() + Math.random(),
          amount: balanceRemaining > 0 ? balanceRemaining : 0,
          method: 'pix',
          condition: 'spot',
          installments: 1,
          applyInterest: false,
          interestRate: 0,
          gatewayFeePct: '',
          targetAccountId: firstAcc
      }]);
  };

  const handleRemovePayment = (id) => {
      setPayments(payments.filter(p => p.id !== id));
  };

  const updatePayment = (id, field, value) => {
      setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleConfirm = () => {
      const payload = payments.map(p => {
          const amt = parseFloat(p.amount) || 0;
          const sur = p.applyInterest ? (amt * (parseFloat(p.interestRate) || 0) / 100) : 0;
          const gate = (amt + sur) * ((parseFloat(p.gatewayFeePct) || 0) / 100);
          
          return {
              amount: amt + sur,
              method: p.method,
              condition: p.condition,
              installments: parseInt(p.installments) || 1,
              interestRate: parseFloat(p.interestRate) || 0,
              surchargeAmount: sur,
              gatewayFeeAmount: gate,
              nextDueDate: balanceRemaining > 0.05 ? nextDueDate : null,
              targetAccountId: p.targetAccountId
          };
      });
      onConfirm(payload);
  };

  const paymentMethods = [
    { value: 'pix', label: 'Pix' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'transfer', label: 'Transferência' }
  ];

  const sOverlay = {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: '1rem',
      animation: 'fadeIn 0.4s ease-out'
  };

  const sModal = {
      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
      backdropFilter: 'blur(30px)',
      width: '100%', maxWidth: '680px', maxHeight: '90vh',
      borderRadius: '32px',
      boxShadow: '0 40px 100px -20px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column',
      border: '1.5px solid rgba(255, 255, 255, 0.5)',
      overflow: 'hidden',
      color: '#1e293b',
      animation: 'zoomIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
  };

  const sHeader = {
      padding: '2rem 2.5rem',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.05), transparent)'
  };

  const sBody = {
      padding: '2rem 2.5rem',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '1rem'
  };

  const sFooter = {
      padding: '1rem 1.5rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--background)',
      display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center'
  };

  const sCardLinear = {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      border: '1.5px solid rgba(0,0,0,0.05)',
      borderRadius: '24px',
      padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      position: 'relative',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
  };

  const sInput = {
      width: '100%', padding: '0.625rem 0.875rem', 
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--surface)', color: 'var(--text-main)',
      fontSize: '0.875rem', height: '2.5rem'
  };

  return (
    <div style={sOverlay} onClick={onClose}>
      <div style={sModal} onClick={e => e.stopPropagation()}>
        <div style={sHeader}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={22} color="var(--success)"/> Checkout Multi-Fontes
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={sBody} className="hide-scrollbar">
            <div style={{ ...sCardLinear, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #6366f1', background: 'rgba(99, 102, 241, 0.03)' }}>
                <div>
                    <span style={{ fontSize: '0.65rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Total do Pedido</span>
                    <strong style={{ fontSize: '1.75rem', color: '#1e293b', letterSpacing: '-0.04em' }}>R$ {totalOrderValue.toFixed(2).replace('.', ',')}</strong>
                </div>
                {amountPaidSoFar > 0 && (
                     <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.65rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>Pago Anteriormente</span>
                        <span style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900, letterSpacing: '-0.04em' }}>- R$ {amountPaidSoFar.toFixed(2).replace('.', ',')}</span>
                    </div>
                )}
            </div>

            {payments.map((p, idx) => (
                <div key={p.id} style={{...sCardLinear, border: '1px solid var(--border)'}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           Pagamento {idx + 1}
                        </h4>
                        {payments.length > 1 && (
                            <button onClick={() => handleRemovePayment(p.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '0.2rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                <Trash2 size={14}/> Remover
                            </button>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Valor a Receber</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>R$</span>
                                <input 
                                    type="number" step="0.01"
                                    style={{ ...sInput, paddingLeft: '2.25rem', fontSize: '1rem', fontWeight: 700 }}
                                    value={p.amount}
                                    onChange={e => updatePayment(p.id, 'amount', e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Forma</label>
                            <select style={sInput} value={p.method} onChange={e => updatePayment(p.id, 'method', e.target.value)}>
                                {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                         <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Conta/Cofre</label>
                            <select style={sInput} value={p.targetAccountId} onChange={e => updatePayment(p.id, 'targetAccountId', e.target.value)} required>
                                <option value="">Selecione...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Condição</label>
                            <select style={sInput} value={p.condition} onChange={e => updatePayment(p.id, 'condition', e.target.value)}>
                                <option value="spot">À Vista</option>
                                <option value="installment">Parcelado</option>
                            </select>
                        </div>
                        {(p.method === 'credit_card' || p.method === 'debit_card') && (
                            <div style={{ flex: 1, minWidth: '150px', animation: 'fadeIn 0.3s ease-out' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Taxa MDR Maquininha (%)</label>
                                <input type="number" step="0.1" style={sInput} value={p.gatewayFeePct} onChange={e => updatePayment(p.id, 'gatewayFeePct', e.target.value)} placeholder="Ex: 1.5" />
                            </div>
                        )}
                    </div>

                    {p.condition === 'installment' && (
                        <div style={{ padding: '0.75rem', border: '1px solid var(--info)', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent' }}>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Nº Parcelas</label>
                                    <input type="number" min="2" max="24" style={sInput} value={p.installments} onChange={e => updatePayment(p.id, 'installments', e.target.value)} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        <input type="checkbox" checked={p.applyInterest} onChange={e => updatePayment(p.id, 'applyInterest', e.target.checked)} style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary)' }} />
                                        Adicionar Juros?
                                    </label>
                                </div>
                            </div>
                            
                            {p.applyInterest && (
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', animation: 'fadeIn 0.3s ease-out', marginTop: '0.75rem' }}>
                                     <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Taxa Acréscimo (%)</label>
                                        <input type="number" step="0.1" style={sInput} value={p.interestRate} onChange={e => updatePayment(p.id, 'interestRate', e.target.value)} placeholder="Ex: 5" />
                                     </div>
                                     <div style={{ flex: 1, textAlign: 'right' }}>
                                         <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Custo do Parcelamento</span>
                                         <strong style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>+ R$ {((parseFloat(p.amount)||0) * (parseFloat(p.interestRate)||0)/100).toFixed(2).replace('.', ',')}</strong>
                                     </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            <button onClick={handleAddPayment} style={{ width: '100%', padding: '0.75rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                <Plus size={18}/> Adicionar Outra Fonte de Pagamento
            </button>

            {/* Summary of Transaction */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                     <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Soma dos Pagamentos Lançados:</span>
                     <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>R$ {(sumAmounts + sumSurcharges).toFixed(2).replace('.', ',')}</span>
                 </div>
                 
                 {sumGatewayFees > 0 && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', opacity: 0.8 }}>
                         <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>Total de Custo MDR (Taxas Ocultas):</span>
                         <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger)' }}>- R$ {sumGatewayFees.toFixed(2).replace('.', ',')}</span>
                     </div>
                 )}
                 
                 {balanceRemaining > 0.05 ? (
                     <div style={{ ...sCardLinear, backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1.5px solid rgba(245, 158, 11, 0.2)', borderLeft: '6px solid #f59e0b', marginTop: '1rem' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#d97706', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase' }}>Dívida Restante Gerada</span>
                            <span style={{ color: '#d97706', fontWeight: 950, fontSize: '1.25rem' }}>R$ {balanceRemaining.toFixed(2).replace('.', ',')}</span>
                         </div>
                         <div>
                             <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Vencimento do Saldo Devedor</label>
                             <input type="date" style={{ ...sInput, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: '12px' }} value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required />
                         </div>
                     </div>
                 ) : (
                     <div style={{ textAlign: 'center', color: '#fff', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '1rem', borderRadius: '20px', marginTop: '1.5rem', fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)' }}>
                         <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '4px' }}><Check size={18} strokeWidth={3} /></div>
                         CONTABILIDADE FECHADA — PEDIDO QUITADO
                     </div>
                 )}
            </div>
            
        </div>

        <div style={sFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={(balanceRemaining > 0.05 && !nextDueDate) || sumAmounts <= 0} style={{ flex: 1, backgroundColor: 'var(--success)' }}>
                Liquidar e Registrar
            </button>
        </div>
      </div>
    </div>
  );
}
