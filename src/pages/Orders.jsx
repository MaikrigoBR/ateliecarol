
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Printer, Play, Edit, AlertCircle, Clock, Share2 } from 'lucide-react';
import db from '../services/database.js';

import { NewOrderModal } from '../components/NewOrderModal';
import { ConfirmOrderPaymentModal } from '../components/ConfirmOrderPaymentModal';
import { ProductionSheetModal } from '../components/ProductionSheetModal';

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
      // 1. Find Product and Check/Deduct Stock
      if (order.productId) {
          const product = await db.getById('products', order.productId);
          if (product && product.materials) {
              const inventory = await db.getAll('inventory');
              
              const missingMaterials = [];
              product.materials.forEach(mat => {
                 const stockItem = inventory.find(i => i.id == mat.id);
                 const requiredQty = mat.qty * order.items;
                 if (!stockItem || stockItem.quantity < requiredQty) {
                     missingMaterials.push(`${mat.name} (Necessário: ${requiredQty}, Disponível: ${stockItem?.quantity || 0})`);
                 }
              });

              if (missingMaterials.length > 0) {
                  alert(`Não é possível iniciar produção. Falta material em estoque:\n- ${missingMaterials.join('\n- ')}`);
                  return;
              }

              // Deduct Stock
              // Using Promise.all for parallel updates
              await Promise.all(product.materials.map(async (mat) => {
                  const stockItem = inventory.find(i => i.id == mat.id);
                  if (stockItem) {
                      await db.update('inventory', stockItem.id, {
                          quantity: stockItem.quantity - (mat.qty * order.items)
                      });
                  }
              }));
          }
      }

      // 2. Update Status
      await db.update('orders', order.id, { status: 'processing', productionStep: 'pending' });
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

      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Cliente</th>
                <th>Data Pedido</th>
                <th>Prazo (Deadline)</th>
                <th>Status</th>
                <th>Financeiro</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="text-muted" title={order.id}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'var(--surface-hover)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          #{String(order.id).slice(-6).toUpperCase()}
                      </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{order.customer}</td>
                  <td className="text-muted">{order.date ? new Date(order.date).toLocaleDateString() : '--'}</td>
                  <td>
                    {order.deadline ? (
                        <span style={{ 
                            fontSize: '0.8rem', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            backgroundColor: new Date(order.deadline) < new Date() ? '#FEE2E2' : '#EFF6FF',
                            color: new Date(order.deadline) < new Date() ? '#DC2626' : '#2563EB',
                            fontWeight: 600
                        }}>
                            {new Date(order.deadline).toLocaleDateString()}
                        </span>
                    ) : (
                        <span className="text-muted">--</span>
                    )}
                  </td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{getFinancialStatus(order)}</td>
                  <td>{order.items}</td>
                  <td style={{ fontWeight: 600 }}>R$ {((order.total || 0)).toFixed(2).replace('.', ',')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center' }}>
                        <button 
                          className="btn btn-icon" 
                          title="Excluir"
                          onClick={() => handleDelete(order.id)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          className="btn btn-icon" 
                          title="Editar"
                          onClick={() => { setOrderToEdit(order); setIsModalOpen(true); }}
                          style={{ color: 'var(--primary)' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn btn-icon"
                          title="Enviar Link de Rastreio (WhatsApp)"
                          onClick={() => {
                          const link = window.location.origin + window.location.pathname + "#/status/" + order.id;
                          const text = encodeURIComponent(`Olá ${order.customer.split(' ')[0]}!\n✨ Acompanhe em tempo real a mágica acontecendo no seu pedido com a ${companyConfig.companyName || 'nossa equipe'} pelo Link abaixo:\n\n${link}`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                          }}
                          style={{ color: '#E1306C' }}
                        >
                            <Share2 size={16} />
                        </button>
                        <button 
                          className="btn btn-icon"
                          title="Imprimir Ordem de Produção"
                          onClick={() => {
                              setOrderForProduction(order);
                              setIsProductionModalOpen(true);
                          }}
                        >
                            <Printer size={16} />
                        </button>
                        {order.status === 'Novo' && (
                            <button 
                                className="btn btn-icon" 
                                title="Iniciar Produção"
                                onClick={() => handleSendToProduction(order)}
                                style={{ color: 'var(--warning)' }}
                            >
                                <Play size={16} />
                            </button>
                        )}
                        {order.status !== 'Concluído' && (
                            <button 
                                className="btn btn-icon" 
                                title="Finalizar e Receber"
                                onClick={() => handleCompleteOrder(order)}
                                style={{ color: 'var(--success)' }}
                            >
                                <CheckCircle size={16} />
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

    </div>
  );
}
