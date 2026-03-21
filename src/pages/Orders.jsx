
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Printer, Play, Edit, AlertCircle, Clock, Share2, DollarSign, Package } from 'lucide-react';
import db from '../services/database.js';
import { convertToFractionalQty } from '../utils/units.js';

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

    // Deduplicate mathematically identical orders from database (in case of double imports)
    const seen = new Set();
    const dedupedResults = results.filter(item => {
        const key = `${item.id}_${item.customer}_${item.date||item.createdAt}_${item.total}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    setFilteredOrders(dedupedResults);
  }, [searchTerm, statusFilter, orders]);

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const handleCancel = async (order) => {
    const displayId = String(order.id).slice(-6).toUpperCase();
    if (order.status === 'Cancelado') {
        if (window.confirm(`Este pedido já está cancelado. Deseja arquivá-lo (Soft Delete) do seu quadro de visão?\n\n⚠️ ISSO OCULTARÁ O PEDIDO E TODOS OS REGISTROS FINANCEIROS LIGADOS A ELE DO SISTEMA!`)) {
            try {
                // 1. Arquiva a Origem (Soft Delete)
                await db.update('orders', order.id, { deleted: true, status: 'Arquivado' });
                
                // 2. Localiza e Arquiva as Transações Ligadas (Soft Delete)
                const allTrans = await db.getAll('transactions');
                let count = 0;
                for (const t of allTrans) {
                    // Matchs per ID or by description parser for legacy orphaned transactions
                    if (String(t.orderId) === String(order.id) || (t.description && t.description.includes(String(order.id).substring(0,8)))) {
                        await db.update('transactions', t.id, { deleted: true, status: 'cancelled', amount: 0 });
                        count++;
                    }
                }
                
                alert(`Arquivamento Integral Concluído: O Pedido #${displayId} foi ocultado (Soft Delete). ${count} registros financeiros (inclusive os orfãos) oram recolhidos das métricas de caixa.`);
                fetchOrders();
            } catch(e) {
                alert(`Erro Crítico na Limpeza do Pedido: ${e.message}`);
                console.error("Erro deletando:", e);
            }
        }
        return;
    }

    if (!window.confirm(`Tem certeza que deseja cancelar o pedido #${displayId} de ${order.customer}?\n\nIsso irá:\n1. Mudar o status para Cancelado.\n2. Devolver o estoque físico.\n3. Gerar Despesa de Estorno no Caixa (Se pago).`)) {
        return;
    }
    
    try {
        // 1. Marca como Cancelado
        await db.update('orders', order.id, {
            status: 'Cancelado',
            cancelDate: new Date().toISOString()
        });

        // 2. Devolve o Estoque fisicamente! (Anti-Sequestro de mercadoria)
        try {
            if (order.cartItems && order.cartItems.length > 0) {
                const allProducts = await db.getAll('products') || [];
                for (const item of order.cartItems) {
                     const product = allProducts.find(p => String(p.id) === String(item.productId));
                     if (product && product.stock !== undefined) {
                         await db.update('products', product.id, {
                             stock: product.stock + (Number(item.quantity) || 1)
                         });
                     }
                }
            }
        } catch(e) { console.error("Erro ao devolver estoque: ", e); }

        // 3. Aplica Partidas Dobradas: Gera Despesa de Estorno
        if (order.amountPaid && Number(order.amountPaid) > 0) {
            await db.create('transactions', {
                 type: 'expense',
                 amount: Number(order.amountPaid),
                 description: `[RESTITUIÇÃO/ESTORNO CONTÁBIL] Cancelamento Pedido #${displayId}`,
                 category: 'Estornos e Devoluções',
                 date: new Date().toISOString().split('T')[0],
                 status: 'paid', // Estorno imediato auto-limpo
                 orderId: String(order.id),
                 accountId: '1', // fallback para cofre principal
                 paymentMethod: 'Reembolso'
            });
        }

        alert('Sistema Auditado: Pedido cancelado com total segurança. Estoque destrancado e estorno financeiro registrado caso aplicável.');
        fetchOrders();
    } catch(e) {
        alert(`Erro Oculto ao Cancelar: ${e.message}`);
        console.error("Erro no HandleCancel:", e);
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
                  const netAmountToDeposit = amountReceived - (transactionData.gatewayFeeAmount || 0);
                  await db.update('accounts', account.id, {
                      balance: (parseFloat(account.balance) || 0) + netAmountToDeposit
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

      // 4. Create Gateway Fee Deduction (se aplicável)
      if (transactionData.gatewayFeeAmount && transactionData.gatewayFeeAmount > 0) {
          await db.create('transactions', {
              orderId: order.id,
              description: `Taxa de Adquirência (MDR) - Ref. Pedido #${order.id.toString().substring(0,8)}`,
              amount: transactionData.gatewayFeeAmount,
              type: 'expense',
              category: 'Impostos & Taxas',
              date: new Date().toISOString().split('T')[0],
              status: 'paid',
              paymentMethod: transactionData.method,
              accountId: transactionData.targetAccountId, // Withdraws the fee from exactly where it was deposited
              installments: 1
          });
      }

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
          itemsToCheck = order.cartItems.map(item => ({ productId: item.productId, qty: parseFloat(item.quantity) || 1 }));
      } else if (order.productId) {
          itemsToCheck = [{ productId: order.productId, qty: parseFloat(order.items) || 1 }];
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
                      const stockItem = inventory.find(i => String(i.id) === String(mat.id));
                      const baseUnit = stockItem ? stockItem.unit : 'un';
                      const usageUnit = mat.usageUnit || baseUnit;
                      
                      const requiredBaseQty = convertToFractionalQty(baseUnit, usageUnit, parseFloat(mat.qty)) * item.qty;
                      
                      if (deductions[mat.id]) deductions[mat.id] += requiredBaseQty;
                      else deductions[mat.id] = requiredBaseQty;
                  });
              }
          }

          // Check Availability
          Object.keys(deductions).forEach(matId => {
              const stockItem = inventory.find(i => String(i.id) === String(matId));
              const requiredTotal = deductions[matId];
              if (!stockItem || parseFloat(stockItem.quantity) < requiredTotal) {
                  const unitStr = stockItem ? stockItem.unit : 'un';
                  missingMaterials.push(`${stockItem?.name || 'Material ID '+matId} (Necessário: ${requiredTotal.toFixed(2)}${unitStr}, Disponível: ${stockItem ? parseFloat(stockItem.quantity).toFixed(2) : 0}${unitStr})`);
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
      // If balanceDue is missing in older/newer records, mathematically infer it 
      const balance = order.balanceDue !== undefined ? parseFloat(order.balanceDue) : Math.max(0, total - paid);
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
    <>
      <div className={`animate-fade-in ${isProductionModalOpen ? 'print-hidden' : ''}`} style={{ maxWidth: '1200px' }}>
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--space-xl)', overflowX: 'auto', paddingBottom: '0.5rem' }} className="hide-scrollbar">
          <div className="stat-card" style={{ borderLeftColor: '#3b82f6', minWidth: '240px', flex: 1, flexShrink: 0 }}>
              <div className="flex-1">
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Pedidos Filtrados
                  </p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {summary.count}
                  </h3>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Total listados abaixo</p>
              </div>
              <div className="stat-icon-wrapper" style={{ color: '#3b82f6', backgroundColor: '#3b82f61A' }}>
                  <Clock size={24} />
              </div>
          </div>

          <div className="stat-card" style={{ borderLeftColor: '#10b981', minWidth: '240px', flex: 1, flexShrink: 0 }}>
              <div className="flex-1">
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Subtotal (Filtrado)
                  </p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      R$ {summary.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Valor bruto projetado</p>
              </div>
              <div className="stat-icon-wrapper" style={{ color: '#10b981', backgroundColor: '#10b9811A' }}>
                  <DollarSign size={24} />
              </div>
          </div>

          <div className="stat-card" style={{ borderLeftColor: '#8b5cf6', minWidth: '240px', flex: 1, flexShrink: 0 }}>
              <div className="flex-1">
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Itens Físicos
                  </p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                      {summary.items}
                  </h3>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Volumes a produzir/entregar</p>
              </div>
              <div className="stat-icon-wrapper" style={{ color: '#8b5cf6', backgroundColor: '#8b5cf61A' }}>
                  <Package size={24} />
              </div>
          </div>
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
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr 
                    key={order.id} 
                    onClick={() => { setSelectedOrderDetails(order); setIsDetailsModalOpen(true); }}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
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
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap', width: '1%' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center', minWidth: 'max-content' }}>
                        <button 
                          onClick={() => handleCancel(order)}
                          style={{ color: order.status === 'Cancelado' ? 'var(--danger)' : '#f59e0b' }}
                          title={order.status === 'Cancelado' ? 'Excluir Definitivamente' : 'Cancelar Pedido & Estornar'}
                        >
                          {order.status === 'Cancelado' ? <Trash2 size={16} /> : <AlertCircle size={16} />}
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
                                title="Dar Baixa Manual (Balcão)"
                                onClick={() => handleCompleteOrder(order)}
                                style={{ color: 'var(--success)' }}
                            >
                                <DollarSign size={16} />
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
        onDelete={(orderObj) => handleCancel(orderObj)}
        onPrint={(o) => { setOrderForProduction(o); setIsProductionModalOpen(true); }}
        onShare={(o) => {
            const link = window.location.origin + window.location.pathname + "#/status/" + o.id;
            const text = encodeURIComponent(`Olá ${o.customer.split(' ')[0]}!\n✨ Acompanhe em tempo real a mágica acontecendo no seu pedido com a ${companyConfig.companyName || 'nossa equipe'} pelo Link abaixo:\n\n${link}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }}
        onStartProduction={(o) => handleSendToProduction(o)}
        onComplete={(o) => handleCompleteOrder(o)}
      />

    </>
  );
}
