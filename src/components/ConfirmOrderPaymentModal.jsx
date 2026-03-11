import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Calendar, CreditCard, Landmark } from 'lucide-react';
import db from '../services/database.js';

export function ConfirmOrderPaymentModal({ isOpen, onClose, onConfirm, order }) {
  if (!isOpen || !order) return null;

  const totalOrderValue = order.total || 0;
  const amountPaidSoFar = order.amountPaid || 0;
  const initialBalanceDue = Math.max(0, totalOrderValue - amountPaidSoFar);

  const [paymentAmount, setPaymentAmount] = useState(initialBalanceDue);
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || 'pix');
  const [paymentCondition, setPaymentCondition] = useState(order.paymentCondition || 'spot');
  const [installments, setInstallments] = useState(order.installments || 1);
  const [applyInterest, setApplyInterest] = useState(false);
  const [interestRate, setInterestRate] = useState(0);
  const [nextDueDate, setNextDueDate] = useState('');
  
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
        const accs = await db.getAll('accounts');
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccountId(accs[0].id);
    };
    if (isOpen) loadAccounts();
  }, [isOpen]);

  // Reset state when order changes
  useEffect(() => {
      if (isOpen && order) {
        const remaining = Math.max(0, (order.total || 0) - (order.amountPaid || 0));
        setPaymentAmount(remaining);
        setPaymentMethod(order.paymentMethod || 'pix');
        setPaymentCondition(order.paymentCondition || 'spot');
        setInstallments(order.installments || 1);
        setApplyInterest(false);
        setInterestRate(0);
        setNextDueDate('');
      }
  }, [isOpen, order]);

  // Calculations
  const parsedPayment = parseFloat(paymentAmount) || 0;
  const parsedInterest = parseFloat(interestRate) || 0;

  const surchargeAmount = applyInterest ? (parsedPayment * (parsedInterest / 100)) : 0;
  const totalTransactionValue = parsedPayment + surchargeAmount; 
  // Wait, usually interest increases the DEBT, not just the transaction.
  // User said: "opções de definir o método parcelado ... com juros ... ou sem juros".
  // If I pay 100 with 10% interest, the client pays 110.
  // Does the order total increase to 110? Yes.
  
  // Let's assume 'paymentAmount' is the PRINCIPAL being paid off.
  // And 'surcharge' is added on top.
  
  const currentTotalDebt = totalOrderValue; // Plus any previous interest?
  // New Total Order Value = Old Total + Surcharge.
  
  const remainingCheck = (currentTotalDebt + surchargeAmount) - (amountPaidSoFar + parsedPayment + surchargeAmount);
  // Actually simpler:
  // Debt: 100.
  // User pays: 50.
  // Surcharge: 0. 
  // Remaining: 50.
  
  // Debt: 100.
  // User pays 100.
  // Surcharge 10% (10).
  // User Pays 110.
  // Order Total becomes 110.
  // Paid 110.
  // Remaining 0.

  const finalOrderTotal = totalOrderValue + surchargeAmount;
  const totalPaidAfterThis = amountPaidSoFar + parsedPayment + surchargeAmount;
  const balanceRemaining = Math.max(0, finalOrderTotal - totalPaidAfterThis);

  const handleConfirm = () => {
    onConfirm({
        amount: parsedPayment + surchargeAmount, // Record full amount paid
        method: paymentMethod,
        condition: paymentCondition,
        installments: parseInt(installments) || 1,
        interestRate: parsedInterest,
        surchargeAmount: surchargeAmount,
        nextDueDate: balanceRemaining > 0.05 ? nextDueDate : null, // Tolerance
        targetAccountId: selectedAccountId
    });
  };

  const paymentMethods = [
    { value: 'pix', label: 'Pix' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'transfer', label: 'Transferência' }
  ];

  // --- Inline Styles mapping to Theme Variables ---
  const sOverlay = {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: '1rem'
  };

  const sModal = {
      backgroundColor: 'var(--surface)', 
      width: '100%', maxWidth: '540px', maxHeight: '90vh',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      color: 'var(--text-main)',
      animation: 'slideUp 0.3s ease-out'
  };

  const sHeader = {
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: 'var(--background)'
  };

  const sBody = {
      padding: '1.5rem',
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
      backgroundColor: 'var(--surface-hover)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem'
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
        
        {/* Header */}
        <div style={sHeader}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={22} color="var(--success)"/> 
            Registrar Recebimento
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={sBody} className="hide-scrollbar">
            
            {/* Context */}
            <div style={{ ...sCardLinear, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--primary)' }}>
                <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Total do Pedido</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>R$ {totalOrderValue.toFixed(2).replace('.', ',')}</strong>
                </div>
                {amountPaidSoFar > 0 && (
                     <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Já Pago Anteriormente</span>
                        <span style={{ fontSize: '1.125rem', color: 'var(--success)', fontWeight: 700 }}>R$ {amountPaidSoFar.toFixed(2).replace('.', ',')}</span>
                    </div>
                )}
            </div>

            {/* Amount Entry */}
            <div style={sCardLinear}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Valor a Receber Agora</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', fontWeight: 700 }}>R$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        style={{ ...sInput, paddingLeft: '2.5rem', fontSize: '1.125rem', fontWeight: 700 }}
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        max={initialBalanceDue}
                    />
                </div>
            </div>

            {/* Method & Account */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.375rem' }}>Forma de Pagamento</label>
                    <select style={sInput} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        {paymentMethods.map(method => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.375rem' }}>Conta de Destino (Caixa/Banco)</label>
                    <select style={{ ...sInput, cursor: 'pointer' }} value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required>
                        <option value="">Selecione...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.375rem' }}>Condição</label>
                    <select style={sInput} value={paymentCondition} onChange={e => setPaymentCondition(e.target.value)}>
                        <option value="spot">À Vista</option>
                        <option value="installment">Parcelado</option>
                    </select>
                </div>
            </div>

            {/* Installments & Interest Logic */}
            {paymentCondition === 'installment' && (
                <div style={{ ...sCardLinear, borderLeft: '3px solid var(--info)', backgroundColor: 'transparent' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Nº Parcelas</label>
                            <input type="number" min="2" max="24" style={sInput} value={installments} onChange={e => setInstallments(e.target.value)} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                <input type="checkbox" checked={applyInterest} onChange={e => setApplyInterest(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                                Adicionar Juros?
                            </label>
                        </div>
                    </div>
                    
                    {applyInterest && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', animation: 'fadeIn 0.3s ease-out', marginTop: '0.5rem' }}>
                             <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.375rem' }}>Taxa Acréscimo (%)</label>
                                <input type="number" step="0.1" style={sInput} value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="Ex: 5" />
                             </div>
                             <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo do Parcelamento</span>
                                 <strong style={{ color: 'var(--danger)', fontSize: '1rem' }}>+ R$ {surchargeAmount.toFixed(2).replace('.', ',')}</strong>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary of Transaction */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                     <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total lançado nesta transação:</span>
                     <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>R$ {(parsedPayment + surchargeAmount).toFixed(2).replace('.', ',')}</span>
                 </div>
                 
                 {balanceRemaining > 0.05 ? (
                     <div style={{ ...sCardLinear, backgroundColor: 'transparent', border: '1px solid var(--warning)', borderLeft: '4px solid var(--warning)', marginTop: '0.5rem' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.875rem' }}>Dívida Restante Gerada</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 800, fontSize: '1.125rem' }}>R$ {balanceRemaining.toFixed(2).replace('.', ',')}</span>
                         </div>
                         <div>
                             <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Vencimento do Saldo Devedor</label>
                             <input type="date" style={{ ...sInput, borderColor: 'var(--warning)' }} value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required />
                         </div>
                     </div>
                 ) : (
                     <div style={{ textAlign: 'center', color: '#fff', backgroundColor: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-md)', marginTop: '1rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                         <Check size={16} /> Parcela Final — Pedido Quitado.
                     </div>
                 )}
            </div>
            
        </div>

        <div style={sFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={balanceRemaining > 0.05 && !nextDueDate} style={{ flex: 1, backgroundColor: 'var(--success)' }}>
                Liquidar
            </button>
        </div>
      </div>
    </div>
  );
}
