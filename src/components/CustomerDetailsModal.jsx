import React from 'react';
import { 
    X, Edit, Trash2, Mail, Phone, Instagram, 
    Gift, ShoppingBag, MapPin, Tag, MessageCircle, Calendar
} from 'lucide-react';

export function CustomerDetailsModal({ isOpen, onClose, customer, onEdit, onDelete, onMessage }) {
    if (!isOpen || !customer) return null;

    // Media
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=random&color=fff`;
    const avatarUrl = customer.photoUrl || (customer.instagram && customer.instagram.trim() !== '' ? `https://unavatar.io/instagram/${customer.instagram.replace('@', '')}` : defaultAvatarUrl);

    // --- Inline Styles mapping to Theme Variables ---
    const sOverlay = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem'
    };

    const sModal = {
        backgroundColor: 'var(--surface)', 
        width: '100%', maxWidth: '650px', maxHeight: '90vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        color: 'var(--text-main)', 
        animation: 'slideUp 0.3s ease-out'
    };

    const sHeader = {
        padding: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: 'rgba(236, 72, 153, 0.03)' // Slight pink tint
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

    return (
        <div style={sOverlay} onClick={onClose}>
            <div style={sModal} onClick={e => e.stopPropagation()}>
                
                {/* Header: Title & Close */}
                <div style={sHeader}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #E1306C', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                            <img src={avatarUrl} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = defaultAvatarUrl; }} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E1306C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Perfil CRM do Cliente
                            </span>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {customer.name}
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {customer.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'} {customer.document ? `- ${customer.document}` : ''}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body: Linear Layout Content */}
                <div style={sBody} className="hide-scrollbar">
                    
                    {/* Contatos Rápidos */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <Phone size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Canais de Contato</h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                            {customer.email && (
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', gap: '4px', alignItems: 'center' }}><Mail size={12}/> E-mail</p>
                                    <a href={`mailto:${customer.email}`} style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', textDecoration: 'none' }}>
                                        {customer.email}
                                    </a>
                                </div>
                            )}
                            {customer.phone && (
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', gap: '4px', alignItems: 'center' }}><Phone size={12}/> Telefone / WhatsApp</p>
                                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                        {customer.phone}
                                    </p>
                                </div>
                            )}
                            {customer.instagram && (
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', gap: '4px', alignItems: 'center' }}><Instagram size={12}/> Social</p>
                                    <a href={`https://instagram.com/${customer.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: '0.95rem', color: '#E1306C', textDecoration: 'underline' }}>
                                        {customer.instagram}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dados Comerciais */}
                    <div style={Object.assign({}, sCardLinear, { backgroundColor: 'var(--background)' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <ShoppingBag size={18} color="#f59e0b" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Histórico Comercial</h4>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Frequência de Compra</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                    {customer.computedOrders || 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>pedidos</span>
                                </span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>LTV (Valor Vitalício)</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                                    R$ {Number(customer.computedSpent || 0).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Segmentação & Dados Adicionais */}
                    <div style={sCardLinear}>
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                            {customer.birthDate && (
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Gift size={16} color="#8b5cf6" />
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Nascimento</h4>
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', backgroundColor: 'var(--background)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                        {new Date(customer.birthDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            <div style={{ flex: 2, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Tag size={16} color="var(--primary)" />
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Tags de Perfil</h4>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {customer.tags ? customer.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                                        <span key={i} className="badge" style={{ backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                            {tag}
                                        </span>
                                    )) : <span className="text-sm text-muted italic">Nenhuma tag atribuída</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div style={sFooter}>
                    
                    {/* Secondary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => { onClose(); onDelete(customer.id, customer.name); }} className="btn btn-icon" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }} title="Excluir Cliente">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Primary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {customer.phone && (
                            <button onClick={() => { onMessage(customer); onClose(); }} className="btn" style={{ backgroundColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}>
                                <MessageCircle size={16} /> Enviar Mensagem
                            </button>
                        )}
                        <button onClick={() => { onEdit(customer); onClose(); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Edit size={16} /> Editar Perfil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
