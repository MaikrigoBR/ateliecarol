
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Printer, Play, Edit, AlertCircle, Clock, Share2, DollarSign, Package, Calendar } from 'lucide-react';
import db from '../services/database.js';

import { NewOrderModal } from '../components/NewOrderModal';
import { ConfirmOrderPaymentModal } from '../components/ConfirmOrderPaymentModal';
import { ProductionSheetModal } from '../components/ProductionSheetModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [companyConfig, setCompanyConfig] = useState({ companyName: 'Estúdio Criativo', logoBase64: null });

  useEffect(() => {
    try {
        const saved = localStorage.getItem('stationery_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.companyName || parsed.logoBase64) setCompanyConfig(parsed);
        }
    } catch(e){}
  }, []);
  
  // Payment Confirmation State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [orderForProduction, setOrderForProduction] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const fetchOrders = async () => {
    const allOrders = await db.getAll('orders');
    setOrders(allOrders);
    setFilteredOrders(allOrders);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const results = orders.filter(order => {
      const search = searchTerm.toLowerCase();
      const idStr = order.id ? order.id.toString() : '';
      const matchesSearch = order.customer.toLowerCase().includes(search) || idStr.toLowerCase().includes(search);
      
      let orderStatusLabel = order.status || 'Novo';
      if (orderStatusLabel === 'processing') orderStatusLabel = 'Em Produção';
      if (orderStatusLabel === 'completed') orderStatusLabel = 'Concluído';

      const matchesStatus = statusFilter === '' || orderStatusLabel === statusFilter;

      return matchesSearch && matchesStatus;
    });
    
    // Sort from newest to oldest
    results.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        // Fallback to id if dates are equal/missing
        if (dateA === dateB) {
            // Assume ID could be a reliable timestamp-like fallback or simply numeric/string sort Desc
            return String(b.id).localeCompare(String(a.id));
        }
        return dateB - dateA;
    });

    setFilteredOrders(results);
  }, [searchTerm, statusFilter, orders]);

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
      await db.delete('orders', id);
      fetchOrders();
    }
  };

  const handleCompleteOrder = (order) => {
    if (order.status === 'Concluído') return;
    setSelectedOrderForPayment(order);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (transactionData) => {
      const order = selectedOrderForPayment;
      if (!order) return;

      const surcharge = parseFloat(transactionData.surchargeAmount) || 0;
      // Adjust total only if explicitly adding interest/surcharge, otherwise respect original total
      // But typically "interest" for installments increases the cost.
      // If user says "10% interest", we add to total.
      const currentTotal = order.total || 0;
      const newTotal = currentTotal + surcharge;
      
      const amountReceived = parseFloat(transactionData.amount);
      const previouslyPaid = (order.amountPaid || 0);
      const totalPaid = previouslyPaid + amountReceived;

      // Determine Status
      let newStatus = order.status;
      // Precision tolerance for float comparison
      if (totalPaid >= newTotal - 0.05) {
          newStatus = 'Concluído';
      } else {
          newStatus = 'Pagamento Parcial';
      }

      const balanceDue = Math.max(0, newTotal - totalPaid);

      // 1. Update Order
      await db.update('orders', order.id, { 
          status: newStatus,
          total: newTotal, // Persist the new total including interest
          amountPaid: totalPaid,
          balanceDue: balanceDue,
          nextDueDate: balanceDue > 0 ? transactionData.nextDueDate : null,
          lastPaymentDate: new Date().toISOString().split('T')[0]
      });

      // 2. Update Account Balance
      if (transactionData.targetAccountId) {
          try {
              const account = await db.getById('accounts', transactionData.targetAccountId);
              if (account) {
                  await db.update('accounts', account.id, {
                      balance: (parseFloat(account.balance) || 0) + amountReceived
                  });
              }
          } catch (error) {
              console.error("Error updating account balance:", error);
          }
      }

      // 3. Create Finance Transaction
      await db.create('transactions', {
          orderId: order.id,
          description: `Recebimento Pedido #${order.id.toString().substring(0,8)}... - ${order.customer} (${transactionData.condition === 'installment' ? `${transactionData.installments}x` : 'À vista'})`,
          amount: amountReceived,
          type: 'income',
          category: 'Vendas de Produtos',
          date: new Date().toISOString().split('T')[0],
          status: 'paid',
          paymentMethod: transactionData.method,
          paymentCondition: transactionData.condition,
          installments: transactionData.installments,
          surcharge: surcharge,
          accountId: transactionData.targetAccountId // Link to account
      });

      // 3. Update Customer Stats
      const customers = await db.getAll('customers');
      const customer = customers.find(c => c.name === order.customer);
      if (customer) {
          // Increment totalSpent by the *amount received* this time? 
          // Or by the Order Total? Usually Total Spent = Sum of Order Totals.
          // But if partial payment...
          // Let's stick to adding the *Order Total* only once when it's first completed?
          // Or update it carefully.
          // Safer: Recalculate from all orders? Expensive.
          // For now, let's add `amountReceived` to `totalPaidByCustomer`.
          // And `totalOrders` only if it's the first payment?
          // This logic is tricky. Let's simplify: Just update lastActive.
          await db.update('customers', customer.id, {
              lastOrderDate: new Date().toISOString().split('T')[0]
          });
      }

      setIsPaymentModalOpen(false);
      setSelectedOrderForPayment(null);
      fetchOrders();
  };

  const handleSendToProduction = async (order) => {
      // 1. Find Product(s) and Check/Deduct Stock
      let itemsToCheck = [];
      if (order.cartItems && order.cartItems.length > 0) {
          itemsToCheck = order.cartItems.map(item => ({ productId: item.productId, qty: parseInt(item.quantity) || 1 }));
      } else if (order.productId) {
          itemsToCheck = [{ productId: order.productId, qty: parseInt(order.items) || 1 }];
      }

      if (itemsToCheck.length > 0) {
          const inventory = await db.getAll('inventory');
          const missingMaterials = [];
          const deductions = {}; // { materialId: totalQtyToDeduct }

          for (const item of itemsToCheck) {
              if (!item.productId) continue;
              const product = await db.getById('products', item.productId);
              if (product && product.materials) {
                  product.materials.forEach(mat => {
                      const requiredQty = parseFloat(mat.qty) * item.qty;
                      if (deductions[mat.id]) deductions[mat.id] += requiredQty;
                      else deductions[mat.id] = requiredQty;
                  });
              }
          }

          // Check Availability
          Object.keys(deductions).forEach(matId => {
              const stockItem = inventory.find(i => String(i.id) === String(matId));
              const requiredTotal = deductions[matId];
              if (!stockItem || parseFloat(stockItem.quantity) < requiredTotal) {
                  missingMaterials.push(`${stockItem?.name || 'Material ID '+matId} (Necessário: ${requiredTotal.toFixed(2)}, Disponível: ${stockItem ? parseFloat(stockItem.quantity).toFixed(2) : 0})`);
              }
           });

          if (missingMaterials.length > 0) {
              alert(`Não é possível iniciar produção. Faltam insumos no estoque para este(s) produto(s):\n- ${missingMaterials.join('\n- ')}`);
              return;
          }

          // Deduct Stock
          await Promise.all(Object.keys(deductions).map(async (matId) => {
              const stockItem = inventory.find(i => String(i.id) === String(matId));
              if (stockItem) {
                  await db.update('inventory', stockItem.id, {
                      quantity: parseFloat(stockItem.quantity) - deductions[matId]
                  });
              }
          }));
      }

      // 2. Update Status
      await db.update('orders', order.id, { status: 'processing', productionStep: 'pending' });

      // ---------- AUTOMAÇÃO WHATSAPP (CRM) ----------
      try {
          const customers = await db.getAll('customers');
          const cName = order.customerName || order.customer || '';
          
          const customerObj = customers.find(c => c.name === cName);
          
          const showToast = (title, message, type = 'success') => {
              const toast = document.createElement('div');
              const isError = type === 'error';
              const color = isError ? '#ef4444' : '#25D366';
              const icon = isError 
                  ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
                  : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;

              toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 9999; display: flex; align-items: center; gap: 12px; transition: all 0.3s ease; transform: translateY(100px); opacity: 0;';
              toast.innerHTML = `
                  <div style="background: ${color}; padding: 8px; border-radius: 50%; display: flex;">
                      ${icon}
                  </div>
                  <div>
                      <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">${title}</div>
                      <div style="color: #64748b; font-size: 0.75rem; max-width: 250px;">${message}</div>
                  </div>
              `;
              document.body.appendChild(toast);
              setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 100);
              setTimeout(() => { toast.style.transform = 'translateY(100px)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 5000);
          };

          if (customerObj && customerObj.phone) {
              const num = customerObj.phone.replace(/\D/g, '');
              if (num.length >= 10) {
                  let companyName = 'nossa equipe';
                  try {
                      const saved = localStorage.getItem('stationery_config');
                      if (saved) {
                          const parsed = JSON.parse(saved);
                          if (parsed.companyName) companyName = parsed.companyName;
                      }
                  } catch(e) {}

                  const baseUrl = window.location.href.split('#')[0];
                  const trackingLink = `${baseUrl}#/status/${order.id}`;
                  const firstName = customerObj.name.split(' ')[0];
                  
                  const msgText = `Olá ${firstName}!\n✨ O seu pedido #${order.id.toString().substring(0,8)} acaba de entrar na nossa *[Fila de Produção]*.\n\nAcompanhe a mágica acontecendo em tempo real com a ${companyName} pelo Link abaixo:\n\n${trackingLink}`;
                  
                  const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
                  
                  fetch(`${apiUrl}/api/campaign`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          targets: [{ phone: num, message: msgText }]
                      })
                  }).then(res => {
                      if(res.ok) {
                          showToast('Automação CRM', `WhatsApp enviado para ${firstName}!`, 'success');
                      } else {
                          showToast('Falha no Envio', `A API recusou a conexão (Erro ${res.status}).`, 'error');
                      }
                  }).catch(e => {
                      showToast('Servidor Offline', `Erro de conexão: ${e.message}`, 'error');
                  });
              } else {
                  showToast('Telefone Inválido', `O número de ${cName} está incompleto.`, 'error');
              }
          } else {
              showToast('Sem Contato', `Não encontramos o Zap de: ${cName}`, 'error');
          }
      } catch (err) {
          console.error(err);
      }
      // ----------------------------------------------

      fetchOrders();
  };

  const getStatusBadge = (status) => {
    let style = { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }; // Neutral default
    let label = status;

    switch (status) {
        case 'Novo':
            style = { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }; // Light Blue
            break;
        case 'processing':
        case 'Em Produção':
            label = 'Em Produção';
            style = { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }; // Amber
            break;
        case 'Pronto para Retirada':
            style = { backgroundColor: '#fae8ff', color: '#a21caf', border: '1px solid #f5d0fe' }; // Fuchsia/Purple
            break;
        case 'Concluído':
        case 'completed':
            label = 'Concluído';
            style = { backgroundColor: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' }; // Emerald
            break;
        case 'Pagamento Parcial':
            label = 'Pgto. Parcial';
            style = { backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }; // Orange
            break;
        case 'Despachado':
            style = { backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }; // Indigo
            break;
        case 'Aguardando Aprovação':
            style = { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }; // Red
            break;
    }

    return <span className="badge" style={style}>{label}</span>;
  };

  const getFinancialStatus = (order) => {
      const total = order.total || 0;
      const paid = order.amountPaid || 0;
      const balance = order.balanceDue || 0;
      const isOverdue = order.nextDueDate && new Date(order.nextDueDate) < new Date();

      if (balance <= 0.05 && total > 0) return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Pago</span>;
      if (paid === 0) return <span className="text-xs text-muted">Pendente</span>;

      return (
          <div className="flex flex-col text-xs">
              <span className="font-bold text-gray-700">Pago: R$ {paid.toFixed(2)}</span>
              <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                  Restam: R$ {balance.toFixed(2)}
              </span>
              {order.nextDueDate && (
                  <span className={`flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-700 font-bold' : 'text-gray-500'}`}>
                      {isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                      {new Date(order.nextDueDate).toLocaleDateString()}
                  </span>
              )}
          </div>
      );
  };

  const summary = {
    count: filteredOrders.length,
    revenue: filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0),
    items: filteredOrders.reduce((acc, order) => {
      if (order.cartItems && order.cartItems.length > 0) {
         return acc + order.cartItems.reduce((a, b) => a + (parseInt(b.quantity) || 1), 0);
      }
      return acc + (parseInt(order.items) || 0);
    }, 0)
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ marginBottom: 0, width: '300px' }}>
            <input 
                type="text" 
                placeholder="Buscar pedidos (Cliente ou ID)..." 
                className="form-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            <div className="input-group" style={{ marginBottom: 0, width: '220px' }}>
                <select 
                    className="form-input" 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)' }}
                >
                    <option value="">Todos os Status</option>
                    <option value="Novo">Novo</option>
                    <option value="Em Produção">Em Produção</option>
                    <option value="Pronto para Retirada">Pronto para Retirada</option>
                    <option value="Pagamento Parcial">Pagamento Parcial</option>
                    <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                    <option value="Concluído">Concluído</option>
                </select>
            </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setOrderToEdit(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          Novo Pedido
        </button>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Clock size={24} /></div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Pedidos Filtrados</p>
                  <p className="text-xl font-bold text-gray-800">{summary.count}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={24} /></div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Subtotal (Filtrado)</p>
                  <p className="text-xl font-bold text-gray-800">R$ {summary.revenue.toFixed(2).replace('.', ',')}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Package size={24} /></div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Itens Produzidos</p>
                  <p className="text-xl font-bold text-gray-800">{summary.items}</p>
              </div>
          </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
                Nenhum pedido encontrado.
            </div>
        ) : filteredOrders.map(order => (
            <div 
                key={order.id} 
                onClick={() => { setSelectedOrderDetails(order); setIsDetailsModalOpen(true); }}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center relative"
            >
                {/* Left section: ID & Customer */}
                <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0 text-gray-400 font-bold text-sm tracking-wider">
                        #{String(order.id).slice(-4).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 text-lg truncate whitespace-nowrap overflow-hidden">{order.customer || 'Cliente não identificado'}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium whitespace-nowrap flex-wrap">
                            <span className="flex items-center gap-1"><Calendar size={12}/> {order.date ? new Date(order.date).toLocaleDateString() : '--'}</span>
                            {order.deadline && (
                                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${new Date(order.deadline) < new Date() ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Clock size={12}/> Vence {new Date(order.deadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle section: Status & Finance */}
                <div className="flex-1 flex flex-row lg:flex-row gap-8 justify-between lg:justify-center items-center w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                    <div className="flex flex-col items-start w-1/2 lg:w-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Status</span>
                        {getStatusBadge(order.status)}
                    </div>
                    <div className="flex flex-col items-end lg:items-start w-1/2 lg:w-auto text-right lg:text-left">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Financeiro</span>
                        {getFinancialStatus(order)}
                    </div>
                </div>

                {/* Right section: Total & Actions */}
                <div className="flex-1 lg:flex-none flex flex-col sm:flex-row lg:flex-row items-start sm:items-center justify-between lg:justify-end gap-6 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                    <div className="text-left lg:text-right shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Total ({order.items} iten{order.items !== 1 ? 's' : ''})</span>
                        <div className="text-xl font-black text-gray-800">
                            <span className="text-sm text-gray-400 font-semibold mr-1">R$</span>
                            {((order.total || 0)).toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto sm:ml-0 overflow-x-auto pb-2 sm:pb-0" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100 flex items-center justify-center p-0" title="Excluir" onClick={() => handleDelete(order.id)}>
                            <Trash2 size={16} />
                        </button>
                        <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors border border-transparent hover:border-blue-100 flex items-center justify-center p-0" title="Editar" onClick={() => { setOrderToEdit(order); setIsModalOpen(true); }}>
                            <Edit size={16} />
                        </button>
                        <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-500 hover:text-pink-600 transition-colors border border-pink-100 hover:border-pink-200 flex items-center justify-center p-0" title="Enviar Link de Rastreio (WhatsApp)" onClick={() => {
                            const link = window.location.origin + window.location.pathname + "#/status/" + order.id;
                            const text = encodeURIComponent(`Olá ${order.customer.split(' ')[0]}!\n✨ Acompanhe em tempo real a mágica acontecendo no seu pedido com a ${companyConfig.companyName || 'nossa equipe'} pelo Link abaixo:\n\n${link}`);
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}>
                            <Share2 size={16} />
                        </button>
                        <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors border border-gray-100 hover:border-gray-300 flex items-center justify-center p-0" title="Imprimir Ordem de Produção" onClick={() => { setOrderForProduction(order); setIsProductionModalOpen(true); }}>
                            <Printer size={16} />
                        </button>
                        {order.status === 'Novo' && (
                            <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 hover:border-amber-300 flex items-center justify-center p-0" title="Iniciar Produção" onClick={() => handleSendToProduction(order)}>
                                <Play size={16} />
                            </button>
                        )}
                        {order.status !== 'Concluído' && (
                            <button className="btn btn-icon w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 hover:border-emerald-300 flex items-center justify-center p-0" title="Finalizar e Receber" onClick={() => handleCompleteOrder(order)}>
                                <CheckCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        ))}
      </div>

      <NewOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onOrderCreated={handleOrderCreated} 
        orderToEdit={orderToEdit}
      />

      <ConfirmOrderPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        order={selectedOrderForPayment}
      />
        
      <ProductionSheetModal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        order={orderForProduction}
      />

      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        order={selectedOrderDetails}
        companyConfig={companyConfig}
        onEdit={(o) => { setOrderToEdit(o); setIsModalOpen(true); }}
        onDelete={(id) => handleDelete(id)}
        onPrint={(o) => { setOrderForProduction(o); setIsProductionModalOpen(true); }}
        onShare={(o) => {
            const link = window.location.origin + window.location.pathname + "#/status/" + o.id;
            const text = encodeURIComponent(`Olá ${o.customer.split(' ')[0]}!\n✨ Acompanhe em tempo real a mágica acontecendo no seu pedido com a ${companyConfig.companyName || 'nossa equipe'} pelo Link abaixo:\n\n${link}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }}
        onStartProduction={(o) => handleSendToProduction(o)}
        onComplete={(o) => handleCompleteOrder(o)}
      />

    </div>
  );
}
