import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckCircle, Package, ExternalLink, MessageCircle, Calendar } from 'lucide-react';
import db from '../services/database.js';

export function ProposalView() {
  const { id } = useParams();
  const [budget, setBudget] = parseInt ? useState(null) : useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyConfig, setCompanyConfig] = useState({ companyName: 'Estúdio Criativo', logoBase64: null, whatsapp: '' });

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const allBudgets = await db.getAll('budgets');
        const found = allBudgets?.find(o => String(o.id) === String(id));
        setBudget(found || null);

        const allProducts = await db.getAll('products');
        setProducts(allProducts || []);

        // Fetch company branding & contact info
        try {
            const settings = await db.getById('settings', 'global');
            if (settings) {
                setCompanyConfig(settings);
                document.title = `${settings.companyName || 'Ateliê'} | Proposta ${id}`;
            }
        } catch(e) { console.error("Could not fetch settings", e); }
      } catch (error) {
        console.error("Error fetching proposal:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: 'var(--primary)', fontWeight: 'bold' }}>
          Preparando algo especial...
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center' }}>
        <FileText size={64} style={{ color: '#cbd5e1', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>Proposta não encontrada</h2>
        <p style={{ color: '#64748b', marginTop: '10px' }}>O link pode ter expirado ou estar incorreto.</p>
      </div>
    );
  }

  const handleWhatsAppAction = (actionText) => {
     let phone = companyConfig.whatsapp || '';
     if (!phone) {
         // Fallback se não tiver WhatsApp na config (vamos tentar pegar do localstorage se houver)
         try {
             const saved = localStorage.getItem('stationery_config');
             if (saved) {
                 const parsed = JSON.parse(saved);
                 if (parsed.whatsapp) phone = parsed.whatsapp;
             }
         } catch(e){}
     }
     
     if(phone) {
         const num = phone.replace(/\D/g, '');
         const waLink = `https://wa.me/55${num}?text=${encodeURIComponent(`Olá! Sobre a proposta #${budget.id}:\n\n${actionText}`)}`;
         window.open(waLink, '_blank');
     } else {
         alert("O contato do ateliê ainda não foi configurado.");
     }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfcfe', display: 'flex', justifyContent: 'center', padding: '40px 20px', fontFamily: 'var(--font-primary)' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        
        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            {companyConfig.logoBase64 && (
                <img src={companyConfig.logoBase64} alt="Company Logo" style={{ maxWidth: '120px', maxHeight: '120px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
            )}
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
                {companyConfig.companyName || 'Ateliê Estúdio Criativo'}
            </h1>
            <p style={{ color: '#64748b' }}>Proposta Comercial Premium</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px dashed #e2e8f0' }}>
             <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>Proposta #{budget.id}</p>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                    Olá, {budget.customerName.split(' ')[0]}!
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <Calendar size={14} /> Válido até {new Date(budget.validUntil).toLocaleDateString('pt-BR')}
                </p>
             </div>
             
             {budget.status === 'Aprovado' && (
                  <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> Aprovado
                  </div>
             )}
          </div>

          <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '30px', lineHeight: '1.6' }}>
             Preparamos com muito carinho o orçamento dos itens que você solicitou. Confira os detalhes e os produtos escolhidos especialmente para você:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
              {budget.items?.map((item, idx) => {
                  const prodRegistry = products.find(p => String(p.id) === String(item.productId));
                  const imageUrl = prodRegistry?.imageBase64 || null;

                  return (
                      <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                          {/* Imagem do Produto */}
                          <div style={{ 
                               width: '70px', height: '70px', borderRadius: '8px', backgroundColor: '#e2e8f0', flexShrink: 0,
                               display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
                          }}>
                              {imageUrl ? (
                                  <img src={imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                  <Package size={24} style={{ color: '#94a3b8' }} />
                              )}
                          </div>
                          
                          {/* Detalhes do Produto */}
                          <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{item.productName}</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                  Quantidade: {item.quantity} {item.quantity > 1 ? 'unidades' : 'unidade'}
                              </p>
                          </div>
                          
                          {/* Preço */}
                          <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>R$ {(item.price || 0).toFixed(2).replace('.', ',')} un</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>R$ {(item.total || 0).toFixed(2).replace('.', ',')}</div>
                          </div>
                      </div>
                  );
              })}
          </div>

          {/* Totals */}
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Investimento Total</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>R$ {(budget.total || 0).toFixed(2).replace('.', ',')}</div>
              </div>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
             <button 
                 onClick={() => handleWhatsAppAction('Gostaria de *APROVAR* esta proposta! Vamos seguir com o pedido?')}
                 style={{ width: '100%', padding: '16px', borderRadius: '10px', border: 'none', backgroundColor: '#25D366', color: 'white', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.2)' }}
             >
                 <MessageCircle size={20} /> Aprovar pelo WhatsApp
             </button>
             <button 
                 onClick={() => handleWhatsAppAction('Tenho algumas dúvidas sobre a proposta. Podemos conversar?')}
                 style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'transparent', color: '#64748b', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
             >
                 <ExternalLink size={18} /> Tenho Dúvidas / Alterar
             </button>
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '0.8rem' }}>
            Documento gerado digitalmente.<br/>
            &copy; {new Date().getFullYear()} {companyConfig.companyName || 'Estúdio Criativo'}
        </div>

      </div>
    </div>
  );
}
