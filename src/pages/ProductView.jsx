import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Star, Image as ImageIcon, MessageCircle, PlayCircle, Heart, Send, ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, X as CloseIcon, ZoomIn, User } from 'lucide-react';
import db from '../services/database';
import { useCart } from '../contexts/CartContext';
import { CartDrawer } from '../components/CartDrawer';
import { useClientAuth } from '../contexts/ClientAuthContext';

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
                    if (prod) document.title = `${settings.tabTitle || settings.companyName || 'Catálogo'} | ${prod.name}`;
                }
            } catch(e) { console.error("Could not fetch settings", e); }

            const fetchedComments = await db.getAll('productComments') || [];
            setComments(fetchedComments.filter(c => c.productId === id && c.status === 'approved').sort((a,b) => new Date(b.date) - new Date(a.date)));

            setLoading(false);
        };
        load();
    }, [id]);

    const [galleryState, setGalleryState] = useState({ isOpen: false, currentIndex: 0 });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!galleryState.isOpen) return;
            if (e.key === 'Escape') setGalleryState(prev => ({ ...prev, isOpen: false }));
            if (e.key === 'ArrowRight') setGalleryState(prev => ({ ...prev, currentIndex: prev.currentIndex === mediaItems.length - 1 ? 0 : prev.currentIndex + 1 }));
            if (e.key === 'ArrowLeft') setGalleryState(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? mediaItems.length - 1 : prev.currentIndex - 1 }));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [galleryState.isOpen]);

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState({ name: '', instagram: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { addToCart, cartCount, setIsCartOpen } = useCart();
    const { clientSession } = useClientAuth();
    const [quantity, setQuantity] = useState(1);
    const [commentSuccess, setCommentSuccess] = useState('');

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!clientSession || !newComment.message) return;
        setIsSubmitting(true);
        setCommentSuccess('');
        
        const commentObj = {
            productId: id,
            name: clientSession.name,
            instagram: clientSession.instagram ? clientSession.instagram.replace('@', '') : '',
            message: newComment.message,
            status: 'pending',
            date: new Date().toISOString()
        };

        const created = await db.create('productComments', commentObj);
        if (created) {
            setCommentSuccess('Seu comentário foi enviado para moderação e aparecerá em breve!');
            setNewComment({ message: '' });
            setTimeout(() => setCommentSuccess(''), 5000);
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
                <Link to="/loja" style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>
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
        <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', paddingBottom: '40px' }}>
            <CartDrawer companyConfig={companyConfig} />
            {/* Header */}
            <header style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', padding: '16px 24px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(147, 51, 234, 0.1)' }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#f3e8ff', padding: '6px', borderRadius: '8px' }}>
                        <ShoppingBag size={20} color="#9333ea" />
                    </div>
                    {companyConfig.companyName || 'Catálogo de Produtos'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link to="/meus-pedidos" style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }} onMouseOver={e => {e.currentTarget.style.backgroundColor='#f1f5f9';}} onMouseOut={e => {e.currentTarget.style.backgroundColor='transparent';}}>
                        Área do Cliente
                    </Link>
                    <Link to="/loja" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#9333ea', textDecoration: 'none', backgroundColor: '#f3e8ff', padding: '8px 16px', borderRadius: '20px' }}>
                        <ShoppingBag size={14} /> Ver Feed
                    </Link>
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', backgroundColor: '#a855f7', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.3)' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#9333ea'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#a855f7'}
                    >
                        <ShoppingCart size={16} />
                        {cartCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 800, width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                    <div 
                        onClick={() => mediaItems.length > 0 && setGalleryState({ isOpen: true, currentIndex: 0 })}
                        style={{ width: '100%', minHeight: '300px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: mediaItems.length > 0 ? 'zoom-in' : 'default', transition: 'background-color 0.3s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    >
                        {product.campaignActive && (
                            <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: '#f43f5e', color: 'white', padding: '6px 14px', borderRadius: '24px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', zIndex: 2, boxShadow: '0 4px 6px rgba(244,63,94,0.3)' }}>
                                {product.campaignDiscount}% OFF 🔥
                            </div>
                        )}
                        {mediaItems.length > 0 ? (
                            <>
                                <img src={mediaItems[0]} alt={product.name} style={{ width: '100%', maxHeight: '600px', height: 'auto', objectFit: 'contain', padding: '16px', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                                <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '8px', borderRadius: '50%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    <ZoomIn size={20} />
                                </div>
                            </>
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
                                <div 
                                    key={idx} 
                                    onClick={() => setGalleryState({ isOpen: true, currentIndex: idx + 1 })} 
                                    style={{ display: 'block', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'zoom-in', padding: '4px', position: 'relative', transition: 'all 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = '#c084fc'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', mixBlendMode: 'multiply' }} />
                                </div>
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
                            <span style={{ display: 'inline-block', color: '#9333ea', backgroundColor: '#f3e8ff', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                {product.category || 'Visualização Geral'}
                            </span>
                            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4c1d95', margin: '0 0 8px 0', lineHeight: 1.25 }}>
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
                                <span style={{ color: product.campaignActive ? '#e11d48' : '#7e22ce', fontSize: '1.25rem', fontWeight: 800 }}>R$</span>
                                <span style={{ color: product.campaignActive ? '#e11d48' : '#6b21a8', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px' }}>
                                    {price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>

                        {product.description && (
                            <div style={{ marginBottom: '36px' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#581c87', marginBottom: '10px' }}>Detalhes do Produto</h3>
                                <div style={{ color: '#4c1d95', lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                                    {product.description}
                                </div>
                            </div>
                        )}

                        {/* Add to Cart Actions */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            {/* Quantity Control */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f1f5f9', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Minus size={18} /></button>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', width: '24px', textAlign: 'center' }}>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={18} /></button>
                            </div>
                            
                            {/* Add Button */}
                            <button 
                                onClick={() => addToCart(product, quantity)}
                                style={{ flex: 1, padding: '16px', backgroundColor: '#9333ea', color: '#ffffff', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s ease, background-color 0.2s ease', boxShadow: '0 8px 16px -4px rgba(147, 51, 234, 0.4)' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#7e22ce'}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = '#9333ea'; }}
                            >
                                <ShoppingCart size={20} />
                                Adicionar ao Carrinho
                            </button>
                        </div>
                        
                        {/* Old direct WhatsApp Button as Secondary */}
                        <button 
                            style={{ 
                                width: '100%', 
                                padding: '14px', 
                                backgroundColor: '#f0fdf4', 
                                color: '#166534', 
                                border: '1px solid #bbf7d0', 
                                borderRadius: '16px', 
                                fontSize: '0.9rem', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
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
                            <MessageCircle size={18} color="#16a34a" />
                            Tirar dúvidas via WhatsApp
                        </button>
                    </div>
                </div>

                {/* Comentários / Feed Interativo (Estilo Instagram) */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -4px rgba(139, 92, 246, 0.1)', marginTop: '24px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f3e8ff', paddingBottom: '16px' }}>
                        <Heart fill="#d946ef" color="#d946ef" size={24} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6b21a8', margin: 0 }}>O que dizem sobre este produto</h3>
                    </div>

                    {/* Formulário de Novo Comentário */}
                    {clientSession ? (
                        <form onSubmit={handlePostComment} style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MessageCircle size={14} /> Deixe seu comentário público
                                </p>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#9333ea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                                        {clientSession.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{clientSession.name}</span>
                                        {clientSession.instagram && (
                                            <span style={{ fontSize: '0.75rem', color: '#E1306C', fontWeight: 600 }}>@{clientSession.instagram.replace('@', '')}</span>
                                        )}
                                    </div>
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
                            {commentSuccess && (
                                <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                                    {commentSuccess}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    style={{ 
                                        backgroundColor: '#9333ea', color: 'white', border: 'none', padding: '10px 24px', 
                                        borderRadius: '24px', fontWeight: 700, fontSize: '0.9rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px', opacity: isSubmitting ? 0.7 : 1, transition: 'background-color 0.2s'
                                    }}
                                >
                                    <Send size={14} /> {isSubmitting ? 'Enviando...' : 'Publicar'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                            <MessageCircle size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#475569', margin: '0 0 4px 0' }}>Participe da Comunidade</h4>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 16px 0' }}>Para proteger a integridade das avaliações, apenas membros verificados podem interagir publicamente nos produtos.</p>
                            <Link to="/meus-pedidos" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#f3e8ff', color: '#9333ea', borderRadius: '20px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
                                Entrar ou Criar Conta
                            </Link>
                        </div>
                    )}

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

            {/* Custom Lightbox / Gallery Modal */}
            {galleryState.isOpen && mediaItems.length > 0 && (
                <div 
                    onClick={() => setGalleryState(prev => ({ ...prev, isOpen: false }))} 
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease-out' }}
                >
                    <button 
                        onClick={() => setGalleryState(prev => ({ ...prev, isOpen: false }))} 
                        style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <CloseIcon size={24} />
                    </button>

                    {mediaItems.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setGalleryState(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? mediaItems.length - 1 : prev.currentIndex - 1 })); }} 
                                style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s', backdropFilter: 'blur(8px)' }} 
                                onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }} 
                                onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setGalleryState(prev => ({ ...prev, currentIndex: prev.currentIndex === mediaItems.length - 1 ? 0 : prev.currentIndex + 1 })); }} 
                                style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s', backdropFilter: 'blur(8px)' }} 
                                onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }} 
                                onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '1200px', height: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 100px', userSelect: 'none' }}>
                        <img 
                            key={`gallery-${galleryState.currentIndex}`}
                            src={mediaItems[galleryState.currentIndex]} 
                            alt={`Review ${galleryState.currentIndex}`} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'zoomIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} 
                        />
                    </div>

                    {mediaItems.length > 1 && (
                        <div style={{ display: 'flex', gap: '14px', marginTop: '32px', padding: '16px 24px', background: 'rgba(20,20,20,0.6)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', overflowX: 'auto', maxWidth: '90vw' }}>
                            {mediaItems.map((img, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={(e) => { e.stopPropagation(); setGalleryState(prev => ({ ...prev, currentIndex: idx })); }} 
                                    style={{ flexShrink: 0, width: '64px', height: '64px', padding: '4px', borderRadius: '16px', overflow: 'hidden', border: idx === galleryState.currentIndex ? '2px solid #c084fc' : '2px solid transparent', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: idx === galleryState.currentIndex ? 1 : 0.5, transform: idx === galleryState.currentIndex ? 'scale(1.1)' : 'scale(1)' }}
                                    onMouseOver={e => { if(idx !== galleryState.currentIndex) e.currentTarget.style.opacity = '0.8' }}
                                    onMouseOut={e => { if(idx !== galleryState.currentIndex) e.currentTarget.style.opacity = '0.5' }}
                                >
                                    <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px', backgroundColor: '#fff' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <CartDrawer />
        </div>
    );
}
