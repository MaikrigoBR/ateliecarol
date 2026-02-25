
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import db from '../services/database.js';

export function NewOrderModal({ isOpen, onClose, onOrderCreated, orderToEdit }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    productId: '',
    quantity: 1,
    paymentMethod: 'pix',
    paymentCondition: 'spot', // 'spot' (a vista) or 'installment' (parcelado)
    installments: 1,
    amountPaid: 0,
    balanceDue: 0
  });

  const paymentMethods = [
    { value: 'pix', label: 'Pix' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'transfer', label: 'Transferência' }
  ];

  useEffect(() => {
    const loadData = async () => {
        if (isOpen) {
            const allProducts = await db.getAll('products');
            const allCustomers = await db.getAll('customers');
            setProducts(allProducts);
            setCustomers(allCustomers);
            
            // If editing, populate form
            if (orderToEdit) {
                setFormData({
                    // Customer name stored directly in order.customer
                    customer: orderToEdit.customer || '', 
                    productId: orderToEdit.productId || '',
                    quantity: orderToEdit.items || 1,
                    paymentMethod: orderToEdit.paymentMethod || 'pix',
                    paymentCondition: orderToEdit.paymentCondition || 'spot',
                    installments: orderToEdit.installments || 1,
                    amountPaid: orderToEdit.amountPaid || 0,
                    balanceDue: orderToEdit.balanceDue ?? (orderToEdit.total || 0)
                });
            } else {
                // Reset form on open for new
                setFormData({
                    customer: '',
                    productId: '',
                    quantity: 1,
                    paymentMethod: 'pix',
                    paymentCondition: 'spot',
                    installments: 1,
                    amountPaid: 0,
                    balanceDue: 0
                });
            }
        }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id == formData.productId);
  const total = selectedProduct ? (selectedProduct.price * formData.quantity) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.productId) return;

    const newOrder = {
      customer: formData.customer,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      status: 'Novo',
      items: parseInt(formData.quantity),
      total: total,
      productId: formData.productId, // Use original ID (likely string from Firestore)
      paymentMethod: formData.paymentMethod,
      paymentCondition: formData.paymentCondition,
      installments: parseInt(formData.installments)
    };

    // Save to DB
    if (orderToEdit) {
        // Evaluate if manual payment change affects status
        const parsedPaid = parseFloat(formData.amountPaid) || 0;
        let inferredStatus = orderToEdit.status;
        
        // Only override status based on manual payment editing if it makes sense logically
        if (parsedPaid >= total - 0.05 && total > 0) {
             inferredStatus = 'Concluído'; // fully paid
        } else if (parsedPaid > 0 && parsedPaid < total) {
             inferredStatus = 'Pagamento Parcial'; 
        } else if (parsedPaid === 0 && orderToEdit.status === 'Concluído') {
             inferredStatus = 'Novo'; // rollback
        }

        await db.update('orders', orderToEdit.id, {
            ...newOrder,
            status: inferredStatus,
            amountPaid: parsedPaid,
            balanceDue: Math.max(0, total - parsedPaid)
        });
    } else {
        await db.create('orders', newOrder);
        
        // Update stock only on creation (optional, good for realism)
        if (selectedProduct) {
            await db.update('products', selectedProduct.id, { 
                stock: selectedProduct.stock - parseInt(formData.quantity) 
            });
        }
    }

    onOrderCreated();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{orderToEdit ? 'Editar Pedido' : 'Novo Pedido'}</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="input-group">
              <label className="form-label">Nome do Cliente</label>
              <select
                className="form-input"
                value={formData.customer}
                onChange={e => setFormData({...formData, customer: e.target.value})}
                required
                autoFocus
              >
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="input-group">
              <label className="form-label">Produto</label>
              <select 
                className="form-input"
                value={formData.productId}
                onChange={e => setFormData({...formData, productId: e.target.value})}
                required
              >
                <option value="">Selecione um produto...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (R$ {Number(product.price || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="form-label">Quantidade</label>
              <input 
                type="number" 
                className="form-input" 
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

                <div className="input-group">
                    <label className="form-label">Condição</label>
                    <select 
                        className="form-input"
                        value={formData.paymentCondition}
                        onChange={e => setFormData({...formData, paymentCondition: e.target.value})}
                    >
                        <option value="spot">À Vista</option>
                        <option value="installment">Parcelado</option>
                    </select>
                </div>
            </div>

            {formData.paymentCondition === 'installment' && (
                <div className="input-group">
                    <label className="form-label">Número de Parcelas</label>
                    <input 
                        type="number" 
                        min="2" 
                        max="24"
                        className="form-input"
                        value={formData.installments}
                        onChange={e => setFormData({...formData, installments: e.target.value})}
                    />
                </div>
            )}

            {orderToEdit && (
                <div style={{ marginTop: '16px', padding: '12px', border: '1px dashed #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Correção Financeira Manual</h4>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Valor já pago pelo cliente (R$)</span>
                            <span className="text-muted text-xs">Total do Pedido: R$ {Number(total || 0).toFixed(2)}</span>
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            className="form-input" 
                            value={formData.amountPaid}
                            onChange={e => setFormData({...formData, amountPaid: e.target.value})}
                        />
                        <p className="text-[10px] text-muted mt-1">
                           Zere este valor se o pedido foi marcado como pago por engano. O status será recalculado.
                        </p>
                    </div>
                </div>
            )}

            <div className="modal-total-summary" style={{ marginTop: orderToEdit ? '16px' : '0' }}>
                <span className="text-muted">Total Estimado:</span>
                <span className="modal-total-value">
                    R$ {Number(total || 0).toFixed(2).replace('.', ',')}
                </span>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salvar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
