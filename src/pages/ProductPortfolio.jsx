import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, LayoutGrid, Search, PlayCircle, Instagram, MessageCircle, ImageIcon, Heart, User, Star, TrendingUp, Compass, ArrowRight } from 'lucide-react';
import db from '../services/database';
import { useCart } from '../contexts/CartContext';
import { CartDrawer } from '../components/CartDrawer';

export function ProductPortfolio() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companyConfig, setCompanyConfig] = useState({ companyName: '', whatsapp: '', facebook: '', instagram: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [categories, setCategories] = useState(['Todos']);

    // Contexto do Carrinho
    const { cartCount, setIsCartOpen } = useCart();

    useEffect(() => {
        const load = async () => {
            try {
                const settings = await db.getById('settings', 'global');
                if (settings) {
                    setCompanyConfig(settings);
                    document.title = `${settings.tabTitle || settings.companyName || 'Catálogo'} | Portfólio Central`;
                }

                // Analytics - Record Store Visit for CRM
                const visitId = `visit_${Date.now()}`;
                await db.set('analytics', visitId, {
                    type: 'store_view',
                    path: '/loja',
                    timestamp: new Date().toISOString()
                });

                const allProducts = await db.getAll('products');
                // Apenas produtos marcados como 'isPublic' devem aparecer no feed
                const publicProducts = (allProducts || []).filter(p => p.isPublic);
                
                // Extrair categorias unicas
                const uniqueCategories = ['Todos', ...new Set(publicProducts.map(p => p.category || 'Geral'))];
                
                setProducts(publicProducts.sort((a,b) => (b.campaignActive ? 1 : 0) - (a.campaignActive ? 1 : 0))); // Destaques primeiro
                setCategories(uniqueCategories);
            } catch(e) { console.error("Error loading portfolio", e); }
            
            setLoading(false);
        };
        load();
        
        // Analytics - Engajamento de Tempo
        const enterTime = Date.now();
        return () => {
            const timeSpent = Date.now() - enterTime;
            if(timeSpent > 5000) { // Só grava se ficou mais de 5s
                db.set('analytics', `duration_${Date.now()}`, { 
                    type: 'store_duration', 
                    path: '/loja', 
                    durationMs: timeSpent,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#faf5ff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e9d5ff', borderTopColor: '#9333ea', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ color: '#7e22ce', fontWeight: 600 }}>Preparando a Loja...</span>
                </div>
            </div>
        );
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Separando destaques para a nova visualização dinâmica
    const featuredProducts = filteredProducts.filter(p => p.campaignActive);
    const standardProducts = filteredProducts.filter(p => !p.campaignActive);

    const handleWhatsAppAction = () => {
        let phone = companyConfig.whatsapp || '';
        const message = 'Olá! Estive olhando a loja e gostaria de tirar algumas dúvidas.';
        if(phone) {
            const num = phone.replace(/\D/g, '');
            window.open(`https://wa.me/55${num}?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#fdfbfe', paddingBottom: '60px', fontFamily: 'var(--font-primary)' }}>
            <CartDrawer companyConfig={companyConfig} />
            
            {/* NOVO HEADER: Moderno e Transparente */}
            <header style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                backdropFilter: 'blur(12px)',
                padding: '16px 20px', 
                borderBottom: '1px solid rgba(147, 51, 234, 0.1)', 
                position: 'sticky', top: 0, zIndex: 10,
                boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    
                    {/* Logo & Branding */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {companyConfig.logoBase64 ? (
                            <img src={companyConfig.logoBase64} alt="Logo" style={{ height: '44px', width: '44px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                        ) : (
                            <div style={{ height: '44px', width: '44px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShoppingBag size={22} color="white" />
                            </div>
                        )}
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
                                {companyConfig.companyName || 'Nossa Loja'}
                            </h1>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Criatividade & Design</p>
                        </div>
                    </div>
                    
                    {/* Botões Principais */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link to="/meus-pedidos" style={{ 
                            padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: '12px', 
                            fontSize: '0.85rem', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', transition: 'all 0.2s'
                        }} onMouseOver={e => {e.currentTarget.style.backgroundColor='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1'}} onMouseOut={e => {e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.borderColor='#e2e8f0'}}>
                            <User size={16} /> Área do Cliente
                        </Link>
                        
                        <button 
                            onClick={handleWhatsAppAction}
                            style={{ width: '40px', height: '40px', backgroundColor: '#f0fdf4', border: 'none', borderRadius: '12px', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dcfce7'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#f0fdf4'} title="Contato Rápido"
                        >
                            <MessageCircle size={20} />
                        </button>
                        
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            style={{ 
                                position: 'relative', padding: '10px 20px', background: 'linear-gradient(135deg, #a855f7, #7e22ce)', 
                                border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, color: 'white', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)', transition: 'transform 0.2s' 
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <ShoppingCart size={18} /> Carrinho
                            {cartCount > 0 && (
                                <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 800, width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid white' }}>
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
                
                {/* MODERN HERO SECTION */}
                {!searchTerm && activeCategory === 'Todos' && products.length > 0 && (
                    <div style={{ 
                        marginBottom: '40px', padding: '40px', borderRadius: '24px', 
                        background: 'linear-gradient(120deg, #f3e8ff 0%, #ede9fe 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#7e22ce', marginBottom: '16px', backdropFilter: 'blur(4px)' }}>
                                <Sparkles size={14} /> Novidades Da Semana
                            </span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-1px' }}>
                                Descubra nossa coleção <br/>feita com <span style={{ color: '#9333ea' }}>paixão</span>.
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                                Produtos de alta qualidade desenhados para tornar os seus momentos ainda mais especiais.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filtros e Busca */}
                {products.length > 0 ? (
                    <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Busque por produtos, coleções..." 
                                style={{ 
                                    width: '100%', padding: '16px 16px 16px 48px', borderRadius: '20px', 
                                    border: '2px solid transparent', backgroundColor: 'white', fontSize: '1.05rem', 
                                    outline: 'none', color: '#1e293b', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                                    transition: 'border-color 0.2s'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={e => e.currentTarget.style.borderColor = '#d8b4fe'}
                                onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
                            />
                        </div>

                        {categories.length > 1 && (
                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none', justifyContent: 'center' }}>
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={{ 
                                            padding: '10px 20px', borderRadius: '24px', border: activeCategory === cat ? 'none' : '1px solid #e2e8f0', 
                                            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                                            backgroundColor: activeCategory === cat ? '#1e293b' : 'white',
                                            color: activeCategory === cat ? 'white' : '#64748b',
                                            boxShadow: activeCategory === cat ? '0 4px 10px rgba(30, 41, 59, 0.2)' : 'none'
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyState />
                )}

                {/* Visualização Dinâmica por Categorias */}
                {filteredProducts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                        
                        {/* DESTAQUES / PROMOÇÕES */}
                        {featuredProducts.length > 0 && (
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <TrendingUp size={24} color="#e11d48" />
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Destaques e Ofertas</h3>
                                </div>
                                <ProductGrid products={featuredProducts} isFeatured={true} />
                            </section>
                        )}

                        {/* LISTAGEM NORMAL (Agrupada se tiver buscando tudo) */}
                        {standardProducts.length > 0 && (
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <Compass size={24} color="#8b5cf6" />
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                        {activeCategory === 'Todos' ? 'Explore a Coleção' : `Categoria: ${activeCategory}`}
                                    </h3>
                                </div>
                                <ProductGrid products={standardProducts} />
                            </section>
                        )}
                        
                    </div>
                ) : (
                    products.length > 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                            <Search size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '1.2rem', color: '#475569', fontWeight: 700 }}>Nenhum produto encontrado.</h3>
                            <p style={{ color: '#94a3b8', marginTop: '8px' }}>Tente buscar por termos diferentes ou navegue pelas categorias.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

// Componente Interno para Grid de Produtos com Design Premium
function ProductGrid({ products, isFeatured }) {
    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '24px' 
        }}>
            {products.map(product => {
                const mediaItems = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
                const price = product.campaignActive 
                    ? Number(product.price || 0) * (1 - (Number(product.campaignDiscount || 0)/100))
                    : Number(product.price || 0);

                return (
                    <Link to={`/product/${product.id}`} key={product.id} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                        <div style={{ 
                            backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', 
                            boxShadow: isFeatured ? '0 10px 25px -5px rgba(225, 29, 72, 0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                            border: isFeatured ? '1px solid #ffe4e6' : '1px solid #f1f5f9',
                            position: 'relative', height: '100%', display: 'flex', flexDirection: 'column'
                        }} 
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'; }} 
                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isFeatured ? '0 10px 25px -5px rgba(225, 29, 72, 0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)'; }}>
                            
                            <div style={{ aspectRatio: '1/1', backgroundColor: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden' }}>
                                {/* Tag Promocional */}
                                {product.campaignActive && (
                                    <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 800, zIndex: 2, boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)' }}>
                                        -{product.campaignDiscount}% OFF
                                    </div>
                                )}
                                
                                {product.videoUrl && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex', zIndex: 2, backdropFilter: 'blur(4px)' }}>
                                        <PlayCircle size={16} />
                                    </div>
                                )}
                                
                                {mediaItems.length > 0 ? (
                                    <img src={mediaItems[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s ease', mixBlendMode: 'multiply' }} className="product-image-hover" />
                                ) : (
                                    <ImageIcon size={48} color="#cbd5e1" />
                                )}
                                
                                {/* Quick Add Button Overlay */}
                                <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 3, opacity: 0, transform: 'translateY(10px)', transition: 'all 0.2s' }} className="quick-add-btn">
                                    <ArrowRight size={18} />
                                </div>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {product.name}
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px 0' }}>{product.category || 'Geral'}</p>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {product.campaignActive && (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through', marginBottom: '-2px' }}>
                                                R$ {Number(product.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                            <span style={{ fontSize: '0.9rem', color: product.campaignActive ? '#e11d48' : '#1e293b', fontWeight: 600 }}>R$</span>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: product.campaignActive ? '#e11d48' : '#1e293b' }}>
                                                {price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
             <style dangerouslySetInnerHTML={{__html: `
                a:hover .product-image-hover { transform: scale(1.05); }
                a:hover .quick-add-btn { opacity: 1 !important; transform: translateY(0) !important; }
            `}} />
        </div>
    );
}

function EmptyState() {
    return (
        <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', border: '1px solid #f8fafc' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <LayoutGrid size={40} color="#94a3b8" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 12px 0' }}>Nenhum Produto no Portfólio</h2>
            <p style={{ color: '#64748b', margin: '0 auto', maxWidth: '400px', lineHeight: 1.6 }}>
                Ative a visibilidade dos produtos no sistema interno marcando <br/>
                <strong style={{ color: '#0f172a'}}>Visível no Portfólio Público</strong> nas configurações.
            </p>
        </div>
    );
}

// Icon helper for Hero Section
function Sparkles(props) {
    return <svg viewBox="0 0 24 24" width={props.size} height={props.size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
}
