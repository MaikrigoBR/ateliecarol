
import React, { useState } from 'react';
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import db from '../services/database.js';

export function NewTransactionModal({ isOpen, onClose, onTransactionCreated }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income', // income, expense
    category: '',
    date: new Date().toISOString().split('T')[0],
    status: 'paid', // paid, pending
    installments: 1,
    interval: 'month', // month, week
    paymentMethod: 'pix', // pix, credit_card, debit_card, cash, transfer
  });

  const paymentMethods = [
    { value: 'pix', label: 'Pix' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'transfer', label: 'Transferência' }
  ];

  const categories = {
    income: ['Vendas', 'Serviços', 'Reembolso', 'Outros'],
    expense: ['Matéria-prima', 'Maquinário', 'Manutenção', 'Utilidades', 'Marketing', 'Impostos', 'Outros']
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const totalInstallments = parseInt(formData.installments) || 1;
    const installmentAmount = (parseFloat(formData.amount) || 0) / totalInstallments;
    
    // Generate transactions
    const promises = [];
    for (let i = 0; i < totalInstallments; i++) {
        let dueDate = new Date(formData.date);
        
        if (formData.interval === 'month') {
            dueDate.setMonth(dueDate.getMonth() + i);
        } else {
            dueDate.setDate(dueDate.getDate() + (i * 7));
        }

        const newTransaction = {
            description: totalInstallments > 1 
                ? `${formData.description} (${i + 1}/${totalInstallments})`
                : formData.description,
            amount: installmentAmount,
            type: formData.type,
            category: formData.category || 'Outros',
            date: dueDate.toISOString().split('T')[0],
            status: i === 0 ? formData.status : 'pending', // First one follows form, others pending
            paymentMethod: formData.paymentMethod
        };
        
        promises.push(db.create('transactions', newTransaction));
    }
    
    await Promise.all(promises);
    
    if (onTransactionCreated) {
        onTransactionCreated();
    }
    
    // Reset form
    setFormData({
      description: '',
      amount: '',
      type: 'income',
      category: '',
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      installments: 1,
      interval: 'month',
      paymentMethod: 'pix'
    });
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Lançamento</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Type Switcher */}
            <div className="flex gap-md mb-4" style={{ marginBottom: 'var(--space-lg)' }}>
                <button
                    type="button"
                    className={`btn ${formData.type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData({...formData, type: 'income', category: ''})}
                    style={{ flex: 1, backgroundColor: formData.type === 'income' ? 'var(--success)' : '' }}
                >
                    <TrendingUp size={16} /> Receita
                </button>
                <button
                    type="button"
                    className={`btn ${formData.type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData({...formData, type: 'expense', category: ''})}
                    style={{ flex: 1, backgroundColor: formData.type === 'expense' ? 'var(--danger)' : '' }}
                >
                    <TrendingDown size={16} /> Despesa
                </button>
            </div>

            <div className="input-group">
              <label className="form-label">Descrição *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder={formData.type === 'income' ? "Ex: Venda Site #123" : "Ex: Compra Papel"}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="input-group">
                    <label className="form-label">Valor (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        className="form-input" 
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="form-label">Data</label>
                    <input 
                        type="date"
                        className="form-input" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="input-group">
                    <label className="form-label">Categoria</label>
                    <select 
                        className="form-input"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        required
                    >
                        <option value="">Selecione...</option>
                        {categories[formData.type].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label className="form-label">Status</label>
                    <select 
                        className="form-input"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                        <option value="paid">{formData.type === 'income' ? 'Recebido' : 'Pago'}</option>
                        <option value="pending">Pendente</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="input-group">
                    <label className="form-label">Parcelas</label>
                    <input 
                        type="number" 
                        min="1"
                        max="120"
                        className="form-input" 
                        value={formData.installments}
                        onChange={e => setFormData({...formData, installments: e.target.value})}
                    />
                </div>
                 <div className="input-group">
                    <label className="form-label">Intervalo</label>
                    <select 
                        className="form-input"
                        value={formData.interval}
                        onChange={e => setFormData({...formData, interval: e.target.value})}
                        disabled={formData.installments <= 1}
                    >
                        <option value="month">Mensal</option>
                        <option value="week">Semanal</option>
                    </select>
                </div>
            </div>

            <div className="input-group">
                <label className="form-label">Forma de Pagamento</label>
                 <select 
                    className="form-input"
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                >
                    {paymentMethods.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                </select>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: formData.type === 'expense' ? 'var(--danger)' : 'var(--primary)' }}>
              <Save size={16} />
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
