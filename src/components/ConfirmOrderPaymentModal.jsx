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

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <DollarSign size={20} className="text-primary"/> 
            Registrar Pagamento
          </h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body space-y-4">
            {/* Context */}
            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center text-sm">
                <div>
                    <span className="text-muted block">Valor do Pedido</span>
                    <strong className="text-gray-800 text-lg">R$ {totalOrderValue.toFixed(2)}</strong>
                </div>
                {amountPaidSoFar > 0 && (
                     <div className="text-right">
                        <span className="text-muted block">Já Pago</span>
                        <span className="text-green-600 font-bold">R$ {amountPaidSoFar.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Amount Entry */}
            <div className="input-group">
                <label className="form-label">Valor a Receber Agora</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">R$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        className="form-input pl-8 text-lg font-bold text-gray-800"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        max={initialBalanceDue}
                    />
                </div>
            </div>

            {/* Method & Condition & Account */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="input-group">
                    <label className="form-label">Forma</label>
                     <select 
                        className="form-input"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                    >
                        {paymentMethods.map(method => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                    </select>
                </div>
                <div className="input-group">
                    <label className="form-label">Conta de Destino</label>
                     <select 
                        className="form-input cursor-pointer"
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        required
                    >
                        <option value="">Selecione...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                    <label className="form-label">Condição</label>
                    <select 
                        className="form-input"
                        value={paymentCondition}
                        onChange={e => setPaymentCondition(e.target.value)}
                    >
                        <option value="spot">À Vista</option>
                        <option value="installment">Parcelado</option>
                    </select>
                </div>
            </div>

            {/* Installments & Interest Logic */}
            {paymentCondition === 'installment' && (
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-group">
                            <label className="form-label text-xs uppercase tracking-wide text-blue-800">Parcelas</label>
                            <input 
                                type="number" 
                                min="2" max="24"
                                className="form-input bg-white"
                                value={installments}
                                onChange={e => setInstallments(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium">
                                <input 
                                    type="checkbox" 
                                    checked={applyInterest}
                                    onChange={e => setApplyInterest(e.target.checked)}
                                    className="rounded text-primary focus:ring-primary"
                                />
                                Aplicar Juros?
                            </label>
                        </div>
                    </div>
                    
                    {applyInterest && (
                        <div className="flex gap-4 items-center animate-fadeIn">
                             <div className="input-group flex-1">
                                <label className="form-label text-xs">Taxa de Juros (%)</label>
                                <input 
                                    type="number" step="0.1"
                                    className="form-input bg-white"
                                    value={interestRate}
                                    onChange={e => setInterestRate(e.target.value)}
                                    placeholder="Ex: 5"
                                />
                             </div>
                             <div className="flex-1 text-right">
                                 <span className="text-xs text-muted block">Valor Adicional</span>
                                 <strong className="text-red-500">+ R$ {surchargeAmount.toFixed(2)}</strong>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary of Transaction */}
            <div className="border-t border-gray-100 pt-3">
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-sm text-gray-600">Total desta Transação:</span>
                     <span className="text-lg font-bold text-primary">R$ {(parsedPayment + surchargeAmount).toFixed(2)}</span>
                 </div>
                 
                 {balanceRemaining > 0.05 ? (
                     <div className="bg-orange-50 p-3 rounded border border-orange-100 mt-2">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-orange-800 font-medium text-sm">Saldo Restante (Devedor)</span>
                            <span className="text-orange-800 font-bold">R$ {balanceRemaining.toFixed(2)}</span>
                         </div>
                         <div className="input-group">
                             <label className="form-label text-xs text-orange-800">Vencimento do Restante</label>
                             <input 
                                type="date"
                                className="form-input bg-white border-orange-200 focus:border-orange-400"
                                value={nextDueDate}
                                onChange={e => setNextDueDate(e.target.value)}
                                required
                             />
                         </div>
                     </div>
                 ) : (
                     <div className="text-center text-green-600 text-sm font-medium bg-green-50 p-2 rounded mt-2">
                         <Check size={14} className="inline mr-1"/>
                         Pedido será quitado integralmente.
                     </div>
                 )}
            </div>
            
        </div>

        <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
            </button>
            <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirm}
                disabled={balanceRemaining > 0.05 && !nextDueDate} // Require due date if partial
            >
                Confirmar Pagamento
            </button>
        </div>
      </div>
    </div>
  );
}
