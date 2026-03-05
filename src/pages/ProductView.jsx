import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Star, Image as ImageIcon, MessageCircle, PlayCircle } from 'lucide-react';
import db from '../services/database';

export function ProductView() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companyConfig, setCompanyConfig] = useState({ companyName: '', whatsapp: '' });

    useEffect(() => {
        const load = async () => {
            const prod = await db.getById('products', id);
            setProduct(prod);

            try {
                const settings = await db.getById('settings', 'global');
                if (settings) {
                    setCompanyConfig(settings);
                    if (prod) document.title = `${settings.companyName || 'Catálogo'} | ${prod.name}`;
                }
            } catch(e) { console.error("Could not fetch settings", e); }

            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#64748b' }}>Carregando configuração do produto...</div>;
    }

    if (!product) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#334155' }}>Produto Inativo</h2>
                <p style={{ color: '#64748b', marginTop: '8px' }}>Este produto pode ter sido removido do catálogo ou o link está incorreto.</p>
            </div>
        );
    }

    const price = product.campaignActive 
        ? Number(product.price || 0) * (1 - (Number(product.campaignDiscount || 0)/100))
        : Number(product.price || 0);

    const message = `Olá! Gostei e tenho interesse no produto: ${product.name} (Ref: ${product.id}). Ele ainda está disponível?`;
    
    const mediaItems = product.images && product.images.length > 0 
        ? product.images 
        : (product.image ? [product.image] : []);
    
    // Check if there are thumbnails/videos to show below main image
    const hasThumbnails = mediaItems.length > 1 || product.videoUrl;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '40px' }}>
            {/* Header */}
            <header style={{ backgroundColor: '#ffffff', padding: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#f3e8ff', padding: '6px', borderRadius: '8px' }}>
                        <ShoppingBag size={20} color="#9333ea" />
                    </div>
                    Catálogo de Produtos
                </div>
            </header>

            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {product.campaignActive && (
                            <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: '#f43f5e', color: 'white', padding: '6px 14px', borderRadius: '24px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', zIndex: 2, boxShadow: '0 4px 6px rgba(244,63,94,0.3)' }}>
                                {product.campaignDiscount}% OFF 🔥
                            </div>
                        )}
                        {mediaItems.length > 0 ? (
                            <img src={mediaItems[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <ImageIcon size={64} color="#cbd5e1" />
                        )}
                    </div>

                    {hasThumbnails && (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                            gap: '8px', 
                            padding: '16px 28px 0 28px',
                            backgroundColor: '#ffffff'
                        }}>
                            {mediaItems.slice(1).map((img, idx) => (
                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'zoom-in' }}>
                                    <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </a>
                            ))}
                            {product.videoUrl && (
                                <a href={product.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', aspectRatio: '1/1', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', alignItems: 'center', justifyContent: 'center', color: '#ef4444', textDecoration: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(239,68,68,0.1)' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <PlayCircle size={28} style={{ margin: '0 auto 4px' }} />
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px' }}>VÍDEO</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    )}

                    <div style={{ padding: '24px 28px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ display: 'inline-block', color: '#7e22ce', backgroundColor: '#f3e8ff', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                {product.category || 'Visualização Geral'}
                            </span>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1.25 }}>
                                {product.name}
                            </h1>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {product.stock > 0 ? (
                                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }}></div>
                                        Em estoque ({product.stock} disponíveis)
                                    </div>
                                ) : (
                                    <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', boxShadow: '0 0 0 3px rgba(245,158,11,0.2)' }}></div>
                                        Feito sob encomenda
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
                            {product.campaignActive && (
                                <div style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 600 }}>
                                    De R$ {Number(product.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ color: product.campaignActive ? '#e11d48' : '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>R$</span>
                                <span style={{ color: product.campaignActive ? '#e11d48' : '#0f172a', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px' }}>
                                    {price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>

                        {product.description && (
                            <div style={{ marginBottom: '36px' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Detalhes do Produto</h3>
                                <div style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                    {product.description}
                                </div>
                            </div>
                        )}

                        <button 
                            style={{ 
                                width: '100%', 
                                padding: '18px', 
                                backgroundColor: '#25D366', 
                                color: '#ffffff', 
                                border: 'none', 
                                borderRadius: '16px', 
                                fontSize: '1.1rem', 
                                fontWeight: 800, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '12px',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 8px 16px -4px rgba(37, 211, 102, 0.4)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => {
                                let phone = companyConfig.whatsapp || '';
                                if (!phone) {
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
                                    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(message)}`, '_blank');
                                } else {
                                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                }
                            }}
                        >
                            <MessageCircle size={24} />
                            Fazer Pedido por WhatsApp
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
