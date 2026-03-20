import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Search, ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import db from '../services/database';

export function CommentsModeration() {
    const [comments, setComments] = useState([]);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'approved' | 'all'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const allComments = await db.getAll('productComments') || [];
        const allProducts = await db.getAll('products') || [];
        
        const prodMap = {};
        allProducts.forEach(p => {
            prodMap[p.id] = p;
        });

        // Ordenar os mais recentes primeiro
        allComments.sort((a,b) => new Date(b.date) - new Date(a.date));

        setProducts(prodMap);
        setComments(allComments);
        setLoading(false);
    };

    const handleAction = async (commentId, newStatus) => {
        if (newStatus === 'rejected') {
            if (window.confirm('Excluir este comentário permanentemente?')) {
                await db.delete('productComments', commentId);
                loadData();
            }
        } else {
            await db.update('productComments', commentId, { status: newStatus });
            loadData();
        }
    };

    const filteredComments = comments.filter(c => {
        if (filterStatus === 'all') return true;
        // Se o comentário não tem status defindio, assumimos que são comentários velhos (antes do sistema de moderação), então consideramos aprovados
        const status = c.status || 'approved'; 
        return status === filterStatus;
    });

    if (loading) return <div style={{ padding: '20px' }}>Carregando dados...</div>;

    return (
        <div className="animate-fade-in">
            <div className="card-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn" 
                        style={{ backgroundColor: filterStatus === 'pending' ? 'var(--primary)' : 'var(--surface-hover)', color: filterStatus === 'pending' ? 'white' : 'var(--text-main)', border: 'none' }}
                        onClick={() => setFilterStatus('pending')}
                    >
                        Pendentes de Aprovação 
                        {comments.filter(c => c.status === 'pending').length > 0 && (
                            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '6px' }}>
                                {comments.filter(c => c.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button 
                        className="btn" 
                        style={{ backgroundColor: filterStatus === 'approved' ? '#10b981' : 'var(--surface-hover)', color: filterStatus === 'approved' ? 'white' : 'var(--text-main)', border: 'none' }}
                        onClick={() => setFilterStatus('approved')}
                    >
                        Aprovados / Publicados
                    </button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} /> Moderação da Loja
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {filteredComments.length > 0 ? (
                    filteredComments.map(c => {
                        const product = products[c.productId];
                        const cStatus = c.status || 'approved'; // Legaçado
                        
                        return (
                            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {product && product.image ? (
                                            <img src={product.image} alt="Produto" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={16} /></div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                {product ? product.name : 'Produto Excluído ou Indisponível'}
                                            </span>
                                            <a href={`/#/product/${c.productId}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ExternalLink size={12} /> Ver página do produto
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        {cStatus === 'pending' ? (
                                            <span style={{ padding: '4px 12px', borderRadius: '16px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700 }}>Aguardando Moderação</span>
                                        ) : (
                                            <span style={{ padding: '4px 12px', borderRadius: '16px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Heart size={12} fill="currentColor" /> Público
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 300px' }}>
                                         <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</span>
                                                {c.instagram && (
                                                    <a href={`https://instagram.com/${c.instagram.replace('@','')}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#E1306C', textDecoration: 'none', fontWeight: 600 }}>@{c.instagram.replace('@','')}</a>
                                                )}
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.date).toLocaleString('pt-BR')}</span>
                                            </div>
                                         </div>
                                         <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.5, backgroundColor: 'var(--surface-hover)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                             "{c.message}"
                                         </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px', justifyContent: 'center' }}>
                                        {cStatus === 'pending' ? (
                                            <>
                                                <button onClick={() => handleAction(c.id, 'approved')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                    <CheckCircle size={18} /> Aprovar no Catálogo
                                                </button>
                                                <button onClick={() => handleAction(c.id, 'rejected')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                    <XCircle size={18} /> Excluir Silenciosamente
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleAction(c.id, 'pending')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                Recolher e Ocultar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--surface)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <ShieldCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>Nada para moderar</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Os clientes ainda não fizeram novas avaliações nos produtos.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
