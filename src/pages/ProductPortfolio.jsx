import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, Image as ImageIcon, MessageCircle, PlayCircle, Search, LayoutGrid, Instagram } from 'lucide-react';
import db from '../services/database';

export function ProductPortfolio() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companyConfig, setCompanyConfig] = useState({ companyName: '', whatsapp: '', instagram: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [categories, setCategories] = useState(['Todos']);

    useEffect(() => {
        const load = async () => {
            try {
                const settings = await db.getById('settings', 'global');
                if (settings) {
                    setCompanyConfig(settings);
                    document.title = `${settings.companyName || 'Catálogo'} | Portfólio`;
                }

                const allProducts = await db.getAll('products');
                // Apenas produtos marcados como 'isPublic' devem aparecer no feed
                const publicProducts = (allProducts || []).filter(p => p.isPublic);
                
                // Extrair categorias unicas para os filtros
                const uniqueCategories = ['Todos', ...new Set(publicProducts.map(p => p.category || 'Geral'))];
                
                setProducts(publicProducts.sort((a,b) => (b.campaignActive ? 1 : 0) - (a.campaignActive ? 1 : 0))); // Promoções primeiro
                setCategories(uniqueCategories);

            } catch(e) { console.error("Error loading portfolio", e); }
            
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#64748b' }}>Carregando portfólio...</div>;
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleWhatsAppAction = () => {
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
        
        const message = 'Olá! Estive olhando o portfólio online e gostaria de tirar algumas dúvidas.';
        if(phone) {
            const num = phone.replace(/\D/g, '');
            window.open(`https://wa.me/55${num}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#fcfcfc', paddingBottom: '40px', fontFamily: 'var(--font-primary)' }}>
            
            {/* Portifolio Header (Instagram-ish style) */}
            <header style={{ backgroundColor: '#ffffff', padding: '24px 20px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Header Top - Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ 
                                width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {companyConfig.logoBase64 ? (
                                        <img src={companyConfig.logoBase64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <ShoppingBag size={28} color="#cbd5e1" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {companyConfig.companyName || 'Ateliê Criativo'}
                                    <Star size={16} color="#8b5cf6" fill="#8b5cf6" />
                                </h1>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>Portfólio interativo de produtos e criações originais.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions and Social */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={handleWhatsAppAction}
                            style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background-color 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            <MessageCircle size={16} /> Contato
                        </button>
                        {companyConfig.instagram && (
                             <a 
                                href={`https://instagram.com/${companyConfig.instagram.replace('@', '')}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ flex: 1, padding: '10px', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#db2777', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background-color 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#fce7f3'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#fdf2f8'}
                            >
                                <Instagram size={16} /> Ver no Instagram
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                
                {/* Search & Categories */}
                {products.length > 0 ? (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Pesquisar portfólio..." 
                                style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '1rem', outline: 'none', color: '#334155' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {categories.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={{ 
                                            padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                                            backgroundColor: activeCategory === cat ? '#0f172a' : '#f1f5f9',
                                            color: activeCategory === cat ? 'white' : '#64748b'
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                     <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                         <div style={{ width: '64px', height: '64px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <LayoutGrid size={32} color="#cbd5e1" />
                         </div>
                         <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#334155' }}>Nenhum Produto no Portfólio</h2>
                         <p style={{ color: '#64748b', marginTop: '8px', lineHeight: 1.5 }}>
                             Para que produtos apareçam aqui, você ou sua equipe precisam marcar a opção <br/>
                             <strong style={{ color: '#0f172a'}}>Visível no Portfólio Público</strong> dentro das configurações de cada produto lá no sistema.
                         </p>
                     </div>
                )}

                {/* Portfolio Display Grid */}
                {filteredProducts.length > 0 && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                        gap: '16px' 
                    }}>
                        {filteredProducts.map(product => {
                            const mediaItems = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
                            
                            const price = product.campaignActive 
                                ? Number(product.price || 0) * (1 - (Number(product.campaignDiscount || 0)/100))
                                : Number(product.price || 0);

                            return (
                                <Link to={`/product/${product.id}`} key={product.id} style={{ textDecoration: 'none', display: 'block' }}>
                                    <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s', border: '1px solid #f1f5f9' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                        
                                        <div style={{ aspectRatio: '1/1', backgroundColor: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {product.campaignActive && (
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#f43f5e', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, zIndex: 2 }}>
                                                    -{product.campaignDiscount}%
                                                </div>
                                            )}
                                            {product.videoUrl && (
                                                <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex', zIndex: 2 }}>
                                                    <PlayCircle size={14} />
                                                </div>
                                            )}
                                            {mediaItems.length > 0 ? (
                                                <img src={mediaItems[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <ImageIcon size={32} color="#cbd5e1" />
                                            )}
                                        </div>

                                        <div style={{ padding: '12px' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {product.name}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                 <span style={{ fontSize: '0.75rem', color: product.campaignActive ? '#e11d48' : '#64748b' }}>R$</span>
                                                 <span style={{ fontSize: '1.1rem', fontWeight: 800, color: product.campaignActive ? '#e11d48' : '#0f172a' }}>
                                                     {price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                 </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
                
                {products.length > 0 && filteredProducts.length === 0 && (
                     <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                         Nenhum produto encontrado para essa busca.
                     </div>
                )}
            </main>
        </div>
    );
}

