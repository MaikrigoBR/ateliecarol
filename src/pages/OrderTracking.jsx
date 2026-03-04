import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, CheckCircle, Clock, Truck, Award, Palette, Printer } from 'lucide-react';
import db from '../services/database.js';

export function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyConfig, setCompanyConfig] = useState({ companyName: 'Estúdio Criativo', logoBase64: null });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const allOrders = await db.getAll('orders');
        // Handle string/int matching
        const found = allOrders.find(o => String(o.id) === String(id));
        setOrder(found || null);

        // Fetch company branding
        try {
            const settings = await db.getById('settings', 'global');
            if (settings) {
                setCompanyConfig(settings);
                document.title = `${settings.companyName || 'Ateliê'} | Rastreio`;
            }
        } catch(e) { console.error("Could not fetch settings", e); }
      } catch (error) {
        console.error("Error fetching order for tracking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: 'var(--primary)', fontWeight: 'bold' }}>
          Consultando a magia...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center' }}>
        <Package size={64} style={{ color: '#cbd5e1', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>Pedido não encontrado</h2>
        <p style={{ color: '#64748b', marginTop: '10px' }}>Verifique se o link está correto ou entre em contato com o ateliê.</p>
      </div>
    );
  }

  const steps = [
    { id: 'Novo', icon: <Clock size={24} />, label: 'Na Fila', desc: 'Aguardando início' },
    { id: 'pending', icon: <Palette size={24} />, label: 'Arte & Design', desc: 'Em diagramação ou análise' },
    { id: 'printing', icon: <Printer size={24} />, label: 'Na Produção', desc: 'Imprimindo & Acabamento' },
    { id: 'completed', icon: <Award size={24} />, label: 'Pronto!', desc: 'Finalizado com amor' }
  ];

  const getActiveIndex = (currentStep, itemStatus) => {
      let index = 0;
      if (itemStatus === 'Novo') index = 0;
      if (currentStep === 'pending' || currentStep === 'design' || itemStatus === 'processing') index = 1;
      if (currentStep === 'printing' || currentStep === 'finishing' || currentStep === 'cutting') index = 2;
      if (currentStep === 'completed' || itemStatus === 'Concluído' || itemStatus === 'Pronto para Retirada') index = 3;
      return index;
  };

  const itemsToTrack = (order.cartItems && order.cartItems.length > 0) 
      ? order.cartItems.map((item, idx) => ({
          id: idx,
          name: item.name || 'Produto Base',
          quantity: item.quantity || 1,
          productionStep: item.productionStep || order.productionStep || 'Novo',
          status: item.productionStep === 'completed' ? 'Concluído' : order.status
      }))
      : [{
          id: 0,
          name: order.productName || 'Itens do Pedido',
          quantity: order.items || 1,
          productionStep: order.productionStep || 'Novo',
          status: order.status
      }];

  const isAllCompleted = itemsToTrack.every(i => getActiveIndex(i.productionStep, i.status) === 3);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfcfe', display: 'flex', justifyContent: 'center', padding: '40px 20px', fontFamily: 'var(--font-primary)' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        
        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            {companyConfig.logoBase64 && (
                <img src={companyConfig.logoBase64} alt="Company Logo" style={{ maxWidth: '120px', maxHeight: '120px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
            )}
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
                {companyConfig.companyName || 'Ateliê Estúdio Criativo'}
            </h1>
            <p style={{ color: '#64748b' }}>Acompanhamento Mágico do seu Pedido</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #e2e8f0' }}>
             <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>Pedido #{order.id?.toString().substring(0,8)}</p>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                    Olá, {order.customer?.split(' ')[0]}!
                </h2>
             </div>
             <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                {isAllCompleted ? 'Finalizado' : 'Em Andamento'}
             </div>
          </div>

          <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '30px', lineHeight: '1.6' }}>
             Seu pedido contendo <strong>{order.items} iten(s)</strong> está passando pela nossa linha de produção carinhosa. Veja o status de cada item abaixo:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {itemsToTrack.map((item, idx) => {
                  const activeIndex = getActiveIndex(item.productionStep, item.status);
                  
                  return (
                      <div key={item.id} style={{ paddingTop: idx > 0 ? '40px' : '0', borderTop: idx > 0 ? '1px dashed #e2e8f0' : 'none' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#334155', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Package size={20} style={{ color: 'var(--primary)' }} /> {item.quantity}x {item.name}
                          </h3>
                          
                          {/* Vertical Timeline */}
                          <div style={{ position: 'relative' }}>
                             {/* Background Line */}
                             <div style={{ position: 'absolute', left: '20px', top: '24px', bottom: '24px', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>
                             
                             {/* Active Line Progress */}
                             <div style={{ 
                                 position: 'absolute', left: '20px', top: '24px', width: '2px', 
                                 backgroundColor: 'var(--primary)', zIndex: 1,
                                 height: `${(activeIndex / (steps.length - 1)) * 100}%`,
                                 transition: 'height 1s ease-in-out'
                             }}></div>

                             {steps.map((step, index) => {
                                 const isCompleted = index <= activeIndex;
                                 const isActive = index === activeIndex;
                                 return (
                                     <div key={step.id} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: index === steps.length - 1 ? '0' : '40px', position: 'relative', zIndex: 2 }}>
                                         <div style={{ 
                                             width: '42px', height: '42px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                                             backgroundColor: isActive ? 'var(--primary)' : (isCompleted ? '#f1f5f9' : 'white'),
                                             color: isActive ? 'white' : (isCompleted ? 'var(--primary)' : '#cbd5e1'),
                                             border: `2px solid ${isCompleted ? 'var(--primary)' : '#e2e8f0'}`,
                                             transition: 'all 0.5s ease',
                                             boxShadow: isActive ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none'
                                         }}>
                                             {isCompleted && !isActive ? <CheckCircle size={20} /> : step.icon}
                                         </div>
                                         <div style={{ paddingTop: '8px' }}>
                                             <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: isActive ? 700 : 600, color: isActive ? '#1e293b' : (isCompleted ? '#334155' : '#94a3b8') }}>
                                                 {step.label}
                                             </h4>
                                             <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                                 {step.desc}
                                             </p>
                                         </div>
                                     </div>
                                 );
                             })}
                          </div>
                      </div>
                  );
              })}
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '0.8rem' }}>
            Atualizado automaticamente em tempo real.<br/>
            &copy; {new Date().getFullYear()} {companyConfig.companyName || 'Estúdio Criativo'}
        </div>

      </div>
    </div>
  );
}
