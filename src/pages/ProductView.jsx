import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Star, Image as ImageIcon, MessageCircle, PlayCircle, Heart, Send } from 'lucide-react';
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

            const fetchedComments = await db.getAll('productComments') || [];
            setComments(fetchedComments.filter(c => c.productId === id).sort((a,b) => new Date(b.date) - new Date(a.date)));

            setLoading(false);
        };
        load();
    }, [id]);

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState({ name: '', instagram: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.name || !newComment.message) return;
        setIsSubmitting(true);
        
        const commentObj = {
            productId: id,
            name: newComment.name,
            instagram: newComment.instagram ? newComment.instagram.replace('@', '') : '',
            message: newComment.message,
            date: new Date().toISOString()
        };

        const created = await db.create('productComments', commentObj);
        if (created) {
            setComments([created, ...comments]);
            setNewComment({ name: '', instagram: '', message: '' });
        }
        setIsSubmitting(false);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#64748b' }}>Carregando configuração do produto...</div>;
    }

    if (!product || !product.isPublic) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#334155' }}>Produto Exclusivo ou Inativo</h2>
                <p style={{ color: '#64748b', marginTop: '8px', maxWidth: '400px', lineHeight: 1.6 }}>
                    Este produto chegou através de um link exclusivo, já foi removido, ou não está mais habilitado para exibição pública no catálogo no momento.
                </p>
                <Link to="/portfolio" style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>
                    <ShoppingBag size={18} /> Ver Todo o Portfólio
                </Link>
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
                    {companyConfig.companyName || 'Catálogo de Produtos'}
                </div>
                <Link to="/portfolio" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6', textDecoration: 'none', backgroundColor: '#f3e8ff', padding: '8px 16px', borderRadius: '20px' }}>
                    <ShoppingBag size={14} /> Ver Feed
                </Link>
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

                {/* Comentários / Feed Interativo (Estilo Instagram) */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -4px rgba(0,0,0,0.05)', marginTop: '24px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                        <Heart fill="#e11d48" color="#e11d48" size={24} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>O que dizem sobre este produto</h3>
                    </div>

                    {/* Formulário de Novo Comentário */}
                    <form onSubmit={handlePostComment} style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MessageCircle size={14} /> Deixe seu comentário público
                            </p>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Seu Nome completo *" 
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                    value={newComment.name}
                                    onChange={e => setNewComment({...newComment, name: e.target.value})}
                                    required
                                />
                                <input 
                                    type="text" 
                                    placeholder="Seu @Instagram" 
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                                    value={newComment.instagram}
                                    onChange={e => setNewComment({...newComment, instagram: e.target.value})}
                                />
                            </div>
                            <textarea 
                                placeholder="Adorei o trabalho! Queria saber se faz em outras cores..."
                                rows="3"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                                value={newComment.message}
                                onChange={e => setNewComment({...newComment, message: e.target.value})}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                style={{ 
                                    backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px 24px', 
                                    borderRadius: '24px', fontWeight: 700, fontSize: '0.9rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', opacity: isSubmitting ? 0.7 : 1
                                }}
                            >
                                <Send size={14} /> {isSubmitting ? 'Enviando...' : 'Publicar'}
                            </button>
                        </div>
                    </form>

                    {/* Lista de Comentários */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {comments.length > 0 ? comments.map(c => {
                            const avatarUrl = c.photoUrl ? c.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff`;

                            return (
                                <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <img src={avatarUrl} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid transparent', background: c.instagram ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' : 'none', padding: c.instagram ? '2px' : '0' }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`; }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</span>
                                            {c.instagram && (
                                                <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>@{c.instagram}</a>
                                            )}
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                                            {c.message}
                                        </p>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                            {new Date(c.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <Heart size={14} color="#cbd5e1" style={{ cursor: 'pointer', marginTop: '4px' }} />
                                </div>
                            );
                        }) : (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                                <MessageCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p style={{ fontSize: '0.95rem' }}>Nenhum comentário ainda. Seja o primeiro a avaliar!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
