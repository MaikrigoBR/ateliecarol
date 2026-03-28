import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { FileText, CheckCircle, Package, ExternalLink, MessageCircle, Calendar, X, PlayCircle, Image as ImageIcon } from 'lucide-react';
import db from '../services/database.js';
import { PromoBanner } from '../components/PromoBanner';
import { getPublicApiUrl } from '../utils/publicRuntime.js';

export function ProposalView() {
  const { id } = useParams();
  const location = useLocation();
  const [budget, setBudget] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyConfig, setCompanyConfig] = useState({
    companyName: 'Estudio Criativo',
    logoBase64: null,
    whatsapp: '',
    instagram: ''
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const shareToken = searchParams.get('t') || '';

        const loadProductsForBudget = async (proposal) => {
          if (!proposal?.items?.length) return [];

          const productIds = Array.from(
            new Set(
              proposal.items
                .map((item) => String(item.productId || ''))
                .filter((productId) => productId && !productId.startsWith('equip-') && !productId.startsWith('mat-'))
            )
          );

          const loadedProducts = await Promise.all(
            productIds.map((productId) => db.getById('products', productId))
          );

          return loadedProducts.filter(Boolean);
        };

        let found = null;
        let loadedProducts = [];
        let settings = null;

        try {
          const query = new URLSearchParams({ id: String(id) });
          if (shareToken) query.set('t', shareToken);

          const response = await fetch(`${getPublicApiUrl('/api/get_public_proposal')}?${query.toString()}`);
          if (response.ok) {
            const payload = await response.json();
            found = payload.budget || null;
            loadedProducts = Array.isArray(payload.products) ? payload.products : [];
            settings = payload.companyConfig || null;
          }
        } catch (apiError) {
          console.warn('Public proposal API unavailable, trying direct database fallback.', apiError);
        }

        if (!found) {
          found = await db.getById('budgets', String(id));

          if (found) {
            loadedProducts = await loadProductsForBudget(found);
          }

          try {
            settings = await db.getById('settings', 'global');
          } catch (settingsError) {
            console.error('Could not fetch settings', settingsError);
          }
        }

        setBudget(found || null);
        setProducts(loadedProducts || []);

        if (settings) {
          setCompanyConfig(settings);
          document.title = `${settings.tabTitle || settings.companyName || 'Atelie'} | Proposta ${id}`;
        } else {
          document.title = `Proposta ${id}`;
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [id, location.search]);

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

  const customerFirstName = String(budget.customerName || 'Cliente').split(' ')[0];
  const validUntilLabel = budget.validUntil
    ? new Date(budget.validUntil).toLocaleDateString('pt-BR')
    : 'data não informada';

  const handleWhatsAppAction = (actionText) => {
    let phone = companyConfig.whatsapp || '';

    if (!phone) {
      try {
        const saved = localStorage.getItem('stationery_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.whatsapp) phone = parsed.whatsapp;
        }
      } catch (error) {
        console.error('Could not read local config', error);
      }
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '');
      const normalizedNumber = digits.startsWith('55') ? digits : `55${digits}`;
      const waLink = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(`Olá! Sobre a proposta #${budget.id}:\n\n${actionText}`)}`;
      window.open(waLink, '_blank');
      return;
    }

    alert('O contato do ateliê ainda não foi configurado.');
  };

  const openProductModal = (registryId) => {
    const product = products.find((item) => String(item.id) === String(registryId));
    if (!product) return;

    setSelectedProduct(product);
    setActiveImageIndex(0);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const renderProductModal = () => {
    if (!selectedProduct) return null;

    const images = selectedProduct.images && selectedProduct.images.length > 0
      ? selectedProduct.images
      : (selectedProduct.image ? [selectedProduct.image] : []);

    const hasMedia = images.length > 0 || selectedProduct.videoUrl;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={closeModal}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={closeModal}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <X size={18} color="#334155" />
          </button>

          <div style={{ backgroundColor: '#f1f5f9', position: 'relative' }}>
            {images.length > 0 ? (
              <img src={images[activeImageIndex]} alt={selectedProduct.name} style={{ width: '100%', height: '300px', objectFit: 'contain', backgroundColor: '#f8fafc' }} />
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                <ImageIcon size={64} />
              </div>
            )}
          </div>

          {hasMedia && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', backgroundColor: 'white', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
              {images.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: activeImageIndex === index ? '2px solid var(--primary)' : '2px solid transparent',
                    flexShrink: 0
                  }}
                >
                  <img src={image} alt={`thumb-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}

              {selectedProduct.videoUrl && (
                <a
                  href={selectedProduct.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    textDecoration: 'none',
                    flexShrink: 0
                  }}
                  title="Assistir video"
                >
                  <PlayCircle size={24} />
                </a>
              )}
            </div>
          )}

          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: 'white' }}>
            <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>
              {selectedProduct.category}
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', lineHeight: '1.2' }}>
              {selectedProduct.name}
            </h3>

            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {selectedProduct.description || 'Nenhuma descrição detalhada disponível.'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfcfe', display: 'flex', justifyContent: 'center', padding: '40px 20px', fontFamily: 'var(--font-primary)' }}>
      {renderProductModal()}

      <div style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {companyConfig.logoBase64 && (
            <img src={companyConfig.logoBase64} alt="Company Logo" style={{ maxWidth: '120px', maxHeight: '120px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
          )}

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
            {companyConfig.companyName || 'Atelie Estudio Criativo'}
          </h1>
          <p style={{ color: '#64748b' }}>Proposta Comercial Premium</p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px dashed #e2e8f0' }}>
            <div>
              <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>Proposta #{budget.id}</p>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                Olá, {customerFirstName}!
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Válido até {validUntilLabel}
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
            {budget.items?.map((item, index) => {
              const productRegistry = products.find((product) => String(product.id) === String(item.productId));

              let imageUrl = null;
              if (productRegistry?.images && productRegistry.images.length > 0) imageUrl = productRegistry.images[0];
              else if (productRegistry?.image) imageUrl = productRegistry.image;

              return (
                <div
                  key={index}
                  onClick={() => openProductModal(item.productId)}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    alignItems: 'center',
                    cursor: productRegistry ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(event) => {
                    if (!productRegistry) return;
                    event.currentTarget.style.borderColor = 'var(--primary)';
                    event.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(event) => {
                    if (!productRegistry) return;
                    event.currentTarget.style.borderColor = '#e2e8f0';
                    event.currentTarget.style.transform = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      flexShrink: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={24} style={{ color: '#94a3b8' }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.productName}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      Quantidade: {item.quantity || item.qty} {item.quantity > 1 ? 'unidades' : 'unidade'}
                      {productRegistry && <span style={{ marginLeft: '6px', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>(Ver detalhes)</span>}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>R$ {(item.price || 0).toFixed(2).replace('.', ',')} un</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>R$ {(item.total || 0).toFixed(2).replace('.', ',')}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Investimento Total</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>R$ {(budget.total || 0).toFixed(2).replace('.', ',')}</div>
            </div>
          </div>

          {budget.status === 'Aprovado' ? (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>Proposta Aprovada!</h3>
              <p style={{ color: '#15803d', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Que alegria! Esta proposta já foi validada e seu pedido está em andamento. Acompanhe as novidades pelo contato do nosso ateliê.
              </p>
            </div>
          ) : budget.status === 'Rejeitado' ? (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <X size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>Proposta Cancelada</h3>
              <p style={{ color: '#b91c1c', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Esta proposta não é mais válida. Caso precise de um novo orçamento, entre em contato conosco.
              </p>
            </div>
          ) : (
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
          )}

          <PromoBanner promoConfig={companyConfig?.promoBanner} companyConfig={companyConfig} />
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '0.8rem' }}>
          Documento gerado digitalmente.
          <br />
          &copy; {new Date().getFullYear()} {companyConfig.companyName || 'Estudio Criativo'}
        </div>
      </div>
    </div>
  );
}
