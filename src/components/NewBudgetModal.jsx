
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import db from '../services/database.js';

export function NewBudgetModal({ isOpen, onClose, onBudgetCreated }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    customer: '',
    validUntil: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: 1,
    price: 0
  });

  useEffect(() => {
    const loadData = async () => {
        if (isOpen) {
            try {
                const loadedCustomers = await db.getAll('customers');
                const loadedProducts = await db.getAll('products');
                
                setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
                setProducts(Array.isArray(loadedProducts) ? loadedProducts : []);

                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                setFormData({
                    customer: '',
                    validUntil: nextWeek.toISOString().split('T')[0],
                    items: []
                });
                setCurrentItem({ productId: '', quantity: 1, price: 0 });
            } catch (error) {
                console.error("Error loading modal data:", error);
                setCustomers([]);
                setProducts([]);
            }
        }
    };
    loadData();
  }, [isOpen]);

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    const product = products.find(p => p.id == pId);
    setCurrentItem({
      productId: pId,
      quantity: 1,
      price: product ? product.price : 0
    });
  };

  const addItem = () => {
    if (!currentItem.productId) return;
    const product = products.find(p => p.id == currentItem.productId);
    
    setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
            ...currentItem,
            productName: product.name,
            total: currentItem.price * currentItem.quantity
        }]
    }));
    
    setCurrentItem({ productId: '', quantity: 1, price: 0 });
  };

  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({...formData, items: newItems});
  };

  const calculateTotal = () => {
      return formData.items.reduce((acc, curr) => acc + curr.total, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || formData.items.length === 0) return;

    const newBudget = {
        id: `ORC-${Math.floor(Math.random() * 10000)}`, // Simple ID
        customerName: formData.customer,
        date: new Date().toISOString().split('T')[0],
        validUntil: formData.validUntil,
        items: formData.items,
        total: calculateTotal(),
        status: 'Rascunho' // Starts as Draft
    };

    await db.create('budgets', newBudget);
    if (onBudgetCreated) onBudgetCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Orçamento</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="input-group">
              <label className="form-label">Cliente</label>
              <select 
                className="form-input"
                value={formData.customer}
                onChange={e => setFormData({...formData, customer: e.target.value})}
                required
              >
                  <option value="">Selecione...</option>
                  {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="input-group">
                <label className="form-label">Validade da Proposta</label>
                <input 
                    type="date" 
                    className="form-input"
                    value={formData.validUntil}
                    onChange={e => setFormData({...formData, validUntil: e.target.value})}
                    required
                />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>Adicionar Itens</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input"
                            value={currentItem.productId}
                            onChange={handleProductSelect}
                        >
                            <option value="">Produto...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Qtd"
                            min="1"
                            value={currentItem.quantity}
                            onChange={e => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
                        />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                         <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Preço"
                            step="0.01"
                            value={currentItem.price}
                            onChange={e => setCurrentItem({...currentItem, price: parseFloat(e.target.value)})}
                        />
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={addItem}>
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-md)', maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qtd</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.productName}</td>
                                <td>{item.quantity}</td>
                                <td>R$ {item.total.toFixed(2)}</td>
                                <td>
                                    <button type="button" className="btn btn-icon text-danger" onClick={() => removeItem(idx)}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {formData.items.length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">Nenhum item adicionado</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="modal-total-summary">
                <span>Total do Orçamento:</span>
                <span className="modal-total-value">R$ {calculateTotal().toFixed(2)}</span>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Criar Rascunho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
