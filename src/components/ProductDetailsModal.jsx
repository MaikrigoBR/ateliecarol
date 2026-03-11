import React from 'react';
import { 
    X, Edit, Trash2, Tag, PieChart, Package, 
    Share2, QrCode, Image as ImageIcon, CheckCircle, AlertCircle, ShoppingBag, Globe, EyeOff
} from 'lucide-react';

export function ProductDetailsModal({ isOpen, onClose, product, onEdit, onDelete, onShareQrCode }) {
    if (!isOpen || !product) return null;

    // Financial calculations
    const cost = parseFloat(product.totalCost) || parseFloat(product.baseCost) || 0;
    const price = parseFloat(product.price) || 0;
    const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
    const isLoss = (price - cost) < 0;

    // Media
    const mediaItems = product.images && product.images.length > 0 
        ? product.images 
        : (product.image ? [product.image] : []);

    // --- Inline Styles mapping to Theme Variables ---
    const sOverlay = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem'
    };

    const sModal = {
        backgroundColor: 'var(--surface)',  // Respects Dark Mode
        width: '100%', maxWidth: '750px', maxHeight: '90vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        color: 'var(--text-main)', // Sets root text color for dark mode
        animation: 'slideUp 0.3s ease-out'
    };

    const sHeader = {
        padding: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: 'var(--background)'
    };

    const sBody = {
        padding: '1.5rem',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '1.5rem'
    };

    const sFooter = {
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center'
    };

    const sCardLinear = {
        backgroundColor: 'var(--surface-hover)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem'
    };

    const sRowLinear = {
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
    };

    return (
        <div style={sOverlay} onClick={onClose}>
            <div style={sModal} onClick={e => e.stopPropagation()}>
                
                {/* Header: Title & Close */}
                <div style={sHeader}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Ficha do Produto
                        </span>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShoppingBag size={28} /> {product.name}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body: Linear Layout Content */}
                <div style={sBody} className="hide-scrollbar">
                    
                    {/* Media Row */}
                    {mediaItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="hide-scrollbar">
                            {mediaItems.map((img, idx) => (
                                <div key={idx} style={{ minWidth: '120px', width: '120px', height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                    <img src={img} alt={`Img ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Basic Info Row */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <Tag size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Informações Gerais</h4>
                        </div>
                        <div style={{ ...sRowLinear, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Categoria</p>
                                <p style={{ fontWeight: 600, fontSize: '1rem', backgroundColor: 'var(--surface)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block', border: '1px solid var(--border)' }}>
                                    {product.category || 'Sem Categoria'}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                    Visibilidade <Globe size={12}/>
                                </p>
                                {product.isPublic ? (
                                    <p style={{ fontWeight: 700, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle size={14} /> Catálogo Público
                                    </p>
                                ) : (
                                    <p style={{ fontWeight: 500, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <EyeOff size={14} /> Ficha Interna
                                    </p>
                                )}
                            </div>
                        </div>
                        {product.description && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Descrição</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{product.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Finance Row - Linear Mode */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <PieChart size={18} color="var(--success)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Precificação e Custos</h4>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Preço de Venda Final</span>
                                    <span>
                                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginRight: '4px' }}>R$</span>
                                        {price.toFixed(2).replace('.', ',')}
                                    </span>
                                </span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <span>Base (Fábrica): R$ {(parseFloat(product.baseCost) || 0).toFixed(2).replace('.', ',')}</span>
                                    <span>Custos Integrados: R$ {cost.toFixed(2).replace('.', ',')}</span>
                                </span>
                                {cost > 0 && price > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {isLoss ? (
                                            <span style={{ backgroundColor: 'var(--danger)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <AlertCircle size={14} /> Prejuízo de Absolvição
                                            </span>
                                        ) : (
                                            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <PieChart size={14} /> Margem Bruta: {margin}%
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lean Progress Bar (Margin Visualizer) */}
                        {cost > 0 && price > 0 && !isLoss && (
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginTop: '0.5rem' }}>
                                <div style={{ height: '100%', width: `${cost > price ? 100 : (cost/price)*100}%`, backgroundColor: 'var(--warning)', transition: 'width 1s ease' }} title="Custo Relativo"></div>
                                <div style={{ height: '100%', width: `${margin}%`, backgroundColor: 'var(--success)', transition: 'width 1s ease' }} title="Margem Livre"></div>
                            </div>
                        )}
                        {product.campaignActive && (
                             <div style={{ ...sCardLinear, backgroundColor: 'rgba(236, 72, 153, 0.05)', borderColor: 'rgba(236, 72, 153, 0.2)', color: '#be185d', padding: '0.75rem', marginTop: '0.5rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                     <Tag size={16} />
                                     <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0 }}>Campanha Promocional Ativa</h4>
                                 </div>
                                 <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                     Desconto: {product.campaignDiscount}% OFF
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* Stock Row */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={18} color="var(--primary)" />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Inventário</h4>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Qtd Disponível</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: product.stock < 10 ? 'var(--warning)' : 'var(--success)' }}>
                                {product.stock || 0} un.
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer / Actions */}
                <div style={sFooter}>
                    
                    {/* Secondary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => { onClose(); onDelete(product.id, product.name); }} className="btn btn-icon" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }} title="Excluir Produto">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Primary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => { onClose(); onEdit(product); }} className="btn btn-secondary">
                            <Edit size={16} /> Editar Completamente
                        </button>
                        
                        <button onClick={() => { onClose(); onShareQrCode(product); }} className="btn btn-primary" style={{ backgroundColor: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', fontWeight: 600 }}>
                            <QrCode size={16} /> Display QR Vitrine
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
