import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, MessageCircle, Settings, CheckCircle2, Phone, Calendar as CalendarIcon, DollarSign, AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import db from '../services/database.js';

export function DebtCollectionModal({ isOpen, onClose, customers }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'settings'
  const [orders, setOrders] = useState([]);
  
  // Settings
  const [toleranceDays, setToleranceDays] = useState(3);
  const [minDebtValue, setMinDebtValue] = useState(10);
  
  // Custom Message Template
  const [messageTemplate, setMessageTemplate] = useState("Olá {nome}, tudo bem? Passando rapidinho de forma super amigável para lembrar que o pagamento do pedido ({produtos}), referente ao valor de R$ {valor}, está em aberto. A entrega desse pedido foi programada para {entrega}. Sabemos que imprevistos acontecem! Se quiser efetuar o pagamento agora, segue o seu link de checkout seguro direto da nossa loja: \n{link_pagamento}\n\nQualquer dúvida, é só chamar!");

  const handleSaveSettings = async () => {
      try {
          await db.set('settings', 'crm_collection', {
              toleranceDays,
              minDebtValue,
              messageTemplate
          });
          alert('Configurações do CRM salvas na Nuvem com sucesso!');
      } catch (e) {
          alert('Falha ao salvar as configurações: ' + e.message);
      }
  };

  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState({ isReady: true, qrCode: null });
  const [sendingStates, setSendingStates] = useState({});

  useEffect(() => {
    let interval;
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        const allOrders = await db.getAll('orders') || [];
        setOrders(allOrders);

        try {
            const config = await db.getById('settings', 'crm_collection');
            if (config) {
                if (config.toleranceDays !== undefined) setToleranceDays(config.toleranceDays);
                if (config.minDebtValue !== undefined) setMinDebtValue(config.minDebtValue);
                if (config.messageTemplate) setMessageTemplate(config.messageTemplate);
            }
        } catch(e) { console.warn('Erro ao carregar configs do CRM', e); }

        setLoading(false);
      };
      fetchData();

      const fetchStatus = async () => {
        try {
          const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
          const r = await fetch(`${apiUrl}/api/status`);
          if (r.ok) {
            const data = await r.json();
            setApiStatus(data);
          } else {
             setApiStatus({ isReady: false, qrCode: null, error: true, errorMessage: `A API do Railway retornou Status: ${r.status}` });
          }
        } catch(e) {
          let errorMsg = e.message.includes('Failed to fetch') 
              ? "Backend Offline. A API no Railway está dormindo ou a variável VITE_WHATSAPP_API_URL na Vercel está ausente/incorreta." 
              : e.message;
          setApiStatus({ isReady: false, qrCode: null, error: true, errorMessage: errorMsg });
        }
      };
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDisparoAutomagico = async (customerName, phone, finalMsg) => {
      if (!phone || phone.length < 9) return alert('Telefone inválido');
      if (!apiStatus.isReady) return alert('API Offline ou Desconectada. Aguarde/Escaneie o QR Code.');

      try {
          const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001';
          setSendingStates(prev => ({ ...prev, [customerName]: true }));
          const response = await fetch(`${apiUrl}/api/campaign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targets: [{ phone: phone, message: finalMsg }], mediaFiles: [] })
          });
          if (response.ok) {
              setSendingStates(prev => ({ ...prev, [customerName]: 'success' }));
          } else {
              setSendingStates(prev => ({ ...prev, [customerName]: 'error' }));
              alert(`Erro ao disparar para ${customerName}.`);
          }
      } catch (e) {
          setSendingStates(prev => ({ ...prev, [customerName]: 'error' }));
          alert("Falha: " + e.message);
      }
  };

  const delinquentCustomers = useMemo(() => {
    if (!orders.length || !customers.length) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter delinquent orders
    const badOrders = orders.filter(order => {
        if (order.status === 'Cancelado') return false;
        
        const total = parseFloat(order.total) || 0;
        const paid = parseFloat(order.amountPaid) || 0;
        const balance = order.balanceDue !== undefined ? parseFloat(order.balanceDue) : Math.max(0, total - paid);
        
        if (balance < minDebtValue) return false;
        if (!order.nextDueDate) return false;

        const dueDate = new Date(order.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Difference in days
        const diffTime = today - dueDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Return if it's strictly past the tolerance allowed
        return diffDays >= toleranceDays;
    });

    // Group by customer
    const grouped = {};
    badOrders.forEach(order => {
        const cName = order.customerName || order.customer;
        if (!cName) return;
        
        if (!grouped[cName]) {
            const customerObj = customers.find(c => c.name === cName);
            grouped[cName] = {
                name: cName,
                customerRef: customerObj,
                phone: customerObj ? customerObj.phone : null,
                totalDebt: 0,
                orders: []
            };
        }
        
        const total = parseFloat(order.total) || 0;
        const paid = parseFloat(order.amountPaid) || 0;
        const balance = order.balanceDue !== undefined ? parseFloat(order.balanceDue) : Math.max(0, total - paid);
        
        grouped[cName].totalDebt += balance;
        grouped[cName].orders.push({
            id: order.id,
            balance: balance,
            dueDate: order.nextDueDate,
            deadline: order.deadline || order.nextDueDate,
            cartItems: order.cartItems || [],
            productName: order.productName,
            items: order.items
        });
    });

    return Object.values(grouped).sort((a,b) => b.totalDebt - a.totalDebt);
  }, [orders, customers, toleranceDays, minDebtValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '700px', width: '100%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c' }}>
             <AlertCircle size={22} color="#f97316" /> CRM de Relacionamento Amigável (Inadimplência)
          </h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            <p className="text-sm text-muted mb-md">
                Evite animosidades. Identifique automaticamente valores em aberto e inicie uma conversa empática com o cliente para a quitação.
            </p>

            {!apiStatus.isReady && (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '20px' }}>
                    <h3 style={{ color: '#c2410c', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                       <AlertTriangle size={20} /> Automação de Disparo Offline
                    </h3>
                    <p style={{ color: '#9a3412', fontSize: '0.9rem', marginBottom: '16px' }}>
                      A API de disparos automáticos está deslogada ou indisponível.<br/>
                      <b>{apiStatus.qrCode ? "Abra o WhatsApp > Aparelhos Conectados no seu celular e escaneie o código abaixo:" : "Tentando conectar com a API de WhatsApp (Railway)..."}</b>
                    </p>
                    {apiStatus.errorMessage && !apiStatus.qrCode && (
                        <div style={{ fontSize: '0.8rem', color: '#991b1b', background: '#fee2e2', padding: '8px', borderRadius: '6px', display: 'inline-block', border: '1px solid #f87171' }}>
                            <b>Diagnóstico Técnico:</b> {apiStatus.errorMessage}
                        </div>
                    )}
                    {apiStatus.qrCode && (
                      <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '8px' }}>
                        <img src={apiStatus.qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                      </div>
                    )}
                </div>
            )}

            <div style={{ display: apiStatus.isReady ? 'block' : 'none' }}>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button 
                   type="button"
                   style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', backgroundColor: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? '#ea580c' : '#64748b', boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                   onClick={() => setActiveTab('list')}
                 >
                   📋 Pendências Financeiras
                </button>
                <button 
                   type="button"
                   style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', backgroundColor: activeTab === 'settings' ? 'white' : 'transparent', color: activeTab === 'settings' ? '#3b82f6' : '#64748b', boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                   onClick={() => setActiveTab('settings')}
                >
                   ⚙️ Parâmetros & Mensagem
                </button>
            </div>

            {loading ? (
                <div className="py-xl text-center text-muted">Apurando pedidos...</div>
            ) : activeTab === 'settings' ? (
                <div className="animate-fade-in space-y-4">
                    <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                            <Settings size={18} /> Critérios de Identificação
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="form-label text-sm text-blue-900" style={{ fontWeight: 600 }}>Dias de Carência (Tolerância)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        min="0" 
                                        value={toleranceDays}
                                        onChange={e => setToleranceDays(Number(e.target.value))}
                                        onBlur={() => { db.set('settings', 'crm_collection', { toleranceDays, minDebtValue, messageTemplate }); }}
                                    />
                                    <span className="text-sm text-muted">dia(s)</span>
                                </div>
                                <div className="text-xs text-blue-800/60 mt-1">Ignora atrasos menores que este valor.</div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="form-label text-sm text-blue-900" style={{ fontWeight: 600 }}>Valor Mínimo da Dívida (R$)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    min="1" 
                                    step="0.5"
                                    value={minDebtValue}
                                    onChange={e => setMinDebtValue(Number(e.target.value))}
                                    onBlur={() => { db.set('settings', 'crm_collection', { toleranceDays, minDebtValue, messageTemplate }); }}
                                />
                                <div className="text-xs text-blue-800/60 mt-1">Oculta saldos de resíduos (ex: centavos faltantes).</div>
                            </div>
                        </div>
                    </div>

                    <div className="input-group mt-lg">
                        <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageCircle size={16} color="#25d366" /> Comunicação WhatsApp (Script Amigável)
                        </label>
                        <textarea 
                            className="form-input"
                            rows="7"
                            value={messageTemplate}
                            onChange={e => setMessageTemplate(e.target.value)}
                            onBlur={(e) => { db.set('settings', 'crm_collection', { toleranceDays, minDebtValue, messageTemplate: e.target.value || messageTemplate }); }}
                        />
                        <div className="text-xs text-muted" style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                            <strong>Parâmetros Injetáveis Automáticos:</strong><br/>
                            <code>{'{nome}'}</code> = Primeiro Nome do Cliente<br/>
                            <code>{'{valor}'}</code> = Valor Total da Dívida em Aberto<br/>
                            <code>{'{produtos}'}</code> = "Descrição e Qtd" dos produtos devidos<br/>
                            <code>{'{entrega}'}</code> = Data da entrega associada ao pedido<br/>
                            <code>{'{link_pagamento}'}</code> = Link mágico de Checkout para PIX/Cartão<br/>
                            <code>{'{pedidos}'}</code> = IDs dos Pedidos (Ex: #A1B2)
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSaveSettings}
                            style={{ backgroundColor: '#10b981', border: 'none', color: 'white' }}
                        >
                            Salvar Configurações
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Exibindo contas atrasadas há <b>{toleranceDays} dia(s)</b> ou mais.<br/>Soma total em atraso detectado: <b>R$ {delinquentCustomers.reduce((acc, cur) => acc + cur.totalDebt, 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</b>
                        </div>
                        <div className="badge" style={{ backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 600 }}>
                            {delinquentCustomers.length} Clientes Identificados
                        </div>
                    </div>

                    {delinquentCustomers.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <CheckCircle2 size={32} color="#22c55e" style={{ margin: '0 auto 12px auto' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#166534' }}>Tudo Limpo!</h3>
                            <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: '300px', margin: '8px auto 0' }}>
                                Nenhum cliente inadimplente encontrado com os parâmetros atuais de {toleranceDays} dia(s) de carência.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {delinquentCustomers.map((c, idx) => {
                                const firstName = c.name.split(' ')[0];
                                const moneyFormatted = c.totalDebt.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                                const ordersIds = c.orders.map(o => `#${String(o.id).substring(0,6).toUpperCase()}`).join(', ');
                                
                                const productsStr = c.orders.map(o => {
                                    if (o.cartItems && o.cartItems.length > 0) {
                                        return o.cartItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
                                    }
                                    return o.productName ? `${o.items || 1}x ${o.productName}` : 'Produtos Diversos';
                                }).join(' | ');
                                
                                const deliveryStr = c.orders.map(o => o.deadline ? new Date(o.deadline).toLocaleDateString() : 'N/A').join(', ');
                                
                                const originUrl = window.location.origin + window.location.pathname;
                                const linksCheckout = c.orders.map(o => `${originUrl}#/pagar/${o.id}`).join('\n');

                                let finalMsg = messageTemplate
                                    .replace(/{nome}/g, firstName)
                                    .replace(/{valor}/g, moneyFormatted)
                                    .replace(/{pedidos}/g, ordersIds)
                                    .replace(/{produtos}/g, productsStr)
                                    .replace(/{entrega}/g, deliveryStr)
                                    .replace(/{link_pagamento}/g, linksCheckout);
                                    
                                const waUrl = c.phone && c.phone.length > 9 
                                    ? `https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(finalMsg)}` 
                                    : null;

                                return (
                                    <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {c.name}
                                                </h4>
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                    {c.phone ? (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Phone size={12} /> {c.phone}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Phone size={12} /> Sem telefone cadastrado
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                        <DollarSign size={12} /> R$ {moneyFormatted} abertos
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {sendingStates[c.name] === 'success' ? (
                                                    <span style={{ color: '#16a34a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                        <CheckCircle2 size={16} /> Enviado
                                                    </span>
                                                ) : waUrl ? (
                                                    <>
                                                      <button 
                                                          type="button"
                                                          onClick={() => handleDisparoAutomagico(c.name, c.phone, finalMsg)}
                                                          disabled={sendingStates[c.name] === true || sendingStates[c.name] === 'success'}
                                                          className="btn btn-primary btn-sm"
                                                          style={{ backgroundColor: '#1d4ed8', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: sendingStates[c.name] === true ? 'not-allowed' : 'pointer' }}
                                                          title="Trata essa inadimplência de modo automático pela via Nuvem/API WhatsApp"
                                                      >
                                                          {sendingStates[c.name] === true ? <span className="spinner" style={{ width: '14px', height: '14px', borderTopColor: 'white' }}></span> : <Send size={14} />} 
                                                          Acionar Automação
                                                      </button>
                                                      <a 
                                                          href={waUrl} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          title="Ou use seu WhatsApp padrão do celular/PC"
                                                          className="btn btn-sm"
                                                          style={{ backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                      >
                                                          <MessageCircle size={14} /> App Convencional
                                                      </a>
                                                    </>
                                                ) : (
                                                    <button className="btn btn-secondary btn-sm" disabled title="Falta telefone válido">
                                                        Inválido
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Detalhamento:</div>
                                            {c.orders.map((o, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '4px' }}>
                                                    <span>Ped. #{String(o.id).substring(0,6).toUpperCase()}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ color: '#ef4444' }}>Vencido em {new Date(o.dueDate).toLocaleDateString()}</span>
                                                        <strong style={{ color: 'var(--text-main)' }}>R$ {o.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
}
