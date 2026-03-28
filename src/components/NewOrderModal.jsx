
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import db from '../services/database.js';

export function NewOrderModal({ isOpen, onClose, onOrderCreated, orderToEdit }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    paymentMethod: 'pix',
    paymentCondition: 'spot', // 'spot' (a vista) or 'installment' (parcelado)
    installments: 1,
    amountPaid: 0,
    balanceDue: 0,
    date: new Date().toISOString().split('T')[0],
    deadline: ''
  });
  
  const [cartItems, setCartItems] = useState([]);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [currentDesignId, setCurrentDesignId] = useState('');

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
            const allDesigns = await db.getAll('designs') || [];
            
            setProducts(allProducts);
            setCustomers(allCustomers);
            setDesigns(allDesigns.sort((a,b) => (a.name || '').localeCompare(b.name || '')));
            
            // If editing, populate form
            if (orderToEdit) {
                setFormData({
                    // Customer name stored directly in order.customer
                    customer: orderToEdit.customer || '', 
                    paymentMethod: orderToEdit.paymentMethod || 'pix',
                    paymentCondition: orderToEdit.paymentCondition || 'spot',
                    installments: orderToEdit.installments || 1,
                    amountPaid: orderToEdit.amountPaid || 0,
                    balanceDue: orderToEdit.balanceDue ?? (orderToEdit.total || 0),
                    date: orderToEdit.date || new Date().toISOString().split('T')[0],
                    deadline: orderToEdit.deadline || ''
                });

                if (orderToEdit.cartItems && orderToEdit.cartItems.length > 0) {
                    setCartItems(orderToEdit.cartItems);
                } else if (orderToEdit.productId) {
                    const p = allProducts.find(p => p.id === orderToEdit.productId) || { name: 'Produto Cadastrado', price: (orderToEdit.total || 0) / (orderToEdit.items || 1) };
                    setCartItems([{
                        productId: orderToEdit.productId,
                        name: p.name,
                        price: Number(p.price || 0),
                        quantity: orderToEdit.items || 1
                    }]);
                } else {
                    setCartItems([]);
                }
            } else {
                // Reset form on open for new
                setFormData({
                    customer: '',
                    paymentMethod: 'pix',
                    paymentCondition: 'spot',
                    installments: 1,
                    amountPaid: 0,
                    balanceDue: 0,
                    date: new Date().toISOString().split('T')[0],
                    deadline: ''
                });
                setCartItems([]);
                setCurrentProductId('');
                setCurrentQuantity(1);
                setProductSearch('');
                setCurrentDesignId('');
            }
        }
    };
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const sortedCustomers = [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredProducts = products.filter(p => !productSearch || (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(productSearch.toLowerCase()));

  const groupedProducts = filteredProducts.reduce((acc, product) => {
      const category = product.category || 'Sem Categoria';
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
  }, {});

  const sortedCategories = Object.keys(groupedProducts).sort();
  for (const cat of sortedCategories) {
      groupedProducts[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const handleAddToCart = () => {
      const selectedProduct = products.find(p => p.id == currentProductId);
      if (!selectedProduct) return;
      
      const newItem = {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: Number(selectedProduct.price || 0),
          quantity: Number(currentQuantity),
          designId: currentDesignId,
          designName: currentDesignId ? designs.find(d => String(d.id) === String(currentDesignId))?.name || '' : ''
      };
      
      setCartItems([...cartItems, newItem]);
      setCurrentProductId('');
      setCurrentQuantity(1);
      setProductSearch('');
      setCurrentDesignId('');
  };

  const handleRemoveFromCart = (index) => {
      const newItems = [...cartItems];
      newItems.splice(index, 1);
      setCartItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || cartItems.length === 0) {
        alert('Selecione um cliente e adicione pelo menos 1 produto ao pedido.');
        return;
    }

    const newOrder = {
      customer: formData.customer,
      date: formData.date || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || null,
      status: 'Novo',
      items: totalItems,
      total: total,
      productId: cartItems[0].productId, // Backwards compatible Fallback
      cartItems: cartItems, // New List Format
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
        
        // Update stock only on creation for all items
        for (const item of cartItems) {
            const productRef = products.find(p => p.id == item.productId);
            if (productRef && productRef.stock !== undefined) {
                await db.update('products', productRef.id, { 
                    stock: productRef.stock - item.quantity 
                });
            }
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
                  {sortedCustomers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4 mb-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                    <h4 className="text-sm font-bold text-gray-700">Compor Cesta de Produtos</h4>
                </div>

                <div className="flex flex-col gap-3 mb-5 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <input 
                        type="text" 
                        placeholder="Buscar produto base ou categoria rapidamente..." 
                        className="form-input text-sm w-full bg-gray-50/50"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Produto Base de Estoque *</label>
                            <select 
                                className="form-input text-sm bg-white w-full border-slate-300"
                                value={currentProductId}
                                onChange={e => setCurrentProductId(e.target.value)}
                            >
                                <option value="">--- Selecione da lista ---</option>
                                {sortedCategories.map(category => (
                                    <optgroup key={category} label={category}>
                                        {groupedProducts[category].map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (R$ {Number(product.price || 0).toFixed(2)})
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        
                        <div className="md:col-span-5">
                            <label className="text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                                🎨 Molde / Arte Central (Opcional)
                            </label>
                            <select 
                                className="form-input text-sm bg-purple-50/30 border-purple-200 text-purple-900 w-full"
                                value={currentDesignId}
                                onChange={e => setCurrentDesignId(e.target.value)}
                            >
                                <option value="">[Não aplicar / Arte Genérica]</option>
                                {designs.map(design => (
                                    <option key={design.id} value={design.id}>
                                        {design.name} {design.category && `(${design.category})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">QTD</label>
                            <input 
                                type="number" 
                                className="form-input text-sm w-full font-bold text-center" 
                                min="1"
                                value={currentQuantity}
                                onChange={e => setCurrentQuantity(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={handleAddToCart}
                        disabled={!currentProductId}
                        className="btn btn-primary w-full mt-1 bg-slate-800 hover:bg-slate-700 text-white border-none shadow-sm disabled:opacity-50 disabled:bg-slate-300 transition-colors flex justify-center items-center gap-2"
                        style={{ height: '42px' }}
                    >
                        <Plus size={18} /> Adicionar à Cesta do Pedido
                    </button>
                </div>

                {cartItems.length > 0 && (
                    <div className="bg-white rounded border border-gray-200 overflow-hidden text-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2">Item</th>
                                    <th className="px-3 py-2">Qtd x Valor</th>
                                    <th className="px-3 py-2 text-right">Subtotal</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cartItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-700">{item.name}</div>
                                            {item.designId && (
                                                <div className="text-[10px] text-purple-600 font-bold bg-purple-50 inline-block px-1.5 py-0.5 rounded border border-purple-100 mt-0.5">
                                                    🎨 Arte: {item.designName || designs.find(d => String(d.id) === String(item.designId))?.name || 'Modelo Genérico'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 text-[12px]">{item.quantity} un x R$ {item.price.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-800">
                                            R$ {(item.quantity * item.price).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveFromCart(idx)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                    <label className="form-label text-blue-600 font-semibold mb-1">Data do Pedido</label>
                    <input 
                        type="date"
                        className="form-input w-full border-blue-200 focus:ring-blue-500"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        required
                    />
                </div>
                <div className="input-group">
                    <label className="form-label text-rose-600 font-semibold mb-1">Prazo de Entrega (Deadline)</label>
                    <input 
                        type="date"
                        className="form-input w-full border-rose-200 focus:ring-rose-500"
                        value={formData.deadline}
                        onChange={e => setFormData({...formData, deadline: e.target.value})}
                    />
                </div>
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
